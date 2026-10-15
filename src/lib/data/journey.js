import { supabase, isSupabaseConfigured } from '../supabase'
import { journeyDays as seedDays } from './seed'

const STORAGE_KEY = 'mv_admin_journey'

function getLocalJourney() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Error reading local journey:', e)
  }
  return seedDays
}

function saveLocalJourney(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.error('Error saving local journey:', e)
  }
}

export async function getJourneyDays() {
  if (!isSupabaseConfigured) {
    const list = getLocalJourney().filter(d => d.status !== 'draft')
    return { data: list, error: null }
  }
  try {
    // Attempt query with activities relationship first
    let { data, error } = await supabase
      .from('journey_days')
      .select('*, activities(*)')
      .eq('status', 'published')
      .order('display_order', { ascending: true })

    // If join with activities fails (e.g. relationship cache), retry with simple select
    if (error) {
      const fallbackQuery = await supabase
        .from('journey_days')
        .select('*')
        .eq('status', 'published')
        .order('display_order', { ascending: true })
      data = fallbackQuery.data
      error = fallbackQuery.error
    }

    if (error || !data || data.length === 0) {
      return { data: (data && data.length > 0) ? data : seedDays, error }
    }
    return { data, error: null }
  } catch (err) {
    return { data: seedDays, error: err }
  }
}

export async function getJourneyDayById(id) {
  if (!isSupabaseConfigured) {
    const list = getLocalJourney()
    const found = list.find(d => String(d.id) === String(id) || String(d.day_number) === String(id))
    return { data: found || null, error: null }
  }
  try {
    let { data, error } = await supabase
      .from('journey_days')
      .select('*, activities(*)')
      .eq('id', id)
      .single()

    if (error) {
      const fallback = await supabase.from('journey_days').select('*').eq('id', id).single()
      data = fallback.data
      error = fallback.error
    }

    if (error || !data) {
      const found = seedDays.find(d => String(d.id) === String(id))
      if (found) return { data: found, error: null }
      return { data: null, error }
    }
    return { data, error: null }
  } catch (err) {
    const found = seedDays.find(d => String(d.id) === String(id))
    return { data: found || null, error: err }
  }
}

export async function getAllJourneyDaysAdmin() {
  if (!isSupabaseConfigured) {
    return { data: getLocalJourney(), error: null }
  }
  try {
    let { data, error } = await supabase
      .from('journey_days')
      .select('*, activities(*)')
      .order('display_order', { ascending: true })

    if (error) {
      const fallback = await supabase.from('journey_days').select('*').order('display_order', { ascending: true })
      data = fallback.data
      error = fallback.error
    }

    if (error || !data || data.length === 0) {
      return { data: (data && data.length > 0) ? data : seedDays, error }
    }
    return { data, error: null }
  } catch (err) {
    return { data: seedDays, error: err }
  }
}

export async function upsertJourneyDay(day) {
  if (!isSupabaseConfigured) {
    const list = [...getLocalJourney()]
    const idx = list.findIndex(d => String(d.id) === String(day.id) || d.day_number === day.day_number)
    const item = { ...day, id: day.id || crypto.randomUUID() }
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item }
    } else {
      list.push(item)
    }
    saveLocalJourney(list)
    return { data: item, error: null }
  }
  try {
    const { activities, ...dayFields } = day
    const payload = { ...dayFields, updated_at: new Date().toISOString() }
    const { data, error } = await supabase
      .from('journey_days')
      .upsert(payload)
      .select()
      .single()
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}
