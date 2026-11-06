import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Filter,
  Users,
  CheckSquare,
  Square,
  Globe,
  Tag,
  Clock,
  ArrowUpDown,
  RefreshCw,
  UserPlus,
  AlertTriangle,
  Mail,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { MessageDetailDrawer } from '@/components/inbox/MessageDetailDrawer'
import { MessageStatus, Message } from '@/types'
import { getStatusConfig, timeAgo, formatDate } from '@/lib/utils'

export const InboxPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { currentUser, role } = useAuth()
  const queryClient = useQueryClient()

  // Filters state
  const [selectedWebsite, setSelectedWebsite] = useState<string>(
    searchParams.get('website') || 'all'
  )
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [page, setPage] = useState<number>(1)

  // Drawer selection
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    searchParams.get('id') || null
  )

  // Multi-select bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkAssigneeId, setBulkAssigneeId] = useState<string>('')

  // Sync url param
  useEffect(() => {
    const urlId = searchParams.get('id')
    if (urlId) setSelectedMessageId(urlId)
    const urlWeb = searchParams.get('website')
    if (urlWeb) setSelectedWebsite(urlWeb)
  }, [searchParams])

  // Queries
  const { data: messagesResponse, isLoading } = useQuery({
    queryKey: [
      'messages',
      {
        website_id: selectedWebsite,
        status: selectedStatus,
        category_id: selectedCategory,
        assigned_to: selectedAssignee,
        q: searchQuery,
        page,
      },
    ],
    queryFn: () =>
      api.messages.list({
        website_id: selectedWebsite,
        status: selectedStatus as MessageStatus | 'all',
        category_id: selectedCategory,
        assigned_to: selectedAssignee,
        q: searchQuery,
        page,
        limit: 15,
      }),
  })

  const { data: websites } = useQuery({
    queryKey: ['websites'],
    queryFn: () => api.websites.list(),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  })

  const { data: staffList } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.staff.list({ is_active: true }),
  })

  // Bulk assign mutation
  const bulkAssignMutation = useMutation({
    mutationFn: (staffId: string) =>
      api.messages.bulkAssign(selectedIds, staffId, {
        id: currentUser.id,
        name: currentUser.name,
      }),
    onSuccess: () => {
      setSelectedIds([])
      setBulkAssigneeId('')
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  const messages = messagesResponse?.data || []
  const meta = messagesResponse?.meta

  const toggleSelectAll = () => {
    if (selectedIds.length === messages.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(messages.map((m) => m.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-5">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Unified Contact Inbox
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Incoming contact form messages across all 4 registered web properties.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-3 py-1 font-semibold">
            {meta?.total || messages.length} Total Messages
          </Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by sender, email, subject, or message text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-xs h-10 rounded-2xl bg-slate-50 border-slate-200"
            />
          </div>

          {/* Website selector */}
          <div className="w-full md:w-52">
            <select
              value={selectedWebsite}
              onChange={(e) => {
                setSelectedWebsite(e.target.value)
                setPage(1)
              }}
              className="w-full h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Websites (4)</option>
              {websites?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status selector */}
          <div className="w-full md:w-44">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setPage(1)
              }}
              className="w-full h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 capitalize"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="spam">Spam</option>
            </select>
          </div>

          {/* Category selector */}
          <div className="w-full md:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setPage(1)
              }}
              className="w-full h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee selector */}
          <div className="w-full md:w-44">
            <select
              value={selectedAssignee}
              onChange={(e) => {
                setSelectedAssignee(e.target.value)
                setPage(1)
              }}
              className="w-full h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Assignees</option>
              <option value="unassigned">Unassigned Only</option>
              {staffList?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Action Bar (Visible when items selected) */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-900">
                {selectedIds.length} messages selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={bulkAssigneeId}
                onChange={(e) => setBulkAssigneeId(e.target.value)}
                className="h-8 rounded-xl border border-emerald-300 bg-white px-2.5 text-xs font-medium text-slate-800"
              >
                <option value="">Select staff to assign...</option>
                {staffList?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.department})
                  </option>
                ))}
              </select>

              <Button
                size="sm"
                disabled={!bulkAssigneeId || bulkAssignMutation.isPending}
                onClick={() => bulkAssignMutation.mutate(bulkAssigneeId)}
                className="h-8 text-xs font-bold"
              >
                Assign Selected
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds([])}
                className="h-8 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Messages List Table */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center">
            <Mail className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No messages match criteria</h4>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your website, category, or status filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <button onClick={toggleSelectAll} className="p-0.5 rounded text-slate-400">
                      {selectedIds.length === messages.length && messages.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Origin Website</th>
                  <th className="py-3 px-4">Sender & Subject</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4 text-right">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.map((msg) => {
                  const statusConfig = getStatusConfig(msg.status)
                  const isSelected = selectedIds.includes(msg.id)

                  return (
                    <tr
                      key={msg.id}
                      onClick={() => setSelectedMessageId(msg.id)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-3.5 px-4"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelect(msg.id)
                        }}
                      >
                        <button className="p-0.5 rounded text-slate-400 hover:text-emerald-600">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>

                      {/* Website Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border"
                          style={{
                            backgroundColor: msg.website.color ? `${msg.website.color}15` : '#F1F5F9',
                            color: msg.website.color || '#334155',
                            borderColor: msg.website.color ? `${msg.website.color}30` : '#E2E8F0',
                          }}
                        >
                          {msg.website.name}
                        </span>
                      </td>

                      {/* Sender & Subject */}
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">
                            {msg.sender_name}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate">
                            &lt;{msg.sender_email}&gt;
                          </span>
                        </div>
                        <p className="font-semibold text-slate-700 truncate mt-0.5">
                          {msg.subject}
                        </p>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {msg.body}
                        </p>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {msg.category.name}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.badge}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                            {statusConfig.label}
                          </span>
                          {msg.is_overdue && (
                            <span
                              title="24h SLA Breached"
                              className="h-2 w-2 rounded-full bg-rose-500 animate-ping"
                            />
                          )}
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {msg.assigned_to ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={msg.assigned_to.avatar}
                              fallback={msg.assigned_to.name}
                              size="sm"
                            />
                            <span className="font-semibold text-slate-800">
                              {msg.assigned_to.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-medium">Unassigned</span>
                        )}
                      </td>

                      {/* Received */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-500">
                        <span className="font-semibold">{timeAgo(msg.created_at)}</span>
                        <span className="block text-[10px] text-slate-400">
                          {formatDate(msg.created_at)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer pagination */}
        {meta && (meta.totalPages ?? 1) > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {messages.length} of {meta.total} records
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-bold text-slate-700">
                Page {page} of {meta.totalPages ?? 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (meta.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Message Detail Drawer */}
      <MessageDetailDrawer
        messageId={selectedMessageId}
        onClose={() => {
          setSelectedMessageId(null)
          searchParams.delete('id')
          setSearchParams(searchParams)
        }}
      />
    </div>
  )
}
