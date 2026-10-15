import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LockKeyhole, Eye, EyeOff } from 'lucide-react'

export default function AdminLogin() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    setError('')
    const { error: authError } = await signIn(email, password)
    setLoading(false)
    if (authError) {
      setError(authError.message || 'Sign-in failed. Please check your credentials.')
    } else {
      navigate('/admin')
    }
  }

  return (
    <div className="admin-login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark"><LockKeyhole size={20} /></span>
          <div>
            <span className="login-title">THE MEMORY VAULT</span>
            <span className="login-subtitle">Admin Access</span>
          </div>
        </div>

        <h1>Sign in to the<br />content dashboard.</h1>
        <p className="login-desc">
          This area is for authorized administrators only. Public visitors do not need to sign in to view the archive or submit memories.
        </p>

        <form onSubmit={handleSubmit} noValidate aria-label="Admin sign in">
          <label className="form-label">
            EMAIL
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoComplete="email"
              className="form-input"
              aria-required="true"
            />
          </label>

          <label className="form-label">
            PASSWORD
            <div className="pw-field">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                required
                autoComplete="current-password"
                className="form-input"
                aria-required="true"
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw(o => !o)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button type="submit" className="button button-light login-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-demo-note">
          <strong>Demo mode:</strong> Use <code>admin@memoryvault.local</code> / <code>demo-admin-2026</code> when Supabase is not configured.
        </p>
      </div>
    </div>
  )
}
