import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LockKeyhole, LayoutDashboard, MapPin, Image, Users,
  MessageSquare, FileText, Settings, LogOut, Menu, X, BookOpen, Globe, Camera
} from 'lucide-react'

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/journey', label: 'Journey', icon: BookOpen },
  { to: '/admin/destinations', label: 'Destinations', icon: MapPin },
  { to: '/admin/gallery', label: 'Gallery', icon: Image },
  { to: '/admin/people', label: 'People', icon: Users },
  { to: '/admin/submissions', label: 'Photo Submissions', icon: Camera },
  { to: '/admin/memories', label: 'Memories', icon: MessageSquare },
  { to: '/admin/pages', label: 'Pages', icon: FileText },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Admin navigation">
        <div className="admin-brand">
          <span className="brand-mark"><LockKeyhole size={16} /></span>
          <span>ADMIN<small>MEMORY VAULT CMS</small></span>
        </div>
        <nav className="admin-nav" aria-label="CMS navigation">
          {adminNav.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <a href="/" target="_blank" rel="noreferrer" className="admin-nav-link view-site">
            <Globe size={16} /><span>View Public Site</span>
          </a>
          <div className="admin-user">
            <span className="admin-user-email">{user?.email || 'Demo Admin'}</span>
            <button className="admin-signout" onClick={handleSignOut} aria-label="Sign out">
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="admin-main">
        <div className="admin-topbar">
          <button
            className="admin-menu-toggle"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="admin-topbar-title">Content Management</span>
        </div>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
