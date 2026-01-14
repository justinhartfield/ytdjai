import type {
  AIProvider,
  PlaylistNode,
  Track,
  AIConstraints,
  StreamEvent,
  GeneratePlaylistRequest
} from '@/types'

export interface StreamCallbacks {
  onStarted: (providers: AIProvider[]) => void
  onProviderStarted: (provider: AIProvider) => void
  onPrimaryResult: (provider: AIProvider, tracks: PlaylistNode[]) => void
  onAlternativeResult: (provider: AIProvider, tracks: PlaylistNode[]) => void
  onProviderFailed: (provider: AIProvider, error: string) => void
  onTrackEnriched: (provider: AIProvider, index: number, track: Partial<Track>) => void
  onComplete: (summary: { primary: AIProvider | null; alternatives: AIProvider[]; failed: AIProvider[] }) => void
  onAllFailed: (errors: { provider: AIProvider; error: string }[]) => void
  onError: (error: string) => void
}

// Helper type for params
export interface StreamGenerateParams {
  prompt: string
  trackCount?: number
  energyRange?: { min: number; max: number }
  constraints?: AIConstraints
}

/**
 * Stream playlist generation from all 3 AI providers
 * Returns a cleanup function to abort the stream
 */
export function streamGeneratePlaylist(
  params: {
    prompt: string
    trackCount?: number
    energyRange?: { min: number; max: number }
    constraints?: AIConstraints
  },
  callbacks: StreamCallbacks
): () => void {
  const abortController = new AbortController()

  // Build URL with query params
  const url = new URL('/api/ai/generate-stream', window.location.origin)
  url.searchParams.set('prompt', params.prompt)
  url.searchParams.set('trackCount', String(params.trackCount || 8))
  url.searchParams.set('energyMin', String(params.energyRange?.min || 40))
  url.searchParams.set('energyMax', String(params.energyRange?.max || 80))

  if (params.constraints) {
    url.searchParams.set('constraints', JSON.stringify(params.constraints))
  }

  // Start the stream
  const startStream = async () => {
    try {
      const response = await fetch(url.toString(), {
        signal: abortController.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete events in buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6)) as StreamEvent

              switch (eventData.event) {
                case 'started':
                  callbacks.onStarted(eventData.providers)
                  break

                case 'provider-started':
                  callbacks.onProviderStarted(eventData.provider)
                  break

                case 'primary-result':
                  callbacks.onPrimaryResult(eventData.provider, eventData.tracks)
                  break

                case 'alternative-result':
                  callbacks.onAlternativeResult(eventData.provider, eventData.tracks)
                  break

                case 'provider-failed':
                  callbacks.onProviderFailed(eventData.provider, eventData.error)
                  break

                case 'track-enriched':
                  callbacks.onTrackEnriched(eventData.provider, eventData.index, eventData.track)
                  break

                case 'complete':
                  callbacks.onComplete(eventData.summary)
                  break

                case 'all-failed':
                  callbacks.onAllFailed(eventData.errors)
                  break
              }
            } catch (parseError) {
              console.warn('[Stream] Failed to parse event:', line, parseError)
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[Stream] Aborted')
        return
      }
      console.error('[Stream] Error:', error)
      callbacks.onError(error instanceof Error ? error.message : 'Stream error')
    }
  }

  startStream()

  // Return cleanup function
  return () => {
    abortController.abort()
  }
}

/**
 * Helper to calculate which track position a provider's alternative corresponds to
 * This matches tracks by position (index) since each provider generates the same count
 */
export function matchAlternativeToPosition(
  primaryTracks: PlaylistNode[],
  alternativeTracks: PlaylistNode[],
  alternativeIndex: number
): number {
  // Simple 1:1 position mapping since all providers generate same count
  return Math.min(alternativeIndex, primaryTracks.length - 1)
}

/**
 * Promise-based streaming that resolves when primary result is received
 * Continues streaming alternatives in background via callbacks
 */
export function generatePlaylistStream(
  params: StreamGenerateParams,
  callbacks?: Partial<StreamCallbacks>
): Promise<{
  primaryProvider: AIProvider
  primaryTracks: PlaylistNode[]
  cleanup: () => void
}> {
  return new Promise((resolve, reject) => {
    let cleanup: () => void
    let resolved = false

    const fullCallbacks: StreamCallbacks = {
      onStarted: (providers) => {
        console.log('[Stream] Started with providers:', providers)
        callbacks?.onStarted?.(providers)
      },
      onProviderStarted: (provider) => {
        console.log('[Stream] Provider started:', provider)
        callbacks?.onProviderStarted?.(provider)
      },
      onPrimaryResult: (provider, tracks) => {
        console.log('[Stream] Primary result from:', provider, 'tracks:', tracks.length)
        callbacks?.onPrimaryResult?.(provider, tracks)
        // Resolve immediately when first result arrives
        if (!resolved) {
          resolved = true
          resolve({ primaryProvider: provider, primaryTracks: tracks, cleanup })
        }
      },
      onAlternativeResult: (provider, tracks) => {
        console.log('[Stream] Alternative result from:', provider, 'tracks:', tracks.length)
        callbacks?.onAlternativeResult?.(provider, tracks)
      },
      onProviderFailed: (provider, error) => {
        console.log('[Stream] Provider failed:', provider, error)
        callbacks?.onProviderFailed?.(provider, error)
      },
      onTrackEnriched: (provider, index, track) => {
        console.log('[Stream] Track enriched:', provider, index, track.title)
        callbacks?.onTrackEnriched?.(provider, index, track)
      },
      onComplete: (summary) => {
        console.log('[Stream] Complete:', summary)
        callbacks?.onComplete?.(summary)
      },
      onAllFailed: (errors) => {
        console.error('[Stream] All providers failed:', errors)
        callbacks?.onAllFailed?.(errors)
        if (!resolved) {
          reject(new Error(errors.map(e => `${e.provider}: ${e.error}`).join(', ')))
        }
      },
      onError: (error) => {
        console.error('[Stream] Error:', error)
        callbacks?.onError?.(error)
        if (!resolved) {
          reject(new Error(error))
        }
      }
    }

    cleanup = streamGeneratePlaylist(params, fullCallbacks)
  })
}

/**
 * Create skeleton/ghost tracks for loading state
 */
export function createGhostTracks(count: number): PlaylistNode[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `ghost-${Date.now()}-${index}`,
    track: {
      id: `ghost-track-${Date.now()}-${index}`,
      youtubeId: '',
      title: 'Loading...',
      artist: 'Loading...',
      duration: 240,
      energy: 50,
    },
    position: index,
    state: 'loading' as const,
  }))
}
