import React, { useState, useEffect } from 'react'
import { getAllPeopleAdmin, upsertPerson, deletePerson } from '../../lib/data/people'
import { Users, Plus, Edit2, Trash2, Save, X, Check, Heart } from 'lucide-react'

export default function PeopleAdmin() {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPerson, setEditingPerson] = useState(null)
  const [message, setMessage] = useState('')

  const loadData = async () => {
    setLoading(true)
    const { data } = await getAllPeopleAdmin()
    if (data) setPeople(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEdit = (p) => {
    setEditingPerson({ ...p })
  }

  const handleNew = () => {
    setEditingPerson({
      id: crypto.randomUUID(),
      full_name: '',
      role_title: '',
      nickname: '',
      avatar_url: '',
      favorite_quote: '',
      bio: '',
      status: 'published',
      display_order: people.length + 1
    })
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name} from people?`)) return
    await deletePerson(id)
    setMessage(`Removed ${name}`)
    loadData()
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editingPerson) return

    await upsertPerson(editingPerson)
    setMessage('Person saved successfully.')
    setEditingPerson(null)
    loadData()
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Our People</h1>
          <p>Curate profiles, roles, quotes, and memories for all travel companions.</p>
        </div>
        <button className="button button-light" onClick={handleNew}>
          <Plus size={16} /> Add Person
        </button>
      </div>

      {message && (
        <div className="admin-toast success">
          <Check size={16} /> {message}
        </div>
      )}

      {loading ? (
        <div className="admin-loading">Loading travelers…</div>
      ) : (
        <div className="admin-people-grid">
          {people.map((p, idx) => (
            <div className="admin-person-card" key={p.id || p.slug}>
              <div className="admin-person-top">
                <div className={`admin-avatar avatar-${idx % 5}`}>
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.full_name || p.name} />
                  ) : (
                    <span>{(p.full_name || p.name || '?')[0].toUpperCase()}</span>
                  )}
                </div>
                <div className="admin-person-meta">
                  <h3>{p.full_name || p.name}</h3>
                  <span className="role-tag">{p.role_title || p.line || 'Traveler'}</span>
                  {p.nickname && <span className="nickname-tag">"{p.nickname}"</span>}
                </div>
                <span className={`status-pill ${p.status === 'published' ? 'published' : 'draft'}`}>
                  {p.status || 'published'}
                </span>
              </div>

              {p.favorite_quote && (
                <div className="admin-quote">
                  “{p.favorite_quote}”
                </div>
              )}

              {p.bio && <p className="admin-bio">{p.bio}</p>}

              <div className="admin-card-footer">
                <button className="button button-outline button-sm" onClick={() => handleEdit(p)}>
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  className="button button-outline button-sm delete-btn"
                  onClick={() => handleDelete(p.id || p.slug, p.full_name || p.name)}
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

      {/* Edit Modal */}
      {editingPerson && (
        <div className="admin-modal-backdrop" onClick={() => setEditingPerson(null)}>
          <div className="admin-modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editingPerson.full_name ? `Edit: ${editingPerson.full_name}` : 'New Traveler'}</h2>
              <button className="close-btn" onClick={() => setEditingPerson(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="admin-form">
              <div className="form-row">
                <label>
                  FULL NAME
                  <input
                    value={editingPerson.full_name || editingPerson.name || ''}
                    onChange={e => setEditingPerson({ ...editingPerson, full_name: e.target.value, name: e.target.value })}
                    required
                  />
                </label>
                <label>
                  ROLE / TRIP MONIKER (e.g. Lead Navigator, DJ)
                  <input
                    value={editingPerson.role_title || editingPerson.line || ''}
                    onChange={e => setEditingPerson({ ...editingPerson, role_title: e.target.value, line: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  NICKNAME
                  <input
                    value={editingPerson.nickname || ''}
                    onChange={e => setEditingPerson({ ...editingPerson, nickname: e.target.value })}
                    placeholder="e.g. Captain"
                  />
                </label>
                <label>
                  AVATAR / PHOTO URL (optional)
                  <input
                    value={editingPerson.avatar_url || ''}
                    onChange={e => setEditingPerson({ ...editingPerson, avatar_url: e.target.value })}
                    placeholder="https://..."
                  />
                </label>
              </div>

              <label>
                FAVORITE TRIP QUOTE
                <input
                  value={editingPerson.favorite_quote || ''}
                  onChange={e => setEditingPerson({ ...editingPerson, favorite_quote: e.target.value })}
                  placeholder="e.g. Don't worry, the train will wait for us."
                />
              </label>

              <label>
                SHORT BIO / STORY
                <textarea
                  rows={3}
                  value={editingPerson.bio || ''}
                  onChange={e => setEditingPerson({ ...editingPerson, bio: e.target.value })}
                  placeholder="Tell something memorable about them on this expedition…"
                />
              </label>

              <label>
                STATUS
                <select
                  value={editingPerson.status || 'published'}
                  onChange={e => setEditingPerson({ ...editingPerson, status: e.target.value })}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>

              <div className="admin-modal-actions">
                <button type="button" className="button button-outline" onClick={() => setEditingPerson(null)}>
                  Cancel
                </button>
                <button type="submit" className="button button-light">
                  <Save size={15} /> Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
