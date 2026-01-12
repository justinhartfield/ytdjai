'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LaunchPad, ArrangementIDE, SessionView } from '@/components/features'
import { useYTDJStore } from '@/store'

type IDEView = 'arrangement' | 'session'

export default function Home() {
  const { initializeStore, currentSet } = useYTDJStore()
  const [showLaunchPad, setShowLaunchPad] = useState(true)
  const [currentView, setCurrentView] = useState<IDEView>('arrangement')

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

  const handleViewChange = (view: IDEView) => {
    setCurrentView(view)
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
          className="h-screen bg-[#05060f] overflow-hidden"
        >
          {currentView === 'arrangement' ? (
            <ArrangementIDE
              onViewChange={handleViewChange}
              currentView={currentView}
            />
          ) : (
            <SessionView
              onViewChange={handleViewChange}
              currentView={currentView}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
