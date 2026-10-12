import { useState, useMemo } from 'react'

export default function ActivityList({
  activities,
  onDeleteActivity,
  onClearAll,
  onExportCSV,
  onExportJSON,
}) {
  const [filterCategory, setFilterCategory] = useState('All')

  // Extract distinct categories present in activities
  const availableCategories = useMemo(() => {
    const set = new Set(activities.map((a) => a.category).filter(Boolean))
    return ['All', ...Array.from(set)]
  }, [activities])

  // Filter activities based on selection
  const filteredActivities = useMemo(() => {
    if (filterCategory === 'All') return activities
    return activities.filter((a) => a.category === filterCategory)
  }, [activities, filterCategory])

  // Format seconds into clean readable string
  const formatDuration = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  const getEffectivenessInfo = (score) => {
    switch (score) {
      case 5:
        return { label: 'Peak Flow', class: 'level-5' }
      case 4:
        return { label: 'High Focus', class: 'level-4' }
      case 3:
        return { label: 'Steady', class: 'level-3' }
      case 2:
        return { label: 'Low Focus', class: 'level-2' }
      case 1:
      default:
        return { label: 'Distracted', class: 'level-1' }
    }
  }

  if (activities.length === 0) {
    return (
      <div className="empty-state" id="empty-state-log">
        <div className="empty-icon" aria-hidden="true">⏱️</div>
        <h3 className="empty-title">No activities recorded today yet</h3>
        <p className="empty-desc">
          Type an activity title, choose a category, and click <strong>Start Session</strong>. When you finish, rate your effectiveness to build your momentum log.
        </p>
      </div>
    )
  }

  return (
    <div className="activity-list-wrapper" id="activity-list-container">
      {/* Filter and Toolbar Bar */}
      <div className="activity-toolbar" id="activity-toolbar">
        {/* Category Filter Pills */}
        <div className="filter-pills" id="activity-filter-pills">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              id={`filter-pill-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              type="button"
              className={`filter-pill-btn ${filterCategory === cat ? 'active' : ''}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Export & Clear Actions */}
        <div className="toolbar-actions" id="toolbar-actions">
          <button
            type="button"
            className="btn-export"
            id="btn-export-csv"
            onClick={onExportCSV}
            title="Download activity log as a CSV spreadsheet"
          >
            <span>↓</span> CSV
          </button>
          <button
            type="button"
            className="btn-export"
            id="btn-export-json"
            onClick={onExportJSON}
            title="Download activity log as a JSON file"
          >
            <span>↓</span> JSON
          </button>
          <button
            type="button"
            className="btn-clear-history"
            id="btn-clear-all-activities"
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all logged activities for today?')) {
                onClearAll()
              }
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Stream of Activities */}
      <div className="activity-cards-stream" id="activity-cards-stream">
        {filteredActivities.length === 0 ? (
          <div className="empty-state">
            <p className="empty-desc">No activities found matching &quot;{filterCategory}&quot;.</p>
          </div>
        ) : (
          filteredActivities.map((item) => {
            const eff = getEffectivenessInfo(item.effectiveness)
            return (
              <article key={item.id} className="activity-card" id={`activity-item-${item.id}`}>
                <div className="activity-card-top">
                  <div className="activity-title-group">
                    <h3 className="activity-item-title">{item.title}</h3>
                    <div className="activity-tags">
                      <span className="badge-category">{item.category}</span>
                      <span className="activity-timestamp">{item.timestamp}</span>
                    </div>
                  </div>

                  <div className="activity-metrics-group">
                    <span className="badge-duration">{formatDuration(item.duration)}</span>
                    <span className={`badge-effectiveness ${eff.class}`}>
                      <span className="badge-score">{item.effectiveness}/5</span>
                      <span className="badge-score-label">{eff.label}</span>
                    </span>
                    <button
                      type="button"
                      className="btn-delete-item"
                      id={`btn-delete-activity-${item.id}`}
                      aria-label={`Delete activity ${item.title}`}
                      onClick={() => onDeleteActivity(item.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {item.notes && (
                  <div className="activity-notes-box">
                    <span className="activity-notes-icon" aria-hidden="true">💬</span>
                    <p className="activity-notes-content">{item.notes}</p>
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
