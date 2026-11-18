import axios, { AxiosInstance } from 'axios'
import { MockApiService } from './mockAdapter'
import {
  Message,
  Website,
  Category,
  User,
  AuditLog,
  NotificationItem,
  MessageStatus,
  StaffPerformanceSummary,
  DashboardOverviewStats,
} from '@/types'
import { StaffMeeting, StaffTerminationRequest } from '@/types/operations'
import { PayrollPeriod } from '@/types/operations'
import {
  CandidateApplication,
  CreateCandidateApplicationPayload,
  RecruitmentData,
} from '@/types/recruitment'
import {
  PosDashboardData,
  PosSale,
  PosSaleCreatePayload,
} from '@/types/pos'
import { LogisticsDashboardData } from '@/types/logistics'
import { WebOrder, WebOrdersDashboardData } from '@/types/webOrders'
import {
  ApiResponse,
  MessageFilters,
  StaffFilters,
  MonitoringFilters,
  PublicContactPayload,
  InternalRequestPayload,
  ExternalRequestPayload,
  CreateMeetingPayload,
  MeetingCreateResult,
  MeetingResponse,
  StaffTerminationDecision,
  StaffTransferPayload,
  StaffTransferResult,
  CreateStaffPayload,
  UpdateStaffPayload,
  SendResponsePayload,
} from '@/types/api'

// By default, use Mock Adapter so the app runs smoothly with rich demo data and offline capabilities.
// Switch to 'false' in .env (VITE_USE_MOCK_API=false) to target real backend at VITE_API_BASE_URL.
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for Bearer JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('gue_hr_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Unified API Service
export const api = {
  // --- Messages ---
  messages: {
    list: async (filters?: MessageFilters, viewer?: User): Promise<ApiResponse<Message[]>> => {
      if (USE_MOCK) return MockApiService.getMessages(filters, viewer)
      const res = await apiClient.get('/messages', { params: filters })
      return res.data
    },
    get: async (id: string, viewer?: User) => {
      if (USE_MOCK) return MockApiService.getMessage(id, viewer)
      const res = await apiClient.get(`/messages/${id}`)
      return res.data
    },
    assign: async (messageId: string, staffId: string, actor: { id: string; name: string }) => {
      if (USE_MOCK) return MockApiService.assignMessage(messageId, staffId, actor)
      const res = await apiClient.patch(`/messages/${messageId}/assign`, { assigned_to: staffId })
      return res.data
    },
    bulkAssign: async (messageIds: string[], staffId: string, actor: { id: string; name: string }) => {
      if (USE_MOCK) return MockApiService.bulkAssign(messageIds, staffId, actor)
      const res = await apiClient.post('/messages/bulk-assign', { message_ids: messageIds, assigned_to: staffId })
      return res.data
    },
    updateStatus: async (messageId: string, status: MessageStatus, actor: { id: string; name: string }) => {
      if (USE_MOCK) return MockApiService.updateStatus(messageId, status, actor)
      const res = await apiClient.patch(`/messages/${messageId}/status`, { status })
      return res.data
    },
    updateCategory: async (messageId: string, categoryId: string, actor: { id: string; name: string }) => {
      if (USE_MOCK) return MockApiService.updateMessageCategory(messageId, categoryId, actor)
      const res = await apiClient.patch(`/messages/${messageId}/category`, { category_id: categoryId })
      return res.data
    },
    addNote: async (messageId: string, note: string, author: { id: string; name: string; avatar?: string }) => {
      if (USE_MOCK) return MockApiService.addNote(messageId, note, author)
      const res = await apiClient.post(`/messages/${messageId}/notes`, { note })
      return res.data
    },
    sendResponse: async (
      messageId: string,
      payload: SendResponsePayload,
      staff: { id: string; name: string; avatar?: string }
    ) => {
      if (USE_MOCK) return MockApiService.sendResponse(messageId, payload.body, payload.send_to_sender, staff)
      const res = await apiClient.post(`/messages/${messageId}/responses`, payload)
      return res.data
    },
    createInternalRequest: async (
      payload: InternalRequestPayload,
      requester: User
    ): Promise<{ message_id: string; status: string }> => {
      if (USE_MOCK) return MockApiService.createInternalRequest(payload, requester)
      const res = await apiClient.post('/internal-requests', payload)
      return res.data
    },
    createExternalRequest: async (
      payload: ExternalRequestPayload,
      requester: User
    ): Promise<{ message_id: string; status: string }> => {
      if (USE_MOCK) return MockApiService.createExternalRequest(payload, requester)
      const res = await apiClient.post('/external-requests', payload)
      return res.data
    },
  },

  meetings: {
    list: async (viewer: User): Promise<StaffMeeting[]> => {
      if (USE_MOCK) return MockApiService.getMeetings(viewer)
      const res = await apiClient.get('/meetings')
      return res.data.data
    },
    create: async (payload: CreateMeetingPayload, organizer: User): Promise<MeetingCreateResult> => {
      if (USE_MOCK) return MockApiService.createMeeting(payload, organizer)
      const res = await apiClient.post('/meetings', payload)
      return res.data
    },
    respond: async (
      meetingId: string,
      response: MeetingResponse,
      actor: User
    ): Promise<StaffMeeting> => {
      if (USE_MOCK) return MockApiService.respondToMeeting(meetingId, response, actor)
      const res = await apiClient.patch(`/meetings/${meetingId}/response`, { response })
      return res.data
    },
  },

  payroll: {
    approveGroup: async (period: PayrollPeriod, actor: User): Promise<PayrollPeriod> => {
      if (USE_MOCK) return MockApiService.approveGroupPayroll(period, actor)
      const res = await apiClient.post(`/payroll/periods/${period.id}/group-approval`)
      return res.data.data
    },
  },

  recruitment: {
    list: async (actor: User): Promise<RecruitmentData> => {
      if (USE_MOCK) return MockApiService.getRecruitmentData(actor)
      const res = await apiClient.get('/recruitment')
      return res.data.data
    },
    createApplication: async (
      payload: CreateCandidateApplicationPayload,
      actor: User
    ): Promise<CandidateApplication> => {
      if (USE_MOCK) return MockApiService.createCandidateApplication(payload, actor)
      const res = await apiClient.post('/recruitment/applications', {
        opening_id: payload.openingId,
        candidate_name: payload.candidateName,
        candidate_email: payload.candidateEmail,
      })
      return res.data.data
    },
    moveToScreening: async (id: string, actor: User): Promise<CandidateApplication> => {
      if (USE_MOCK) return MockApiService.moveCandidateToScreening(id, actor)
      const res = await apiClient.patch(`/recruitment/applications/${id}/screening`)
      return res.data.data
    },
    scheduleInterview: async (
      id: string,
      payload: { scheduledAt: string; interviewer: string },
      actor: User
    ): Promise<CandidateApplication> => {
      if (USE_MOCK) return MockApiService.scheduleCandidateInterview(id, payload, actor)
      const res = await apiClient.post(`/recruitment/applications/${id}/interviews`, {
        scheduled_at: payload.scheduledAt,
        interviewer: payload.interviewer,
      })
      return res.data.data
    },
    recordInterview: async (
      id: string,
      payload: { rating: number; feedback: string },
      actor: User
    ): Promise<CandidateApplication> => {
      if (USE_MOCK) return MockApiService.recordCandidateInterview(id, payload, actor)
      const res = await apiClient.patch(`/recruitment/applications/${id}/interviews/evaluation`, payload)
      return res.data.data
    },
    issueOffer: async (id: string, actor: User): Promise<CandidateApplication> => {
      if (USE_MOCK) return MockApiService.issueCandidateOffer(id, actor)
      const res = await apiClient.post(`/recruitment/applications/${id}/offers`)
      return res.data.data
    },
    rejectApplication: async (
      id: string,
      reason: string,
      actor: User
    ): Promise<CandidateApplication> => {
      if (USE_MOCK) return MockApiService.rejectCandidateApplication(id, reason, actor)
      const res = await apiClient.patch(`/recruitment/applications/${id}/rejection`, { reason })
      return res.data.data
    },
    respondToOffer: async (
      id: string,
      response: 'accepted' | 'declined',
      actor: User
    ): Promise<CandidateApplication> => {
      if (USE_MOCK) return MockApiService.respondToCandidateOffer(id, response, actor)
      const res = await apiClient.patch(`/recruitment/applications/${id}/offer-response`, { response })
      return res.data.data
    },
    updateOnboardingTask: async (
      id: string,
      taskId: string,
      isComplete: boolean,
      actor: User
    ): Promise<CandidateApplication> => {
      if (USE_MOCK) return MockApiService.updateCandidateOnboardingTask(id, taskId, isComplete, actor)
      const res = await apiClient.patch(
        `/recruitment/applications/${id}/onboarding-tasks/${taskId}`,
        { is_complete: isComplete }
      )
      return res.data.data
    },
  },

  pos: {
    dashboard: async (actor: User): Promise<PosDashboardData> => {
      if (USE_MOCK) return MockApiService.getPosDashboard(actor)
      const res = await apiClient.get('/pos/dashboard')
      return res.data.data
    },
    createSale: async (
      payload: PosSaleCreatePayload,
      actor: User
    ): Promise<PosSale> => {
      if (USE_MOCK) return MockApiService.createPosSale(actor, payload)
      const res = await apiClient.post('/pos/sales', payload)
      return res.data.data
    },
  },

  webOrders: {
    dashboard: async (actor: User): Promise<WebOrdersDashboardData> => {
      if (USE_MOCK) return MockApiService.getWebOrdersDashboard(actor)
      const res = await apiClient.get('/web-orders')
      return res.data.data
    },
  },

  logistics: {
    dashboard: async (actor: User): Promise<LogisticsDashboardData> => {
      if (USE_MOCK) return MockApiService.getLogisticsDashboard(actor)
      const res = await apiClient.get('/logistics/tasks')
      return res.data.data
    },
    fulfillTask: async (
      taskId: string,
      actor: User
    ): Promise<WebOrder> => {
      if (USE_MOCK) return MockApiService.fulfillLogisticsTask(taskId, actor)
      const res = await apiClient.post(`/logistics/tasks/${taskId}/fulfillment`)
      return res.data.data
    },
    issueTaskReceipt: async (
      taskId: string,
      actor: User
    ): Promise<{ order: WebOrder; sale: PosSale }> => {
      if (USE_MOCK) return MockApiService.issueLogisticsTaskReceipt(taskId, actor)
      const res = await apiClient.post(`/logistics/tasks/${taskId}/receipt`)
      return res.data.data
    },
  },

  // --- Staff Management & Responder Dashboard ---
  staff: {
    list: async (filters?: StaffFilters): Promise<User[]> => {
      if (USE_MOCK) return MockApiService.getStaff(filters)
      const res = await apiClient.get('/staff', { params: filters })
      return res.data.data
    },
    create: async (payload: CreateStaffPayload): Promise<User> => {
      if (USE_MOCK) return MockApiService.createStaff(payload)
      const res = await apiClient.post('/staff', payload)
      return res.data.data
    },
    update: async (id: string, payload: UpdateStaffPayload, actor?: User): Promise<User> => {
      if (USE_MOCK) return MockApiService.updateStaff(id, payload, actor)
      const res = await apiClient.patch(`/staff/${id}`, payload)
      return res.data.data
    },
    transfer: async (
      id: string,
      payload: StaffTransferPayload,
      actor: User
    ): Promise<StaffTransferResult> => {
      if (USE_MOCK) return MockApiService.transferStaff(id, payload, actor)
      const res = await apiClient.post(`/staff/${id}/transfer`, payload)
      return res.data
    },
    requestTermination: async (id: string, reason: string, actor: User) => {
      if (USE_MOCK) return MockApiService.requestStaffTermination(id, reason, actor)
      const res = await apiClient.post(`/staff/${id}/termination-requests`, { reason })
      return res.data as StaffTerminationRequest
    },
    listTerminationRequests: async (viewer: User): Promise<StaffTerminationRequest[]> => {
      if (USE_MOCK) return MockApiService.getTerminationRequests(viewer)
      const res = await apiClient.get('/staff-termination-requests')
      return res.data.data
    },
    decideTermination: async (
      id: string,
      decision: StaffTerminationDecision,
      actor: User
    ): Promise<StaffTerminationRequest> => {
      if (USE_MOCK) return MockApiService.decideStaffTermination(id, decision, actor)
      const res = await apiClient.patch(`/staff-termination-requests/${id}/approval`, decision)
      return res.data
    },
    promote: async (
      id: string,
      payload: { new_job_title: string; effective_date: string; reason: string },
      actor: User
    ): Promise<User> => {
      if (USE_MOCK) return MockApiService.promoteStaff(id, payload, actor)
      const res = await apiClient.post(`/staff/${id}/promotions`, payload)
      return res.data.data
    },
    getDashboard: async (staffId: string) => {
      if (USE_MOCK) return MockApiService.getStaffDashboard(staffId)
      const res = await apiClient.get('/me/dashboard')
      return res.data
    },
  },

  // --- Response Monitoring (HR / Super Admin) ---
  monitoring: {
    getOverview: async (): Promise<DashboardOverviewStats> => {
      if (USE_MOCK) return MockApiService.getMonitoringOverview()
      const res = await apiClient.get('/monitoring/overview')
      return res.data.data
    },
    getStaffList: async (): Promise<StaffPerformanceSummary[]> => {
      if (USE_MOCK) return MockApiService.getMonitoringStaff()
      const res = await apiClient.get('/monitoring/staff')
      return res.data.data
    },
    getResponsesFeed: async (filters?: MonitoringFilters) => {
      if (USE_MOCK) return MockApiService.getMonitoringResponses(filters)
      const res = await apiClient.get('/monitoring/responses', { params: filters })
      return res.data
    },
    getOverdue: async (): Promise<Message[]> => {
      if (USE_MOCK) return MockApiService.getMonitoringOverdue()
      const res = await apiClient.get('/monitoring/overdue')
      return res.data.data
    },
    sendReminder: async (staffId: string, messageId?: string, note?: string) => {
      if (USE_MOCK) return MockApiService.sendStaffReminder(staffId, messageId, note)
      const res = await apiClient.post(`/monitoring/staff/${staffId}/remind`, { message_id: messageId, note })
      return res.data
    },
  },

  // --- Websites ---
  websites: {
    list: async (): Promise<Website[]> => {
      if (USE_MOCK) return MockApiService.getWebsites()
      const res = await apiClient.get('/websites')
      return res.data.data
    },
    create: async (name: string, domain: string): Promise<Website> => {
      if (USE_MOCK) return MockApiService.createWebsite(name, domain)
      const res = await apiClient.post('/websites', { name, domain })
      return res.data.data
    },
    rotateKey: async (id: string): Promise<Website> => {
      if (USE_MOCK) return MockApiService.rotateSiteKey(id)
      const res = await apiClient.patch(`/websites/${id}`, { rotate_key: true })
      return res.data.data
    },
  },

  // --- Categories ---
  categories: {
    list: async (): Promise<Category[]> => {
      if (USE_MOCK) return MockApiService.getCategories()
      const res = await apiClient.get('/categories')
      return res.data.data
    },
    create: async (payload: {
      name: string
      default_assignee_id?: string
      description?: string
      audience?: Category['audience']
    }): Promise<Category> => {
      if (USE_MOCK) return MockApiService.createCategory(payload)
      const res = await apiClient.post('/categories', payload)
      return res.data.data
    },
    update: async (id: string, payload: Partial<Category>): Promise<Category> => {
      if (USE_MOCK) return MockApiService.updateCategory(id, payload)
      const res = await apiClient.patch(`/categories/${id}`, payload)
      return res.data.data
    },
    delete: async (id: string): Promise<boolean> => {
      if (USE_MOCK) return MockApiService.deleteCategory(id)
      const res = await apiClient.delete(`/categories/${id}`)
      return res.data.data
    },
  },

  // --- Super Admin Users ---
  users: {
    list: async (): Promise<User[]> => {
      if (USE_MOCK) return MockApiService.getUsers()
      const res = await apiClient.get('/users')
      return res.data.data
    },
  },

  // --- Audit Logs ---
  auditLogs: {
    list: async (): Promise<AuditLog[]> => {
      if (USE_MOCK) return MockApiService.getAuditLogs()
      const res = await apiClient.get('/audit-logs')
      return res.data.data
    },
  },

  // --- Notifications ---
  notifications: {
    list: async (viewer?: User): Promise<NotificationItem[]> => {
      if (USE_MOCK) return MockApiService.getNotifications(viewer)
      const res = await apiClient.get('/notifications')
      return res.data.data
    },
    markRead: async (id: string, viewer?: User): Promise<boolean> => {
      if (USE_MOCK) return MockApiService.markNotificationRead(id, viewer)
      await apiClient.patch(`/notifications/${id}/read`)
      return true
    },
    markAllRead: async (viewer?: User): Promise<boolean> => {
      if (USE_MOCK) return MockApiService.markAllNotificationsRead(viewer)
      await apiClient.post('/notifications/read-all')
      return true
    },
  },

  // --- Public Intake Simulator ---
  publicIntake: {
    submit: async (payload: PublicContactPayload) => {
      if (USE_MOCK) return MockApiService.publicContactIntake(payload)
      const res = await apiClient.post('/public/contact', payload, {
        headers: {
          'X-Site-Key': payload.website_key,
        },
      })
      return res.data
    },
  },
}
