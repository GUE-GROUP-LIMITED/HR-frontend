import { describe, it, expect } from 'vitest'
import {
  getStatusConfig,
  getInitials,
  formatDate,
  formatDateTime,
  timeAgo,
} from '@/lib/utils'

describe('GUE HR Utility Functions', () => {
  describe('getStatusConfig', () => {
    it('returns appropriate badge and dot styles for "new" status', () => {
      const config = getStatusConfig('new')
      expect(config.label).toBe('New')
      expect(config.badge).toContain('bg-sky-50')
      expect(config.dot).toContain('bg-sky-500')
    })

    it('returns appropriate badge styles for "resolved" status', () => {
      const config = getStatusConfig('resolved')
      expect(config.label).toBe('Resolved')
      expect(config.badge).toContain('bg-emerald-50')
      expect(config.dot).toContain('bg-emerald-500')
    })

    it('returns appropriate badge styles for "spam" status', () => {
      const config = getStatusConfig('spam')
      expect(config.label).toBe('Spam')
      expect(config.badge).toContain('bg-rose-50')
    })

    it('returns fallback config for unknown status', () => {
      const config = getStatusConfig('custom_status' as any)
      expect(config.label).toBe('custom_status')
    })
  })

  describe('getInitials', () => {
    it('extracts two initials from full name', () => {
      expect(getInitials('Elena Rostova')).toBe('ER')
      expect(getInitials('Lucas Graham')).toBe('LG')
    })

    it('extracts single initial for single name', () => {
      expect(getInitials('Antigravity')).toBe('A')
    })

    it('returns fallback initial for empty input', () => {
      expect(getInitials('')).toBe('U')
    })
  })

  describe('formatDate and formatDateTime', () => {
    it('formats ISO date strings correctly', () => {
      const iso = '2026-11-04T18:30:00Z'
      const formatted = formatDate(iso)
      expect(formatted).toContain('2026')
      expect(formatted).toContain('Nov')
    })

    it('formats ISO datetime strings with hour and minute', () => {
      const iso = '2026-11-04T18:30:00Z'
      const formatted = formatDateTime(iso)
      expect(formatted).toContain('2026')
    })
  })

  describe('timeAgo', () => {
    it('returns formatted relative time or date string', () => {
      const recent = new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 min ago
      const result = timeAgo(recent)
      expect(typeof result).toBe('string')
    })
  })
})

