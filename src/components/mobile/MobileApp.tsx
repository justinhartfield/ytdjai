'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useYTDJStore } from '@/store'
import { MobileLaunchPad } from './MobileLaunchPad'
import { MobileArrangement } from './MobileArrangement'
import { YouTubePlayer } from '@/components/features/YouTubePlayer'

export function MobileApp() {
  const { initializeStore, currentSet } = useYTDJStore()
  const [showLaunchPad, setShowLaunchPad] = useState(true)

  useEffect(() => {
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

  const handleShowLaunchPad = () => {
    setShowLaunchPad(true)
  }

  return (
    <>
      {/* YouTube Player - hidden but functional */}
      <YouTubePlayer />

      {/* Main Views */}
      <AnimatePresence mode="wait">
        {showLaunchPad ? (
          <motion.div
            key="mobile-launchpad"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MobileLaunchPad onComplete={handleLaunchPadComplete} />
          </motion.div>
        ) : (
          <motion.div
            key="mobile-arrangement"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MobileArrangement onShowLaunchPad={handleShowLaunchPad} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
