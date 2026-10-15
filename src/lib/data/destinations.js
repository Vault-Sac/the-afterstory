import { supabase, isSupabaseConfigured } from '../supabase'
import { destinations as seedDestinations } from './seed'

const STORAGE_KEY = 'mv_admin_destinations'

function getLocalDestinations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Error reading local destinations:', e)
  }
  return seedDestinations
}

function saveLocalDestinations(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.error('Error saving local destinations:', e)
  }
}

export async function getDestinations() {
  if (!isSupabaseConfigured) {
    const list = getLocalDestinations().filter(d => d.status !== 'draft')
    return { data: list, error: null }
  }
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('status', 'published')
      .order('display_order', { ascending: true })

    if (error || !data || data.length === 0) {
      // If table is empty or query failed, provide seed data fallback so UI never breaks
      return { data: (data && data.length > 0) ? data : seedDestinations, error }
    }
    return { data, error: null }
  } catch (err) {
    return { data: seedDestinations, error: err }
  }
}

export async function getDestinationBySlug(slug) {
  if (!isSupabaseConfigured) {
    const list = getLocalDestinations()
    const found = list.find(d => d.slug === slug)
    return { data: found || null, error: found ? null : new Error('Destination not found') }
  }
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error || !data) {
      // Check seed data fallback
      const found = seedDestinations.find(d => d.slug === slug)
      if (found) return { data: found, error: null }
      return { data: null, error: error || new Error('Destination not found') }
    }
    return { data, error: null }
  } catch (err) {
    const found = seedDestinations.find(d => d.slug === slug)
    return { data: found || null, error: err }
  }
}

export async function getAllDestinationsAdmin() {
  if (!isSupabaseConfigured) {
    return { data: getLocalDestinations(), error: null }
  }
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .order('display_order', { ascending: true })

    if (error || !data || data.length === 0) {
      return { data: (data && data.length > 0) ? data : seedDestinations, error }
    }
    return { data, error: null }
  } catch (err) {
    return { data: seedDestinations, error: err }
  }
}

export async function upsertDestination(destination) {
  if (!isSupabaseConfigured) {
    const list = [...getLocalDestinations()]
    const idx = list.findIndex(d => (d.id && d.id === destination.id) || d.slug === destination.slug)
    const item = { ...destination, id: destination.id || crypto.randomUUID() }
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item }
    } else {
      list.push(item)
    }
    saveLocalDestinations(list)
    return { data: item, error: null }
  }
  try {
    const payload = { ...destination, updated_at: new Date().toISOString() }
    const { data, error } = await supabase
      .from('destinations')
      .upsert(payload)
      .select()
      .single()
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function deleteDestination(id) {
  if (!isSupabaseConfigured) {
    const list = getLocalDestinations().filter(d => d.id !== id && d.slug !== id)
    saveLocalDestinations(list)
    return { error: null }
  }
  try {
    return await supabase.from('destinations').delete().eq('id', id)
  } catch (err) {
    return { error: err }
  }
}
