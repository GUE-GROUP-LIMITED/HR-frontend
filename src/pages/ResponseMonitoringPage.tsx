import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Bell,
  Download,
  Users,
  MessageSquare,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Send,
} from 'lucide-react'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Dialog } from '@/components/ui/dialog'
import { exportToCSV, formatDateTime, timeAgo } from '@/lib/utils'
import { MessageResponse } from '@/types'

export const ResponseMonitoringPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all')
  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [reminderStaff, setReminderStaff] = useState<{ id: string; name: string; messageId?: string } | null>(null)
  const [reminderNote, setReminderNote] = useState('')
  const [reminderStatusMsg, setReminderStatusMsg] = useState<string | null>(null)

  const { data: staffPerformance, isLoading: isStaffLoading } = useQuery({
    queryKey: ['monitoring', 'staff'],
    queryFn: () => api.monitoring.getStaffList(),
  })

  const { data: overdueMessages } = useQuery({
    queryKey: ['monitoring', 'overdue'],
    queryFn: () => api.monitoring.getOverdue(),
  })

  const { data: responsesFeed } = useQuery({
    queryKey: ['monitoring', 'responses', selectedStaffId],
    queryFn: () =>
      api.monitoring.getResponsesFeed({
        staff_id: selectedStaffId === 'all' ? undefined : selectedStaffId,
      }),
  })

  // Send reminder mutation
  const reminderMutation = useMutation({
    mutationFn: ({ staffId, messageId, note }: { staffId: string; messageId?: string; note?: string }) =>
      api.monitoring.sendReminder(staffId, messageId, note),
    onSuccess: (data) => {
      setReminderStatusMsg(data.message)
      setTimeout(() => {
        setReminderStatusMsg(null)
        setReminderModalOpen(false)
        setReminderNote('')
      }, 1500)
    },
  })

  const handleOpenReminder = (staffId: string, staffName: string, messageId?: string) => {
    setReminderStaff({ id: staffId, name: staffName, messageId })
    setReminderNote(
      messageId
        ? `HR Alert: Please respond to inquiry #${messageId} immediately to prevent SLA breach.`
        : 'HR SLA Reminder: You have pending messages past the recommended 24-hour response target.'
    )
    setReminderModalOpen(true)
  }

  const handleExportCsv = () => {
    if (!staffPerformance) return
    exportToCSV(
      'gue_hr_staff_performance_report.csv',
      staffPerformance.map((s) => ({
        Staff_Name: s.staff_name,
        Email: s.staff_email,
        Department: s.department,
        Open_Tickets: s.open_count,
        Replied_Count: s.replied_count,
        Resolved_Count: s.resolved_count,
        Overdue_Count: s.overdue_count,
        Avg_First_Response_Hours: `${s.avg_first_response_hours}h`,
        Satisfaction_Score: `${s.satisfaction_score}%`,
      }))
    )
  }

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Staff Response & SLA Monitoring
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time response audit, 24-hour breach prevention, and responder speed metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="flex items-center gap-2 text-xs font-bold bg-white"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV Report</span>
          </Button>
        </div>
      </div>

      {/* 24h SLA Overdue Urgent Alert Panel */}
      {overdueMessages && overdueMessages.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/30 overflow-hidden">
          <CardHeader className="pb-3 border-b border-rose-100 bg-rose-50/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-xs">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-rose-900">
                    SLA Warning: {overdueMessages.length} Messages Overdue (&gt;24h)
                  </CardTitle>
                  <CardDescription className="text-rose-700/80">
                    Messages assigned but not responded to within company SLA thresholds.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 divide-y divide-rose-100">
            {overdueMessages.map((msg) => (
              <div
                key={msg.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-rose-50/80 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-slate-700">#{msg.id}</span>
                    <Badge variant="outline" className="text-[10px] bg-white border-rose-200 text-rose-700">
                      {msg.website.name}
                    </Badge>
                    <span className="text-xs font-bold text-slate-900">{msg.sender_name}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">{msg.subject}</p>
                  <span className="text-[10px] text-slate-400">
                    Received {timeAgo(msg.created_at)} • Assignee: {msg.assigned_to?.name || 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {msg.assigned_to && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleOpenReminder(msg.assigned_to!.id, msg.assigned_to!.name, msg.id)
                      }
                      className="border-rose-300 text-rose-800 hover:bg-rose-100 text-xs font-bold"
                    >
                      <Bell className="h-3.5 w-3.5 mr-1" />
                      <span>Send Reminder</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Staff Response Comparison Table */}
      <Card className="border-slate-200/80 overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold">Responder Turnaround Scorecard</CardTitle>
          <CardDescription>
            Comparison of response velocity and resolution volume by staff responder
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isStaffLoading ? (
            <div className="py-12 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-400 uppercase tracking-wider font-bold text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-5">Staff Member</th>
                    <th className="py-3 px-5">Department</th>
                    <th className="py-3 px-5 text-center">Open</th>
                    <th className="py-3 px-5 text-center">Replied</th>
                    <th className="py-3 px-5 text-center">Resolved</th>
                    <th className="py-3 px-5 text-center">Overdue</th>
                    <th className="py-3 px-5">Avg First Response</th>
                    <th className="py-3 px-5">Satisfaction</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffPerformance?.map((staff) => (
                    <tr key={staff.staff_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={staff.avatar} fallback={staff.staff_name} size="sm" />
                          <div>
                            <span className="font-bold text-slate-900 block">{staff.staff_name}</span>
                            <span className="text-[10px] text-slate-400">{staff.staff_email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-slate-600 font-medium">{staff.department}</td>

                      <td className="py-3.5 px-5 text-center font-bold text-amber-600">
                        {staff.open_count}
                      </td>

                      <td className="py-3.5 px-5 text-center font-bold text-blue-600">
                        {staff.replied_count}
                      </td>

                      <td className="py-3.5 px-5 text-center font-bold text-emerald-600">
                        {staff.resolved_count}
                      </td>

                      <td className="py-3.5 px-5 text-center">
                        {staff.overdue_count > 0 ? (
                          <Badge variant="destructive" className="text-[10px]">
                            {staff.overdue_count} Overdue
                          </Badge>
                        ) : (
                          <span className="text-slate-300 font-medium">0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 font-bold text-slate-800">
                        {staff.avg_first_response_hours}h
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {staff.satisfaction_score}%
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${staff.satisfaction_score}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenReminder(staff.staff_id, staff.staff_name)}
                          className="h-8 text-xs font-semibold"
                        >
                          Send Reminder
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Response Feed Timeline */}
      <Card className="border-slate-200/80">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">Live Responses Timeline</CardTitle>
            <CardDescription>
              Chronological stream of replies sent across all 4 web properties
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {responsesFeed?.data?.map((resp: MessageResponse) => (
            <div
              key={resp.id}
              className="p-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/50 flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <Avatar src={resp.staff_avatar} fallback={resp.staff_name} size="sm" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{resp.staff_name}</span>
                    <Badge variant="success" className="text-[9px] py-0">
                      {resp.sent_to_sender ? 'Direct Email' : 'Internal Note'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {resp.body}
                  </p>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-400 whitespace-nowrap">
                <span>{timeAgo(resp.created_at)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Reminder Modal Dialog */}
      <Dialog
        open={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        title={`Send SLA Reminder to ${reminderStaff?.name}`}
        description="This will send an in-app urgent notification to the staff responder's dashboard."
        maxWidth="md"
      >
        {reminderStatusMsg ? (
          <div className="py-8 text-center text-emerald-600 font-bold text-sm">
            {reminderStatusMsg}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reminder Message
              </label>
              <textarea
                rows={3}
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setReminderModalOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={reminderMutation.isPending}
                onClick={() =>
                  reminderMutation.mutate({
                    staffId: reminderStaff!.id,
                    messageId: reminderStaff?.messageId,
                    note: reminderNote,
                  })
                }
              >
                {reminderMutation.isPending ? 'Sending...' : 'Dispatch Reminder'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
