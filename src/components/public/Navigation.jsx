import React, { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { LockKeyhole, Menu, X, ChevronDown } from 'lucide-react'

const navLinks = [
  { to: '/journey', label: 'Journey' },
  {
    label: 'Destinations',
    id: 'destinations',
    children: [
      { to: '/destinations/varanasi', label: 'Varanasi' },
      { to: '/destinations/prayagraj', label: 'Prayagraj' },
      { to: '/destinations/chandigarh', label: 'Chandigarh' },
      { to: '/destinations/shimla', label: 'Shimla' },
      { to: '/destinations/kufri', label: 'Kufri & Apple Garden' },
      { to: '/destinations/kalka-shimla-railway', label: 'Toy Train' },
      { to: '/destinations/pinjore', label: 'Pinjore Gardens' },
    ],
  },
  { to: '/gallery', label: 'Gallery' },
  { to: '/people', label: 'Our People' },
  { to: '/memory-board', label: 'Memory Board' },
]

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [destOpen, setDestOpen] = useState(false)
  const location = useLocation()

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false)
    setDestOpen(false)
  }, [location.pathname])

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setDestOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <header className="site-header" role="banner">
      <div className="header-inner">
        <Link to="/" className="site-brand" aria-label="The Memory Vault home">
          <span className="brand-symbol" aria-hidden="true">
            <LockKeyhole size={16} />
          </span>
          <div className="brand-text">
            <span className="brand-title">THE MEMORY <i>VAULT</i></span>
            <span className="brand-subtitle">OCTOBER '26 · FIELD NOTES</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav" aria-label="Main navigation">
          {navLinks.map((item) =>
            item.children ? (
              <div
                key={item.id}
                className="nav-dropdown"
                onMouseEnter={() => setDestOpen(true)}
                onMouseLeave={() => setDestOpen(false)}
              >
                <button
                  type="button"
                  className={`nav-link nav-dropdown-btn ${location.pathname.startsWith('/destinations') ? 'active' : ''}`}
                  onClick={() => setDestOpen((prev) => !prev)}
                  aria-expanded={destOpen}
                  aria-haspopup="true"
                >
                  <span>{item.label}</span>
                  <ChevronDown size={13} className={`dropdown-chevron ${destOpen ? 'open' : ''}`} aria-hidden="true" />
                </button>
                {destOpen && (
                  <div className="nav-dropdown-menu" role="menu">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) => `dropdown-link ${isActive ? 'active' : ''}`}
                        role="menuitem"
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        {/* Header Right / Mobile Toggle */}
        <div className="header-actions">
          <Link to="/memory-board" className="header-cta-btn">
            Contribute
          </Link>
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Close menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {menuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMenuOpen(false)}>
          <div
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            <div className="mobile-drawer-header">
              <span className="brand-title">THE MEMORY <i>VAULT</i></span>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="mobile-drawer-nav">
              <NavLink
                to="/"
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                Home
              </NavLink>
              <NavLink
                to="/journey"
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                The Journey
              </NavLink>

              <div className="mobile-nav-group">
                <span className="mobile-group-title">Destinations</span>
                <div className="mobile-sublinks">
                  {navLinks.find((n) => n.id === 'destinations')?.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) => `mobile-sublink ${isActive ? 'active' : ''}`}
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              </div>

              <NavLink
                to="/gallery"
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                Photo Archive
              </NavLink>
              <NavLink
                to="/people"
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                Our People
              </NavLink>
              <NavLink
                to="/memory-board"
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                Memory Board
              </NavLink>
              <NavLink
                to="/about"
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                About This Archive
              </NavLink>
            </nav>

            <div className="mobile-drawer-footer">
              <Link to="/memory-board" className="button button-brass full-width">
                Leave a Memory
              </Link>
              <p className="drawer-footer-note">15 — 20 October 2026 · Varanasi to Himachal</p>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
