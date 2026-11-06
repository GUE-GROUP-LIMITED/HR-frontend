import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ShieldCheck,
  Search,
  FileText,
  User,
  Clock,
  RefreshCw,
  Download,
} from 'lucide-react'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, exportToCSV } from '@/lib/utils'

export const AuditLogsPage: React.FC = () => {
  const [search, setSearch] = useState('')

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.auditLogs.list(),
  })

  const filteredLogs = logs?.filter((l) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      l.action.toLowerCase().includes(q) ||
      l.actor_name.toLowerCase().includes(q) ||
      l.entity.toLowerCase().includes(q) ||
      l.entity_id.toLowerCase().includes(q)
    )
  })

  const handleExportCsv = () => {
    if (!logs) return
    exportToCSV(
      'gue_hr_system_audit_trail.csv',
      logs.map((l) => ({
        Audit_ID: l.id,
        Timestamp: l.created_at,
        Actor_Name: l.actor_name,
        Actor_Role: l.actor_role,
        Action: l.action,
        Entity: l.entity,
        Entity_ID: l.entity_id,
        Metadata: JSON.stringify(l.metadata || {}),
      }))
    )
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Security & System Audit Trail
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Immutable log of staff assignments, key rotations, status changes, and responses.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="flex items-center gap-2 text-xs font-bold bg-white"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Audit Trail</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-soft">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Filter audit entries by actor, action type, or entity ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-xs h-10 rounded-2xl bg-slate-50"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border-slate-200/80 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-400 uppercase tracking-wider font-bold text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-5">Timestamp</th>
                    <th className="py-3 px-5">Actor & Role</th>
                    <th className="py-3 px-5">Action Performed</th>
                    <th className="py-3 px-5">Target Entity</th>
                    <th className="py-3 px-5">Metadata Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredLogs?.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 text-slate-400 whitespace-nowrap text-[11px]">
                        {formatDateTime(log.created_at)}
                      </td>

                      <td className="py-3.5 px-5 font-sans whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{log.actor_name}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {log.actor_role}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[10px]">
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 whitespace-nowrap text-slate-700">
                        <span>{log.entity}: </span>
                        <span className="font-bold text-slate-900">{log.entity_id}</span>
                      </td>

                      <td className="py-3.5 px-5 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
