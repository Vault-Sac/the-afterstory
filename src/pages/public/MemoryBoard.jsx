import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Filter, Plus, X, MessageSquare, Check, Sparkles } from 'lucide-react'
import { getApprovedMemories } from '../../lib/data/memories'
import { seedMemories, MEMORY_CATEGORIES, destinations } from '../../lib/data/seed'
import MemoryCard from '../../components/public/MemoryCard'
import MemorySubmissionForm from '../../components/public/MemorySubmissionForm'
import { LoadingState } from '../../components/public/UIStates'

export default function MemoryBoard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [memories, setMemories] = useState(seedMemories)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const search = searchParams.get('q') || ''
  const category = searchParams.get('cat') || ''
  const destFilter = searchParams.get('dest') || ''

  // Open modal automatically if URL has ?add=true
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowModal(true)
    }
  }, [searchParams])

  const loadMemories = () => {
    setLoading(true)
    getApprovedMemories({
      destinationId: destFilter || undefined,
      category: category || undefined,
    }).then(({ data }) => {
      if (data) setMemories(data)
      setLoading(false)
    })
  }

  useEffect(() => {
    loadMemories()
  }, [destFilter, category])

  const filtered = memories.filter((m) => {
    if (!search) return true
    const haystack = `${m.title || ''} ${m.body} ${m.display_name || ''} ${m.destination_id || ''}`.toLowerCase()
    return haystack.includes(search.toLowerCase())
  })

  const setFilter = (key, value) => {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value)
    else p.delete(key)
    setSearchParams(p)
  }

  const handleSuccess = () => {
    setSubmitted(true)
    setShowModal(false)
    loadMemories()
    setTimeout(() => setSubmitted(false), 6000)
  }

  return (
    <div className="memory-board-page">
      {/* 1. Page Title & Intro */}
      <header className="board-header theme-pine">
        <div className="section-wrap board-header-inner">
          <div className="board-header-copy">
            <span className="section-eyebrow">THE DIGITAL SCRAPBOOK</span>
            <h1 className="board-page-title">
              Leave a little<br />
              <em>piece of today.</em>
            </h1>
            <p className="board-page-desc">
              A private collection of thoughts, quotes, funny incidents, and moments we want to hold on to.
              Every submission is moderated before joining the public wall.
            </p>
          </div>

          {/* 2. Clear "Add a Memory" Action */}
          <div className="board-header-action">
            <button
              type="button"
              className="button button-brass"
              onClick={() => setShowModal(true)}
              aria-haspopup="dialog"
            >
              <Plus size={16} /> Add a Memory
            </button>
            <span className="action-hint">Submissions enter the moderation queue</span>
          </div>
        </div>
      </header>

      {/* Submission Success Banner */}
      {submitted && (
        <aside className="submission-alert-strip" role="status" aria-live="polite">
          <div className="section-wrap alert-inner">
            <Check size={18} />
            <span>
              Your memory has been submitted to the moderation queue! Once approved, it will appear here and on the associated destination chapter.
            </span>
          </div>
        </aside>
      )}

      {/* 3 & 4. Search and Filters Bar */}
      <section className="board-controls-bar theme-paper" aria-label="Filter memories">
        <div className="section-wrap controls-inner">
          <div className="board-search-field">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by keywords, person, or moment…"
              value={search}
              onChange={(e) => setFilter('q', e.target.value)}
              aria-label="Search memories"
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
              <Filter size={12} /> Category:
            </span>
            <div className="filter-pills-row">
              <button
                type="button"
                className={`filter-pill ${!category ? 'active' : ''}`}
                onClick={() => setFilter('cat', '')}
              >
                All Categories
              </button>
              {MEMORY_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className={`filter-pill ${category === cat ? 'active' : ''}`}
                  onClick={() => setFilter('cat', category === cat ? '' : cat)}
                  aria-pressed={category === cat}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="board-filter-group">
            <span className="filter-group-label">Destination:</span>
            <div className="filter-pills-row">
              <button
                type="button"
                className={`filter-pill ${!destFilter ? 'active' : ''}`}
                onClick={() => setFilter('dest', '')}
              >
                All Stops
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

      {/* 5, 6, 7. Consistent Memory Card Grid & Empty State */}
      <main className="board-content-section theme-ivory" aria-label="Memory wall entries">
        <div className="section-wrap">
          <div className="board-status-row">
            <span className="results-count">
              Showing <strong>{filtered.length}</strong> {filtered.length === 1 ? 'memory' : 'memories'}
              {(category || destFilter || search) && ' (filtered)'}
            </span>
            {(category || destFilter || search) && (
              <button
                type="button"
                className="reset-filters-btn"
                onClick={() => setSearchParams({})}
              >
                Reset all filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="board-loading-wrap">
              <LoadingState message="Loading memory cards…" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="memories-masonry-grid">
              {filtered.map((m) => (
                <MemoryCard key={m.id} memory={m} theme="light" />
              ))}
            </div>
          ) : (
            <div className="board-empty-state">
              <MessageSquare size={36} aria-hidden="true" />
              <h3>No memories match this view</h3>
              <p>Try clearing your category or search filter, or be the first to write a memory here.</p>
              <button
                type="button"
                className="button button-brass"
                onClick={() => setShowModal(true)}
              >
                Write a Memory Now
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Contribution Modal */}
      {showModal && (
        <div
          className="modal-backdrop-editorial"
          onClick={() => setShowModal(false)}
          role="presentation"
        >
          <div
            className="editorial-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="dialog-header">
              <div>
                <span className="section-eyebrow">THE MEMORY VAULT</span>
                <h2 id="modal-title" className="dialog-title">Pin a Memory to the Board</h2>
              </div>
              <button
                type="button"
                className="dialog-close-btn"
                onClick={() => setShowModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <p className="dialog-description">
              Your memory will enter a moderation queue and appear publicly once approved by the group admin.
            </p>

            <MemorySubmissionForm
              defaultDestination={destFilter || ''}
              defaultCategory={category || ''}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      )}
    </div>
  )
}
