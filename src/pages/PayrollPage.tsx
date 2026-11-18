import React, { useMemo, useState } from 'react'
import { Download, Share2, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'
import { hasPermission, hasScopedPermission, canViewAllPayroll } from '@/lib/access'
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
  createDemoPayrollPeriod,
  DEMO_PAYROLL_PERIOD,
  GROUP_ENTITIES,
} from '@/services/operationsData'
import { PAYROLL_WORKBOOK_PERIOD_LABEL, PAYROLL_WORKBOOK_RECORDS } from '@/services/payrollWorkbookSeed'
import {
  PayrollPeriod,
  PayrollSubmission,
  PayrollSubmissionStatus,
  PayrollUnitEntry,
  PayrollUnitEntryStatus,
} from '@/types/operations'

type PeriodStatus = ReturnType<typeof getPayrollPeriodStatus>
type PayrollPayField = 'basicSalary' | 'deduction' | 'backlog' | 'allowance'

const periodLabels: Record<PeriodStatus, string> = {
  pending_unit_submission: 'Awaiting unit submissions',
  pending_unit_head_approval: 'Awaiting unit-head approval',
  pending_entity_approval: 'Awaiting subsidiary-head approval',
  pending_group_approval: 'Ready for group approval',
  group_approved: 'Group approved',
}

const periodVariants: Record<PeriodStatus, 'warning' | 'info' | 'success'> = {
  pending_unit_submission: 'warning',
  pending_unit_head_approval: 'warning',
  pending_entity_approval: 'warning',
  pending_group_approval: 'info',
  group_approved: 'success',
}

const submissionLabels: Record<PayrollSubmissionStatus, string> = {
  draft: 'Awaiting unit submission',
  pending_entity_approval: 'Awaiting subsidiary head',
  entity_head_approved: 'Subsidiary approved',
}

const formatNaira = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)

const isUnitReviewComplete = (entry: PayrollUnitEntry) =>
  !entry.requiresUnitHeadApproval || entry.status === 'unit_head_approved'

const isUnitEntrySubmitted = (entry: PayrollUnitEntry) =>
  entry.status === 'submitted' || entry.status === 'unit_head_approved'

export const PayrollPage: React.FC = () => {
  const { currentUser, role } = useAuth()
  const [periods, setPeriods] = useState<PayrollPeriod[]>([DEMO_PAYROLL_PERIOD])
  const [selectedPeriodId, setSelectedPeriodId] = useState(DEMO_PAYROLL_PERIOD.id)
  const [selectedCompanyId, setSelectedCompanyId] = useState('all')
  const [selectedUnitId, setSelectedUnitId] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [periodInput, setPeriodInput] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [notice, setNotice] = useState('')

  const selectedPeriod = periods.find((period) => period.id === selectedPeriodId) ?? DEMO_PAYROLL_PERIOD
  const companyNames = useMemo(
    () => new Map(GROUP_ENTITIES.map((entity) => [entity.id, entity.name])),
    []
  )
  const canViewAllCompanies = canViewAllPayroll(currentUser)
  const scopeLimited = !canViewAllCompanies
  const effectiveUnitId = canViewAllCompanies ? selectedUnitId : 'all'
  const selectedSubmissions = selectedPeriod.submissions
    .filter((submission) =>
      !canViewAllCompanies ||
      selectedCompanyId === 'all' ||
      submission.subsidiaryId === selectedCompanyId
    )
    .map((submission) => ({
      ...submission,
      unitEntries: submission.unitEntries.flatMap((entry) => {
        if (canViewAllCompanies && selectedUnitId !== 'all' && entry.unitId !== selectedUnitId) {
          return []
        }
        const lines = entry.lines.filter((line) =>
          hasScopedPermission(
            currentUser,
            'view_payroll',
            line.subsidiaryId,
            line.operatingUnitId ?? entry.unitId,
            line.workLocation
          )
        )
        const canViewEmptyEntry = entry.lines.length === 0 && hasScopedPermission(
          currentUser,
          'view_payroll',
          submission.subsidiaryId,
          entry.unitId
        )
        return lines.length > 0 || canViewEmptyEntry ? [{ ...entry, lines }] : []
      }),
    }))
    .filter((submission) => submission.unitEntries.length > 0)
  const selectedEntries = selectedSubmissions.flatMap((submission) =>
    submission.unitEntries.filter(
      (entry) => effectiveUnitId === 'all' || entry.unitId === effectiveUnitId
    )
  )
  const selectedLines = selectedEntries.flatMap((entry) => entry.lines)
  const visiblePeriod = { ...selectedPeriod, submissions: selectedSubmissions }
  const periodStatus = getPayrollPeriodStatus(visiblePeriod)
  const approvedSubmissionCount = selectedSubmissions.filter(
    (submission) => submission.status === 'entity_head_approved'
  ).length
  const requiredUnitEntries = selectedSubmissions.flatMap((submission) =>
    submission.unitEntries.filter((entry) => entry.requiresUnitHeadApproval)
  )
  const unitSubmissionsComplete = selectedSubmissions.every((submission) =>
    submission.unitEntries.every(isUnitEntrySubmitted)
  )
  const unitApprovalsComplete = requiredUnitEntries.every(isUnitReviewComplete)
  const entityApprovalsComplete =
    selectedSubmissions.length > 0 &&
    approvedSubmissionCount === selectedSubmissions.length
  const payrollIsConsolidated = canViewAllCompanies && selectedCompanyId === 'all'
  const totals = selectedLines.reduce(
    (sum, line) => ({
      basic: sum.basic + line.basicSalary,
      deductions: sum.deductions + line.deduction,
      backlog: sum.backlog + line.backlog,
      allowances: sum.allowances + line.allowance,
      net: sum.net + calculatePayrollNet(line),
    }),
    { basic: 0, deductions: 0, backlog: 0, allowances: 0, net: 0 }
  )
  const canCreatePeriod = hasPermission(currentUser, 'create_payroll_period')
  const canDownload =
    selectedLines.length > 0 &&
    hasPermission(currentUser, 'export_payroll') &&
    (payrollIsConsolidated
      ? periodStatus === 'group_approved'
      : selectedSubmissions.every((submission) => submission.status === 'entity_head_approved'))
  const canShare = canDownload

  const updatePeriods = (
    update: (period: PayrollPeriod) => PayrollPeriod
  ) => {
    setPeriods((items) => items.map((period) => (
      period.id === selectedPeriod.id ? update(period) : period
    )))
  }

  const updatePayrollValue = (
    submission: PayrollSubmission,
    entry: PayrollUnitEntry,
    lineId: string,
    field: PayrollPayField,
    rawValue: string
  ) => {
    if (!canEditPayrollUnit(currentUser, entry)) return
    const value = Math.max(0, Math.round(Number(rawValue) || 0))

    updatePeriods((period) => ({
      ...period,
      submissions: period.submissions.map((item) =>
        item.id !== submission.id
          ? item
          : {
              ...item,
              unitEntries: item.unitEntries.map((unitEntry) =>
                unitEntry.id !== entry.id
                  ? unitEntry
                  : {
                      ...unitEntry,
                      lines: unitEntry.lines.map((line) =>
                        line.id === lineId ? { ...line, [field]: value } : line
                      ),
                    }
              ),
            }
      ),
    }))
  }

  const submitUnitEntry = (submission: PayrollSubmission, entry: PayrollUnitEntry) => {
    if (!canSubmitPayrollUnit(currentUser, entry)) return
    const nextStatus: PayrollUnitEntryStatus = entry.requiresUnitHeadApproval
      ? 'pending_unit_head_approval'
      : 'submitted'

    updatePeriods((period) => ({
      ...period,
      submissions: period.submissions.map((item) => {
        if (item.id !== submission.id) return item
        const unitEntries: PayrollUnitEntry[] = item.unitEntries.map((unitEntry) =>
          unitEntry.id === entry.id
            ? { ...unitEntry, status: nextStatus, submittedAt: new Date().toISOString() }
            : unitEntry
        )
        return {
          ...item,
          status: unitEntries.every(isUnitEntrySubmitted)
            ? 'pending_entity_approval'
            : item.status,
          unitEntries,
        }
      }),
    }))
    setNotice(
      entry.requiresUnitHeadApproval
        ? `${entry.unitName} payroll sent to its unit head for approval.`
        : `${entry.unitName} payroll submitted to the subsidiary head.`
    )
  }

  const approveUnitEntry = (submission: PayrollSubmission, entry: PayrollUnitEntry) => {
    if (!canApproveUnitPayroll(currentUser, entry)) return
    const approval = {
      userId: currentUser.id,
      userName: currentUser.name,
      approvedAt: new Date().toISOString(),
    }
    const approvedUnitStatus: PayrollUnitEntryStatus = 'unit_head_approved'

    updatePeriods((period) => ({
      ...period,
      submissions: period.submissions.map((item) => {
        if (item.id !== submission.id) return item
        const unitEntries: PayrollUnitEntry[] = item.unitEntries.map((unitEntry) =>
          unitEntry.id === entry.id
            ? { ...unitEntry, status: approvedUnitStatus, unitApproval: approval }
            : unitEntry
        )
        return {
          ...item,
          status: unitEntries.every(isUnitEntrySubmitted)
            ? 'pending_entity_approval'
            : item.status,
          unitEntries,
        }
      }),
    }))
    setNotice(`${entry.unitName} payroll approved by its unit head.`)
  }

  const approveEntityPayroll = (submission: PayrollSubmission) => {
    if (!canApproveEntityPayroll(currentUser, submission)) return
    updatePeriods((period) => ({
      ...period,
      submissions: period.submissions.map((item) =>
        item.id === submission.id
          ? {
              ...item,
              status: 'entity_head_approved',
              entityApproval: {
                userId: currentUser.id,
                userName: currentUser.name,
                approvedAt: new Date().toISOString(),
              },
            }
          : item
      ),
    }))
    setNotice(`${companyNames.get(submission.subsidiaryId)} payroll approved at subsidiary level.`)
  }

  const approveGroupPayroll = async () => {
    if (!canApproveGroupPayroll(currentUser, selectedPeriod)) return

    try {
      const approvedPeriod = await api.payroll.approveGroup(selectedPeriod, currentUser)
      updatePeriods(() => approvedPeriod)
      setNotice(
        approvedPeriod.payslipDelivery?.status === 'sent'
          ? `Group payroll approved; payslips sent to ${approvedPeriod.payslipDelivery.recipientCount} staff members. No payment was initiated.`
          : `Group payroll approved; payslip delivery is simulated for ${approvedPeriod.payslipDelivery?.recipientCount ?? 0} staff members in this demo. No payment was initiated.`
      )
    } catch (error) {
      setNotice(error instanceof Error ? `Unable to approve payroll: ${error.message}` : 'Unable to approve payroll.')
    }
  }

  const createPeriod = (event: React.FormEvent) => {
    event.preventDefault()
    const [year, month] = periodInput.split('-').map(Number)
    if (!year || month < 1 || month > 12) {
      setNotice('Enter a valid payroll period.')
      return
    }

    const label = new Intl.DateTimeFormat('en', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month - 1, 1))
    if (periods.some((period) => period.period === label)) {
      setNotice(`${label} already exists in this demo.`)
      return
    }

    const id = `PAY-DEMO-${periodInput.replace('-', '')}-${Date.now()}`
    const nextPeriod = createDemoPayrollPeriod(label, id)
    setPeriods((items) => [nextPeriod, ...items])
    setSelectedPeriodId(nextPeriod.id)
    setSelectedCompanyId('all')
    setSelectedUnitId('all')
    setCreateOpen(false)
    setNotice('New current-month roster created with pay values zeroed. Unit submissions are pending.')
  }

  const createCsvFile = () => {
    const visibleCompanyIds = Array.from(
      new Set(selectedSubmissions.map((submission) => submission.subsidiaryId))
    )
    const companyLabel = payrollIsConsolidated
      ? 'GUE-Group'
      : visibleCompanyIds.length === 1
        ? companyNames.get(visibleCompanyIds[0]) ?? 'GUE-Subsidiary'
        : 'GUE-Scoped'
    const filename = `${companyLabel}-${selectedPeriod.period}-payroll.csv`
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, '-')
    const csv = payrollLinesToCsv(
      selectedLines,
      (subsidiaryId) => companyNames.get(subsidiaryId) ?? subsidiaryId
    )
    return new File([csv], filename, { type: 'text/csv;charset=utf-8' })
  }

  const downloadPayroll = () => {
    if (!canDownload) return
    const file = createCsvFile()
    const url = URL.createObjectURL(file)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.name
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice(`Downloaded ${file.name}.`)
  }

  const sharePayroll = async () => {
    if (!canShare) return
    const file = createCsvFile()
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${selectedPeriod.period} payroll`, files: [file] })
        setNotice('Payroll CSV shared using the browser share sheet.')
        return
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(await file.text())
        setNotice('Payroll CSV copied to the clipboard. Share it only through an approved channel.')
        return
      }
      setNotice('Sharing is not supported in this browser. Download the CSV instead.')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setNotice(
        error instanceof Error ? `Unable to share payroll: ${error.message}` : 'Unable to share payroll.'
      )
    }
  }

  if (
    !hasPermission(currentUser, 'view_payroll') ||
    (scopeLimited &&
      !currentUser.access_scopes?.length &&
      !currentUser.company_id)
  ) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-lg font-bold text-slate-900">Payroll access</h2>
        <p className="mt-2 text-sm text-slate-500">
          Payroll records are limited to configured payroll, HR, and approval demo personas.
        </p>
      </Card>
    )
  }

  const referenceLines = PAYROLL_WORKBOOK_RECORDS.filter(
    (line) =>
      hasScopedPermission(
        currentUser,
        'view_payroll',
        line.subsidiaryId,
        line.operatingUnitId ?? line.subsidiaryId,
        line.workLocation
      ) &&
      (!canViewAllCompanies ||
        selectedCompanyId === 'all' ||
        line.subsidiaryId === selectedCompanyId) &&
      (!canViewAllCompanies ||
        selectedUnitId === 'all' ||
        line.operatingUnitId === selectedUnitId)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Payroll</h2>
            <Badge variant="outline">Development demo</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Unit submissions roll up to subsidiary review, then into the central group preview.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreatePeriod && (
            <Button onClick={() => setCreateOpen(true)}>Create payroll period</Button>
          )}
          <Button variant="outline" onClick={downloadPayroll} disabled={!canDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
          <Button variant="outline" onClick={sharePayroll} disabled={!canShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share payroll
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        The workbook roster and {PAYROLL_WORKBOOK_PERIOD_LABEL} payroll reference are included in
        client-side development data. The active period starts with zero pay values; account numbers
        and signatures are placeholders. Do not deploy this frontend publicly or use it for real
        approvals/payments.
      </div>

      {notice && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700" aria-live="polite">
          {notice}
        </p>
      )}

      <Card>
        <CardHeader className="gap-4 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Payroll approval flow</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              {approvedSubmissionCount} of {selectedSubmissions.length} company submissions
              approved for {selectedPeriod.period}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Select payroll period"
              value={selectedPeriodId}
              onChange={(event) => {
                setSelectedPeriodId(event.target.value)
                setNotice('')
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              {periods.map((period) => (
                <option key={period.id} value={period.id}>{period.period}</option>
              ))}
            </select>
            <Badge variant={periodVariants[periodStatus]}>{periodLabels[periodStatus]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <ApprovalStep
              title="Unit submission"
              description="Preparers enter current-period values and submit their unit roster."
              complete={unitSubmissionsComplete}
            />
            <ApprovalStep
              title="Unit-head review"
              description="West Africa Schools requires its unit head's approval before Education review."
              complete={unitApprovalsComplete}
            />
            <ApprovalStep
              title="Company approval"
              description="Each company head reviews the prepared company payroll."
              complete={entityApprovalsComplete}
            />
            <ApprovalStep
              title="Group approval"
              description={
                selectedPeriod.groupApproval
                  ? `Approved by ${selectedPeriod.groupApproval.userName}`
                  : 'The group head gives final approval after all company approvals.'
              }
              complete={periodStatus === 'group_approved'}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-sm font-bold text-slate-900">Central payroll preview</p>
              <p className="mt-1 text-xs text-slate-500">
                {periodStatus === 'pending_unit_submission'
                  ? 'Waiting for unit preparers to submit their current-period entries.'
                  : periodStatus === 'pending_unit_head_approval'
                    ? 'A unit-head approval is required before company review.'
                    : periodStatus === 'pending_entity_approval'
                      ? 'Company payroll is visible centrally while company-head approvals are pending.'
                      : periodStatus === 'pending_group_approval'
                        ? 'All companies are approved. The group head can finalize the consolidated payroll.'
                        : `Group approved by ${selectedPeriod.groupApproval?.userName}.`}
              </p>
            </div>
            {role === 'group_head' && (
              <Button
                onClick={approveGroupPayroll}
                disabled={!canApproveGroupPayroll(currentUser, selectedPeriod)}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Approve consolidated payroll
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Company</th>
                  <th className="px-3 py-3 text-right">Employees</th>
                  <th className="px-3 py-3 text-right">Net total</th>
                  <th className="px-3 py-3">Company approval</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedSubmissions.map((submission) => {
                  const lines = getPayrollSubmissionLines(submission)
                  const pendingUnitHead = submission.unitEntries.some(
                    (entry) => entry.status === 'pending_unit_head_approval'
                  )
                  const label = pendingUnitHead
                    ? 'Awaiting unit head'
                    : submissionLabels[submission.status]
                  const variant =
                    submission.status === 'entity_head_approved'
                      ? 'success'
                      : submission.status === 'pending_entity_approval'
                        ? 'info'
                        : 'warning'

                  return (
                    <tr key={submission.id}>
                      <td className="px-3 py-3 font-semibold text-slate-900">
                        {companyNames.get(submission.subsidiaryId)}
                      </td>
                      <td className="px-3 py-3 text-right">{lines.length}</td>
                      <td className="px-3 py-3 text-right">
                        {formatNaira(lines.reduce((sum, line) => sum + calculatePayrollNet(line), 0))}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={variant}>{label}</Badge>
                        {submission.entityApproval && (
                          <p className="mt-1 text-[10px] text-slate-500">
                            {submission.entityApproval.userName}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {canApproveEntityPayroll(currentUser, submission) ? (
                          <Button size="sm" onClick={() => approveEntityPayroll(submission)}>
                            Approve company payroll
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {payrollIsConsolidated && (
                <tfoot className="border-t border-slate-200 bg-slate-50 font-bold text-slate-900">
                  <tr>
                    <td className="px-3 py-3">Central total</td>
                    <td className="px-3 py-3 text-right">
                      {selectedSubmissions.reduce(
                        (sum, submission) => sum + getPayrollSubmissionLines(submission).length,
                        0
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">{formatNaira(
                      selectedSubmissions.reduce(
                        (sum, submission) =>
                          sum + getPayrollSubmissionLines(submission).reduce(
                            (lineSum, line) => lineSum + calculatePayrollNet(line),
                            0
                          ),
                        0
                      )
                    )}</td>
                    <td colSpan={2} className="px-3 py-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{payrollIsConsolidated ? 'Consolidated payroll records' : 'Company payroll records'}</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Current-period roster is preloaded from the workbook with pay values zeroed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!scopeLimited && (
              <select
                aria-label="Filter payroll by company"
                value={selectedCompanyId}
                onChange={(event) => {
                  setSelectedCompanyId(event.target.value)
                  setSelectedUnitId('all')
                }}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="all">All companies — consolidated</option>
                {selectedPeriod.submissions.map((submission) => (
                  <option key={submission.subsidiaryId} value={submission.subsidiaryId}>
                    {companyNames.get(submission.subsidiaryId)}
                  </option>
                ))}
              </select>
            )}
            {!scopeLimited && (
              <select
                aria-label="Filter payroll by operating unit"
                value={selectedUnitId}
                onChange={(event) => setSelectedUnitId(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="all">All operating units</option>
                {Array.from(new Map(
                  selectedPeriod.submissions
                    .filter((submission) =>
                      selectedCompanyId === 'all' ||
                      submission.subsidiaryId === selectedCompanyId
                    )
                    .flatMap((submission) => submission.unitEntries)
                    .map((entry) => [entry.unitId, entry.unitName])
                )).map(([unitId, unitName]) => (
                  <option key={unitId} value={unitId}>{unitName}</option>
                ))}
              </select>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          {selectedSubmissions.map((submission) => (
            <div key={submission.id} className="space-y-4 rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {companyNames.get(submission.subsidiaryId)}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {submission.period} · {getPayrollSubmissionLines(submission).length} roster rows
                  </p>
                </div>
              </div>

              {submission.unitEntries
                .filter((entry) => effectiveUnitId === 'all' || entry.unitId === effectiveUnitId)
                .map((entry) => {
                  const canEdit = canEditPayrollUnit(currentUser, entry)
                  const canSubmit = canSubmitPayrollUnit(currentUser, entry)
                  const canApproveUnit = canApproveUnitPayroll(currentUser, entry)
                  const unitStatusLabel =
                    entry.status === 'pending_unit_head_approval'
                      ? 'Awaiting unit head'
                      : entry.status === 'unit_head_approved'
                        ? 'Unit head approved'
                        : entry.status === 'submitted'
                          ? 'Submitted to company head'
                          : 'Draft'

                  return (
                    <section key={entry.id} className="space-y-3 rounded-xl bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{entry.unitName}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {entry.lines.length} employees · {unitStatusLabel}
                            {entry.unitApproval ? ` · approved by ${entry.unitApproval.userName}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {canSubmit && (
                            <Button size="sm" onClick={() => submitUnitEntry(submission, entry)}>
                              Submit unit payroll
                            </Button>
                          )}
                          {canApproveUnit && (
                            <Button size="sm" onClick={() => approveUnitEntry(submission, entry)}>
                              Approve unit payroll
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full min-w-[1450px] text-left text-xs">
                          <thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-3 py-3">S/N</th>
                              <th className="px-3 py-3">Staff name</th>
                              <th className="px-3 py-3">Job description</th>
                              <th className="px-3 py-3">Date of entry</th>
                              <th className="px-3 py-3">Department / unit</th>
                              <th className="px-3 py-3">Work location</th>
                              <th className="px-3 py-3 text-right">Basic</th>
                              <th className="px-3 py-3 text-right">Deduction</th>
                              <th className="px-3 py-3 text-right">Backlog</th>
                              <th className="px-3 py-3 text-right">Allowance</th>
                              <th className="px-3 py-3 text-right">Net salary</th>
                              <th className="px-3 py-3">Bank (demo)</th>
                              <th className="px-3 py-3">Account (dummy)</th>
                              <th className="px-3 py-3">Signature</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {entry.lines.map((line) => (
                              <tr key={line.id}>
                                <td className="px-3 py-3">{line.sequenceNumber}</td>
                                <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-900">
                                  {line.staffLabel}
                                </td>
                                <td className="px-3 py-3">{line.jobTitle}</td>
                                <td className="whitespace-nowrap px-3 py-3">{line.dateOfEntry}</td>
                                <td className="px-3 py-3">{line.departmentUnit}</td>
                                <td className="whitespace-nowrap px-3 py-3">{line.workLocation}</td>
                                <EditableMoneyCell
                                  value={line.basicSalary}
                                  editable={canEdit}
                                  onChange={(value) => updatePayrollValue(submission, entry, line.id, 'basicSalary', value)}
                                />
                                <EditableMoneyCell
                                  value={line.deduction}
                                  editable={canEdit}
                                  onChange={(value) => updatePayrollValue(submission, entry, line.id, 'deduction', value)}
                                />
                                <EditableMoneyCell
                                  value={line.backlog}
                                  editable={canEdit}
                                  onChange={(value) => updatePayrollValue(submission, entry, line.id, 'backlog', value)}
                                />
                                <EditableMoneyCell
                                  value={line.allowance}
                                  editable={canEdit}
                                  onChange={(value) => updatePayrollValue(submission, entry, line.id, 'allowance', value)}
                                />
                                <MoneyCell value={calculatePayrollNet(line)} strong />
                                <td className="px-3 py-3">{line.bankName}</td>
                                <td className="whitespace-nowrap px-3 py-3 font-mono">
                                  {line.accountNumber} <span className="text-amber-700">· dummy</span>
                                </td>
                                <td className="px-3 py-3 text-slate-500">{line.signature}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )
                })}
            </div>
          ))}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <TotalCard label="Basic salary" value={totals.basic} />
            <TotalCard label="Deductions" value={totals.deductions} />
            <TotalCard label="Backlog" value={totals.backlog} />
            <TotalCard label="Allowances" value={totals.allowances} />
            <TotalCard label="Net salary" value={totals.net} emphasized />
          </div>

          <details className="rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer text-xs font-bold text-slate-800">
              Read-only workbook reference — {PAYROLL_WORKBOOK_PERIOD_LABEL} ({referenceLines.length} rows)
            </summary>
            <p className="mt-2 text-[11px] text-slate-500">
              Historical pay values are shown for payload-shape development only. This is not an
              approval record; current-period entry begins at zero.
            </p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1200px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3">S/N</th>
                    <th className="px-3 py-3">Staff name</th>
                    <th className="px-3 py-3">Company / unit</th>
                    <th className="px-3 py-3">Job description</th>
                    <th className="px-3 py-3 text-right">Basic</th>
                    <th className="px-3 py-3 text-right">Deduction</th>
                    <th className="px-3 py-3 text-right">Backlog</th>
                    <th className="px-3 py-3 text-right">Allowance</th>
                    <th className="px-3 py-3 text-right">Net salary</th>
                    <th className="px-3 py-3">Account (dummy)</th>
                    <th className="px-3 py-3">Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referenceLines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-3 py-3">{line.sequenceNumber}</td>
                      <td className="px-3 py-3 font-semibold">{line.staffLabel}</td>
                      <td className="px-3 py-3">
                        {companyNames.get(line.subsidiaryId)} · {GROUP_ENTITIES.find((entity) => entity.id === line.operatingUnitId)?.name ?? line.departmentUnit}
                      </td>
                      <td className="px-3 py-3">{line.jobTitle}</td>
                      <MoneyCell value={line.basicSalary} />
                      <MoneyCell value={line.deduction} />
                      <MoneyCell value={line.backlog} />
                      <MoneyCell value={line.allowance} />
                      <MoneyCell value={calculatePayrollNet(line)} strong />
                      <td className="px-3 py-3 font-mono">{line.accountNumber}</td>
                      <td className="px-3 py-3 text-slate-500">{line.signature}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          <p className="text-[11px] text-slate-500">
            Net salary = basic salary − deduction + backlog + allowance. Approval state is local
            demo state only; production requires server-side authorization, persistence, audit logs,
            and protected payroll sharing.
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create payroll period"
        description="Loads the workbook staff roster and starts all pay fields at zero."
      >
        <form onSubmit={createPeriod} className="space-y-4">
          <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
            <span>Pay period</span>
            <input
              type="month"
              required
              value={periodInput}
              onChange={(event) => setPeriodInput(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit">Create period</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

const ApprovalStep: React.FC<{
  title: string
  description: string
  complete: boolean
}> = ({ title, description, complete }) => (
  <div className="rounded-xl border border-slate-200 p-4">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-bold text-slate-900">{title}</p>
      <Badge variant={complete ? 'success' : 'secondary'}>{complete ? 'Complete' : 'Pending'}</Badge>
    </div>
    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{description}</p>
  </div>
)

const TotalCard: React.FC<{ label: string; value: number; emphasized?: boolean }> = ({
  label,
  value,
  emphasized,
}) => (
  <div className={`rounded-2xl border p-4 ${emphasized ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-2 text-sm font-extrabold ${emphasized ? 'text-emerald-700' : 'text-slate-900'}`}>
      {formatNaira(value)}
    </p>
  </div>
)

const MoneyCell: React.FC<{ value: number; strong?: boolean }> = ({ value, strong }) => (
  <td className={`whitespace-nowrap px-3 py-3 text-right ${strong ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
    {formatNaira(value)}
  </td>
)

const EditableMoneyCell: React.FC<{
  value: number
  editable: boolean
  onChange: (value: string) => void
}> = ({ value, editable, onChange }) => (
  <td className="whitespace-nowrap px-3 py-3 text-right">
    {editable ? (
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Payroll amount"
        className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-right"
      />
    ) : (
      formatNaira(value)
    )}
  </td>
)
