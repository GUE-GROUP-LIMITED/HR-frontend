import type { UserRole } from '@/types'

export type GroupEntityType = 'holding' | 'subsidiary' | 'operating_unit'

export type EntityOperationalStatus = 'active' | 'in_development' | 'verify_status'

export interface GroupEntity {
  id: string
  name: string
  type: GroupEntityType
  sector: string
  status: EntityOperationalStatus
  domains: string[]
  locations?: string[]
  description: string
  operatingAreas: string[]
  parentId?: string
}

export type OperationalWorkStatus = 'planned' | 'in_progress' | 'needs_review' | 'complete'

export interface OperationalWorkItem {
  id: string
  entityId: string
  title: string
  workstream: string
  summary: string
  status: OperationalWorkStatus
  dueDate?: string
}

export type MeetingAudience = 'scoped_team' | 'company_managers_hq' | 'group_wide'
export type MeetingInviteStatus = 'invited' | 'pending_response' | 'accepted' | 'declined'

export interface MeetingInvitee {
  user_id: string
  user_name: string
  user_role: UserRole
  status: MeetingInviteStatus
  responded_at?: string
}

export interface StaffMeeting {
  id: string
  kind: 'meeting' | 'event'
  title: string
  description: string
  starts_at: string
  ends_at: string
  location?: string
  organizer_id: string
  organizer_name: string
  organizer_role: UserRole
  source_company_id: string
  source_unit_id?: string
  source_work_location?: string
  audience: MeetingAudience
  include_branch_managers: boolean
  higher_invite_reason?: string
  invitees: MeetingInvitee[]
  created_at: string
}

export type TerminationRequestStatus =
  | 'pending_hr'
  | 'pending_executive'
  | 'approved'
  | 'rejected'

export interface StaffTerminationApproval {
  step: 'hr' | 'executive'
  decision: 'approved' | 'rejected'
  user_id: string
  user_name: string
  decided_at: string
  note?: string
}

export interface StaffTerminationRequest {
  id: string
  staff_id: string
  staff_name: string
  company_id: string
  unit_id?: string
  work_location?: string
  reason: string
  requested_by: string
  requester_name: string
  status: TerminationRequestStatus
  approvals: StaffTerminationApproval[]
  created_at: string
  updated_at: string
  completed_at?: string
  letter_text?: string
  email_status?: 'sent' | 'simulated'
}

export type PayrollSubmissionStatus =
  | 'draft'
  | 'pending_entity_approval'
  | 'entity_head_approved'

export interface PayrollVoucherLine {
  id: string
  sequenceNumber: number
  staffLabel: string
  basicSalary: number
  deduction: number
  backlog: number
  allowance: number
  subsidiaryId: string
  operatingUnitId?: string
  workLocation?: string
  jobTitle: string
  dateOfEntry: string
  departmentUnit: string
  bankName: string
  accountNumber: string
  signature: string
}

export type PayrollUnitEntryStatus =
  | 'draft'
  | 'pending_unit_head_approval'
  | 'unit_head_approved'
  | 'submitted'

export interface PayrollUnitEntry {
  id: string
  subsidiaryId: string
  unitId: string
  unitName: string
  requiresUnitHeadApproval: boolean
  status: PayrollUnitEntryStatus
  lines: PayrollVoucherLine[]
  submittedAt?: string
  unitApproval?: PayrollApproval
}

export interface PayrollApproval {
  userId: string
  userName: string
  approvedAt: string
}

export interface PayrollSubmission {
  id: string
  subsidiaryId: string
  period: string
  status: PayrollSubmissionStatus
  unitEntries: PayrollUnitEntry[]
  createdAt: string
  entityApproval?: PayrollApproval
}

export interface PayrollPeriod {
  id: string
  period: string
  submissions: PayrollSubmission[]
  createdAt: string
  groupApproval?: PayrollApproval
  payslipDelivery?: {
    status: 'sent' | 'simulated'
    recipientCount: number
    sentAt: string
  }
}
