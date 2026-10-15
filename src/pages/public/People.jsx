import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Heart, ArrowRight } from 'lucide-react'
import { getPublishedPeople } from '../../lib/data/people'
import { seedPeople } from '../../lib/data/seed'
import { LoadingState } from '../../components/public/UIStates'

export default function People() {
  const [people, setPeople] = useState(seedPeople)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    getPublishedPeople().then(({ data }) => {
      if (data) setPeople(data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="people-page">
      {/* Header */}
      <header className="people-header theme-pine">
        <div className="section-wrap">
          <span className="section-eyebrow">
            <Users size={13} aria-hidden="true" /> OUR EXPEDITION COMPANIONS
          </span>
          <h1 className="people-page-title">
            The faces behind<br /><em>the stories.</em>
          </h1>
          <p className="people-page-desc">
            Every trip has its places. The reason we remember them is the people standing beside us.
          </p>
        </div>
      </header>

      {/* People Grid */}
      <main className="people-grid-section theme-ivory" aria-label="People directory">
        <div className="section-wrap">
          {loading ? (
            <div className="people-loading">
              <LoadingState message="Loading companion profiles…" />
            </div>
          ) : people.length > 0 ? (
            <div className="people-editorial-grid">
              {people.map((person, i) => (
                <article className="person-editorial-card theme-paper" key={person.id || person.slug || i}>
                  <div className="person-card-top">
                    <div className="person-portrait-frame" aria-hidden="true">
                      {person.avatar_url || person.profile_image ? (
                        <img
                          src={person.avatar_url || person.profile_image}
                          alt={person.full_name || person.display_name || person.name}
                          className="person-portrait"
                        />
                      ) : (
                        <span className="person-initials">
                          {(person.full_name || person.display_name || person.name || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="person-title-area">
                      <h2 className="person-full-name">
                        {person.full_name || person.display_name || person.name}
                      </h2>
                      <span className="person-role-tag">
                        {person.role_title || person.line || 'Travel Companion'}
                      </span>
                      {person.nickname && (
                        <span className="person-aka">"{person.nickname}"</span>
                      )}
                    </div>
                  </div>

                  {person.favorite_quote && (
                    <blockquote className="person-favorite-quote">
                      <p>“{person.favorite_quote}”</p>
                    </blockquote>
                  )}

                  {person.bio && (
                    <p className="person-bio-text">{person.bio}</p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="people-empty-container theme-paper">
              <Users size={40} className="empty-icon" aria-hidden="true" />
              <h2 className="empty-title">The first names are waiting.</h2>
              <p className="empty-description">
                Companions and travelers will appear as profiles are published by the group admin.
                In the meantime, feel free to contribute a thought or inside joke to the Memory Board.
              </p>
              <Link to="/memory-board" className="button button-brass">
                Leave a Memory on the Board <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
