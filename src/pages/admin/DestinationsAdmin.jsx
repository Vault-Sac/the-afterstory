import React, { useState, useEffect } from 'react'
import { getAllDestinationsAdmin, upsertDestination, deleteDestination } from '../../lib/data/destinations'
import { MapPin, Edit2, Trash2, Plus, Save, X, Check, ExternalLink } from 'lucide-react'

export default function DestinationsAdmin() {
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingDest, setEditingDest] = useState(null)
  const [message, setMessage] = useState('')

  const loadData = async () => {
    setLoading(true)
    const { data } = await getAllDestinationsAdmin()
    if (data) setDestinations(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEdit = (dest) => {
    setEditingDest({
      ...dest,
      highlightsStr: Array.isArray(dest.highlights) ? dest.highlights.join('; ') : (dest.highlights || ''),
      tipsStr: Array.isArray(dest.travel_tips) ? dest.travel_tips.join('; ') : (dest.travel_tips || '')
    })
  }

  const handleNew = () => {
    setEditingDest({
      id: crypto.randomUUID(),
      name: '',
      slug: '',
      tagline: '',
      chapter_title: '',
      dates: '',
      hero_image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=85',
      description: '',
      highlightsStr: '',
      tipsStr: '',
      status: 'published'
    })
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return
    await deleteDestination(id)
    setMessage(`Removed destination: ${name}`)
    loadData()
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editingDest) return
    const highlights = editingDest.highlightsStr
      ? editingDest.highlightsStr.split(';').map(s => s.trim()).filter(Boolean)
      : []
    const travel_tips = editingDest.tipsStr
      ? editingDest.tipsStr.split(';').map(s => s.trim()).filter(Boolean)
      : []

    const payload = {
      ...editingDest,
      highlights,
      travel_tips,
      slug: editingDest.slug || editingDest.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }
    delete payload.highlightsStr
    delete payload.tipsStr

    await upsertDestination(payload)
    setMessage('Destination saved successfully.')
    setEditingDest(null)
    loadData()
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Destinations</h1>
          <p>Manage all route stops, hero photography, descriptions, highlights, and tips.</p>
        </div>
        <button className="button button-light" onClick={handleNew}>
          <Plus size={16} /> New Destination
        </button>
      </div>

      {message && (
        <div className="admin-toast success">
          <Check size={16} /> {message}
        </div>
      )}

      {loading ? (
        <div className="admin-loading">Loading destinations…</div>
      ) : (
        <div className="admin-grid">
          {destinations.map((d) => (
            <div className="admin-card" key={d.id || d.slug}>
              <div className="admin-card-media">
                <img src={d.hero_image} alt={d.name} />
                <span className={`status-pill ${d.status === 'published' ? 'published' : 'draft'}`}>
                  {d.status || 'published'}
                </span>
              </div>
              <div className="admin-card-body">
                <h3>{d.name}</h3>
                <p className="admin-meta">{d.chapter_title} · {d.dates}</p>
                <p className="admin-desc">{d.tagline || d.description?.slice(0, 90)}…</p>
              </div>
              <div className="admin-card-footer">
                <a
                  href={`/destinations/${d.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="button button-outline button-sm"
                  title="View Public Page"
                >
                  <ExternalLink size={14} /> Preview
                </a>
                <div className="action-buttons">
                  <button className="button button-outline button-sm" onClick={() => handleEdit(d)}>
                    <Edit2 size={14} />
                  </button>
                  <button className="button button-outline button-sm delete-btn" onClick={() => handleDelete(d.id || d.slug, d.name)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingDest && (
        <div className="admin-modal-backdrop" onClick={() => setEditingDest(null)}>
          <div className="admin-modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editingDest.name ? `Edit: ${editingDest.name}` : 'New Destination'}</h2>
              <button className="close-btn" onClick={() => setEditingDest(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="admin-form">
              <div className="form-row">
                <label>
                  DESTINATION NAME
                  <input
                    value={editingDest.name || ''}
                    onChange={e => setEditingDest({ ...editingDest, name: e.target.value })}
                    required
                  />
                </label>
                <label>
                  URL SLUG (e.g. shimla, kufri)
                  <input
                    value={editingDest.slug || ''}
                    onChange={e => setEditingDest({ ...editingDest, slug: e.target.value })}
                    required
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  CHAPTER LABEL (e.g. CHAPTER 02)
                  <input
                    value={editingDest.chapter_title || ''}
                    onChange={e => setEditingDest({ ...editingDest, chapter_title: e.target.value })}
                  />
                </label>
                <label>
                  DATES (e.g. 16 — 17 OCT)
                  <input
                    value={editingDest.dates || ''}
                    onChange={e => setEditingDest({ ...editingDest, dates: e.target.value })}
                  />
                </label>
              </div>

              <label>
                TAGLINE
                <input
                  value={editingDest.tagline || ''}
                  onChange={e => setEditingDest({ ...editingDest, tagline: e.target.value })}
                  placeholder="Where the hills meet the horizon."
                />
              </label>

              <label>
                HERO PHOTO URL
                <input
                  value={editingDest.hero_image || ''}
                  onChange={e => setEditingDest({ ...editingDest, hero_image: e.target.value })}
                  required
                />
              </label>

              <label>
                FULL DESCRIPTION / OVERVIEW
                <textarea
                  rows={4}
                  value={editingDest.description || ''}
                  onChange={e => setEditingDest({ ...editingDest, description: e.target.value })}
                  required
                />
              </label>

              <label>
                KEY HIGHLIGHTS (semicolon separated)
                <textarea
                  rows={2}
                  value={editingDest.highlightsStr || ''}
                  onChange={e => setEditingDest({ ...editingDest, highlightsStr: e.target.value })}
                  placeholder="The Ridge evening walk; Mall Road cafe hopping; Christ Church sunset"
                />
              </label>

              <label>
                TRAVEL TIPS (semicolon separated)
                <textarea
                  rows={2}
                  value={editingDest.tipsStr || ''}
                  onChange={e => setEditingDest({ ...editingDest, tipsStr: e.target.value })}
                  placeholder="Carry light woollens; Keep water handy; Watch out for monkeys on Mall Road"
                />
              </label>

              <label>
                STATUS
                <select
                  value={editingDest.status || 'published'}
                  onChange={e => setEditingDest({ ...editingDest, status: e.target.value })}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>

              <div className="admin-modal-actions">
                <button type="button" className="button button-outline" onClick={() => setEditingDest(null)}>
                  Cancel
                </button>
                <button type="submit" className="button button-light">
                  <Save size={15} /> Save Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
