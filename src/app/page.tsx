'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Header, Sidebar, WorkspacePanel } from '@/components/layout'
import { LaunchPad } from '@/components/features'
import { useYTDJStore } from '@/store'

export default function Home() {
  const { initializeStore, currentSet } = useYTDJStore()
  const [showLaunchPad, setShowLaunchPad] = useState(true)

  useEffect(() => {
    // Initialize store on mount
    initializeStore()
  }, [initializeStore])

  // If user already has a playlist, skip launch pad
  useEffect(() => {
    if (currentSet?.playlist && currentSet.playlist.length > 0) {
      setShowLaunchPad(false)
    }
  }, [currentSet])

  const handleLaunchPadComplete = () => {
    setShowLaunchPad(false)
  }

  return (
    <AnimatePresence mode="wait">
      {showLaunchPad ? (
        <motion.div
          key="launchpad"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LaunchPad onComplete={handleLaunchPadComplete} />
        </motion.div>
      ) : (
        <motion.div
          key="ide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="h-screen flex flex-col bg-[#05060f] overflow-hidden"
        >
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}
