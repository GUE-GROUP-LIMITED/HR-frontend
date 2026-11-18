import { Message, MessageStatus, MessageResponse, MessageNote, MessageEvent, User, Website, Category, AuditLog, StaffPerformanceSummary, DashboardOverviewStats } from './index'
import { MeetingAudience, StaffMeeting, StaffTerminationRequest } from './operations'

export interface ApiResponse<T> {
  data: T
  meta?: {
    page: number
    limit: number
    total: number
    totalPages?: number
  }
}

export interface ApiError {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}

export interface MessageFilters {
  website_id?: string
  source_type?: 'public' | 'internal' | 'external'
  status?: MessageStatus | 'all'
  category_id?: string
  assigned_to?: string
  from?: string
  to?: string
  q?: string
  page?: number
  limit?: number
}

export interface StaffFilters {
  q?: string
  department?: string
  category_id?: string
  is_active?: boolean
}

export interface MonitoringFilters {
  from?: string
  to?: string
  website_id?: string
  staff_id?: string
  page?: number
  limit?: number
}

export interface PublicContactPayload {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  category?: string
  website_key?: string
}

export interface InternalRequestPayload {
  category_id: string
  target_unit_id: string
  assignee_id: string
  subject: string
  message: string
}

export interface ExternalRequestPayload {
  category_id: string
  organization_name: string
  contact_name?: string
  contact_email?: string
  subject: string
  message: string
}

export interface CreateStaffPayload {
  name: string
  email: string
  phone?: string
  department: string
  job_title?: string
  category_ids: string[]
}

export interface UpdateStaffPayload {
  name?: string
  email?: string
  phone?: string
  department?: string
  job_title?: string
  company_id?: string
  unit_id?: string
  work_location?: string
  date_of_birth?: string
  hire_date?: string
  category_ids?: string[]
  is_active?: boolean
}

export interface StaffTransferPayload {
  company_id: string
  unit_id: string
  work_location: string
  department: string
  job_title?: string
  effective_date: string
  reason: string
}

export interface StaffTerminationDecision {
  decision: 'approved' | 'rejected'
  note?: string
}

export interface CreateMeetingPayload {
  kind: 'meeting' | 'event'
  title: string
  description: string
  starts_at: string
  ends_at: string
  location?: string
  audience: MeetingAudience
  invitee_ids?: string[]
  include_branch_managers?: boolean
  higher_invite_reason?: string
}

export type MeetingResponse = 'accepted' | 'declined'

export interface MeetingCreateResult {
  meeting: StaffMeeting
  notified_user_ids: string[]
}

export interface StaffTransferResult {
  staff: User
  email_status: 'sent' | 'simulated'
  letter_text: string
}

export interface SendResponsePayload {
  body: string
  send_to_sender: boolean
}

export interface AddNotePayload {
  note: string
}

export interface BulkAssignPayload {
  message_ids: string[]
  assigned_to: string
}

