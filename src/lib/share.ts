'use client'

/**
 * Native Share Sheet Utilities for iOS and Android
 * Uses Web Share API with fallbacks
 */

export interface ShareData {
  title?: string
  text?: string
  url?: string
  files?: File[]
}

class ShareEngine {
  private isSupported: boolean = false
  private canShareFiles: boolean = false

  constructor() {
    if (typeof window !== 'undefined' && navigator.share) {
      this.isSupported = true
      // Check if we can share files
      this.canShareFiles = navigator.canShare !== undefined
    }
  }

  /**
   * Check if sharing is supported
   */
  get supported(): boolean {
    return this.isSupported
  }

  /**
   * Check if file sharing is supported
   */
  get supportsFiles(): boolean {
    return this.canShareFiles
  }

  /**
   * Share content using native share sheet
   */
  async share(data: ShareData): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Web Share API not supported')
      return this.fallbackShare(data)
    }

    try {
      // Check if we can share this data
      if (data.files && this.canShareFiles) {
        const canShare = navigator.canShare?.({ files: data.files })
        if (!canShare) {
          console.warn('Cannot share files')
          return this.fallbackShare(data)
        }
      }

      await navigator.share(data)
      return true
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name === 'AbortError') {
        console.log('Share cancelled by user')
        return false
      }
      console.error('Share failed:', error)
      return this.fallbackShare(data)
    }
  }

  /**
   * Share a DJ set
   */
  async shareSet(setName: string, trackCount: number, url?: string): Promise<boolean> {
    return this.share({
      title: `${setName} - YTDJ.AI`,
      text: `Check out my ${trackCount}-track DJ set created with AI! 🎵`,
      url: url || window.location.href
    })
  }

  /**
   * Share a playlist export link
   */
  async sharePlaylist(playlistUrl: string, setName: string): Promise<boolean> {
    return this.share({
      title: `${setName} - YouTube Playlist`,
      text: `Listen to my AI-generated DJ set on YouTube! 🎧`,
      url: playlistUrl
    })
  }

  /**
   * Fallback share method (copy to clipboard + alert)
   */
  private async fallbackShare(data: ShareData): Promise<boolean> {
    const shareText = [data.title, data.text, data.url].filter(Boolean).join('\n\n')

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText)
        alert('Link copied to clipboard!')
        return true
      }
    } catch (error) {
      console.error('Clipboard write failed:', error)
    }

    // Last resort: prompt user to copy
    const textArea = document.createElement('textarea')
    textArea.value = shareText
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()

    try {
      document.execCommand('copy')
      alert('Link copied to clipboard!')
      return true
    } catch (error) {
      console.error('Copy failed:', error)
      return false
    } finally {
      document.body.removeChild(textArea)
    }
  }
}

// Export singleton instance
export const share = new ShareEngine()

// React hook for sharing
export function useShare() {
  return share
}
