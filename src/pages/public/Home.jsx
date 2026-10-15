import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, Calendar, MapPin, Clock,
  Compass, Heart, Image as ImageIcon, Users, MessageSquare, Quote
} from 'lucide-react'
import DestinationCard from '../../components/public/DestinationCard'
import MemoryCard from '../../components/public/MemoryCard'
import Lightbox from '../../components/public/Lightbox'
import { destinations, journeyDays, seedMemories, seedGallery, seedPeople } from '../../lib/data/seed'
import { getApprovedMemories } from '../../lib/data/memories'
import { getGalleryMedia } from '../../lib/data/gallery'
import { getPublishedPeople } from '../../lib/data/people'

const TRIP_START = new Date('2026-10-15T14:00:00+05:30')
const TRIP_END = new Date('2026-10-20T14:05:00+05:30')

function useCountdown() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  const diff = TRIP_START.getTime() - now.getTime()
  const isTrip = diff <= 0 && now < TRIP_END
  const isOver = now >= TRIP_END
  const daysLeft = Math.max(0, Math.ceil(diff / 86400000))
  const hoursLeft = diff > 0 ? Math.floor((diff % 86400000) / 3600000) : 0

  return { isTrip, isOver, daysLeft, hoursLeft }
}

export default function Home() {
  const { isTrip, isOver, daysLeft, hoursLeft } = useCountdown()
  const [memories, setMemories] = useState(seedMemories.slice(0, 3))
  const [galleryPhotos, setGalleryPhotos] = useState(seedGallery.slice(0, 4))
  const [people, setPeople] = useState(seedPeople.slice(0, 4))
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    getApprovedMemories({ limit: 3 }).then(({ data }) => {
      if (data?.length) setMemories(data.slice(0, 3))
    })
    getGalleryMedia({ limit: 4 }).then(({ data }) => {
      if (data?.length) setGalleryPhotos(data.slice(0, 4))
    })
    getPublishedPeople().then(({ data }) => {
      if (data?.length) setPeople(data.slice(0, 4))
    })
  }, [])

  return (
    <div className="home-page">
      {/* ───────────────────────────────────────────────────────────
          SECTION 2: HERO (Cinematic Deep Pine)
      ──────────────────────────────────────────────────────────── */}
      <section className="hero-section theme-pine" aria-label="Introduction">
        <div className="section-wrap hero-container">
          <div className="hero-copy">
            <div className="hero-badge">
              <span className="live-indicator" aria-hidden="true" />
              <span>
                {isTrip
                  ? 'THE JOURNEY IS HAPPENING NOW'
                  : isOver
                  ? 'A JOURNEY PRESERVED FOREVER'
                  : 'OCTOBER 2026 EXPEDITION'}
              </span>
            </div>

            <h1 className="hero-heading">
              Not just a trip.<br />
              <em>A piece of us.</em>
            </h1>

            <p className="hero-intro">
              Six days across changing landscapes, familiar voices, and moments we don't want time to take away.
              This digital archive is where we keep them.
            </p>

            <div className="hero-cta-group">
              <Link to="/journey" className="button button-brass">
                Explore the Journey <ArrowRight size={15} />
              </Link>
              <Link to="/memory-board" className="button button-outline-light">
                Open the Memory Board <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-image-frame">
              <img
                src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=85"
                alt="Panoramic view of mountain ranges shrouded in mist, Shimla hills"
                className="hero-image"
              />
              <div className="hero-image-overlay" />
            </div>
            <figcaption className="hero-image-caption">
              <span>FIG. 01</span>
              <span>Misty mountain morning along the Ridge, Shimla</span>
            </figcaption>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          SECTION 3: TRIP INFORMATION STRIP (Paper Beige)
      ──────────────────────────────────────────────────────────── */}
      <section className="trip-facts-strip theme-paper" aria-label="Trip overview facts">
        <div className="section-wrap facts-container">
          <div className="fact-item">
            <span className="fact-label">TRIP DATES</span>
            <strong className="fact-value">15 — 20 October 2026</strong>
          </div>

          <div className="fact-divider" aria-hidden="true" />

          <div className="fact-item">
            <span className="fact-label">EXPEDITION ROUTE</span>
            <strong className="fact-value">Varanasi → Shimla → Chandigarh</strong>
          </div>

          <div className="fact-divider" aria-hidden="true" />

          <div className="fact-item">
            <span className="fact-label">DURATION</span>
            <strong className="fact-value">6 Days · 5 Chapters</strong>
          </div>

          <div className="fact-divider" aria-hidden="true" />

          <div className="fact-item">
            <span className="fact-label">COUNTDOWN</span>
            <div className="countdown-pill">
              <Clock size={13} aria-hidden="true" />
              <span>
                {isTrip ? 'In Progress' : isOver ? 'Completed' : `${daysLeft}d ${hoursLeft}h left`}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          SECTION 4: THE JOURNEY (Warm Ivory Journal)
      ──────────────────────────────────────────────────────────── */}
      <section className="home-journey-section theme-ivory" aria-labelledby="journey-overview-title">
        <div className="section-wrap">
          <header className="section-header-editorial">
            <span className="section-eyebrow">01 / THE CHRONOLOGY</span>
            <h2 id="journey-overview-title" className="section-title">
              Six days across northern landscapes.
            </h2>
            <p className="section-description">
              From the overnight train departure at Prayagraj Sangam to crisp mountain walks, heritage toy trains,
              and Chandigarh's modern gardens.
            </p>
          </header>

          <div className="journey-chapters-grid">
            {journeyDays.map((day, idx) => (
              <article key={day.id || idx} className="chapter-summary-card">
                <div className="chapter-card-top">
                  <span className="chapter-number">DAY 0{idx + 1}</span>
                  <span className="chapter-date">{day.trip_date ? day.trip_date.slice(5) : `OCT ${15 + idx}`}</span>
                </div>
                <h3 className="chapter-title">{day.title}</h3>
                <p className="chapter-route"><MapPin size={12} /> {day.place}</p>
                <p className="chapter-desc">{day.description?.slice(0, 115)}…</p>
                <Link to="/journey" className="chapter-link">
                  View itinerary details <ArrowRight size={13} />
                </Link>
              </article>
            ))}
          </div>

          <div className="section-center-action">
            <Link to="/journey" className="button button-outline-dark">
              See the Full Journey Timeline <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          SECTION 5: DESTINATION HIGHLIGHTS (Charcoal / Deep Pine)
      ──────────────────────────────────────────────────────────── */}
      <section className="home-destinations-section theme-charcoal" aria-labelledby="dest-highlights-title">
        <div className="section-wrap">
          <header className="section-header-editorial light-text">
            <span className="section-eyebrow">02 / DESTINATIONS</span>
            <h2 id="dest-highlights-title" className="section-title">
              Every stop holds a thousand little things.
            </h2>
            <p className="section-description">
              Explore individual destination chapters with dedicated photographic records, travel narratives, and local memories.
            </p>
          </header>

          <div className="destinations-editorial-grid">
            {destinations.slice(0, 6).map((dest) => (
              <DestinationCard key={dest.id || dest.slug} destination={dest} />
            ))}
          </div>

          <div className="section-center-action">
            <Link to="/destinations/varanasi" className="button button-outline-light">
              Explore All 7 Destination Pages <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          SECTION 6: PHOTO ARCHIVE PREVIEW (Paper Beige Scrapbook)
      ──────────────────────────────────────────────────────────── */}
      <section className="home-gallery-section theme-paper" aria-labelledby="gallery-preview-title">
        <div className="section-wrap">
          <header className="section-header-editorial">
            <div className="header-split">
              <div>
                <span className="section-eyebrow">03 / THE PHOTO ARCHIVE</span>
                <h2 id="gallery-preview-title" className="section-title">
                  Proof that we were here.
                </h2>
                <p className="section-description">
                  A curated selection of expedition photography, mountain lookouts, and transit frames.
                </p>
              </div>
              <Link to="/gallery" className="button button-outline-dark header-side-action">
                View Full Gallery ({seedGallery.length}) <ArrowUpRight size={14} />
              </Link>
            </div>
          </header>

          <div className="curated-photo-grid">
            {galleryPhotos.map((photo, index) => (
              <figure
                key={photo.id || index}
                className="curated-photo-card"
                onClick={() => setLightboxIndex(index)}
              >
                <div className="curated-image-wrap">
                  <img
                    src={photo.image || photo.public_url}
                    alt={photo.title || 'Trip photograph'}
                    loading="lazy"
                    className="curated-image"
                  />
                  <div className="photo-expand-badge" aria-hidden="true">
                    <ArrowUpRight size={14} />
                  </div>
                </div>
                <figcaption className="curated-caption">
                  <strong className="photo-title">{photo.title}</strong>
                  <span className="photo-location">{photo.place || 'Expedition stop'}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          SECTION 7: OUR PEOPLE PREVIEW (Warm Ivory Journal)
      ──────────────────────────────────────────────────────────── */}
      <section className="home-people-section theme-ivory" aria-labelledby="people-preview-title">
        <div className="section-wrap">
          <header className="section-header-editorial">
            <div className="header-split">
              <div>
                <span className="section-eyebrow">04 / OUR PEOPLE</span>
                <h2 id="people-preview-title" className="section-title">
                  The faces behind the stories.
                </h2>
                <p className="section-description">
                  Every trip has its places. The reason we remember them is the people standing beside us.
                </p>
              </div>
              <Link to="/people" className="button button-outline-dark header-side-action">
                View All Travelers <ArrowRight size={14} />
              </Link>
            </div>
          </header>

          <div className="people-preview-grid">
            {people.length > 0 ? (
              people.map((person, idx) => {
                const name = person.full_name || person.name || 'Traveler'
                const role = person.role_titile || person.role_title || person.line || 'Travel Companion'
                const quote = person.favourite_quote || person.favorite_quote || ''
                return (
                  <div key={person.id || person.slug || idx} className="person-summary-card">
                    <div className="person-avatar-circle" aria-hidden="true">
                      {person.avatar_url ? (
                        <img src={person.avatar_url} alt={name} />
                      ) : (
                        <span>{name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="person-info">
                      <h3 className="person-name">{name}</h3>
                      <span className="person-role">{role}</span>
                      {quote && (
                        <p className="person-quote">“{quote}”</p>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="people-empty-notice">
                <Users size={28} />
                <p>Companions and travelers will appear as profiles are published by the group admin.</p>
                <Link to="/people" className="text-link">Explore the people archive →</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          SECTION 8: MEMORY BOARD PREVIEW (Deep Pine)
      ──────────────────────────────────────────────────────────── */}
      <section className="home-memories-section theme-pine" aria-labelledby="memories-preview-title">
        <div className="section-wrap">
          <header className="section-header-editorial light-text">
            <div className="header-split">
              <div>
                <span className="section-eyebrow">05 / THE MEMORY BOARD</span>
                <h2 id="memories-preview-title" className="section-title">
                  Leave a little piece of today.
                </h2>
                <p className="section-description">
                  Notes, funny incidents, inside jokes, and unexpected memories submitted by the group.
                </p>
              </div>
              <Link to="/memory-board" className="button button-brass header-side-action">
                Leave a Memory <ArrowUpRight size={14} />
              </Link>
            </div>
          </header>

          <div className="memories-editorial-grid">
            {memories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} theme="dark" />
            ))}
          </div>

          <div className="section-center-action">
            <Link to="/memory-board" className="button button-outline-light">
              Browse All Memories on the Board <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          SECTION 9: CLOSING CINEMATIC
      ──────────────────────────────────────────────────────────── */}
      <section className="closing-banner" aria-label="Closing reflection">
        <div className="closing-backdrop">
          <img
            src="https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1800&q=90"
            alt="Warm sunset glow over misty mountains"
            className="closing-backdrop-image"
          />
          <div className="closing-tint" />
        </div>

        <div className="section-wrap closing-inner">
          <span className="closing-eyebrow">UNTIL WE LOOK BACK</span>
          <h2 className="closing-title">
            The trip lasts six days.<br />
            <em>The story lasts longer.</em>
          </h2>
          <p className="closing-text">
            For every photograph we take, every story we preserve, and every ordinary moment
            that becomes irreplaceable with time.
          </p>

          <div className="closing-button-row">
            <Link to="/journey" className="button button-brass">
              Revisit the Journey <ArrowRight size={15} />
            </Link>
            <Link to="/memory-board" className="button button-outline-light">
              Add a Memory <Heart size={14} />
            </Link>
          </div>

          <div className="closing-coordinates">
            <span>31°06′N · 77°10′E</span>
            <span>SHIMLA, HIMACHAL PRADESH</span>
          </div>
        </div>
      </section>

      {/* Lightbox Modal for gallery preview */}
      {lightboxIndex !== null && (
        <Lightbox
          items={galleryPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
