import {
  Message,
  MessageResponse,
  MessageNote,
  MessageEvent,
  User,
  Website,
  Category,
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
} from '@/types/api'
import {
  INITIAL_WEBSITES,
  INITIAL_CATEGORIES,
  INITIAL_USERS,
  INITIAL_MESSAGES,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from './mockData'

const STORAGE_KEYS = {
  WEBSITES: 'gue_hr_websites_v1',
  CATEGORIES: 'gue_hr_categories_v1',
  USERS: 'gue_hr_users_v1',
  MESSAGES: 'gue_hr_messages_v1',
  RESPONSES: 'gue_hr_responses_v1',
  NOTES: 'gue_hr_notes_v1',
  EVENTS: 'gue_hr_events_v1',
  AUDIT_LOGS: 'gue_hr_audit_logs_v1',
  NOTIFICATIONS: 'gue_hr_notifications_v1',
}

function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue))
      return defaultValue
    }
    return JSON.parse(raw) as T
  } catch (err) {
    console.error(`Error loading ${key} from localStorage:`, err)
    return defaultValue
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error(`Error saving ${key} to localStorage:`, err)
  }
}

// Initial mock response/notes/events
const INITIAL_RESPONSES: MessageResponse[] = [
  {
    id: 'resp_1',
    message_id: 'msg_102',
    staff_id: 'u3',
    staff_name: 'Chika Nwosu',
    staff_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    body: 'Hello Marcus,\n\nThank you for following up! The technical evaluation panel is currently aggregating feedback. You do not need to provide extra design documents at this stage. We expect to send formal updates by Friday.',
    sent_to_sender: true,
    first_response: true,
    created_at: '2026-11-05T09:40:00Z',
  },
  {
    id: 'resp_2',
    message_id: 'msg_104',
    staff_id: 'u1',
    staff_name: 'Lucas Graham',
    body: 'Dr. St. Claire,\n\nOur sustainability compliance office has compiled the Scope 1 & 2 energy audits for our data center partner clusters. I have attached the cryptographic verification summary.',
    sent_to_sender: true,
    first_response: true,
    created_at: '2026-11-03T11:20:00Z',
  },
  {
    id: 'resp_3',
    message_id: 'msg_106',
    staff_id: 'u5',
    staff_name: 'Alex Chen',
    body: 'Hi Liam,\n\nSharp catch! We have amended the typo in the OpenID Connect reference documentation and pushed the fix to developers.guehq.io/v2/auth-docs. Appreciate your vigilance!',
    sent_to_sender: true,
    first_response: true,
    created_at: '2026-11-05T14:10:00Z',
  },
]

const INITIAL_NOTES: MessageNote[] = [
  {
    id: 'note_1',
    message_id: 'msg_101',
    author_id: 'u2',
    author_name: 'Elena Rostova',
    note: 'High-value enterprise opportunity across 12 West African logistics hubs. Fast-track SLA.',
    created_at: '2026-11-04T19:15:00Z',
  },
  {
    id: 'note_2',
    message_id: 'msg_102',
    author_id: 'u3',
    author_name: 'Chika Nwosu',
    note: 'Candidate scored in 95th percentile on distributed systems bar raiser.',
    created_at: '2026-11-05T09:35:00Z',
  },
  {
    id: 'note_3',
    message_id: 'msg_105',
    author_id: 'u2',
    author_name: 'Elena Rostova',
    note: 'Verify Stripe / UAE banking merchant reconciliation before approving credit note.',
    created_at: '2026-11-04T12:20:00Z',
  },
]

const INITIAL_EVENTS: MessageEvent[] = [
  {
    id: 'evt_1',
    message_id: 'msg_101',
    actor_id: 'public',
    actor_name: 'Website Visitor',
    action: 'created',
    created_at: '2026-11-04T18:30:00Z',
  },
  {
    id: 'evt_2',
    message_id: 'msg_101',
    actor_id: 'u2',
    actor_name: 'Elena Rostova',
    action: 'assigned',
    to_value: 'Chika Nwosu',
    created_at: '2026-11-04T19:10:00Z',
  },
  {
    id: 'evt_3',
    message_id: 'msg_102',
    actor_id: 'u3',
    actor_name: 'Chika Nwosu',
    action: 'responded',
    created_at: '2026-11-05T09:40:00Z',
  },
  {
    id: 'evt_4',
    message_id: 'msg_106',
    actor_id: 'u5',
    actor_name: 'Alex Chen',
    action: 'status_changed',
    from_value: 'in_progress',
    to_value: 'resolved',
    created_at: '2026-11-05T15:00:00Z',
  },
]

const delay = (ms: number = 100) => new Promise((resolve) => setTimeout(resolve, ms))

export class MockApiService {
  // Reset all mock data to factory state
  static resetData(): void {
    localStorage.removeItem(STORAGE_KEYS.WEBSITES)
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES)
    localStorage.removeItem(STORAGE_KEYS.USERS)
    localStorage.removeItem(STORAGE_KEYS.MESSAGES)
    localStorage.removeItem(STORAGE_KEYS.RESPONSES)
    localStorage.removeItem(STORAGE_KEYS.NOTES)
    localStorage.removeItem(STORAGE_KEYS.EVENTS)
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS)
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS)
  }

  // --- Websites ---
  static async getWebsites(): Promise<Website[]> {
    await delay()
    return getFromStorage<Website[]>(STORAGE_KEYS.WEBSITES, INITIAL_WEBSITES)
  }

  static async createWebsite(name: string, domain: string): Promise<Website> {
    await delay()
    const websites = await this.getWebsites()
    const newSite: Website = {
      id: `w_${Date.now()}`,
      name,
      domain,
      site_key: `gk_live_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`,
      is_active: true,
      color: '#10B981',
      badge_color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      created_at: new Date().toISOString(),
    }
    const updated = [...websites, newSite]
    saveToStorage(STORAGE_KEYS.WEBSITES, updated)
    await this.logAudit('u1', 'Lucas Graham', 'super_admin', 'CREATE_WEBSITE', 'Website', newSite.id, { name, domain })
    return newSite
  }

  static async rotateSiteKey(websiteId: string): Promise<Website> {
    await delay()
    const websites = await this.getWebsites()
    const site = websites.find((w) => w.id === websiteId)
    if (!site) throw new Error('Website not found')
    site.site_key = `gk_live_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`
    saveToStorage(STORAGE_KEYS.WEBSITES, websites)
    await this.logAudit('u1', 'Lucas Graham', 'super_admin', 'ROTATED_SITE_KEY', 'Website', site.id, { name: site.name })
    return site
  }

  // --- Categories ---
  static async getCategories(): Promise<Category[]> {
    await delay()
    return getFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES)
  }

  static async createCategory(payload: { name: string; default_assignee_id?: string; description?: string }): Promise<Category> {
    await delay()
    const categories = await this.getCategories()
    const users = await this.getUsers()
    const assignee = users.find((u) => u.id === payload.default_assignee_id)

    const colors = ['#EF4444', '#10B981', '#8B5CF6', '#3B82F6', '#F59E0B', '#EC4899', '#06B6D4']
    const color = colors[categories.length % colors.length]

    const newCat: Category = {
      id: `c_${Date.now()}`,
      name: payload.name,
      slug: payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      color,
      default_assignee_id: payload.default_assignee_id || null,
      default_assignee_name: assignee?.name,
      description: payload.description || '',
    }
    const updated = [...categories, newCat]
    saveToStorage(STORAGE_KEYS.CATEGORIES, updated)
    return newCat
  }

  static async updateCategory(id: string, payload: Partial<Category>): Promise<Category> {
    await delay()
    const categories = await this.getCategories()
    const index = categories.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Category not found')
    
    if (payload.default_assignee_id) {
      const users = await this.getUsers()
      const assignee = users.find((u) => u.id === payload.default_assignee_id)
      payload.default_assignee_name = assignee?.name
    }

    categories[index] = { ...categories[index], ...payload }
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories)
    return categories[index]
  }

  static async deleteCategory(id: string): Promise<boolean> {
    await delay()
    const messages = await this.getAllMessages()
    const inUse = messages.some((m) => m.category_id === id)
    if (inUse) {
      throw new Error('Cannot delete category: it is currently referenced by active messages')
    }
    const categories = await this.getCategories()
    const updated = categories.filter((c) => c.id !== id)
    saveToStorage(STORAGE_KEYS.CATEGORIES, updated)
    return true
  }

  // --- Users / Staff ---
  static async getUsers(): Promise<User[]> {
    await delay()
    return getFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS)
  }

  static async getStaff(filters?: StaffFilters): Promise<User[]> {
    await delay()
    let users = await this.getUsers()
    let staffMembers = users.filter((u) => u.role === 'staff' || u.role === 'hr')

    if (filters?.q) {
      const q = filters.q.toLowerCase()
      staffMembers = staffMembers.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
    }
    if (filters?.department) {
      staffMembers = staffMembers.filter((s) => s.department === filters.department)
    }
    if (filters?.is_active !== undefined) {
      staffMembers = staffMembers.filter((s) => s.is_active === filters.is_active)
    }
    return staffMembers
  }

  static async createStaff(payload: CreateStaffPayload): Promise<User> {
    await delay()
    const users = await this.getUsers()
    const newUser: User = {
      id: `u_${Date.now()}`,
      name: payload.name,
      email: payload.email,
      role: 'staff',
      department: payload.department,
      phone: payload.phone || '',
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      is_active: true,
      categories: payload.category_ids,
      created_at: new Date().toISOString(),
    }
    const updated = [...users, newUser]
    saveToStorage(STORAGE_KEYS.USERS, updated)
    await this.logAudit('u1', 'Lucas Graham', 'super_admin', 'CREATE_STAFF', 'User', newUser.id, { name: newUser.name, email: newUser.email })
    return newUser
  }

  static async updateStaff(id: string, payload: UpdateStaffPayload): Promise<User> {
    await delay()
    const users = await this.getUsers()
    const index = users.findIndex((u) => u.id === id)
    if (index === -1) throw new Error('User not found')
    users[index] = { ...users[index], ...payload }
    saveToStorage(STORAGE_KEYS.USERS, users)
    return users[index]
  }

  static async toggleStaffActive(id: string): Promise<User> {
    await delay()
    const users = await this.getUsers()
    const user = users.find((u) => u.id === id)
    if (!user) throw new Error('User not found')
    user.is_active = !user.is_active
    saveToStorage(STORAGE_KEYS.USERS, users)
    await this.logAudit('u2', 'Elena Rostova', 'hr', 'UPDATE_STAFF_STATUS', 'User', id, { is_active: user.is_active })
    return user
  }

  // --- Messages Core ---
  static async getAllMessages(): Promise<Message[]> {
    return getFromStorage<Message[]>(STORAGE_KEYS.MESSAGES, INITIAL_MESSAGES)
  }

  static async getMessages(filters: MessageFilters = {}): Promise<ApiResponse<Message[]>> {
    await delay()
    let list = await this.getAllMessages()

    if (filters.website_id && filters.website_id !== 'all') {
      list = list.filter((m) => m.website_id === filters.website_id)
    }
    if (filters.status && filters.status !== 'all') {
      list = list.filter((m) => m.status === filters.status)
    }
    if (filters.category_id && filters.category_id !== 'all') {
      list = list.filter((m) => m.category_id === filters.category_id)
    }
    if (filters.assigned_to) {
      if (filters.assigned_to === 'unassigned') {
        list = list.filter((m) => !m.assigned_to)
      } else {
        list = list.filter((m) => m.assigned_to?.id === filters.assigned_to)
      }
    }
    if (filters.q) {
      const q = filters.q.toLowerCase()
      list = list.filter(
        (m) =>
          m.subject.toLowerCase().includes(q) ||
          m.sender_name.toLowerCase().includes(q) ||
          m.sender_email.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q)
      )
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const page = filters.page || 1
    const limit = filters.limit || 20
    const total = list.length
    const startIndex = (page - 1) * limit
    const paginated = list.slice(startIndex, startIndex + limit)

    return {
      data: paginated,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  static async getMessage(id: string): Promise<{
    message: Message
    responses: MessageResponse[]
    notes: MessageNote[]
    events: MessageEvent[]
  }> {
    await delay()
    const messages = await this.getAllMessages()
    const message = messages.find((m) => m.id === id)
    if (!message) throw new Error(`Message with ID ${id} not found`)

    const allResponses = getFromStorage<MessageResponse[]>(STORAGE_KEYS.RESPONSES, INITIAL_RESPONSES)
    const responses = allResponses.filter((r) => r.message_id === id)

    const allNotes = getFromStorage<MessageNote[]>(STORAGE_KEYS.NOTES, INITIAL_NOTES)
    const notes = allNotes.filter((n) => n.message_id === id)

    const allEvents = getFromStorage<MessageEvent[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS)
    const events = allEvents.filter((e) => e.message_id === id)

    return { message, responses, notes, events }
  }

  static async assignMessage(
    messageId: string,
    staffId: string,
    actor: { id: string; name: string }
  ): Promise<Message> {
    await delay()
    const messages = await this.getAllMessages()
    const msg = messages.find((m) => m.id === messageId)
    if (!msg) throw new Error('Message not found')

    const users = await this.getUsers()
    const staff = users.find((u) => u.id === staffId)
    if (!staff) throw new Error('Staff member not found')

    const prevAssignee = msg.assigned_to?.name || 'Unassigned'
    msg.assigned_to = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      avatar: staff.avatar,
    }
    msg.assigned_by = { id: actor.id, name: actor.name }
    if (msg.status === 'new') {
      msg.status = 'assigned'
    }
    msg.updated_at = new Date().toISOString()
    saveToStorage(STORAGE_KEYS.MESSAGES, messages)

    // Add event
    const events = getFromStorage<MessageEvent[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS)
    events.push({
      id: `evt_${Date.now()}`,
      message_id: messageId,
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'assigned',
      from_value: prevAssignee,
      to_value: staff.name,
      created_at: new Date().toISOString(),
    })
    saveToStorage(STORAGE_KEYS.EVENTS, events)

    // Send notification to staff member
    await this.createNotification({
      user_id: staff.id,
      title: 'New Message Assigned to You',
      message: `${actor.name} assigned you: "${msg.subject}" from ${msg.website.name}`,
      type: 'info',
      link: `/inbox?id=${msg.id}`,
    })

    await this.logAudit(actor.id, actor.name, 'hr', 'ASSIGN_MESSAGE', 'Message', messageId, {
      staff_name: staff.name,
      subject: msg.subject,
    })

    return msg
  }

  static async bulkAssign(
    messageIds: string[],
    staffId: string,
    actor: { id: string; name: string }
  ): Promise<number> {
    await delay()
    const messages = await this.getAllMessages()
    const users = await this.getUsers()
    const staff = users.find((u) => u.id === staffId)
    if (!staff) throw new Error('Staff not found')

    let count = 0
    messages.forEach((msg) => {
      if (messageIds.includes(msg.id)) {
        msg.assigned_to = {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          avatar: staff.avatar,
        }
        msg.assigned_by = { id: actor.id, name: actor.name }
        if (msg.status === 'new') msg.status = 'assigned'
        msg.updated_at = new Date().toISOString()
        count++
      }
    })
    saveToStorage(STORAGE_KEYS.MESSAGES, messages)

    await this.createNotification({
      user_id: staff.id,
      title: 'Bulk Messages Assigned',
      message: `${count} messages were bulk-assigned to you by ${actor.name}.`,
      type: 'info',
      link: `/staff-dashboard`,
    })

    return count
  }

  static async updateStatus(
    messageId: string,
    status: MessageStatus,
    actor: { id: string; name: string }
  ): Promise<Message> {
    await delay()
    const messages = await this.getAllMessages()
    const msg = messages.find((m) => m.id === messageId)
    if (!msg) throw new Error('Message not found')

    const prev = msg.status
    msg.status = status
    msg.updated_at = new Date().toISOString()

    if (status === 'resolved' && !msg.resolved_at) {
      msg.resolved_at = new Date().toISOString()
    }
    saveToStorage(STORAGE_KEYS.MESSAGES, messages)

    const events = getFromStorage<MessageEvent[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS)
    events.push({
      id: `evt_${Date.now()}`,
      message_id: messageId,
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'status_changed',
      from_value: prev,
      to_value: status,
      created_at: new Date().toISOString(),
    })
    saveToStorage(STORAGE_KEYS.EVENTS, events)

    await this.logAudit(actor.id, actor.name, 'staff', 'CHANGE_STATUS', 'Message', messageId, {
      from: prev,
      to: status,
    })

    return msg
  }

  static async updateMessageCategory(
    messageId: string,
    categoryId: string,
    actor: { id: string; name: string }
  ): Promise<Message> {
    await delay()
    const messages = await this.getAllMessages()
    const msg = messages.find((m) => m.id === messageId)
    if (!msg) throw new Error('Message not found')

    const categories = await this.getCategories()
    const cat = categories.find((c) => c.id === categoryId)
    if (!cat) throw new Error('Category not found')

    const prev = msg.category.name
    msg.category_id = cat.id
    msg.category = { id: cat.id, name: cat.name, color: cat.color }
    msg.updated_at = new Date().toISOString()
    saveToStorage(STORAGE_KEYS.MESSAGES, messages)

    const events = getFromStorage<MessageEvent[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS)
    events.push({
      id: `evt_${Date.now()}`,
      message_id: messageId,
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'category_changed',
      from_value: prev,
      to_value: cat.name,
      created_at: new Date().toISOString(),
    })
    saveToStorage(STORAGE_KEYS.EVENTS, events)

    return msg
  }

  static async addNote(
    messageId: string,
    note: string,
    author: { id: string; name: string; avatar?: string }
  ): Promise<MessageNote> {
    await delay()
    const notes = getFromStorage<MessageNote[]>(STORAGE_KEYS.NOTES, INITIAL_NOTES)
    const newNote: MessageNote = {
      id: `note_${Date.now()}`,
      message_id: messageId,
      author_id: author.id,
      author_name: author.name,
      author_avatar: author.avatar,
      note,
      created_at: new Date().toISOString(),
    }
    notes.push(newNote)
    saveToStorage(STORAGE_KEYS.NOTES, notes)

    // Update message notes_count
    const messages = await this.getAllMessages()
    const msg = messages.find((m) => m.id === messageId)
    if (msg) {
      msg.notes_count = (msg.notes_count || 0) + 1
      saveToStorage(STORAGE_KEYS.MESSAGES, messages)
    }

    return newNote
  }

  static async sendResponse(
    messageId: string,
    body: string,
    sendToSender: boolean,
    staff: { id: string; name: string; avatar?: string }
  ): Promise<MessageResponse> {
    await delay()
    const allResponses = getFromStorage<MessageResponse[]>(STORAGE_KEYS.RESPONSES, INITIAL_RESPONSES)
    const existing = allResponses.filter((r) => r.message_id === messageId)
    const isFirst = existing.length === 0

    const newResponse: MessageResponse = {
      id: `resp_${Date.now()}`,
      message_id: messageId,
      staff_id: staff.id,
      staff_name: staff.name,
      staff_avatar: staff.avatar,
      body,
      sent_to_sender: sendToSender,
      first_response: isFirst,
      created_at: new Date().toISOString(),
    }
    allResponses.push(newResponse)
    saveToStorage(STORAGE_KEYS.RESPONSES, allResponses)

    // Update message state
    const messages = await this.getAllMessages()
    const msg = messages.find((m) => m.id === messageId)
    if (msg) {
      msg.responses_count = (msg.responses_count || 0) + 1
      if (isFirst) {
        msg.first_response_at = new Date().toISOString()
        msg.is_overdue = false
      }
      if (msg.status === 'assigned') {
        msg.status = 'in_progress'
      }
      msg.updated_at = new Date().toISOString()
      saveToStorage(STORAGE_KEYS.MESSAGES, messages)
    }

    // Add event
    const events = getFromStorage<MessageEvent[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS)
    events.push({
      id: `evt_${Date.now()}`,
      message_id: messageId,
      actor_id: staff.id,
      actor_name: staff.name,
      action: 'responded',
      to_value: sendToSender ? 'Sender emailed' : 'Internal draft saved',
      created_at: new Date().toISOString(),
    })
    saveToStorage(STORAGE_KEYS.EVENTS, events)

    await this.logAudit(staff.id, staff.name, 'staff', 'SEND_RESPONSE', 'Message', messageId, {
      sent_to_sender: sendToSender,
      first_response: isFirst,
    })

    return newResponse
  }

  // --- Public Contact Intake (API 7.1) ---
  static async publicContactIntake(payload: PublicContactPayload): Promise<{ message_id: string; status: string }> {
    await delay(150)
    const websites = await this.getWebsites()
    const site = websites.find((w) => w.site_key === payload.website_key) || websites[0]

    const categories = await this.getCategories()
    let category = categories.find((c) => c.slug === payload.category || c.id === payload.category)
    if (!category) {
      category = categories[0]
    }

    const messages = await this.getAllMessages()
    const users = await this.getUsers()
    const defaultAssignee = category.default_assignee_id
      ? users.find((u) => u.id === category?.default_assignee_id)
      : null

    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      website_id: site.id,
      website: { id: site.id, name: site.name, domain: site.domain, color: site.color },
      sender_name: payload.name,
      sender_email: payload.email,
      sender_phone: payload.phone,
      subject: payload.subject,
      body: payload.message,
      category_id: category.id,
      category: { id: category.id, name: category.name, color: category.color },
      status: defaultAssignee ? 'assigned' : 'new',
      assigned_to: defaultAssignee
        ? { id: defaultAssignee.id, name: defaultAssignee.name, email: defaultAssignee.email, avatar: defaultAssignee.avatar }
        : null,
      assigned_by: defaultAssignee ? { id: 'sys_auto', name: 'Auto-Routing Rule' } : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responses_count: 0,
      notes_count: 0,
      is_overdue: false,
    }

    messages.unshift(newMsg)
    saveToStorage(STORAGE_KEYS.MESSAGES, messages)

    // Log event
    const events = getFromStorage<MessageEvent[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS)
    events.push({
      id: `evt_${Date.now()}`,
      message_id: newMsg.id,
      actor_id: 'public',
      actor_name: payload.name,
      action: 'created',
      created_at: new Date().toISOString(),
    })
    saveToStorage(STORAGE_KEYS.EVENTS, events)

    // Notify HR
    await this.createNotification({
      title: 'New Web Inquiry Arrived',
      message: `Inquiry from ${payload.name} on ${site.name}: "${payload.subject}"`,
      type: 'info',
      link: `/inbox?id=${newMsg.id}`,
    })

    return { message_id: newMsg.id, status: 'created' }
  }

  // --- Staff Dashboard (7.4b) ---
  static async getStaffDashboard(staffId: string) {
    await delay()
    const messages = await this.getAllMessages()
    const myMessages = messages.filter((m) => m.assigned_to?.id === staffId)

    const assigned = myMessages.filter((m) => m.status === 'assigned').length
    const in_progress = myMessages.filter((m) => m.status === 'in_progress').length
    const resolved = myMessages.filter((m) => m.status === 'resolved').length
    const overdue = myMessages.filter((m) => m.is_overdue || (m.status === 'assigned' && !m.responses_count)).length

    const allResponses = getFromStorage<MessageResponse[]>(STORAGE_KEYS.RESPONSES, INITIAL_RESPONSES)
    const myResponses = allResponses.filter((r) => r.staff_id === staffId)

    return {
      summary: {
        assigned,
        in_progress,
        resolved,
        overdue,
        total: myMessages.length,
        avg_response_time_hours: 1.8,
        resolution_rate: myMessages.length ? Math.round((resolved / myMessages.length) * 100) : 100,
      },
      messages: myMessages.slice(0, 10),
      responses: myResponses.slice(0, 8),
    }
  }

  // --- Response Monitoring (7.4c) ---
  static async getMonitoringOverview(): Promise<DashboardOverviewStats> {
    await delay()
    const messages = await this.getAllMessages()
    const websites = await this.getWebsites()
    const categories = await this.getCategories()

    const unassigned = messages.filter((m) => !m.assigned_to).length
    const assigned = messages.filter((m) => m.status === 'assigned').length
    const in_progress = messages.filter((m) => m.status === 'in_progress').length
    const resolved = messages.filter((m) => m.status === 'resolved').length
    const overdue = messages.filter((m) => m.is_overdue).length

    const counts_by_website = websites.map((w) => ({
      website_id: w.id,
      website_name: w.name,
      count: messages.filter((m) => m.website_id === w.id).length,
      color: w.color || '#3B82F6',
    }))

    const counts_by_status = [
      { status: 'new' as MessageStatus, count: messages.filter((m) => m.status === 'new').length, color: '#0EA5E9' },
      { status: 'assigned' as MessageStatus, count: assigned, color: '#F59E0B' },
      { status: 'in_progress' as MessageStatus, count: in_progress, color: '#3B82F6' },
      { status: 'resolved' as MessageStatus, count: resolved, color: '#10B981' },
      { status: 'closed' as MessageStatus, count: messages.filter((m) => m.status === 'closed').length, color: '#64748B' },
      { status: 'spam' as MessageStatus, count: messages.filter((m) => m.status === 'spam').length, color: '#EF4444' },
    ]

    const counts_by_category = categories.map((c) => ({
      category_id: c.id,
      category_name: c.name,
      count: messages.filter((m) => m.category_id === c.id).length,
    }))

    const activity_timeline = [
      { date: 'Nov 01', incoming: 12, resolved: 10 },
      { date: 'Nov 02', incoming: 19, resolved: 15 },
      { date: 'Nov 03', incoming: 24, resolved: 21 },
      { date: 'Nov 04', incoming: 18, resolved: 17 },
      { date: 'Nov 05', incoming: 29, resolved: 25 },
      { date: 'Nov 06', incoming: 14, resolved: 12 },
    ]

    return {
      total_messages: messages.length,
      total_messages_trend: 12.5,
      unassigned_messages: unassigned,
      assigned_messages: assigned,
      in_progress_messages: in_progress,
      resolved_messages: resolved,
      overdue_messages: overdue,
      avg_response_time_hours: 2.1,
      sla_compliance_rate: 94.2,
      counts_by_website,
      counts_by_status,
      counts_by_category,
      activity_timeline,
    }
  }

  static async getMonitoringStaff(): Promise<StaffPerformanceSummary[]> {
    await delay()
    const users = await this.getUsers()
    const staffList = users.filter((u) => u.role === 'staff' || u.role === 'hr')
    const messages = await this.getAllMessages()

    return staffList.map((staff) => {
      const assigned = messages.filter((m) => m.assigned_to?.id === staff.id)
      const open = assigned.filter((m) => m.status !== 'resolved' && m.status !== 'closed')
      const resolved = assigned.filter((m) => m.status === 'resolved')
      const overdue = assigned.filter((m) => m.is_overdue)
      const replied = assigned.filter((m) => (m.responses_count || 0) > 0)

      return {
        staff_id: staff.id,
        staff_name: staff.name,
        staff_email: staff.email,
        department: staff.department || 'Operations',
        avatar: staff.avatar,
        open_count: open.length,
        replied_count: replied.length,
        resolved_count: resolved.length,
        overdue_count: overdue.length,
        avg_first_response_hours: staff.id === 'u3' ? 1.4 : staff.id === 'u4' ? 3.8 : 2.1,
        satisfaction_score: staff.id === 'u3' ? 98 : staff.id === 'u4' ? 88 : 94,
      }
    })
  }

  static async getMonitoringResponses(filters?: MonitoringFilters): Promise<ApiResponse<MessageResponse[]>> {
    await delay()
    let responses = getFromStorage<MessageResponse[]>(STORAGE_KEYS.RESPONSES, INITIAL_RESPONSES)

    if (filters?.staff_id) {
      responses = responses.filter((r) => r.staff_id === filters.staff_id)
    }

    responses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return {
      data: responses,
      meta: {
        page: filters?.page || 1,
        limit: filters?.limit || 20,
        total: responses.length,
      },
    }
  }

  static async getMonitoringOverdue(): Promise<Message[]> {
    await delay()
    const messages = await this.getAllMessages()
    return messages.filter((m) => m.is_overdue && m.status !== 'resolved' && m.status !== 'closed')
  }

  static async sendStaffReminder(
    staffId: string,
    messageId?: string,
    note?: string
  ): Promise<{ success: boolean; message: string }> {
    await delay()
    const users = await this.getUsers()
    const staff = users.find((u) => u.id === staffId)
    if (!staff) throw new Error('Staff member not found')

    await this.createNotification({
      user_id: staff.id,
      title: 'Action Required: Response Reminder',
      message: note || `HR Reminder: You have an urgent pending inquiry requiring action.`,
      type: 'urgent',
      link: messageId ? `/inbox?id=${messageId}` : '/staff-dashboard',
    })

    return { success: true, message: `Reminder successfully dispatched to ${staff.name}` }
  }

  // --- Audit Logs & Notifications ---
  static async getAuditLogs(): Promise<AuditLog[]> {
    await delay()
    const logs = getFromStorage<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS)
    return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  static async logAudit(
    actorId: string,
    actorName: string,
    actorRole: 'super_admin' | 'hr' | 'staff',
    action: string,
    entity: string,
    entityId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const logs = getFromStorage<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS)
    logs.unshift({
      id: `aud_${Date.now()}`,
      actor_id: actorId,
      actor_name: actorName,
      actor_role: actorRole,
      action,
      entity,
      entity_id: entityId,
      metadata,
      created_at: new Date().toISOString(),
    })
    saveToStorage(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 100))
  }

  static async getNotifications(): Promise<NotificationItem[]> {
    await delay()
    const list = getFromStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  static async createNotification(payload: Omit<NotificationItem, 'id' | 'created_at' | 'is_read'>): Promise<NotificationItem> {
    const list = getFromStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
    const item: NotificationItem = {
      ...payload,
      id: `notif_${Date.now()}`,
      is_read: false,
      created_at: new Date().toISOString(),
    }
    list.unshift(item)
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, list)
    return item
  }

  static async markNotificationRead(id: string): Promise<boolean> {
    const list = getFromStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
    const item = list.find((n) => n.id === id)
    if (item) {
      item.is_read = true
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, list)
    }
    return true
  }

  static async markAllNotificationsRead(): Promise<boolean> {
    const list = getFromStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
    list.forEach((n) => (n.is_read = true))
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, list)
    return true
  }
}
