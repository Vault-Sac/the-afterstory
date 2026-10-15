import React from 'react'
import { Link } from 'react-router-dom'
import { LockKeyhole, ArrowRight, ShieldCheck, Heart, Compass } from 'lucide-react'

export default function About() {
  return (
    <div className="about-page">
      <header className="about-header theme-pine">
        <div className="section-wrap">
          <span className="section-eyebrow">ABOUT THIS ARCHIVE</span>
          <h1 className="about-page-title">
            Why this <em>exists.</em>
          </h1>
          <p className="about-page-desc">
            A permanent digital repository for the October 2026 group journey from Varanasi through Shimla and Chandigarh.
          </p>
        </div>
      </header>

      <main className="about-content-section theme-ivory">
        <div className="section-wrap">
          <div className="about-editorial-grid">
            <div className="about-prose">
              <section className="about-block">
                <h2 className="about-subtitle">The Purpose</h2>
                <p>
                  Trips become memories. Memories become fragments. This archive is an attempt to hold them together —
                  the photographs, the stories, the inside jokes, and the spontaneous moments that happened between the scheduled stops.
                </p>
                <p>
                  Every page, every destination chapter, and every submitted memory is here because someone in our circle thought it was worth keeping.
                </p>
              </section>

              <section className="about-block">
                <h2 className="about-subtitle">How Contribution Works</h2>
                <p>
                  The <strong>Memory Board</strong> is the single designated public contribution area. Companions can submit memories,
                  photographs, and thoughts associated with specific destinations or the journey as a whole.
                </p>
                <p>
                  To preserve privacy and prevent unwanted spam, every submission enters a private moderation queue before appearing on the public board.
                </p>
              </section>

              <section className="about-block">
                <h2 className="about-subtitle">Privacy & Consent</h2>
                <p>
                  This archive is shared with our circle. Photographs and profiles are published with discretion.
                  Any companion can request the modification or removal of an entry at any time by speaking to the archive administrator.
                </p>
                <p>
                  No personal data is collected for commercial purposes or third-party sharing.
                </p>
              </section>
            </div>

            <aside className="about-sidebar">
              <div className="about-passport-card theme-paper">
                <div className="passport-mark">
                  <LockKeyhole size={24} aria-hidden="true" />
                </div>
                <h3 className="passport-title">THE MEMORY VAULT</h3>
                <span className="passport-edition">OCTOBER '26 FIELD ARCHIVE</span>

                <div className="passport-details">
                  <div className="passport-row">
                    <span className="passport-label">ROUTE</span>
                    <strong className="passport-val">Varanasi — Shimla — Chandigarh</strong>
                  </div>
                  <div className="passport-row">
                    <span className="passport-label">DATES</span>
                    <strong className="passport-val">15 — 20 October 2026</strong>
                  </div>
                  <div className="passport-row">
                    <span className="passport-label">EDITION</span>
                    <strong className="passport-val">Group Travel Journal</strong>
                  </div>
                </div>

                <div className="passport-actions">
                  <Link to="/journey" className="text-link-block">
                    <span>Explore Route Itinerary</span>
                    <ArrowRight size={13} />
                  </Link>
                  <Link to="/memory-board" className="text-link-block">
                    <span>Contribute to Memory Board</span>
                    <ArrowRight size={13} />
                  </Link>
                  <Link to="/gallery" className="text-link-block">
                    <span>View Photo Archive</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
