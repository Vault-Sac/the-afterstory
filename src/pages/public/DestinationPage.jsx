import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight, Plus, Calendar, Compass } from 'lucide-react'
import { getDestinationBySlug, getDestinations } from '../../lib/data/destinations'
import { getApprovedMemories } from '../../lib/data/memories'
import { getGalleryMedia } from '../../lib/data/gallery'
import { destinations as seedDestinations } from '../../lib/data/seed'
import { LoadingState, ErrorState } from '../../components/public/UIStates'
import MemoryCard from '../../components/public/MemoryCard'
import Lightbox from '../../components/public/Lightbox'

const destContent = {
  varanasi: {
    activities: ['Departure preparations and packing', 'Bus to Prayagraj Sangam station', 'First overnight train windows', 'Return arrival 20 Oct, ~2:05 PM'],
    note: 'Varanasi is both the start and end of this journey — the city that watches the group leave and welcomes them home.',
  },
  prayagraj: {
    activities: ['Prayagraj Sangam railway station pickup', 'Group assembly and bag check', 'Train departure toward Chandigarh'],
    note: 'The Sangam\'s sacred confluence of rivers formed the spiritual backdrop for the journey\'s first major transition.',
  },
  chandigarh: {
    activities: ['Arrival 9:15 AM (16 Oct)', 'Breakfast & scenic mountain drive', 'Rock Garden exploration (19 Oct)', 'Rose Garden walk', 'Sukhna Lake at golden hour', 'Shopping sectors & night train return'],
    note: 'Le Corbusier\'s planned city served as both gateway and farewell — passed through on Day 2 heading into the hills, and revisited on Day 5 for one last full day together.',
  },
  shimla: {
    activities: ['Shimla Ridge evening stroll', 'Mall Road cafe hopping', 'Hotel check-in & dinner', 'Crisp morning views from hotel balcony', 'Christ Church heritage walk'],
    note: 'The heart of the expedition — Shimla with its colonial architecture, pine air, and the particular quality of mountain evenings that make you want to stay.',
  },
  kufri: {
    activities: ['Scenic uphill drive from Shimla', 'Kufri valley viewpoints', 'Apple Garden orchard visit', 'Short trek with tracker', 'Sankat Mochan Hanuman Temple visit'],
    note: 'Higher altitude than Shimla, with wider Himalayan views and open apple orchards.',
  },
  'kalka-shimla-railway': {
    activities: ['Depart hotel 8:30 AM', 'Heritage toy train Shimla → Kalka', '102 tunnels, 800+ bridges', 'Mountain window photography', 'Arrival at Kalka station'],
    note: 'A UNESCO World Heritage narrow-gauge railway through the outer Himalayas. The 96km journey takes about 5 hours across pristine mountain slopes.',
  },
  pinjore: {
    activities: ['Visit Yadavindra Gardens', 'Terraced Mughal-style garden walk', 'Fountains and descending waterways', 'Transfer to Chandigarh hotel'],
    note: 'A quiet, peaceful stop between the mountains and the plains — terraced gardens with historic pavilions and flower beds.',
  },
}

export default function DestinationPage() {
  const { slug } = useParams()
  const [destination, setDestination] = useState(null)
  const [allDests, setAllDests] = useState(seedDestinations)
  const [memories, setMemories] = useState([])
  const [gallery, setGallery] = useState([])
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'instant' })

    Promise.all([
      getDestinationBySlug(slug),
      getDestinations(),
      getApprovedMemories({ destinationId: slug }),
      getGalleryMedia({ destinationId: slug }),
    ]).then(([destRes, allRes, memRes, galRes]) => {
      if (!destRes.data) {
        setError('Destination not found')
        setLoading(false)
        return
      }
      setDestination(destRes.data)
      if (allRes.data) setAllDests(allRes.data)
      if (memRes.data) setMemories(memRes.data)
      if (galRes.data) setGallery(galRes.data)
      setLoading(false)
    })
  }, [slug])

  if (loading) return <div className="page-loading-wrap"><LoadingState message={`Opening ${slug} chapter…`} /></div>
  if (error || !destination) return <div className="page-loading-wrap"><ErrorState message="This destination could not be found." /></div>

  const currentIndex = allDests.findIndex(d => d.slug === slug)
  const prevDest = allDests[currentIndex - 1]
  const nextDest = allDests[currentIndex + 1]
  const extra = destContent[slug] || {}

  return (
    <div className="destination-page">
      {/* 1. Breadcrumb navigation */}
      <nav className="breadcrumb-bar" aria-label="Breadcrumb">
        <div className="section-wrap breadcrumb-inner">
          <Link to="/">Home</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <Link to="/journey">Journey</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span aria-current="page">{destination.name}</span>
        </div>
      </nav>

      {/* 2 & 3 & 4. Destination Hero Image + Chapter + Heading */}
      <section className="dest-hero-section theme-pine" aria-label={`${destination.name} header`}>
        <div className="section-wrap dest-hero-container">
          <div className="dest-hero-header">
            <div className="dest-chapter-badge">
              <Compass size={13} aria-hidden="true" />
              <span>CHAPTER {String(destination.display_order || 1).padStart(2, '0')}</span>
              <span className="badge-sep">/</span>
              <span>{destination.dates}</span>
            </div>

            <h1 className="dest-page-title">{destination.name}</h1>
            <p className="dest-page-tagline">
              {destination.tagline || destination.chapter_title}
            </p>
          </div>

          <div className="dest-hero-photo-wrap">
            <img
              src={destination.hero_image}
              alt={`${destination.name} landmark or landscape`}
              className="dest-hero-photo"
            />
          </div>
        </div>
      </section>

      {/* 5 & 6. Short Introduction & Story */}
      <section className="dest-story-section theme-ivory" aria-labelledby="chapter-narrative-title">
        <div className="section-wrap">
          <div className="dest-narrative-grid">
            <div className="dest-narrative-main">
              <span className="section-eyebrow">THE NARRATIVE</span>
              <h2 id="chapter-narrative-title" className="dest-section-title">
                {destination.chapter_title || destination.name}
              </h2>

              <p className="dest-story-body">
                {destination.description}
              </p>

              {extra.note && (
                <blockquote className="dest-curator-note">
                  <p>{extra.note}</p>
                </blockquote>
              )}
            </div>

            <aside className="dest-info-panel theme-paper">
              <h3 className="dest-panel-title">Chapter Overview</h3>
              <div className="dest-panel-row">
                <span className="panel-label">LOCATION</span>
                <strong className="panel-value">{destination.name}</strong>
              </div>
              <div className="dest-panel-row">
                <span className="panel-label">TIMING</span>
                <strong className="panel-value">{destination.dates}</strong>
              </div>
              {destination.latitude && (
                <div className="dest-panel-row">
                  <span className="panel-label">COORDINATES</span>
                  <strong className="panel-value">{destination.latitude}°N, {destination.longitude}°E</strong>
                </div>
              )}
              <div className="dest-panel-row">
                <span className="panel-label">ROUTE STATUS</span>
                <strong className="panel-value">Confirmed Itinerary</strong>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* 7. Related Photographs (Controlled Photo Grid) */}
      {gallery.length > 0 && (
        <section className="dest-photos-section theme-paper" aria-labelledby="dest-photos-title">
          <div className="section-wrap">
            <header className="section-header-editorial">
              <span className="section-eyebrow">PHOTOGRAPHIC ARCHIVE</span>
              <h2 id="dest-photos-title" className="section-title">Captured at {destination.name}</h2>
              <p className="section-description">
                Real moments and perspectives recorded during this stop.
              </p>
            </header>

            <div className="dest-photo-grid">
              {gallery.map((photo, i) => (
                <figure
                  key={photo.id || i}
                  className="dest-photo-card"
                  onClick={() => setLightboxIndex(i)}
                >
                  <div className="dest-photo-img-wrap">
                    <img
                      src={photo.image || photo.public_url}
                      alt={photo.alt_text || photo.title || `${destination.name} moment`}
                      loading="lazy"
                      className="dest-card-img"
                    />
                    <div className="photo-expand-badge" aria-hidden="true">
                      <ArrowUpRight size={14} />
                    </div>
                  </div>
                  <figcaption className="dest-photo-caption">
                    <strong>{photo.title || photo.caption || 'Field snapshot'}</strong>
                    <span>{photo.place || destination.name}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 8. Activity or Location Cards */}
      {extra.activities?.length > 0 && (
        <section className="dest-activities-section theme-ivory" aria-labelledby="activities-title">
          <div className="section-wrap">
            <header className="section-header-editorial">
              <span className="section-eyebrow">EXPLORATION & STOPS</span>
              <h2 id="activities-title" className="section-title">What Happened Here</h2>
              <p className="section-description">Key itinerary checkpoints, scenic stops, and shared excursions.</p>
            </header>

            <div className="activities-editorial-grid">
              {extra.activities.map((act, i) => (
                <div className="activity-card" key={act}>
                  <span className="activity-counter">0{i + 1}</span>
                  <p className="activity-name">{act}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 9 & 10. Memories & Leave a Thought */}
      <section className="dest-memories-section theme-pine" aria-labelledby="memories-section-title">
        <div className="section-wrap">
          <header className="section-header-editorial light-text">
            <div className="header-split">
              <div>
                <span className="section-eyebrow">FIELD NOTES & STORIES</span>
                <h2 id="memories-section-title" className="section-title">Thoughts about {destination.name}</h2>
                <p className="section-description">
                  Memories contributed by companions from this chapter of the expedition.
                </p>
              </div>
              <Link
                to={`/memory-board?dest=${destination.slug}`}
                className="button button-brass header-side-action"
              >
                <Plus size={15} /> Leave a thought about {destination.name}
              </Link>
            </div>
          </header>

          {memories.length > 0 ? (
            <div className="memories-editorial-grid">
              {memories.map((m) => (
                <MemoryCard key={m.id} memory={m} theme="dark" />
              ))}
            </div>
          ) : (
            <div className="dest-memories-empty">
              <p>No memories have been written for {destination.name} yet.</p>
              <Link to={`/memory-board?dest=${destination.slug}`} className="button button-outline-light">
                Be the first to leave a memory for {destination.name} <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 11. Previous / Next Chapter Navigation */}
      <nav className="dest-pagination-bar theme-charcoal" aria-label="Chapter pagination">
        <div className="section-wrap pagination-inner">
          {prevDest ? (
            <Link to={`/destinations/${prevDest.slug}`} className="pagination-link prev">
              <ArrowLeft size={16} />
              <div className="pagination-text">
                <span className="pagination-sub">Previous chapter</span>
                <strong className="pagination-dest">{prevDest.name}</strong>
              </div>
            </Link>
          ) : (
            <div className="pagination-placeholder" />
          )}

          <Link to="/journey" className="pagination-all-link">
            All 6 Journey Chapters
          </Link>

          {nextDest ? (
            <Link to={`/destinations/${nextDest.slug}`} className="pagination-link next">
              <div className="pagination-text align-right">
                <span className="pagination-sub">Next chapter</span>
                <strong className="pagination-dest">{nextDest.name}</strong>
              </div>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <div className="pagination-placeholder" />
          )}
        </div>
      </nav>

      {/* Lightbox */}
      {lightboxIndex !== null && gallery.length > 0 && (
        <Lightbox
          items={gallery}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
