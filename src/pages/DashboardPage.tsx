import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  Inbox,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Sparkles,
  Download,
  Send,
  MoreVertical,
  Check,
  ShieldAlert,
} from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { SlaGauge } from '@/components/dashboard/SlaGauge'
import { ActivityTrendChart } from '@/components/dashboard/ActivityTrendChart'
import { useStaggerFade } from '@/lib/gsap'
import { exportToCSV, timeAgo } from '@/lib/utils'

interface TodoItem {
  id: string
  title: string
  subtitle: string
  tag: string
  completed: boolean
}

export const DashboardPage: React.FC = () => {
  const { currentUser, role } = useAuth()
  const navigate = useNavigate()
  const staggerRef = useStaggerFade('.stat-card', 0.08)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['monitoring', 'overview'],
    queryFn: () => api.monitoring.getOverview(),
  })

  const { data: overdueList } = useQuery({
    queryKey: ['monitoring', 'overdue'],
    queryFn: () => api.monitoring.getOverdue(),
  })

  const { data: websites } = useQuery({
    queryKey: ['websites'],
    queryFn: () => api.websites.list(),
  })

  // Interactive Things To Do list
  const [todos, setTodos] = useState<TodoItem[]>([
    {
      id: 't1',
      title: 'Triage Overdue Inquiries',
      subtitle: 'Review message #msg_101 from GUE Group Limited (unanswered > 24h)',
      tag: 'Urgent SLA',
      completed: false,
    },
    {
      id: 't2',
      title: 'Assign Technical Support Ticket',
      subtitle: 'Webhook Rate Limiting ticket waiting for engineer assignment',
      tag: 'Triage',
      completed: false,
    },
    {
      id: 't3',
      title: 'Audit Website Site Keys',
      subtitle: 'Rotate production intake keys for Q4 compliance review',
      tag: 'Security',
      completed: true,
    },
    {
      id: 't4',
      title: 'Review Staff Workload Balance',
      subtitle: 'Re-distribute career fellowship applications among responders',
      tag: 'Operations',
      completed: false,
    },
  ])

  const [activeTodoTab, setActiveTodoTab] = useState<'todo' | 'done'>('todo')

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }

  const filteredTodos = todos.filter((t) =>
    activeTodoTab === 'todo' ? !t.completed : t.completed
  )

  const handleExportSummary = () => {
    if (!stats) return
    exportToCSV('gue_hr_executive_report.csv', [
      {
        total_messages: stats.total_messages,
        unassigned: stats.unassigned_messages,
        assigned: stats.assigned_messages,
        in_progress: stats.in_progress_messages,
        resolved: stats.resolved_messages,
        overdue: stats.overdue_messages,
        sla_compliance: `${stats.sla_compliance_rate}%`,
        avg_response_hours: stats.avg_response_time_hours,
        export_date: new Date().toISOString(),
      },
    ])
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome Back, {currentUser.name.split(' ')[0]}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Centralized operations across GUE Group's company websites and staff responders.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSummary}
            className="flex items-center gap-2 rounded-xl text-xs font-semibold bg-white"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export Report</span>
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/inbox')}
            className="flex items-center gap-2 rounded-xl text-xs font-semibold"
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>View Inbox</span>
          </Button>
        </div>
      </div>

      {/* Top 4 Stat Cards matching VertexLab inspiration */}
      <div ref={staggerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Messages */}
        <Card className="stat-card border-slate-200/80 hover:shadow-card transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Inquiries
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Inbox className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {isLoading ? '...' : (stats?.total_messages || 8).toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                <ArrowUpRight className="h-3 w-3" />
                +12%
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Than last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Open / In Progress */}
        <Card className="stat-card border-slate-200/80 hover:shadow-card transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Pending
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {isLoading
                ? '...'
                : (stats?.assigned_messages || 0) + (stats?.unassigned_messages || 0)}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                <ArrowUpRight className="h-3 w-3" />
                Active
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {stats?.unassigned_messages || 0} unassigned
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: SLA Overdue Risk */}
        <Card className="stat-card border-slate-200/80 hover:shadow-card transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              SLA Overdue
            </span>
            <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600">
              {isLoading ? '...' : (stats?.overdue_messages || 2).toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">
                <ArrowDownRight className="h-3 w-3" />
                24h Breach
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Requires follow-up</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: SLA Compliance Rate */}
        <Card className="stat-card border-slate-200/80 hover:shadow-card transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              SLA Compliance
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {isLoading ? '...' : `${stats?.sla_compliance_rate || 94.2}%`}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                <ArrowUpRight className="h-3 w-3" />
                +8.4%
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Vs baseline</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row matching VertexLab design: AI Insight / SLA Gauge / Portals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: AI & Urgent Inquiries (col 4) */}
        <Card className="lg:col-span-4 border-slate-200/80 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold">Urgent Intake Insights</CardTitle>
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
              </div>
              <Badge variant="destructive" className="text-[10px] font-bold">
                {overdueList?.length || 2} Overdue
              </Badge>
            </div>
            <CardDescription>
              Messages waiting longer than the 24h SLA target without a response.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {overdueList?.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/inbox?id=${item.id}`)}
                className="p-3 rounded-2xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50 cursor-pointer transition-all flex items-start gap-3"
              >
                <div className="h-8 w-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.sender_name}</p>
                    <span className="text-[10px] text-rose-600 font-semibold">24h+</span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">{item.subject}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-rose-200 text-rose-700 bg-white">
                      {item.website.name}
                    </Badge>
                    <span className="text-[10px] text-slate-400">
                      Assignee: {item.assigned_to?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/monitoring')}
              className="w-full text-xs font-semibold border-slate-200 mt-2"
            >
              <span>View Response Monitoring</span>
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Center: Avg SLA Score Gauge matching VertexLab (col 4) */}
        <Card className="lg:col-span-4 border-slate-200/80 flex flex-col justify-between">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold">Response Health Score</CardTitle>
              <span className="text-[10px] text-slate-400 font-medium">Auto-calculated</span>
            </div>
            <CardDescription>
              Aggregated team turnaround & satisfaction rating
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <SlaGauge score={stats?.sla_compliance_rate || 94.2} lastMonthScore={85.8} />
          </CardContent>
        </Card>

        {/* Right: Company Portals Breakdown (col 4) */}
        <Card className="lg:col-span-4 border-slate-200/80 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold">Connected Portals</CardTitle>
              <Badge variant="success" className="text-[10px]">
                4 of 4 Live
              </Badge>
            </div>
            <CardDescription>
              Traffic ingestion by registered website endpoint
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {websites?.map((site) => {
              const count =
                stats?.counts_by_website.find((c) => c.website_id === site.id)?.count || 0
              return (
                <div
                  key={site.id}
                  onClick={() => navigate(`/inbox?website=${site.id}`)}
                  className="p-2.5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs font-bold text-slate-900 truncate">{site.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{site.domain}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">
                      {count} msgs
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row matching VertexLab: Things To Do & Activity Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Things To Do (col 5) */}
        <Card className="lg:col-span-5 border-slate-200/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold">Things To Do</CardTitle>
                <span className="h-5 w-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                  {todos.filter((t) => !t.completed).length}
                </span>
              </div>

              {/* Tabs To Do / Done */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setActiveTodoTab('todo')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTodoTab === 'todo'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  To Do
                </button>
                <button
                  onClick={() => setActiveTodoTab('done')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTodoTab === 'done'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Done
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-2">
            {filteredTodos.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No tasks in this list</p>
            ) : (
              filteredTodos.map((todo) => (
                <div
                  key={todo.id}
                  onClick={() => toggleTodo(todo.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    todo.completed
                      ? 'bg-slate-50/50 border-slate-100 opacity-60'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      todo.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-emerald-500 bg-white'
                    }`}
                  >
                    {todo.completed && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-xs font-bold text-slate-900 truncate ${
                          todo.completed ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {todo.title}
                      </p>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        {todo.tag}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {todo.subtitle}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Message Flow & Response Activity (col 7) */}
        <Card className="lg:col-span-7 border-slate-200/80">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Message Volume & Turnaround</CardTitle>
                <CardDescription>
                  Incoming web messages vs resolved inquiries over last 6 days
                </CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600">Incoming</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-slate-600">Resolved</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ActivityTrendChart
              data={
                stats?.activity_timeline?.length ? stats.activity_timeline : [
                  { date: 'Nov 01', incoming: 12, resolved: 10 },
                  { date: 'Nov 02', incoming: 19, resolved: 15 },
                  { date: 'Nov 03', incoming: 24, resolved: 21 },
                  { date: 'Nov 04', incoming: 18, resolved: 17 },
                  { date: 'Nov 05', incoming: 29, resolved: 25 },
                  { date: 'Nov 06', incoming: 14, resolved: 12 },
                ]
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

