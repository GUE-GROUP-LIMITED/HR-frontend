import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNavbar } from './TopNavbar'
import { PublicIntakeModal } from '@/components/simulator/PublicIntakeModal'

export const MainLayout: React.FC = () => {
  const [simulatorOpen, setSimulatorOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Fixed Sidebar */}
      <Sidebar onOpenSimulator={() => setSimulatorOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar onOpenSimulator={() => setSimulatorOpen(true)} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Embedded Public Intake Simulator */}
      <PublicIntakeModal
        open={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
      />
    </div>
  )
}
