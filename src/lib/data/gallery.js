import { supabase, isSupabaseConfigured } from '../supabase'
import { seedGallery } from './seed'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_UPLOAD_MB = 8
const STORAGE_KEY = 'mv_admin_gallery'

function getLocalGallery() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Error reading local gallery:', e)
  }
  return seedGallery
}

function saveLocalGallery(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.error('Error saving local gallery:', e)
  }
}

export async function getGalleryMedia({ destinationId, dayId, limit = 100 } = {}) {
  if (!isSupabaseConfigured) {
    let list = getLocalGallery().filter(m => m.publication_status !== 'draft')
    if (destinationId) list = list.filter(m => m.destination_id === destinationId)
    if (dayId) list = list.filter(m => m.journey_day_id === dayId)
    return { data: list.slice(0, limit), error: null }
  }
  try {
    let query = supabase
      .from('media')
      .select('*')
      .eq('publication_status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (destinationId) query = query.eq('destination_id', destinationId)
    if (dayId) query = query.eq('journey_day_id', dayId)

    const { data, error } = await query
    if (error || !data || data.length === 0) {
      let fallback = seedGallery
      if (destinationId) fallback = fallback.filter(m => m.destination_id === destinationId)
      if (dayId) fallback = fallback.filter(m => m.journey_day_id === dayId)
      return { data: (data && data.length > 0) ? data : fallback, error }
    }
    // Include featured trip photos from seedGallery if not present in remote database
    const remoteIds = new Set(data.map(d => d.id))
    const featuredTripPhotos = seedGallery.filter(s => s.id.startsWith('trip-') && !remoteIds.has(s.id))
    let combined = [...featuredTripPhotos, ...data]
    if (destinationId) combined = combined.filter(m => m.destination_id === destinationId)
    if (dayId) combined = combined.filter(m => m.journey_day_id === dayId)
    return { data: combined.slice(0, limit), error: null }
  } catch (err) {
    return { data: seedGallery, error: err }
  }
}

export async function getAllMediaAdmin() {
  if (!isSupabaseConfigured) {
    return { data: getLocalGallery(), error: null }
  }
  try {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return { data: (data && data.length > 0) ? data : seedGallery, error }
    }
    const remoteIds = new Set(data.map(d => d.id))
    const featuredTripPhotos = seedGallery.filter(s => s.id.startsWith('trip-') && !remoteIds.has(s.id))
    return { data: [...featuredTripPhotos, ...data], error: null }
  } catch (err) {
    return { data: seedGallery, error: err }
  }
}

export async function uploadMediaAdmin(file, metadata = {}) {
  // Validate MIME type
  if (!ALLOWED_MIME.includes(file.type)) {
    return { data: null, error: new Error('File type not allowed. Please use JPEG, PNG, WebP or GIF.') }
  }
  // Validate size
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return { data: null, error: new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed is ${MAX_UPLOAD_MB}MB.`) }
  }

  if (!isSupabaseConfigured) {
    // Demo mode: read as Data URL
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

  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`
    const path = `photos/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('gallery')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      return { data: null, error: new Error(`Storage upload failed: ${uploadError.message}`) }
    }

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
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase.from('media').insert(record).select().single()
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function updateMediaRecord(id, updates) {
  if (!isSupabaseConfigured) {
    const list = getLocalGallery().map(m => m.id === id ? { ...m, ...updates } : m)
    saveLocalGallery(list)
    return { data: list.find(m => m.id === id), error: null }
  }
  try {
    return await supabase.from('media').update(updates).eq('id', id).select().single()
  } catch (err) {
    return { data: null, error: err }
  }
}

export async function deleteMediaRecord(id, storagePath) {
  if (!isSupabaseConfigured) {
    const list = getLocalGallery().filter(m => m.id !== id)
    saveLocalGallery(list)
    return { error: null }
  }
  try {
    if (storagePath) {
      await supabase.storage.from('gallery').remove([storagePath]).catch(() => {})
    }
    return await supabase.from('media').delete().eq('id', id)
  } catch (err) {
    return { error: err }
  }
}
