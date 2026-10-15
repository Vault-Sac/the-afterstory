import React, { useState, useEffect } from 'react'
import { getAllPeopleAdmin, upsertPerson, deletePerson } from '../../lib/data/people'
import { Users, Plus, Edit2, Trash2, Save, X, Check, AlertCircle } from 'lucide-react'

export default function PeopleAdmin() {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingPerson, setEditingPerson] = useState(null)
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await getAllPeopleAdmin()
    if (error) {
      console.error('Failed to load people:', error)
    }
    if (data) setPeople(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEdit = (p) => {
    setFormError('')
    setEditingPerson({
      id: p.id,
      slug: p.slug,
      full_name: p.full_name || p.name || '',
      role_titile: p.role_titile || p.role_title || p.line || '',
      nickname: p.nickname || '',
      avatar_url: p.avatar_url || '',
      favourite_quote: p.favourite_quote || p.favorite_quote || '',
      bio: p.bio || '',
      status: p.status || 'published',
      display_order: p.display_order ?? (people.length + 1)
    })
  }

  const handleNew = () => {
    setFormError('')
    setEditingPerson({
      id: crypto.randomUUID(),
      full_name: '',
      role_titile: '',
      nickname: '',
      avatar_url: '',
      favourite_quote: '',
      bio: '',
      status: 'published',
      display_order: people.length + 1
    })
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name || 'this person'} from people?`)) return
    const { error } = await deletePerson(id)
    if (error) {
      alert(`Could not delete: ${error.message}`)
      return
    }
    setMessage(`Removed ${name || 'person'}`)
    loadData()
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editingPerson) return

    const trimmedName = (editingPerson.full_name || '').trim()
    if (!trimmedName) {
      setFormError('Please enter a full name.')
      return
    }

    setSaving(true)
    setFormError('')
    setMessage('')

    const payload = {
      id: editingPerson.id,
      slug: editingPerson.slug,
      full_name: trimmedName,
      role_titile: (editingPerson.role_titile || '').trim(),
      nickname: (editingPerson.nickname || '').trim(),
      avatar_url: (editingPerson.avatar_url || '').trim(),
      favourite_quote: (editingPerson.favourite_quote || '').trim(),
      bio: (editingPerson.bio || '').trim(),
      status: editingPerson.status || 'published',
      display_order: editingPerson.display_order ?? (people.length + 1)
    }

    const { data, error } = await upsertPerson(payload)
    setSaving(false)

    if (error) {
      setFormError(error.message || 'Failed to save person to database. Please check credentials or permissions.')
      return
    }

    setMessage(`Person "${data?.full_name || trimmedName}" saved successfully.`)
    setEditingPerson(null)
    loadData()
    setTimeout(() => setMessage(''), 3500)
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Our People</h1>
          <p>Curate profiles, roles, quotes, and memories for all travel companions.</p>
        </div>
        <button className="button button-light" onClick={handleNew} disabled={saving}>
          <Plus size={16} /> Add Person
        </button>
      </div>

      {message && (
        <div className="admin-toast success" role="status">
          <Check size={16} /> {message}
        </div>
      )}

      {loading ? (
        <div className="admin-loading">Loading travelers…</div>
      ) : (
        <div className="admin-people-grid">
          {people.map((p, idx) => (
            <div className="admin-person-card" key={p.id || p.slug || idx}>
              <div className="admin-person-top">
                <div className="admin-person-meta">
                  <h3>{p.full_name || p.name}</h3>
                  <span className="role-tag">{p.role_titile || p.role_title || p.line || 'Traveler'}</span>
                  {p.nickname && <span className="nickname-tag">"{p.nickname}"</span>}
                </div>
                <span className={`status-pill ${p.status === 'published' ? 'published' : 'draft'}`}>
                  {p.status || 'published'}
                </span>
              </div>

              {(p.favourite_quote || p.favorite_quote) && (
                <div className="admin-quote">
                  “{p.favourite_quote || p.favorite_quote}”
                </div>
              )}

              {p.bio && <p className="admin-bio">{p.bio}</p>}

              <div className="admin-card-footer">
                <button className="button button-outline button-sm" onClick={() => handleEdit(p)} disabled={saving}>
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  className="button button-outline button-sm delete-btn"
                  onClick={() => handleDelete(p.id || p.slug, p.full_name || p.name)}
                  disabled={saving}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {people.length === 0 && (
            <div className="admin-empty-full">
              <Users size={32} />
              <p>No traveler profiles yet. Click "Add Person" above to begin!</p>
            </div>
          )}
        </div>
      )}

      {/* Edit / New Modal */}
      {editingPerson && (
        <div className="admin-modal-backdrop" onClick={() => !saving && setEditingPerson(null)}>
          <div className="admin-modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editingPerson.full_name ? `Edit: ${editingPerson.full_name}` : 'New Traveler'}</h2>
              <button
                className="close-btn"
                onClick={() => setEditingPerson(null)}
                aria-label="Close"
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="admin-form" noValidate>
              {formError && (
                <div className="admin-toast error" style={{ margin: '0 0 16px 0', background: 'rgba(214, 69, 69, 0.15)', border: '1px solid rgba(214, 69, 69, 0.4)', color: '#ff8a8a', padding: '10px 14px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-row">
                <label>
                  FULL NAME <span aria-hidden="true">*</span>
                  <input
                    type="text"
                    value={editingPerson.full_name || ''}
                    onChange={e => setEditingPerson({ ...editingPerson, full_name: e.target.value })}
                    placeholder="e.g. Megha Sharma"
                    required
                    disabled={saving}
                  />
                </label>
                <label>
                  ROLE / TRIP MONIKER (e.g. Lead Navigator, DJ)
                  <input
                    type="text"
                    value={editingPerson.role_titile || ''}
                    onChange={e => setEditingPerson({ ...editingPerson, role_titile: e.target.value })}
                    placeholder="e.g. Lead Navigator"
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  NICKNAME
                  <input
                    type="text"
                    value={editingPerson.nickname || ''}
                    onChange={e => setEditingPerson({ ...editingPerson, nickname: e.target.value })}
                    placeholder="e.g. Captain"
                    disabled={saving}
                  />
                </label>
              </div>

              <label>
                FAVORITE TRIP QUOTE
                <input
                  type="text"
                  value={editingPerson.favourite_quote || ''}
                  onChange={e => setEditingPerson({ ...editingPerson, favourite_quote: e.target.value })}
                  placeholder="e.g. Don't worry, the train will wait for us."
                  disabled={saving}
                />
              </label>

              <label>
                SHORT BIO / STORY
                <textarea
                  rows={3}
                  value={editingPerson.bio || ''}
                  onChange={e => setEditingPerson({ ...editingPerson, bio: e.target.value })}
                  placeholder="Tell something memorable about them on this expedition…"
                  disabled={saving}
                />
              </label>

              <label>
                STATUS
                <select
                  value={editingPerson.status || 'published'}
                  onChange={e => setEditingPerson({ ...editingPerson, status: e.target.value })}
                  disabled={saving}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setEditingPerson(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-light" disabled={saving}>
                  <Save size={15} /> {saving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
