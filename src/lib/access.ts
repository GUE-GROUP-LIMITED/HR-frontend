import { User, UserPermission, UserRole } from '@/types'

export const USER_ROLE_RANK: Record<UserRole, number> = {
  super_admin: 100,
  group_head: 90,
  operations_manager: 80,
  subsidiary_head: 70,
  company_manager: 70,
  hr: 65,
  unit_head: 60,
  branch_manager: 50,
  assistant_manager: 40,
  payroll_viewer: 20,
  staff: 10,
}

const rolePermissions: Partial<Record<UserRole, UserPermission[]>> = {
  group_head: [
    'view_staff',
    'view_operations',
    'view_payroll',
    'approve_group_payroll',
    'export_payroll',
  ],
  subsidiary_head: [
    'view_staff',
    'view_payroll',
    'approve_entity_payroll',
    'export_payroll',
  ],
  unit_head: ['view_staff', 'view_payroll', 'approve_unit_payroll', 'export_payroll'],
  operations_manager: ['view_staff', 'view_operations', 'view_payroll'],
  company_manager: ['view_staff', 'view_payroll', 'approve_entity_payroll', 'export_payroll'],
  branch_manager: ['view_staff', 'view_payroll', 'export_payroll'],
  assistant_manager: ['view_staff', 'view_operations', 'view_payroll'],
  payroll_viewer: ['view_payroll'],
  hr: ['view_staff', 'manage_staff', 'view_payroll', 'view_monitoring', 'create_payroll_period'],
}

const globalRoles: UserRole[] = ['super_admin', 'group_head', 'hr', 'payroll_viewer']

export function getUserPermissions(user: User): UserPermission[] {
  if (user.role === 'super_admin') {
    return [
      'view_staff',
      'manage_staff',
      'view_operations',
      'manage_operations',
      'view_payroll',
      'prepare_payroll',
      'approve_unit_payroll',
      'approve_entity_payroll',
      'approve_group_payroll',
      'create_payroll_period',
      'export_payroll',
      'view_monitoring',
    ]
  }
  return user.permissions ?? rolePermissions[user.role] ?? []
}

export function hasPermission(user: User, permission: UserPermission): boolean {
  return getUserPermissions(user).includes(permission)
}

function getAccessScopes(user: User) {
  if (user.access_scopes !== undefined) return user.access_scopes
  if (globalRoles.includes(user.role)) return []
  if (!user.company_id) return []
  return [{ companyId: user.company_id, unitId: user.unit_id }]
}

function normalizeLocation(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function hasScopedPermission(
  user: User,
  permission: UserPermission,
  companyId: string,
  unitId?: string,
  workLocation?: string
): boolean {
  if (user.role === 'super_admin') return true

  const scopes = getAccessScopes(user)
  if (scopes.length === 0) {
    return globalRoles.includes(user.role) && hasPermission(user, permission)
  }

  return scopes.some((scope) => {
    if (scope.companyId !== '*' && scope.companyId !== companyId) return false
    if (scope.unitId && scope.unitId !== unitId) return false
    if (scope.workLocations?.length) {
      if (!workLocation) return false
      const location = normalizeLocation(workLocation)
      if (!scope.workLocations.some((item) => normalizeLocation(item) === location)) return false
    }

    return scope.permissions
      ? scope.permissions.includes(permission)
      : hasPermission(user, permission)
  })
}

export function canViewStaffMember(viewer: User, staff: User): boolean {
  if (staff.role === 'super_admin' && viewer.role !== 'super_admin') return false
  if (!staff.company_id) return hasPermission(viewer, 'view_staff') && getAccessScopes(viewer).length === 0
  return hasScopedPermission(
    viewer,
    'view_staff',
    staff.company_id,
    staff.unit_id,
    staff.work_location
  )
}

const staffManagementRoles: UserRole[] = [
  'super_admin',
  'group_head',
  'operations_manager',
  'subsidiary_head',
  'company_manager',
  'branch_manager',
  'unit_head',
]

export function canManageStaffMember(viewer: User, staff: User): boolean {
  if (viewer.id === staff.id) return false
  if (staff.role === 'super_admin' && viewer.role !== 'super_admin') return false
  const canManage =
    hasPermission(viewer, 'manage_staff') || staffManagementRoles.includes(viewer.role)
  if (!canManage || !canViewStaffMember(viewer, staff)) return false
  if (viewer.role === 'hr' || viewer.role === 'super_admin') return true
  return USER_ROLE_RANK[viewer.role] > USER_ROLE_RANK[staff.role]
}

export function canViewAllPayroll(user: User): boolean {
  if (!hasPermission(user, 'view_payroll')) return false
  if (globalRoles.includes(user.role)) return true
  return getAccessScopes(user).some(
    (scope) => scope.companyId === '*' && !scope.unitId && !scope.workLocations?.length
  )
}
