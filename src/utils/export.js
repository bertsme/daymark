/**
 * Utilities for offline data export (JSON & CSV).
 */

function downloadFile(content, fileName, contentType) {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function getTodayFileDate() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDurationSec(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function exportToJSON(activities) {
  const dateStr = getTodayFileDate()
  const data = {
    exportedAt: new Date().toISOString(),
    totalActivities: activities.length,
    activities,
  }
  const jsonString = JSON.stringify(data, null, 2)
  downloadFile(jsonString, `daymark-activities-${dateStr}.json`, 'application/json')
}

export function exportToCSV(activities) {
  const dateStr = getTodayFileDate()
  const headers = [
    'ID',
    'Title',
    'Category',
    'Duration Seconds',
    'Duration Formatted',
    'Effectiveness Rating',
    'Notes',
    'Time of Day',
    'Completed Timestamp',
  ]

  const escapeCSV = (field) => {
    if (field === null || field === undefined) return '""'
    const str = String(field).replace(/"/g, '""')
    return `"${str}"`
  }

  const rows = activities.map((item) => [
    escapeCSV(item.id),
    escapeCSV(item.title),
    escapeCSV(item.category),
    item.duration,
    escapeCSV(formatDurationSec(item.duration)),
    item.effectiveness,
    escapeCSV(item.notes || ''),
    escapeCSV(item.timestamp),
    escapeCSV(item.completedAt),
  ])

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
  downloadFile(csvContent, `daymark-activities-${dateStr}.csv`, 'text/csv;charset=utf-8;')
}
