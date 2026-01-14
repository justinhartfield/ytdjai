'use client'

import { useRef, useEffect, RefObject } from 'react'

export type SwipeDirection = 'left' | 'right' | 'up' | 'down'

interface SwipeCallbacks {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

interface SwipeOptions {
  minSwipeDistance?: number // Minimum distance in pixels to trigger swipe
  maxSwipeTime?: number // Maximum time in ms for a swipe
  preventScroll?: boolean
}

export function useSwipeGesture(
  ref: RefObject<HTMLElement>,
  callbacks: SwipeCallbacks,
  options: SwipeOptions = {}
) {
  const {
    minSwipeDistance = 50,
    maxSwipeTime = 300,
    preventScroll = false
  } = options

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      if (preventScroll) {
        e.preventDefault()
      }
      const touch = e.touches[0]
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStart.current.x
      const deltaY = touch.clientY - touchStart.current.y
      const deltaTime = Date.now() - touchStart.current.time

      // Check if swipe is within time limit
      if (deltaTime > maxSwipeTime) {
        touchStart.current = null
        return
      }

      // Determine primary direction (horizontal or vertical)
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      if (absX > absY && absX > minSwipeDistance) {
        // Horizontal swipe
        if (deltaX > 0) {
          callbacks.onSwipeRight?.()
        } else {
          callbacks.onSwipeLeft?.()
        }
      } else if (absY > absX && absY > minSwipeDistance) {
        // Vertical swipe
        if (deltaY > 0) {
          callbacks.onSwipeDown?.()
        } else {
          callbacks.onSwipeUp?.()
        }
      }

      touchStart.current = null
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (preventScroll && touchStart.current) {
        e.preventDefault()
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventScroll })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchmove', handleTouchMove)
    }
  }, [ref, callbacks, minSwipeDistance, maxSwipeTime, preventScroll])
}
