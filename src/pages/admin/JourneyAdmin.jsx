import React, { useState, useEffect } from 'react'
import { getAllJourneyDaysAdmin, upsertJourneyDay } from '../../lib/data/journey'
import { BookOpen, Edit2, Check, AlertCircle, Save, X, Calendar, MapPin, Eye } from 'lucide-react'

export default function JourneyAdmin() {
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingDay, setEditingDay] = useState(null)
  const [message, setMessage] = useState('')

  const loadData = async () => {
    setLoading(true)
    const { data } = await getAllJourneyDaysAdmin()
    if (data) setDays(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEdit = (day) => {
    setEditingDay({ ...day, momentsStr: Array.isArray(day.moments) ? day.moments.join(', ') : (day.moments || '') })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editingDay) return
    const moments = editingDay.momentsStr
      ? editingDay.momentsStr.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const payload = {
      ...editingDay,
      moments
    }
    delete payload.momentsStr

    await upsertJourneyDay(payload)
    setMessage('Journey day updated successfully.')
    setEditingDay(null)
    loadData()
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Journey Itinerary</h1>
          <p>Manage the 6-day expedition timeline, stories, and highlights.</p>
        </div>
      </div>

      {message && (
        <div className="admin-toast success">
          <Check size={16} /> {message}
        </div>
      )}

      {loading ? (
        <div className="admin-loading">Loading journey days…</div>
      ) : (
        <div className="admin-grid">
          {days.map((d) => (
            <div className="admin-card" key={d.id || d.day_number}>
              <div className="admin-card-header">
                <span className="badge-gold">Day {d.day_number || d.date}</span>
                <span className={`status-pill ${d.status === 'published' ? 'published' : 'draft'}`}>
                  {d.status || 'published'}
                </span>
              </div>
              <div className="admin-card-body">
                <h3>{d.title}</h3>
                <p className="admin-meta"><MapPin size={13} /> {d.place}</p>
                <p className="admin-meta"><Calendar size={13} /> {d.date} {d.month} · {d.weekday}</p>
                <p className="admin-desc">{d.story?.slice(0, 110)}…</p>
              </div>
              <div className="admin-card-footer">
                <button className="button button-outline button-sm" onClick={() => handleEdit(d)}>
                  <Edit2 size={14} /> Edit Day
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingDay && (
        <div className="admin-modal-backdrop" onClick={() => setEditingDay(null)}>
          <div className="admin-modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Edit Chapter {editingDay.day_number || editingDay.date}: {editingDay.title}</h2>
              <button className="close-btn" onClick={() => setEditingDay(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="admin-form">
              <div className="form-row">
                <label>
                  CHAPTER TITLE
                  <input
                    value={editingDay.title || ''}
                    onChange={e => setEditingDay({ ...editingDay, title: e.target.value })}
                    required
                  />
                </label>
                <label>
                  LOCATION ROUTE
                  <input
                    value={editingDay.place || ''}
                    onChange={e => setEditingDay({ ...editingDay, place: e.target.value })}
                    required
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  SHORT TAGLINE
                  <input
                    value={editingDay.short || ''}
                    onChange={e => setEditingDay({ ...editingDay, short: e.target.value })}
                  />
                </label>
                <label>
                  TIME / DEPARTURE
                  <input
                    value={editingDay.time || ''}
                    onChange={e => setEditingDay({ ...editingDay, time: e.target.value })}
                  />
                </label>
              </div>

              <label>
                HEADER IMAGE URL
                <input
                  value={editingDay.image || ''}
                  onChange={e => setEditingDay({ ...editingDay, image: e.target.value })}
                  placeholder="https://..."
                />
              </label>

              <label>
                DAY STORY & ITINERARY NARRATIVE
                <textarea
                  rows={4}
                  value={editingDay.story || ''}
                  onChange={e => setEditingDay({ ...editingDay, story: e.target.value })}
                  required
                />
              </label>

              <label>
                KEY MOMENTS TO LOOK OUT FOR (comma separated)
                <input
                  value={editingDay.momentsStr || ''}
                  onChange={e => setEditingDay({ ...editingDay, momentsStr: e.target.value })}
                  placeholder="The morning fog, Toy train arrival, Night bonfire"
                />
              </label>

              <label>
                STATUS
                <select
                  value={editingDay.status || 'published'}
                  onChange={e => setEditingDay({ ...editingDay, status: e.target.value })}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>

              <div className="admin-modal-actions">
                <button type="button" className="button button-outline" onClick={() => setEditingDay(null)}>
                  Cancel
                </button>
                <button type="submit" className="button button-light">
                  <Save size={15} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
