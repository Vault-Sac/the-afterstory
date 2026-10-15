import { supabase, isSupabaseConfigured } from '../supabase'
import { destinations as seedDestinations } from './seed'

const STORAGE_KEY = 'mv_admin_destinations'

function getLocalDestinations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return seedDestinations
}

function saveLocalDestinations(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {}
}

export async function getDestinations() {
  if (!isSupabaseConfigured) {
    const list = getLocalDestinations().filter(d => d.status !== 'draft')
    return { data: list, error: null }
  }
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .eq('status', 'published')
    .order('display_order', { ascending: true })
  return { data: data || seedDestinations, error }
}

export async function getDestinationBySlug(slug) {
  if (!isSupabaseConfigured) {
    const list = getLocalDestinations()
    const found = list.find(d => d.slug === slug)
    return { data: found || null, error: found ? null : new Error('Not found') }
  }
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()
  return { data, error }
}

export async function getAllDestinationsAdmin() {
  if (!isSupabaseConfigured) {
    return { data: getLocalDestinations(), error: null }
  }
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .order('display_order', { ascending: true })
  return { data, error }
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
  const { data, error } = await supabase
    .from('destinations')
    .upsert(destination)
    .select()
    .single()
  return { data, error }
}

export async function deleteDestination(id) {
  if (!isSupabaseConfigured) {
    const list = getLocalDestinations().filter(d => d.id !== id && d.slug !== id)
    saveLocalDestinations(list)
    return { error: null }
  }
  return await supabase.from('destinations').delete().eq('id', id)
}

