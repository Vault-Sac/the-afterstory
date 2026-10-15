import { supabase, isSupabaseConfigured } from '../supabase'
import { seedPeople } from './seed'

const STORAGE_KEY = 'mv_admin_people'

function getLocalPeople() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Error reading local people:', e)
  }
  return seedPeople
}

function saveLocalPeople(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.error('Error saving local people:', e)
  }
}

export async function getPublishedPeople() {
  if (!isSupabaseConfigured) {
    const list = getLocalPeople().filter(p => p.status === 'published')
    return { data: list, error: null }
  }
  try {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('status', 'published')
      .order('display_order', { ascending: true })

    if (error || !data || data.length === 0) {
      return { data: (data && data.length > 0) ? data : seedPeople, error }
    }
    return { data, error: null }
  } catch (err) {
    return { data: seedPeople, error: err }
  }
}

export async function getPersonBySlug(slug) {
  if (!isSupabaseConfigured) {
    const list = getLocalPeople()
    const found = list.find(p => p.slug === slug)
    return { data: found || null, error: found ? null : new Error('Person not found') }
  }
  try {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error || !data) {
      const found = seedPeople.find(p => p.slug === slug)
      if (found) return { data: found, error: null }
      return { data: null, error }
    }
    return { data, error: null }
  } catch (err) {
    const found = seedPeople.find(p => p.slug === slug)
    return { data: found || null, error: err }
  }
}

export async function getAllPeopleAdmin() {
  if (!isSupabaseConfigured) {
    return { data: getLocalPeople(), error: null }
  }
  try {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .order('display_order', { ascending: true })

    if (error || !data || data.length === 0) {
      return { data: (data && data.length > 0) ? data : seedPeople, error }
    }
    return { data, error: null }
  } catch (err) {
    return { data: seedPeople, error: err }
  }
}

export async function upsertPerson(person) {
  if (!isSupabaseConfigured) {
    const list = [...getLocalPeople()]
    const idx = list.findIndex(p => (p.id && p.id === person.id) || p.slug === person.slug)
    const item = {
      ...person,
      id: person.id || crypto.randomUUID(),
      slug: person.slug || person.full_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || crypto.randomUUID().slice(0, 8),
      status: person.status || 'published'
    }
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item }
    } else {
      list.push(item)
    }
    saveLocalPeople(list)
    return { data: item, error: null }
  }
  try {
    const payload = {
      ...person,
      slug: person.slug || person.full_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || crypto.randomUUID().slice(0, 8),
      updated_at: new Date().toISOString()
    }
    const { data, error } = await supabase
      .from('people')
      .upsert(payload)
      .select()
      .single()
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function deletePerson(id) {
  if (!isSupabaseConfigured) {
    const list = getLocalPeople().filter(p => p.id !== id && p.slug !== id)
    saveLocalPeople(list)
    return { error: null }
  }
  try {
    return await supabase.from('people').delete().eq('id', id)
  } catch (err) {
    return { error: err }
  }
}
