import { supabase, isSupabaseConfigured } from '../supabase'
import { journeyDays as seedDays } from './seed'

const STORAGE_KEY = 'mv_admin_journey'

function getLocalJourney() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return seedDays
}

function saveLocalJourney(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {}
}

export async function getJourneyDays() {
  if (!isSupabaseConfigured) {
    const list = getLocalJourney().filter(d => d.status !== 'draft')
    return { data: list, error: null }
  }
  const { data, error } = await supabase
    .from('journey_days')
    .select(`*, activities(*)`)
    .eq('status', 'published')
    .order('display_order', { ascending: true })
  return { data: data || seedDays, error }
}

export async function getJourneyDayById(id) {
  if (!isSupabaseConfigured) {
    const list = getLocalJourney()
    const found = list.find(d => String(d.id) === String(id) || String(d.day_number) === String(id))
    return { data: found || null, error: null }
  }
  const { data, error } = await supabase
    .from('journey_days')
    .select(`*, activities(*)`)
    .eq('id', id)
    .single()
  return { data, error }
}

export async function getAllJourneyDaysAdmin() {
  if (!isSupabaseConfigured) {
    return { data: getLocalJourney(), error: null }
  }
  const { data, error } = await supabase
    .from('journey_days')
    .select(`*, activities(*)`)
    .order('display_order', { ascending: true })
  return { data, error }
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
  const { data, error } = await supabase
    .from('journey_days')
    .upsert(day)
    .select()
    .single()
  return { data, error }
}

