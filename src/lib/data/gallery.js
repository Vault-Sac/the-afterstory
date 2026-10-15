import { supabase, isSupabaseConfigured } from '../supabase'
import { seedGallery } from './seed'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_UPLOAD_MB = 8

const STORAGE_KEY = 'mv_admin_gallery'

function getLocalGallery() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return seedGallery
}

function saveLocalGallery(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {}
}

export async function getGalleryMedia({ destinationId, dayId, limit = 100 } = {}) {
  if (!isSupabaseConfigured) {
    let list = getLocalGallery().filter(m => m.publication_status !== 'draft')
    if (destinationId) list = list.filter(m => m.destination_id === destinationId)
    if (dayId) list = list.filter(m => m.journey_day_id === dayId)
    return { data: list.slice(0, limit), error: null }
  }
  let query = supabase
    .from('media')
    .select('*')
    .eq('publication_status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (destinationId) query = query.eq('destination_id', destinationId)
  if (dayId) query = query.eq('journey_day_id', dayId)
  return await query
}

export async function getAllMediaAdmin() {
  if (!isSupabaseConfigured) {
    return { data: getLocalGallery(), error: null }
  }
  return await supabase
    .from('media')
    .select('*')
    .order('created_at', { ascending: false })
}

export async function uploadMediaAdmin(file, metadata = {}) {
  // Validate MIME type
  if (!ALLOWED_MIME.includes(file.type)) {
    return { data: null, error: new Error('File type not allowed. Use JPEG, PNG, WebP or GIF.') }
  }
  // Validate size
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return { data: null, error: new Error(`File too large. Maximum size is ${MAX_UPLOAD_MB} MB.`) }
  }

  if (!isSupabaseConfigured) {
    // In demo mode: read as Data URL or ObjectURL
    const dataUrl = await new Promise((res, rej) => {
      const reader = new FileReader()
      reader.onload = () => res(reader.result)
      reader.onerror = rej
      reader.readAsDataURL(file)
    })

    const record = {
      id: crypto.randomUUID(),
      storage_path: `local/${file.name}`,
      public_url: dataUrl,
      media_type: file.type.startsWith('video') ? 'video' : 'image',
      caption: metadata.caption || '',
      alt_text: metadata.alt_text || file.name,
      destination_id: metadata.destination_id || null,
      journey_day_id: metadata.journey_day_id || null,
      publication_status: 'published',
      created_at: new Date().toISOString()
    }

    const list = [record, ...getLocalGallery()]
    saveLocalGallery(list)
    return { data: record, error: null }
  }

  const ext = file.name.split('.').pop()
  const path = `gallery/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage.from('gallery').upload(path, file)
  if (uploadError) return { data: null, error: uploadError }

  const { data: urlData } = supabase.storage.from('gallery').getPublicUrl(path)
  const publicUrl = urlData?.publicUrl

  const record = {
    storage_path: path,
    public_url: publicUrl,
    media_type: file.type.startsWith('video') ? 'video' : 'image',
    caption: metadata.caption || '',
    alt_text: metadata.alt_text || file.name,
    destination_id: metadata.destination_id || null,
    journey_day_id: metadata.journey_day_id || null,
    publication_status: 'published',
  }

  const { data, error } = await supabase.from('media').insert(record).select().single()
  return { data, error }
}

export async function updateMediaRecord(id, updates) {
  if (!isSupabaseConfigured) {
    const list = getLocalGallery().map(m => m.id === id ? { ...m, ...updates } : m)
    saveLocalGallery(list)
    return { data: list.find(m => m.id === id), error: null }
  }
  return await supabase.from('media').update(updates).eq('id', id).select().single()
}

export async function deleteMediaRecord(id, storagePath) {
  if (!isSupabaseConfigured) {
    const list = getLocalGallery().filter(m => m.id !== id)
    saveLocalGallery(list)
    return { error: null }
  }
  if (storagePath) await supabase.storage.from('gallery').remove([storagePath])
  return await supabase.from('media').delete().eq('id', id)
}

