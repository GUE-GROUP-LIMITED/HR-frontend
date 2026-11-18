import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  UserPlus,
  Search,
  RefreshCw,
  ArrowRightLeft,
  Pencil,
  UserRoundX,
  Award,
} from 'lucide-react'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Dialog } from '@/components/ui/dialog'
import { User } from '@/types'
import {
  CreateStaffPayload,
  StaffTerminationDecision,
  StaffTransferPayload,
  UpdateStaffPayload,
} from '@/types/api'
import { GROUP_DEPARTMENTS, GROUP_ENTITIES, WORKBOOK_STAFF_DIRECTORY } from '@/services/operationsData'
import { canManageStaffMember, canViewStaffMember, hasPermission, hasScopedPermission } from '@/lib/access'
import { useAuth } from '@/contexts/AuthContext'
import { StaffTerminationRequest } from '@/types/operations'

type StaffAction = 'edit' | 'transfer' | 'promote' | 'terminate'

const STAFF_DEPARTMENTS = Array.from(new Set([
  ...GROUP_DEPARTMENTS,
  ...WORKBOOK_STAFF_DIRECTORY.map((staff) => staff.department).filter(
    (department): department is string => Boolean(department)
  ),
])).sort()

export const StaffManagementPage: React.FC = () => {
  const { currentUser } = useAuth()
  const canManageStaff = hasPermission(currentUser, 'manage_staff')
  const canViewMonitoring = hasPermission(currentUser, 'view_monitoring')
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [staffAction, setStaffAction] = useState<{ staff: User; action: StaffAction } | null>(null)
  const [actionNotice, setActionNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [editValues, setEditValues] = useState<UpdateStaffPayload>({})
  const [transferValues, setTransferValues] = useState({
    unit_id: '',
    work_location: '',
    department: '',
    job_title: '',
    effective_date: '',
    reason: '',
  })
  const [promotionValues, setPromotionValues] = useState({
    new_job_title: '',
    effective_date: '',
    reason: '',
  })
  const [terminationReason, setTerminationReason] = useState('')

  // New staff form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [department, setDepartment] = useState('Talent Acquisition')
  const [jobTitle, setJobTitle] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const { data: staffList, isLoading } = useQuery({
    queryKey: ['staff', { search, departmentFilter }],
    queryFn: () =>
      api.staff.list({
        q: search,
        department: departmentFilter === 'all' ? undefined : departmentFilter,
      }),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  })

  const { data: monitoringStaff } = useQuery({
    queryKey: ['monitoring', 'staff'],
    queryFn: () => api.monitoring.getStaffList(),
    enabled: canViewMonitoring,
  })

  const { data: terminationRequests } = useQuery({
    queryKey: ['staff-termination-requests', currentUser.id],
    queryFn: () => api.staff.listTerminationRequests(currentUser),
  })

  const searchText = search.trim().toLowerCase()
  const workbookStaffList = WORKBOOK_STAFF_DIRECTORY.filter((staff) => {
    if (!canViewStaffMember(currentUser, staff)) return false
    const matchesDepartment =
      departmentFilter === 'all' || staff.department === departmentFilter
    const matchesSearch =
      !searchText ||
      [staff.name, staff.job_title, staff.department, staff.work_location, staff.email]
        .some((value) => value?.toLowerCase().includes(searchText))

    return matchesDepartment && matchesSearch
  })
  const directoryStaff = [...new Map(
    [
      ...workbookStaffList,
      ...(staffList ?? []).filter((staff) => canViewStaffMember(currentUser, staff)),
    ].map((staff) => [staff.id, staff])
  ).values()]
  const canManageAnyVisibleStaff = directoryStaff.some((staff) =>
    canManageStaffMember(currentUser, staff)
  )

  // Create staff mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateStaffPayload) => api.staff.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      setIsAddModalOpen(false)
      setName('')
      setEmail('')
      setPhone('')
      setSelectedCategories([])
      setJobTitle('')
    },
  })

  const refreshStaff = () => {
    queryClient.invalidateQueries({ queryKey: ['staff'] })
    queryClient.invalidateQueries({ queryKey: ['staff-termination-requests'] })
  }

  const updateStaffMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStaffPayload }) =>
      api.staff.update(id, payload, currentUser),
    onSuccess: () => {
      refreshStaff()
      setStaffAction(null)
      setActionNotice('Staff profile updated.')
      setActionError('')
    },
    onError: (error) => setActionError(error instanceof Error ? error.message : 'Unable to update staff profile.'),
  })

  const transferStaffMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StaffTransferPayload }) =>
      api.staff.transfer(id, payload, currentUser),
    onSuccess: ({ staff }) => {
      refreshStaff()
      setStaffAction(null)
      setActionNotice(`${staff.name} transferred. The transfer letter email is simulated in this demo.`)
      setActionError('')
    },
    onError: (error) => setActionError(error instanceof Error ? error.message : 'Unable to transfer staff.'),
  })

  const promoteStaffMutation = useMutation({
    mutationFn: ({ id, payload }: {
      id: string
      payload: { new_job_title: string; effective_date: string; reason: string }
    }) => api.staff.promote(id, payload, currentUser),
    onSuccess: (staff) => {
      refreshStaff()
      setStaffAction(null)
      setActionNotice(`${staff.name}'s promotion was recorded.`)
      setActionError('')
    },
    onError: (error) => setActionError(error instanceof Error ? error.message : 'Unable to record promotion.'),
  })

  const requestTerminationMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.staff.requestTermination(id, reason, currentUser),
    onSuccess: () => {
      refreshStaff()
      setStaffAction(null)
      setActionNotice('Termination request submitted for HR review. Staff access remains active until final approval.')
      setActionError('')
    },
    onError: (error) => setActionError(error instanceof Error ? error.message : 'Unable to submit termination request.'),
  })

  const decideTerminationMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: StaffTerminationDecision }) =>
      api.staff.decideTermination(id, decision, currentUser),
    onSuccess: (request) => {
      refreshStaff()
      setActionNotice(
        request.status === 'approved'
          ? 'Termination approved. Staff access has been deactivated; letter email is simulated in this demo.'
          : request.status === 'pending_executive'
            ? 'HR review completed. Executive approval is now required.'
            : 'Termination request was declined.'
      )
      setActionError('')
    },
    onError: (error) => setActionError(error instanceof Error ? error.message : 'Unable to review termination request.'),
  })

  const openStaffAction = (action: StaffAction, staff: User) => {
    const today = new Date().toISOString().slice(0, 10)
    setActionNotice('')
    setActionError('')
    setStaffAction({ action, staff })
    setEditValues({
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      department: staff.department,
      job_title: staff.job_title,
      ...(currentUser.role === 'hr' || currentUser.role === 'super_admin'
        ? { date_of_birth: staff.date_of_birth, hire_date: staff.hire_date }
        : {}),
    })
    setTransferValues({
      unit_id: staff.unit_id || staff.company_id || '',
      work_location: staff.work_location || '',
      department: staff.department || '',
      job_title: staff.job_title || '',
      effective_date: today,
      reason: '',
    })
    setPromotionValues({
      new_job_title: '',
      effective_date: today,
      reason: '',
    })
    setTerminationReason('')
  }

  const reviewableTermination = (request: StaffTerminationRequest) => {
    if (
      request.requested_by === currentUser.id ||
      request.approvals.some((approval) => approval.user_id === currentUser.id)
    ) return false
    const hrReviewer = currentUser.role === 'hr' || currentUser.role === 'super_admin'
    const executiveReviewer =
      currentUser.role === 'super_admin' ||
      currentUser.role === 'group_head' ||
      currentUser.role === 'company_manager' ||
      currentUser.role === 'subsidiary_head'
    const scopeMatches = hasScopedPermission(
      currentUser,
      'view_staff',
      request.company_id,
      request.unit_id,
      request.work_location
    )
    return request.status === 'pending_hr'
      ? hrReviewer
      : request.status === 'pending_executive' && (executiveReviewer && scopeMatches)
  }

  const handleStaffActionSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!staffAction) return
    const { staff, action } = staffAction

    if (action === 'edit') {
      updateStaffMutation.mutate({ id: staff.id, payload: editValues })
    } else if (action === 'transfer') {
      const destination = GROUP_ENTITIES.find((entity) =>
        entity.id === transferValues.unit_id &&
        entity.status === 'active' &&
        entity.type !== 'holding'
      )
      if (!destination) {
        setActionError('Choose an active destination company or operating unit.')
        return
      }
      const companyId = destination.type === 'operating_unit'
        ? destination.parentId
        : destination.id
      if (!companyId) {
        setActionError('The selected operating unit has no parent company.')
        return
      }
      transferStaffMutation.mutate({
        id: staff.id,
        payload: { ...transferValues, company_id: companyId },
      })
    } else if (action === 'promote') {
      promoteStaffMutation.mutate({ id: staff.id, payload: promotionValues })
    } else {
      requestTerminationMutation.mutate({ id: staff.id, reason: terminationReason })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email) return
    createMutation.mutate({
      name,
      email,
      phone,
      department,
      category_ids: selectedCategories,
      job_title: jobTitle,
    })
  }

  const toggleCategoryCheck = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  if (!hasPermission(currentUser, 'view_staff')) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-lg font-bold text-slate-900">Staff management access</h2>
        <p className="mt-2 text-sm text-slate-500">
          Staff records are limited to HR, group leadership, and assigned company or branch managers.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Staff & Responder Directory
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage responders, topic routing assignments, and track active team workload.
          </p>
        </div>

        {actionNotice && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
            {actionNotice}
          </div>
        )}
        {actionError && !staffAction && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
            {actionError}
          </div>
        )}

        {canManageStaff && (
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl text-xs font-bold"
          >
            <UserPlus className="h-4 w-4" />
            <span>Register New Staff</span>
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        Workbook-backed employee names and job descriptions are included for development. Payroll
        account numbers and signature fields use dummy placeholders; this frontend is not a secure
        production directory.
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-soft flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search staff by name, job description, work location, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-xs h-10 rounded-2xl bg-slate-50"
          />
        </div>

        <div className="w-full sm:w-60">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Departments</option>
            {STAFF_DEPARTMENTS.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {terminationRequests && terminationRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Termination approvals</CardTitle>
            <CardDescription className="text-xs">
              Access is disabled only after the final executive approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {terminationRequests.map((request) => (
              <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">{request.staff_name}</p>
                  <p className="mt-1 text-[11px] text-slate-600">{request.reason}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Requested by {request.requester_name} · {request.status.replace('_', ' ')}
                  </p>
                </div>
                {reviewableTermination(request) && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => decideTerminationMutation.mutate({
                        id: request.id,
                        decision: { decision: 'approved' },
                      })}
                      disabled={decideTerminationMutation.isPending}
                    >
                      Approve {request.status === 'pending_hr' ? 'HR review' : 'termination'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => decideTerminationMutation.mutate({
                        id: request.id,
                        decision: { decision: 'rejected' },
                      })}
                      disabled={decideTerminationMutation.isPending}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Staff Table */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-5">Staff Member</th>
                  <th className="py-3 px-5">Job Description & Department</th>
                  <th className="py-3 px-5">Work Location</th>
                  <th className="py-3 px-5">Topics Handled</th>
                  {canViewMonitoring && <th className="py-3 px-5">Open Workload</th>}
                  <th className="py-3 px-5">Status</th>
                  {canManageAnyVisibleStaff && <th className="py-3 px-5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {directoryStaff.map((staff) => {
                  const perf = monitoringStaff?.find((p) => p.staff_id === staff.id)
                  const openCount = perf?.open_count || 0
                  const canManageThisStaff = canManageStaffMember(currentUser, staff)

                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Contact */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar src={staff.avatar} fallback={staff.name} size="md" />
                          <div>
                            <span className="font-bold text-slate-900 block">{staff.name}</span>
                            <span className="text-[11px] text-slate-400 block">{staff.email}</span>
                            {staff.phone && (
                              <span className="text-[10px] text-slate-400 block">{staff.phone}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-4 px-5">
                        <span className="font-semibold text-slate-700 block">
                          {staff.job_title || 'Job description not provided'}
                        </span>
                        {staff.additional_roles?.map((additionalRole) => (
                          <span key={additionalRole} className="block text-[10px] font-medium text-emerald-700">
                            Additional demo role: {additionalRole}
                          </span>
                        ))}
                        <span className="text-[10px] text-slate-500 block">
                          {staff.department || 'Operations'}
                        </span>
                        <span className="text-[9px] font-bold uppercase text-slate-400">
                          Access role: {staff.role.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap text-slate-600">
                        {staff.work_location || 'Location not provided'}
                      </td>

                      {/* Categories Handled */}
                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {staff.categories?.map((catId) => {
                            const c = categories?.find((cat) => cat.id === catId)
                            return (
                              <span
                                key={catId}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {c?.name || catId}
                              </span>
                            )
                          })}
                        </div>
                      </td>

                      {/* Open Workload */}
                      {canViewMonitoring && <td className="py-4 px-5">
                        <div className="space-y-1 w-32">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-slate-700">{openCount} active</span>
                            <span className="text-slate-400">
                              {perf?.resolved_count || 0} done
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (openCount / 10) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>}

                      {/* Status */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        {staff.is_active ? (
                          <Badge variant="success" className="text-[10px] font-bold">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] font-bold text-slate-500">
                            Deactivated
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      {canManageAnyVisibleStaff && <td className="py-4 px-5 text-right whitespace-nowrap">
                        {canManageThisStaff && <div className="flex flex-wrap justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openStaffAction('edit', staff)} className="h-8 gap-1 text-[10px]">
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          {staff.is_active && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => openStaffAction('transfer', staff)} className="h-8 gap-1 text-[10px]">
                                <ArrowRightLeft className="h-3 w-3" /> Transfer
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openStaffAction('promote', staff)} className="h-8 gap-1 text-[10px]">
                                <Award className="h-3 w-3" /> Promote
                              </Button>
                              {staff.role !== 'super_admin' && (
                                <Button variant="outline" size="sm" onClick={() => openStaffAction('terminate', staff)} className="h-8 gap-1 text-[10px]">
                                  <UserRoundX className="h-3 w-3" /> Terminate
                                </Button>
                              )}
                            </>
                          )}
                        </div>}
                      </td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal Dialog */}
      <Dialog
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Staff Responder"
        description="Add a new employee and configure the inquiry topics they handle."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <Input
                placeholder="Marcus Vance"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Corporate Email *
              </label>
              <Input
                type="email"
                placeholder="marcus.vance@guehr.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Job Title / Description
            </label>
            <Input
              placeholder="Demo job title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <Input
                placeholder="+1 (555) 789-0123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
              >
                {GROUP_DEPARTMENTS.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Topics / Categories Handled
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories?.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white cursor-pointer text-xs font-medium text-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(c.id)}
                    onChange={() => toggleCategoryCheck(c.id)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Registering...' : 'Create Staff Account'}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(staffAction)}
        onClose={() => setStaffAction(null)}
        title={
          staffAction?.action === 'edit' ? 'Edit staff profile'
            : staffAction?.action === 'transfer' ? 'Transfer staff'
              : staffAction?.action === 'promote' ? 'Record promotion'
                : 'Request termination'
        }
        description={staffAction?.staff.name}
        maxWidth="lg"
      >
        {staffAction && (
          <form onSubmit={handleStaffActionSubmit} className="space-y-4">
            {staffAction.action === 'edit' && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Full name
                    <Input required value={editValues.name || ''} onChange={(event) =>
                      setEditValues((value) => ({ ...value, name: event.target.value }))
                    } />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Email
                    <Input required type="email" value={editValues.email || ''} onChange={(event) =>
                      setEditValues((value) => ({ ...value, email: event.target.value }))
                    } />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Phone
                    <Input value={editValues.phone || ''} onChange={(event) =>
                      setEditValues((value) => ({ ...value, phone: event.target.value }))
                    } />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Department
                    <select value={editValues.department || ''} onChange={(event) =>
                      setEditValues((value) => ({ ...value, department: event.target.value }))
                    } className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs">
                      {STAFF_DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                </div>
                <label className="block text-xs font-semibold text-slate-700">
                  Job title
                  <Input value={editValues.job_title || ''} onChange={(event) =>
                    setEditValues((value) => ({ ...value, job_title: event.target.value }))
                  } />
                </label>
                {(currentUser.role === 'hr' || currentUser.role === 'super_admin') && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Date of birth (HR only)
                      <Input type="date" value={editValues.date_of_birth || ''} onChange={(event) =>
                        setEditValues((value) => ({ ...value, date_of_birth: event.target.value }))
                      } />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">
                      Hire date (HR only)
                      <Input type="date" value={editValues.hire_date || ''} onChange={(event) =>
                        setEditValues((value) => ({ ...value, hire_date: event.target.value }))
                      } />
                    </label>
                  </div>
                )}
              </>
            )}

            {staffAction.action === 'transfer' && (
              <>
                <label className="block text-xs font-semibold text-slate-700">
                  Destination company or operating unit
                  <select required value={transferValues.unit_id} onChange={(event) =>
                    setTransferValues((value) => ({ ...value, unit_id: event.target.value }))
                  } className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs">
                    {GROUP_ENTITIES.filter((entity) =>
                      entity.status === 'active' && entity.type !== 'holding'
                    ).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Work location
                    <Input required value={transferValues.work_location} onChange={(event) =>
                      setTransferValues((value) => ({ ...value, work_location: event.target.value }))
                    } />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Department
                    <select value={transferValues.department} onChange={(event) =>
                      setTransferValues((value) => ({ ...value, department: event.target.value }))
                    } className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs">
                      {STAFF_DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Job title
                    <Input value={transferValues.job_title} onChange={(event) =>
                      setTransferValues((value) => ({ ...value, job_title: event.target.value }))
                    } />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Effective date
                    <Input required type="date" value={transferValues.effective_date} onChange={(event) =>
                      setTransferValues((value) => ({ ...value, effective_date: event.target.value }))
                    } />
                  </label>
                </div>
                <label className="block text-xs font-semibold text-slate-700">
                  Transfer reason
                  <textarea required value={transferValues.reason} onChange={(event) =>
                    setTransferValues((value) => ({ ...value, reason: event.target.value }))
                  } className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-xs" />
                </label>
              </>
            )}

            {staffAction.action === 'promote' && (
              <>
                <label className="block text-xs font-semibold text-slate-700">
                  New job title
                  <Input required value={promotionValues.new_job_title} onChange={(event) =>
                    setPromotionValues((value) => ({ ...value, new_job_title: event.target.value }))
                  } />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Effective date
                  <Input required type="date" value={promotionValues.effective_date} onChange={(event) =>
                    setPromotionValues((value) => ({ ...value, effective_date: event.target.value }))
                  } />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Reason
                  <textarea required value={promotionValues.reason} onChange={(event) =>
                    setPromotionValues((value) => ({ ...value, reason: event.target.value }))
                  } className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-xs" />
                </label>
              </>
            )}

            {staffAction.action === 'terminate' && (
              <>
                <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                  This begins HR and executive review. The staff account remains active until final approval.
                </p>
                <label className="block text-xs font-semibold text-slate-700">
                  Termination reason
                  <textarea required value={terminationReason} onChange={(event) =>
                    setTerminationReason(event.target.value)
                  } className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-xs" />
                </label>
              </>
            )}

            {actionError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{actionError}</p>
            )}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button type="button" variant="ghost" onClick={() => setStaffAction(null)}>Cancel</Button>
              <Button type="submit" disabled={
                updateStaffMutation.isPending ||
                transferStaffMutation.isPending ||
                promoteStaffMutation.isPending ||
                requestTerminationMutation.isPending
              }>
                Save
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  )
}

