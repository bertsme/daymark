import { useState } from 'react'

export default function DailyPlanner({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onTrackTask,
  categories,
}) {
  const [inputText, setInputText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || 'Deep Work')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed) return
    onAddTask(trimmed, selectedCategory)
    setInputText('')
  }

  const completedCount = tasks.filter((t) => t.completed).length
  const totalCount = tasks.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <section className="card planner-card" id="daily-planner-card">
      <div className="card-header">
        <div className="card-title-group">
          <h2 className="card-title">Daily Planner</h2>
        </div>
        <span className="stat-label" id="planner-progress-badge">
          {totalCount === 0 ? 'No tasks' : `${completedCount} of ${totalCount} Done (${progressPercent}%)`}
        </span>
      </div>

      <p className="card-subtitle">
        Outline what you plan to accomplish today. Check them off as you finish, or click <strong>Track</strong> to start a focused session.
      </p>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="planner-progress-track" aria-hidden="true">
          <div
            className="planner-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Add Task Form */}
      <form onSubmit={handleSubmit} className="planner-add-form" id="planner-add-form">
        <div className="planner-input-row">
          <input
            id="planner-new-task-input"
            type="text"
            className="planner-input"
            placeholder="What do you plan to achieve today?..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button
            id="btn-add-planner-task"
            type="submit"
            className="btn btn-primary btn-add-task"
            disabled={!inputText.trim()}
          >
            + Add
          </button>
        </div>

        <div className="planner-category-selector" id="planner-category-selector">
          <span className="planner-category-label">Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              id={`planner-cat-pill-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              type="button"
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </form>

      {/* Task List */}
      <div className="planner-task-list" id="planner-task-list">
        {totalCount === 0 ? (
          <div className="planner-empty-state">
            <span className="planner-empty-icon" aria-hidden="true">📝</span>
            <p className="planner-empty-text">
              No planned tasks yet today. Add your priorities above to stay focused and organized.
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`planner-task-item ${task.completed ? 'completed' : ''}`}
              id={`planner-task-${task.id}`}
            >
              {/* Circular Checkbox */}
              <button
                type="button"
                className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                id={`task-check-${task.id}`}
                onClick={() => onToggleTask(task.id)}
                aria-label={task.completed ? `Mark "${task.text}" as uncompleted` : `Mark "${task.text}" as completed`}
              >
                {task.completed && <span className="checkmark" aria-hidden="true">✓</span>}
              </button>

              {/* Task Text & Details */}
              <div className="task-content">
                <span
                  className={`task-text ${task.completed ? 'strike-through' : ''}`}
                  onClick={() => onToggleTask(task.id)}
                >
                  {task.text}
                </span>
                <span className="badge-category">{task.category}</span>
              </div>

              {/* Actions */}
              <div className="task-actions">
                {!task.completed && (
                  <button
                    type="button"
                    className="btn-track-task"
                    id={`btn-track-task-${task.id}`}
                    title="Load this task into the timer and start tracking"
                    onClick={() => onTrackTask(task.text, task.category)}
                  >
                    ▶ Track
                  </button>
                )}
                <button
                  type="button"
                  className="btn-delete-item"
                  id={`btn-delete-planner-task-${task.id}`}
                  aria-label={`Delete task "${task.text}"`}
                  onClick={() => onDeleteTask(task.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
