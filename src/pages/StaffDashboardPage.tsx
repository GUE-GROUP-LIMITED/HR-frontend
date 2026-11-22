import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  TrendingUp,
  User,
  Shield,
  ArrowUpRight,
  RefreshCw,
  Mail,
} from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { MessageDetailDrawer } from '@/components/inbox/MessageDetailDrawer'
import { useStaggerFade } from '@/lib/gsap'
import { getStatusConfig, timeAgo, formatDateTime } from '@/lib/utils'
import { Message, MessageResponse } from '@/types'

export const StaffDashboardPage: React.FC = () => {
  const { currentUser, role } = useAuth()
  const staggerRef = useStaggerFade('.staff-card', 0.08)

  const [activeTab, setActiveTab] = useState<'all' | 'assigned' | 'in_progress' | 'resolved'>('all')
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['staff', 'dashboard', currentUser.id],
    queryFn: () => api.staff.getDashboard(currentUser.id),
  })

  const { data: performance } = useQuery({
    queryKey: ['staff', 'performance', currentUser.id],
    queryFn: () => api.staff.getPerformance(currentUser),
  })

  const summary = dashboardData?.summary
  const myMessages = dashboardData?.messages || []
  const myResponses = dashboardData?.responses || []

  const filteredMessages = myMessages.filter((m: Message) => {
    if (activeTab === 'all') return true
    return m.status === activeTab
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar src={currentUser.avatar} fallback={currentUser.name} size="xl" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {currentUser.name}'s Responder Desk
              </h2>
              <Badge variant="purple" className="text-[10px] uppercase font-bold">
                {currentUser.department || 'Responder'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Personalized message queue & resolution performance metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-xs px-3 py-1 font-semibold">
            {summary?.resolution_rate || 96}% SLA Resolution Rate
          </Badge>
        </div>
      </div>

      {/* Summary KPI Cards matching inspo */}
      <div ref={staggerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="staff-card border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Assigned to Me
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Inbox className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {isLoading ? '...' : summary?.assigned || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Pending initial response</p>
          </CardContent>
        </Card>

        <Card className="staff-card border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              In Progress
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {isLoading ? '...' : summary?.in_progress || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Under active triage</p>
          </CardContent>
        </Card>

        <Card className="staff-card border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Resolved by Me
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">
              {isLoading ? '...' : summary?.resolved || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Completed inquiries</p>
          </CardContent>
        </Card>

        <Card className="staff-card border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Avg Turnaround
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {isLoading ? '...' : `${summary?.avg_response_time_hours || 1.8}h`}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">First reply average</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: My Messages & My Recent Replies */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: My Messages Queue (col 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">My Assigned Messages</h3>

            {/* Filter pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              {(['all', 'assigned', 'in_progress', 'resolved'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg capitalize transition-all ${
                    activeTab === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <Card className="border-slate-200/80 overflow-hidden">
            {isLoading ? (
              <div className="py-12 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No inquiries assigned to you matching this filter.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredMessages.map((msg: Message) => {
                  const statusConfig = getStatusConfig(msg.status)
                  return (
                    <div
                      key={msg.id}
                      onClick={() => setSelectedMessageId(msg.id)}
                      className="p-4 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-start justify-between gap-4"
                    >
                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                            style={{
                              backgroundColor: msg.website.color ? `${msg.website.color}15` : undefined,
                              color: msg.website.color || '#334155',
                              borderColor: msg.website.color ? `${msg.website.color}30` : undefined,
                            }}
                          >
                            {msg.website.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.badge}`}
                          >
                            {statusConfig.label}
                          </span>
                          {msg.is_overdue && (
                            <Badge variant="destructive" className="text-[9px] py-0">
                              24h Breach
                            </Badge>
                          )}
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {msg.subject}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {msg.body}
                        </p>

                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                          <span>From: <strong className="text-slate-700">{msg.sender_name}</strong></span>
                          <span>•</span>
                          <span>{timeAgo(msg.created_at)}</span>
                        </div>
                      </div>

                      <Button variant="outline" size="sm" className="shrink-0 text-xs font-bold">
                        Open & Reply
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right: My Response History (col 4) */}
        <div className="lg:col-span-4 space-y-4">
          {performance && (
            <Card className="border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Performance Snapshot</h3>
                <Badge variant="info" className="text-[10px]">Backend</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Open</p>
                  <p className="mt-1 font-black text-amber-600">{performance.open_count}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Replied</p>
                  <p className="mt-1 font-black text-blue-600">{performance.replied_count}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Resolved</p>
                  <p className="mt-1 font-black text-emerald-600">{performance.resolved_count}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Overdue</p>
                  <p className="mt-1 font-black text-rose-600">{performance.overdue_count}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Avg Reply</p>
                  <p className="mt-1 font-black text-slate-900">{performance.avg_first_response_hours}h</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Satisfaction</p>
                  <p className="mt-1 font-black text-slate-900">{performance.satisfaction_score}%</p>
                </div>
              </div>
            </Card>
          )}

          <h3 className="text-base font-bold text-slate-900">Recent Replies Sent</h3>

          <Card className="border-slate-200/80 p-4 space-y-3">
            {myResponses.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No replies sent yet</p>
            ) : (
              myResponses.map((r: MessageResponse) => (
                <div
                  key={r.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px]">
                      {r.sent_to_sender ? 'Direct Email' : 'Internal Draft'}
                    </span>
                    <span className="text-[10px] text-slate-400">{timeAgo(r.created_at)}</span>
                  </div>
                  <p className="text-slate-600 line-clamp-2 text-[11px] leading-relaxed">
                    {r.body}
                  </p>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      {/* Message Detail Drawer */}
      <MessageDetailDrawer
        messageId={selectedMessageId}
        onClose={() => setSelectedMessageId(null)}
      />
    </div>
  )
}
