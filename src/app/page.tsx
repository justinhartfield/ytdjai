'use client'

import { useEffect } from 'react'
import { Header, Sidebar, WorkspacePanel } from '@/components/layout'
import { useYTDJStore } from '@/store'

export default function Home() {
  const { initializeStore } = useYTDJStore()

  useEffect(() => {
    // Initialize store on mount
    initializeStore()
  }, [initializeStore])

  return (
    <div className="h-screen flex flex-col bg-[#05060f] overflow-hidden">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="relative">
          <Sidebar />
        </div>

        {/* Workspace */}
        <main className="flex-1 overflow-hidden bg-[#0a0c1c]">
          <WorkspacePanel />
        </main>
      </div>
    </div>
  )
}
