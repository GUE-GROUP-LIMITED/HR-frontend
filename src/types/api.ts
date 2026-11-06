import { Message, MessageStatus, MessageResponse, MessageNote, MessageEvent, User, Website, Category, AuditLog, StaffPerformanceSummary, DashboardOverviewStats } from './index'

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

export interface CreateStaffPayload {
  name: string
  email: string
  phone?: string
  department: string
  category_ids: string[]
}

export interface UpdateStaffPayload {
  name?: string
  email?: string
  phone?: string
  department?: string
  category_ids?: string[]
  is_active?: boolean
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

