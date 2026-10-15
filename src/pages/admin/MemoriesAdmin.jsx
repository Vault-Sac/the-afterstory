import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getAllMemoriesAdmin, moderateMemory, deleteMemory } from '../../lib/data/memories'
import { MessageSquare, Check, X, Trash2, Filter, AlertCircle, Clock, Heart } from 'lucide-react'

export default function MemoriesAdmin() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('status') || 'all'

  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const loadData = async () => {
    setLoading(true)
    const { data } = await getAllMemoriesAdmin()
    if (data) setMemories(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleApprove = async (id) => {
    await moderateMemory(id, 'approved')
    setMessage('Memory approved and published to public wall.')
    loadData()
    setTimeout(() => setMessage(''), 3000)
  }

  const handleReject = async (id) => {
    await moderateMemory(id, 'rejected')
    setMessage('Memory rejected.')
    loadData()
    setTimeout(() => setMessage(''), 3000)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this memory?')) return
    await deleteMemory(id)
    setMessage('Memory deleted.')
    loadData()
    setTimeout(() => setMessage(''), 3000)
  }

  const filteredMemories = memories.filter(m => {
    if (currentTab === 'all') return true
    return m.moderation_status === currentTab
  })

  const pendingCount = memories.filter(m => m.moderation_status === 'pending').length
  const approvedCount = memories.filter(m => m.moderation_status === 'approved').length
  const rejectedCount = memories.filter(m => m.moderation_status === 'rejected').length

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Memory Moderation Queue</h1>
          <p>Review memories submitted by trip members before they appear on the public wall.</p>
        </div>
      </div>

      {message && (
        <div className="admin-toast success">
          <Check size={16} /> {message}
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab-btn ${currentTab === 'all' ? 'active' : ''}`}
          onClick={() => setSearchParams({})}
        >
          All ({memories.length})
        </button>
        <button
          className={`tab-btn ${currentTab === 'pending' ? 'active' : ''}`}
          onClick={() => setSearchParams({ status: 'pending' })}
        >
          Pending Review {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
        </button>
        <button
          className={`tab-btn ${currentTab === 'approved' ? 'active' : ''}`}
          onClick={() => setSearchParams({ status: 'approved' })}
        >
          Approved ({approvedCount})
        </button>
        <button
          className={`tab-btn ${currentTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setSearchParams({ status: 'rejected' })}
        >
          Rejected ({rejectedCount})
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">Loading moderation items…</div>
      ) : (
        <div className="admin-memories-list">
          {filteredMemories.map(m => (
            <div className={`admin-memory-card status-${m.moderation_status || 'approved'}`} key={m.id}>
              <div className="memory-card-top">
                <div className="author-box">
                  <strong>{m.display_name || m.name || 'Anonymous traveler'}</strong>
                  <span className="author-meta">
                    {m.category || m.mood || 'General memory'} · {m.destination_id || 'Route'} · {m.created_at ? new Date(m.created_at).toLocaleString() : 'Recent'}
                  </span>
                </div>
                <span className={`status-pill ${m.moderation_status || 'approved'}`}>
                  {m.moderation_status || 'approved'}
                </span>
              </div>

              {m.title && <h4 className="memory-title">{m.title}</h4>}
              <p className="memory-text">{m.body || m.message}</p>

              <div className="memory-actions">
                {m.moderation_status !== 'approved' && (
                  <button className="button button-light button-xs" onClick={() => handleApprove(m.id)}>
                    <Check size={14} /> Approve & Publish
                  </button>
                )}
                {m.moderation_status !== 'rejected' && (
                  <button className="button button-outline button-xs" onClick={() => handleReject(m.id)}>
                    <X size={14} /> Reject
                  </button>
                )}
                <button className="button button-outline button-xs delete-btn" onClick={() => handleDelete(m.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}

          {filteredMemories.length === 0 && (
            <div className="admin-empty-full">
              <Check size={32} />
              <p>No memories in the {currentTab} view.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
