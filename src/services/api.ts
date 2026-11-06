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
import {
  ApiResponse,
  MessageFilters,
  StaffFilters,
  MonitoringFilters,
  PublicContactPayload,
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
    list: async (filters?: MessageFilters): Promise<ApiResponse<Message[]>> => {
      if (USE_MOCK) return MockApiService.getMessages(filters)
      const res = await apiClient.get('/messages', { params: filters })
      return res.data
    },
    get: async (id: string) => {
      if (USE_MOCK) return MockApiService.getMessage(id)
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
    update: async (id: string, payload: UpdateStaffPayload): Promise<User> => {
      if (USE_MOCK) return MockApiService.updateStaff(id, payload)
      const res = await apiClient.patch(`/staff/${id}`, payload)
      return res.data.data
    },
    toggleActive: async (id: string): Promise<User> => {
      if (USE_MOCK) return MockApiService.toggleStaffActive(id)
      const res = await apiClient.patch(`/staff/${id}/status`, {})
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
    create: async (payload: { name: string; default_assignee_id?: string; description?: string }): Promise<Category> => {
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
    list: async (): Promise<NotificationItem[]> => {
      if (USE_MOCK) return MockApiService.getNotifications()
      const res = await apiClient.get('/notifications')
      return res.data.data
    },
    markRead: async (id: string): Promise<boolean> => {
      if (USE_MOCK) return MockApiService.markNotificationRead(id)
      await apiClient.patch(`/notifications/${id}/read`)
      return true
    },
    markAllRead: async (): Promise<boolean> => {
      if (USE_MOCK) return MockApiService.markAllNotificationsRead()
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
