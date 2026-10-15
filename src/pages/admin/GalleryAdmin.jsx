import React, { useState, useEffect } from 'react'
import { getAllMediaAdmin, uploadMediaAdmin, deleteMediaRecord, updateMediaRecord } from '../../lib/data/gallery'
import { destinations } from '../../lib/data/seed'
import { Image, Upload, Trash2, Check, X, Filter, Sparkles, AlertCircle } from 'lucide-react'

export default function GalleryAdmin() {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filterDest, setFilterDest] = useState('')
  const [message, setMessage] = useState('')
  const [caption, setCaption] = useState('')
  const [selectedDest, setSelectedDest] = useState('')

  const loadData = async () => {
    setLoading(true)
    const { data } = await getAllMediaAdmin()
    if (data) setMedia(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('')
    const { data, error } = await uploadMediaAdmin(file, {
      caption: caption || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      destination_id: selectedDest || null,
      alt_text: caption || file.name
    })

    setUploading(false)
    if (error) {
      alert(error.message || 'Failed to upload image')
    } else {
      setMessage('Photo added to gallery successfully.')
      setCaption('')
      e.target.value = ''
      loadData()
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleDelete = async (id, storagePath) => {
    if (!window.confirm('Are you sure you want to delete this media item?')) return
    await deleteMediaRecord(id, storagePath)
    setMessage('Photo deleted.')
    loadData()
    setTimeout(() => setMessage(''), 3000)
  }

  const handleToggleStatus = async (item) => {
    const newStatus = item.publication_status === 'published' ? 'draft' : 'published'
    await updateMediaRecord(item.id, { publication_status: newStatus })
    setMessage(`Updated status to ${newStatus}`)
    loadData()
    setTimeout(() => setMessage(''), 2500)
  }

  const filteredMedia = media.filter(m => {
    if (!filterDest) return true
    return m.destination_id === filterDest || m.place?.toLowerCase().includes(filterDest.toLowerCase())
  })

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Photo & Media Archive</h1>
          <p>Curate photographs, assign locations, set captions, and manage visibility.</p>
        </div>
      </div>

      {message && (
        <div className="admin-toast success">
          <Check size={16} /> {message}
        </div>
      )}

      {/* Upload Box */}
      <div className="admin-upload-card">
        <h3><Upload size={17} /> Add New Media to Archive</h3>
        <p className="admin-upload-sub">Supports JPEG, PNG, WebP up to 8MB. Automatically optimizes and links to destinations.</p>
        
        <div className="upload-controls">
          <div className="upload-fields">
            <input
              type="text"
              placeholder="Caption / Description for photo…"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className="admin-input"
            />
            <select
              value={selectedDest}
              onChange={e => setSelectedDest(e.target.value)}
              className="admin-select"
            >
              <option value="">Link to Destination (Optional)</option>
              {destinations.map(d => (
                <option key={d.slug} value={d.slug}>{d.name}</option>
              ))}
            </select>
          </div>

          <label className="button button-light upload-file-btn">
            {uploading ? 'Processing…' : 'Select Photo & Upload'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              hidden
            />
          </label>
        </div>
      </div>

      {/* Filters bar */}
      <div className="admin-filter-bar">
        <div className="filter-title">
          <Filter size={15} /> Filter by destination:
        </div>
        <button
          className={`filter-chip ${!filterDest ? 'active' : ''}`}
          onClick={() => setFilterDest('')}
        >
          All ({media.length})
        </button>
        {destinations.map(d => (
          <button
            key={d.slug}
            className={`filter-chip ${filterDest === d.slug ? 'active' : ''}`}
            onClick={() => setFilterDest(d.slug)}
          >
            {d.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-loading">Loading archive media…</div>
      ) : (
        <div className="admin-media-grid">
          {filteredMedia.map(m => (
            <div className="admin-media-card" key={m.id}>
              <div className="media-preview">
                <img src={m.public_url || m.image} alt={m.alt_text || m.title || 'Trip photo'} />
                <span className={`status-pill ${m.publication_status === 'published' ? 'published' : 'draft'}`}>
                  {m.publication_status || 'published'}
                </span>
              </div>
              <div className="media-info">
                <strong>{m.caption || m.title || 'Untitled moment'}</strong>
                <span className="media-dest">{m.destination_id || m.place || 'General'}</span>
              </div>
              <div className="media-actions">
                <button
                  className="button button-outline button-xs"
                  onClick={() => handleToggleStatus(m)}
                >
                  {m.publication_status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  className="button button-outline button-xs delete-btn"
                  onClick={() => handleDelete(m.id, m.storage_path)}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          {filteredMedia.length === 0 && (
            <div className="admin-empty-full">
              <Image size={24} />
              <p>No photos in this destination filter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
