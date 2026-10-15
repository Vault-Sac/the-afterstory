import { supabase, isSupabaseConfigured } from '../supabase'
import { seedMemories } from './seed'

const STORAGE_KEY = 'mv_admin_memories'

function getLocalMemories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Error reading local memories:', e)
  }
  return seedMemories.map(m => ({
    ...m,
    moderation_status: m.moderation_status || 'approved'
  }))
}

function saveLocalMemories(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.error('Error saving local memories:', e)
  }
}

// Public: retrieve only approved memories
export async function getApprovedMemories({ destinationId, category, search, limit = 50, offset = 0 } = {}) {
  if (!isSupabaseConfigured) {
    let list = getLocalMemories().filter(m => m.moderation_status === 'approved')
    if (destinationId) list = list.filter(m => m.destination_id === destinationId)
    if (category) list = list.filter(m => m.category === category)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(m => 
        (m.body || '').toLowerCase().includes(q) || 
        (m.title || '').toLowerCase().includes(q) || 
        (m.display_name || '').toLowerCase().includes(q)
      )
    }
    return { data: list.slice(offset, offset + limit), error: null }
  }

  try {
    let query = supabase
      .from('memories')
      .select('*')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (destinationId) query = query.eq('destination_id', destinationId)
    if (category) query = query.eq('category', category)
    if (search) query = query.ilike('body', `%${search}%`)

    const { data, error } = await query
    if (error || !data || data.length === 0) {
      let fallback = seedMemories
      if (destinationId) fallback = fallback.filter(m => m.destination_id === destinationId)
      if (category) fallback = fallback.filter(m => m.category === category)
      return { data: (data && data.length > 0) ? data : fallback, error }
    }
    return { data, error: null }
  } catch (err) {
    return { data: seedMemories, error: err }
  }
}

// Public: submit a new memory (strictly placed into pending moderation queue)
export async function submitMemory(memory) {
  // Input sanitization: strip HTML tags and apply strict bounds
  const rawBody = (memory.body || '').replace(/<[^>]*>/g, '').trim()
  const rawDisplayName = (memory.display_name || '').replace(/<[^>]*>/g, '').trim().slice(0, 80)
  const rawTitle = (memory.title || '').replace(/<[^>]*>/g, '').trim().slice(0, 120)

  if (!rawBody || rawBody.length < 5) {
    return { data: null, error: new Error('Memory must be at least 5 characters long.') }
  }

  const clean = {
    title: rawTitle || null,
    body: rawBody,
    display_name: rawDisplayName || 'Anonymous Traveler',
    category: memory.category || 'A Moment I Loved',
    destination_id: memory.destination_id || null,
    moderation_status: 'pending', // Always strictly pending — never trust user client
    created_at: new Date().toISOString()
  }

  if (!isSupabaseConfigured) {
    const list = getLocalMemories()
    const entry = {
      ...clean,
      id: crypto.randomUUID(),
    }
    list.unshift(entry)
    saveLocalMemories(list)
    return { data: entry, error: null }
  }

  try {
    const { data, error } = await supabase
      .from('memories')
      .insert(clean)
      .select()
      .single()
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

// Admin: retrieve all memories for moderation review
export async function getAllMemoriesAdmin({ status } = {}) {
  if (!isSupabaseConfigured) {
    let list = getLocalMemories()
    if (status) list = list.filter(m => m.moderation_status === status)
    return { data: list, error: null }
  }
  try {
    let query = supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('moderation_status', status)

    const { data, error } = await query
    if (error || !data || data.length === 0) {
      return { data: (data && data.length > 0) ? data : seedMemories, error }
    }
    return { data, error: null }
  } catch (err) {
    return { data: seedMemories, error: err }
  }
}

export async function moderateMemory(id, status) {
  if (!isSupabaseConfigured) {
    const list = getLocalMemories().map(m => m.id === id ? {
      ...m,
      moderation_status: status,
      approved_at: status === 'approved' ? new Date().toISOString() : null
    } : m)
    saveLocalMemories(list)
    return { data: list.find(m => m.id === id), error: null }
  }
  try {
    const updates = {
      moderation_status: status,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }
    return await supabase.from('memories').update(updates).eq('id', id).select().single()
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function deleteMemory(id) {
  if (!isSupabaseConfigured) {
    const list = getLocalMemories().filter(m => m.id !== id)
    saveLocalMemories(list)
    return { error: null }
  }
  try {
    return await supabase.from('memories').delete().eq('id', id)
  } catch (err) {
    return { error: err }
  }
}
