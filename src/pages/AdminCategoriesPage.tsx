import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  UserCheck,
  Check,
  Tag,
  ArrowRight,
} from 'lucide-react'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Category, CategoryAudience } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

export const AdminCategoriesPage: React.FC = () => {
  const { isBackendMode } = useAuth()
  const queryClient = useQueryClient()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [defaultAssigneeId, setDefaultAssigneeId] = useState('')
  const [audience, setAudience] = useState<CategoryAudience>('both')

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  })

  const { data: staffList } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.staff.list({ is_active: true }),
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: () =>
      api.categories.create({
        name,
        description,
        default_assignee_id: defaultAssigneeId || undefined,
        audience,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setAddModalOpen(false)
      setName('')
      setDescription('')
      setDefaultAssigneeId('')
      setAudience('both')
    },
  })

  // Update routing mutation
  const updateRoutingMutation = useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string }) =>
      api.categories.update(id, { default_assignee_id: assigneeId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.categories.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (err: any) => {
      alert(err.message || 'Cannot delete category in active use')
    },
  })

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Categories & Auto-Routing Rules
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Map incoming message topics from company websites directly to designated staff responders.
          </p>
        </div>

        <Button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 rounded-xl text-xs font-bold"
        >
          <Plus className="h-4 w-4" />
          <span>Add Message Category</span>
        </Button>
      </div>

      {/* Categories & Routing Card Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories?.map((cat) => (
          <Card key={cat.id} className="border-slate-200/80 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-xs"
                  style={{ backgroundColor: cat.color || '#3B82F6' }}
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{cat.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{cat.description || 'Topic category'}</p>
                  <Badge variant="outline" className="mt-1 text-[9px] uppercase">
                    {cat.audience ?? 'both'}
                  </Badge>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm(`Remove category "${cat.name}"?`)) {
                    deleteMutation.mutate(cat.id)
                  }
                }}
                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Default Assignee Routing Selector */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <UserCheck className="h-3 w-3 text-emerald-600" />
                  <span>Default Suggested Assignee</span>
                </label>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                  Auto-routed
                </span>
              </div>

              <select
                value={cat.default_assignee_id || ''}
                onChange={(e) =>
                  updateRoutingMutation.mutate({ id: cat.id, assigneeId: e.target.value })
                }
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- No Auto-Assignee (HR Manual Triage) --</option>
                {staffList?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.department})
                  </option>
                ))}
              </select>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Category Modal */}
      <Dialog
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Message Category"
        description="Create a category and set up automatic routing for website messages."
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (name) createMutation.mutate()
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category Name *
            </label>
            <Input
              placeholder="e.g. Media & Press Inquiries"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {!isBackendMode && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <Input
                  placeholder="Journalists, interview requests, and brand assets"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Available to
                </label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as CategoryAudience)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="both">Public contacts and internal staff</option>
                  <option value="public">Public contacts only</option>
                  <option value="internal">Internal staff only</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Assignee (Optional)
            </label>
            <select
              value={defaultAssigneeId}
              onChange={(e) => setDefaultAssigneeId(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Leave for HR manual triage --</option>
              {staffList?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.department})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

