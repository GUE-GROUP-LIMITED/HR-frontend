import { describe, it, expect } from 'vitest'
import { UserRole } from '@/types'

// Role permissions matrix helper derived from Section 8 of the specification
export function checkPermission(
  role: UserRole,
  action:
    | 'view_all_messages'
    | 'assign_messages'
    | 'change_message_status'
    | 'view_all_staff'
    | 'monitor_staff_responses'
    | 'respond_to_assigned'
    | 'register_edit_staff'
    | 'manage_hr_accounts'
    | 'manage_websites_keys'
    | 'manage_categories'
    | 'view_audit_logs',
  isAssignedToUser: boolean = false
): boolean {
  switch (action) {
    case 'view_all_messages':
      return role === 'super_admin' || role === 'hr'

    case 'assign_messages':
      return role === 'super_admin' || role === 'hr'

    case 'change_message_status':
      if (role === 'super_admin' || role === 'hr') return true
      return role === 'staff' && isAssignedToUser

    case 'view_all_staff':
    case 'monitor_staff_responses':
    case 'register_edit_staff':
      return role === 'super_admin' || role === 'hr'

    case 'respond_to_assigned':
      if (role === 'super_admin' || role === 'hr') return true
      return role === 'staff' && isAssignedToUser

    case 'manage_hr_accounts':
    case 'manage_websites_keys':
    case 'view_audit_logs':
      return role === 'super_admin'

    case 'manage_categories':
      return role === 'super_admin' || role === 'hr'

    default:
      return false
  }
}

describe('GUE HR Permissions Matrix (PDF Section 8)', () => {
  describe('Super Admin Role', () => {
    it('has full permissions across all operations', () => {
      const role: UserRole = 'super_admin'
      expect(checkPermission(role, 'view_all_messages')).toBe(true)
      expect(checkPermission(role, 'assign_messages')).toBe(true)
      expect(checkPermission(role, 'manage_websites_keys')).toBe(true)
      expect(checkPermission(role, 'manage_hr_accounts')).toBe(true)
      expect(checkPermission(role, 'view_audit_logs')).toBe(true)
    })
  })

  describe('HR Role', () => {
    it('can view all messages, assign messages, monitor staff, but cannot manage site keys or view audit logs', () => {
      const role: UserRole = 'hr'
      expect(checkPermission(role, 'view_all_messages')).toBe(true)
      expect(checkPermission(role, 'assign_messages')).toBe(true)
      expect(checkPermission(role, 'monitor_staff_responses')).toBe(true)
      expect(checkPermission(role, 'register_edit_staff')).toBe(true)

      // Restricted actions
      expect(checkPermission(role, 'manage_websites_keys')).toBe(false)
      expect(checkPermission(role, 'manage_hr_accounts')).toBe(false)
      expect(checkPermission(role, 'view_audit_logs')).toBe(false)
    })
  })

  describe('Staff (Responder) Role', () => {
    it('can only view and change status of their own assigned inquiries', () => {
      const role: UserRole = 'staff'
      expect(checkPermission(role, 'view_all_messages')).toBe(false)
      expect(checkPermission(role, 'assign_messages')).toBe(false)
      expect(checkPermission(role, 'view_all_staff')).toBe(false)

      // Can respond to their own assigned message
      expect(checkPermission(role, 'respond_to_assigned', true)).toBe(true)
      // Cannot respond to unassigned or someone else's message
      expect(checkPermission(role, 'respond_to_assigned', false)).toBe(false)

      // Can change status of own assigned message
      expect(checkPermission(role, 'change_message_status', true)).toBe(true)
      expect(checkPermission(role, 'change_message_status', false)).toBe(false)
    })
  })
})

