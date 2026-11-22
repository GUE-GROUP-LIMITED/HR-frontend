import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { MainLayout } from '@/components/layout/MainLayout'

import { DashboardPage } from '@/pages/DashboardPage'
import { InboxPage } from '@/pages/InboxPage'
import { StaffDashboardPage } from '@/pages/StaffDashboardPage'
import { StaffManagementPage } from '@/pages/StaffManagementPage'
import { ResponseMonitoringPage } from '@/pages/ResponseMonitoringPage'
import { AdminWebsitesPage } from '@/pages/AdminWebsitesPage'
import { AdminCategoriesPage } from '@/pages/AdminCategoriesPage'
import { AuditLogsPage } from '@/pages/AuditLogsPage'
import { GroupOperationsPage } from '@/pages/GroupOperationsPage'
import { PayrollPage } from '@/pages/PayrollPage'
import { MeetingsPage } from '@/pages/MeetingsPage'
import { RecruitmentPage } from '@/pages/RecruitmentPage'
import { PosDashboardPage } from '@/pages/PosDashboardPage'
import { LogisticsPage } from '@/pages/LogisticsPage'
import { WebOrdersPage } from '@/pages/WebOrdersPage'
import { LoginPage } from '@/pages/LoginPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { UserPermission } from '@/types'
import { hasPermission } from '@/lib/access'
import { useAuth } from '@/contexts/AuthContext'

const PermissionPage: React.FC<{ permission: UserPermission; children: React.ReactNode }> = ({
  permission,
  children,
}) => {
  const { currentUser } = useAuth()
  return hasPermission(currentUser, permission) ? children : <AccessDenied />
}

const AdminPage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth()
  return currentUser.role === 'super_admin' ? children : <AccessDenied />
}

const AccessDenied: React.FC = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
    <h2 className="text-lg font-bold text-slate-900">Access not available</h2>
    <p className="mt-2 text-sm text-slate-500">
      This demo persona does not have permission to open this page.
    </p>
  </div>
)

const AppShell: React.FC = () => {
  const { isAuthenticated, isBackendMode, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-semibold text-slate-500">Restoring secure session...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <NotificationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="staff-dashboard" element={<StaffDashboardPage />} />
            {!isBackendMode && <Route path="meetings" element={<MeetingsPage />} />}
            <Route path="staff-management" element={
              <PermissionPage permission="view_staff"><StaffManagementPage /></PermissionPage>
            } />
            {!isBackendMode && (
              <Route path="recruitment" element={
                <PermissionPage permission="manage_staff"><RecruitmentPage /></PermissionPage>
              } />
            )}
            <Route path="monitoring" element={
              <PermissionPage permission="view_monitoring"><ResponseMonitoringPage /></PermissionPage>
            } />
            <Route path="admin/websites" element={
              <AdminPage><AdminWebsitesPage /></AdminPage>
            } />
            <Route path="admin/categories" element={
              <AdminPage><AdminCategoriesPage /></AdminPage>
            } />
            <Route path="admin/audit-logs" element={
              <AdminPage><AuditLogsPage /></AdminPage>
            } />
            {!isBackendMode && (
              <>
                <Route path="operations" element={
                  <PermissionPage permission="view_operations"><GroupOperationsPage /></PermissionPage>
                } />
                <Route path="operations/payroll" element={
                  <PermissionPage permission="view_payroll"><PayrollPage /></PermissionPage>
                } />
                <Route path="pos" element={<PosDashboardPage />} />
                <Route path="web-orders" element={<WebOrdersPage />} />
                <Route path="logistics" element={<LogisticsPage />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
