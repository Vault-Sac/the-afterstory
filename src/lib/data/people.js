import { supabase, isSupabaseConfigured } from '../supabase.js'
import { seedPeople } from './seed.js'

const STORAGE_KEY = 'mv_admin_people'

/**
 * Normalizes a Person database record or seed object so that both the
 * real database schema fields (full_name, role_titile, favourite_quote)
 * and UI convenience accessors (name, role_title, favorite_quote) exist.
 */
export function normalizePerson(p) {
  if (!p) return null
  const fullName = p.full_name ?? p.name ?? ''
  const role = p.role_titile ?? p.role_title ?? p.line ?? ''
  const quote = p.favourite_quote ?? p.favorite_quote ?? ''

  return {
    ...p,
    id: p.id,
    slug: p.slug,
    full_name: fullName,
    name: fullName, // convenience alias for legacy UI
    role_titile: role, // actual database column
    role_title: role, // convenience alias
    line: role,
    nickname: p.nickname ?? '',
    avatar_url: p.avatar_url ?? '',
    favourite_quote: quote, // actual database column
    favorite_quote: quote, // convenience alias
    bio: p.bio ?? '',
    status: p.status || 'published',
    display_order: Number.isInteger(p.display_order) ? p.display_order : 1,
    created_at: p.created_at || null,
  }
}

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
    return { data: list.map(normalizePerson), error: null }
  }
  try {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('status', 'published')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Supabase error fetching published people:', error)
      return { data: seedPeople.map(normalizePerson), error }
    }

    if (data && data.length > 0) {
      return { data: data.map(normalizePerson), error: null }
    }
    return { data: [], error: null }
  } catch (err) {
    console.error('Exception in getPublishedPeople:', err)
    return { data: seedPeople.map(normalizePerson), error: err }
  }
}

export async function getPersonBySlug(slug) {
  if (!isSupabaseConfigured) {
    const list = getLocalPeople()
    const found = list.find(p => p.slug === slug)
    return { data: found ? normalizePerson(found) : null, error: found ? null : new Error('Person not found') }
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
      if (found) return { data: normalizePerson(found), error: null }
      return { data: null, error: error || new Error('Person not found') }
    }
    return { data: normalizePerson(data), error: null }
  } catch (err) {
    const found = seedPeople.find(p => p.slug === slug)
    return { data: found ? normalizePerson(found) : null, error: err }
  }
}

export async function getAllPeopleAdmin() {
  if (!isSupabaseConfigured) {
    return { data: getLocalPeople().map(normalizePerson), error: null }
  }
  try {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Supabase error fetching admin people:', error)
      return { data: seedPeople.map(normalizePerson), error }
    }

    if (data && data.length > 0) {
      return { data: data.map(normalizePerson), error: null }
    }
    return { data: [], error: null }
  } catch (err) {
    console.error('Exception in getAllPeopleAdmin:', err)
    return { data: seedPeople.map(normalizePerson), error: err }
  }
}

/**
 * Upserts a person record into public.people.
 * Maps input attributes strictly to the real database schema:
 * - full_name (NOT 'name')
 * - role_titile (actual column in database)
 * - favourite_quote (actual column in database)
 * - nickname, avatar_url, bio, status, display_order
 */
export async function upsertPerson(person) {
  if (!person) {
    return { data: null, error: new Error('No person data provided.') }
  }

  const fullName = (person.full_name || person.name || '').trim()
  if (!fullName) {
    return { data: null, error: new Error('Full Name is required.') }
  }

  const slug = (
    person.slug ||
    fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ||
    crypto.randomUUID().slice(0, 8)
  ).trim()

  const role = (person.role_titile || person.role_title || person.line || '').trim() || null
  const quote = (person.favourite_quote || person.favorite_quote || '').trim() || null
  const nickname = (person.nickname || '').trim() || null
  const avatarUrl = (person.avatar_url || '').trim() || null
  const bio = (person.bio || '').trim() || null
  const status = person.status || 'published'
  const displayOrder = Number.isInteger(Number(person.display_order)) ? Number(person.display_order) : 1

  if (!isSupabaseConfigured) {
    const list = [...getLocalPeople()]
    const idx = list.findIndex(p => (p.id && p.id === person.id) || p.slug === slug)
    const item = normalizePerson({
      id: person.id || crypto.randomUUID(),
      slug,
      full_name: fullName,
      role_titile: role,
      role_title: role,
      nickname,
      avatar_url: avatarUrl,
      favourite_quote: quote,
      favorite_quote: quote,
      bio,
      status,
      display_order: displayOrder,
      created_at: person.created_at || new Date().toISOString(),
    })

    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item }
    } else {
      list.push(item)
    }
    saveLocalPeople(list)
    return { data: item, error: null }
  }

  // Exact Supabase public.people database payload:
  // Strictly avoid sending 'name', 'line', 'favorite_quote', 'role_title' or unverified columns
  const primaryPayload = {
    id: person.id || crypto.randomUUID(),
    slug,
    full_name: fullName,
    nickname,
    role_titile: role,
    avatar_url: avatarUrl,
    favourite_quote: quote,
    bio,
    status,
    display_order: displayOrder,
  }

  try {
    let { data, error } = await supabase
      .from('people')
      .upsert(primaryPayload)
      .select()
      .single()

    // Handle schema column variance if role_titile vs role_title or favourite vs favorite
    if (error && error.code === 'PGRST204') {
      const msg = error.message || ''
      const fallbackPayload = { ...primaryPayload }
      let shouldRetry = false

      if (msg.includes('role_titile')) {
        delete fallbackPayload.role_titile
        fallbackPayload.role_title = role
        shouldRetry = true
      }
      if (msg.includes('favourite_quote')) {
        delete fallbackPayload.favourite_quote
        fallbackPayload.favorite_quote = quote
        shouldRetry = true
      }

      if (shouldRetry) {
        const retryResult = await supabase
          .from('people')
          .upsert(fallbackPayload)
          .select()
          .single()

        data = retryResult.data
        error = retryResult.error
      }
    }

    if (error) {
      console.error('Failed to upsert person in Supabase:', error)
      return { data: null, error }
    }

    return { data: normalizePerson(data), error: null }
  } catch (err) {
    console.error('Exception during person upsert:', err)
    return { data: null, error: err }
  }
}

export async function deletePerson(id) {
  if (!id) return { error: new Error('Person ID is required for deletion.') }

  if (!isSupabaseConfigured) {
    const list = getLocalPeople().filter(p => p.id !== id && p.slug !== id)
    saveLocalPeople(list)
    return { error: null }
  }
  try {
    const { error } = await supabase.from('people').delete().eq('id', id)
    if (error) {
      console.error('Failed to delete person from Supabase:', error)
      return { error }
    }
    return { error: null }
  } catch (err) {
    console.error('Exception during person deletion:', err)
    return { error: err }
  }
}
