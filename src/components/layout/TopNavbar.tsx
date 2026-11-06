import React, { useState } from 'react'
import {
  Bell,
  Calendar,
  Send,
  UserCheck,
  ChevronDown,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { timeAgo } from '@/lib/utils'
import { UserRole } from '@/types'

interface TopNavbarProps {
  onOpenSimulator: () => void
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onOpenSimulator }) => {
  const { currentUser, role, switchRole, allUsers, switchUser } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [showRoleMenu, setShowRoleMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Left: Breadcrumbs / Title */}
      <div className="flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span className="text-xs font-semibold text-slate-400">GUE Enterprise System</span>
        <span className="text-slate-300">/</span>
        <h1 className="text-sm font-bold text-slate-800">HR Contact Hub</h1>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Active Role Switcher Pill - Allows switching between Super Admin, HR, and Staff */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-xs font-semibold text-slate-700 shadow-2xs"
          >
            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Role:</span>
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold uppercase text-[10px]">
              {role.replace('_', ' ')}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-floating p-2 z-50">
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Switch Test Persona & Role
              </p>
              <div className="space-y-1">
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchUser(u.id)
                      setShowRoleMenu(false)
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                      currentUser.id === u.id
                        ? 'bg-emerald-50 text-emerald-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Avatar src={u.avatar} fallback={u.name} size="sm" />
                    <div className="overflow-hidden flex-1">
                      <p className="truncate font-semibold">{u.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{u.role.replace('_', ' ')}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Date display matching VertexLab style */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/70 bg-white text-xs font-medium text-slate-600">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>4 Nov 2026</span>
        </div>

        {/* Public Intake Simulator Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenSimulator}
          className="hidden sm:flex items-center gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/40"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Test Intake API</span>
        </Button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-floating p-4 z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">Live Notifications</h4>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-medium text-emerald-600 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto mt-2 space-y-2 pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No notifications yet</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        n.is_read
                          ? 'bg-slate-50/60 border-slate-100 text-slate-600'
                          : 'bg-emerald-50/50 border-emerald-100 text-slate-900 font-medium'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {n.type === 'urgent' ? (
                          <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                        ) : n.type === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-bold text-xs">{n.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {n.message}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

