import { describe, expect, it } from 'vitest'
import {
  calculatePayrollNet,
  canApproveEntityPayroll,
  canApproveGroupPayroll,
  canApproveUnitPayroll,
  canEditPayrollUnit,
  canSubmitPayrollUnit,
  getPayrollPeriodStatus,
  getPayrollSubmissionLines,
  payrollLinesToCsv,
} from '@/lib/payroll'
import {
  canViewAllPayroll,
  canManageStaffMember,
  canViewStaffMember,
  hasPermission,
  hasScopedPermission,
} from '@/lib/access'
import { User, UserRole } from '@/types'
import {
  DEMO_PAYROLL_PERIOD,
  GROUP_HEAD_DEMO_USER,
  GROUP_DEPARTMENTS,
  GROUP_ENTITIES,
  INITIAL_OPERATIONAL_WORK,
  PAYROLL_ENTRY_DEMO_USERS,
  WORKBOOK_STAFF_DIRECTORY,
  WORKBOOK_ROLE_DEMO_USERS,
} from '@/services/operationsData'
import {
  CURRENT_PAYROLL_ROSTER,
  PAYROLL_WORKBOOK_RECORDS,
} from '@/services/payrollWorkbookSeed'

const makeUser = (
  role: UserRole,
  companyId?: string,
  unitId?: string
): User => ({
  id: `test-${role}`,
  name: 'Test User',
  email: 'test@demo.invalid',
  role,
  company_id: companyId,
  unit_id: unitId,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
})

describe('Group operations demo data', () => {
  it('includes shared and subsidiary-relevant staff departments', () => {
    expect(GROUP_DEPARTMENTS).toEqual(expect.arrayContaining([
      'Operations',
      'Administration',
      'Finance',
      'Logistics',
      'Agency Banking',
      'Marketing',
      'Training',
      'IT & Cybersecurity',
      'Engineering & Projects',
      'Education & Academic Services',
      'Agriculture & Farm Operations',
      'Mobility & Transport',
      'Real Estate & Property Management',
      'Industrial Parks & Facilities',
      'Procurement & Supply Chain',
      'Health, Safety & Environment',
      'Business Development & Partnerships',
    ]))
    expect(new Set(GROUP_DEPARTMENTS).size).toBe(GROUP_DEPARTMENTS.length)
  })

  it('models eight subsidiaries and assigns education operating units correctly', () => {
    expect(GROUP_ENTITIES.filter((entity) => entity.type === 'subsidiary')).toHaveLength(8)
    expect(GROUP_ENTITIES.find((entity) => entity.id === 'gue-education-stc')?.parentId)
      .toBe('gue-education')
    expect(GROUP_ENTITIES.find((entity) => entity.id === 'gue-education-cbt')?.parentId)
      .toBe('gue-education')
    expect(INITIAL_OPERATIONAL_WORK.find((item) => item.id === 'op-edu-3')?.entityId)
      .toBe('gue-education-cbt')
    expect(GROUP_ENTITIES.find((entity) => entity.id === 'gue-education-west-africa')?.parentId)
      .toBe('gue-education')
    expect(GROUP_ENTITIES.find((entity) => entity.id === 'gue-farming')?.locations)
      .toEqual(['Yaikyo, Makurdi', 'Wannune'])
    expect(GROUP_ENTITIES.find((entity) => entity.id === 'guemoni')?.locations)
      .toEqual(['Wannune', 'Akukunya', 'Gboko'])
    expect(GROUP_ENTITIES.find((entity) => entity.id === 'gue-cyber')?.operatingAreas)
      .not.toContain('CBT examination centre')
  })

  it('loads the workbook roster and starts the current-period payroll with zeroed amounts', () => {
    const line = getPayrollSubmissionLines(DEMO_PAYROLL_PERIOD.submissions[0])[0]
    const currentPeriod = new Intl.DateTimeFormat('en', {
      month: 'long',
      year: 'numeric',
    }).format(new Date())

    expect(DEMO_PAYROLL_PERIOD.period).toBe(currentPeriod)
    expect(calculatePayrollNet(line)).toBe(
      line.basicSalary - line.deduction + line.backlog + line.allowance
    )
    expect(line).toMatchObject({
      sequenceNumber: expect.any(Number),
      staffLabel: expect.any(String),
      jobTitle: expect.any(String),
      basicSalary: 0,
      deduction: 0,
      backlog: 0,
      allowance: 0,
      bankName: 'DEMO BANK',
      accountNumber: '0000000000',
      signature: 'DEMO ONLY - NO SIGNATURE',
    })
    expect(PAYROLL_WORKBOOK_RECORDS).toHaveLength(47)
    expect(CURRENT_PAYROLL_ROSTER).toHaveLength(53)
    expect(WORKBOOK_STAFF_DIRECTORY).toHaveLength(CURRENT_PAYROLL_ROSTER.length)
    expect(PAYROLL_WORKBOOK_RECORDS.every((record) => record.accountNumber === '0000000000'))
      .toBe(true)
    expect(PAYROLL_WORKBOOK_RECORDS.every((record) => record.signature === 'DEMO ONLY - NO SIGNATURE'))
      .toBe(true)
    expect(CURRENT_PAYROLL_ROSTER.every((record) =>
      record.basicSalary === 0 &&
      record.deduction === 0 &&
      record.backlog === 0 &&
      record.allowance === 0 &&
      Boolean(record.workLocation) &&
      record.accountNumber === '0000000000' &&
      record.signature === 'DEMO ONLY - NO SIGNATURE'
    )).toBe(true)
    expect(getPayrollSubmissionLines(
      DEMO_PAYROLL_PERIOD.submissions.find((submission) => submission.subsidiaryId === 'gue-education')!
    )).toHaveLength(37)
    expect(DEMO_PAYROLL_PERIOD.submissions).toHaveLength(9)
    expect(DEMO_PAYROLL_PERIOD.submissions.flatMap(getPayrollSubmissionLines)).toHaveLength(53)
    expect(DEMO_PAYROLL_PERIOD.submissions.flatMap(getPayrollSubmissionLines)
      .every((record) =>
        record.basicSalary === 0 &&
        record.deduction === 0 &&
        record.backlog === 0 &&
        record.allowance === 0
      )).toBe(true)
  })

  it('uses the updated payroll assignments only for the current roster', () => {
    const currentRows = new Map(CURRENT_PAYROLL_ROSTER.map((line) => [line.id, line]))
    expect(currentRows.get('workbook-oct-029')).toMatchObject({
      subsidiaryId: 'gue-farming',
      jobTitle: 'Farm Attendant',
    })
    expect(currentRows.get('workbook-oct-030')).toMatchObject({
      subsidiaryId: 'gue-education',
      operatingUnitId: 'gue-education-stc',
      jobTitle: 'Customer Care Representative',
    })
    expect(currentRows.get('workbook-oct-033')).toMatchObject({
      subsidiaryId: 'gue-group',
      operatingUnitId: 'gue-group',
      jobTitle: 'Marketing Associate',
      departmentUnit: 'Head Office',
      workLocation: 'Highlevel, Makurdi',
    })
    expect(currentRows.get('workbook-oct-035')?.subsidiaryId).toBe('guemoni')
    expect(currentRows.get('workbook-oct-035')).toMatchObject({
      jobTitle: 'BVN and NIN Enrollment Officer',
      departmentUnit: 'Guemoni',
    })
    expect(currentRows.get('workbook-oct-036')).toMatchObject({
      staffLabel: 'Terseer Jacob Ushahemba',
      jobTitle: 'UBA Moni Agent',
      subsidiaryId: 'guemoni',
      workLocation: 'Wannune',
    })
    expect(CURRENT_PAYROLL_ROSTER.filter(
      (line) => line.staffLabel.toLowerCase().includes('terseer jacob')
    )).toHaveLength(1)
    expect(currentRows.get('workbook-oct-040')).toMatchObject({
      subsidiaryId: 'gue-group',
      jobTitle: 'Graphics Designer',
      departmentUnit: 'Head Office',
    })
    expect(currentRows.get('workbook-oct-001')?.jobTitle)
      .toBe('Centre Director, Skills Training Centre')
    expect(currentRows.get('workbook-oct-020')?.jobTitle).toBe('Principal, West Africa Schools')
    expect(currentRows.get('workbook-oct-032')?.jobTitle).toBe('Assistant Manager')
    expect(currentRows.get('workbook-oct-037')?.jobTitle).toBe('Realty Manager / Realtor')
    expect(currentRows.get('workbook-oct-039')?.jobTitle).toBe('IT Manager')
    expect(currentRows.get('workbook-oct-046')).toMatchObject({
      subsidiaryId: 'gue-group',
      operatingUnitId: 'gue-group',
      jobTitle: 'Group Operations Manager',
      departmentUnit: 'Head Office',
    })
    expect(currentRows.get('workbook-oct-047')).toMatchObject({
      staffLabel: 'Philip Dzer',
      jobTitle: 'Group Managing Director',
    })
    expect(currentRows.get('workbook-oct-027')?.jobTitle).toBe('Human Resources Associate')
    expect(currentRows.get('workbook-oct-027')?.workLocation).toBe('Highlevel, Makurdi')
    expect(currentRows.get('workbook-oct-029')?.workLocation).toBe('Yaikyo, Makurdi')
    expect(currentRows.get('workbook-oct-037')).toMatchObject({
      workLocation: 'Abuja',
      departmentUnit: 'GUE Realty Limited',
    })
    expect(currentRows.get('workbook-oct-039')?.workLocation).toBe('Abuja')
    expect(currentRows.get('november-staff-048')?.subsidiaryId).toBe('gue-cyber')
    expect(currentRows.get('november-staff-048')?.workLocation).toBe('Makurdi')
    expect(currentRows.get('november-staff-049')?.subsidiaryId).toBe('gue-group')
    expect(currentRows.get('november-staff-050')).toMatchObject({
      subsidiaryId: 'gue-mobility',
      jobTitle: 'Staff Trainee',
    })
    expect(currentRows.get('november-staff-051')).toMatchObject({
      subsidiaryId: 'gue-industrial',
      jobTitle: 'General Staff',
    })
    expect(currentRows.get('november-staff-050')?.workLocation).toBe('Wannune')
    expect(currentRows.get('november-staff-051')?.workLocation).toBe('Wannune')
    expect(currentRows.get('november-staff-052')).toMatchObject({
      subsidiaryId: 'guemoni',
      jobTitle: 'UBA Moni Agent / Branch Manager',
      departmentUnit: 'Guemoni',
    })
    expect(currentRows.get('november-staff-053')).toMatchObject({
      subsidiaryId: 'guemoni',
      jobTitle: 'UBA Moni Agent / Branch Manager',
    })
    expect(currentRows.get('november-staff-052')?.workLocation).toBe('Gboko')
    expect(currentRows.get('november-staff-053')?.workLocation).toBe('Askunya')
    expect(CURRENT_PAYROLL_ROSTER.filter((line) => line.subsidiaryId === 'guemoni')).toHaveLength(4)
    expect(PAYROLL_WORKBOOK_RECORDS.find((line) => line.id === 'workbook-oct-029')?.subsidiaryId)
      .toBe('gue-education')
  })

  it('enforces payroll entry, unit-head, entity-head, then group approval scope', () => {
    const education = DEMO_PAYROLL_PERIOD.submissions.find(
      (submission) => submission.subsidiaryId === 'gue-education'
    )!
    const westAfrica = education.unitEntries.find(
      (entry) => entry.unitId === 'gue-education-west-africa'
    )!
    expect(westAfrica.lines).toHaveLength(31)
    const westAfricaEntryUser = WORKBOOK_STAFF_DIRECTORY.find(
      (user) => user.id === 'workbook-staff-13'
    )!
    const cyberEntryUser = PAYROLL_ENTRY_DEMO_USERS.find(
      (user) => user.company_id === 'gue-cyber'
    )!
    const cyber = DEMO_PAYROLL_PERIOD.submissions.find(
      (submission) => submission.subsidiaryId === 'gue-cyber'
    )!.unitEntries[0]
    expect(canSubmitPayrollUnit(westAfricaEntryUser, westAfrica)).toBe(true)
    expect(canSubmitPayrollUnit(cyberEntryUser, westAfrica)).toBe(false)
    expect(canSubmitPayrollUnit(cyberEntryUser, cyber)).toBe(true)

    const pendingUnitEntry = { ...westAfrica, status: 'pending_unit_head_approval' as const }
    expect(canApproveUnitPayroll(
      makeUser('unit_head', 'gue-education', 'gue-education-west-africa'),
      pendingUnitEntry
    )).toBe(true)
    expect(canApproveUnitPayroll(
      makeUser('unit_head', 'gue-education', 'gue-education-stc'),
      pendingUnitEntry
    )).toBe(false)

    const pendingEntity = { ...education, status: 'pending_entity_approval' as const }
    expect(canApproveEntityPayroll(
      makeUser('subsidiary_head', 'gue-education'),
      pendingEntity
    )).toBe(true)
    expect(canApproveEntityPayroll(
      makeUser('subsidiary_head', 'gue-cyber'),
      pendingEntity
    )).toBe(false)
    expect(canApproveGroupPayroll(GROUP_HEAD_DEMO_USER, DEMO_PAYROLL_PERIOD)).toBe(false)

    const allCompaniesApproved = {
      ...DEMO_PAYROLL_PERIOD,
      submissions: DEMO_PAYROLL_PERIOD.submissions.map((submission) => ({
        ...submission,
        status: 'entity_head_approved' as const,
      })),
    }
    expect(getPayrollPeriodStatus(allCompaniesApproved)).toBe('pending_group_approval')
    expect(canApproveGroupPayroll(GROUP_HEAD_DEMO_USER, allCompaniesApproved)).toBe(true)
  })

  it('limits the West Africa cashier to payroll entry for that unit', () => {
    const cashier = WORKBOOK_STAFF_DIRECTORY.find((user) => user.id === 'workbook-staff-13')!
    const education = DEMO_PAYROLL_PERIOD.submissions.find(
      (submission) => submission.subsidiaryId === 'gue-education'
    )!
    const westAfrica = education.unitEntries.find(
      (entry) => entry.unitId === 'gue-education-west-africa'
    )!
    const trainingCentre = education.unitEntries.find(
      (entry) => entry.unitId === 'gue-education-stc'
    )!

    expect(cashier).toMatchObject({
      name: 'Utorough Msendoo Miracl',
      email: 'workbook-staff-13@demo.invalid',
      role: 'staff',
      job_title: 'Class Teacher',
      additional_roles: ['Billing & Invoices', 'Technical & Customer Support'],
    })
    expect(hasPermission(cashier, 'view_payroll')).toBe(true)
    expect(hasPermission(cashier, 'prepare_payroll')).toBe(true)
    expect(WORKBOOK_ROLE_DEMO_USERS).toContainEqual(cashier)
    expect(canEditPayrollUnit(cashier, westAfrica)).toBe(true)
    expect(canSubmitPayrollUnit(cashier, westAfrica)).toBe(true)
    expect(canEditPayrollUnit(cashier, trainingCentre)).toBe(false)
    expect(hasScopedPermission(
      cashier,
      'prepare_payroll',
      'gue-cyber',
      'gue-cyber'
    )).toBe(false)
    expect(hasPermission(cashier, 'approve_unit_payroll')).toBe(false)
    expect(hasPermission(cashier, 'approve_entity_payroll')).toBe(false)
    expect(hasPermission(cashier, 'approve_group_payroll')).toBe(false)
    expect(hasPermission(cashier, 'export_payroll')).toBe(false)
  })

  it('keeps payroll-entry demo users as staff with scoped payroll permissions', () => {
    expect(PAYROLL_ENTRY_DEMO_USERS.length).toBeGreaterThan(0)
    for (const user of PAYROLL_ENTRY_DEMO_USERS) {
      expect(user.role).toBe('staff')
      expect(user.permissions).toEqual(['view_payroll', 'prepare_payroll'])
      expect(user.additional_roles).toEqual(['Technical & Customer Support'])
    }
  })

  it('applies the named leadership scopes without broadening their payroll approvals', () => {
    const byId = new Map(WORKBOOK_STAFF_DIRECTORY.map((user) => [user.id, user]))
    const uche = byId.get('workbook-staff-39')!
    const westAfricaPrincipal = byId.get('workbook-staff-20')!
    const stcDirector = byId.get('workbook-staff-1')!
    const paul = byId.get('workbook-staff-32')!
    const thaddus = byId.get('workbook-staff-46')!
    const blessing = byId.get('workbook-staff-52')!
    const eunice = byId.get('workbook-staff-53')!
    const realtyStaff = byId.get('workbook-staff-37')!
    const alyssa = byId.get('workbook-staff-27')!
    const ian = byId.get('workbook-staff-49')!

    expect(canViewStaffMember(uche, byId.get('workbook-staff-48')!)).toBe(true)
    expect(canViewStaffMember(uche, realtyStaff)).toBe(false)
    expect(canViewStaffMember(westAfricaPrincipal, stcDirector)).toBe(true)
    expect(canViewStaffMember(westAfricaPrincipal, blessing)).toBe(true)
    expect(canViewStaffMember(stcDirector, westAfricaPrincipal)).toBe(false)
    const stcStaff = makeUser('staff', 'gue-education', 'gue-education-stc')
    expect(canManageStaffMember(stcDirector, stcStaff)).toBe(true)
    expect(canManageStaffMember(stcDirector, { ...stcDirector, id: 'peer-branch-manager' })).toBe(false)
    expect(canViewStaffMember(blessing, eunice)).toBe(false)
    expect(canViewStaffMember(eunice, blessing)).toBe(false)
    expect(canViewStaffMember(thaddus, realtyStaff)).toBe(true)
    expect(hasPermission(paul, 'view_operations')).toBe(true)
    expect(hasPermission(paul, 'approve_entity_payroll')).toBe(false)
    expect(hasScopedPermission(paul, 'manage_operations', 'gue-industrial')).toBe(true)
    expect(hasScopedPermission(paul, 'manage_operations', 'gue-realty')).toBe(false)
    expect(canViewAllPayroll(ian)).toBe(true)
    expect(hasPermission(ian, 'view_staff')).toBe(false)
    expect(canViewStaffMember(alyssa, realtyStaff)).toBe(true)
    expect(hasPermission(alyssa, 'manage_staff')).toBe(true)
    expect(canViewStaffMember(GROUP_HEAD_DEMO_USER, makeUser('super_admin'))).toBe(false)

    const guemoniSubmission = DEMO_PAYROLL_PERIOD.submissions.find(
      (submission) => submission.subsidiaryId === 'guemoni'
    )!
    const pendingGuemoni = { ...guemoniSubmission, status: 'pending_entity_approval' as const }
    expect(canApproveEntityPayroll(westAfricaPrincipal, pendingGuemoni)).toBe(true)
    expect(canApproveEntityPayroll(paul, pendingGuemoni)).toBe(false)

    const farmingSubmission = DEMO_PAYROLL_PERIOD.submissions.find(
      (submission) => submission.subsidiaryId === 'gue-farming'
    )!
    expect(canApproveEntityPayroll(
      GROUP_HEAD_DEMO_USER,
      { ...farmingSubmission, status: 'pending_entity_approval' }
    )).toBe(true)
  })

  it('adds demo role labels without replacing staff job titles or access roles', () => {
    const byName = new Map(WORKBOOK_STAFF_DIRECTORY.map((user) => [user.name, user]))

    expect(byName.get('Buter Nadoo Agatha')).toMatchObject({
      job_title: 'BVN and NIN Enrollment Officer',
      role: 'staff',
      additional_roles: ['Customer Relations Officer (Demo)'],
    })
    expect(byName.get('Ahule Sesuur Cynthia')).toMatchObject({
      job_title: 'Customer Care Representative',
      additional_roles: ['Customer Relations Officer (Demo)'],
    })
    expect(byName.get('Ernest Chia')?.additional_roles)
      .toEqual(['Technical Operations Engineer (Demo)'])
    expect(byName.get('Tyotom Paul Tavershima')?.additional_roles)
      .toEqual(['Technical Operations Engineer (Demo)'])
    expect(byName.get('Ian Imandeh')?.additional_roles)
      .toEqual(['Technical Operations Engineer (Demo)'])
    expect(byName.get('Uche Umoke')?.additional_roles)
      .toEqual(['Technical Operations Engineer (Demo)'])
    expect(byName.get('Ande Thaddeus Aondonenge')?.additional_roles)
      .toEqual(['Technical Operations Engineer (Demo)'])
    expect(byName.get('Terseer Jacob Ushahemba')?.additional_roles)
      .toEqual(['Technical Operations Engineer (Demo)'])
    expect(byName.get('Alyssa Apecha M.')?.additional_roles)
      .toEqual(['People & HR Manager (Demo)'])
    expect(byName.get('Alyssa Apecha M.')?.role).toBe('hr')
    expect(byName.get('Kumningir  Hashabaih')).toMatchObject({
      job_title: 'Marketing Associate',
      department: 'Head Office',
      company_id: 'gue-group',
      work_location: 'Highlevel, Makurdi',
      additional_roles: ['Talent Acquisition Specialist (Demo)'],
    })
  })

  it('exports every voucher column and protects spreadsheet formula-like text', () => {
    const line = {
      ...PAYROLL_WORKBOOK_RECORDS[0],
      staffLabel: '=DEMO()',
      workLocation: 'Wannune',
    }
    const csv = payrollLinesToCsv([line], () => 'GUE Cyber Limited')
    expect(csv).toContain('"S/N","Staff name","Basic salary"')
    expect(csv).toContain('"Work location"')
    expect(csv).toContain('"Wannune"')
    expect(csv).toContain('"\'=DEMO()"')
    expect(csv).toContain('"0000000000"')
    expect(csv).toContain('"Signature"')
  })
})
