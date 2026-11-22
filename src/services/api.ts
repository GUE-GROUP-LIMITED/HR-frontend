import axios, { AxiosInstance } from 'axios'
import { MockApiService } from './mockAdapter'
import {
  mapBackendAuditLog,
  mapBackendCategory,
  mapBackendMeDashboard,
  mapBackendMessage,
  mapBackendMessageDetail,
  mapBackendMonitoringOverview,
  mapBackendNotification,
  mapBackendResponse,
  mapBackendStaffPerformance,
  mapBackendUser,
  mapBackendWebsite,
  BackendAuditLog,
  BackendCategory,
  BackendMeDashboard,
  BackendMessage,
  BackendMessageResponse,
  BackendMonitoringOverview,
  BackendNotification,
  BackendStaffPerformance,
  BackendUser,
  BackendWebsite,
} from './backendAdapter'
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

// Mock mode remains available for local development and the demo-only modules that
// are not part of the HR Contact Hub backend contract.
export const USE_MOCK_API =
  import.meta.env.MODE === 'test' || import.meta.env.VITE_USE_MOCK_API !== 'false'
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://hr-backend-emp1.onrender.com/api/v1'

const ACCESS_TOKEN_KEY = 'gue_hr_access_token'
const REFRESH_TOKEN_KEY = 'gue_hr_refresh_token'
const AUTH_USER_KEY = 'gue_hr_auth_user'

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export function getStoredAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function storeAuthSession(session: {
  access_token: string
  refresh_token: string
  user: BackendUser
}) {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token)
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user))
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

export function getStoredAuthUser(): BackendUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    return raw ? (JSON.parse(raw) as BackendUser) : null
  } catch {
    return null
  }
}

function shouldSkipRefresh(url = '') {
  return ['/auth/login', '/auth/refresh', '/auth/logout', '/public/contact'].some((path) =>
    url.includes(path)
  )
}

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) return null
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
      .then((response) => {
        const data = response.data?.data
        if (!data?.access_token) return null
        localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token)
        if (data.refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token)
        if (data.user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user))
        return data.access_token as string
      })
      .catch(() => {
        clearAuthSession()
        return null
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

function normalizeApiError(error: unknown): Error & { code?: string; fields?: Record<string, string>; status?: number } {
  const axiosError = error as {
    message?: string
    response?: {
      status?: number
      data?: { error?: { code?: string; message?: string; fields?: Record<string, string> } }
    }
  }
  const apiError = axiosError.response?.data?.error
  const normalized = new Error(apiError?.message || axiosError.message || 'Request failed') as Error & {
    code?: string
    fields?: Record<string, string>
    status?: number
  }
  normalized.code = apiError?.code
  normalized.fields = apiError?.fields
  normalized.status = axiosError.response?.status
  return normalized
}

// Request interceptor for Bearer JWT token
apiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const config = error.config
    if (status === 401 && config && !config._retry && !shouldSkipRefresh(config.url)) {
      config._retry = true
      const token = await refreshAccessToken()
      if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
        return apiClient(config)
      }
    }
    throw normalizeApiError(error)
  }
)

async function safeBackendCall<T>(promise: Promise<T>): Promise<T | undefined> {
  try {
    return await promise
  } catch {
    return undefined
  }
}

async function getBackendReferences(viewer?: User) {
  const [categories, staff, users, websites] = await Promise.all([
    safeBackendCall(api.categories.list()),
    safeBackendCall(api.staff.list()),
    safeBackendCall(api.users.list()),
    safeBackendCall(api.websites.list()),
  ])

  const staffWithViewer = viewer?.role === 'staff' && !(staff ?? []).some((item) => item.id === viewer.id)
    ? [...(staff ?? []), viewer]
    : staff ?? []
  const usersWithViewer = viewer && viewer.role !== 'staff' && !(users ?? []).some((item) => item.id === viewer.id)
    ? [...(users ?? []), viewer]
    : users ?? []

  return {
    categories: categories ?? [],
    staff: staffWithViewer,
    users: usersWithViewer,
    websites: websites ?? [],
  }
}

function cleanBackendParams<T extends Record<string, unknown>>(params: T) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '' && value !== 'all')
  )
}

async function getBackendMessage(messageId: string) {
  const [detailRes, references] = await Promise.all([
    apiClient.get(`/messages/${messageId}`),
    getBackendReferences(),
  ])
  return mapBackendMessageDetail(detailRes.data.data as BackendMessage, references).message
}

// Unified API Service
export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const res = await apiClient.post('/auth/login', { email, password })
      const session = res.data.data
      storeAuthSession(session)
      return { ...session, user: mapBackendUser(session.user) }
    },
    me: async (): Promise<User> => {
      const res = await apiClient.get('/auth/me')
      return mapBackendUser(res.data.data as BackendUser)
    },
    logout: async () => {
      try {
        await apiClient.post('/auth/logout')
      } finally {
        clearAuthSession()
      }
    },
    forgotPassword: async (email: string) => {
      const res = await apiClient.post('/auth/forgot-password', { email })
      return res.data.data
    },
    resetPassword: async (token: string, newPassword: string) => {
      const res = await apiClient.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      })
      return res.data.data
    },
  },

  // --- Messages ---
  messages: {
    list: async (filters?: MessageFilters, viewer?: User): Promise<ApiResponse<Message[]>> => {
      if (USE_MOCK_API) return MockApiService.getMessages(filters, viewer)
      const { source_type, assigned_to, ...rest } = filters ?? {}
      if (source_type && source_type !== 'public') {
        return {
          data: [],
          meta: { page: filters?.page || 1, limit: filters?.limit || 20, total: 0 },
        }
      }
      const params = cleanBackendParams({
        ...rest,
        assigned_to: assigned_to === 'all' || assigned_to === 'unassigned' ? undefined : assigned_to,
      }) as Record<string, unknown>
      delete params.viewer_id
      const [res, references] = await Promise.all([
        apiClient.get('/messages', { params }),
        getBackendReferences(viewer),
      ])
      let data = (res.data.data as BackendMessage[]).map((message) =>
        mapBackendMessage(message, references)
      )
      if (assigned_to === 'unassigned') {
        data = data.filter((message) => !message.assigned_to)
        return {
          data,
          meta: { ...(res.data.meta || {}), total: data.length },
        }
      }
      return { data, meta: res.data.meta }
    },
    get: async (id: string, viewer?: User) => {
      if (USE_MOCK_API) return MockApiService.getMessage(id, viewer)
      const [res, references] = await Promise.all([
        apiClient.get(`/messages/${id}`),
        getBackendReferences(viewer),
      ])
      return mapBackendMessageDetail(res.data.data as BackendMessage, references)
    },
    assign: async (messageId: string, staffId: string, actor: { id: string; name: string }) => {
      if (USE_MOCK_API) return MockApiService.assignMessage(messageId, staffId, actor)
      await apiClient.patch(`/messages/${messageId}/assign`, { assigned_to: staffId })
      return getBackendMessage(messageId)
    },
    bulkAssign: async (messageIds: string[], staffId: string, actor: { id: string; name: string }) => {
      if (USE_MOCK_API) return MockApiService.bulkAssign(messageIds, staffId, actor)
      const res = await apiClient.post('/messages/bulk-assign', { message_ids: messageIds, assigned_to: staffId })
      return res.data.data?.count ?? messageIds.length
    },
    updateStatus: async (messageId: string, status: MessageStatus, actor: { id: string; name: string }) => {
      if (USE_MOCK_API) return MockApiService.updateStatus(messageId, status, actor)
      await apiClient.patch(`/messages/${messageId}/status`, { status })
      return getBackendMessage(messageId)
    },
    updateCategory: async (messageId: string, categoryId: string, actor: { id: string; name: string }) => {
      if (USE_MOCK_API) return MockApiService.updateMessageCategory(messageId, categoryId, actor)
      await apiClient.patch(`/messages/${messageId}/category`, { category_id: categoryId })
      return getBackendMessage(messageId)
    },
    addNote: async (messageId: string, note: string, author: { id: string; name: string; avatar?: string }) => {
      if (USE_MOCK_API) return MockApiService.addNote(messageId, note, author)
      const res = await apiClient.post(`/messages/${messageId}/notes`, { note })
      return res.data.data
    },
    sendResponse: async (
      messageId: string,
      payload: SendResponsePayload,
      staff: { id: string; name: string; avatar?: string }
    ) => {
      if (USE_MOCK_API) return MockApiService.sendResponse(messageId, payload.body, payload.send_to_sender, staff)
      const res = await apiClient.post(`/messages/${messageId}/responses`, payload)
      return res.data.data
    },
    createInternalRequest: async (
      payload: InternalRequestPayload,
      requester: User
    ): Promise<{ message_id: string; status: string }> => {
      if (USE_MOCK_API) return MockApiService.createInternalRequest(payload, requester)
      throw new Error('Internal requests are not part of the HR Contact Hub API')
    },
    createExternalRequest: async (
      payload: ExternalRequestPayload,
      requester: User
    ): Promise<{ message_id: string; status: string }> => {
      if (USE_MOCK_API) return MockApiService.createExternalRequest(payload, requester)
      throw new Error('External requests are not part of the HR Contact Hub API')
    },
  },

  meetings: {
    list: async (viewer: User): Promise<StaffMeeting[]> => {
      if (USE_MOCK_API) return MockApiService.getMeetings(viewer)
      throw new Error('Meetings are not part of the HR Contact Hub API')
    },
    create: async (payload: CreateMeetingPayload, organizer: User): Promise<MeetingCreateResult> => {
      if (USE_MOCK_API) return MockApiService.createMeeting(payload, organizer)
      throw new Error('Meetings are not part of the HR Contact Hub API')
    },
    respond: async (
      meetingId: string,
      response: MeetingResponse,
      actor: User
    ): Promise<StaffMeeting> => {
      if (USE_MOCK_API) return MockApiService.respondToMeeting(meetingId, response, actor)
      throw new Error('Meetings are not part of the HR Contact Hub API')
    },
  },

  payroll: {
    approveGroup: async (period: PayrollPeriod, actor: User): Promise<PayrollPeriod> => {
      if (USE_MOCK_API) return MockApiService.approveGroupPayroll(period, actor)
      throw new Error('Payroll approval is not part of the HR Contact Hub API')
    },
  },

  recruitment: {
    list: async (actor: User): Promise<RecruitmentData> => {
      if (USE_MOCK_API) return MockApiService.getRecruitmentData(actor)
      const res = await apiClient.get('/recruitment')
      return res.data.data
    },
    createApplication: async (
      payload: CreateCandidateApplicationPayload,
      actor: User
    ): Promise<CandidateApplication> => {
      if (USE_MOCK_API) return MockApiService.createCandidateApplication(payload, actor)
      const res = await apiClient.post('/recruitment/applications', {
        opening_id: payload.openingId,
        candidate_name: payload.candidateName,
        candidate_email: payload.candidateEmail,
      })
      return res.data.data
    },
    moveToScreening: async (id: string, actor: User): Promise<CandidateApplication> => {
      if (USE_MOCK_API) return MockApiService.moveCandidateToScreening(id, actor)
      const res = await apiClient.patch(`/recruitment/applications/${id}/screening`)
      return res.data.data
    },
    scheduleInterview: async (
      id: string,
      payload: { scheduledAt: string; interviewer: string },
      actor: User
    ): Promise<CandidateApplication> => {
      if (USE_MOCK_API) return MockApiService.scheduleCandidateInterview(id, payload, actor)
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
      if (USE_MOCK_API) return MockApiService.recordCandidateInterview(id, payload, actor)
      const res = await apiClient.patch(`/recruitment/applications/${id}/interviews/evaluation`, payload)
      return res.data.data
    },
    issueOffer: async (id: string, actor: User): Promise<CandidateApplication> => {
      if (USE_MOCK_API) return MockApiService.issueCandidateOffer(id, actor)
      const res = await apiClient.post(`/recruitment/applications/${id}/offers`)
      return res.data.data
    },
    rejectApplication: async (
      id: string,
      reason: string,
      actor: User
    ): Promise<CandidateApplication> => {
      if (USE_MOCK_API) return MockApiService.rejectCandidateApplication(id, reason, actor)
      const res = await apiClient.patch(`/recruitment/applications/${id}/rejection`, { reason })
      return res.data.data
    },
    respondToOffer: async (
      id: string,
      response: 'accepted' | 'declined',
      actor: User
    ): Promise<CandidateApplication> => {
      if (USE_MOCK_API) return MockApiService.respondToCandidateOffer(id, response, actor)
      const res = await apiClient.patch(`/recruitment/applications/${id}/offer-response`, { response })
      return res.data.data
    },
    updateOnboardingTask: async (
      id: string,
      taskId: string,
      isComplete: boolean,
      actor: User
    ): Promise<CandidateApplication> => {
      if (USE_MOCK_API) return MockApiService.updateCandidateOnboardingTask(id, taskId, isComplete, actor)
      const res = await apiClient.patch(
        `/recruitment/applications/${id}/onboarding-tasks/${taskId}`,
        { is_complete: isComplete }
      )
      return res.data.data
    },
  },

  pos: {
    dashboard: async (actor: User): Promise<PosDashboardData> => {
      if (USE_MOCK_API) return MockApiService.getPosDashboard(actor)
      const res = await apiClient.get('/pos/dashboard')
      return res.data.data
    },
    createSale: async (
      payload: PosSaleCreatePayload,
      actor: User
    ): Promise<PosSale> => {
      if (USE_MOCK_API) return MockApiService.createPosSale(actor, payload)
      const res = await apiClient.post('/pos/sales', payload)
      return res.data.data
    },
  },

  webOrders: {
    dashboard: async (actor: User): Promise<WebOrdersDashboardData> => {
      if (USE_MOCK_API) return MockApiService.getWebOrdersDashboard(actor)
      const res = await apiClient.get('/web-orders')
      return res.data.data
    },
  },

  logistics: {
    dashboard: async (actor: User): Promise<LogisticsDashboardData> => {
      if (USE_MOCK_API) return MockApiService.getLogisticsDashboard(actor)
      const res = await apiClient.get('/logistics/tasks')
      return res.data.data
    },
    fulfillTask: async (
      taskId: string,
      actor: User
    ): Promise<WebOrder> => {
      if (USE_MOCK_API) return MockApiService.fulfillLogisticsTask(taskId, actor)
      const res = await apiClient.post(`/logistics/tasks/${taskId}/fulfillment`)
      return res.data.data
    },
    issueTaskReceipt: async (
      taskId: string,
      actor: User
    ): Promise<{ order: WebOrder; sale: PosSale }> => {
      if (USE_MOCK_API) return MockApiService.issueLogisticsTaskReceipt(taskId, actor)
      const res = await apiClient.post(`/logistics/tasks/${taskId}/receipt`)
      return res.data.data
    },
  },

  // --- Staff Management & Responder Dashboard ---
  staff: {
    list: async (filters?: StaffFilters): Promise<User[]> => {
      if (USE_MOCK_API) return MockApiService.getStaff(filters)
      const res = await apiClient.get('/staff', { params: cleanBackendParams({ ...(filters ?? {}) }) })
      return (res.data.data as BackendUser[]).map(mapBackendUser)
    },
    create: async (payload: CreateStaffPayload): Promise<User> => {
      if (USE_MOCK_API) return MockApiService.createStaff(payload)
      const res = await apiClient.post('/staff', {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        department: payload.department,
        category_ids: payload.category_ids,
      })
      const created = res.data.data as Partial<BackendUser> & { id: string }
      return mapBackendUser({
        id: created.id,
        name: created.name || payload.name,
        email: created.email || payload.email,
        role: created.role || 'staff',
        department: created.department ?? payload.department,
        phone: created.phone ?? payload.phone,
        is_active: created.is_active ?? true,
        category_ids: created.category_ids ?? payload.category_ids,
        created_at: created.created_at,
      })
    },
    update: async (id: string, payload: UpdateStaffPayload, actor?: User): Promise<User> => {
      if (USE_MOCK_API) return MockApiService.updateStaff(id, payload, actor)
      const body: Record<string, unknown> = {}
      ;(['name', 'email', 'phone', 'department', 'category_ids'] as const).forEach((key) => {
        if (payload[key] !== undefined) body[key] = payload[key]
      })
      if (Object.keys(body).length > 0) {
        await apiClient.patch(`/staff/${id}`, body)
      }
      if (payload.is_active !== undefined) {
        await apiClient.patch(`/staff/${id}/status`, { is_active: payload.is_active })
      }
      const detail = await apiClient.get(`/staff/${id}`)
      return mapBackendUser(detail.data.data as BackendUser)
    },
    transfer: async (
      id: string,
      payload: StaffTransferPayload,
      actor: User
    ): Promise<StaffTransferResult> => {
      if (USE_MOCK_API) return MockApiService.transferStaff(id, payload, actor)
      throw new Error('Staff transfers are not part of the HR Contact Hub API')
    },
    requestTermination: async (id: string, reason: string, actor: User) => {
      if (USE_MOCK_API) return MockApiService.requestStaffTermination(id, reason, actor)
      throw new Error('Termination requests are not part of the HR Contact Hub API')
    },
    listTerminationRequests: async (viewer: User): Promise<StaffTerminationRequest[]> => {
      if (USE_MOCK_API) return MockApiService.getTerminationRequests(viewer)
      return []
    },
    decideTermination: async (
      id: string,
      decision: StaffTerminationDecision,
      actor: User
    ): Promise<StaffTerminationRequest> => {
      if (USE_MOCK_API) return MockApiService.decideStaffTermination(id, decision, actor)
      throw new Error('Termination approvals are not part of the HR Contact Hub API')
    },
    promote: async (
      id: string,
      payload: { new_job_title: string; effective_date: string; reason: string },
      actor: User
    ): Promise<User> => {
      if (USE_MOCK_API) return MockApiService.promoteStaff(id, payload, actor)
      throw new Error('Promotions are not part of the HR Contact Hub API')
    },
    getDashboard: async (staffId: string) => {
      if (USE_MOCK_API) return MockApiService.getStaffDashboard(staffId)
      const [dashboardRes, messagesRes, responsesRes, references] = await Promise.all([
        apiClient.get('/me/dashboard'),
        apiClient.get('/me/messages', { params: { limit: 50 } }),
        apiClient.get('/me/responses', { params: { limit: 20 } }),
        getBackendReferences(),
      ])
      const dashboard = mapBackendMeDashboard(dashboardRes.data.data as BackendMeDashboard)
      return {
        ...dashboard,
        messages: (messagesRes.data.data as BackendMessage[]).map((message) =>
          mapBackendMessage(message, references)
        ),
        responses: (responsesRes.data.data as BackendMessageResponse[]).map((response) =>
          mapBackendResponse(response, references)
        ),
      }
    },
    getPerformance: async (viewer?: User): Promise<StaffPerformanceSummary | undefined> => {
      if (USE_MOCK_API) {
        if (!viewer?.id) return undefined
        const staff = await MockApiService.getMonitoringStaff()
        return staff.find((item) => item.staff_id === viewer.id)
      }
      const res = await apiClient.get('/me/performance')
      const payload = res.data.data as BackendStaffPerformance | BackendStaffPerformance[]
      const item = Array.isArray(payload) ? payload[0] : payload
      if (!item) return undefined
      const references = await getBackendReferences(viewer)
      return mapBackendStaffPerformance(item, references.staff)
    },
  },

  // --- Response Monitoring (HR / Super Admin) ---
  monitoring: {
    getOverview: async (): Promise<DashboardOverviewStats> => {
      if (USE_MOCK_API) return MockApiService.getMonitoringOverview()
      const year = new Date().getFullYear()
      const [res, websites, categories] = await Promise.all([
        apiClient.get('/monitoring/overview', {
          params: { from: `${year}-01-01`, to: `${year}-12-31` },
        }),
        safeBackendCall(api.websites.list()),
        safeBackendCall(api.categories.list()),
      ])
      return mapBackendMonitoringOverview(
        res.data.data as BackendMonitoringOverview,
        websites ?? [],
        categories ?? []
      )
    },
    getStaffList: async (): Promise<StaffPerformanceSummary[]> => {
      if (USE_MOCK_API) return MockApiService.getMonitoringStaff()
      const [res, staff] = await Promise.all([
        apiClient.get('/monitoring/staff'),
        safeBackendCall(api.staff.list()),
      ])
      return (res.data.data as BackendStaffPerformance[]).map((item) =>
        mapBackendStaffPerformance(item, staff ?? [])
      )
    },
    getStaffDetail: async (staffId: string): Promise<StaffPerformanceSummary> => {
      if (USE_MOCK_API) {
        const staff = await MockApiService.getMonitoringStaff()
        const found = staff.find((item) => item.staff_id === staffId)
        if (!found) throw new Error('Staff performance not found')
        return found
      }
      const [res, staff] = await Promise.all([
        apiClient.get(`/monitoring/staff/${staffId}`),
        safeBackendCall(api.staff.list()),
      ])
      const payload = res.data.data as BackendStaffPerformance & {
        performance?: BackendStaffPerformance
      }
      return mapBackendStaffPerformance(payload.performance ?? payload, staff ?? [])
    },
    getResponsesFeed: async (filters?: MonitoringFilters) => {
      if (USE_MOCK_API) return MockApiService.getMonitoringResponses(filters)
      const [res, staff] = await Promise.all([
        apiClient.get('/monitoring/responses', { params: cleanBackendParams({ ...(filters ?? {}) }) }),
        safeBackendCall(api.staff.list()),
      ])
      const references = { staff: staff ?? [], users: staff ?? [] }
      return {
        data: (res.data.data as BackendMessageResponse[]).map((response) =>
          mapBackendResponse(response, references)
        ),
        meta: res.data.meta,
      }
    },
    getOverdue: async (): Promise<Message[]> => {
      if (USE_MOCK_API) return MockApiService.getMonitoringOverdue()
      const [res, references] = await Promise.all([
        apiClient.get('/monitoring/overdue'),
        getBackendReferences(),
      ])
      return (res.data.data as BackendMessage[]).map((message) =>
        mapBackendMessage(message, references)
      )
    },
    sendReminder: async (staffId: string, messageId?: string, note?: string) => {
      if (USE_MOCK_API) return MockApiService.sendStaffReminder(staffId, messageId, note)
      const res = await apiClient.post(`/monitoring/staff/${staffId}/remind`, { message_id: messageId, note })
      return {
        success: true,
        message: 'Reminder queued for the staff member',
        data: res.data.data,
      }
    },
    exportCsv: async (filters?: MonitoringFilters): Promise<Blob> => {
      if (USE_MOCK_API) throw new Error('Monitoring export is only available in backend mode')
      const res = await apiClient.get('/monitoring/export', {
        params: cleanBackendParams({ ...(filters ?? {}) }),
        responseType: 'blob',
      })
      return res.data as Blob
    },
  },

  // --- Websites ---
  websites: {
    list: async (): Promise<Website[]> => {
      if (USE_MOCK_API) return MockApiService.getWebsites()
      const res = await apiClient.get('/websites')
      return (res.data.data as BackendWebsite[]).map(mapBackendWebsite)
    },
    create: async (name: string, domain: string): Promise<Website> => {
      if (USE_MOCK_API) return MockApiService.createWebsite(name, domain)
      const res = await apiClient.post('/websites', { name, domain })
      const created = res.data.data as BackendWebsite & { site_key?: string }
      return { ...mapBackendWebsite({ ...created, domain }), site_key: created.site_key ?? '' }
    },
    rotateKey: async (id: string): Promise<Website> => {
      if (USE_MOCK_API) return MockApiService.rotateSiteKey(id)
      const res = await apiClient.patch(`/websites/${id}`, { rotate_key: true })
      const rotated = res.data.data as BackendWebsite & { site_key?: string }
      return { ...mapBackendWebsite(rotated), site_key: rotated.site_key ?? '' }
    },
  },

  // --- Categories ---
  categories: {
    list: async (): Promise<Category[]> => {
      if (USE_MOCK_API) return MockApiService.getCategories()
      const [res, staff] = await Promise.all([
        apiClient.get('/categories'),
        safeBackendCall(api.staff.list()),
      ])
      return (res.data.data as BackendCategory[]).map((category) => {
        const mapped = mapBackendCategory(category)
        const assignee = staff?.find((item) => item.id === category.default_assignee_id)
        return { ...mapped, default_assignee_name: assignee?.name }
      })
    },
    create: async (payload: {
      name: string
      default_assignee_id?: string
      description?: string
      audience?: Category['audience']
    }): Promise<Category> => {
      if (USE_MOCK_API) return MockApiService.createCategory(payload)
      const res = await apiClient.post('/categories', {
        name: payload.name,
        default_assignee_id: payload.default_assignee_id || null,
      })
      const created = res.data.data as BackendCategory
      const staff = await safeBackendCall(api.staff.list())
      const assignee = staff?.find((item) => item.id === created.default_assignee_id)
      return { ...mapBackendCategory(created), default_assignee_name: assignee?.name }
    },
    update: async (id: string, payload: Partial<Category>): Promise<Category> => {
      if (USE_MOCK_API) return MockApiService.updateCategory(id, payload)
      const body: Record<string, unknown> = {}
      if (payload.name !== undefined) body.name = payload.name
      if (payload.default_assignee_id !== undefined) body.default_assignee_id = payload.default_assignee_id
      const res = await apiClient.patch(`/categories/${id}`, body)
      const updated = res.data.data as BackendCategory
      const staff = await safeBackendCall(api.staff.list())
      const assignee = staff?.find((item) => item.id === updated.default_assignee_id)
      return { ...mapBackendCategory(updated), default_assignee_name: assignee?.name }
    },
    delete: async (id: string): Promise<boolean> => {
      if (USE_MOCK_API) return MockApiService.deleteCategory(id)
      await apiClient.delete(`/categories/${id}`)
      return true
    },
  },

  // --- Super Admin Users ---
  users: {
    list: async (filters?: { role?: string; page?: number; limit?: number }): Promise<User[]> => {
      if (USE_MOCK_API) return MockApiService.getUsers()
      const res = await apiClient.get('/users', { params: cleanBackendParams({ ...(filters ?? {}) }) })
      return (res.data.data as BackendUser[]).map(mapBackendUser)
    },
    create: async (payload: { name: string; email: string; role: User['role'] }): Promise<User> => {
      if (USE_MOCK_API) throw new Error('User creation is only available in backend mode')
      const res = await apiClient.post('/users', payload)
      const created = res.data.data as Partial<BackendUser> & { id: string }
      return mapBackendUser({
        id: created.id,
        name: created.name || payload.name,
        email: created.email || payload.email,
        role: created.role || payload.role,
        is_active: created.is_active ?? true,
        created_at: created.created_at,
      })
    },
    update: async (id: string, payload: { name?: string; role?: User['role'] }): Promise<User> => {
      if (USE_MOCK_API) throw new Error('User updates are only available in backend mode')
      await apiClient.patch(`/users/${id}`, payload)
      const users = await api.users.list()
      return users.find((user) => user.id === id) as User
    },
    setStatus: async (id: string, isActive: boolean): Promise<User> => {
      if (USE_MOCK_API) throw new Error('User status changes are only available in backend mode')
      await apiClient.patch(`/users/${id}/status`, { is_active: isActive })
      const users = await api.users.list()
      return users.find((user) => user.id === id) as User
    },
  },

  // --- Audit Logs ---
  auditLogs: {
    list: async (): Promise<AuditLog[]> => {
      if (USE_MOCK_API) return MockApiService.getAuditLogs()
      const res = await apiClient.get('/audit-logs', { params: { page: 1, limit: 100 } })
      return (res.data.data as BackendAuditLog[]).map(mapBackendAuditLog)
    },
  },

  // --- Notifications ---
  notifications: {
    list: async (viewer?: User): Promise<NotificationItem[]> => {
      if (USE_MOCK_API) return MockApiService.getNotifications(viewer)
      const res = await apiClient.get('/notifications', { params: { page: 1, limit: 100 } })
      return (res.data.data as BackendNotification[]).map(mapBackendNotification)
    },
    markRead: async (id: string, viewer?: User): Promise<boolean> => {
      if (USE_MOCK_API) return MockApiService.markNotificationRead(id, viewer)
      await apiClient.patch(`/notifications/${id}/read`)
      return true
    },
    markAllRead: async (viewer?: User): Promise<boolean> => {
      if (USE_MOCK_API) return MockApiService.markAllNotificationsRead(viewer)
      const notifications = await api.notifications.list(viewer)
      await Promise.all(
        notifications.filter((item) => !item.is_read).map((item) => api.notifications.markRead(item.id, viewer))
      )
      return true
    },
  },

  // --- Public Intake Simulator ---
  publicIntake: {
    submit: async (payload: PublicContactPayload) => {
      if (USE_MOCK_API) return MockApiService.publicContactIntake(payload)
      const res = await apiClient.post(
        '/public/contact',
        { ...payload, website_url: '' },
        {
          headers: {
            'X-Site-Key': payload.website_key,
          },
        }
      )
      const data = res.data.data as { id?: string; message_id?: string; status?: string }
      return {
        message_id: data.message_id || data.id || '',
        status: data.status || 'created',
      }
    },
  },
}
