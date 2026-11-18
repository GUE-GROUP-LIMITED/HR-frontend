import { User, UserRole } from '@/types'
import { hasScopedPermission, USER_ROLE_RANK } from '@/lib/access'
import { POS_OUTLETS } from '@/services/posData'
import { WORKBOOK_STAFF_DIRECTORY } from '@/services/operationsData'
import { PosOutlet } from '@/types/pos'

const POS_MANAGER_ROLES: UserRole[] = [
  'super_admin',
  'group_head',
  'operations_manager',
  'subsidiary_head',
  'company_manager',
  'unit_head',
  'branch_manager',
  'assistant_manager',
]

const POS_SELLER_TITLE_MARKERS = [
  'cashier',
  'customer care representative',
  'uba moni agent',
  'bvn and nin enrollment officer',
  'farm attendant',
]

function normalize(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  if (normalized === 'askunya' || normalized === 'akukunya') return 'akukunya'
  return normalized
}

function sameOutletAssignment(user: User, outlet: PosOutlet): boolean {
  if (user.company_id !== outlet.companyId) return false
  if (outlet.unitId !== outlet.companyId && user.unit_id !== outlet.unitId) return false
  if (outlet.unitId === outlet.companyId && user.unit_id && user.unit_id !== outlet.unitId) return false
  if (user.work_location) {
    const userLocation = normalize(user.work_location)
    const outletLocation = normalize(outlet.workLocation)
    if (!userLocation.includes(outletLocation) && !outletLocation.includes(userLocation)) return false
  } else if (outlet.workLocation) {
    return false
  }
  return true
}

export function canViewPosSummary(user: User, outlet: PosOutlet): boolean {
  return user.is_active &&
    POS_MANAGER_ROLES.includes(user.role) &&
    hasScopedPermission(
      user,
      'view_staff',
      outlet.companyId,
      outlet.unitId,
      outlet.workLocation
    )
}

function isDesignatedSeller(user: User, outlet: PosOutlet): boolean {
  const title = user.job_title?.trim().toLowerCase() ?? ''
  return user.is_active &&
    sameOutletAssignment(user, outlet) &&
    POS_SELLER_TITLE_MARKERS.some((marker) => title.includes(marker))
}

function activeOutletStaff(outlet: PosOutlet, staff: User[]): User[] {
  return staff.filter((user) =>
    user.is_active && user.role === 'staff' && sameOutletAssignment(user, outlet)
  )
}

function managerScopeSpecificity(user: User, outlet: PosOutlet): number {
  if (user.role === 'super_admin') return -1
  const scopes = user.access_scopes
  if (scopes) {
    const matchingScope = scopes.find((scope) =>
      (scope.companyId === '*' || scope.companyId === outlet.companyId) &&
      (!scope.unitId || scope.unitId === outlet.unitId) &&
      (!scope.workLocations?.length ||
        scope.workLocations.some((location) => normalize(location) === normalize(outlet.workLocation)))
    )
    if (matchingScope) {
      if (matchingScope.workLocations?.length) return 3
      if (matchingScope.unitId) return 2
      return matchingScope.companyId === '*' ? 0 : 1
    }
  }
  if (user.company_id === outlet.companyId) {
    return user.unit_id === outlet.unitId ? 2 : 1
  }
  return 0
}

export function canMakePosSale(
  user: User,
  outlet: PosOutlet,
  staff: User[] = WORKBOOK_STAFF_DIRECTORY
): boolean {
  if (!user.is_active) return false
  if (canViewPosSummary(user, outlet)) return true
  const roster = [...new Map(
    [...staff, ...WORKBOOK_STAFF_DIRECTORY, user].map((person) => [person.id, person])
  ).values()]
  const designatedSellers = roster.filter((person) => isDesignatedSeller(person, outlet))
  if (designatedSellers.length > 0) {
    return designatedSellers.some((seller) => seller.id === user.id)
  }

  const managers = roster.filter((person) => canViewPosSummary(person, outlet))
    .filter((manager) => managerScopeSpecificity(manager, outlet) > 0)
  if (managers.length > 0) {
    const highestSpecificity = Math.max(...managers.map((manager) =>
      managerScopeSpecificity(manager, outlet)
    ))
    const closestManagers = managers.filter((manager) =>
      managerScopeSpecificity(manager, outlet) === highestSpecificity
    )
    const highestRank = Math.max(...closestManagers.map((manager) => USER_ROLE_RANK[manager.role]))
    return closestManagers.some((manager) =>
      manager.id === user.id && USER_ROLE_RANK[manager.role] === highestRank
    )
  }

  const availableStaff = activeOutletStaff(outlet, roster)
  return availableStaff.length === 1 && availableStaff[0].id === user.id
}

function isLogisticsStaff(user: User): boolean {
  return user.department?.toLowerCase().includes('logistics') ?? false
}

function isAssignedToLogisticsOutlet(user: User, outlet: PosOutlet): boolean {
  if (user.company_id !== outlet.companyId && user.company_id !== 'gue-group') return false
  if (!user.work_location) return true
  const userLocation = normalize(user.work_location)
  const outletLocation = normalize(outlet.workLocation)
  return userLocation.includes(outletLocation) || outletLocation.includes(userLocation)
}

export function canAccessLogisticsOutlet(user: User, outlet: PosOutlet): boolean {
  return user.is_active && (
    canViewPosSummary(user, outlet) ||
    (isLogisticsStaff(user) && isAssignedToLogisticsOutlet(user, outlet))
  )
}

export function canFulfillLogisticsOrder(user: User, outlet: PosOutlet): boolean {
  return user.is_active && (
    (isLogisticsStaff(user) && isAssignedToLogisticsOutlet(user, outlet)) ||
    canViewPosSummary(user, outlet)
  )
}

export function canIssueLogisticsReceipt(user: User, outlet: PosOutlet): boolean {
  return user.is_active && (
    canMakePosSale(user, outlet) ||
    (isLogisticsStaff(user) && isAssignedToLogisticsOutlet(user, outlet))
  )
}

export function getLogisticsOutletsForUser(user: User): PosOutlet[] {
  return POS_OUTLETS.filter((outlet) => canAccessLogisticsOutlet(user, outlet))
}

export function canAccessPosOutlet(
  user: User,
  outlet: PosOutlet,
  staff: User[] = WORKBOOK_STAFF_DIRECTORY
): boolean {
  return canViewPosSummary(user, outlet) || canMakePosSale(user, outlet, staff)
}

export function getPosOutletsForUser(
  user: User,
  staff: User[] = WORKBOOK_STAFF_DIRECTORY
): PosOutlet[] {
  return POS_OUTLETS.filter((outlet) => canAccessPosOutlet(user, outlet, staff))
}

export function canViewPosSale(user: User, outlet: PosOutlet, sellerId: string): boolean {
  return canViewPosSummary(user, outlet) ||
    (user.is_active && user.id === sellerId && canMakePosSale(user, outlet))
}
