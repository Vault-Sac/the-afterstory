import React, { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Upload, X, Camera, User, Quote, FileText, Check, AlertCircle,
  ArrowLeft, Image, RefreshCw
} from 'lucide-react'
import {
  validateImageFile,
  uploadSubmissionPhoto,
  deleteSubmissionPhoto,
  submitPeopleProfile,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from '../../lib/data/submissions'

const STEPS = {
  FORM: 'form',
  UPLOADING: 'uploading',
  SAVING: 'saving',
  SUCCESS: 'success',
  ERROR: 'error',
}

const RATE_LIMIT_KEY = 'mv-profile-submit'
const RATE_LIMIT_MS = 5 * 60 * 1000 // 5 minutes

function ImagePickerField({ file, preview, onChange, onRemove, error }) {
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) onChange(dropped)
  }, [onChange])

  const handleDragOver = (e) => { e.preventDefault() }

  return (
    <div className="submit-photo-field">
      <label className="submit-field-label">
        YOUR PHOTOGRAPH <span aria-hidden="true">*</span>
      </label>
      <p className="submit-field-note">
        JPEG, PNG, WebP or GIF · Max {Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB
      </p>

      {preview ? (
        <div className="submit-preview-wrap">
          <div className="submit-preview-frame">
            <img
              src={preview}
              alt="Your selected photo preview"
              className="submit-preview-img"
            />
            <div className="submit-preview-overlay">
              <button
                type="button"
                className="submit-preview-btn replace"
                onClick={() => inputRef.current?.click()}
                aria-label="Replace photo"
              >
                <RefreshCw size={14} /> Replace
              </button>
              <button
                type="button"
                className="submit-preview-btn remove"
                onClick={onRemove}
                aria-label="Remove photo"
              >
                <X size={14} /> Remove
              </button>
            </div>
          </div>
          <p className="submit-preview-name">{file?.name}</p>
        </div>
      ) : (
        <div
          className={`submit-drop-zone ${error ? 'has-error' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Click or drag to select a photo"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        >
          <div className="drop-zone-inner">
            <div className="drop-zone-icon" aria-hidden="true">
              <Camera size={32} />
            </div>
            <p className="drop-zone-title">Drop your photo here</p>
            <p className="drop-zone-sub">or click to browse</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.map(t => `.${t.split('/')[1]}`).join(',')}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onChange(f)
          e.target.value = ''
        }}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {error && (
        <p className="submit-field-error" role="alert">
          <AlertCircle size={13} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  )
}

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
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  const setField = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const handlePhotoChange = (file) => {
    const err = validateImageFile(file)
    if (err) {
      setErrors(prev => ({ ...prev, photo: err }))
      return
    }
    setErrors(prev => ({ ...prev, photo: '' }))
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setPhotoPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handlePhotoRemove = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    setErrors(prev => ({ ...prev, photo: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.full_name.trim()) errs.full_name = 'Please enter your full name.'
    if (!photoFile) errs.photo = 'Please select a photograph.'
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

    // ---- Step 1: Upload photo ----
    setStep(STEPS.UPLOADING)
    setUploadProgress(10)

    const { path: avatarPath, localUrl, error: uploadError } = await uploadSubmissionPhoto(
      photoFile,
      (pct) => setUploadProgress(Math.min(pct, 90))
    )

    if (uploadError) {
      setStep(STEPS.ERROR)
      setGlobalError('Photo upload failed. Your photo was not saved. Please try again.')
      return
    }

    setUploadProgress(95)

    // ---- Step 2: Save metadata ----
    setStep(STEPS.SAVING)

    const { error: saveError } = await submitPeopleProfile({
      full_name:       form.full_name.trim(),
      nickname:        form.nickname.trim() || null,
      role_titile:     form.role_titile.trim() || null,
      favourite_quote: form.favourite_quote.trim() || null,
      bio:             form.bio.trim() || null,
      avatar_path:     avatarPath,
    })

    if (saveError) {
      // Upload succeeded but DB failed — try to clean up the orphan
      await deleteSubmissionPhoto(avatarPath)
      setStep(STEPS.ERROR)
      setGlobalError('Your photo was uploaded but we could not save your profile. The photo was removed. Please try again.')
      return
    }

    // ---- Success ----
    localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString())
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
              Thank you, <strong>{form.full_name}</strong>. Your photograph and profile
              have been received and are waiting for review. Once the archive admin
              approves it, your face will appear on the People page.
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
                  setPhotoFile(null)
                  setPhotoPreview(null)
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

  // ---- UPLOAD / SAVING PROGRESS STATE ----
  const isProcessing = step === STEPS.UPLOADING || step === STEPS.SAVING

  return (
    <div className="submit-page">
      {/* Page Header */}
      <header className="submit-header">
        <div className="section-wrap">
          <Link to="/people" className="submit-back-link">
            <ArrowLeft size={15} aria-hidden="true" /> Our People
          </Link>
          <span className="section-eyebrow">
            <Image size={13} aria-hidden="true" /> SHARE YOUR STORY
          </span>
          <h1 className="submit-page-title">
            Become part of<br /><em>the memories.</em>
          </h1>
          <p className="submit-page-desc">
            Submit your photograph and profile to be featured on The Afterstory's People page.
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
          {/* Photo picker */}
          <ImagePickerField
            file={photoFile}
            preview={photoPreview}
            onChange={handlePhotoChange}
            onRemove={handlePhotoRemove}
            error={errors.photo}
          />

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
                placeholder="e.g. The Photographer, Group DJ, Chief Snack Officer…"
                maxLength={120}
              />
            </label>
          </fieldset>

          {/* Voice */}
          <fieldset className="submit-fieldset" disabled={isProcessing}>
            <legend className="submit-legend">
              <Quote size={14} aria-hidden="true" /> Your Voice
            </legend>

            <label className="submit-label">
              FAVOURITE TRIP QUOTE
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
                I confirm that this photograph is mine or I have the right to share it, and I
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

          {/* Upload progress */}
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
              <p className="submit-progress-label">
                {step === STEPS.UPLOADING ? 'Uploading your photo…' : 'Saving your profile…'}
              </p>
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
                  {step === STEPS.UPLOADING ? 'Uploading…' : 'Saving…'}
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
