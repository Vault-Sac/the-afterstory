import { supabase, isSupabaseConfigured } from '../supabase'

const defaults = {
  site_title: "THE MEMORY VAULT",
  site_edition: "OCTOBER '26",
  site_tagline: "One journey. Many perspectives. A lifetime of memories.",
  hero_title: "Not just a trip.",
  hero_subtitle: "A piece of us.",
  hero_description: "Six days across changing landscapes, familiar voices, and moments we don't want time to take away. This is where we keep them.",
  route_summary: "VARANASI — SHIMLA — CHANDIGARH",
  trip_dates: "15 — 20 OCTOBER 2026",
  footer_note: "Made of moments, kept with care.",
  about_text: "The Memory Vault is a private digital archive for the October 2026 group journey from Varanasi through Shimla and Chandigarh. It exists so that the small, ordinary moments that make a trip unforgettable have somewhere to live.",
}

const STORAGE_KEY = 'mv_admin_settings'

export async function getSiteSettings() {
  if (!isSupabaseConfigured) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return { ...defaults, ...JSON.parse(raw) }
    } catch (e) {}
    return defaults
  }
  const { data, error } = await supabase.from('site_settings').select('setting_key, setting_value')
  if (error || !data) return defaults
  return { ...defaults, ...Object.fromEntries(data.map(s => [s.setting_key, s.setting_value])) }
}

export async function updateSiteSetting(key, value) {
  if (!isSupabaseConfigured) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const current = raw ? JSON.parse(raw) : {}
      current[key] = value
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    } catch (e) {}
    return { data: { setting_key: key, setting_value: value }, error: null }
  }
  return await supabase
    .from('site_settings')
    .upsert({ setting_key: key, setting_value: value, updated_at: new Date().toISOString() })
}

export async function getSitePageContent(pageKey) {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase
    .from('site_pages')
    .select('*')
    .eq('page_key', pageKey)
    .eq('status', 'published')
    .single()
  return data
}

