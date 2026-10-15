import React from 'react'
import { Link } from 'react-router-dom'
import { Music2, ArrowRight } from 'lucide-react'

export default function Soundtrack() {
  return (
    <div className="soundtrack-page">
      <header className="soundtrack-header theme-pine">
        <div className="section-wrap">
          <span className="section-eyebrow">
            <Music2 size={13} aria-hidden="true" /> EXPEDITION AUDIO ARCHIVE
          </span>
          <h1 className="soundtrack-page-title">
            What we listened to<br /><em>on the way.</em>
          </h1>
          <p className="soundtrack-page-desc">
            Shared playlists, window tracks from the overnight trains, and mountain evening melodies.
          </p>
        </div>
      </header>

      <main className="soundtrack-content-section theme-ivory" aria-label="Playlist entries">
        <div className="section-wrap">
          <div className="soundtrack-card theme-paper">
            <div className="soundtrack-icon-badge">
              <Music2 size={36} aria-hidden="true" />
            </div>

            <h2 className="soundtrack-card-title">Shared Journey Playlist</h2>
            <p className="soundtrack-card-text">
              The official expedition audio collection will be curated here once published.
              It will link to Spotify, Apple Music, and YouTube playlists curated by our group members.
            </p>

            <div className="soundtrack-meta-box">
              <span className="meta-label">CURATION NOTE</span>
              <p>
                Have a song that defines a moment on the train or in the hills? Mention it in a note on the Memory Board.
              </p>
            </div>

            <Link to="/memory-board" className="button button-brass">
              Leave a Memory with Song Mention <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
