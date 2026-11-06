export type UserRole = 'super_admin' | 'hr' | 'staff'

export type MessageStatus = 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'spam'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department?: string
  phone?: string
  avatar?: string
  is_active: boolean
  categories?: string[] // category ids this staff handles
  created_at: string
}

export interface Website {
  id: string
  name: string
  domain: string
  site_key: string
  is_active: boolean
  color?: string
  badge_color?: string
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  color?: string
  default_assignee_id?: string | null
  default_assignee_name?: string
  description?: string
}

export interface MessageResponse {
  id: string
  message_id: string
  staff_id: string
  staff_name: string
  staff_avatar?: string
  body: string
  sent_to_sender: boolean
  first_response: boolean
  created_at: string
}

export interface MessageNote {
  id: string
  message_id: string
  author_id: string
  author_name: string
  author_avatar?: string
  note: string
  created_at: string
}

export interface MessageEvent {
  id: string
  message_id: string
  actor_id: string
  actor_name: string
  action: 'created' | 'assigned' | 'status_changed' | 'category_changed' | 'responded' | 'noted' | 'reopened'
  from_value?: string
  to_value?: string
  created_at: string
}

export interface Message {
  id: string
  website_id: string
  website: {
    id: string
    name: string
    domain?: string
    color?: string
  }
  sender_name: string
  sender_email: string
  sender_phone?: string
  subject: string
  body: string
  category_id: string
  category: {
    id: string
    name: string
    color?: string
  }
  status: MessageStatus
  assigned_to?: {
    id: string
    name: string
    email?: string
    avatar?: string
  } | null
  assigned_by?: {
    id: string
    name: string
  } | null
  first_response_at?: string | null
  resolved_at?: string | null
  due_date?: string
  created_at: string
  updated_at: string
  responses_count?: number
  notes_count?: number
  is_overdue?: boolean
}

export interface AuditLog {
  id: string
  actor_id: string
  actor_name: string
  actor_role: UserRole
  action: string
  entity: string
  entity_id: string
  metadata?: Record<string, any>
  created_at: string
}

export interface NotificationItem {
  id: string
  user_id?: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'urgent'
  link?: string
  is_read: boolean
  created_at: string
}

export interface StaffPerformanceSummary {
  staff_id: string
  staff_name: string
  staff_email: string
  department: string
  avatar?: string
  open_count: number
  replied_count: number
  resolved_count: number
  overdue_count: number
  avg_first_response_hours: number
  satisfaction_score: number
}

export interface DashboardOverviewStats {
  total_messages: number
  total_messages_trend: number
  unassigned_messages: number
  assigned_messages: number
  in_progress_messages: number
  resolved_messages: number
  overdue_messages: number
  avg_response_time_hours: number
  sla_compliance_rate: number
  counts_by_website: { website_id: string; website_name: string; count: number; color: string }[]
  counts_by_status: { status: MessageStatus; count: number; color: string }[]
  counts_by_category: { category_id: string; category_name: string; count: number }[]
  activity_timeline: { date: string; incoming: number; resolved: number }[]
}
