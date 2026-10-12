import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../utils/supabase.js'

export default function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
}) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setInfoMessage('')

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill in both email and password.')
      return
    }

    setLoading(true)

    // If Supabase is connected with real credentials
    if (isSupabaseConfigured && supabase) {
      try {
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password.trim(),
            options: {
              data: {
                username: username.trim() || email.split('@')[0],
              },
            },
          })

          if (error) throw error

          if (data.session) {
            onLogin({
              id: data.user.id,
              email: data.user.email,
              username: data.user.user_metadata?.username || username.trim() || email.split('@')[0],
            })
            onClose()
          } else {
            setInfoMessage('Account created! Please check your email to confirm your sign-up before signing in.')
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          })

          if (error) throw error

          onLogin({
            id: data.user.id,
            email: data.user.email,
            username: data.user.user_metadata?.username || email.split('@')[0],
          })
          onClose()
        }
      } catch (err) {
        setErrorMessage(err.message || 'Authentication failed. Please check your credentials.')
      } finally {
        setLoading(false)
      }
    } else {
      // Offline Local Profile simulation
      const userProfile = {
        id: 'local-user-' + String(Date.now()),
        username: username.trim() || email.split('@')[0],
        email: email.trim(),
      }
      onLogin(userProfile)
      setLoading(false)
      onClose()
    }
  }

  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
    }
    onLogout()
    onClose()
  }

  return (
    <div className="modal-overlay" id="auth-modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        id="auth-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="auth-modal-title" className="modal-title">
              {currentUser ? 'Account & Sync' : isSignUp ? 'Create an Account' : 'Sign In to DAYMARK'}
            </h2>
            <p className="modal-subtitle">
              {currentUser
                ? `Signed in as ${currentUser.username} (${currentUser.email})`
                : 'Sign in to sync your focus blocks and daily planner across devices.'}
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            id="btn-close-auth-modal"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Supabase status badge */}
        <div className="auth-status-bar">
          {isSupabaseConfigured ? (
            <span className="badge-sync-connected">
              <span className="pulse-dot" aria-hidden="true"></span> Supabase Connected
            </span>
          ) : (
            <span className="badge-sync-offline">
              Offline Mode • Add Supabase Keys to sync across devices
            </span>
          )}
        </div>

        {currentUser ? (
          <div className="auth-signed-in-box">
            <div className="user-profile-summary">
              <div className="user-avatar-large">
                {currentUser.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="user-details">
                <span className="user-name">{currentUser.username}</span>
                <span className="user-email">{currentUser.email}</span>
                <span className="badge-sync-ready">
                  {isSupabaseConfigured ? 'Live Cloud Syncing' : 'Local Profile Active'}
                </span>
              </div>
            </div>

            <p className="auth-helper-note">
              {isSupabaseConfigured
                ? 'Your activities and daily planner automatically sync to your Supabase PostgreSQL cloud database.'
                : 'Your profile is stored locally. Enter your Supabase project keys in .env.local to enable multi-device sync.'}
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-warning"
                id="btn-logout"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form" id="auth-form">
            {errorMessage && (
              <div className="auth-alert error" role="alert">
                {errorMessage}
              </div>
            )}

            {infoMessage && (
              <div className="auth-alert info" role="status">
                {infoMessage}
              </div>
            )}

            {isSignUp && (
              <div className="form-group">
                <label htmlFor="auth-username-input" className="form-label">
                  Username
                </label>
                <input
                  id="auth-username-input"
                  type="text"
                  className="modal-input"
                  placeholder="e.g. johnroberts"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-email-input" className="form-label">
                Email Address
              </label>
              <input
                id="auth-email-input"
                type="email"
                className="modal-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-password-input" className="form-label">
                Password
              </label>
              <input
                id="auth-password-input"
                type="password"
                className="modal-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="auth-toggle-prompt">
              {isSignUp ? (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => {
                      setIsSignUp(false)
                      setErrorMessage('')
                      setInfoMessage('')
                    }}
                  >
                    Sign In
                  </button>
                </span>
              ) : (
                <span>
                  Don&apos;t have an account yet?{' '}
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => {
                      setIsSignUp(true)
                      setErrorMessage('')
                      setInfoMessage('')
                    }}
                  >
                    Create Account
                  </button>
                </span>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-auth-submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Connecting...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
