'use client'

import { useState, useEffect } from 'react'

interface MobileDetection {
  isMobile: boolean
  isLandscape: boolean
  isMobileLandscape: boolean
  isTouch: boolean
  screenWidth: number
  screenHeight: number
}

export function useMobileDetect(): MobileDetection {
  const [detection, setDetection] = useState<MobileDetection>({
    isMobile: false,
    isLandscape: false,
    isMobileLandscape: false,
    isTouch: false,
    screenWidth: 0,
    screenHeight: 0
  })

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      // Mobile detection: width < 900px (covers most phones and small tablets)
      const isMobile = width < 900

      // Landscape detection: width > height
      const isLandscape = width > height

      // Touch support detection
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

      // Mobile landscape: all conditions must be true
      const isMobileLandscape = isMobile && isLandscape && isTouch

      setDetection({
        isMobile,
        isLandscape,
        isMobileLandscape,
        isTouch,
        screenWidth: width,
        screenHeight: height
      })
    }

    // Check on mount
    checkDevice()

    // Check on resize and orientation change
    window.addEventListener('resize', checkDevice)
    window.addEventListener('orientationchange', checkDevice)

    return () => {
      window.removeEventListener('resize', checkDevice)
      window.removeEventListener('orientationchange', checkDevice)
    }
  }, [])

  return detection
}
