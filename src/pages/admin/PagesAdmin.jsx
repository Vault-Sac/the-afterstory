import React, { useState, useEffect } from 'react'
import { getSiteSettings, updateSiteSetting } from '../../lib/data/settings'
import { FileText, Save, Check, RefreshCw } from 'lucide-react'

export default function PagesAdmin() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getSiteSettings().then(s => {
      setSettings(s)
      setLoading(false)
    })
  }, [])

  const handleChange = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }))
  }

  const handleSaveAll = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    for (const [k, v] of Object.entries(settings)) {
      await updateSiteSetting(k, v)
    }
    setSaving(false)
    setMessage('All page content saved successfully!')
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Page Content & Copy</h1>
          <p>Customize copy, hero titles, descriptions, and text for public archive pages.</p>
        </div>
        <button className="button button-light" onClick={handleSaveAll} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div className="admin-toast success">
          <Check size={16} /> {message}
        </div>
      )}

      {loading ? (
        <div className="admin-loading">Loading page settings…</div>
      ) : (
        <form onSubmit={handleSaveAll} className="admin-form-container">
          {/* Homepage Section */}
          <div className="admin-card">
            <h2>Homepage Copy</h2>
            <div className="form-group">
              <label>
                HERO HEADLINE (MAIN TITLE)
                <input
                  value={settings.hero_title || ''}
                  onChange={e => handleChange('hero_title', e.target.value)}
                />
              </label>
              <label>
                HERO EMPHASIZED SUBTITLE
                <input
                  value={settings.hero_subtitle || ''}
                  onChange={e => handleChange('hero_subtitle', e.target.value)}
                />
              </label>
              <label>
                HERO DESCRIPTION PARAGRAPH
                <textarea
                  rows={3}
                  value={settings.hero_description || ''}
                  onChange={e => handleChange('hero_description', e.target.value)}
                />
              </label>
              <div className="form-row">
                <label>
                  ROUTE SUMMARY
                  <input
                    value={settings.route_summary || ''}
                    onChange={e => handleChange('route_summary', e.target.value)}
                  />
                </label>
                <label>
                  TRIP DATES DISPLAY
                  <input
                    value={settings.trip_dates || ''}
                    onChange={e => handleChange('trip_dates', e.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* About Page Section */}
          <div className="admin-card">
            <h2>About & Privacy Page</h2>
            <div className="form-group">
              <label>
                ARCHIVE PURPOSE & MANIFESTO
                <textarea
                  rows={4}
                  value={settings.about_text || ''}
                  onChange={e => handleChange('about_text', e.target.value)}
                />
              </label>
              <label>
                FOOTER TAGLINE NOTE
                <input
                  value={settings.footer_note || ''}
                  onChange={e => handleChange('footer_note', e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="admin-actions-bar">
            <button type="submit" className="button button-light" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving…' : 'Save All Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
