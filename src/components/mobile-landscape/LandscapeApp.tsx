'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useYTDJStore } from '@/store'
import { LandscapeLaunchPad } from './launchpad/LandscapeLaunchPad'
import { LandscapeLayout } from './LandscapeLayout'
import { YouTubePlayer } from '@/components/features/YouTubePlayer'

export function LandscapeApp() {
  const { initializeStore, currentSet } = useYTDJStore()
  const [showLaunchPad, setShowLaunchPad] = useState(true)

  useEffect(() => {
    initializeStore()
  }, [initializeStore])

  // Skip launch pad if user already has a playlist
  useEffect(() => {
    if (currentSet?.playlist && currentSet.playlist.length > 0) {
      setShowLaunchPad(false)
    }
  }, [currentSet])

  const handleLaunchPadComplete = () => {
    setShowLaunchPad(false)
  }

  const handleNewSet = () => {
    setShowLaunchPad(true)
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#05060f]">
      {/* Background grid pattern */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 242, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 242, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
      />

      {/* YouTube Player - hidden but functional */}
      <YouTubePlayer />

      {/* Main Views */}
      <AnimatePresence mode="wait">
        {showLaunchPad ? (
          <motion.div
            key="landscape-launchpad"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="h-full w-full"
          >
            <LandscapeLaunchPad onComplete={handleLaunchPadComplete} />
          </motion.div>
        ) : (
          <motion.div
            key="landscape-layout"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="h-full w-full"
          >
            <LandscapeLayout onNewSet={handleNewSet} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
