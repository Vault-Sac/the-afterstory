import React from 'react'
import { Link } from 'react-router-dom'
import { LockKeyhole, ArrowUp } from 'lucide-react'

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="section-wrap footer-inner">
        <div className="footer-top">
          <Link to="/" className="site-brand footer-brand" aria-label="The Memory Vault home">
            <span className="brand-symbol" aria-hidden="true">
              <LockKeyhole size={16} />
            </span>
            <div className="brand-text">
              <span className="brand-title">THE MEMORY <i>VAULT</i></span>
              <span className="brand-subtitle">OCTOBER '26 · DIGITAL ARCHIVE</span>
            </div>
          </Link>

          <nav className="footer-nav" aria-label="Footer navigation">
            <Link to="/journey">Journey</Link>
            <Link to="/destinations/varanasi">Destinations</Link>
            <Link to="/gallery">Gallery</Link>
            <Link to="/people">Our People</Link>
            <Link to="/memory-board">Memory Board</Link>
            <Link to="/about">About & Privacy</Link>
          </nav>
        </div>

        <div className="footer-bottom">
          <div className="footer-meta">
            <span className="footer-route">Varanasi — Shimla — Chandigarh</span>
            <span className="footer-dates">15 — 20 October 2026</span>
          </div>

          <p className="footer-closing">
            A private digital repository for shared conversations, real photographs, and memories that last.
          </p>

          <button
            type="button"
            className="footer-back-to-top"
            onClick={scrollToTop}
            aria-label="Scroll back to top"
          >
            <span>Back to top</span>
            <ArrowUp size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  )
}
