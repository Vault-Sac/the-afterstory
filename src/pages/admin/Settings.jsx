import React, { useState, useEffect } from 'react'
import { isSupabaseConfigured } from '../../lib/supabase'
import { getSiteSettings, updateSiteSetting } from '../../lib/data/settings'
import { getAllMemoriesAdmin } from '../../lib/data/memories'
import { getAllDestinationsAdmin } from '../../lib/data/destinations'
import { getAllMediaAdmin } from '../../lib/data/gallery'
import { getAllPeopleAdmin } from '../../lib/data/people'
import { Settings as SettingsIcon, Save, Download, Upload, Check, Database, ShieldCheck, AlertTriangle } from 'lucide-react'

export default function AdminSettings() {
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

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    for (const [k, v] of Object.entries(settings)) {
      await updateSiteSetting(k, v)
    }
    setSaving(false)
    setMessage('Settings updated successfully!')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleExportVault = async () => {
    const [mems, dests, media, people] = await Promise.all([
      getAllMemoriesAdmin(),
      getAllDestinationsAdmin(),
      getAllMediaAdmin(),
      getAllPeopleAdmin(),
    ])

    const backup = {
      vault: 'THE MEMORY VAULT — OCTOBER 2026',
      exportedAt: new Date().toISOString(),
      settings,
      destinations: dests.data || [],
      memories: mems.data || [],
      gallery: media.data || [],
      people: people.data || [],
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `memory-vault-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Vault JSON archive downloaded.')
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Vault Settings & Backups</h1>
          <p>Global site configuration, database status, and archive data exports.</p>
        </div>
      </div>

      {message && (
        <div className="admin-toast success">
          <Check size={16} /> {message}
        </div>
      )}

      {/* Backend Status */}
      <div className="admin-card">
        <h2><Database size={18} /> Storage & Cloud Status</h2>
        <div className="status-banner">
          {isSupabaseConfigured ? (
            <div className="status-item online">
              <ShieldCheck size={20} />
              <div>
                <strong>Supabase Cloud Connected</strong>
                <p>Data and uploads are safely synced with remote Postgres tables and storage buckets.</p>
              </div>
            </div>
          ) : (
            <div className="status-item offline">
              <AlertTriangle size={20} />
              <div>
                <strong>Local Storage & Demo Mode Active</strong>
                <p>
                  VITE_SUPABASE_URL is not set. All changes (moderation, photos, destinations) are saved in local browser storage.
                  To connect production Supabase, provide credentials in <code>.env</code>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Metadata */}
      {loading ? (
        <div className="admin-loading">Loading settings…</div>
      ) : (
        <form onSubmit={handleSave} className="admin-card">
          <h2>Brand & Metadata</h2>
          <div className="form-group">
            <div className="form-row">
              <label>
                SITE TITLE
                <input
                  value={settings.site_title || ''}
                  onChange={e => handleChange('site_title', e.target.value)}
                  required
                />
              </label>
              <label>
                EDITION LABEL
                <input
                  value={settings.site_edition || ''}
                  onChange={e => handleChange('site_edition', e.target.value)}
                  placeholder="OCTOBER '26"
                />
              </label>
            </div>

            <label>
              SITE TAGLINE
              <input
                value={settings.site_tagline || ''}
                onChange={e => handleChange('site_tagline', e.target.value)}
              />
            </label>

            <button type="submit" className="button button-light" disabled={saving}>
              <Save size={15} /> {saving ? 'Saving…' : 'Save General Settings'}
            </button>
          </div>
        </form>
      )}

      {/* Backup and Restore */}
      <div className="admin-card">
        <h2>Data Preservation & Archives</h2>
        <p className="admin-desc">
          Download a full JSON snapshot of all memories, travelers, route stops, and photos so that the archive is preserved forever offline.
        </p>
        <div className="backup-actions">
          <button className="button button-dark" onClick={handleExportVault}>
            <Download size={16} /> Export Full Vault (JSON)
          </button>
        </div>
      </div>
    </div>
  )
}
