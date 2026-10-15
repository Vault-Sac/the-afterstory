import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Image, MessageSquare, Users, Clock, CheckCircle, AlertCircle, FileText, Camera } from 'lucide-react'
import { getAllMemoriesAdmin } from '../../lib/data/memories'
import { getAllDestinationsAdmin } from '../../lib/data/destinations'
import { getAllMediaAdmin } from '../../lib/data/gallery'
import { getAllPeopleAdmin } from '../../lib/data/people'
import { getAllSubmissionsAdmin } from '../../lib/data/submissions'
import { destinations, journeyDays } from '../../lib/data/seed'

function StatCard({ icon: Icon, label, value, sub, to, color }) {
  const Inner = (
    <div className="stat-card" style={{ '--accent': color }}>
      <div className="stat-icon"><Icon size={20} /></div>
      <div className="stat-body">
        <span className="stat-value">{value ?? '—'}</span>
        <span className="stat-label">{label}</span>
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
    </div>
  )
  return to ? <Link to={to} className="stat-card-link">{Inner}</Link> : Inner
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ memories: 0, pending: 0, destinations: 0, media: 0, people: 0, pendingSubmissions: 0 })
  const [recentMemories, setRecentMemories] = useState([])

  useEffect(() => {
    Promise.all([
      getAllMemoriesAdmin(),
      getAllDestinationsAdmin(),
      getAllMediaAdmin(),
      getAllPeopleAdmin(),
      getAllSubmissionsAdmin({ status: 'pending' }),
    ]).then(([memRes, destRes, mediaRes, peopleRes, subRes]) => {
      const mems = memRes.data || []
      const subs = subRes.data || []
      setStats({
        memories: mems.filter(m => m.moderation_status === 'approved').length,
        pending: mems.filter(m => m.moderation_status === 'pending').length,
        destinations: (destRes.data || destinations).filter(d => d.status === 'published').length,
        media: (mediaRes.data || []).length,
        people: (peopleRes.data || []).filter(p => p.status === 'published').length,
        pendingSubmissions: subs.length,
      })
      setRecentMemories(mems.filter(m => m.moderation_status === 'pending').slice(0, 5))
    })
  }, [])

  return (
    <div className="admin-dashboard">
      <div className="admin-page-header">
        <h1>Dashboard</h1>
        <p>Overview of The Memory Vault content.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon={MapPin} label="Published Destinations" value={stats.destinations} color="#5C7A5A" to="/admin/destinations" />
        <StatCard icon={Image} label="Gallery Items" value={stats.media} color="#4A6B8A" to="/admin/gallery" />
        <StatCard icon={MessageSquare} label="Approved Memories" value={stats.memories} color="#7A6B3D" to="/admin/memories" />
        <StatCard icon={AlertCircle} label="Pending Memories" value={stats.pending} color="#8A4A4A" to="/admin/memories?status=pending" sub={stats.pending > 0 ? "Needs attention" : ""} />
        <StatCard icon={Users} label="Published People" value={stats.people} color="#6B4A8A" to="/admin/people" />
        <StatCard icon={Camera} label="Photo Submissions" value={stats.pendingSubmissions} color="#4A7A8A" to="/admin/submissions" sub={stats.pendingSubmissions > 0 ? "Needs review" : "All reviewed"} />
        <StatCard icon={FileText} label="Journey Days" value={journeyDays.length} color="#6B7A4A" to="/admin/journey" />
      </div>

      {/* Pending memories */}
      <div className="admin-section">
        <div className="admin-section-header">
          <h2><Clock size={16} /> Pending Submissions</h2>
          <Link to="/admin/memories?status=pending" className="text-button">View all →</Link>
        </div>
        {recentMemories.length > 0 ? (
          <div className="admin-table">
            <div className="admin-table-head">
              <span>Name</span>
              <span>Category</span>
              <span>Submitted</span>
              <span>Action</span>
            </div>
            {recentMemories.map(m => (
              <div className="admin-table-row" key={m.id}>
                <span>{m.display_name || 'Anonymous'}</span>
                <span>{m.category || '—'}</span>
                <span>{m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</span>
                <Link to={`/admin/memories`} className="text-button admin-action">Review</Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-empty">
            <CheckCircle size={20} />
            <span>No pending submissions. All caught up!</span>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="admin-section">
        <h2>Quick Actions</h2>
        <div className="quick-links">
          <Link to="/admin/destinations" className="quick-link"><MapPin size={15}/> Manage Destinations</Link>
          <Link to="/admin/gallery" className="quick-link"><Image size={15}/> Upload Photos</Link>
          <Link to="/admin/submissions" className="quick-link"><Camera size={15}/> Photo Submissions</Link>
          <Link to="/admin/memories?status=pending" className="quick-link"><MessageSquare size={15}/> Moderate Memories</Link>
          <Link to="/admin/people" className="quick-link"><Users size={15}/> Add People</Link>
          <Link to="/admin/pages" className="quick-link"><FileText size={15}/> Edit Pages</Link>
          <Link to="/admin/settings" className="quick-link"><AlertCircle size={15}/> Settings</Link>
        </div>
      </div>
    </div>
  )
}
