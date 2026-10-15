import { supabase, isSupabaseConfigured } from '../supabase'
import { seedMemories } from './seed'

const STORAGE_KEY = 'mv_admin_memories'

function getLocalMemories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  // Default: seed memories marked as approved
  const initial = seedMemories.map(m => ({
    ...m,
    moderation_status: m.moderation_status || 'approved'
  }))
  return initial
}

function saveLocalMemories(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {}
}

// Public: only approved memories
export async function getApprovedMemories({ destinationId, category, search, limit = 50, offset = 0 } = {}) {
  if (!isSupabaseConfigured) {
    let list = getLocalMemories().filter(m => m.moderation_status === 'approved')
    if (destinationId) list = list.filter(m => m.destination_id === destinationId)
    if (category) list = list.filter(m => m.category === category)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(m => (m.body || '').toLowerCase().includes(q) || (m.title || '').toLowerCase().includes(q) || (m.display_name || '').toLowerCase().includes(q))
    }
    return { data: list.slice(offset, offset + limit), error: null }
  }
  let query = supabase
    .from('memories')
    .select('*, memory_media(*, media(*))')
    .eq('moderation_status', 'approved')
    .order('approved_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (destinationId) query = query.eq('destination_id', destinationId)
  if (category) query = query.eq('category', category)
  if (search) query = query.ilike('body', `%${search}%`)
  return await query
}

// Public: submit a new memory (starts as pending)
export async function submitMemory(memory) {
  // Sanitize: strip any HTML from body text
  const clean = {
    ...memory,
    body: memory.body?.replace(/<[^>]*>/g, '').trim(),
    display_name: memory.display_name?.replace(/<[^>]*>/g, '').trim().slice(0, 80),
    title: memory.title?.replace(/<[^>]*>/g, '').trim().slice(0, 120),
    moderation_status: 'pending', // Always start pending — never trust client
  }

  if (!isSupabaseConfigured) {
    const list = getLocalMemories()
    const entry = {
      ...clean,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    }
    list.unshift(entry)
    saveLocalMemories(list)
    return { data: entry, error: null }
  }

  const { data, error } = await supabase
    .from('memories')
    .insert(clean)
    .select()
    .single()
  return { data, error }
}

// Admin: get all memories for moderation
export async function getAllMemoriesAdmin({ status } = {}) {
  if (!isSupabaseConfigured) {
    let list = getLocalMemories()
    if (status) list = list.filter(m => m.moderation_status === status)
    return { data: list, error: null }
  }
  let query = supabase
    .from('memories')
    .select('*, memory_media(*, media(*))')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('moderation_status', status)
  return await query
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
  const updates = {
    moderation_status: status,
    approved_at: status === 'approved' ? new Date().toISOString() : null,
  }
  return await supabase.from('memories').update(updates).eq('id', id).select().single()
}

export async function deleteMemory(id) {
  if (!isSupabaseConfigured) {
    const list = getLocalMemories().filter(m => m.id !== id)
    saveLocalMemories(list)
    return { error: null }
  }
  return await supabase.from('memories').delete().eq('id', id)
}

