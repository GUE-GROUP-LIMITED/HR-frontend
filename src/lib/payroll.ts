import { User } from '@/types'
import {
  PayrollPeriod,
  PayrollSubmission,
  PayrollUnitEntry,
  PayrollVoucherLine,
} from '@/types/operations'
import { hasPermission, hasScopedPermission } from '@/lib/access'

export function calculatePayrollNet(line: PayrollVoucherLine): number {
  return line.basicSalary - line.deduction + line.backlog + line.allowance
}

export function getPayrollPeriodStatus(
  period: PayrollPeriod
):
  | 'pending_unit_submission'
  | 'pending_unit_head_approval'
  | 'pending_entity_approval'
  | 'pending_group_approval'
  | 'group_approved' {
  if (period.groupApproval) return 'group_approved'
  if (
    period.submissions.length > 0 &&
    period.submissions.every((submission) => submission.status === 'entity_head_approved')
  ) {
    return 'pending_group_approval'
  }
  if (
    period.submissions.some((submission) =>
      submission.unitEntries.some((entry) => entry.status === 'pending_unit_head_approval')
    )
  ) {
    return 'pending_unit_head_approval'
  }
  if (period.submissions.some((submission) => submission.status === 'pending_entity_approval')) {
    return 'pending_entity_approval'
  }
  return 'pending_unit_submission'
}

export function getPayrollSubmissionLines(submission: PayrollSubmission): PayrollVoucherLine[] {
  return submission.unitEntries.flatMap((entry) => entry.lines)
}

export function canEditPayrollUnit(
  user: User,
  entry: PayrollUnitEntry
): boolean {
  return (
    hasScopedPermission(user, 'prepare_payroll', entry.subsidiaryId, entry.unitId) &&
    entry.status === 'draft'
  )
}

export function canSubmitPayrollUnit(
  user: User,
  entry: PayrollUnitEntry
): boolean {
  return canEditPayrollUnit(user, entry)
}

export function canApproveUnitPayroll(
  user: User,
  entry: PayrollUnitEntry
): boolean {
  return (
    hasScopedPermission(user, 'approve_unit_payroll', entry.subsidiaryId, entry.unitId) &&
    entry.status === 'pending_unit_head_approval'
  )
}

export function canApproveEntityPayroll(
  user: User,
  submission: PayrollSubmission
): boolean {
  return (
    hasScopedPermission(user, 'approve_entity_payroll', submission.subsidiaryId) &&
    submission.status === 'pending_entity_approval'
  )
}

export function canApproveGroupPayroll(user: User, period: PayrollPeriod): boolean {
  return (
    user.role === 'group_head' &&
    hasPermission(user, 'approve_group_payroll') &&
    getPayrollPeriodStatus(period) === 'pending_group_approval'
  )
}

function csvCell(value: string | number): string {
  const text = String(value)
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safeText.replace(/"/g, '""')}"`
}

export function payrollLinesToCsv(
  lines: PayrollVoucherLine[],
  subsidiaryName: (id: string) => string
): string {
  const rows: (string | number)[][] = [
    [
      'S/N',
      'Staff name',
      'Basic salary',
      'Deduction',
      'Backlog',
      'Allowance',
      'Net salary',
      'Subsidiary',
      'Job description',
      'Date of entry',
      'Department / unit',
      'Work location',
      'Bank',
      'Account number',
      'Signature',
    ],
    ...lines.map((line) => [
      line.sequenceNumber,
      line.staffLabel,
      line.basicSalary,
      line.deduction,
      line.backlog,
      line.allowance,
      calculatePayrollNet(line),
      subsidiaryName(line.subsidiaryId),
      line.jobTitle,
      line.dateOfEntry,
      line.departmentUnit,
      line.workLocation ?? '',
      line.bankName,
      line.accountNumber,
      line.signature,
    ]),
  ]

  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}
