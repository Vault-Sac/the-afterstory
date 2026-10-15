import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export default function Lightbox({ items, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex)
  const item = items[index]
  const dialogRef = useRef(null)

  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), [])
  const next = useCallback(() => setIndex(i => Math.min(items.length - 1, i + 1)), [items.length])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  useEffect(() => {
    dialogRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!item) return null

  return (
    <div
      className="lightbox"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo lightbox"
      ref={dialogRef}
      tabIndex={-1}
    >
      <button className="lightbox-close" onClick={onClose} aria-label="Close lightbox">
        <X size={20} />
      </button>

      <button
        className="lightbox-arrow lightbox-prev"
        onClick={e => { e.stopPropagation(); prev() }}
        disabled={index === 0}
        aria-label="Previous photo"
      >
        <ChevronLeft size={24} />
      </button>

      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        <div className="lightbox-image-wrap">
          <img
            src={item.image || item.public_url}
            alt={item.alt_text || item.title || 'Gallery photo'}
          />
        </div>
        <div className="lightbox-meta">
          {item.tag && <span className="eyebrow">{item.tag} / {item.place || item.destination_id}</span>}
          {item.title && <h3>{item.title}</h3>}
          {(item.caption || item.place) && <p>{item.caption || item.place}</p>}
          <span className="lightbox-count">{index + 1} / {items.length}</span>
        </div>
      </div>

      <button
        className="lightbox-arrow lightbox-next"
        onClick={e => { e.stopPropagation(); next() }}
        disabled={index === items.length - 1}
        aria-label="Next photo"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  )
}
