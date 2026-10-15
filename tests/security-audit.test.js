import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { normalizePerson } from '../src/lib/data/people.js'
import { validateImageFile, MAX_FILE_SIZE_BYTES } from '../src/lib/data/submissions.js'

const projectRoot = path.resolve('.')


describe('THE AFTERSTORY — Security, Schema & Authorization Audit', () => {
  const migrationPath = path.join(projectRoot, 'supabase/migrations/20261015000000_create_memory_vault_schema.sql')
  const submissionsMigPath = path.join(projectRoot, 'supabase/migrations/20261015100000_add_people_submissions.sql')
  const authContextPath = path.join(projectRoot, 'src/contexts/AuthContext.jsx')
  const vercelConfigPath = path.join(projectRoot, 'vercel.json')
  const memoriesDataPath = path.join(projectRoot, 'src/lib/data/memories.js')
  const peopleDataPath = path.join(projectRoot, 'src/lib/data/people.js')
  const peopleAdminPath = path.join(projectRoot, 'src/pages/admin/PeopleAdmin.jsx')
  const submissionsDataPath = path.join(projectRoot, 'src/lib/data/submissions.js')
  const submissionsAdminPath = path.join(projectRoot, 'src/pages/admin/SubmissionsAdmin.jsx')
  const submitProfilePath = path.join(projectRoot, 'src/pages/public/SubmitProfile.jsx')
  const mainJsxPath = path.join(projectRoot, 'src/main.jsx')

  const migrationSql = fs.readFileSync(migrationPath, 'utf8')
  const submissionsSql = fs.readFileSync(submissionsMigPath, 'utf8')
  const authContextCode = fs.readFileSync(authContextPath, 'utf8')
  const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'))
  const memoriesCode = fs.readFileSync(memoriesDataPath, 'utf8')
  const peopleCode = fs.readFileSync(peopleDataPath, 'utf8')
  const peopleAdminCode = fs.readFileSync(peopleAdminPath, 'utf8')
  const submissionsCode = fs.readFileSync(submissionsDataPath, 'utf8')
  const submissionsAdminCode = fs.readFileSync(submissionsAdminPath, 'utf8')
  const submitProfileCode = fs.readFileSync(submitProfilePath, 'utf8')
  const mainCode = fs.readFileSync(mainJsxPath, 'utf8')

  // ---- EXISTING CORE SECURITY TESTS (preserved) ----

  test('CRITICAL: No table allows unrestricted authenticated modification (USING true)', () => {
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
    assert.match(migrationSql, /CREATE\s+POLICY\s+"Public can view published destinations"\s+ON\s+public\.destinations[\s\S]*?status\s*=\s*'published'\s+OR\s+public\.is_admin\(auth\.uid\(\)\)/i)
    assert.match(migrationSql, /CREATE\s+POLICY\s+"Public can view approved memories"\s+ON\s+public\.memories[\s\S]*?moderation_status\s*=\s*'approved'\s+OR\s+public\.is_admin\(auth\.uid\(\)\)/i)
    assert.match(migrationSql, /CREATE\s+POLICY\s+"Public can view published media"\s+ON\s+public\.media[\s\S]*?publication_status\s*=\s*'published'\s+OR\s+public\.is_admin\(auth\.uid\(\)\)/i)
  })

  test('Memory and guestbook submissions are strictly forced into pending status with length limits', () => {
    assert.match(migrationSql, /moderation_status\s*=\s*'pending'/i)
    assert.match(migrationSql, /approved_at\s+IS\s+NULL/i)
    assert.match(migrationSql, /char_length\(body\)\s*>=\s*5/i)
    assert.match(migrationSql, /char_length\(body\)\s*<=\s*5000/i)
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
    assert.match(peopleCode, /full_name:\s*fullName/i)
    assert.match(peopleCode, /role_titile:\s*role/i)
    assert.match(peopleCode, /favourite_quote:\s*quote/i)
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

  // ---- NEW TESTS: SUBMISSION SYSTEM ----

  test('SUBMISSIONS: people_submissions table exists in migration with correct schema', () => {
    assert.match(submissionsSql, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.people_submissions/i)
    assert.match(submissionsSql, /full_name\s+TEXT\s+NOT\s+NULL/i)
    assert.match(submissionsSql, /role_titile\s+TEXT/i)
    assert.match(submissionsSql, /favourite_quote\s+TEXT/i)
    assert.match(submissionsSql, /avatar_path\s+TEXT/i)
    assert.match(submissionsSql, /status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'pending'/i)
    assert.match(submissionsSql, /ALTER\s+TABLE\s+public\.people_submissions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i)
  })

  test('SUBMISSIONS: Anonymous users cannot self-approve or set reviewer fields', () => {
    // The INSERT policy must enforce status='pending', reviewed_by IS NULL, reviewed_at IS NULL
    assert.match(submissionsSql, /CREATE\s+POLICY\s+"Public can submit people profiles"[\s\S]*?status\s*=\s*'pending'/i)
    assert.match(submissionsSql, /reviewed_by\s+IS\s+NULL/i)
    assert.match(submissionsSql, /reviewed_at\s+IS\s+NULL/i)
    assert.match(submissionsSql, /avatar_url\s+IS\s+NULL/i)
  })

  test('SUBMISSIONS: Only admins can read all submissions (no public SELECT policy)', () => {
    assert.match(submissionsSql, /CREATE\s+POLICY\s+"Admins can view all submissions"[\s\S]*?public\.is_admin\(auth\.uid\(\)\)/i)
    // No unrestricted SELECT policy on people_submissions
    assert.doesNotMatch(submissionsSql, /ON\s+public\.people_submissions[\s\S]*?FOR\s+SELECT\s+USING\s*\(\s*true\s*\)/i)
  })

  test('SUBMISSIONS: approve_people_submission is a SECURITY DEFINER function requiring admin auth', () => {
    assert.match(submissionsSql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.approve_people_submission/i)
    assert.match(submissionsSql, /SECURITY\s+DEFINER/i)
    assert.match(submissionsSql, /NOT\s+public\.is_admin\(auth\.uid\(\)\)/i)
    assert.match(submissionsSql, /RAISE\s+EXCEPTION\s+'Unauthorized/i)
  })

  test('SUBMISSIONS: reject_people_submission is a SECURITY DEFINER function requiring admin auth', () => {
    assert.match(submissionsSql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.reject_people_submission/i)
    // Should also enforce admin check
    assert.match(submissionsSql, /IF\s+NOT\s+public\.is_admin\(auth\.uid\(\)\)/i)
  })

  test('SUBMISSIONS: Private submissions bucket configured (public=false)', () => {
    assert.match(submissionsSql, /INSERT\s+INTO\s+storage\.buckets[\s\S]*?'submissions'[\s\S]*?false/i)
    // Bucket must not be public=true
    assert.doesNotMatch(submissionsSql, /VALUES\s*\(\s*'submissions'[^)]*true[^)]*\)/i)
  })

  test('SUBMISSIONS: Only admins can read from private submissions bucket', () => {
    assert.match(submissionsSql, /CREATE\s+POLICY\s+"Admins can view submission photos"[\s\S]*?public\.is_admin\(auth\.uid\(\)\)/i)
    // No unrestricted SELECT policy on submissions bucket
    assert.doesNotMatch(submissionsSql, /bucket_id\s*=\s*'submissions'[\s\S]*?FOR\s+SELECT\s+USING\s*\(\s*true\s*\)/i)
  })

  test('SUBMISSIONS: Client validates file type and size before upload', () => {
    // validateImageFile returns error for wrong type
    const wrongTypeFile = { type: 'text/html', size: 100, name: 'evil.html' }
    const typeError = validateImageFile(wrongTypeFile)
    assert.ok(typeError, 'Should reject non-image file types')
    assert.match(typeError, /unsupported file type/i)

    // validateImageFile returns error for oversized file
    const bigFile = { type: 'image/jpeg', size: MAX_FILE_SIZE_BYTES + 1, name: 'big.jpg' }
    const sizeError = validateImageFile(bigFile)
    assert.ok(sizeError, 'Should reject files exceeding max size')
    assert.match(sizeError, /too large/i)

    // validateImageFile accepts valid file
    const goodFile = { type: 'image/jpeg', size: 500000, name: 'photo.jpg' }
    const noError = validateImageFile(goodFile)
    assert.equal(noError, null, 'Should accept valid image file')
  })

  test('SUBMISSIONS: submitPeopleProfile strips HTML and enforces status=pending', () => {
    assert.match(submissionsCode, /replace\(\/<\[\^>\]\*\>\/g,\s*''\)/i)
    assert.match(submissionsCode, /status:\s*'pending'/i)
    // Must not allow submitter to set reviewed_by or approved status
    assert.match(submissionsCode, /reviewed_by:\s*null/i)
    assert.match(submissionsCode, /reviewed_at:\s*null/i)
  })

  test('SUBMISSIONS: approveSubmission calls SECURITY DEFINER RPC, not direct table update', () => {
    assert.match(submissionsCode, /\.rpc\(\s*'approve_people_submission'/i)
    assert.match(submissionsCode, /\.rpc\(\s*'reject_people_submission'/i)
    // Must not do direct .update() of status to 'approved' in the Supabase branch
    assert.doesNotMatch(submissionsCode, /\.from\('people_submissions'\)[\s\S]*?\.update\([\s\S]*?status.*approved/i)
  })

  test('SUBMISSIONS: Admin page uses proper error handling, not false success', () => {
    assert.match(submissionsAdminCode, /if\s*\(\s*error\s*\)/i)
    assert.match(submissionsAdminCode, /showToast[\s\S]*?error/i)
    // Must not toast success before checking error
    assert.match(submissionsAdminCode, /Unauthorized/i)
  })

  test('SUBMISSIONS: Public form requires full_name and photo before submitting', () => {
    assert.match(submitProfileCode, /Please enter your full name/i)
    assert.match(submitProfileCode, /Please select a photograph/i)
    assert.match(submitProfileCode, /Please confirm your consent/i)
  })

  test('SUBMISSIONS: Routes registered for /submit-your-story and /admin/submissions', () => {
    assert.match(mainCode, /path="submit-your-story"/i)
    assert.match(mainCode, /path="submissions"/i)
    assert.match(mainCode, /SubmitProfile/i)
    assert.match(mainCode, /SubmissionsAdmin/i)
  })

  test('SUBMISSIONS: No privileged keys (service_role, jwt_secret) in any source file', () => {
    const sourceFiles = [
      submissionsCode,
      submissionsAdminCode,
      submitProfileCode,
      authContextCode,
      peopleCode,
      memoriesCode,
    ]
    for (const src of sourceFiles) {
      assert.doesNotMatch(src, /service_role/i, 'Service role key must never appear in client source')
      assert.doesNotMatch(src, /jwt_secret/i, 'JWT secret must never appear in client source')
      assert.doesNotMatch(src, /SUPABASE_SECRET/i, 'Supabase secret must never appear in client source')
    }
  })
})

