import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Users, Check, X, Trash2, Clock, Eye, AlertCircle,
  RefreshCw, ChevronDown, ChevronUp, Image
} from 'lucide-react'
import {
  getAllSubmissionsAdmin,
  approveSubmission,
  rejectSubmission,
  deleteSubmission,
  getSubmissionPhotoSignedUrl,
} from '../../lib/data/submissions'

// ---------------------------------------------------------------------------
// SubmissionCard — individual row with expandable details + preview
// ---------------------------------------------------------------------------
function SubmissionCard({ sub, onApprove, onReject, onDelete, working }) {
  const [expanded, setExpanded] = useState(false)
  const [signedUrl, setSignedUrl] = useState(null)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  const loadPhoto = useCallback(async () => {
    if (!sub.avatar_path || signedUrl) return
    setLoadingUrl(true)
    const { signedUrl: url } = await getSubmissionPhotoSignedUrl(sub.avatar_path)
    setSignedUrl(url || null)
    setLoadingUrl(false)
  }, [sub.avatar_path, signedUrl])

  const handleExpand = () => {
    const next = !expanded
    setExpanded(next)
    if (next && sub.avatar_path) loadPhoto()
  }

  const handleApprove = () => {
    // Pass the signed URL as avatar_url — the RPC function will store it
    // In production: the admin would first copy the file to gallery bucket
    // and pass the public gallery URL. For now we pass the signed URL.
    onApprove(sub.id, signedUrl || null)
  }

  const handleRejectSubmit = () => {
    onReject(sub.id, rejectReason.trim() || null)
    setShowRejectInput(false)
    setRejectReason('')
  }

  const statusColors = {
    pending: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected',
  }

  return (
    <div className={`submission-card status-${sub.status}`}>
      {/* Card header — always visible */}
      <div className="submission-card-header" onClick={handleExpand} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleExpand() }}
        aria-expanded={expanded}
      >
        <div className="submission-thumb">
          {sub.avatar_path ? (
            <div className="submission-thumb-placeholder">
              <Image size={18} />
            </div>
          ) : (
            <div className="submission-thumb-initials">
              {(sub.full_name || '?')[0].toUpperCase()}
            </div>
          )}
        </div>

        <div className="submission-meta">
          <strong className="submission-name">{sub.full_name}</strong>
          {sub.nickname && <span className="submission-nick">"{sub.nickname}"</span>}
          <span className="submission-role">{sub.role_titile || 'Traveler'}</span>
        </div>

        <div className="submission-right">
          <span className={`status-pill ${statusColors[sub.status] || ''}`}>
            {sub.status}
          </span>
          <span className="submission-date">
            {sub.created_at ? new Date(sub.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric'
            }) : '—'}
          </span>
          <span className="submission-expand-icon" aria-hidden="true">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="submission-detail">
          <div className="submission-detail-inner">
            {/* Photo preview */}
            <div className="submission-photo-col">
              {loadingUrl ? (
                <div className="submission-photo-loading">
                  <div className="loading-spinner" aria-hidden="true" />
                  <span>Loading photo…</span>
                </div>
              ) : signedUrl ? (
                <img
                  src={signedUrl}
                  alt={`Submitted photo from ${sub.full_name}`}
                  className="submission-photo-preview"
                />
              ) : sub.avatar_path ? (
                <div className="submission-photo-nourl">
                  <Image size={24} aria-hidden="true" />
                  <p>Photo stored privately.<br />
                    {!signedUrl && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={loadPhoto}
                        disabled={loadingUrl}
                      >
                        Load preview
                      </button>
                    )}
                  </p>
                </div>
              ) : (
                <div className="submission-photo-none">
                  <Image size={24} aria-hidden="true" />
                  <p>No photo submitted</p>
                </div>
              )}
            </div>

            {/* Profile data */}
            <div className="submission-info-col">
              <dl className="submission-dl">
                <dt>Full Name</dt>
                <dd>{sub.full_name}</dd>

                {sub.nickname && <><dt>Nickname</dt><dd>"{sub.nickname}"</dd></>}
                {sub.role_titile && <><dt>Role</dt><dd>{sub.role_titile}</dd></>}
                {sub.favourite_quote && <><dt>Quote</dt><dd>"{sub.favourite_quote}"</dd></>}
                {sub.bio && <><dt>Bio</dt><dd>{sub.bio}</dd></>}

                <dt>Submitted</dt>
                <dd>{sub.created_at ? new Date(sub.created_at).toLocaleString() : '—'}</dd>

                {sub.reviewed_at && (
                  <><dt>Reviewed</dt><dd>{new Date(sub.reviewed_at).toLocaleString()}</dd></>
                )}
              </dl>
            </div>
          </div>

          {/* Action bar */}
          {sub.status === 'pending' && (
            <div className="submission-actions">
              {showRejectInput ? (
                <div className="reject-reason-row">
                  <input
                    type="text"
                    className="reject-reason-input"
                    placeholder="Optional: internal rejection note (not shown publicly)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    maxLength={300}
                    disabled={working}
                    aria-label="Rejection reason"
                  />
                  <button
                    type="button"
                    className="button button-outline button-sm"
                    onClick={handleRejectSubmit}
                    disabled={working}
                  >
                    <X size={13} /> Confirm Reject
                  </button>
                  <button
                    type="button"
                    className="button button-outline button-sm"
                    onClick={() => setShowRejectInput(false)}
                    disabled={working}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="button button-light button-sm"
                    onClick={handleApprove}
                    disabled={working}
                    aria-label={`Approve ${sub.full_name}`}
                  >
                    <Check size={13} /> Approve & Publish
                  </button>
                  <button
                    type="button"
                    className="button button-outline button-sm"
                    onClick={() => setShowRejectInput(true)}
                    disabled={working}
                    aria-label={`Reject ${sub.full_name}`}
                  >
                    <X size={13} /> Reject
                  </button>
                </>
              )}
              <button
                type="button"
                className="button button-outline button-sm delete-btn"
                onClick={() => onDelete(sub.id, sub.avatar_path, sub.full_name)}
                disabled={working}
                aria-label={`Delete submission from ${sub.full_name}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}

          {sub.status !== 'pending' && (
            <div className="submission-actions">
              <button
                type="button"
                className="button button-outline button-sm delete-btn"
                onClick={() => onDelete(sub.id, sub.avatar_path, sub.full_name)}
                disabled={working}
              >
                <Trash2 size={13} /> Delete Record
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function SubmissionsAdmin() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('status') || 'pending'

  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success' })

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'success' }), 4000)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getAllSubmissionsAdmin()
    if (!error && data) setSubmissions(data)
    if (error) showToast('Failed to load submissions.', 'error')
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = submissions.filter(s =>
    currentTab === 'all' ? true : s.status === currentTab
  )
  const pendingCount = submissions.filter(s => s.status === 'pending').length
  const approvedCount = submissions.filter(s => s.status === 'approved').length
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length

  const handleApprove = async (id, signedUrl) => {
    setWorking(true)
    const { error } = await approveSubmission(id, signedUrl)
    setWorking(false)
    if (error) {
      showToast(
        error.message?.includes('Unauthorized')
          ? 'Access denied: admin privileges required.'
          : `Approval failed: ${error.message || 'Unknown error'}`,
        'error'
      )
      return
    }
    showToast('Submission approved — profile published to People page.')
    loadData()
  }

  const handleReject = async (id, reason) => {
    setWorking(true)
    const { error } = await rejectSubmission(id, reason)
    setWorking(false)
    if (error) {
      showToast(`Rejection failed: ${error.message || 'Unknown error'}`, 'error')
      return
    }
    showToast('Submission rejected.')
    loadData()
  }

  const handleDelete = async (id, avatarPath, name) => {
    if (!window.confirm(`Delete the submission from "${name}"? This cannot be undone.`)) return
    setWorking(true)
    const { error } = await deleteSubmission(id, avatarPath)
    setWorking(false)
    if (error) {
      showToast(`Delete failed: ${error.message || 'Unknown error'}`, 'error')
      return
    }
    showToast(`Submission from "${name}" deleted.`)
    loadData()
  }

  const tabs = [
    { key: 'pending', label: 'Pending Review', count: pendingCount, badge: pendingCount > 0 },
    { key: 'approved', label: 'Approved', count: approvedCount },
    { key: 'rejected', label: 'Rejected', count: rejectedCount },
    { key: 'all', label: 'All', count: submissions.length },
  ]

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Photo Submissions</h1>
          <p>Review profile and photo submissions from trip members before they appear publicly.</p>
        </div>
        <button
          type="button"
          className="button button-outline button-sm"
          onClick={loadData}
          disabled={loading}
          aria-label="Refresh submissions list"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Toast */}
      {toast.msg && (
        <div className={`admin-toast ${toast.type}`} role="status">
          {toast.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs">
        {tabs.map(({ key, label, count, badge }) => (
          <button
            key={key}
            className={`tab-btn ${currentTab === key ? 'active' : ''}`}
            onClick={() => setSearchParams(key === 'all' ? {} : { status: key })}
          >
            {label}
            {badge ? (
              <span className="tab-badge">{count}</span>
            ) : (
              <span className="tab-count">({count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="admin-loading">Loading submissions…</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty-full">
          {currentTab === 'pending' ? (
            <>
              <Check size={28} />
              <p>No pending submissions — all caught up!</p>
            </>
          ) : (
            <>
              <Users size={28} />
              <p>No {currentTab === 'all' ? '' : currentTab} submissions yet.</p>
            </>
          )}
        </div>
      ) : (
        <div className="submissions-list">
          {filtered.map(sub => (
            <SubmissionCard
              key={sub.id}
              sub={sub}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelete={handleDelete}
              working={working}
            />
          ))}
        </div>
      )}

      {/* Info box for pending */}
      {currentTab === 'pending' && filtered.length > 0 && (
        <aside className="submission-info-box">
          <AlertCircle size={14} aria-hidden="true" />
          <span>
            Clicking <strong>Approve & Publish</strong> creates a public People profile using
            the submission data and photograph. This action calls a database-verified
            admin function — it cannot be performed by regular users.
          </span>
        </aside>
      )}
    </div>
  )
}
