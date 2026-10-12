import { useState, useEffect, useMemo } from 'react'
import RatingModal from './components/RatingModal.jsx'
import ActivityList from './components/ActivityList.jsx'
import DailyPlanner from './components/DailyPlanner.jsx'
import AuthModal from './components/AuthModal.jsx'
import daymarkIcon from './assets/daymark-icon.png'
import { playStartSound, playPauseSound, playCompleteSound } from './utils/audio.js'
import { exportToCSV, exportToJSON } from './utils/export.js'
import { supabase, isSupabaseConfigured } from './utils/supabase.js'
import './App.css'

export default function App() {
  // Theme state: 'system' | 'dark' | 'light'
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('daymark_theme') || 'system'
    } catch {
      return 'system'
    }
  })

  // Sound feedback state
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem('daymark_sound') !== 'false'
    } catch {
      return true
    }
  })

  // User Authentication state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('daymark_user_profile')
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  // Activity setup state
  const [activityTitle, setActivityTitle] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Deep Work')

  // Timer engine state: 'idle' | 'running' | 'paused'
  const [timerStatus, setTimerStatus] = useState('idle')
  const [secondsElapsed, setSecondsElapsed] = useState(0)

  // Rating modal visibility state
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false)

  // Categories list
  const categories = ['Deep Work', 'Coding', 'Writing', 'Planning', 'Review', 'Break']

  // Offline Persistence: Load activities from localStorage
  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem('daymark_activities')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Offline Persistence: Load Daily Planner tasks from localStorage
  const [plannerTasks, setPlannerTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem('daymark_planner_tasks')
      return savedTasks ? JSON.parse(savedTasks) : []
    } catch {
      return []
    }
  })

  // Sync Supabase Authentication Session
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            username: session.user.user_metadata?.username || session.user.email.split('@')[0],
          })
        }
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            username: session.user.user_metadata?.username || session.user.email.split('@')[0],
          })
        } else {
          setCurrentUser(null)
        }
      })

      return () => subscription.unsubscribe()
    }
  }, [])

  // Fetch Remote Data on User Login
  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured || !supabase) return

    let ignore = false

    async function loadRemote() {
      try {
        const { data: remoteActivities, error: actError } = await supabase
          .from('activities')
          .select('*')
          .order('completed_at', { ascending: false })

        if (!ignore && !actError && remoteActivities && remoteActivities.length > 0) {
          setActivities(
            remoteActivities.map((item) => ({
              id: item.id,
              title: item.title,
              category: item.category,
              duration: item.duration,
              effectiveness: item.effectiveness,
              notes: item.notes,
              timestamp: item.timestamp,
              completedAt: item.completed_at,
            })),
          )
        }

        const { data: remoteTasks, error: taskError } = await supabase
          .from('planner_tasks')
          .select('*')
          .order('created_at', { ascending: true })

        if (!ignore && !taskError && remoteTasks && remoteTasks.length > 0) {
          setPlannerTasks(
            remoteTasks.map((item) => ({
              id: item.id,
              text: item.text,
              category: item.category,
              completed: item.completed,
              createdAt: item.created_at,
            })),
          )
        }
      } catch {
        // Fallback silently to local cache on network error
      }
    }

    loadRemote()

    return () => {
      ignore = true
    }
  }, [currentUser])

  // Apply and persist Theme (system, dark, light)
  useEffect(() => {
    try {
      localStorage.setItem('daymark_theme', theme)
    } catch {
      // ignore storage errors
    }

    const root = document.documentElement
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const applySystemTheme = () => {
        if (mediaQuery.matches) {
          root.setAttribute('data-theme', 'dark')
        } else {
          root.setAttribute('data-theme', 'light')
        }
      }
      applySystemTheme()
      mediaQuery.addEventListener('change', applySystemTheme)
      return () => mediaQuery.removeEventListener('change', applySystemTheme)
    } else {
      root.setAttribute('data-theme', theme)
    }
  }, [theme])

  // Persist sound preference
  useEffect(() => {
    try {
      localStorage.setItem('daymark_sound', String(soundEnabled))
    } catch {
      // ignore
    }
  }, [soundEnabled])

  // Save activities to localStorage whenever the list updates
  useEffect(() => {
    try {
      localStorage.setItem('daymark_activities', JSON.stringify(activities))
    } catch {
      // ignore
    }
  }, [activities])

  // Save planner tasks to localStorage whenever the list updates
  useEffect(() => {
    try {
      localStorage.setItem('daymark_planner_tasks', JSON.stringify(plannerTasks))
    } catch {
      // ignore
    }
  }, [plannerTasks])

  // Persist current user profile
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('daymark_user_profile', JSON.stringify(currentUser))
      } else {
        localStorage.removeItem('daymark_user_profile')
      }
    } catch {
      // ignore
    }
  }, [currentUser])

  // Format seconds into HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const pad = (n) => String(n).padStart(2, '0')
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  // Timer interval effect
  useEffect(() => {
    let interval = null
    if (timerStatus === 'running') {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1)
      }, 1000)
    } else {
      clearInterval(interval)
    }

    return () => clearInterval(interval)
  }, [timerStatus])

  // Timer control handlers with audio feedback
  const handleStart = () => {
    playStartSound(soundEnabled)
    setTimerStatus('running')
  }

  const handlePause = () => {
    playPauseSound(soundEnabled)
    setTimerStatus('paused')
  }

  const handleResume = () => {
    playStartSound(soundEnabled)
    setTimerStatus('running')
  }

  const handleReset = () => {
    setTimerStatus('idle')
    setSecondsElapsed(0)
  }

  // Finish session & trigger rating modal
  const handleOpenFinishModal = () => {
    if (timerStatus === 'running') {
      setTimerStatus('paused')
      playPauseSound(soundEnabled)
    }
    setIsRatingModalOpen(true)
  }

  // Save completed session from modal
  const handleSaveSession = async ({ title, category, duration, effectiveness, notes }) => {
    const now = new Date()
    const timeFormatted = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(now)

    const newActivity = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title: title || `${category} Session`,
      category,
      duration,
      effectiveness,
      notes,
      timestamp: timeFormatted,
      completedAt: now.toISOString(),
    }

    setActivities((prev) => [newActivity, ...prev])
    playCompleteSound(soundEnabled)
    setTimerStatus('idle')
    setSecondsElapsed(0)
    setActivityTitle('')
    setIsRatingModalOpen(false)

    // Sync to Supabase if connected
    if (currentUser && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('activities').insert({
          id: newActivity.id,
          user_id: currentUser.id,
          title: newActivity.title,
          category: newActivity.category,
          duration: newActivity.duration,
          effectiveness: newActivity.effectiveness,
          notes: newActivity.notes,
          timestamp: newActivity.timestamp,
          completed_at: newActivity.completedAt,
        })
      } catch {
        // Fallback silently; data is cached locally
      }
    }
  }

  // Delete an activity
  const handleDeleteActivity = async (id) => {
    setActivities((prev) => prev.filter((item) => item.id !== id))

    if (currentUser && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('activities').delete().eq('id', id)
      } catch {
        // ignore
      }
    }
  }

  // Clear all activities
  const handleClearAll = () => {
    setActivities([])
  }

  // Planner handlers
  const handleAddPlannerTask = async (text, category) => {
    const newTask = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      text,
      category,
      completed: false,
      createdAt: new Date().toISOString(),
    }
    setPlannerTasks((prev) => [...prev, newTask])

    if (currentUser && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('planner_tasks').insert({
          id: newTask.id,
          user_id: currentUser.id,
          text: newTask.text,
          category: newTask.category,
          completed: false,
          created_at: newTask.createdAt,
        })
      } catch {
        // ignore
      }
    }
  }

  const handleTogglePlannerTask = async (id) => {
    let nextCompleted = false
    setPlannerTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          nextCompleted = !task.completed
          if (nextCompleted) {
            playStartSound(soundEnabled)
          }
          return { ...task, completed: nextCompleted }
        }
        return task
      }),
    )

    if (currentUser && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('planner_tasks').update({ completed: nextCompleted }).eq('id', id)
      } catch {
        // ignore
      }
    }
  }

  const handleDeletePlannerTask = async (id) => {
    setPlannerTasks((prev) => prev.filter((task) => task.id !== id))

    if (currentUser && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('planner_tasks').delete().eq('id', id)
      } catch {
        // ignore
      }
    }
  }

  // Load a planned task directly into the active timer
  const handleTrackPlannerTask = (taskText, category) => {
    setActivityTitle(taskText)
    if (category) setSelectedCategory(category)
    const trackerInput = document.getElementById('activity-title-input')
    if (trackerInput) {
      trackerInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
      trackerInput.focus()
    }
  }

  // Formatted current date (initialized once)
  const [todayDateString] = useState(() =>
    new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }).format(new Date()),
  )

  // Derived metrics from activities
  const totalCompletedSeconds = useMemo(() => {
    return activities.reduce((sum, item) => sum + (item.duration || 0), 0)
  }, [activities])

  const averageEffectiveness = useMemo(() => {
    if (activities.length === 0) return '—'
    const totalScore = activities.reduce((sum, item) => sum + (item.effectiveness || 0), 0)
    const avg = (totalScore / activities.length).toFixed(1)
    return `${avg} / 5.0`
  }, [activities])

  return (
    <div className="app-container" id="daymark-app">
      {/* Top Header */}
      <header className="app-header" id="app-header">
        <div className="brand-section">
          <img
            src={daymarkIcon}
            alt="DAYMARK App Icon"
            className="brand-icon-img"
            id="brand-logo-img"
          />
          <div>
            <h1 className="brand-title">DAYMARK</h1>
            <p className="brand-tagline">Personal Effectiveness & Daily Planner</p>
          </div>
        </div>

        <div className="header-controls">
          {/* User Sign In / Profile Button */}
          <button
            type="button"
            className="user-auth-btn"
            id="btn-user-auth"
            onClick={() => setIsAuthModalOpen(true)}
            title={currentUser ? `Account: ${currentUser.username}` : 'Sign in to sync your data'}
          >
            {currentUser ? (
              <>
                <span className="user-avatar-pill">
                  {currentUser.username.slice(0, 1).toUpperCase()}
                </span>
                <span>{currentUser.username}</span>
              </>
            ) : (
              <>
                <span aria-hidden="true">👤</span>
                <span>Sign In</span>
              </>
            )}
          </button>

          {/* Theme Switcher */}
          <div className="theme-switcher" role="radiogroup" aria-label="Appearance theme">
            <button
              type="button"
              id="theme-btn-system"
              className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
              onClick={() => setTheme('system')}
              title="Match operating system theme"
            >
              🖥️ System
            </button>
            <button
              type="button"
              id="theme-btn-light"
              className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
              title="Light appearance"
            >
              ☀️ Light
            </button>
            <button
              type="button"
              id="theme-btn-dark"
              className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
              title="Dark appearance"
            >
              🌙 Dark
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            id="btn-sound-toggle"
            className={`audio-toggle-btn ${!soundEnabled ? 'muted' : ''}`}
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? 'Sound cues enabled (Click to mute)' : 'Sound cues muted (Click to enable)'}
            aria-label={soundEnabled ? 'Mute audio cues' : 'Enable audio cues'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          {/* Offline / Sync Indicator Badge */}
          <span className="offline-badge" id="offline-status-badge">
            <span className="pulse-dot" aria-hidden="true"></span>
            {isSupabaseConfigured && currentUser ? 'Cloud Synced' : 'Offline • Local'}
          </span>
        </div>
      </header>

      {/* Metrics Summary Row */}
      <section className="stats-grid" aria-label="Daily effectiveness statistics" id="stats-overview">
        <div className="stat-card" id="stat-focus-time">
          <span className="stat-label">Today's Focus Time</span>
          <span className="stat-value">{formatTime(totalCompletedSeconds + (timerStatus === 'running' ? secondsElapsed : 0))}</span>
          <span className="stat-subtext">
            {activities.length > 0 ? `${formatTime(totalCompletedSeconds)} logged` : 'Start a session to track'}
          </span>
        </div>

        <div className="stat-card" id="stat-activities-count">
          <span className="stat-label">Activities Logged</span>
          <span className="stat-value">{activities.length}</span>
          <span className="stat-subtext">
            {activities.length === 1 ? '1 completed session' : `${activities.length} completed sessions`}
          </span>
        </div>

        <div className="stat-card" id="stat-avg-score">
          <span className="stat-label">Avg. Effectiveness</span>
          <span className="stat-value">{averageEffectiveness}</span>
          <span className="stat-subtext">Based on your ratings</span>
        </div>
      </section>

      {/* Main Dashboard Section */}
      <main className="dashboard-grid" id="main-dashboard">
        {/* Left: Active Session Tracker */}
        <section className="card" id="active-session-card">
          <div className="card-header">
            <div className="card-title-group">
              <h2 className="card-title">Active Tracker</h2>
            </div>
            <span className={`tracker-status-tag ${timerStatus}`} id="tracker-status-pill">
              {timerStatus}
            </span>
          </div>

          <div className="activity-input-wrap">
            <input
              id="activity-title-input"
              type="text"
              className="activity-input"
              placeholder="What are you working on? (e.g. Building DAYMARK Dashboard)"
              value={activityTitle}
              onChange={(e) => setActivityTitle(e.target.value)}
            />

            <div className="category-pills" id="category-selector">
              {categories.map((cat) => (
                <button
                  key={cat}
                  id={`category-btn-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Digital Timer Display */}
          <div className="timer-display-box" id="timer-display-box">
            <div
              className={`timer-digits ${timerStatus === 'running' ? 'active' : timerStatus === 'paused' ? 'paused' : ''}`}
              id="timer-digits"
            >
              {formatTime(secondsElapsed)}
            </div>
            <span className="timer-helper">
              {timerStatus === 'idle' && 'Ready to begin your focus block'}
              {timerStatus === 'running' && 'Focus session in progress...'}
              {timerStatus === 'paused' && 'Session paused — ready to resume or complete'}
            </span>
          </div>

          {/* Timer Controls */}
          <div className="timer-controls" id="timer-controls">
            {timerStatus === 'idle' && (
              <button
                id="btn-start-timer"
                type="button"
                className="btn btn-primary"
                onClick={handleStart}
              >
                ▶ Start Session
              </button>
            )}

            {timerStatus === 'running' && (
              <>
                <button
                  id="btn-pause-timer"
                  type="button"
                  className="btn btn-warning"
                  onClick={handlePause}
                >
                  ⏸ Pause
                </button>
                <button
                  id="btn-finish-timer"
                  type="button"
                  className="btn btn-success"
                  onClick={handleOpenFinishModal}
                >
                  ✓ Finish & Rate
                </button>
              </>
            )}

            {timerStatus === 'paused' && (
              <>
                <button
                  id="btn-resume-timer"
                  type="button"
                  className="btn btn-primary"
                  onClick={handleResume}
                >
                  ▶ Resume
                </button>
                <button
                  id="btn-finish-paused-timer"
                  type="button"
                  className="btn btn-success"
                  onClick={handleOpenFinishModal}
                >
                  ✓ Finish & Rate
                </button>
              </>
            )}

            {(timerStatus === 'running' || timerStatus === 'paused' || secondsElapsed > 0) && (
              <button
                id="btn-reset-timer"
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                ↺ Reset
              </button>
            )}
          </div>
        </section>

        {/* Right: Daily Planner */}
        <DailyPlanner
          tasks={plannerTasks}
          onAddTask={handleAddPlannerTask}
          onToggleTask={handleTogglePlannerTask}
          onDeleteTask={handleDeletePlannerTask}
          onTrackTask={handleTrackPlannerTask}
          categories={categories}
        />
      </main>

      {/* History & Timeline Section */}
      <section className="card history-section" id="recent-history-section">
        <div className="card-header">
          <div className="card-title-group">
            <h2 className="card-title">Today's Activity Log</h2>
          </div>
          <span className="stat-label">{todayDateString}</span>
        </div>

        <ActivityList
          activities={activities}
          onDeleteActivity={handleDeleteActivity}
          onClearAll={handleClearAll}
          onExportCSV={() => exportToCSV(activities)}
          onExportJSON={() => exportToJSON(activities)}
        />
      </section>

      {/* Finish & Rate Modal */}
      <RatingModal
        isOpen={isRatingModalOpen}
        initialTitle={activityTitle}
        initialCategory={selectedCategory}
        secondsElapsed={secondsElapsed}
        onSave={handleSaveSession}
        onClose={() => setIsRatingModalOpen(false)}
      />

      {/* Auth & Sync Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLogin={(profile) => setCurrentUser(profile)}
        onLogout={() => setCurrentUser(null)}
      />

      {/* Footer */}
      <footer className="app-footer" id="app-footer">
        <div className="footer-offline-info">
          <span>DAYMARK</span>
          <span>•</span>
          <span>100% Client-Side & Offline</span>
          <span>•</span>
          <span>Data stored locally in your browser</span>
        </div>
        <div>
          <span>Personal Effectiveness & Daily Planner</span>
        </div>
      </footer>
    </div>
  )
}
