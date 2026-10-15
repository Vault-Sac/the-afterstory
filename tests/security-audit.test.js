import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { normalizePerson } from '../src/lib/data/people.js'

const projectRoot = path.resolve('.')

describe('THE AFTERSTORY — Security, Schema & Authorization Audit', () => {
  const migrationPath = path.join(projectRoot, 'supabase/migrations/20261015000000_create_memory_vault_schema.sql')
  const authContextPath = path.join(projectRoot, 'src/contexts/AuthContext.jsx')
  const vercelConfigPath = path.join(projectRoot, 'vercel.json')
  const memoriesDataPath = path.join(projectRoot, 'src/lib/data/memories.js')
  const peopleDataPath = path.join(projectRoot, 'src/lib/data/people.js')
  const peopleAdminPath = path.join(projectRoot, 'src/pages/admin/PeopleAdmin.jsx')

  const migrationSql = fs.readFileSync(migrationPath, 'utf8')
  const authContextCode = fs.readFileSync(authContextPath, 'utf8')
  const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'))
  const memoriesCode = fs.readFileSync(memoriesDataPath, 'utf8')
  const peopleCode = fs.readFileSync(peopleDataPath, 'utf8')
  const peopleAdminCode = fs.readFileSync(peopleAdminPath, 'utf8')

  test('CRITICAL: No table allows unrestricted authenticated modification (USING true)', () => {
    // Assert that no policy grants blanket access simply because a user is authenticated
    const blanketPolicyRegex = /FOR\s+(ALL|INSERT|UPDATE|DELETE)\s+TO\s+authenticated\s+USING\s*\(\s*true\s*\)/i
    const hasBlanketPolicy = blanketPolicyRegex.test(migrationSql)
    assert.equal(hasBlanketPolicy, false, 'Detected dangerous blanket authenticated policy: FOR ALL TO authenticated USING (true)!')
  })

  test('CRITICAL: Explicit admin_users table exists with RLS enabled', () => {
    assert.match(migrationSql, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.admin_users/i)
    assert.match(migrationSql, /ALTER\s+TABLE\s+public\.admin_users\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i)
  })

  test('CRITICAL: public.is_admin() is a hardened SECURITY DEFINER with pinned search_path', () => {
    assert.match(migrationSql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.is_admin/i)
    assert.match(migrationSql, /SECURITY\s+DEFINER/i)
    assert.match(migrationSql, /SET\s+search_path\s*=\s*public,\s*auth/i)
  })

  test('CRITICAL: Ordinary users cannot self-promote into admin_users', () => {
    // Ensure admin_users write policy strictly requires existing admin privilege
    const adminUserPolicyRegex = /CREATE\s+POLICY\s+"Admins can manage admin users"\s+ON\s+public\.admin_users[\s\S]*?WITH\s+CHECK\s*\(\s*public\.is_admin\(auth\.uid\(\)\)\s*\)/i
    assert.match(migrationSql, adminUserPolicyRegex, 'admin_users must only be writable by verified administrators')
  })

  test('All content tables restrict management to verified administrators via is_admin()', () => {
    const requiredPolicies = [
      'Admins can manage site settings',
      'Admins can manage destinations',
      'Admins can manage journey days',
      'Admins can manage activities',
      'Admins can manage media',
      'Admins can manage people',
      'Admins can manage memories',
      'Admins can manage memory media links',
      'Admins can manage guestbook entries'
    ]

    for (const policyName of requiredPolicies) {
      const policyRegex = new RegExp(`CREATE\\s+POLICY\\s+"${policyName}"[\\s\\S]*?public\\.is_admin\\(auth\\.uid\\(\\)\\)`, 'i')
      assert.match(migrationSql, policyRegex, `Policy ${policyName} must restrict admin operations to public.is_admin(auth.uid())`)
    }
  })

  test('Draft destinations, media, and unapproved memories are hidden from ordinary users and anonymous visitors', () => {
    // Destinations SELECT: status = 'published' OR public.is_admin(auth.uid())
    assert.match(migrationSql, /CREATE\s+POLICY\s+"Public can view published destinations"\s+ON\s+public\.destinations[\s\S]*?status\s*=\s*'published'\s+OR\s+public\.is_admin\(auth\.uid\(\)\)/i)
    
    // Memories SELECT: moderation_status = 'approved' OR public.is_admin(auth.uid())
    assert.match(migrationSql, /CREATE\s+POLICY\s+"Public can view approved memories"\s+ON\s+public\.memories[\s\S]*?moderation_status\s*=\s*'approved'\s+OR\s+public\.is_admin\(auth\.uid\(\)\)/i)
    
    // Media SELECT: publication_status = 'published' OR public.is_admin(auth.uid())
    assert.match(migrationSql, /CREATE\s+POLICY\s+"Public can view published media"\s+ON\s+public\.media[\s\S]*?publication_status\s*=\s*'published'\s+OR\s+public\.is_admin\(auth\.uid\(\)\)/i)
  })

  test('Memory and guestbook submissions are strictly forced into pending status with length limits', () => {
    // Memories INSERT policy
    assert.match(migrationSql, /moderation_status\s*=\s*'pending'/i)
    assert.match(migrationSql, /approved_at\s+IS\s+NULL/i)
    assert.match(migrationSql, /char_length\(body\)\s*>=\s*5/i)
    assert.match(migrationSql, /char_length\(body\)\s*<=\s*5000/i)

    // Guestbook INSERT policy
    assert.match(migrationSql, /status\s*=\s*'pending'/i)
  })

  test('Storage bucket gallery is protected against unauthorized writes, updates, and deletes', () => {
    assert.match(migrationSql, /CREATE\s+POLICY\s+"Admins can upload gallery objects"\s+ON\s+storage\.objects[\s\S]*?public\.is_admin\(auth\.uid\(\)\)/i)
    assert.match(migrationSql, /CREATE\s+POLICY\s+"Admins can update gallery objects"\s+ON\s+storage\.objects[\s\S]*?public\.is_admin\(auth\.uid\(\)\)/i)
    assert.match(migrationSql, /CREATE\s+POLICY\s+"Admins can delete gallery objects"\s+ON\s+storage\.objects[\s\S]*?public\.is_admin\(auth\.uid\(\)\)/i)
  })

  test('AuthContext verifies admin status with the database rather than trusting client state', () => {
    assert.match(authContextCode, /verifyAdminPrivileges/i)
    assert.match(authContextCode, /supabase\.rpc\('is_admin'\)/i)
    assert.match(authContextCode, /from\('admin_users'\)/i)
  })

  test('Client-side memory submission sanitizes HTML and enforces length limits', () => {
    assert.match(memoriesCode, /\.replace\(\/<\[\^>\]\*\>\/g,\s*''\)/, 'HTML stripping should be present')
    assert.match(memoriesCode, /moderation_status:\s*'pending'/, 'Must enforce pending status in client submit helper')
  })

  test('Vercel configuration includes SPA rewrites and critical HTTP security headers', () => {
    assert.ok(Array.isArray(vercelConfig.rewrites), 'Vercel rewrites must be configured')
    assert.equal(vercelConfig.rewrites[0].destination, '/index.html')

    const globalHeaders = vercelConfig.headers.find(h => h.source === '/(.*)')?.headers || []
    const headerMap = Object.fromEntries(globalHeaders.map(h => [h.key, h.value]))

    assert.equal(headerMap['X-Frame-Options'], 'DENY')
    assert.equal(headerMap['X-Content-Type-Options'], 'nosniff')
  })

  test('SCHEMA AUDIT: People schema uses full_name, role_titile, and favourite_quote', () => {
    assert.match(migrationSql, /full_name\s+TEXT\s+NOT\s+NULL/i)
    assert.match(migrationSql, /role_titile\s+TEXT/i)
    assert.match(migrationSql, /favourite_quote\s+TEXT/i)
  })

  test('SCHEMA AUDIT: upsertPerson constructs payload with full_name, role_titile, and favourite_quote (NO name or line column)', () => {
    // Ensure primaryPayload does not contain 'name:' or 'line:' properties
    assert.match(peopleCode, /full_name:\s*fullName/i)
    assert.match(peopleCode, /role_titile:\s*role/i)
    assert.match(peopleCode, /favourite_quote:\s*quote/i)

    // Ensure raw 'name' is not passed directly as a column to supabase upsert
    assert.doesNotMatch(peopleCode, /primaryPayload\s*=\s*\{[\s\S]*?\bname\s*:/i)
    assert.doesNotMatch(peopleCode, /primaryPayload\s*=\s*\{[\s\S]*?\bline\s*:/i)
  })

  test('SCHEMA AUDIT: normalizePerson maps both database columns and legacy UI aliases', () => {
    const rawDbPerson = {
      id: 'test-1',
      slug: 'megha',
      full_name: 'Megha Sharma',
      nickname: 'Navigator',
      role_titile: 'Lead Navigator',
      favourite_quote: 'Let us keep going.',
      avatar_url: 'https://example.com/avatar.jpg',
      bio: 'Traveler and photographer',
      status: 'published',
      display_order: 1
    }

    const normalized = normalizePerson(rawDbPerson)
    assert.equal(normalized.full_name, 'Megha Sharma')
    assert.equal(normalized.name, 'Megha Sharma')
    assert.equal(normalized.role_titile, 'Lead Navigator')
    assert.equal(normalized.role_title, 'Lead Navigator')
    assert.equal(normalized.favourite_quote, 'Let us keep going.')
    assert.equal(normalized.favorite_quote, 'Let us keep going.')
  })

  test('ADMIN AUDIT: PeopleAdmin checks error and displays failure without reporting false success', () => {
    assert.match(peopleAdminCode, /const\s*\{\s*data\s*,\s*error\s*\}\s*=\s*await\s+upsertPerson/i)
    assert.match(peopleAdminCode, /if\s*\(\s*error\s*\)\s*\{[\s\S]*?setFormError/i)
    assert.match(peopleAdminCode, /disabled=\{\s*saving\s*\}/i)
  })
})
