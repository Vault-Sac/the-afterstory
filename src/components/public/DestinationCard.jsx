import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

export default function DestinationCard({ destination }) {
  const { slug, name, chapter_title, tagline, dates, hero_image, display_order } = destination
  const [imgLoaded, setImgLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const fallbackImage = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80'

  return (
    <Link
      to={`/destinations/${slug}`}
      className="destination-card"
      aria-label={`${name} — Chapter ${display_order || '00'}: ${chapter_title || ''}`}
    >
      <div className="dest-image-wrap">
        {!imgLoaded && !hasError && <div className="image-skeleton" aria-hidden="true" />}
        <img
          src={hasError ? fallbackImage : (hero_image || fallbackImage)}
          alt={`${name} landscape`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            setHasError(true)
            setImgLoaded(true)
          }}
          className={`dest-photo ${imgLoaded ? 'loaded' : ''}`}
        />
        <div className="dest-image-badge">
          <span>{dates}</span>
        </div>
      </div>

      <div className="dest-card-content">
        <div className="dest-card-header">
          <span className="eyebrow-small">
            CHAPTER {String(display_order || 1).padStart(2, '0')}
          </span>
          <span className="dest-arrow" aria-hidden="true">
            <ArrowUpRight size={15} />
          </span>
        </div>

        <h3 className="dest-card-title">{name}</h3>
        <p className="dest-card-desc">
          {tagline || chapter_title || 'An unforgettable stop along the expedition.'}
        </p>

        <span className="dest-card-action">
          Explore Chapter & Memories
        </span>
      </div>
    </Link>
  )
}
