import { useState } from 'react'

export default function RatingModal({
  isOpen,
  initialTitle,
  initialCategory,
  secondsElapsed,
  onSave,
  onClose,
}) {
  const [rating, setRating] = useState(4)
  const [notes, setNotes] = useState('')
  const [customTitle, setCustomTitle] = useState(initialTitle || '')

  if (!isOpen) return null

  // Format seconds into readable format (e.g., "25m 30s" or "1h 15m")
  const formatDuration = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  const ratingOptions = [
    { value: 5, label: 'Peak Flow', desc: 'Deep immersion, highest output', colorClass: 'level-5' },
    { value: 4, label: 'High Focus', desc: 'Solid progress, minimal friction', colorClass: 'level-4' },
    { value: 3, label: 'Steady', desc: 'Standard pace, some fluctuations', colorClass: 'level-3' },
    { value: 2, label: 'Low Focus', desc: 'Frequent interruptions or slow momentum', colorClass: 'level-2' },
    { value: 1, label: 'Distracted', desc: 'Hard to concentrate or derailed', colorClass: 'level-1' },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      title: customTitle.trim() || initialTitle || `${initialCategory} Session`,
      category: initialCategory,
      duration: secondsElapsed,
      effectiveness: rating,
      notes: notes.trim(),
    })
  }

  return (
    <div className="modal-overlay" id="rating-modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        id="rating-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="modal-title" className="modal-title">Complete Session</h2>
            <p className="modal-subtitle">
              Tracked: <strong>{formatDuration(secondsElapsed)}</strong> • Category: <strong>{initialCategory}</strong>
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            id="btn-close-modal"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form" id="session-rating-form">
          {/* Session Title */}
          <div className="form-group">
            <label htmlFor="session-title-input" className="form-label">
              Activity Name
            </label>
            <input
              id="session-title-input"
              type="text"
              className="modal-input"
              placeholder="e.g. Implemented Rating Modal"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          </div>

          {/* Effectiveness Rating Selection */}
          <div className="form-group">
            <label className="form-label">
              How effective was your focus? (1 to 5)
            </label>
            <div className="rating-select-grid" id="rating-select-grid">
              {ratingOptions.map((opt) => (
                <button
                  key={opt.value}
                  id={`rating-choice-${opt.value}`}
                  type="button"
                  className={`rating-choice-btn ${opt.colorClass} ${rating === opt.value ? 'selected' : ''}`}
                  onClick={() => setRating(opt.value)}
                >
                  <span className="rating-badge-num">{opt.value}</span>
                  <div className="rating-choice-text">
                    <span className="rating-choice-title">{opt.label}</span>
                    <span className="rating-choice-desc">{opt.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Notes & Reflection */}
          <div className="form-group">
            <label htmlFor="session-notes-input" className="form-label">
              Reflection / Notes <span className="label-optional">(Optional)</span>
            </label>
            <textarea
              id="session-notes-input"
              className="modal-textarea"
              rows={3}
              placeholder="What went well? Any obstacles or takeaways?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button
              id="btn-cancel-session-save"
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              id="btn-submit-session-save"
              type="submit"
              className="btn btn-success"
            >
              Save Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
