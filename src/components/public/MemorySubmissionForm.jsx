import React, { useState } from 'react'
import { Send, Camera } from 'lucide-react'
import { submitMemory } from '../../lib/data/memories'
import { MEMORY_CATEGORIES, destinations } from '../../lib/data/seed'

const RATE_LIMIT_KEY = 'mv-last-submit'
const RATE_LIMIT_MS = 60 * 1000 // 1 minute between submissions

export default function MemorySubmissionForm({ defaultDestination, defaultCategory, onSuccess }) {
  const [form, setForm] = useState({
    display_name: '',
    title: '',
    body: '',
    category: defaultCategory || '',
    destination_id: defaultDestination || '',
    consent: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [charCount, setCharCount] = useState(0)

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [field]: value }))
    if (field === 'body') setCharCount(e.target.value.length)
  }

  const validate = () => {
    if (!form.display_name.trim()) return 'Please enter a display name.'
    if (!form.body.trim() || form.body.length < 10) return 'Memory must be at least 10 characters.'
    if (form.body.length > 2000) return 'Memory must be under 2000 characters.'
    if (!form.category) return 'Please choose a category.'
    if (!form.consent) return 'Please confirm your consent to share this memory.'

    // Rate limit check
    const last = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || '0', 10)
    if (Date.now() - last < RATE_LIMIT_MS) return 'Please wait a moment before submitting again.'

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError('')
    setSubmitting(true)

    const { error: submitError } = await submitMemory({
      display_name: form.display_name.trim(),
      title: form.title.trim() || null,
      body: form.body.trim(),
      category: form.category,
      destination_id: form.destination_id || null,
    })

    setSubmitting(false)
    if (submitError) {
      setError('Could not save your memory. Please try again.')
      return
    }

    localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString())
    setForm({ display_name: '', title: '', body: '', category: defaultCategory || '', destination_id: defaultDestination || '', consent: false })
    setCharCount(0)
    onSuccess?.()
  }

  return (
    <form className="memory-form" onSubmit={handleSubmit} noValidate aria-label="Submit a memory">
      <div className="form-row">
        <label className="form-label">
          YOUR NAME OR NICKNAME <span aria-hidden="true">*</span>
          <input
            type="text"
            value={form.display_name}
            onChange={set('display_name')}
            placeholder="How should we remember you here?"
            maxLength={80}
            required
            className="form-input"
            aria-required="true"
          />
        </label>
        <label className="form-label">
          OPTIONAL TITLE
          <input
            type="text"
            value={form.title}
            onChange={set('title')}
            placeholder="Give this memory a name"
            maxLength={120}
            className="form-input"
          />
        </label>
      </div>

      <label className="form-label">
        YOUR MEMORY <span aria-hidden="true">*</span>
        <textarea
          value={form.body}
          onChange={set('body')}
          placeholder="Write it how you remember it…"
          rows={5}
          maxLength={2000}
          required
          className="form-input form-textarea"
          aria-required="true"
          aria-describedby="char-count"
        />
        <span id="char-count" className="char-count">{charCount} / 2000</span>
      </label>

      <div className="form-row">
        <label className="form-label">
          CATEGORY <span aria-hidden="true">*</span>
          <select
            value={form.category}
            onChange={set('category')}
            required
            className="form-input form-select"
            aria-required="true"
          >
            <option value="">Select a category…</option>
            {MEMORY_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="form-label">
          RELATED DESTINATION
          <select
            value={form.destination_id}
            onChange={set('destination_id')}
            className="form-input form-select"
          >
            <option value="">Not destination-specific</option>
            {destinations.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="form-check">
        <input
          type="checkbox"
          checked={form.consent}
          onChange={set('consent')}
          required
          aria-required="true"
        />
        <span>
          I confirm that this memory is mine to share and I consent to it being reviewed and, if approved, displayed on this archive.
        </span>
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <p className="form-note">
        Your submission will be reviewed before it appears publicly. You can request removal by contacting the archive admin.
      </p>

      <button type="submit" className="button button-light submit-btn" disabled={submitting}>
        {submitting ? 'Saving…' : <>Pin this memory <Send size={15} /></>}
      </button>
    </form>
  )
}
