import {
  AuditLog,
  Category,
  DashboardOverviewStats,
  Message,
  MessageEvent,
  MessageNote,
  MessageResponse,
  MessageStatus,
  NotificationItem,
  StaffPerformanceSummary,
  User,
  UserRole,
  Website,
} from '@/types'

export interface BackendUser {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'hr' | 'staff' | string
  department?: string | null
  phone?: string | null
  is_active?: boolean
  category_ids?: string[]
  workload?: {
    open?: number
    replied?: number
    resolved?: number
    overdue?: number
  }
  created_at?: string
}

export interface BackendWebsite {
  id: string
  name: string
  domain?: string
  is_active?: boolean
  site_key?: string
  created_at?: string
}

export interface BackendCategory {
  id: string
  name: string
  default_assignee_id?: string | null
  description?: string
  is_active?: boolean
  created_at?: string
}

export interface BackendMessageNote {
  id: string
  message_id: string
  author_id: string
  note: string
  created_at: string
}

export interface BackendMessageEvent {
  id: string
  message_id?: string
  actor_id?: string
  actor_name?: string
  action: string
  from_value?: string | null
  to_value?: string | null
  created_at: string
}

export interface BackendMessageResponse {
  id: string
  message_id: string
  staff_id?: string
  author_id?: string
  body: string
  sent_to_sender?: boolean
  email_queued?: boolean
  first_response?: boolean
  created_at: string
}

export interface BackendMessage {
  id: string
  website_id: string
  website?: { id: string; name: string; domain?: string }
  sender_name: string
  sender_email: string
  sender_phone?: string | null
  subject: string
  body: string
  category_id?: string | null
  category?: { id: string; name: string }
  status: MessageStatus
  assigned_to?: string | { id: string; name?: string; email?: string } | null
  assigned_by?: string | { id: string; name?: string } | null
  due_at?: string | null
  first_response_at?: string | null
  first_response_staff_id?: string | null
  resolved_at?: string | null
  created_at: string
  updated_at: string
  notes?: BackendMessageNote[]
  event_history?: BackendMessageEvent[]
  events?: BackendMessageEvent[]
  responses?: BackendMessageResponse[]
  responses_count?: number
  notes_count?: number
  is_overdue?: boolean
}

export interface BackendNotification {
  id: string
  user_id?: string | null
  title: string
  message: string
  type?: NotificationItem['type']
  link?: string | null
  read_at?: string | null
  is_read?: boolean
  created_at: string
}

export interface BackendAuditLog {
  id: string
  actor_id?: string
  actor_name?: string
  actor_role?: string
  action: string
  entity: string
  entity_id: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface BackendStaffPerformance {
  staff_id?: string
  id?: string
  staff?: { id: string; name?: string; email?: string; department?: string }
  name?: string
  staff_name?: string
  email?: string
  staff_email?: string
  department?: string
  open?: number
  open_count?: number
  replied?: number
  replied_count?: number
  resolved?: number
  resolved_count?: number
  overdue?: number
  overdue_count?: number
  average_first_response_hours?: number | null
  avg_first_response_hours?: number | null
  satisfaction_score?: number
  workload?: {
    open?: number
    replied?: number
    resolved?: number
    overdue?: number
  }
}

export interface BackendMonitoringOverview {
  unassigned?: number
  assigned?: number
  awaiting_response?: number
  overdue?: number
  resolved?: number
  by_website?: Record<string, number>
  by_status?: Record<string, number>
  by_category?: Record<string, number>
}

export interface BackendMeDashboard {
  assigned?: number
  in_progress?: number
  resolved?: number
  overdue?: number
  average_first_response_hours?: number | null
}

const FALLBACK_USER_ROLES: UserRole[] = ['super_admin', 'hr', 'staff']

function asUserRole(role: string | undefined): UserRole {
  return FALLBACK_USER_ROLES.includes(role as UserRole) ? (role as UserRole) : 'staff'
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function paletteColor(seed: string) {
  const colors = ['#EF4444', '#10B981', '#8B5CF6', '#3B82F6', '#F59E0B', '#EC4899', '#06B6D4']
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  return colors[hash % colors.length]
}

export function mapBackendUser(user: BackendUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: asUserRole(user.role),
    department: user.department ?? undefined,
    phone: user.phone ?? undefined,
    is_active: user.is_active ?? true,
    categories: user.category_ids ?? [],
    created_at: user.created_at ?? new Date().toISOString(),
  }
}

export function mapBackendWebsite(website: BackendWebsite): Website {
  return {
    id: website.id,
    name: website.name,
    domain: website.domain ?? '',
    site_key: website.site_key ?? '',
    is_active: website.is_active ?? true,
    color: paletteColor(website.id || website.name),
    created_at: website.created_at ?? new Date().toISOString(),
  }
}

export function mapBackendCategory(category: BackendCategory): Category {
  return {
    id: category.id,
    name: category.name,
    slug: slugify(category.name),
    color: paletteColor(category.id || category.name),
    audience: 'public',
    default_assignee_id: category.default_assignee_id ?? null,
    description: category.description,
  }
}

export interface BackendReferenceData {
  categories?: Category[]
  staff?: User[]
  users?: User[]
  websites?: Website[]
}

function findById<T extends { id: string }>(items: T[] | undefined, id?: string | null) {
  return items?.find((item) => item.id === id)
}

function mapAssignedUser(
  value: BackendMessage['assigned_to'],
  references: BackendReferenceData
): Message['assigned_to'] {
  if (!value) return null
  if (typeof value === 'object') {
    const staff = findById(references.staff, value.id) ?? findById(references.users, value.id)
    return {
      id: value.id,
      name: value.name || staff?.name || value.id,
      email: value.email || staff?.email,
      avatar: staff?.avatar,
    }
  }
  const staff = findById(references.staff, value) ?? findById(references.users, value)
  return staff
    ? { id: staff.id, name: staff.name, email: staff.email, avatar: staff.avatar }
    : { id: value, name: value }
}

function mapActor(
  value: BackendMessage['assigned_by'] | string | undefined,
  references: BackendReferenceData
): Message['assigned_by'] {
  if (!value) return null
  const id = typeof value === 'string' ? value : value.id
  const staff = findById(references.staff, id) ?? findById(references.users, id)
  const name = typeof value === 'object' ? value.name : staff?.name
  return { id, name: name || id }
}

function mapPersonName(id: string | undefined, references: BackendReferenceData) {
  if (!id) return id || 'System'
  return findById(references.staff, id)?.name ?? findById(references.users, id)?.name ?? id
}

export function mapBackendResponse(
  response: BackendMessageResponse,
  references: BackendReferenceData = {}
): MessageResponse {
  const staffId = response.staff_id || response.author_id || ''
  const staff = findById(references.staff, staffId) ?? findById(references.users, staffId)
  return {
    id: response.id,
    message_id: response.message_id,
    staff_id: staffId,
    staff_name: staff?.name || staffId,
    staff_avatar: staff?.avatar,
    body: response.body,
    sent_to_sender: response.sent_to_sender || response.email_queued || false,
    first_response: response.first_response ?? false,
    created_at: response.created_at,
  }
}

export function mapBackendNote(
  note: BackendMessageNote,
  references: BackendReferenceData = {}
): MessageNote {
  const author = findById(references.staff, note.author_id) ?? findById(references.users, note.author_id)
  return {
    id: note.id,
    message_id: note.message_id,
    author_id: note.author_id,
    author_name: author?.name || note.author_id,
    author_avatar: author?.avatar,
    note: note.note,
    created_at: note.created_at,
  }
}

const EVENT_ACTIONS = new Set<MessageEvent['action']>([
  'created',
  'assigned',
  'status_changed',
  'category_changed',
  'responded',
  'noted',
  'reopened',
])

export function mapBackendEvent(
  event: BackendMessageEvent,
  references: BackendReferenceData = {}
): MessageEvent {
  const action = EVENT_ACTIONS.has(event.action as MessageEvent['action'])
    ? (event.action as MessageEvent['action'])
    : 'noted'
  return {
    id: event.id,
    message_id: event.message_id || '',
    actor_id: event.actor_id || event.actor_name || 'system',
    actor_name: event.actor_name || mapPersonName(event.actor_id, references),
    action,
    from_value: event.from_value ?? undefined,
    to_value: event.to_value ?? undefined,
    created_at: event.created_at,
  }
}

export function mapBackendMessage(
  message: BackendMessage,
  references: BackendReferenceData = {}
): Message {
  const category = message.category
    ? {
        id: message.category.id,
        name: message.category.name,
        color: findById(references.categories, message.category.id)?.color,
      }
    : findById(references.categories, message.category_id || '')
      ? {
          id: findById(references.categories, message.category_id || '')!.id,
          name: findById(references.categories, message.category_id || '')!.name,
          color: findById(references.categories, message.category_id || '')!.color,
        }
      : {
          id: message.category_id || '',
          name: message.category_id || 'Uncategorized',
        }

  const website = message.website
    ? {
        id: message.website.id,
        name: message.website.name,
        domain: message.website.domain,
        color: findById(references.websites, message.website.id)?.color,
      }
    : {
        id: message.website_id,
        name: message.website_id,
        color: findById(references.websites, message.website_id)?.color,
      }

  const responses = message.responses?.map((item) => mapBackendResponse(item, references))
  const notes = message.notes?.map((item) => mapBackendNote(item, references))
  const events = (message.events || message.event_history || []).map((item) =>
    mapBackendEvent(item, references)
  )
  const resolvedAt = message.resolved_at || (message.status === 'resolved' ? message.updated_at : undefined)
  const isOverdue =
    message.is_overdue ??
    Boolean(
      message.due_at &&
        !message.first_response_at &&
        new Date(message.due_at).getTime() < Date.now() &&
        !['resolved', 'closed', 'spam'].includes(message.status)
    )

  return {
    id: message.id,
    website_id: message.website_id,
    website,
    sender_name: message.sender_name,
    sender_email: message.sender_email,
    sender_phone: message.sender_phone ?? undefined,
    subject: message.subject,
    body: message.body,
    category_id: message.category_id || category.id,
    category,
    source_type: 'public',
    status: message.status,
    assigned_to: mapAssignedUser(message.assigned_to, references),
    assigned_by: mapActor(message.assigned_by, references),
    first_response_at: message.first_response_at ?? null,
    resolved_at: resolvedAt ?? null,
    due_date: message.due_at ?? undefined,
    created_at: message.created_at,
    updated_at: message.updated_at,
    responses_count: message.responses_count ?? responses?.length ?? 0,
    notes_count: message.notes_count ?? notes?.length ?? 0,
    is_overdue: isOverdue,
  }
}

export function mapBackendMessageDetail(
  message: BackendMessage,
  references: BackendReferenceData = {}
) {
  return {
    message: mapBackendMessage(message, references),
    responses: (message.responses || []).map((item) => mapBackendResponse(item, references)),
    notes: (message.notes || []).map((item) => mapBackendNote(item, references)),
    events: (message.events || message.event_history || []).map((item) =>
      mapBackendEvent(item, references)
    ),
  }
}

export function mapBackendStaffPerformance(
  item: BackendStaffPerformance,
  staffDirectory: User[] = []
): StaffPerformanceSummary {
  const staffId = item.staff_id || item.id || item.staff?.id || ''
  const directoryStaff = findById(staffDirectory, staffId)
  return {
    staff_id: staffId,
    staff_name:
      item.staff_name || item.name || item.staff?.name || directoryStaff?.name || staffId,
    staff_email:
      item.staff_email || item.email || item.staff?.email || directoryStaff?.email || '',
    department: item.department || item.staff?.department || directoryStaff?.department || '',
    avatar: directoryStaff?.avatar,
    open_count: item.open_count ?? item.open ?? item.workload?.open ?? 0,
    replied_count: item.replied_count ?? item.replied ?? item.workload?.replied ?? 0,
    resolved_count: item.resolved_count ?? item.resolved ?? item.workload?.resolved ?? 0,
    overdue_count: item.overdue_count ?? item.overdue ?? item.workload?.overdue ?? 0,
    avg_first_response_hours:
      item.avg_first_response_hours ?? item.average_first_response_hours ?? 0,
    satisfaction_score: item.satisfaction_score ?? 0,
  }
}

export function mapBackendNotification(notification: BackendNotification): NotificationItem {
  return {
    id: notification.id,
    user_id: notification.user_id ?? undefined,
    title: notification.title,
    message: notification.message,
    type: notification.type || 'info',
    link: notification.link ?? undefined,
    is_read: notification.is_read ?? Boolean(notification.read_at),
    created_at: notification.created_at,
  }
}

export function mapBackendAuditLog(log: BackendAuditLog): AuditLog {
  return {
    id: log.id,
    actor_id: log.actor_id || 'system',
    actor_name: log.actor_name || log.actor_id || 'System',
    actor_role: asUserRole(log.actor_role),
    action: log.action,
    entity: log.entity,
    entity_id: log.entity_id,
    metadata: log.metadata,
    created_at: log.created_at,
  }
}

export function mapBackendMonitoringOverview(
  overview: BackendMonitoringOverview,
  websites: Website[] = [],
  categories: Category[] = []
): DashboardOverviewStats {
  const byStatus = overview.by_status || {}
  const statusEntries = Object.entries(byStatus)
  const totalFromStatuses = statusEntries.reduce((sum, [, count]) => sum + (count || 0), 0)
  const total =
    totalFromStatuses ||
    (overview.unassigned || 0) +
      (overview.assigned || 0) +
      (overview.awaiting_response || 0) +
      (overview.overdue || 0) +
      (overview.resolved || 0)

  const statusColor = (status: string) => {
    switch (status) {
      case 'new':
        return '#0EA5E9'
      case 'assigned':
        return '#F59E0B'
      case 'in_progress':
        return '#3B82F6'
      case 'resolved':
      case 'closed':
        return '#10B981'
      case 'spam':
        return '#EF4444'
      default:
        return '#64748B'
    }
  }

  return {
    total_messages: total,
    total_messages_trend: 0,
    unassigned_messages: overview.unassigned || byStatus.new || 0,
    assigned_messages: overview.assigned || byStatus.assigned || 0,
    in_progress_messages: byStatus.in_progress || overview.awaiting_response || 0,
    resolved_messages: overview.resolved || byStatus.resolved || 0,
    overdue_messages: overview.overdue || 0,
    avg_response_time_hours: 0,
    sla_compliance_rate: total ? Math.round(((byStatus.resolved || overview.resolved || 0) / total) * 1000) / 10 : 0,
    counts_by_website: Object.entries(overview.by_website || {}).map(([websiteId, count]) => {
      const website = findById(websites, websiteId)
      return {
        website_id: websiteId,
        website_name: website?.name || websiteId,
        count: count || 0,
        color: website?.color || paletteColor(websiteId),
      }
    }),
    counts_by_status: statusEntries.map(([status, count]) => ({
      status: status as MessageStatus,
      count: count || 0,
      color: statusColor(status),
    })),
    counts_by_category: Object.entries(overview.by_category || {}).map(([categoryId, count]) => {
      const category = findById(categories, categoryId)
      return {
        category_id: categoryId,
        category_name: category?.name || categoryId,
        count: count || 0,
      }
    }),
    activity_timeline: [],
  }
}

export function mapBackendMeDashboard(dashboard: BackendMeDashboard) {
  const assigned = dashboard.assigned || 0
  const inProgress = dashboard.in_progress || 0
  const resolved = dashboard.resolved || 0
  const total = assigned + inProgress + resolved
  return {
    summary: {
      assigned,
      in_progress: inProgress,
      resolved,
      overdue: dashboard.overdue || 0,
      total,
      avg_response_time_hours: dashboard.average_first_response_hours ?? 0,
      resolution_rate: total ? Math.round((resolved / total) * 100) : 100,
    },
    messages: [] as Message[],
    responses: [] as MessageResponse[],
  }
}
