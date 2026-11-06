import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { MessageStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

export function timeAgo(dateString: string): string {
  try {
    const d = new Date(dateString).getTime()
    const now = new Date('2026-11-06T11:00:00Z').getTime() // relative to context time or now
    const currentNow = Math.max(now, Date.now())
    const diffSec = Math.floor((currentNow - d) / 1000)

    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    const days = Math.floor(diffSec / 86400)
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days}d ago`
    return formatDate(dateString)
  } catch {
    return dateString
  }
}

export function getStatusConfig(status: MessageStatus) {
  switch (status) {
    case 'new':
      return {
        label: 'New',
        badge: 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-500/20',
        dot: 'bg-sky-500',
      }
    case 'assigned':
      return {
        label: 'Assigned',
        badge: 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20',
        dot: 'bg-amber-500',
      }
    case 'in_progress':
      return {
        label: 'In Progress',
        badge: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20',
        dot: 'bg-blue-500',
      }
    case 'resolved':
      return {
        label: 'Resolved',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20',
        dot: 'bg-emerald-500',
      }
    case 'closed':
      return {
        label: 'Closed',
        badge: 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-400/20',
        dot: 'bg-slate-400',
      }
    case 'spam':
      return {
        label: 'Spam',
        badge: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20',
        dot: 'bg-rose-500',
      }
    default:
      return {
        label: status,
        badge: 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-400/20',
        dot: 'bg-slate-400',
      }
  }
}

export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) return
  const separator = ','
  const keys = Object.keys(rows[0])
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map(row => {
        return keys
          .map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k]
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString()
            cell = cell.replace(/"/g, '""')
            if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`
            return cell
          })
          .join(separator)
      })
      .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export function getInitials(name: string): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('')
}
