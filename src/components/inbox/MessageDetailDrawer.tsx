import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Mail,
  User,
  Clock,
  Calendar,
  Send,
  MessageSquare,
  FileText,
  History,
  ShieldAlert,
  CheckCircle,
  Tag,
  ArrowRight,
  UserPlus,
  RefreshCw,
} from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { getStatusConfig, formatDateTime, timeAgo } from '@/lib/utils'
import { MessageStatus, MessageResponse, MessageNote, MessageEvent } from '@/types'
import confetti from 'canvas-confetti'

interface MessageDetailDrawerProps {
  messageId: string | null
  onClose: () => void
}

export const MessageDetailDrawer: React.FC<MessageDetailDrawerProps> = ({ messageId, onClose }) => {
  const { currentUser, role } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'conversation' | 'notes' | 'history'>('conversation')
  const [replyBody, setReplyBody] = useState('')
  const [sendToSender, setSendToSender] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [assigneeId, setAssigneeId] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['message', messageId],
    queryFn: () => (messageId ? api.messages.get(messageId) : null),
    enabled: !!messageId,
  })

  const { data: staffList } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.staff.list({ is_active: true }),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  })

  // Mutation: Send reply
  const replyMutation = useMutation({
    mutationFn: (body: string) =>
      api.messages.sendResponse(
        messageId!,
        { body, send_to_sender: sendToSender },
        { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }
      ),
    onSuccess: () => {
      setReplyBody('')
      queryClient.invalidateQueries({ queryKey: ['message', messageId] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['monitoring'] })
    },
  })

  // Mutation: Add internal note
  const noteMutation = useMutation({
    mutationFn: (note: string) =>
      api.messages.addNote(messageId!, note, {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      }),
    onSuccess: () => {
      setNewNote('')
      queryClient.invalidateQueries({ queryKey: ['message', messageId] })
    },
  })

  // Mutation: Assign staff
  const assignMutation = useMutation({
    mutationFn: (staffId: string) =>
      api.messages.assign(messageId!, staffId, { id: currentUser.id, name: currentUser.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message', messageId] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  // Mutation: Change status
  const statusMutation = useMutation({
    mutationFn: (newStatus: MessageStatus) =>
      api.messages.updateStatus(messageId!, newStatus, {
        id: currentUser.id,
        name: currentUser.name,
      }),
    onSuccess: (data) => {
      if (data.status === 'resolved') {
        confetti({ particleCount: 50, spread: 50 })
      }
      queryClient.invalidateQueries({ queryKey: ['message', messageId] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['monitoring'] })
    },
  })

  // Mutation: Change category
  const categoryMutation = useMutation({
    mutationFn: (catId: string) =>
      api.messages.updateCategory(messageId!, catId, {
        id: currentUser.id,
        name: currentUser.name,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message', messageId] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  if (!messageId) return null

  const message = data?.message
  const responses = data?.responses || []
  const notes = data?.notes || []
  const events = data?.events || []
  const statusConfig = message ? getStatusConfig(message.status) : null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative z-50 w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200/80 bg-slate-50/50 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-slate-500">
                #{message?.id || messageId}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  message?.website.color ? '' : 'bg-slate-100 text-slate-700'
                }`}
                style={{
                  backgroundColor: message?.website.color ? `${message.website.color}15` : undefined,
                  color: message?.website.color || '#334155',
                  borderColor: message?.website.color ? `${message.website.color}30` : undefined,
                }}
              >
                {message?.website.name}
              </span>
              {statusConfig && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.badge}`}
                >
                  {statusConfig.label}
                </span>
              )}
              {message?.is_overdue && (
                <Badge variant="destructive" className="text-[10px] py-0">
                  SLA Overdue
                </Badge>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {message?.subject || 'Loading inquiry details...'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        {isLoading || !message ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Quick Action Controls: Assignee & Status Transitions */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Staff Assignment */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Assigned Staff
                </label>
                {role === 'staff' ? (
                  <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200">
                    <Avatar
                      src={message.assigned_to?.avatar}
                      fallback={message.assigned_to?.name || 'Unassigned'}
                      size="sm"
                    />
                    <span className="font-semibold text-slate-800">
                      {message.assigned_to?.name || 'Unassigned'}
                    </span>
                  </div>
                ) : (
                  <select
                    value={message.assigned_to?.id || ''}
                    onChange={(e) => assignMutation.mutate(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {staffList?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.department})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Status Transition */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Change Status
                </label>
                <div className="flex items-center gap-1.5">
                  {(['new', 'assigned', 'in_progress', 'resolved', 'closed'] as MessageStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => statusMutation.mutate(st)}
                        disabled={message.status === st}
                        className={`px-2 py-1.5 rounded-lg font-semibold text-[11px] capitalize transition-all ${
                          message.status === st
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Sender Metadata Box */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Avatar fallback={message.sender_name} size="lg" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{message.sender_name}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3 text-slate-400" />
                    <span>{message.sender_email}</span>
                  </p>
                  {message.sender_phone && (
                    <p className="text-xs text-slate-400 mt-0.5">{message.sender_phone}</p>
                  )}
                </div>
              </div>

              <div className="text-right text-xs text-slate-400">
                <div className="flex items-center gap-1 justify-end">
                  <Clock className="h-3 w-3" />
                  <span>{timeAgo(message.created_at)}</span>
                </div>
                <span className="text-[10px] block mt-0.5">
                  {formatDateTime(message.created_at)}
                </span>
              </div>
            </div>

            {/* Message Original Body */}
            <div className="p-5 bg-white border-b border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Inquiry Text
              </p>
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                {message.body}
              </div>
            </div>

            {/* Navigation Tabs for Thread / Notes / History */}
            <div className="flex items-center px-5 border-b border-slate-200 bg-slate-50/30 gap-6">
              <button
                onClick={() => setActiveTab('conversation')}
                className={`py-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                  activeTab === 'conversation'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Responses ({responses.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`py-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                  activeTab === 'notes'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Internal Notes ({notes.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`py-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                  activeTab === 'history'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>Timeline ({events.length})</span>
              </button>
            </div>

            {/* Tab 1: Conversation & Replies */}
            {activeTab === 'conversation' && (
              <div className="p-5 space-y-4">
                {responses.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No responses sent yet. Compose a reply below.
                  </div>
                ) : (
                  responses.map((resp: MessageResponse) => (
                    <div
                      key={resp.id}
                      className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar src={resp.staff_avatar} fallback={resp.staff_name} size="sm" />
                          <span className="font-bold text-slate-900">{resp.staff_name}</span>
                          {resp.sent_to_sender ? (
                            <Badge variant="success" className="text-[9px] py-0">
                              Emailed to Sender
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[9px] py-0">
                              Internal Draft
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(resp.created_at)}
                        </span>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {resp.body}
                      </p>
                    </div>
                  ))
                )}

                {/* Reply Composer */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Compose Official Response</span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendToSender}
                        onChange={(e) => setSendToSender(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Email directly to {message.sender_email}</span>
                    </label>
                  </div>

                  <textarea
                    rows={4}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Write your response message..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 placeholder:text-slate-400"
                  />

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={!replyBody.trim() || replyMutation.isPending}
                      onClick={() => replyMutation.mutate(replyBody)}
                      className="gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{replyMutation.isPending ? 'Sending...' : 'Send Reply'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Internal Notes */}
            {activeTab === 'notes' && (
              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  {notes.map((note: MessageNote) => (
                    <div
                      key={note.id}
                      className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{note.author_name}</span>
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(note.created_at)}
                        </span>
                      </div>
                      <p className="text-slate-700">{note.note}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <textarea
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add an internal note visible only to HR and staff..."
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!newNote.trim() || noteMutation.isPending}
                      onClick={() => noteMutation.mutate(newNote)}
                    >
                      {noteMutation.isPending ? 'Saving...' : 'Add Internal Note'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Timeline & Event History */}
            {activeTab === 'history' && (
              <div className="p-5">
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {events.map((evt: MessageEvent) => (
                    <div key={evt.id} className="relative text-xs">
                      <span className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 capitalize">
                          {evt.action.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(evt.created_at)}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        By <strong className="text-slate-700">{evt.actor_name}</strong>
                        {evt.to_value && ` → ${evt.to_value}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
