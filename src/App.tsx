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

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="inbox" element={<InboxPage />} />
                <Route path="staff-dashboard" element={<StaffDashboardPage />} />
                <Route path="staff-management" element={<StaffManagementPage />} />
                <Route path="monitoring" element={<ResponseMonitoringPage />} />
                <Route path="admin/websites" element={<AdminWebsitesPage />} />
                <Route path="admin/categories" element={<AdminCategoriesPage />} />
                <Route path="admin/audit-logs" element={<AuditLogsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
