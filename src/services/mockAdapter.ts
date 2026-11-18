import {
  Message,
  MessageResponse,
  MessageNote,
  MessageEvent,
  User,
  Website,
  Category,
  CategoryAudience,
  AuditLog,
  NotificationItem,
  MessageStatus,
  StaffPerformanceSummary,
  DashboardOverviewStats,
  StaffPromotion,
  UserRole,
} from '@/types'
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
  CreateStaffPayload,
  UpdateStaffPayload,
} from '@/types/api'
import {
  MeetingInviteStatus,
  StaffMeeting,
  StaffTerminationRequest,
  StaffTerminationApproval,
} from '@/types/operations'
import {
  INITIAL_WEBSITES,
  INITIAL_CATEGORIES,
  INITIAL_USERS,
  INITIAL_MESSAGES,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from './mockData'
import {
  GROUP_ENTITIES,
  GROUP_HEAD_DEMO_USER,
  GROUP_OFFICE_PAYROLL_APPROVER,
  PAYROLL_ENTRY_DEMO_USERS,
  SUBSIDIARY_HEAD_DEMO_USERS,
  UNIT_HEAD_DEMO_USERS,
  WORKBOOK_STAFF_DIRECTORY,
} from './operationsData'
import {
  canManageStaffMember,
  canViewStaffMember,
  hasScopedPermission,
  USER_ROLE_RANK,
} from '@/lib/access'
import { canApproveGroupPayroll } from '@/lib/payroll'
import { PayrollPeriod } from '@/types/operations'
import {
  CandidateApplication,
  CreateCandidateApplicationPayload,
} from '@/types/recruitment'
import { canManageRecruitment, canIssueOffer, createOnboardingTasks } from '@/lib/recruitment'
import { INITIAL_CANDIDATE_APPLICATIONS, RECRUITMENT_OPENINGS } from './recruitmentData'
import {
  DEMO_POS_CATALOG,
  INITIAL_POS_SALES,
  INITIAL_WEB_ORDERS,
  POS_OUTLETS,
} from './posData'
import {
  PosDashboardData,
  PosPaymentMethod,
  PosSale,
  PosSaleCreatePayload,
} from '@/types/pos'
import { LogisticsDashboardData } from '@/types/logistics'
import { WebOrder, WebOrdersDashboardData } from '@/types/webOrders'
import {
  canAccessPosOutlet,
  canAccessLogisticsOutlet,
  canFulfillLogisticsOrder,
  canIssueLogisticsReceipt,
  canMakePosSale,
  canViewPosSummary,
  canViewPosSale,
  getLogisticsOutletsForUser,
  getPosOutletsForUser,
} from '@/lib/pos'

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
  MEETINGS: 'gue_hr_meetings_v1',
  TERMINATIONS: 'gue_hr_termination_requests_v1',
  CELEBRATIONS: 'gue_hr_celebrations_v1',
  RECRUITMENT: 'gue_hr_recruitment_applications_v1',
  POS_SALES: 'gue_hr_pos_sales_v1',
  WEB_ORDERS: 'gue_hr_logistics_website_orders_v1',
  POS_CATALOG: 'gue_hr_pos_catalog_v1',
}
const CATEGORY_SEED_MIGRATION_KEY = 'gue_hr_category_group_seed_v1'
const MEETING_CREATOR_ROLES: UserRole[] = [
  'super_admin',
  'group_head',
  'operations_manager',
  'subsidiary_head',
  'company_manager',
  'unit_head',
  'branch_manager',
]
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

function getWebOrders(): WebOrder[] {
  const orders = getFromStorage<WebOrder[]>(
    STORAGE_KEYS.WEB_ORDERS,
    structuredClone(INITIAL_WEB_ORDERS)
  )
  const migratedOrders = orders.map((order) => {
    if (order.fulfillmentMode) return order
    const fulfillmentMode: WebOrder['fulfillmentMode'] =
      order.sourceDomain === 'edu.guegroup.com' ? 'instant' : 'requires_logistics'
    return {
      ...order,
      fulfillmentMode,
      status: fulfillmentMode === 'instant' && order.paymentStatus === 'verified'
        ? 'completed'
        : order.status,
    }
  })
  if (orders.some((order) => !order.fulfillmentMode)) {
    saveToStorage(STORAGE_KEYS.WEB_ORDERS, migratedOrders)
  }
  return migratedOrders
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
    body: 'Hi Liam,\n\nSharp catch! We have amended the typo in the OpenID Connect reference documentation and pushed the fix to cyber.guegroup.com/v2/auth-docs. Appreciate your vigilance!',
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
    localStorage.removeItem(CATEGORY_SEED_MIGRATION_KEY)
    localStorage.removeItem(STORAGE_KEYS.USERS)
    localStorage.removeItem(STORAGE_KEYS.MESSAGES)
    localStorage.removeItem(STORAGE_KEYS.RESPONSES)
    localStorage.removeItem(STORAGE_KEYS.NOTES)
    localStorage.removeItem(STORAGE_KEYS.EVENTS)
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS)
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS)
    localStorage.removeItem(STORAGE_KEYS.MEETINGS)
    localStorage.removeItem(STORAGE_KEYS.TERMINATIONS)
    localStorage.removeItem(STORAGE_KEYS.CELEBRATIONS)
    localStorage.removeItem(STORAGE_KEYS.RECRUITMENT)
    localStorage.removeItem(STORAGE_KEYS.POS_SALES)
    localStorage.removeItem(STORAGE_KEYS.WEB_ORDERS)
    localStorage.removeItem(STORAGE_KEYS.POS_CATALOG)
  }

  static async getPosDashboard(actor: User): Promise<PosDashboardData> {
    await delay()
    const roster = [...new Map(
      [...WORKBOOK_STAFF_DIRECTORY, ...(await this.getUsers()), actor]
        .map((person) => [person.id, person])
    ).values()]
    const outlets = POS_OUTLETS.filter((outlet) => canAccessPosOutlet(actor, outlet, roster))
    const outletIds = new Set(outlets.map((outlet) => outlet.id))
    const allSales = getFromStorage<PosSale[]>(
      STORAGE_KEYS.POS_SALES,
      structuredClone(INITIAL_POS_SALES)
    )
    const catalog = getFromStorage(STORAGE_KEYS.POS_CATALOG, structuredClone(DEMO_POS_CATALOG))

    return {
      outlets,
      outletAccess: Object.fromEntries(outlets.map((outlet) => [
        outlet.id,
        {
          canSell: canMakePosSale(actor, outlet, roster),
          canViewSummary: canViewPosSummary(actor, outlet),
        },
      ])),
      catalog: catalog.filter((item: (typeof DEMO_POS_CATALOG)[number]) => outletIds.has(item.outletId)),
      sales: allSales.filter((sale) => {
        const outlet = outlets.find((item) => item.id === sale.outletId)
        return outlet && canViewPosSale(actor, outlet, sale.sellerId)
      }),
      dataMode: 'demo',
    }
  }

  static async createPosSale(
    actor: User,
    payload: PosSaleCreatePayload
  ): Promise<PosSale> {
    await delay()
    return this.createReceipt(actor, payload)
  }

  static async getWebOrdersDashboard(actor: User): Promise<WebOrdersDashboardData> {
    await delay()
    const outlets = getPosOutletsForUser(actor)
    const outletIds = new Set(outlets.map((outlet) => outlet.id))
    return {
      outlets,
      orders: getWebOrders().filter((order) => outletIds.has(order.outletId)),
      dataMode: 'demo',
    }
  }

  static async processDemoPaystackWebhook(
    sourceOrderId: string,
    paymentStatus: 'verified' | 'failed',
    paymentReference: string
  ): Promise<WebOrder> {
    await delay()
    const orders = getWebOrders()
    const order = orders.find((item) => item.sourceOrderId === sourceOrderId)
    if (!order) throw new Error('Website order not found')
    const outlet = POS_OUTLETS.find((item) => item.id === order.outletId)
    if (!outlet || outlet.companyId === 'guemoni' || outlet.websiteDomain !== order.sourceDomain) {
      throw new Error('This website is not eligible for online orders')
    }
    if (order.paymentStatus === 'verified') {
      if (paymentStatus === 'failed') {
        throw new Error('A verified payment cannot be changed to failed')
      }
      return order
    }

    order.paymentStatus = paymentStatus
    order.paymentReference = paymentReference
    order.status = paymentStatus === 'failed'
      ? 'payment_failed'
      : order.fulfillmentMode === 'instant'
        ? 'completed'
        : 'ready_to_fulfill'
    saveToStorage(STORAGE_KEYS.WEB_ORDERS, orders)
    return order
  }

  static async getLogisticsDashboard(actor: User): Promise<LogisticsDashboardData> {
    await delay()
    const outlets = getLogisticsOutletsForUser(actor)
    const outletIds = new Set(outlets.map((outlet) => outlet.id))
    const tasks = getWebOrders().filter((order) =>
      outletIds.has(order.outletId) &&
      order.fulfillmentMode === 'requires_logistics' &&
      order.paymentStatus === 'verified' &&
      ['ready_to_fulfill', 'fulfilled', 'receipt_issued', 'needs_review'].includes(order.status)
    )
    return {
      outlets,
      tasks,
      taskAccess: Object.fromEntries(tasks.map((order) => {
        const outlet = outlets.find((item) => item.id === order.outletId)!
        return [order.id, {
          canFulfill: canFulfillLogisticsOrder(actor, outlet),
          canIssueReceipt: canIssueLogisticsReceipt(actor, outlet),
        }]
      })),
      dataMode: 'demo',
    }
  }

  static async fulfillLogisticsTask(
    taskId: string,
    actor: User
  ): Promise<WebOrder> {
    await delay()
    const orders = getWebOrders()
    const order = orders.find((item) => item.id === taskId)
    if (!order) throw new Error('Logistics task not found')
    if (order.fulfillmentMode !== 'requires_logistics') {
      throw new Error('Instant web orders do not require Logistics fulfillment')
    }
    const outlet = POS_OUTLETS.find((item) => item.id === order.outletId)
    if (!outlet || !canAccessLogisticsOutlet(actor, outlet)) {
      throw new Error('You do not have Logistics access to this outlet')
    }
    if (order.status === 'fulfilled' || order.status === 'receipt_issued') return order
    if (order.paymentStatus !== 'verified') {
      throw new Error('Payment must be verified before an order can be fulfilled')
    }
    if (order.status !== 'ready_to_fulfill') {
      throw new Error('This website order is not ready for fulfillment')
    }
    if (!canFulfillLogisticsOrder(actor, outlet)) {
      throw new Error('You are not authorized to fulfill website orders for this outlet')
    }

    order.status = 'fulfilled'
    order.fulfilledById = actor.id
    order.fulfilledByName = actor.name
    order.fulfilledAt = new Date().toISOString()
    saveToStorage(STORAGE_KEYS.WEB_ORDERS, orders)
    await this.logAudit(
      actor.id,
      actor.name,
      actor.role,
      'FULFILL_LOGISTICS_TASK',
      'LogisticsTask',
      order.id,
      { source_order_id: order.sourceOrderId, outlet_id: outlet.id }
    )
    return order
  }

  static async issueLogisticsTaskReceipt(
    taskId: string,
    actor: User
  ): Promise<{ order: WebOrder; sale: PosSale }> {
    await delay()
    const orders = getWebOrders()
    const order = orders.find((item) => item.id === taskId)
    if (!order) throw new Error('Logistics task not found')
    if (order.fulfillmentMode !== 'requires_logistics') {
      throw new Error('Instant web orders do not receive a Logistics receipt')
    }
    const outlet = POS_OUTLETS.find((item) => item.id === order.outletId)
    if (!outlet || !canAccessLogisticsOutlet(actor, outlet)) {
      throw new Error('You do not have Logistics access to this outlet')
    }
    if (!canIssueLogisticsReceipt(actor, outlet)) {
      throw new Error('You are not authorized to issue receipts for this outlet')
    }
    if (order.status === 'receipt_issued') {
      const existingSale = getFromStorage<PosSale[]>(
        STORAGE_KEYS.POS_SALES,
        structuredClone(INITIAL_POS_SALES)
      ).find((sale) => sale.sourceOrderId === order.sourceOrderId)
      if (!existingSale) throw new Error('The issued receipt is missing from POS sales history')
      return { order, sale: existingSale }
    }
    if (order.paymentStatus !== 'verified' || order.status !== 'fulfilled') {
      throw new Error('Only fulfilled orders with verified payment can receive a receipt')
    }

    const sale = await this.createReceipt(actor, {
      outletId: outlet.id,
      lines: order.lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity })),
      paymentMethod: 'online',
    }, order.sourceOrderId, true, order.total)
    order.status = 'receipt_issued'
    order.receiptId = sale.externalReceiptId
    order.receiptIssuedById = actor.id
    order.receiptIssuedByName = actor.name
    order.receiptIssuedAt = sale.soldAt
    saveToStorage(STORAGE_KEYS.WEB_ORDERS, orders)
    await this.logAudit(
      actor.id,
      actor.name,
      actor.role,
      'ISSUE_LOGISTICS_TASK_RECEIPT',
      'LogisticsTask',
      order.id,
      { source_order_id: order.sourceOrderId, receipt_id: sale.externalReceiptId }
    )
    return { order, sale }
  }

  private static async createReceipt(
    actor: User,
    payload: Omit<PosSaleCreatePayload, 'paymentMethod'> & { paymentMethod: PosPaymentMethod },
    sourceOrderId?: string,
    allowLogisticsIssuer = false,
    expectedTotal?: number
  ): Promise<PosSale> {
    const outlet = POS_OUTLETS.find((item) => item.id === payload.outletId)
    if (!outlet || (
      !canMakePosSale(actor, outlet) &&
      !(allowLogisticsIssuer && canIssueLogisticsReceipt(actor, outlet))
    )) {
      throw new Error('You do not have POS sales access to this outlet')
    }
    if (payload.lines.length === 0) throw new Error('Add at least one item to the sale')
    if ((payload.paymentMethod === 'online') !== Boolean(sourceOrderId)) {
      throw new Error('Online payment is reserved for verified website orders')
    }
    if (new Set(payload.lines.map((line) => line.itemId)).size !== payload.lines.length) {
      throw new Error('A sale can include each catalog item only once')
    }

    const sales = getFromStorage<PosSale[]>(
      STORAGE_KEYS.POS_SALES,
      structuredClone(INITIAL_POS_SALES)
    )
    if (sourceOrderId) {
      const existingSale = sales.find((sale) => sale.sourceOrderId === sourceOrderId)
      if (existingSale) return existingSale
    }

    const catalog = getFromStorage(STORAGE_KEYS.POS_CATALOG, structuredClone(DEMO_POS_CATALOG))
    const lineItems = payload.lines.map((line) => {
      const item = catalog.find((catalogItem: (typeof DEMO_POS_CATALOG)[number]) =>
        catalogItem.id === line.itemId && catalogItem.outletId === outlet.id
      )
      if (!item || item.isAgencyBankingPrincipal) {
        throw new Error('The sale contains an item that is not valid for this outlet')
      }
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        throw new Error('Sale quantities must be positive whole numbers')
      }
      if (item.trackStock && (item.stockOnHand ?? 0) < line.quantity) {
        throw new Error(`Insufficient stock for ${item.name}`)
      }
      return {
        item,
        line: {
          itemId: item.id,
          itemName: item.name,
          quantity: line.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.unitPrice * line.quantity,
        },
      }
    })
    const total = lineItems.reduce((sum, { line }) => sum + line.lineTotal, 0)
    if (!Number.isFinite(total) || total <= 0) throw new Error('Sale total must be greater than zero')
    if (expectedTotal !== undefined && total !== expectedTotal) {
      throw new Error('Website order total does not match the current outlet catalog')
    }

    const sale: PosSale = {
      id: `pos-sale-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      externalReceiptId: `LOY-DEMO-${Date.now()}`,
      outletId: outlet.id,
      sellerId: actor.id,
      sellerName: actor.name,
      channel: sourceOrderId ? 'online' : 'in_person',
      paymentMethod: payload.paymentMethod,
      total,
      currency: 'NGN',
      lines: lineItems.map(({ line }) => line),
      soldAt: new Date().toISOString(),
      source: 'demo',
      sourceOrderId,
    }
    for (const { item, line } of lineItems) {
      if (item.trackStock) item.stockOnHand = (item.stockOnHand ?? 0) - line.quantity
    }
    sales.unshift(sale)
    saveToStorage(STORAGE_KEYS.POS_CATALOG, catalog)
    saveToStorage(STORAGE_KEYS.POS_SALES, sales)
    await this.logAudit(
      actor.id,
      actor.name,
      actor.role,
      sourceOrderId ? 'ISSUE_POS_WEB_ORDER_RECEIPT' : 'CREATE_POS_SALE',
      'PosSale',
      sale.id,
      { outlet_id: outlet.id, receipt_id: sale.externalReceiptId, source_order_id: sourceOrderId }
    )
    return sale
  }

  private static requireRecruitmentAccess(actor: User): void {
    if (!canManageRecruitment(actor)) {
      throw new Error('Recruitment records are available to active HR and Super Admin users only')
    }
  }

  private static async getCandidateApplications(): Promise<CandidateApplication[]> {
    return getFromStorage<CandidateApplication[]>(
      STORAGE_KEYS.RECRUITMENT,
      INITIAL_CANDIDATE_APPLICATIONS
    )
  }

  static async getRecruitmentData(actor: User): Promise<{
    openings: typeof RECRUITMENT_OPENINGS
    applications: CandidateApplication[]
  }> {
    await delay()
    this.requireRecruitmentAccess(actor)
    return {
      openings: RECRUITMENT_OPENINGS,
      applications: (await this.getCandidateApplications()).sort(
        (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
      ),
    }
  }

  static async createCandidateApplication(
    payload: CreateCandidateApplicationPayload,
    actor: User
  ): Promise<CandidateApplication> {
    await delay()
    this.requireRecruitmentAccess(actor)
    const opening = RECRUITMENT_OPENINGS.find((item) => item.id === payload.openingId)
    if (!opening || opening.status !== 'open') throw new Error('Select an open job requisition')
    const candidateName = payload.candidateName.trim()
    const candidateEmail = payload.candidateEmail.trim().toLowerCase()
    if (!candidateName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateEmail)) {
      throw new Error('Enter a candidate name and valid email address')
    }

    const applications = await this.getCandidateApplications()
    if (applications.some(
      (application) =>
        application.openingId === opening.id &&
        application.candidateEmail.toLowerCase() === candidateEmail
    )) {
      throw new Error('This candidate already has an application for the selected opening')
    }

    const application: CandidateApplication = {
      id: `application_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      openingId: opening.id,
      candidateName,
      candidateEmail,
      appliedAt: new Date().toISOString(),
      stage: 'applied',
    }
    applications.unshift(application)
    saveToStorage(STORAGE_KEYS.RECRUITMENT, applications)
    await this.logAudit(
      actor.id,
      actor.name,
      actor.role,
      'CREATE_CANDIDATE_APPLICATION',
      'CandidateApplication',
      application.id,
      { opening_id: opening.id }
    )
    return application
  }

  static async moveCandidateToScreening(
    id: string,
    actor: User
  ): Promise<CandidateApplication> {
    await delay()
    this.requireRecruitmentAccess(actor)
    const applications = await this.getCandidateApplications()
    const application = applications.find((item) => item.id === id)
    if (!application) throw new Error('Candidate application not found')
    if (application.stage !== 'applied') {
      throw new Error('Only new applications can move to screening')
    }
    application.stage = 'screening'
    saveToStorage(STORAGE_KEYS.RECRUITMENT, applications)
    await this.logAudit(actor.id, actor.name, actor.role, 'MOVE_TO_SCREENING', 'CandidateApplication', id)
    return application
  }

  static async scheduleCandidateInterview(
    id: string,
    payload: { scheduledAt: string; interviewer: string },
    actor: User
  ): Promise<CandidateApplication> {
    await delay()
    this.requireRecruitmentAccess(actor)
    const scheduledAt = new Date(payload.scheduledAt)
    const interviewer = payload.interviewer.trim()
    if (!Number.isFinite(scheduledAt.getTime()) || !interviewer) {
      throw new Error('Provide a valid interview date and interviewer')
    }
    const applications = await this.getCandidateApplications()
    const application = applications.find((item) => item.id === id)
    if (!application) throw new Error('Candidate application not found')
    if (application.stage !== 'screening') {
      throw new Error('Only screened applications can be scheduled for interview')
    }
    application.stage = 'interview'
    application.interview = {
      scheduledAt: scheduledAt.toISOString(),
      interviewer,
    }
    saveToStorage(STORAGE_KEYS.RECRUITMENT, applications)
    await this.logAudit(actor.id, actor.name, actor.role, 'SCHEDULE_INTERVIEW', 'CandidateApplication', id)
    return application
  }

  static async recordCandidateInterview(
    id: string,
    payload: { rating: number; feedback: string },
    actor: User
  ): Promise<CandidateApplication> {
    await delay()
    this.requireRecruitmentAccess(actor)
    const feedback = payload.feedback.trim()
    if (!Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5 || !feedback) {
      throw new Error('Record a rating from 1 to 5 and written interview feedback')
    }
    const applications = await this.getCandidateApplications()
    const application = applications.find((item) => item.id === id)
    if (!application) throw new Error('Candidate application not found')
    if (application.stage !== 'interview' || !application.interview) {
      throw new Error('Schedule an interview before recording its evaluation')
    }
    if (application.interview.completedAt) throw new Error('The interview evaluation is already recorded')
    application.interview = {
      ...application.interview,
      completedAt: new Date().toISOString(),
      rating: payload.rating,
      feedback,
    }
    saveToStorage(STORAGE_KEYS.RECRUITMENT, applications)
    await this.logAudit(actor.id, actor.name, actor.role, 'RECORD_INTERVIEW_EVALUATION', 'CandidateApplication', id, {
      rating: payload.rating,
    })
    return application
  }

  static async issueCandidateOffer(id: string, actor: User): Promise<CandidateApplication> {
    await delay()
    this.requireRecruitmentAccess(actor)
    const applications = await this.getCandidateApplications()
    const application = applications.find((item) => item.id === id)
    if (!application) throw new Error('Candidate application not found')
    if (!canIssueOffer(application)) {
      throw new Error('Complete the scheduled interview and evaluation before issuing an offer')
    }
    application.stage = 'offer_pending'
    application.offer = {
      issuedAt: new Date().toISOString(),
      response: 'awaiting_response',
    }
    saveToStorage(STORAGE_KEYS.RECRUITMENT, applications)
    await this.logAudit(actor.id, actor.name, actor.role, 'ISSUE_CANDIDATE_OFFER', 'CandidateApplication', id)
    return application
  }

  static async rejectCandidateApplication(
    id: string,
    reason: string,
    actor: User
  ): Promise<CandidateApplication> {
    await delay()
    this.requireRecruitmentAccess(actor)
    const rejectionReason = reason.trim()
    if (!rejectionReason) throw new Error('Provide a reason before closing an application')
    const applications = await this.getCandidateApplications()
    const application = applications.find((item) => item.id === id)
    if (!application) throw new Error('Candidate application not found')
    if (application.stage === 'hired' || application.stage === 'rejected') {
      throw new Error('This application is already closed')
    }
    if (application.stage === 'offer_pending') {
      throw new Error('Record the candidate response to the pending offer')
    }
    application.stage = 'rejected'
    application.rejectionReason = rejectionReason
    saveToStorage(STORAGE_KEYS.RECRUITMENT, applications)
    await this.logAudit(
      actor.id,
      actor.name,
      actor.role,
      'REJECT_CANDIDATE_APPLICATION',
      'CandidateApplication',
      id
    )
    return application
  }

  static async respondToCandidateOffer(
    id: string,
    response: 'accepted' | 'declined',
    actor: User
  ): Promise<CandidateApplication> {
    await delay()
    this.requireRecruitmentAccess(actor)
    const applications = await this.getCandidateApplications()
    const application = applications.find((item) => item.id === id)
    if (!application) throw new Error('Candidate application not found')
    if (application.stage !== 'offer_pending' || !application.offer) {
      throw new Error('There is no offer awaiting a response for this application')
    }
    application.offer.response = response
    application.offer.respondedAt = new Date().toISOString()
    application.stage = response === 'accepted' ? 'hired' : 'rejected'
    if (response === 'accepted') {
      application.onboarding = {
        startedAt: new Date().toISOString(),
        tasks: createOnboardingTasks(),
      }
    }
    saveToStorage(STORAGE_KEYS.RECRUITMENT, applications)
    await this.logAudit(
      actor.id,
      actor.name,
      actor.role,
      response === 'accepted' ? 'ACCEPT_CANDIDATE_OFFER' : 'DECLINE_CANDIDATE_OFFER',
      'CandidateApplication',
      id
    )
    return application
  }

  static async updateCandidateOnboardingTask(
    id: string,
    taskId: string,
    isComplete: boolean,
    actor: User
  ): Promise<CandidateApplication> {
    await delay()
    this.requireRecruitmentAccess(actor)
    const applications = await this.getCandidateApplications()
    const application = applications.find((item) => item.id === id)
    if (!application) throw new Error('Candidate application not found')
    if (application.stage !== 'hired' || !application.onboarding) {
      throw new Error('Onboarding starts after an offer is accepted')
    }
    const task = application.onboarding.tasks.find((item) => item.id === taskId)
    if (!task) throw new Error('Onboarding task not found')
    task.isComplete = isComplete
    task.completedAt = isComplete ? new Date().toISOString() : undefined
    saveToStorage(STORAGE_KEYS.RECRUITMENT, applications)
    await this.logAudit(
      actor.id,
      actor.name,
      actor.role,
      isComplete ? 'COMPLETE_ONBOARDING_TASK' : 'REOPEN_ONBOARDING_TASK',
      'CandidateApplication',
      id,
      { task_id: taskId }
    )
    return application
  }

  // --- Websites ---
  static async getWebsites(): Promise<Website[]> {
    await delay()
    const storedWebsites = getFromStorage<Website[]>(STORAGE_KEYS.WEBSITES, INITIAL_WEBSITES)
    const websites = storedWebsites.map((site) => {
      const currentSite = INITIAL_WEBSITES.find((initialSite) => initialSite.id === site.id)
      return currentSite ? { ...currentSite, ...site, name: currentSite.name, domain: currentSite.domain } : site
    })
    const existingIds = new Set(websites.map((site) => site.id))
    websites.push(...INITIAL_WEBSITES.filter((site) => !existingIds.has(site.id)))
    if (JSON.stringify(websites) !== JSON.stringify(storedWebsites)) {
      saveToStorage(STORAGE_KEYS.WEBSITES, websites)
    }
    return websites
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
    const categories = getFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES)
    if (localStorage.getItem(CATEGORY_SEED_MIGRATION_KEY) === 'complete') return categories

    const legacyAssigneeMigrations: Record<string, { from: string; to: string }> = {
      c2: { from: 'u1', to: 'workbook-staff-46' },
      c3: { from: 'u3', to: 'workbook-staff-33' },
      c4: { from: 'u5', to: 'workbook-staff-39' },
      c5: { from: 'u4', to: 'workbook-staff-13' },
    }
    const merged = [...categories]
    for (const seed of INITIAL_CATEGORIES) {
      const existingIndex = merged.findIndex((category) => category.id === seed.id)
      if (existingIndex === -1) {
        merged.push(seed)
        continue
      }

      const existing = merged[existingIndex]
      const migration = legacyAssigneeMigrations[seed.id]
      merged[existingIndex] = {
        ...existing,
        audience: existing.audience ?? seed.audience,
        ...(migration && existing.default_assignee_id === migration.from
          ? {
              default_assignee_id: migration.to,
              default_assignee_name: seed.default_assignee_name,
            }
          : {}),
      }
    }

    saveToStorage(STORAGE_KEYS.CATEGORIES, merged)
    try {
      localStorage.setItem(CATEGORY_SEED_MIGRATION_KEY, 'complete')
    } catch (error) {
      console.error(`Error saving ${CATEGORY_SEED_MIGRATION_KEY} to localStorage:`, error)
    }
    return merged
  }

  static async createCategory(payload: {
    name: string
    default_assignee_id?: string
    description?: string
    audience?: CategoryAudience
  }): Promise<Category> {
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
      audience: payload.audience ?? 'both',
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
    const storedUsers = getFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS)
    const seedUsers = [...INITIAL_USERS, ...WORKBOOK_STAFF_DIRECTORY]
    const storedById = new Map(storedUsers.map((user) => [user.id, user]))
    const seededIds = new Set(seedUsers.map((user) => user.id))
    const users = [
      ...seedUsers.map((seed) => {
        const user = storedById.get(seed.id)
        return user
          ? {
              ...seed,
              ...user,
              job_title: user.job_title || seed.job_title,
              company_id: user.company_id || seed.company_id,
            }
          : seed
      }),
      ...storedUsers.filter((user) => !seededIds.has(user.id)),
    ]
    saveToStorage(STORAGE_KEYS.USERS, users)
    return users
  }

  static async getStaff(filters?: StaffFilters): Promise<User[]> {
    await delay()
    let users = await this.getUsers()
    let staffMembers = users.filter((u) => u.role !== 'super_admin')

    if (filters?.q) {
      const q = filters.q.toLowerCase()
      staffMembers = staffMembers.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.job_title?.toLowerCase().includes(q)
      )
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
      job_title: payload.job_title,
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

  static async updateStaff(id: string, payload: UpdateStaffPayload, actor?: User): Promise<User> {
    await delay()
    const users = await this.getUsers()
    const index = users.findIndex((u) => u.id === id)
    if (index === -1) throw new Error('User not found')
    const currentStaff = users[index]
    if (!actor || !canManageStaffMember(actor, currentStaff)) {
      throw new Error('You do not have permission to edit this staff member')
    }
    if (
      payload.company_id !== undefined ||
      payload.unit_id !== undefined ||
      payload.work_location !== undefined
    ) {
      throw new Error('Use the transfer workflow to change staff company, unit, or work location')
    }
    if (payload.is_active !== undefined && payload.is_active !== currentStaff.is_active) {
      throw new Error('Staff access can only be changed through the termination approval workflow')
    }
    if (
      (payload.date_of_birth !== undefined || payload.hire_date !== undefined) &&
      actor.role !== 'hr' &&
      actor.role !== 'super_admin'
    ) {
      throw new Error('Only HR can update date-of-birth and hire-date fields')
    }

    const { category_ids, ...profile } = payload
    const updatedStaff = {
      ...currentStaff,
      ...profile,
      categories: category_ids ?? currentStaff.categories,
    }
    if (!canManageStaffMember(actor, updatedStaff)) {
      throw new Error('The updated staff scope is outside your management authority')
    }
    users[index] = updatedStaff
    saveToStorage(STORAGE_KEYS.USERS, users)
    await this.logAudit(
      actor.id,
      actor.name,
      actor.role,
      'UPDATE_STAFF_PROFILE',
      'User',
      id,
      { updated_fields: Object.keys(profile) }
    )
    return users[index]
  }

  private static async getManagementUsers(): Promise<User[]> {
    const storedUsers = await this.getUsers()
    const demoUsers = [
      ...storedUsers,
      GROUP_HEAD_DEMO_USER,
      GROUP_OFFICE_PAYROLL_APPROVER,
      ...SUBSIDIARY_HEAD_DEMO_USERS,
      ...UNIT_HEAD_DEMO_USERS,
      ...PAYROLL_ENTRY_DEMO_USERS,
    ]
    return [...new Map(demoUsers.map((user) => [user.id, user])).values()]
  }

  private static staffNotificationAudience(
    staff: User,
    users: User[],
    includeTeam = false
  ): User[] {
    const audience = users.filter((user) => {
      if (!user.is_active) return false
      if (user.id === staff.id || canViewStaffMember(user, staff)) return true
      return includeTeam &&
        user.company_id === staff.company_id &&
        (
          (!!staff.unit_id && user.unit_id === staff.unit_id) ||
          (!!staff.work_location &&
            user.work_location?.toLowerCase() === staff.work_location.toLowerCase())
        )
    })
    return [...new Map(audience.map((user) => [user.id, user])).values()]
  }

  private static async notifyStaffAudience(
    staff: User,
    title: string,
    message: string,
    type: NotificationItem['type'] = 'info',
    includeTeam = false,
    additionalStaff: User[] = []
  ): Promise<void> {
    const users = await this.getManagementUsers()
    const recipients = [
      ...this.staffNotificationAudience(staff, users, includeTeam),
      ...additionalStaff.flatMap((person) =>
        this.staffNotificationAudience(person, users, false)
      ),
    ]
    const uniqueRecipients = [...new Map(recipients.map((user) => [user.id, user])).values()]
    await Promise.all(
      uniqueRecipients.map((user) =>
        this.createNotification({
          user_id: user.id,
          title,
          message,
          type,
          link: '/staff-management',
        })
      )
    )
  }

  static async transferStaff(
    id: string,
    payload: StaffTransferPayload,
    actor: User
  ): Promise<{ staff: User; email_status: 'simulated'; letter_text: string }> {
    await delay()
    const users = await this.getUsers()
    const index = users.findIndex((user) => user.id === id)
    if (index < 0) throw new Error('Staff member not found')
    const currentStaff = users[index]
    if (!currentStaff.is_active) throw new Error('Inactive staff cannot be transferred')
    if (!canManageStaffMember(actor, currentStaff)) {
      throw new Error('You do not have permission to transfer this staff member')
    }

    const destination = GROUP_ENTITIES.find(
      (entity) => entity.id === payload.unit_id &&
        entity.type !== 'holding' &&
        entity.status === 'active'
    )
    if (!destination) throw new Error('Select an active destination unit')
    const companyId = destination.type === 'operating_unit'
      ? destination.parentId
      : destination.id
    if (!companyId || companyId !== payload.company_id) {
      throw new Error('The destination unit does not belong to the selected company')
    }
    if (!payload.work_location.trim() || !payload.effective_date || !payload.reason.trim()) {
      throw new Error('Destination, effective date, and transfer reason are required')
    }

    const transferredStaff: User = {
      ...currentStaff,
      company_id: companyId,
      unit_id: destination.id,
      work_location: payload.work_location.trim(),
      department: payload.department.trim() || currentStaff.department,
      job_title: payload.job_title?.trim() || currentStaff.job_title,
    }
    if (!canManageStaffMember(actor, transferredStaff)) {
      throw new Error('The destination is outside your management authority')
    }
    users[index] = transferredStaff
    saveToStorage(STORAGE_KEYS.USERS, users)

    const sourceCompany = GROUP_ENTITIES.find((entity) => entity.id === currentStaff.company_id)
    const letterText = [
      'STAFF TRANSFER LETTER',
      '',
      `Date: ${new Date().toLocaleDateString()}`,
      `Staff member: ${currentStaff.name}`,
      `From: ${sourceCompany?.name || currentStaff.company_id || 'Current unit'} / ${currentStaff.work_location || 'Location not set'}`,
      `To: ${destination.name} / ${transferredStaff.work_location}`,
      `Effective date: ${payload.effective_date}`,
      `Position: ${transferredStaff.job_title || 'No change'}`,
      `Department: ${transferredStaff.department || 'No change'}`,
      '',
      `Reason: ${payload.reason.trim()}`,
      '',
      'This transfer was recorded by the GUE Group staff management system.',
    ].join('\n')
    await this.notifyStaffAudience(
      transferredStaff,
      'Staff transfer recorded',
      `${currentStaff.name} has been transferred to ${destination.name}. A transfer letter email is simulated in this demo.`,
      'info',
      false,
      [currentStaff]
    )
    await this.logAudit(
      actor.id,
      actor.name,
      actor.role,
      'TRANSFER_STAFF',
      'User',
      currentStaff.id,
      { source_company_id: currentStaff.company_id, target_company_id: companyId }
    )

    return { staff: transferredStaff, email_status: 'simulated', letter_text: letterText }
  }

  static async promoteStaff(
    id: string,
    payload: { new_job_title: string; effective_date: string; reason: string },
    actor: User
  ): Promise<User> {
    await delay()
    const users = await this.getUsers()
    const index = users.findIndex((user) => user.id === id)
    if (index < 0) throw new Error('Staff member not found')
    const staff = users[index]
    if (!staff.is_active || !canManageStaffMember(actor, staff)) {
      throw new Error('You do not have permission to record a promotion for this staff member')
    }
    const newJobTitle = payload.new_job_title.trim()
    const reason = payload.reason.trim()
    if (!newJobTitle || !payload.effective_date || !reason) {
      throw new Error('New job title, effective date, and reason are required')
    }

    const promotion: StaffPromotion = {
      id: `promotion_${Date.now()}`,
      previous_job_title: staff.job_title,
      new_job_title: newJobTitle,
      effective_date: payload.effective_date,
      reason,
      recorded_by: actor.id,
    }
    const promotedStaff: User = {
      ...staff,
      job_title: newJobTitle,
      promotion_history: [...(staff.promotion_history ?? []), promotion],
    }
    users[index] = promotedStaff
    saveToStorage(STORAGE_KEYS.USERS, users)
    await this.logAudit(
      actor.id,
      actor.name,
      actor.role,
      'PROMOTE_STAFF',
      'User',
      staff.id,
      { previous_job_title: staff.job_title, new_job_title: newJobTitle }
    )
    await this.notifyStaffAudience(
      promotedStaff,
      'Congratulations on your promotion',
      `${staff.name} has been promoted to ${newJobTitle}, effective ${payload.effective_date}.`,
      'success',
      true
    )
    return promotedStaff
  }

  private static canApproveTermination(
    request: StaffTerminationRequest,
    actor: User,
    step: 'hr' | 'executive'
  ): boolean {
    if (step === 'hr') return actor.role === 'hr' || actor.role === 'super_admin'
    if (actor.role === 'super_admin' || actor.role === 'group_head') return true
    return (
      (actor.role === 'company_manager' || actor.role === 'subsidiary_head') &&
      hasScopedPermission(
        actor,
        'view_staff',
        request.company_id,
        request.unit_id,
        request.work_location
      )
    )
  }

  static async requestStaffTermination(
    id: string,
    reason: string,
    actor: User
  ): Promise<StaffTerminationRequest> {
    await delay()
    const users = await this.getUsers()
    const staff = users.find((user) => user.id === id)
    if (!staff) throw new Error('Staff member not found')
    if (!staff.is_active || staff.role === 'super_admin') {
      throw new Error('Only active non-administrator staff can be considered for termination')
    }
    if (!canManageStaffMember(actor, staff)) {
      throw new Error('You do not have permission to request this termination')
    }
    const trimmedReason = reason.trim()
    if (!trimmedReason) throw new Error('A termination reason is required')

    const requests = getFromStorage<StaffTerminationRequest[]>(
      STORAGE_KEYS.TERMINATIONS,
      []
    )
    if (requests.some((request) =>
      request.staff_id === id &&
      (request.status === 'pending_hr' || request.status === 'pending_executive')
    )) {
      throw new Error('A termination request is already awaiting approval')
    }

    const request: StaffTerminationRequest = {
      id: `termination_${Date.now()}`,
      staff_id: staff.id,
      staff_name: staff.name,
      company_id: staff.company_id || '',
      unit_id: staff.unit_id,
      work_location: staff.work_location,
      reason: trimmedReason,
      requested_by: actor.id,
      requester_name: actor.name,
      status: 'pending_hr',
      approvals: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    requests.unshift(request)
    saveToStorage(STORAGE_KEYS.TERMINATIONS, requests)

    const hrUsers = (await this.getManagementUsers()).filter(
      (user) => user.role === 'hr' || user.role === 'super_admin'
    )
    await Promise.all(
      hrUsers.map((hrUser) =>
        this.createNotification({
          user_id: hrUser.id,
          title: 'Termination request requires HR review',
          message: `${actor.name} submitted a termination request for ${staff.name}.`,
          type: 'warning',
          link: '/staff-management',
        })
      )
    )
    return request
  }

  static async getTerminationRequests(viewer: User): Promise<StaffTerminationRequest[]> {
    await delay()
    const requests = getFromStorage<StaffTerminationRequest[]>(
      STORAGE_KEYS.TERMINATIONS,
      []
    )
    return requests
      .filter((request) =>
        request.requested_by === viewer.id ||
        request.staff_id === viewer.id ||
        this.canApproveTermination(
          request,
          viewer,
          request.status === 'pending_hr' ? 'hr' : 'executive'
        ) ||
        hasScopedPermission(
          viewer,
          'view_staff',
          request.company_id,
          request.unit_id,
          request.work_location
        )
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  static async decideStaffTermination(
    id: string,
    decision: StaffTerminationDecision,
    actor: User
  ): Promise<StaffTerminationRequest> {
    await delay()
    const requests = getFromStorage<StaffTerminationRequest[]>(
      STORAGE_KEYS.TERMINATIONS,
      []
    )
    const index = requests.findIndex((request) => request.id === id)
    if (index < 0) throw new Error('Termination request not found')
    const request = requests[index]
    if (request.status !== 'pending_hr' && request.status !== 'pending_executive') {
      throw new Error('This termination request is no longer awaiting approval')
    }

    const step = request.status === 'pending_hr' ? 'hr' : 'executive'
    if (!this.canApproveTermination(request, actor, step)) {
      throw new Error(`You are not authorized for the ${step} approval stage`)
    }
    if (
      actor.id === request.requested_by ||
      request.approvals.some((approval) => approval.user_id === actor.id)
    ) {
      throw new Error('The requester and previous approvers cannot approve this stage')
    }

    const approval: StaffTerminationApproval = {
      step,
      decision: decision.decision,
      user_id: actor.id,
      user_name: actor.name,
      decided_at: new Date().toISOString(),
      note: decision.note?.trim() || undefined,
    }
    const updatedRequest: StaffTerminationRequest = {
      ...request,
      approvals: [...request.approvals, approval],
      status: decision.decision === 'rejected'
        ? 'rejected'
        : step === 'hr'
          ? 'pending_executive'
          : 'approved',
      updated_at: new Date().toISOString(),
      completed_at: decision.decision === 'rejected' || step === 'executive'
        ? new Date().toISOString()
        : undefined,
    }

    const users = await this.getUsers()
    const staffIndex = users.findIndex((user) => user.id === request.staff_id)
    const staff = staffIndex >= 0 ? users[staffIndex] : undefined
    if (step === 'executive' && decision.decision === 'approved') {
      if (!staff) throw new Error('Staff member for this request no longer exists')
      const letterText = [
        'TERMINATION NOTICE',
        '',
        `Date: ${new Date().toLocaleDateString()}`,
        `Staff member: ${staff.name}`,
        `Company: ${GROUP_ENTITIES.find((entity) => entity.id === staff.company_id)?.name || staff.company_id}`,
        `Effective date: ${new Date().toLocaleDateString()}`,
        '',
        `Reason: ${request.reason}`,
        '',
        'This notice was approved through the GUE Group HR and executive approval workflow.',
      ].join('\n')
      updatedRequest.letter_text = letterText
      updatedRequest.email_status = 'simulated'
      users[staffIndex] = { ...staff, is_active: false, terminated_at: new Date().toISOString() }
      saveToStorage(STORAGE_KEYS.USERS, users)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gue:staff-deactivated', {
          detail: { userId: staff.id },
        }))
      }
      await this.notifyStaffAudience(
        users[staffIndex],
        'Staff termination approved',
        `${staff.name}'s account has been deactivated. The termination letter email is simulated in this demo.`,
        'warning'
      )
      await this.createNotification({
        user_id: staff.id,
        title: 'Employment termination notice',
        message: 'A termination decision has been approved. The email delivery is simulated in this demo.',
        type: 'warning',
        link: '/staff-management',
      })
    } else if (decision.decision === 'rejected' && staff) {
      await this.notifyStaffAudience(
        staff,
        'Termination request declined',
        `The termination request for ${staff.name} was declined at the ${step} review stage.`,
        'info'
      )
    } else if (step === 'hr' && staff) {
      const managers = (await this.getManagementUsers()).filter(
        (user) =>
          (user.role === 'company_manager' || user.role === 'subsidiary_head' || user.role === 'group_head') &&
          user.id !== actor.id &&
          user.id !== request.requested_by &&
          hasScopedPermission(
            user,
            'view_staff',
            request.company_id,
            request.unit_id,
            request.work_location
          )
      )
      await Promise.all(
        managers.map((manager) =>
          this.createNotification({
            user_id: manager.id,
            title: 'Termination request requires executive approval',
            message: `HR reviewed the termination request for ${staff.name}; executive approval is required.`,
            type: 'warning',
            link: '/staff-management',
          })
        )
      )
    }

    requests[index] = updatedRequest
    saveToStorage(STORAGE_KEYS.TERMINATIONS, requests)
    await this.logAudit(
      actor.id,
      actor.name,
      actor.role,
      `TERMINATION_${step.toUpperCase()}_${decision.decision.toUpperCase()}`,
      'User',
      request.staff_id,
      { request_id: request.id }
    )
    return updatedRequest
  }

  // --- Messages Core ---
  static async getAllMessages(): Promise<Message[]> {
    const messages = getFromStorage<Message[]>(STORAGE_KEYS.MESSAGES, INITIAL_MESSAGES)
    const websites = await this.getWebsites()
    const websitesById = new Map(websites.map((website) => [website.id, website]))
    return messages.map((message) => {
      const website = websitesById.get(message.website_id)
      return website
        ? {
            ...message,
            website: {
              id: website.id,
              name: website.name,
              domain: website.domain,
              color: website.color,
            },
          }
        : message
    })
  }

  static async getMessages(
    filters: MessageFilters = {},
    viewer?: User
  ): Promise<ApiResponse<Message[]>> {
    await delay()
    let list = await this.getAllMessages()

    list = list.filter((message) => this.canViewExternalRequest(message, viewer))

    if (filters.website_id && filters.website_id !== 'all') {
      list = list.filter((m) => m.website_id === filters.website_id)
    }
    if (filters.source_type) {
      list = list.filter((message) =>
        (message.source_type ?? 'public') === filters.source_type
      )
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
          m.external_organization?.toLowerCase().includes(q) ||
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

  private static canViewExternalRequest(message: Message, viewer?: User): boolean {
    if (message.source_type !== 'external') return true
    if (!viewer) return false
    if (message.requester_id === viewer.id) return true
    if (!message.source_company_id || !message.source_unit_id) return false

    return hasScopedPermission(
      viewer,
      'view_staff',
      message.source_company_id,
      message.source_unit_id,
      message.source_work_location
    )
  }

  static async getMessage(id: string, viewer?: User): Promise<{
    message: Message
    responses: MessageResponse[]
    notes: MessageNote[]
    events: MessageEvent[]
  }> {
    await delay()
    const messages = await this.getAllMessages()
    const message = messages.find((m) => m.id === id)
    if (!message) throw new Error(`Message with ID ${id} not found`)
    if (message.source_type === 'external') {
      if (!this.canViewExternalRequest(message, viewer)) {
        throw new Error(`Message with ID ${id} not found`)
      }
    }

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
    const publicCategories = categories.filter((category) => category.audience !== 'internal')
    const category = publicCategories.find(
      (item) => item.slug === payload.category || item.id === payload.category
    ) ?? publicCategories[0]
    if (!category) throw new Error('No public contact categories are available')

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
      source_type: 'public',
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

  static async createInternalRequest(
    payload: InternalRequestPayload,
    requester: User
  ): Promise<{ message_id: string; status: string }> {
    await delay(150)
    const [categories, users] = await Promise.all([this.getCategories(), this.getUsers()])
    const category = categories.find((item) => item.id === payload.category_id)
    if (!category) throw new Error('Request category not found')
    if (category.audience === 'public') {
      throw new Error('This category is not available for internal requests')
    }

    const targetUnit = GROUP_ENTITIES.find(
      (entity) => entity.id === payload.target_unit_id && entity.type !== 'holding'
    )
    if (!targetUnit) throw new Error('Select a valid destination company, branch, or unit')

    const assignee = users.find(
      (user) => user.id === payload.assignee_id && user.is_active
    )
    if (!assignee) throw new Error('Select an active staff member')
    const hasDestinationScope =
      assignee.company_id === targetUnit.id ||
      assignee.unit_id === targetUnit.id ||
      assignee.access_scopes?.some(
        (scope) =>
          scope.companyId === targetUnit.id ||
          scope.unitId === targetUnit.id ||
          scope.companyId === '*'
      )
    if (!hasDestinationScope) {
      throw new Error('The selected assignee is not assigned to the destination unit')
    }

    const sourceUnit =
      GROUP_ENTITIES.find((entity) => entity.id === requester.unit_id) ??
      GROUP_ENTITIES.find((entity) => entity.id === requester.company_id) ??
      GROUP_ENTITIES.find((entity) => entity.id === 'gue-group')
    const messages = await this.getAllMessages()
    const now = new Date().toISOString()
    const message: Message = {
      id: `msg_internal_${Date.now()}`,
      website_id: 'internal-requests',
      website: {
        id: 'internal-requests',
        name: 'Internal Request',
        color: '#0F766E',
      },
      sender_name: requester.name,
      sender_email: requester.email,
      subject: payload.subject,
      body: payload.message,
      category_id: category.id,
      category: { id: category.id, name: category.name, color: category.color },
      source_type: 'internal',
      source_unit_id: sourceUnit?.id,
      source_unit_name: sourceUnit?.name,
      target_unit_id: targetUnit.id,
      target_unit_name: targetUnit.name,
      status: 'assigned',
      assigned_to: {
        id: assignee.id,
        name: assignee.name,
        email: assignee.email,
        avatar: assignee.avatar,
      },
      assigned_by: { id: requester.id, name: requester.name },
      created_at: now,
      updated_at: now,
      responses_count: 0,
      notes_count: 0,
      is_overdue: false,
    }
    messages.unshift(message)
    saveToStorage(STORAGE_KEYS.MESSAGES, messages)

    const events = getFromStorage<MessageEvent[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS)
    events.push({
      id: `evt_${Date.now()}`,
      message_id: message.id,
      actor_id: requester.id,
      actor_name: requester.name,
      action: 'created',
      created_at: now,
    })
    saveToStorage(STORAGE_KEYS.EVENTS, events)

    await this.createNotification({
      user_id: assignee.id,
      title: 'New Internal Request',
      message: `${requester.name} sent a ${category.name} request from ${sourceUnit?.name ?? 'GUE Group'} to ${targetUnit.name}.`,
      type: 'info',
      link: `/inbox?id=${message.id}`,
    })

    return { message_id: message.id, status: 'created' }
  }

  static async createExternalRequest(
    payload: ExternalRequestPayload,
    requester: User
  ): Promise<{ message_id: string; status: string }> {
    await delay(150)
    if (!requester.is_active) throw new Error('An active staff account is required')

    const categories = await this.getCategories()
    const category = categories.find((item) => item.id === payload.category_id)
    if (!category) throw new Error('Request category not found')
    if (category.audience === 'public') {
      throw new Error('This category is not available for staff requests')
    }

    const organization = payload.organization_name.trim()
    const subject = payload.subject.trim()
    const body = payload.message.trim()
    if (!organization) throw new Error('Enter the external organization')
    if (!subject || !body) throw new Error('Subject and request details are required')

    const sourceCompany = GROUP_ENTITIES.find(
      (entity) => entity.id === requester.company_id
    )
    if (!sourceCompany) throw new Error('Your account is not assigned to a GUE company')
    const sourceUnit =
      GROUP_ENTITIES.find((entity) => entity.id === requester.unit_id) ?? sourceCompany
    const messages = await this.getAllMessages()
    const now = new Date().toISOString()
    const message: Message = {
      id: `msg_external_${Date.now()}`,
      website_id: 'external-requests',
      website: {
        id: 'external-requests',
        name: 'External Follow-up',
        color: '#B45309',
      },
      sender_name: requester.name,
      sender_email: requester.email,
      sender_phone: requester.phone,
      subject,
      body,
      category_id: category.id,
      category: { id: category.id, name: category.name, color: category.color },
      source_type: 'external',
      requester_id: requester.id,
      source_company_id: sourceCompany.id,
      source_work_location: requester.work_location,
      source_unit_id: sourceUnit.id,
      source_unit_name: sourceUnit.name,
      external_organization: organization,
      external_contact_name: payload.contact_name?.trim() || undefined,
      external_contact_email: payload.contact_email?.trim() || undefined,
      status: 'new',
      assigned_to: {
        id: requester.id,
        name: requester.name,
        email: requester.email,
        avatar: requester.avatar,
      },
      assigned_by: { id: requester.id, name: requester.name },
      created_at: now,
      updated_at: now,
      responses_count: 0,
      notes_count: 0,
      is_overdue: false,
    }
    messages.unshift(message)
    saveToStorage(STORAGE_KEYS.MESSAGES, messages)

    const events = getFromStorage<MessageEvent[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS)
    events.push({
      id: `evt_${Date.now()}`,
      message_id: message.id,
      actor_id: requester.id,
      actor_name: requester.name,
      action: 'created',
      created_at: now,
    })
    saveToStorage(STORAGE_KEYS.EVENTS, events)

    return { message_id: message.id, status: 'recorded' }
  }

  static async getMeetings(viewer: User): Promise<StaffMeeting[]> {
    await delay()
    const meetings = getFromStorage<StaffMeeting[]>(STORAGE_KEYS.MEETINGS, [])
    const users = await this.getManagementUsers()
    return meetings
      .filter((meeting) => {
        if (
          meeting.organizer_id === viewer.id ||
          meeting.invitees.some((invitee) => invitee.user_id === viewer.id)
        ) return true
        const organizer = users.find((user) => user.id === meeting.organizer_id)
        return organizer ? canViewStaffMember(viewer, organizer) : false
      })
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  }

  static async createMeeting(
    payload: CreateMeetingPayload,
    organizer: User
  ): Promise<MeetingCreateResult> {
    await delay()
    if (!MEETING_CREATOR_ROLES.includes(organizer.role)) {
      throw new Error('Only branch managers and higher roles can schedule meetings or events')
    }

    const startsAt = new Date(payload.starts_at)
    const endsAt = new Date(payload.ends_at)
    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime()) ||
      endsAt <= startsAt
    ) {
      throw new Error('Enter a valid start and end time')
    }
    if (!payload.title.trim() || !payload.description.trim()) {
      throw new Error('Title and purpose are required')
    }

    const users = await this.getManagementUsers()
    const isGroupHead = organizer.role === 'group_head' || organizer.role === 'super_admin'
    if (payload.audience !== 'scoped_team' && !isGroupHead) {
      throw new Error('Only the GMD or Super Admin can schedule group-wide audiences')
    }

    let audienceUsers: User[]
    if (payload.audience === 'company_managers_hq') {
      const managerRoles: UserRole[] = ['company_manager', 'subsidiary_head', 'operations_manager']
      audienceUsers = users.filter(
        (user) =>
          user.is_active &&
          user.id !== organizer.id &&
          user.role !== 'super_admin' &&
          (
            user.company_id === 'gue-group' ||
            managerRoles.includes(user.role) ||
            (payload.include_branch_managers &&
              (user.role === 'branch_manager' || user.role === 'unit_head'))
          )
      )
    } else if (payload.audience === 'group_wide') {
      audienceUsers = users.filter(
        (user) => user.is_active && user.id !== organizer.id && user.role !== 'super_admin'
      )
    } else {
      const scopedStaff = users.filter(
        (user) =>
          user.id !== organizer.id &&
          user.is_active &&
          canViewStaffMember(organizer, user)
      )
      const requestedIds = new Set(payload.invitee_ids ?? [])
      audienceUsers = payload.invitee_ids?.length
        ? scopedStaff.filter((user) => requestedIds.has(user.id))
        : scopedStaff
    }

    const requestedIds = new Set(payload.invitee_ids ?? [])
    const additionalHigherInvitees = users.filter(
      (user) =>
        requestedIds.has(user.id) &&
        user.is_active &&
        user.id !== organizer.id &&
        USER_ROLE_RANK[user.role] > USER_ROLE_RANK[organizer.role]
    )
    const higherIds = new Set(additionalHigherInvitees.map((user) => user.id))
    audienceUsers = [
      ...new Map(
        [...audienceUsers, ...additionalHigherInvitees].map((user) => [user.id, user])
      ).values(),
    ]

    if (higherIds.size && !payload.higher_invite_reason?.trim()) {
      throw new Error('Explain why the higher-rank officer needs to attend')
    }
    if (!audienceUsers.length) throw new Error('Select at least one meeting attendee')

    const sourceCompany = GROUP_ENTITIES.find(
      (entity) => entity.id === organizer.company_id
    )
    const meeting: StaffMeeting = {
      id: `meeting_${Date.now()}`,
      kind: payload.kind,
      title: payload.title.trim(),
      description: payload.description.trim(),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      location: payload.location?.trim() || undefined,
      organizer_id: organizer.id,
      organizer_name: organizer.name,
      organizer_role: organizer.role,
      source_company_id: sourceCompany?.id || organizer.company_id || '',
      source_unit_id: organizer.unit_id,
      source_work_location: organizer.work_location,
      audience: payload.audience,
      include_branch_managers: Boolean(payload.include_branch_managers),
      higher_invite_reason: higherIds.size ? payload.higher_invite_reason?.trim() : undefined,
      invitees: audienceUsers.map((user) => ({
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
        status: higherIds.has(user.id)
          ? 'pending_response' as MeetingInviteStatus
          : 'invited' as MeetingInviteStatus,
      })),
      created_at: new Date().toISOString(),
    }
    const meetings = getFromStorage<StaffMeeting[]>(STORAGE_KEYS.MEETINGS, [])
    meetings.unshift(meeting)
    saveToStorage(STORAGE_KEYS.MEETINGS, meetings)
    await this.logAudit(
      organizer.id,
      organizer.name,
      organizer.role,
      'CREATE_MEETING',
      'StaffMeeting',
      meeting.id,
      { audience: meeting.audience, invitee_count: meeting.invitees.length }
    )

    await Promise.all(
      meeting.invitees.map((invitee) =>
        this.createNotification({
          user_id: invitee.user_id,
          title: invitee.status === 'pending_response'
            ? 'Meeting attendance requested'
            : `${meeting.kind === 'meeting' ? 'Meeting' : 'Event'} invitation`,
          message: invitee.status === 'pending_response'
            ? `${organizer.name} requests your attendance at "${meeting.title}". Reason: ${meeting.higher_invite_reason}`
            : `${organizer.name} invited you to "${meeting.title}".`,
          type: 'info',
          link: `/meetings?meeting=${meeting.id}`,
        })
      )
    )
    return {
      meeting,
      notified_user_ids: meeting.invitees.map((invitee) => invitee.user_id),
    }
  }

  static async respondToMeeting(
    meetingId: string,
    response: MeetingResponse,
    actor: User
  ): Promise<StaffMeeting> {
    await delay()
    const meetings = getFromStorage<StaffMeeting[]>(STORAGE_KEYS.MEETINGS, [])
    const meeting = meetings.find((item) => item.id === meetingId)
    if (!meeting) throw new Error('Meeting not found')
    const invitee = meeting.invitees.find((item) => item.user_id === actor.id)
    if (!invitee || invitee.status !== 'pending_response') {
      throw new Error('This meeting does not have a pending response for you')
    }
    invitee.status = response
    invitee.responded_at = new Date().toISOString()
    saveToStorage(STORAGE_KEYS.MEETINGS, meetings)
    await this.createNotification({
      user_id: meeting.organizer_id,
      title: `Meeting request ${response}`,
      message: `${actor.name} ${response} the request to attend "${meeting.title}".`,
      type: response === 'accepted' ? 'success' : 'info',
      link: `/meetings?meeting=${meeting.id}`,
    })
    return meeting
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

  static async approveGroupPayroll(
    period: PayrollPeriod,
    actor: User
  ): Promise<PayrollPeriod> {
    await delay()
    if (!canApproveGroupPayroll(actor, period)) {
      throw new Error('You are not authorized to give final group payroll approval')
    }
    const recipientCount = new Set(
      period.submissions.flatMap((submission) =>
        submission.unitEntries.flatMap((entry) => entry.lines.map((line) => line.sequenceNumber))
      )
    ).size
    return {
      ...period,
      groupApproval: {
        userId: actor.id,
        userName: actor.name,
        approvedAt: new Date().toISOString(),
      },
      payslipDelivery: {
        status: 'simulated',
        recipientCount,
        sentAt: new Date().toISOString(),
      },
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
    actorRole: UserRole,
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

  private static async processStaffCelebrations(today = new Date()): Promise<void> {
    const users = await this.getUsers()
    const processed = new Set(
      getFromStorage<string[]>(STORAGE_KEYS.CELEBRATIONS, [])
    )
    const year = today.getFullYear()
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    for (const staff of users) {
      if (!staff.is_active) continue

      if (staff.date_of_birth?.slice(5, 10) === monthDay) {
        const key = `birthday:${staff.id}:${year}`
        if (!processed.has(key)) {
          await this.notifyStaffAudience(
            staff,
            'Happy birthday!',
            `Happy birthday, ${staff.name}! Wishing you a wonderful year ahead.`,
            'success',
            true
          )
          processed.add(key)
        }
      }

      if (staff.hire_date?.slice(5, 10) === monthDay) {
        const years = year - Number(staff.hire_date.slice(0, 4))
        const key = `anniversary:${staff.id}:${year}`
        if (years > 0 && !processed.has(key)) {
          await this.notifyStaffAudience(
            staff,
            `${years}-year work anniversary`,
            `Congratulations to ${staff.name} on ${years} year${years === 1 ? '' : 's'} with GUE Group.`,
            'success',
            true
          )
          processed.add(key)
        }
      }
    }

    saveToStorage(STORAGE_KEYS.CELEBRATIONS, [...processed])
  }

  static async getNotifications(viewer?: User): Promise<NotificationItem[]> {
    await delay()
    await this.processStaffCelebrations()
    const list = getFromStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
    return list
      .filter((notification) =>
        !viewer || !notification.user_id || notification.user_id === viewer.id
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  static async createNotification(payload: Omit<NotificationItem, 'id' | 'created_at' | 'is_read'>): Promise<NotificationItem> {
    const list = getFromStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
    const item: NotificationItem = {
      ...payload,
      id: `notif_${Date.now()}_${list.length}`,
      is_read: false,
      created_at: new Date().toISOString(),
    }
    list.unshift(item)
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, list)
    return item
  }

  static async markNotificationRead(id: string, viewer?: User): Promise<boolean> {
    const list = getFromStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
    const item = list.find((n) => n.id === id)
    if (item?.user_id && viewer && item.user_id !== viewer.id) {
      throw new Error("You cannot mark another staff member's notification as read")
    }
    if (item) {
      item.is_read = true
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, list)
    }
    return true
  }

  static async markAllNotificationsRead(viewer?: User): Promise<boolean> {
    const list = getFromStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
    list.forEach((n) => {
      if (!n.user_id || !viewer || n.user_id === viewer.id) n.is_read = true
    })
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, list)
    return true
  }
}
