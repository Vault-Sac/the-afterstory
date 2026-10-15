// Supabase Client — THE AFTERSTORY
// Uses only client-safe public anonymous/publishable keys in browser.
// Service-role keys must NEVER be exposed here.

import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
               import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
               import.meta.env.VITE_SUPABASE_KEY || ''

// Check whether a valid Supabase project is configured
function checkConfigured(url, key) {
  if (!url || !key) return false
  if (url.includes('your-project-id') || url.includes('placeholder')) return false
  if (key.includes('your-anon-public-key') || key.includes('placeholder')) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export const isSupabaseConfigured = checkConfigured(rawUrl, rawKey)

// Fallback placeholder URL that allows client instantiation without crashing
const safeUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder-vault.supabase.co'
const safeKey = isSupabaseConfigured ? rawKey : 'placeholder-anon-key'

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Quick diagnostic function to verify permitted database connectivity
export async function testSupabaseConnection() {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are not set.' }
  }
  try {
    const { error } = await supabase.from('site_settings').select('setting_key').limit(1)
    if (error) {
      return { ok: false, message: `Connected to Supabase project, but query returned: ${error.message}` }
    }
    return { ok: true, message: 'Connected successfully to Supabase database.' }
  } catch (err) {
    return { ok: false, message: `Supabase network/connection error: ${err.message}` }
  }
}
