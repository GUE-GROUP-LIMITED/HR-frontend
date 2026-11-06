import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  Briefcase,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  Shield,
  Layers,
} from 'lucide-react'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Dialog } from '@/components/ui/dialog'
import { User, Category } from '@/types'
import { CreateStaffPayload } from '@/types/api'

export const StaffManagementPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // New staff form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [department, setDepartment] = useState('Talent Acquisition')
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
  })

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
    },
  })

  // Toggle active status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => api.staff.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email) return
    createMutation.mutate({
      name,
      email,
      phone,
      department,
      category_ids: selectedCategories,
    })
  }

  const toggleCategoryCheck = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
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

        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-xl text-xs font-bold"
        >
          <UserPlus className="h-4 w-4" />
          <span>Register New Staff</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-soft flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search staff by name or email..."
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
            <option value="Talent Acquisition">Talent Acquisition</option>
            <option value="Customer Relations">Customer Relations</option>
            <option value="Technical Operations">Technical Operations</option>
            <option value="Legal & Risk">Legal & Risk</option>
            <option value="People & HR Operations">People & HR Operations</option>
          </select>
        </div>
      </div>

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
                  <th className="py-3 px-5">Department & Role</th>
                  <th className="py-3 px-5">Topics Handled</th>
                  <th className="py-3 px-5">Open Workload</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList?.map((staff) => {
                  const perf = monitoringStaff?.find((p) => p.staff_id === staff.id)
                  const openCount = perf?.open_count || 0

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
                          {staff.department || 'Operations'}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          {staff.role}
                        </span>
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
                      <td className="py-4 px-5">
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
                      </td>

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
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStatusMutation.mutate(staff.id)}
                          className="h-8 text-xs font-semibold"
                        >
                          {staff.is_active ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      </td>
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
                <option value="Talent Acquisition">Talent Acquisition</option>
                <option value="Customer Relations">Customer Relations</option>
                <option value="Technical Operations">Technical Operations</option>
                <option value="Legal & Risk">Legal & Risk</option>
                <option value="People & HR Operations">People & HR Operations</option>
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
    </div>
  )
}

