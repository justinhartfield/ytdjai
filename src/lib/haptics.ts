'use client'

/**
 * Haptic Feedback Utilities for iOS and Android
 * Provides native-feeling haptic feedback for touch interactions
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'

class HapticEngine {
  private isSupported: boolean = false

  constructor() {
    // Check if haptics are supported
    if (typeof window !== 'undefined') {
      this.isSupported = 'vibrate' in navigator || ('hapticFeedback' in navigator)
    }
  }

  /**
   * Trigger haptic feedback
   */
  trigger(style: HapticStyle = 'light') {
    if (!this.isSupported) return

    // Try modern Haptic Feedback API (iOS Safari 15+)
    if ('hapticFeedback' in navigator) {
      try {
        // @ts-ignore - Haptic API not in types yet
        navigator.hapticFeedback?.[style]?.()
        return
      } catch (e) {
        // Fallback to vibration
      }
    }

    // Fallback to Vibration API
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 10],
        warning: [20, 100, 20],
        error: [30, 50, 30, 50, 30],
        selection: [5]
      }

      navigator.vibrate(patterns[style])
    }
  }

  /**
   * Light tap feedback (for button presses)
   */
  light() {
    this.trigger('light')
  }

  /**
   * Medium impact feedback (for swipes, drags)
   */
  medium() {
    this.trigger('medium')
  }

  /**
   * Heavy impact feedback (for important actions)
   */
  heavy() {
    this.trigger('heavy')
  }

  /**
   * Success feedback (for successful operations)
   */
  success() {
    this.trigger('success')
  }

  /**
   * Warning feedback
   */
  warning() {
    this.trigger('warning')
  }

  /**
   * Error feedback
   */
  error() {
    this.trigger('error')
  }

  /**
   * Selection changed feedback (for picker scrolls)
   */
  selection() {
    this.trigger('selection')
  }
}

// Export singleton instance
export const haptics = new HapticEngine()

// React hook for haptic feedback
export function useHaptics() {
  return haptics
}
