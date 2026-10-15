import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, TrainFront, Compass, Heart, ArrowRight, ArrowUpRight, Calendar, Clock } from 'lucide-react'
import { journeyDays } from '../../lib/data/seed'
import { getJourneyDays } from '../../lib/data/journey'
import { LoadingState } from '../../components/public/UIStates'

const ROUTE_STOPS = [
  { label: 'VARANASI', sub: 'Starting City', dayIndex: 0 },
  { label: 'PRAYAGRAJ', sub: 'The Gathering', dayIndex: 0 },
  { label: 'CHANDIGARH', sub: 'Gateway to Hills', dayIndex: 1 },
  { label: 'SHIMLA', sub: 'Mountain Ridge', dayIndex: 1 },
  { label: 'KUFRI', sub: 'High Orchards', dayIndex: 2 },
  { label: 'KALKA', sub: 'Heritage Railway', dayIndex: 3 },
  { label: 'PINJORE', sub: 'Terraced Gardens', dayIndex: 3 },
  { label: 'VARANASI', sub: 'Return Home', dayIndex: 5 },
]

export default function Journey() {
  const [days, setDays] = useState(journeyDays)
  const [activeDay, setActiveDay] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    getJourneyDays().then(({ data }) => {
      if (data) setDays(data)
      setLoading(false)
    })
  }, [])

  const current = days[activeDay] || days[0]

  return (
    <div className="journey-page">
      {/* Header */}
      <header className="journey-header theme-pine">
        <div className="section-wrap">
          <span className="section-eyebrow">CHRONOLOGICAL ARCHIVE</span>
          <h1 className="journey-page-title">
            Six days. <em>One story.</em>
          </h1>
          <p className="journey-page-desc">
            A step-by-step record of our October 2026 expedition from Varanasi through Uttar Pradesh,
            into Himachal Pradesh's mountain ridges, and back through Chandigarh.
          </p>
        </div>
      </header>

      {/* Route Visualizer Bar */}
      <section className="route-visualizer-section theme-paper" aria-label="Route map stops">
        <div className="section-wrap">
          <div className="route-meta-header">
            <span className="route-tag">
              <MapPin size={13} aria-hidden="true" /> VARANASI — SHIMLA — CHANDIGARH EXPEDITION
            </span>
            <a
              href="https://www.google.com/maps/dir/Varanasi,+Uttar+Pradesh/Prayagraj,+Uttar+Pradesh/Chandigarh/Shimla,+Himachal+Pradesh/Kalka,+Haryana/Varanasi,+Uttar+Pradesh"
              target="_blank"
              rel="noreferrer"
              className="route-maps-link"
            >
              Open Route in Google Maps <ArrowUpRight size={13} />
            </a>
          </div>

          <div className="route-steps-container">
            {ROUTE_STOPS.map((stop, idx) => {
              const isActive = stop.dayIndex === activeDay
              const isPast = stop.dayIndex < activeDay

              return (
                <button
                  type="button"
                  key={`${stop.label}-${idx}`}
                  className={`route-step-node ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
                  onClick={() => setActiveDay(stop.dayIndex)}
                  aria-label={`View Chapter for ${stop.label}`}
                >
                  <span className="step-dot" />
                  <span className="step-name">{stop.label}</span>
                  <span className="step-caption">{stop.sub}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Day Chapters Interactive View */}
      <main className="journey-chapters-section theme-ivory" aria-label="Detailed day chapters">
        <div className="section-wrap">
          {loading ? (
            <div className="journey-loading">
              <LoadingState message="Loading itinerary chapters…" />
            </div>
          ) : (
            <div className="chapters-layout-grid">
              {/* Day selection tabs column */}
              <nav className="chapter-nav-list" aria-label="Day chapters">
                <div className="nav-list-header">
                  <span>ITINERARY CHAPTERS</span>
                  <span>06 DAYS</span>
                </div>

                {days.map((d, i) => (
                  <button
                    type="button"
                    key={d.id || i}
                    className={`chapter-select-btn ${activeDay === i ? 'selected' : ''}`}
                    onClick={() => setActiveDay(i)}
                  >
                    <div className="select-date">
                      <strong className="select-day">{d.trip_date ? d.trip_date.slice(8) : String(15 + i)}</strong>
                      <span className="select-month">OCT</span>
                    </div>

                    <div className="select-info">
                      <span className="select-chapter-num">DAY 0{i + 1}</span>
                      <strong className="select-title">{d.title}</strong>
                      <span className="select-place">{d.place}</span>
                    </div>

                    <ArrowRight size={14} className="select-chevron" aria-hidden="true" />
                  </button>
                ))}
              </nav>

              {/* Active Day Detail Article */}
              <article className="day-feature-panel theme-paper" aria-labelledby="active-day-heading">
                <div className="day-feature-media">
                  <img
                    src={current.image}
                    alt={current.place || current.title}
                    className="day-feature-img"
                  />
                  <div className="day-media-badge">
                    <span>CHAPTER 0{activeDay + 1}</span>
                    <span className="badge-sep">/</span>
                    <span>{current.weekday || (current.trip_date ? 'OCT 2026' : '')}</span>
                  </div>
                </div>

                <div className="day-feature-content">
                  <div className="day-feature-meta">
                    <span className="meta-badge">
                      <MapPin size={12} /> {current.place}
                    </span>
                    {current.time && (
                      <span className="meta-badge">
                        <Clock size={12} /> {current.time}
                      </span>
                    )}
                  </div>

                  <h2 id="active-day-heading" className="day-feature-title">
                    {current.title}
                  </h2>

                  <p className="day-feature-story">
                    {current.description || current.story}
                  </p>

                  {current.moments?.length > 0 && (
                    <div className="day-moments-block">
                      <span className="moments-label">KEY MOMENTS RECORDED:</span>
                      <ul className="moments-list">
                        {current.moments.map((m, idx) => (
                          <li key={m}>
                            <span className="moment-index">0{idx + 1}</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="day-feature-actions">
                    <Link
                      to={`/memory-board?add=true`}
                      className="button button-brass"
                    >
                      Add a Memory from this Day <ArrowRight size={14} />
                    </Link>
                  </div>

                  <div className="day-pagination-buttons">
                    <button
                      type="button"
                      disabled={activeDay === 0}
                      onClick={() => setActiveDay((d) => Math.max(0, d - 1))}
                      className="day-nav-btn"
                    >
                      ← Previous Day
                    </button>
                    <span className="day-step-indicator">Day 0{activeDay + 1} of 0{days.length}</span>
                    <button
                      type="button"
                      disabled={activeDay === days.length - 1}
                      onClick={() => setActiveDay((d) => Math.min(days.length - 1, d + 1))}
                      className="day-nav-btn"
                    >
                      Next Day →
                    </button>
                  </div>
                </div>
              </article>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
