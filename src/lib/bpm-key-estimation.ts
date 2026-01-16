/**
 * BPM and Key Estimation Service
 *
 * Uses AI to estimate BPM and musical key from track metadata (title, artist, genre).
 * This is used for AutoMix feature to calculate transition compatibility.
 */

import type { Track } from '@/types'
import { keyToCamelot } from './camelot'

export interface BpmKeyEstimate {
  bpm: number
  key: string
  camelotCode: string | null
  confidence: number // 0-1
}

export interface BatchEstimateResult {
  success: boolean
  estimates?: Map<number, BpmKeyEstimate> // Map of trackIndex to estimate
  error?: string
}

/**
 * Estimate BPM and key for a single track via API
 */
export async function estimateBpmKey(
  title: string,
  artist: string,
  genre?: string
): Promise<BpmKeyEstimate | null> {
  try {
    const response = await fetch('/api/ai/estimate-bpm-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tracks: [{ title, artist, genre }],
      }),
    })

    if (!response.ok) {
      console.error('[BPM/Key] Estimation failed:', response.status)
      return null
    }

    const data = await response.json()
    if (data.success && data.estimates?.length > 0) {
      const estimate = data.estimates[0]
      return {
        bpm: estimate.bpm,
        key: estimate.key,
        camelotCode: keyToCamelot(estimate.key),
        confidence: estimate.confidence,
      }
    }

    return null
  } catch (error) {
    console.error('[BPM/Key] Estimation error:', error)
    return null
  }
}

/**
 * Batch estimate BPM and key for multiple tracks
 * Returns a Map keyed by track index for easy lookup
 */
export async function batchEstimateBpmKey(
  tracks: Array<{ index: number; title: string; artist: string; genre?: string }>
): Promise<BatchEstimateResult> {
  try {
    const response = await fetch('/api/ai/estimate-bpm-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tracks: tracks.map((t) => ({
          title: t.title,
          artist: t.artist,
          genre: t.genre,
        })),
      }),
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    if (!data.success) {
      return { success: false, error: data.error || 'Unknown error' }
    }

    const estimates = new Map<number, BpmKeyEstimate>()
    for (let i = 0; i < data.estimates.length; i++) {
      const estimate = data.estimates[i]
      if (estimate && tracks[i]) {
        estimates.set(tracks[i].index, {
          bpm: estimate.bpm,
          key: estimate.key,
          camelotCode: keyToCamelot(estimate.key),
          confidence: estimate.confidence,
        })
      }
    }

    return { success: true, estimates }
  } catch (error) {
    console.error('[BPM/Key] Batch estimation error:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * Extract tracks that need BPM/key estimation from a playlist
 * Filters out tracks that already have this data
 */
export function getTracksNeedingEstimation(
  playlist: Array<{ track: Track; index?: number }>,
  forceAll = false
): Array<{ index: number; title: string; artist: string; genre?: string }> {
  return playlist
    .map((node, idx) => ({
      index: node.index ?? idx,
      track: node.track,
    }))
    .filter(({ track }) => {
      if (forceAll) return true
      // Need estimation if missing BPM or key
      return !track.bpm || !track.key
    })
    .map(({ index, track }) => ({
      index,
      title: track.title,
      artist: track.artist,
      genre: track.genre || track.genres?.[0],
    }))
}

/**
 * Genre to typical BPM range mapping
 * Used for fallback estimation if AI fails
 */
export const GENRE_BPM_RANGES: Record<string, { min: number; max: number; typical: number }> = {
  house: { min: 118, max: 135, typical: 125 },
  'deep house': { min: 118, max: 128, typical: 122 },
  'tech house': { min: 122, max: 130, typical: 126 },
  techno: { min: 125, max: 150, typical: 130 },
  'melodic techno': { min: 118, max: 128, typical: 122 },
  trance: { min: 125, max: 150, typical: 138 },
  'progressive house': { min: 122, max: 132, typical: 128 },
  'drum and bass': { min: 160, max: 180, typical: 174 },
  dnb: { min: 160, max: 180, typical: 174 },
  dubstep: { min: 138, max: 150, typical: 140 },
  'hip hop': { min: 80, max: 115, typical: 90 },
  'hip-hop': { min: 80, max: 115, typical: 90 },
  rap: { min: 80, max: 115, typical: 90 },
  trap: { min: 130, max: 170, typical: 140 },
  rnb: { min: 60, max: 100, typical: 80 },
  'r&b': { min: 60, max: 100, typical: 80 },
  pop: { min: 90, max: 130, typical: 110 },
  rock: { min: 100, max: 140, typical: 120 },
  indie: { min: 90, max: 140, typical: 115 },
  electronic: { min: 110, max: 140, typical: 125 },
  edm: { min: 118, max: 150, typical: 128 },
  ambient: { min: 60, max: 90, typical: 70 },
  disco: { min: 110, max: 130, typical: 120 },
  funk: { min: 90, max: 120, typical: 105 },
  soul: { min: 70, max: 110, typical: 90 },
  jazz: { min: 80, max: 180, typical: 120 },
  reggae: { min: 60, max: 90, typical: 75 },
  latin: { min: 80, max: 130, typical: 100 },
  salsa: { min: 80, max: 120, typical: 95 },
  country: { min: 90, max: 130, typical: 110 },
  metal: { min: 100, max: 200, typical: 140 },
  punk: { min: 150, max: 200, typical: 175 },
}

/**
 * Fallback BPM estimation based on genre
 */
export function fallbackBpmFromGenre(genre?: string): number {
  if (!genre) return 120 // Default fallback

  const normalizedGenre = genre.toLowerCase().trim()

  // Exact match
  if (GENRE_BPM_RANGES[normalizedGenre]) {
    return GENRE_BPM_RANGES[normalizedGenre].typical
  }

  // Partial match
  for (const [key, range] of Object.entries(GENRE_BPM_RANGES)) {
    if (normalizedGenre.includes(key) || key.includes(normalizedGenre)) {
      return range.typical
    }
  }

  return 120 // Ultimate fallback
}
