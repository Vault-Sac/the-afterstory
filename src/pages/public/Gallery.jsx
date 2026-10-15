import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Camera, ArrowUpRight, Filter, X } from 'lucide-react'
import { getGalleryMedia } from '../../lib/data/gallery'
import { seedGallery, destinations } from '../../lib/data/seed'
import Lightbox from '../../components/public/Lightbox'
import { LoadingState } from '../../components/public/UIStates'

export default function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [photos, setPhotos] = useState(seedGallery)
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const search = searchParams.get('q') || ''
  const destFilter = searchParams.get('dest') || ''

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    getGalleryMedia({ destinationId: destFilter || undefined }).then(({ data }) => {
      if (data?.length) setPhotos(data)
      setLoading(false)
    })
  }, [destFilter])

  const filtered = photos.filter((p) => {
    if (!search) return true
    const hay = `${p.title || ''} ${p.place || ''} ${p.tag || ''} ${p.caption || ''} ${p.destination_id || ''}`.toLowerCase()
    return hay.includes(search.toLowerCase())
  })

  const setFilter = (key, value) => {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value)
    else p.delete(key)
    setSearchParams(p)
  }

  return (
    <div className="gallery-page">
      {/* Page Header */}
      <header className="gallery-header theme-pine">
        <div className="section-wrap">
          <span className="section-eyebrow">
            <Camera size={13} aria-hidden="true" /> CURATED EXPEDITION FRAMES
          </span>
          <h1 className="gallery-page-title">
            Proof that <em>we were here.</em>
          </h1>
          <p className="gallery-page-desc">
            Visual archive of landscapes, mountain tracks, trains, and shared moments across Uttar Pradesh and Himachal Pradesh.
          </p>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <section className="gallery-controls-bar theme-paper" aria-label="Photo filters">
        <div className="section-wrap controls-inner">
          <div className="board-search-field">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setFilter('q', e.target.value)}
              placeholder="Find a place, station, or moment…"
              aria-label="Search photos"
            />
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setFilter('q', '')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="board-filter-group">
            <span className="filter-group-label">
              <Filter size={12} /> Destination:
            </span>
            <div className="filter-pills-row">
              <button
                type="button"
                className={`filter-pill ${!destFilter ? 'active' : ''}`}
                onClick={() => setFilter('dest', '')}
              >
                All Destinations ({photos.length})
              </button>
              {destinations.map((d) => (
                <button
                  type="button"
                  key={d.slug}
                  className={`filter-pill ${destFilter === d.slug ? 'active' : ''}`}
                  onClick={() => setFilter('dest', destFilter === d.slug ? '' : d.slug)}
                  aria-pressed={destFilter === d.slug}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Photo Grid Section */}
      <main className="gallery-grid-section theme-ivory" aria-label="Photo gallery images">
        <div className="section-wrap">
          <div className="gallery-status-bar">
            <span>Showing <strong>{filtered.length}</strong> photographs</span>
            {(destFilter || search) && (
              <button
                type="button"
                className="reset-filters-btn"
                onClick={() => setSearchParams({})}
              >
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="gallery-loading">
              <LoadingState message="Loading photo archive…" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="editorial-gallery-grid">
              {filtered.map((photo, i) => (
                <figure
                  key={photo.id || i}
                  className="editorial-photo-card"
                  onClick={() => setLightboxIndex(i)}
                >
                  <div className="gallery-card-media">
                    <img
                      src={photo.image || photo.public_url}
                      alt={photo.alt_text || photo.title || 'Expedition photograph'}
                      loading="lazy"
                      className="gallery-card-img"
                    />
                    <div className="photo-expand-badge" aria-hidden="true">
                      <ArrowUpRight size={14} />
                    </div>
                  </div>

                  <figcaption className="gallery-card-caption">
                    <strong className="caption-title">{photo.title || photo.caption || 'Field snapshot'}</strong>
                    <span className="caption-sub">{photo.place || photo.tag || 'Expedition stop'}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="gallery-empty-state">
              <Camera size={36} aria-hidden="true" />
              <h3>No moments found matching that filter</h3>
              <p>Try clearing your search query or selecting "All Destinations" above.</p>
              <button
                type="button"
                className="button button-brass"
                onClick={() => setSearchParams({})}
              >
                Show All Photos
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Lightbox modal */}
      {lightboxIndex !== null && filtered.length > 0 && (
        <Lightbox
          items={filtered}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
