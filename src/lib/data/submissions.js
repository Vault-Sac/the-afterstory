/**
 * submissions.js — THE AFTERSTORY
 *
 * Data layer for the public photo submission + admin moderation workflow.
 *
 * Security model:
 *   - Photos upload to the private 'submissions' bucket (no public URL).
 *   - Metadata inserts into public.people_submissions with status='pending'.
 *   - Admins retrieve signed URLs from the private bucket for preview.
 *   - Approval calls approve_people_submission() SECURITY DEFINER function.
 *   - Rejection calls reject_people_submission() SECURITY DEFINER function.
 *   - No service-role key is used here; only the anon/authenticated key.
 */

import { supabase, isSupabaseConfigured } from '../supabase.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const SUBMISSION_BUCKET = 'submissions'
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024       // 5 MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const STORAGE_KEY = 'mv_local_submissions'

// ---------------------------------------------------------------------------
// Local (demo) fallback helpers
// ---------------------------------------------------------------------------
function getLocalSubmissions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return []
}

function saveLocalSubmissions(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) { /* ignore */ }
}

// ---------------------------------------------------------------------------
// File validation (client-side pre-check before upload)
// ---------------------------------------------------------------------------
export function validateImageFile(file) {
  if (!file) return 'Please select a photo.'
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'Unsupported file type. Please use JPEG, PNG, WebP or GIF.'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Photo is too large. Maximum size is ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB.`
  }
  return null
}

// ---------------------------------------------------------------------------
// uploadSubmissionPhoto
// Uploads the file to the private 'submissions' bucket.
// Returns { path, error }
// path is the storage object key — e.g. "pending/uuid/filename.jpg"
// ---------------------------------------------------------------------------
export async function uploadSubmissionPhoto(file, onProgress) {
  const fileExt = file.name.split('.').pop().toLowerCase()
  const safeExt = ALLOWED_MIME_TYPES.includes(file.type) ? fileExt : 'jpg'
  const uniquePath = `pending/${crypto.randomUUID()}/${Date.now()}.${safeExt}`

  if (!isSupabaseConfigured) {
    // Demo mode: create a local object URL as a stand-in
    const localUrl = URL.createObjectURL(file)
    return { path: uniquePath, localUrl, error: null }
  }

  try {
    const { data, error } = await supabase.storage
      .from(SUBMISSION_BUCKET)
      .upload(uniquePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (error) {
      return { path: null, localUrl: null, error }
    }

    return { path: data.path, localUrl: null, error: null }
  } catch (err) {
    return { path: null, localUrl: null, error: err }
  }
}

// deleteSubmissionPhoto — cleans up orphaned upload if DB insert fails
export async function deleteSubmissionPhoto(path) {
  if (!isSupabaseConfigured || !path) return
  try {
    await supabase.storage.from(SUBMISSION_BUCKET).remove([path])
  } catch (e) {
    console.warn('[submissions] Could not remove orphaned photo:', path, e)
  }
}

// ---------------------------------------------------------------------------
// submitPeopleProfile
// Inserts a new pending submission record into public.people_submissions.
// avatar_path is the storage object key from uploadSubmissionPhoto().
// Returns { data, error }
// ---------------------------------------------------------------------------
export async function submitPeopleProfile(payload) {
  const fullName = (payload.full_name || '').replace(/<[^>]*>/g, '').trim()
  if (!fullName) return { data: null, error: new Error('Full name is required.') }

  const clean = {
    full_name:       fullName.slice(0, 120),
    nickname:        (payload.nickname || '').replace(/<[^>]*>/g, '').trim().slice(0, 60) || null,
    role_titile:     (payload.role_titile || '').replace(/<[^>]*>/g, '').trim().slice(0, 120) || null,
    favourite_quote: (payload.favourite_quote || '').replace(/<[^>]*>/g, '').trim().slice(0, 300) || null,
    bio:             (payload.bio || '').replace(/<[^>]*>/g, '').trim().slice(0, 2000) || null,
    avatar_path:     payload.avatar_path || null,
    // Enforced by RLS: status must be 'pending', reviewer fields must be null
    status:          'pending',
    reviewed_by:     null,
    reviewed_at:     null,
    rejection_reason: null,
    avatar_url:      null,
  }

  if (!isSupabaseConfigured) {
    const list = getLocalSubmissions()
    const entry = { ...clean, id: crypto.randomUUID(), created_at: new Date().toISOString() }
    list.unshift(entry)
    saveLocalSubmissions(list)
    return { data: entry, error: null }
  }

  try {
    const { data, error } = await supabase
      .from('people_submissions')
      .insert(clean)
      .select()
      .single()
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ---------------------------------------------------------------------------
// Admin: get all submissions with optional status filter
// ---------------------------------------------------------------------------
export async function getAllSubmissionsAdmin({ status } = {}) {
  if (!isSupabaseConfigured) {
    let list = getLocalSubmissions()
    if (status) list = list.filter(s => s.status === status)
    return { data: list, error: null }
  }
  try {
    let query = supabase
      .from('people_submissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    return { data: data || [], error }
  } catch (err) {
    return { data: [], error: err }
  }
}

// ---------------------------------------------------------------------------
// Admin: get a signed URL so admins can preview a private submission photo
// Signed URLs expire after 60 minutes.
// ---------------------------------------------------------------------------
export async function getSubmissionPhotoSignedUrl(avatarPath) {
  if (!isSupabaseConfigured || !avatarPath) return { signedUrl: null, error: null }
  try {
    const { data, error } = await supabase.storage
      .from(SUBMISSION_BUCKET)
      .createSignedUrl(avatarPath, 3600) // 1-hour expiry
    return { signedUrl: data?.signedUrl || null, error }
  } catch (err) {
    return { signedUrl: null, error: err }
  }
}

// ---------------------------------------------------------------------------
// Admin: approve a submission via SECURITY DEFINER RPC
// The server function validates admin role, creates public.people record,
// and marks the submission approved — all atomically.
// ---------------------------------------------------------------------------
export async function approveSubmission(submissionId, finalAvatarUrl = null) {
  if (!isSupabaseConfigured) {
    // Demo mode: directly update local state
    const list = getLocalSubmissions().map(s =>
      s.id === submissionId
        ? { ...s, status: 'approved', reviewed_at: new Date().toISOString() }
        : s
    )
    saveLocalSubmissions(list)
    return { data: { approved: true }, error: null }
  }
  try {
    const { data, error } = await supabase
      .rpc('approve_people_submission', {
        submission_id: submissionId,
        final_avatar_url: finalAvatarUrl,
      })
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ---------------------------------------------------------------------------
// Admin: reject a submission via SECURITY DEFINER RPC
// ---------------------------------------------------------------------------
export async function rejectSubmission(submissionId, reason = null) {
  if (!isSupabaseConfigured) {
    const list = getLocalSubmissions().map(s =>
      s.id === submissionId
        ? { ...s, status: 'rejected', rejection_reason: reason, reviewed_at: new Date().toISOString() }
        : s
    )
    saveLocalSubmissions(list)
    return { data: true, error: null }
  }
  try {
    const { data, error } = await supabase
      .rpc('reject_people_submission', {
        submission_id: submissionId,
        reason,
      })
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

// ---------------------------------------------------------------------------
// Admin: delete a submission record (and optionally clean up its photo)
// ---------------------------------------------------------------------------
export async function deleteSubmission(submissionId, avatarPath) {
  if (!isSupabaseConfigured) {
    const list = getLocalSubmissions().filter(s => s.id !== submissionId)
    saveLocalSubmissions(list)
    return { error: null }
  }
  try {
    // Clean up the stored photo first if provided
    if (avatarPath) {
      await deleteSubmissionPhoto(avatarPath)
    }
    const { error } = await supabase
      .from('people_submissions')
      .delete()
      .eq('id', submissionId)
    return { error }
  } catch (err) {
    return { error: err }
  }
}
