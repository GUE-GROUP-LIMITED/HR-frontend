import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Ban, CheckCircle2, RefreshCw } from 'lucide-react'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Dialog } from '@/components/ui/dialog'
import { User, UserRole } from '@/types'
import { formatDateTime } from '@/lib/utils'

const ROLE_OPTIONS: UserRole[] = ['super_admin', 'hr']

const roleLabel = (role: UserRole) => role.replace(/_/g, ' ')

export const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState<UserRole>('hr')
  const [formError, setFormError] = useState<string | null>(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.users.list({ page: 1, limit: 100 }),
  })
  const visibleUsers = users?.filter((user) => user.role === 'super_admin' || user.role === 'hr')

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })

  const createMutation = useMutation({
    mutationFn: () =>
      api.users.create({
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
      }),
    onSuccess: () => {
      invalidate()
      closeForm()
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'Unable to create user')
    },
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      api.users.update(editingUser!.id, {
        name: formName.trim(),
        role: formRole,
      }),
    onSuccess: () => {
      invalidate()
      closeForm()
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'Unable to update user')
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.users.setStatus(id, isActive),
    onSuccess: invalidate,
    onError: (error) => {
      alert(error instanceof Error ? error.message : 'Unable to update user status')
    },
  })

  const openCreate = () => {
    setEditingUser(null)
    setFormName('')
    setFormEmail('')
    setFormRole('hr')
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormRole(ROLE_OPTIONS.includes(user.role) ? user.role : 'hr')
    setFormError(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingUser(null)
    setFormError(null)
  }

  const submitForm = (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (editingUser) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            HR & Admin Users
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage backend accounts that can sign in to the HR Contact Hub.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2 rounded-xl text-xs font-bold">
          <Plus className="h-4 w-4" />
          <span>Add User</span>
        </Button>
      </div>

      <Card className="border-slate-200/80 overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold">User Accounts</CardTitle>
          <CardDescription>
            Staff responder profiles are managed separately in Staff Management.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-400 uppercase tracking-wider font-bold text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-5">User</th>
                    <th className="py-3 px-5">Role</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Created</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleUsers?.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <Avatar fallback={user.name} size="sm" />
                          <div>
                            <span className="font-bold text-slate-900 block">{user.name}</span>
                            <span className="text-[10px] text-slate-400">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <Badge variant={user.role === 'super_admin' ? 'purple' : user.role === 'hr' ? 'info' : 'secondary'} className="text-[10px] capitalize">
                          {roleLabel(user.role)}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-5">
                        {user.is_active ? (
                          <Badge variant="success" className="text-[10px]">Active</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">Disabled</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500">{formatDateTime(user.created_at)}</td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(user)}
                            className="h-8 text-xs font-semibold"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={statusMutation.isPending}
                            onClick={() => {
                              const next = !user.is_active
                              if (confirm(`${next ? 'Activate' : 'Disable'} ${user.name}?`)) {
                                statusMutation.mutate({ id: user.id, isActive: next })
                              }
                            }}
                            className="h-8 text-xs font-semibold"
                          >
                            {user.is_active ? (
                              <>
                                <Ban className="h-3.5 w-3.5 mr-1" />
                                Disable
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleUsers?.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        No user accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={formOpen}
        onClose={closeForm}
        title={editingUser ? 'Edit User' : 'Add User'}
        description={editingUser ? 'Update the user profile and role.' : 'Create a backend account for HR portal access.'}
        maxWidth="md"
      >
        <form onSubmit={submitForm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full name *</label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
            <Input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              disabled={Boolean(editingUser)}
              required
            />
            {editingUser && (
              <p className="mt-1 text-[10px] text-slate-400">Email cannot be changed after account creation.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value as UserRole)}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </div>

          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
