import React from 'react'
import { MapPin, Calendar, Heart } from 'lucide-react'

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return ''
  }
}

export default function MemoryCard({ memory, theme = 'dark' }) {
  const { title, body, display_name, category, destination_id, created_at, approved_at, image_url } = memory

  return (
    <article className={`editorial-memory-card ${theme === 'light' ? 'card-light' : 'card-dark'}`}>
      {image_url && (
        <div className="memory-card-image-wrap">
          <img
            src={image_url}
            alt={title || `Memory by ${display_name || 'traveler'}`}
            loading="lazy"
            className="memory-card-photo"
          />
        </div>
      )}

      <div className="memory-card-inner">
        <div className="memory-card-header">
          <span className="memory-category-tag">{category || 'Field Note'}</span>
          {(approved_at || created_at) && (
            <time className="memory-date" dateTime={approved_at || created_at}>
              {formatDate(approved_at || created_at)}
            </time>
          )}
        </div>

        {title && <h3 className="memory-title">{title}</h3>}

        <p className="memory-body">{body}</p>

        <div className="memory-card-footer">
          <div className="memory-author">
            <span className="memory-avatar" aria-hidden="true">
              {(display_name || '?').charAt(0).toUpperCase()}
            </span>
            <span className="author-name">{display_name || 'Anonymous'}</span>
          </div>

          {destination_id && (
            <span className="memory-destination-badge">
              <MapPin size={11} aria-hidden="true" />
              <span>{destination_id}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
