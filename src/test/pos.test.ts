import { beforeEach, describe, expect, it } from 'vitest'
import { User } from '@/types'
import { canMakePosSale, canViewPosSummary, getPosOutletsForUser } from '@/lib/pos'
import { api } from '@/services/api'
import { MockApiService } from '@/services/mockAdapter'
import { GROUP_HEAD_DEMO_USER, WORKBOOK_STAFF_DIRECTORY } from '@/services/operationsData'
import { POS_OUTLETS } from '@/services/posData'

const staffById = (id: string) => WORKBOOK_STAFF_DIRECTORY.find((user) => user.id === id)!
const outletById = (id: string) => POS_OUTLETS.find((outlet) => outlet.id === id)!

describe('POS outlet access and sales synchronization', () => {
  beforeEach(() => {
    MockApiService.resetData()
  })

  it('scopes outlet reports to manager assignments and group leadership', () => {
    const westAfricaManager = staffById('workbook-staff-20')
    const centreDirector = staffById('workbook-staff-1')
    const deputyDirector = staffById('workbook-staff-32')
    const westAfricaOutlets = getPosOutletsForUser(westAfricaManager).map((outlet) => outlet.id)

    expect(westAfricaOutlets).toContain('west-africa-wannune')
    expect(westAfricaOutlets).toContain('guemoni-gboko')
    expect(westAfricaOutlets).not.toContain('skills-training-wannune')
    expect(getPosOutletsForUser(centreDirector).map((outlet) => outlet.id))
      .toEqual(['skills-training-wannune'])
    expect(getPosOutletsForUser(deputyDirector).map((outlet) => outlet.id))
      .toEqual(expect.arrayContaining(['skills-training-wannune', 'industrial-wannune']))
    expect(getPosOutletsForUser(GROUP_HEAD_DEMO_USER)).toHaveLength(POS_OUTLETS.length)
  })

  it('assigns sales capability to named service roles and applies the scoped manager fallback', () => {
    const westAfricaManager = staffById('workbook-staff-20')
    const customerCare = staffById('workbook-staff-30')
    const centreDirector = staffById('workbook-staff-1')
    const terseer = staffById('workbook-staff-36')
    const blessing = staffById('workbook-staff-52')
    const eunice = staffById('workbook-staff-53')
    const farmAttendant = staffById('workbook-staff-29')

    expect(canMakePosSale(customerCare, outletById('skills-training-wannune'))).toBe(true)
    expect(canMakePosSale(customerCare, outletById('west-africa-wannune'))).toBe(false)
    expect(canViewPosSummary(centreDirector, outletById('skills-training-wannune'))).toBe(true)
    expect(canMakePosSale(centreDirector, outletById('skills-training-wannune'))).toBe(true)
    expect(canMakePosSale(westAfricaManager, outletById('west-africa-wannune'))).toBe(true)
    expect(canMakePosSale(GROUP_HEAD_DEMO_USER, outletById('west-africa-wannune'))).toBe(true)
    expect(canMakePosSale(terseer, outletById('guemoni-wannune'))).toBe(true)
    expect(canMakePosSale(terseer, outletById('guemoni-gboko'))).toBe(false)
    expect(canMakePosSale(blessing, outletById('guemoni-gboko'))).toBe(true)
    expect(canMakePosSale(eunice, outletById('guemoni-askunya'))).toBe(true)
    expect(canMakePosSale(farmAttendant, outletById('smart-farm-yaikyo'))).toBe(true)
  })

  it('allows only the sole active staff member when an outlet has no designated seller or manager', () => {
    const loneStaff = {
      ...staffById('workbook-staff-30'),
      id: 'fallback-staff',
      job_title: 'General Staff',
      company_id: 'fallback-company',
      unit_id: 'fallback-company',
      work_location: 'Test Branch',
    }
    const otherStaff = { ...loneStaff, id: 'another-fallback-staff' }
    const outlet = {
      ...outletById('west-africa-wannune'),
      id: 'fallback-outlet',
      companyId: 'fallback-company',
      unitId: 'fallback-company',
      workLocation: 'Test Branch',
    }

    expect(canMakePosSale(loneStaff, outlet, [loneStaff])).toBe(true)
    expect(canMakePosSale(loneStaff, outlet, [loneStaff, otherStaff])).toBe(false)
  })

  it('shows a seller only their own receipts while the manager sees scoped outlet sales', async () => {
    const customerCare = staffById('workbook-staff-30')
    const westAfricaManager = staffById('workbook-staff-20')
    const sellerData = await api.pos.dashboard(customerCare)
    const managerData = await api.pos.dashboard(westAfricaManager)

    expect(sellerData.outlets.map((outlet) => outlet.id)).toEqual(['skills-training-wannune'])
    expect(sellerData.outletAccess['skills-training-wannune'])
      .toEqual({ canSell: true, canViewSummary: false })
    expect(sellerData.sales.length).toBeGreaterThan(0)
    expect(sellerData.sales.every((sale) => sale.sellerId === customerCare.id)).toBe(true)
    expect(managerData.outletAccess['west-africa-wannune'])
      .toEqual({ canSell: true, canViewSummary: true })
    expect(managerData.sales.some((sale) => sale.outletId === 'west-africa-wannune')).toBe(true)
    expect(managerData.outlets).not.toContainEqual(outletById('skills-training-wannune'))
  })

  it('records an in-person sale and returns a receipt for its authorized seller', async () => {
    const customerCare = staffById('workbook-staff-30')
    const sale = await api.pos.createSale({
      outletId: 'skills-training-wannune',
      lines: [{ itemId: 'demo-stc-enrolment', quantity: 1 }],
      paymentMethod: 'cash',
    }, customerCare)

    expect(sale.sellerId).toBe(customerCare.id)
    expect(sale.externalReceiptId).toMatch(/^LOY-DEMO-/)
    expect((await api.pos.dashboard(customerCare)).sales.some((item) => item.id === sale.id)).toBe(true)
    await expect(api.pos.createSale({
      outletId: 'west-africa-wannune',
      lines: [{ itemId: 'demo-wa-fees', quantity: 1 }],
      paymentMethod: 'cash',
    }, customerCare)).rejects.toThrow('POS sales access')
  })

  it('routes verified delivery orders to Logistics and issues a receipt after fulfillment', async () => {
    const logisticsEmployee = {
      ...staffById('workbook-staff-30'),
      id: 'logistics-employee',
      role: 'staff' as const,
      job_title: 'Logistics Officer',
      department: 'Logistics',
      company_id: 'gue-farming',
      unit_id: 'gue-farming',
      work_location: 'Yaikyo, Makurdi',
      permissions: undefined,
      access_scopes: undefined,
    }

    const logisticsData = await api.logistics.dashboard(logisticsEmployee)
    expect(logisticsData.tasks.map((task) => task.id)).not.toContain('demo-web-order-002')
    const paidOrder = await MockApiService.processDemoPaystackWebhook(
      'FARM-DEMO-2042',
      'verified',
      'PAYSTACK-DEMO-2042'
    )
    expect(paidOrder.status).toBe('ready_to_fulfill')
    expect((await api.logistics.dashboard(logisticsEmployee)).tasks.map((task) => task.id))
      .toContain('demo-web-order-002')

    await expect(api.logistics.issueTaskReceipt('demo-web-order-002', logisticsEmployee))
      .rejects.toThrow('Only fulfilled orders with verified payment')

    const fulfilled = await api.logistics.fulfillTask('demo-web-order-002', logisticsEmployee)
    expect(fulfilled.status).toBe('fulfilled')
    expect(fulfilled.fulfilledById).toBe(logisticsEmployee.id)

    const firstIssue = await api.logistics.issueTaskReceipt('demo-web-order-002', logisticsEmployee)
    const repeatedIssue = await api.logistics.issueTaskReceipt('demo-web-order-002', logisticsEmployee)
    expect(firstIssue.order.status).toBe('receipt_issued')
    expect(firstIssue.sale.externalReceiptId).toBe(repeatedIssue.sale.externalReceiptId)
    expect(firstIssue.order.receiptIssuedById).toBe(logisticsEmployee.id)
    expect((await api.pos.dashboard(GROUP_HEAD_DEMO_USER)).sales.filter(
      (sale) => sale.sourceOrderId === 'FARM-DEMO-2042'
    )).toHaveLength(1)
  })

  it('completes verified instant web orders without creating a Logistics task', async () => {
    const westAfricaManager = staffById('workbook-staff-20')
    const webOrders = await api.webOrders.dashboard(westAfricaManager)
    expect(webOrders.orders.find((order) => order.id === 'demo-web-order-001')?.status)
      .toBe('completed')

    const completed = await MockApiService.processDemoPaystackWebhook(
      'EDU-DEMO-1002',
      'verified',
      'PAYSTACK-DEMO-1002'
    )
    expect(completed.fulfillmentMode).toBe('instant')
    expect(completed.status).toBe('completed')
    expect((await api.logistics.dashboard(GROUP_HEAD_DEMO_USER)).tasks.map((task) => task.id))
      .not.toContain('demo-web-order-003')
    await expect(api.logistics.fulfillTask('demo-web-order-003', westAfricaManager))
      .rejects.toThrow('Instant web orders do not require Logistics fulfillment')
  })

  it('prevents an employee from fulfilling an order outside their Logistics scope', async () => {
    const customerCare = staffById('workbook-staff-30')
    await MockApiService.processDemoPaystackWebhook(
      'FARM-DEMO-2042',
      'verified',
      'PAYSTACK-DEMO-2042'
    )
    await expect(api.logistics.fulfillTask('demo-web-order-002', customerCare))
      .rejects.toThrow('Logistics access')
  })

  it('scopes sales summaries from branch to company, operations, and group leadership', () => {
    const branchManager = {
      ...GROUP_HEAD_DEMO_USER,
      id: 'branch-manager',
      role: 'branch_manager' as const,
      company_id: 'gue-education',
      unit_id: 'gue-education-west-africa',
      access_scopes: [{
        companyId: 'gue-education',
        unitId: 'gue-education-west-africa',
        workLocations: ['Wannune'],
      }],
    }
    const companyManager = {
      ...branchManager,
      id: 'company-manager',
      role: 'company_manager' as const,
      unit_id: 'gue-education',
      access_scopes: [{ companyId: 'gue-education' }],
    }
    const operationsManager: User = {
      ...GROUP_HEAD_DEMO_USER,
      id: 'operations-manager',
      role: 'operations_manager',
      permissions: ['view_staff', 'view_operations'],
      access_scopes: [{
        companyId: '*',
        permissions: ['view_staff', 'view_operations'],
      }],
    }

    expect(getPosOutletsForUser(branchManager).map((outlet) => outlet.id))
      .toEqual(['west-africa-wannune'])
    expect(getPosOutletsForUser(companyManager).map((outlet) => outlet.id))
      .toEqual(['west-africa-wannune', 'skills-training-wannune'])
    expect(getPosOutletsForUser(operationsManager)).toHaveLength(POS_OUTLETS.length)
    expect(getPosOutletsForUser(GROUP_HEAD_DEMO_USER)).toHaveLength(POS_OUTLETS.length)
  })
})
