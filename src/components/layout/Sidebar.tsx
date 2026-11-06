import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Inbox,
  Users,
  Activity,
  Globe,
  Layers,
  ShieldCheck,
  FileText,
  Search,
  Sparkles,
  ChevronRight,
  LogOut,
  Send,
  Building2,
  SlidersHorizontal,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SidebarProps {
  onOpenSimulator: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSimulator }) => {
  const { currentUser, role, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 z-40 select-none">
      {/* Top Branding & Search */}
      <div className="p-5 pb-2">
        {/* Logo */}
        <div className="flex items-center gap-3 px-1 mb-6">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">GUE</span>
              <span className="font-bold text-xl text-emerald-600">HR</span>
            </div>
            <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              Contact Hub & Ops
            </p>
          </div>
        </div>

        {/* Search Bar matching inspo */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search hub..."
            onClick={() => navigate('/inbox')}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer"
            readOnly
          />
          <span className="absolute right-2.5 top-2.5 text-[10px] font-mono text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">
            ⌘F
          </span>
        </div>

        {/* Main Nav Section */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Main Menu
          </p>

          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group',
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <LayoutDashboard
                    className={cn(
                      'h-4 w-4',
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                    )}
                  />
                  <span>Executive Overview</span>
                </div>
              </>
            )}
          </NavLink>

          <NavLink
            to="/inbox"
            className={({ isActive }) =>
              cn(
                'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group',
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <Inbox
                    className={cn(
                      'h-4 w-4',
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                    )}
                  />
                  <span>Unified Inbox</span>
                </div>
                {unreadCount > 0 && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full',
                      isActive ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
                    )}
                  >
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>

          {/* Staff's personal responder view */}
          <NavLink
            to="/staff-dashboard"
            className={({ isActive }) =>
              cn(
                'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group',
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )
            }
          >
            {({ isActive }) => (
              <div className="flex items-center gap-3">
                <Users
                  className={cn(
                    'h-4 w-4',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                  )}
                />
                <span>My Responder Desk</span>
              </div>
            )}
          </NavLink>

          {/* HR / Super Admin views */}
          {(role === 'hr' || role === 'super_admin') && (
            <>
              <NavLink
                to="/staff-management"
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group',
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <Users
                      className={cn(
                        'h-4 w-4',
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                      )}
                    />
                    <span>Staff Management</span>
                  </div>
                )}
              </NavLink>

              <NavLink
                to="/monitoring"
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group',
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <Activity
                      className={cn(
                        'h-4 w-4',
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                      )}
                    />
                    <span>Response Monitoring</span>
                  </div>
                )}
              </NavLink>
            </>
          )}

          {/* Super Admin only section */}
          {role === 'super_admin' && (
            <div className="pt-3">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Super Admin
              </p>
              <NavLink
                to="/admin/websites"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all group',
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                <Globe className="h-4 w-4 text-slate-400" />
                <span>Websites & Site Keys</span>
              </NavLink>

              <NavLink
                to="/admin/categories"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all group',
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                <Layers className="h-4 w-4 text-slate-400" />
                <span>Categories & Routing</span>
              </NavLink>

              <NavLink
                to="/admin/audit-logs"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all group',
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <span>Audit Logs</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Favorite Websites Quick Filter matching VertexLab Favorite list */}
        <div className="mt-5 pt-3 border-t border-slate-100">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Company Portals
          </p>
          <div className="space-y-1">
            <button
              onClick={() => navigate('/inbox?website=w2')}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="truncate">Commerce & Shop</span>
              </div>
              <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            </button>
            <button
              onClick={() => navigate('/inbox?website=w3')}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                <span className="truncate">Careers Portal</span>
              </div>
              <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            </button>
            <button
              onClick={() => navigate('/inbox?website=w4')}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span className="truncate">Developer API</span>
              </div>
              <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Card & Profile */}
      <div className="p-4 pt-0">
        {/* Dark Upgrade/Simulator Card matching VertexLab design */}
        <div className="rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 p-4 text-white shadow-card mb-3 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30">
              API TESTER
            </span>
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <h4 className="text-xs font-bold text-white mb-1">Public Intake Simulator</h4>
          <p className="text-[11px] text-slate-400 leading-tight mb-3">
            Simulate a contact form message from any of the 4 websites with X-Site-Key.
          </p>
          <button
            onClick={onOpenSimulator}
            className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
          >
            <Send className="h-3.5 w-3.5 text-emerald-600" />
            <span>Simulate Message</span>
          </button>
        </div>

        {/* User Card Pill */}
        <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Avatar src={currentUser.avatar} fallback={currentUser.name} size="sm" />
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate leading-none">
                {currentUser.name}
              </p>
              <p className="text-[10px] font-semibold text-emerald-700 capitalize mt-0.5">
                {currentUser.role.replace('_', ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Reset / Logout"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

