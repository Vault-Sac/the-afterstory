import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Upload, User, Quote, FileText, Check, AlertCircle,
  ArrowLeft, RefreshCw
} from 'lucide-react'
import { submitPeopleProfile } from '../../lib/data/submissions'

const STEPS = {
  FORM: 'form',
  SAVING: 'saving',
  SUCCESS: 'success',
  ERROR: 'error',
}

const RATE_LIMIT_KEY = 'mv-profile-submit'
const RATE_LIMIT_MS = 5 * 60 * 1000 // 5 minutes

export default function SubmitProfile() {
  const [step, setStep] = useState(STEPS.FORM)
  const [form, setForm] = useState({
    full_name: '',
    nickname: '',
    role_titile: '',
    favourite_quote: '',
    bio: '',
    consent: false,
  })
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  const setField = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.full_name.trim()) errs.full_name = 'Please enter your full name.'
    if (!form.consent) errs.consent = 'Please confirm your consent before submitting.'

    const last = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || '0', 10)
    if (Date.now() - last < RATE_LIMIT_MS) {
      errs.global = 'Please wait a few minutes before submitting again.'
    }

    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGlobalError('')
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      if (errs.global) setGlobalError(errs.global)
      setErrors(errs)
      return
    }

    // Save profile metadata
    setStep(STEPS.SAVING)
    setUploadProgress(50)

    const { error: saveError } = await submitPeopleProfile({
      full_name:       form.full_name.trim(),
      nickname:        form.nickname.trim() || null,
      role_titile:     form.role_titile.trim() || null,
      favourite_quote: form.favourite_quote.trim() || null,
      bio:             form.bio.trim() || null,
      avatar_path:     null,
    })

    if (saveError) {
      setStep(STEPS.ERROR)
      setGlobalError('Could not save your profile. Please try again.')
      return
    }

    // Success
    try {
      localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString())
    } catch (e) { /* ignore */ }
    setUploadProgress(100)
    setStep(STEPS.SUCCESS)
  }

  const handleRetry = () => {
    setStep(STEPS.FORM)
    setGlobalError('')
    setUploadProgress(0)
  }

  // ---- SUCCESS STATE ----
  if (step === STEPS.SUCCESS) {
    return (
      <div className="submit-page">
        <div className="submit-success-wrap section-wrap">
          <div className="submit-success-card">
            <div className="submit-success-icon" aria-hidden="true">
              <Check size={36} />
            </div>
            <h1 className="submit-success-title">Your story is in the vault.</h1>
            <p className="submit-success-desc">
              Thank you, <strong>{form.full_name}</strong>. Your profile has been received and is waiting for review. Once the archive admin approves it, your story will appear on the People page.
            </p>
            <div className="submit-success-actions">
              <Link to="/people" className="button button-light">
                View Our People
              </Link>
              <button
                type="button"
                className="button button-outline"
                onClick={() => {
                  setStep(STEPS.FORM)
                  setForm({ full_name: '', nickname: '', role_titile: '', favourite_quote: '', bio: '', consent: false })
                  setErrors({})
                }}
              >
                Submit Another
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---- ERROR STATE ----
  if (step === STEPS.ERROR) {
    return (
      <div className="submit-page">
        <div className="submit-error-wrap section-wrap">
          <div className="submit-error-card">
            <div className="submit-error-icon" aria-hidden="true">
              <AlertCircle size={36} />
            </div>
            <h1>Something went wrong.</h1>
            <p>{globalError}</p>
            <div className="submit-success-actions">
              <button type="button" className="button button-light" onClick={handleRetry}>
                <RefreshCw size={14} /> Try Again
              </button>
              <Link to="/people" className="button button-outline">
                <ArrowLeft size={14} /> Back to People
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isProcessing = step === STEPS.SAVING

  return (
    <div className="submit-page">
      {/* Page Header */}
      <header className="submit-header">
        <div className="section-wrap">
          <Link to="/people" className="submit-back-link">
            <ArrowLeft size={15} aria-hidden="true" /> Our People
          </Link>
          <span className="section-eyebrow">
            <User size={13} aria-hidden="true" /> SHARE YOUR STORY
          </span>
          <h1 className="submit-page-title">
            Become part of<br /><em>the memories.</em>
          </h1>
          <p className="submit-page-desc">
            Submit your profile and stories to be featured on The Afterstory's People page.
            All submissions are reviewed before appearing publicly — usually within a day or two.
          </p>
        </div>
      </header>

      {/* Form */}
      <main className="submit-main section-wrap" aria-label="Profile submission form">
        <form
          className="submit-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Submit your profile"
        >
          {/* Identity */}
          <fieldset className="submit-fieldset" disabled={isProcessing}>
            <legend className="submit-legend">
              <User size={14} aria-hidden="true" /> About You
            </legend>

            <div className="submit-form-row">
              <label className="submit-label">
                FULL NAME <span aria-hidden="true" className="required-star">*</span>
                <input
                  type="text"
                  className={`submit-input ${errors.full_name ? 'input-error' : ''}`}
                  value={form.full_name}
                  onChange={setField('full_name')}
                  placeholder="e.g. Megha Sharma"
                  maxLength={120}
                  required
                  aria-required="true"
                  aria-describedby={errors.full_name ? 'err-name' : undefined}
                />
                {errors.full_name && (
                  <span id="err-name" className="submit-field-error" role="alert">
                    <AlertCircle size={12} /> {errors.full_name}
                  </span>
                )}
              </label>

              <label className="submit-label">
                NICKNAME
                <input
                  type="text"
                  className="submit-input"
                  value={form.nickname}
                  onChange={setField('nickname')}
                  placeholder="e.g. Navigator"
                  maxLength={60}
                />
              </label>
            </div>

            <label className="submit-label">
              ROLE / TRIP MONIKER
              <input
                type="text"
                className="submit-input"
                value={form.role_titile}
                onChange={setField('role_titile')}
                placeholder="e.g. Lead Navigator, Group DJ, Chief Snack Officer…"
                maxLength={120}
              />
            </label>
          </fieldset>

          {/* Words */}
          <fieldset className="submit-fieldset" disabled={isProcessing}>
            <legend className="submit-legend">
              <Quote size={14} aria-hidden="true" /> In Your Words
            </legend>

            <label className="submit-label">
              FAVORITE TRIP QUOTE
              <input
                type="text"
                className="submit-input"
                value={form.favourite_quote}
                onChange={setField('favourite_quote')}
                placeholder="The one line you'll keep repeating for years…"
                maxLength={300}
              />
            </label>

            <label className="submit-label">
              SHORT BIO OR PERSONAL MEMORY
              <textarea
                className="submit-input submit-textarea"
                value={form.bio}
                onChange={setField('bio')}
                placeholder="Tell the group something they'll remember. A moment, a feeling, an inside joke…"
                rows={4}
                maxLength={2000}
              />
              <span className="submit-char-count">{form.bio.length} / 2000</span>
            </label>
          </fieldset>

          {/* Consent */}
          <div className="submit-consent-wrap">
            <label className={`submit-consent-label ${errors.consent ? 'consent-error' : ''}`}>
              <input
                type="checkbox"
                checked={form.consent}
                onChange={setField('consent')}
                disabled={isProcessing}
                className="submit-checkbox"
                required
                aria-required="true"
                aria-describedby={errors.consent ? 'err-consent' : undefined}
              />
              <span>
                I confirm that this profile and memory is mine or I have the right to share it, and I
                consent to it being displayed on The Afterstory if approved by the archive admin.
              </span>
            </label>
            {errors.consent && (
              <span id="err-consent" className="submit-field-error" role="alert">
                <AlertCircle size={12} /> {errors.consent}
              </span>
            )}
          </div>

          {/* Global error */}
          {globalError && (
            <div className="submit-global-error" role="alert">
              <AlertCircle size={15} aria-hidden="true" />
              <span>{globalError}</span>
            </div>
          )}

          {/* Saving progress */}
          {isProcessing && (
            <div className="submit-progress-wrap" aria-live="polite">
              <div className="submit-progress-bar">
                <div
                  className="submit-progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  role="progressbar"
                />
              </div>
              <p className="submit-progress-label">Saving your profile…</p>
            </div>
          )}

          <div className="submit-actions">
            <button
              type="submit"
              className="button button-light submit-cta"
              disabled={isProcessing}
              aria-busy={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="btn-spinner" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                <>
                  <Upload size={15} aria-hidden="true" /> Submit Your Story
                </>
              )}
            </button>
            <p className="submit-disclaimer">
              Submissions are reviewed privately. Only approved profiles appear publicly.
              You can request removal at any time by contacting the archive admin.
            </p>
          </div>
        </form>
      </main>
    </div>
  )
}
