import {
  GroupEntity,
  OperationalWorkItem,
  PayrollPeriod,
  PayrollVoucherLine,
} from '@/types/operations'
import { User, UserPermission } from '@/types'
import { CURRENT_PAYROLL_ROSTER, PAYROLL_WORKBOOK_RECORDS } from '@/services/payrollWorkbookSeed'
import { INITIAL_CATEGORIES } from '@/services/mockData'

export const GROUP_ENTITIES: GroupEntity[] = [
  {
    id: 'gue-group',
    name: 'GUE Group Limited',
    type: 'holding',
    sector: 'Group management',
    status: 'active',
    domains: ['www.guegroup.com'],
    locations: ['Highlevel, Makurdi'],
    description: 'Holding company and group-wide governance.',
    operatingAreas: ['Governance', 'Portfolio oversight', 'Shared services'],
  },
  {
    id: 'gue-cyber',
    name: 'GUE Cyber Limited',
    type: 'subsidiary',
    sector: 'Technology services',
    status: 'active',
    domains: ['cyber.guegroup.com'],
    locations: ['Makurdi'],
    description: 'IT support, cybersecurity awareness, phishing simulations, printing, CBT services, and digital skills training.',
    operatingAreas: ['IT service desk', 'Cybersecurity training', 'Phishing simulations', 'Printing and graphics'],
    parentId: 'gue-group',
  },
  {
    id: 'gue-education',
    name: 'GUE Educational Limited',
    type: 'subsidiary',
    sector: 'Education',
    status: 'active',
    domains: ['edu.guegroup.com', 'stc.edu.guegroup.com'],
    locations: ['Wannune'],
    description: 'Schools, TVET, skills training, digital learning, and workforce development.',
    operatingAreas: ['School operations', 'Learner programmes', 'LMS', 'Admissions support', 'Skills assessment'],
    parentId: 'gue-group',
  },
  {
    id: 'gue-engineering',
    name: 'GUE Engineering Limited',
    type: 'subsidiary',
    sector: 'Engineering and software',
    status: 'active',
    domains: ['eng.guegroup.com'],
    locations: ['Abuja', 'Makurdi'],
    description: 'Software, SaaS, AI automation, cloud engineering, DevOps, and technology training.',
    operatingAreas: ['Project delivery', 'Software engineering', 'Cloud and DevOps', 'Quality assurance'],
    parentId: 'gue-group',
  },
  {
    id: 'gue-farming',
    name: 'GUE Smart Farming Limited',
    type: 'subsidiary',
    sector: 'Agriculture',
    status: 'active',
    domains: ['farm.guegroup.com'],
    locations: ['Yaikyo, Makurdi', 'Wannune'],
    description: 'Crop production, livestock, aquaculture, processing, feed, fertilizer, and farm technology.',
    operatingAreas: ['Crop production', 'Livestock', 'Aquaculture', 'Processing and packaging', 'Farm supply'],
    parentId: 'gue-group',
  },
  {
    id: 'gue-industrial',
    name: 'GUE Industrial Parks Ltd',
    type: 'subsidiary',
    sector: 'Manufacturing and industrial parks',
    status: 'active',
    domains: ['ind.guegroup.com'],
    locations: ['Wannune'],
    description: 'Contract manufacturing, processing, packaging, and industrial production support.',
    operatingAreas: ['Production planning', 'Batch tracking', 'Quality assurance', 'Packaging and distribution'],
    parentId: 'gue-group',
  },
  {
    id: 'gue-mobility',
    name: 'GUE Mobility Limited',
    type: 'subsidiary',
    sector: 'Mobility',
    status: 'active',
    domains: ['mobility.guegroup.com'],
    locations: ['Wannune', 'Makurdi'],
    description: 'EV solutions, vehicle refurbishment, assembly, maintenance, parts, fleet, and logistics.',
    operatingAreas: ['Vehicle service', 'Fleet operations', 'Parts', 'Leasing and logistics'],
    parentId: 'gue-group',
  },
  {
    id: 'guemoni',
    name: 'Guemoni Limited',
    type: 'subsidiary',
    sector: 'Financial inclusion',
    status: 'active',
    domains: ['moni.guegroup.com'],
    locations: ['Wannune', 'Akukunya', 'Gboko'],
    description: 'UBA Moni agency banking, agent support, and business advisory.',
    operatingAreas: ['Agent onboarding', 'Terminal support', 'Settlement monitoring', 'Compliance'],
    parentId: 'gue-group',
  },
  {
    id: 'gue-realty',
    name: 'GUE Realty Limited',
    type: 'subsidiary',
    sector: 'Real estate',
    status: 'active',
    domains: ['realty.guegroup.com'],
    locations: ['Abuja', 'Makurdi'],
    description: 'Real estate marketing, investment, development, appraisal, and asset management.',
    operatingAreas: ['Property pipeline', 'Appraisal', 'Development', 'Asset management'],
    parentId: 'gue-group',
  },
  {
    id: 'gue-education-stc',
    name: 'GUE Educational Skills Training Centre',
    type: 'operating_unit',
    sector: 'Vocational training',
    status: 'verify_status',
    domains: ['stc.edu.guegroup.com'],
    locations: ['Wannune'],
    description: 'Education operating unit; approval status should be confirmed against the parent education site.',
    operatingAreas: ['Trade programmes', 'Learner enrolment', 'Practical training', 'Assessment'],
    parentId: 'gue-education',
  },
  {
    id: 'gue-education-cbt',
    name: 'CBT Examination Centre',
    type: 'operating_unit',
    sector: 'Education infrastructure',
    status: 'in_development',
    domains: [],
    description: 'In-development examination centre assigned to GUE Educational Limited.',
    operatingAreas: ['Facility development', 'Accreditation readiness', 'Exam-day operations'],
    parentId: 'gue-education',
  },
  {
    id: 'gue-education-west-africa',
    name: 'West Africa Schools',
    type: 'operating_unit',
    sector: 'Schools',
    status: 'active',
    domains: [],
    locations: ['Wannune'],
    description: 'School operations payroll unit within GUE Educational Limited.',
    operatingAreas: ['School operations', 'Staff payroll input', 'Learner services'],
    parentId: 'gue-education',
  },
]

export const GROUP_DEPARTMENTS = [
  'Administration',
  'Agriculture & Farm Operations',
  'Business Development & Partnerships',
  'Customer Relations',
  'Education & Academic Services',
  'Engineering & Projects',
  'Finance',
  'Agency Banking',
  'Health, Safety & Environment',
  'Industrial Parks & Facilities',
  'IT & Cybersecurity',
  'Legal & Risk',
  'Logistics',
  'Marketing',
  'Mobility & Transport',
  'Operations',
  'People & HR Operations',
  'Procurement & Supply Chain',
  'Real Estate & Property Management',
  'Talent Acquisition',
  'Technical Operations',
  'Training',
] as const

const payrollEntities = GROUP_ENTITIES.filter(
  (entity) => entity.type === 'holding' || entity.type === 'subsidiary'
)

export const GROUP_HEAD_DEMO_USER: User = {
  id: 'demo-group-head',
  name: 'Philip Dzer',
  email: 'philip.dzer@demo.invalid',
  role: 'group_head',
  access_scopes: [
    {
      companyId: '*',
      permissions: [
        'view_staff',
        'view_operations',
        'view_payroll',
        'approve_group_payroll',
        'export_payroll',
      ],
    },
    ...['gue-farming', 'gue-mobility'].map((companyId) => ({
      companyId,
      permissions: [
        'view_staff',
        'view_payroll',
        'approve_entity_payroll',
        'export_payroll',
      ] as UserPermission[],
    })),
  ],
  job_title: 'Group Managing Director',
  company_id: 'gue-group',
  department: 'Group Executive',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

const subsidiariesWithAssignedManagers = new Set([
  'gue-cyber',
  'gue-engineering',
  'gue-farming',
  'gue-mobility',
  'guemoni',
  'gue-realty',
])

export const SUBSIDIARY_HEAD_DEMO_USERS: User[] = GROUP_ENTITIES
  .filter(
    (entity) => entity.type === 'subsidiary' && !subsidiariesWithAssignedManagers.has(entity.id)
  )
  .map((entity) => ({
  id: `demo-head-${entity.id}`,
  name: `${entity.name} Head (Demo)`,
  email: `${entity.id}@demo.invalid`,
  role: 'subsidiary_head',
  job_title: 'Subsidiary Payroll Approver (Demo)',
  company_id: entity.id,
  department: 'Subsidiary Executive',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}))

export const GROUP_OFFICE_PAYROLL_APPROVER: User = {
  id: 'demo-head-gue-group',
  name: 'GUE Group Head Office Payroll Approver (Demo)',
  email: 'group-office-approver@demo.invalid',
  role: 'subsidiary_head',
  job_title: 'Group Office Payroll Approver (Demo)',
  company_id: 'gue-group',
  department: 'Group Executive',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

export const PAYROLL_ENTRY_DEMO_USERS: User[] = payrollEntities.flatMap((entity) => {
  const unitIds =
    entity.id === 'gue-education'
      ? ['gue-education-west-africa', 'gue-education-stc']
      : [entity.id]

  return unitIds.map((unitId) => {
    const unitName = GROUP_ENTITIES.find((item) => item.id === unitId)?.name ?? entity.name
    return {
      id: `demo-payroll-entry-${unitId}`,
      name: `${unitName} Billing & Invoices (Demo)`,
      email: `payroll-${unitId}@demo.invalid`,
      role: 'staff',
      permissions: ['view_payroll', 'prepare_payroll'],
      access_scopes: [{
        companyId: entity.id,
        unitId,
        permissions: ['view_payroll', 'prepare_payroll'],
      }],
      job_title: 'Billing & Invoices',
      additional_roles: ['Technical & Customer Support'],
      company_id: entity.id,
      unit_id: unitId,
      department: unitName,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    }
  })
})

export const UNIT_HEAD_DEMO_USERS: User[] = [
  {
    id: 'demo-unit-head-gue-education-west-africa',
    name: 'West Africa Schools Unit Head (Demo)',
    email: 'west-africa-unit-head@demo.invalid',
    role: 'unit_head',
    job_title: 'Operating Unit Payroll Approver (Demo)',
    company_id: 'gue-education',
    unit_id: 'gue-education-west-africa',
    department: 'West Africa Schools',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
]

const payrollViewPermissions: UserPermission[] = ['view_staff', 'view_payroll']

const supplementalRoleAssignments: Record<string, string[]> = {
  'workbook-oct-030': ['Customer Relations Officer (Demo)'],
  'workbook-oct-033': ['Talent Acquisition Specialist (Demo)'],
  'workbook-oct-035': ['Customer Relations Officer (Demo)'],
  'workbook-oct-013': ['Billing & Invoices', 'Technical & Customer Support'],
  'workbook-oct-032': ['Technical Operations Engineer (Demo)'],
  'workbook-oct-036': ['Technical Operations Engineer (Demo)'],
  'workbook-oct-039': ['Technical Operations Engineer (Demo)'],
  'workbook-oct-046': ['Technical Operations Engineer (Demo)'],
  'november-staff-048': ['Technical Operations Engineer (Demo)'],
  'november-staff-049': ['Technical Operations Engineer (Demo)'],
  'workbook-oct-027': ['People & HR Manager (Demo)'],
}

const categoryAssignmentsByUser = new Map<string, string[]>()
INITIAL_CATEGORIES.forEach((category) => {
  if (!category.default_assignee_id?.startsWith('workbook-staff-')) return
  const categories = categoryAssignmentsByUser.get(category.default_assignee_id) ?? []
  categories.push(category.id)
  categoryAssignmentsByUser.set(category.default_assignee_id, categories)
})
categoryAssignmentsByUser.set('workbook-staff-13', [
  ...(categoryAssignmentsByUser.get('workbook-staff-13') ?? []),
  'c4',
])
categoryAssignmentsByUser.set('workbook-staff-48', [
  ...(categoryAssignmentsByUser.get('workbook-staff-48') ?? []),
  'c12',
])

const staffAccessProfiles: Record<
  string,
  Pick<User, 'role' | 'permissions' | 'access_scopes'>
> = {
  'workbook-oct-001': {
    role: 'branch_manager',
    access_scopes: [{
      companyId: 'gue-education',
      unitId: 'gue-education-stc',
      permissions: payrollViewPermissions,
    }],
  },
  'workbook-oct-020': {
    role: 'company_manager',
    access_scopes: [
      {
        companyId: 'gue-education',
        unitId: 'gue-education-west-africa',
        permissions: [...payrollViewPermissions, 'approve_unit_payroll', 'export_payroll'],
      },
      {
        companyId: 'guemoni',
        permissions: [...payrollViewPermissions, 'approve_entity_payroll', 'export_payroll'],
      },
    ],
  },
  'workbook-oct-027': {
    role: 'hr',
    permissions: ['view_staff', 'manage_staff', 'view_payroll'],
  },
  'workbook-oct-013': {
    role: 'staff',
    permissions: ['view_payroll', 'prepare_payroll'],
    access_scopes: [{
      companyId: 'gue-education',
      unitId: 'gue-education-west-africa',
      permissions: ['view_payroll', 'prepare_payroll'],
    }],
  },
  'workbook-oct-032': {
    role: 'assistant_manager',
    access_scopes: [
      {
        companyId: 'gue-education',
        unitId: 'gue-education-stc',
        permissions: [...payrollViewPermissions, 'view_operations', 'manage_operations'],
      },
      {
        companyId: 'gue-industrial',
        permissions: [...payrollViewPermissions, 'view_operations', 'manage_operations'],
      },
    ],
  },
  'workbook-oct-037': {
    role: 'company_manager',
    access_scopes: [{
      companyId: 'gue-realty',
      permissions: [...payrollViewPermissions, 'approve_entity_payroll', 'export_payroll'],
    }],
  },
  'workbook-oct-039': {
    role: 'company_manager',
    access_scopes: ['gue-cyber', 'gue-engineering'].map((companyId) => ({
      companyId,
      permissions: [...payrollViewPermissions, 'approve_entity_payroll', 'export_payroll'],
    })),
  },
  'workbook-oct-046': {
    role: 'operations_manager',
    permissions: ['view_staff', 'view_operations', 'view_payroll'],
    access_scopes: [{
      companyId: '*',
      permissions: ['view_staff', 'view_operations', 'view_payroll'],
    }],
  },
  'workbook-oct-047': {
    role: 'group_head',
  },
  'november-staff-049': {
    role: 'payroll_viewer',
    permissions: ['view_payroll'],
  },
  'november-staff-052': {
    role: 'branch_manager',
    access_scopes: [{
      companyId: 'guemoni',
      workLocations: ['Gboko'],
      permissions: [...payrollViewPermissions, 'export_payroll'],
    }],
  },
  'november-staff-053': {
    role: 'branch_manager',
    access_scopes: [{
      companyId: 'guemoni',
      workLocations: ['Askunya', 'Akukunya'],
      permissions: [...payrollViewPermissions, 'export_payroll'],
    }],
  },
}

export const WORKBOOK_STAFF_DIRECTORY: User[] = CURRENT_PAYROLL_ROSTER.map((line) => {
  const profile = staffAccessProfiles[line.id]
  return {
    id: `workbook-staff-${line.sequenceNumber}`,
    name: line.staffLabel,
    email: `workbook-staff-${line.sequenceNumber}@demo.invalid`,
    role: profile?.role ?? 'staff',
    permissions: profile?.permissions,
    access_scopes: profile?.access_scopes,
    job_title: line.jobTitle,
    additional_roles: supplementalRoleAssignments[line.id],
    company_id: line.subsidiaryId,
    unit_id: line.operatingUnitId,
    work_location: line.workLocation,
    department: line.departmentUnit,
    categories: categoryAssignmentsByUser.get(`workbook-staff-${line.sequenceNumber}`),
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  }
})

export const WORKBOOK_ROLE_DEMO_USERS = WORKBOOK_STAFF_DIRECTORY.filter(
  (user) =>
    (user.role !== 'staff' || user.permissions?.includes('prepare_payroll')) &&
    user.id !== 'workbook-staff-047'
)

export const INITIAL_OPERATIONAL_WORK: OperationalWorkItem[] = [
  {
    id: 'op-cyber-1',
    entityId: 'gue-cyber',
    title: 'Schedule phishing-awareness programme',
    workstream: 'Cybersecurity training',
    summary: 'Prepare a customer training plan and post-session assessment.',
    status: 'in_progress',
    dueDate: '2026-12-03',
  },
  {
    id: 'op-cyber-2',
    entityId: 'gue-cyber',
    title: 'Resolve office network support request',
    workstream: 'IT service desk',
    summary: 'Track diagnosis, assigned technician, and resolution notes.',
    status: 'needs_review',
    dueDate: '2026-11-29',
  },
  {
    id: 'op-edu-1',
    entityId: 'gue-education',
    title: 'Prepare TVET learner cohort',
    workstream: 'Learner programmes',
    summary: 'Coordinate enrolment, class scheduling, attendance, and assessment readiness.',
    status: 'in_progress',
    dueDate: '2026-12-05',
  },
  {
    id: 'op-edu-2',
    entityId: 'gue-education-stc',
    title: 'Confirm skills-centre approval records',
    workstream: 'Centre readiness',
    summary: 'Reconcile the centre approval status and programme documentation.',
    status: 'needs_review',
    dueDate: '2026-11-30',
  },
  {
    id: 'op-edu-3',
    entityId: 'gue-education-cbt',
    title: 'Plan CBT centre construction and accreditation',
    workstream: 'Facility development',
    summary: 'Track the development plan and required examination-centre accreditation milestones.',
    status: 'planned',
    dueDate: '2027-01-15',
  },
  {
    id: 'op-eng-1',
    entityId: 'gue-engineering',
    title: 'Deliver internal business portal',
    workstream: 'Software project delivery',
    summary: 'Track scope, build, testing, release, and post-launch support.',
    status: 'in_progress',
    dueDate: '2026-12-12',
  },
  {
    id: 'op-eng-2',
    entityId: 'gue-engineering',
    title: 'Review cloud deployment checklist',
    workstream: 'Cloud and DevOps',
    summary: 'Validate deployment, monitoring, documentation, and handover steps.',
    status: 'needs_review',
    dueDate: '2026-12-01',
  },
  {
    id: 'op-farm-1',
    entityId: 'gue-farming',
    title: 'Plan feed production batch',
    workstream: 'Feed production',
    summary: 'Coordinate ingredient availability, production, quality checks, and packaging.',
    status: 'in_progress',
    dueDate: '2026-12-04',
  },
  {
    id: 'op-farm-2',
    entityId: 'gue-farming',
    title: 'Review crop-cycle field report',
    workstream: 'Crop production',
    summary: 'Review field progress, input usage, and harvest planning.',
    status: 'needs_review',
    dueDate: '2026-12-06',
  },
  {
    id: 'op-industrial-1',
    entityId: 'gue-industrial',
    title: 'Review contract packaging run',
    workstream: 'Manufacturing',
    summary: 'Track production-line readiness, batch checks, labeling, and packaging.',
    status: 'in_progress',
    dueDate: '2026-12-08',
  },
  {
    id: 'op-industrial-2',
    entityId: 'gue-industrial',
    title: 'Complete quality release checklist',
    workstream: 'Quality assurance',
    summary: 'Record inspection outcomes and release approval before distribution.',
    status: 'needs_review',
    dueDate: '2026-12-09',
  },
  {
    id: 'op-mobility-1',
    entityId: 'gue-mobility',
    title: 'Schedule fleet maintenance',
    workstream: 'Fleet operations',
    summary: 'Coordinate vehicle inspection, service work, parts, and return to service.',
    status: 'in_progress',
    dueDate: '2026-12-02',
  },
  {
    id: 'op-mobility-2',
    entityId: 'gue-mobility',
    title: 'Prepare vehicle refurbishment estimate',
    workstream: 'Vehicle service',
    summary: 'Track inspection findings, parts requirements, estimate, and customer approval.',
    status: 'planned',
    dueDate: '2026-12-10',
  },
  {
    id: 'op-moni-1',
    entityId: 'guemoni',
    title: 'Review sub-agent onboarding checklist',
    workstream: 'Agent network',
    summary: 'Track training, terminal assignment, and required compliance checks.',
    status: 'in_progress',
    dueDate: '2026-12-01',
  },
  {
    id: 'op-moni-2',
    entityId: 'guemoni',
    title: 'Reconcile settlement exceptions',
    workstream: 'Settlement controls',
    summary: 'Demo workflow only; transaction data remains in the authorised UBA platform.',
    status: 'needs_review',
    dueDate: '2026-11-28',
  },
  {
    id: 'op-realty-1',
    entityId: 'gue-realty',
    title: 'Update property development pipeline',
    workstream: 'Development',
    summary: 'Track land, approvals, project milestones, and delivery status.',
    status: 'in_progress',
    dueDate: '2026-12-15',
  },
  {
    id: 'op-realty-2',
    entityId: 'gue-realty',
    title: 'Complete property appraisal review',
    workstream: 'Appraisal',
    summary: 'Record valuation status and supporting document checklist.',
    status: 'planned',
    dueDate: '2026-12-07',
  },
]

export const createDemoPayrollPeriod = (
  period: string,
  id: string,
  createdAt = new Date().toISOString()
): PayrollPeriod => ({
  id,
  period,
  createdAt,
  submissions: payrollEntities.map((entity) => {
    const entityLines = CURRENT_PAYROLL_ROSTER.filter((line) => line.subsidiaryId === entity.id)
    const groupedLines = new Map<string, PayrollVoucherLine[]>()

    entityLines.forEach((line) => {
      const unitId = line.operatingUnitId ?? entity.id
      groupedLines.set(unitId, [...(groupedLines.get(unitId) ?? []), line])
    })

    if (groupedLines.size === 0) groupedLines.set(entity.id, [])

    return {
      id: `${id}-${entity.id}`,
      subsidiaryId: entity.id,
      period,
      status: 'draft',
      createdAt,
      unitEntries: Array.from(groupedLines, ([unitId, lines]) => ({
        id: `${id}-${unitId}`,
        subsidiaryId: entity.id,
        unitId,
        unitName: GROUP_ENTITIES.find((item) => item.id === unitId)?.name ?? entity.name,
        requiresUnitHeadApproval: unitId === 'gue-education-west-africa',
        status: 'draft',
        lines: lines.map((line) => ({
          ...line,
          id: `${id}-line-${line.sequenceNumber}`,
          basicSalary: 0,
          deduction: 0,
          backlog: 0,
          allowance: 0,
        })),
      })),
    }
  }),
})

const currentDate = new Date()
const currentPeriodInput = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
const currentPeriodLabel = new Intl.DateTimeFormat('en', {
  month: 'long',
  year: 'numeric',
}).format(currentDate)

export const DEMO_PAYROLL_PERIOD = createDemoPayrollPeriod(
  currentPeriodLabel,
  `PAY-DEMO-${currentPeriodInput.replace('-', '')}`,
  new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
)
