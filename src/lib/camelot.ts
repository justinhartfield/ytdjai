/**
 * Camelot Wheel Utilities for Harmonic Mixing
 *
 * The Camelot wheel is a tool for DJs to easily mix tracks in compatible keys.
 * It's a circular representation of musical keys where adjacent keys are harmonically compatible.
 *
 * Structure:
 * - 12 positions (1-12) representing the circle of fifths
 * - Two columns: A (minor keys) and B (major keys)
 * - Compatible transitions: same position, ±1 position, or A↔B at same position
 */

import type { KeyCompatibility } from '@/types'

// Key to Camelot code mapping
// Minor keys map to A column, Major keys to B column
const KEY_TO_CAMELOT: Record<string, string> = {
  // Minor keys (A column) - all enharmonic equivalents
  'Abm': '1A', 'G#m': '1A',
  'Ebm': '2A', 'D#m': '2A',
  'Bbm': '3A', 'A#m': '3A',
  'Fm': '4A',
  'Cm': '5A',
  'Gm': '6A',
  'Dm': '7A',
  'Am': '8A',
  'Em': '9A',
  'Bm': '10A',
  'F#m': '11A', 'Gbm': '11A',
  'C#m': '12A', 'Dbm': '12A',

  // Major keys (B column) - all enharmonic equivalents
  'B': '1B', 'Cb': '1B',
  'F#': '2B', 'Gb': '2B',
  'Db': '3B', 'C#': '3B',
  'Ab': '4B', 'G#': '4B',
  'Eb': '5B', 'D#': '5B',
  'Bb': '6B', 'A#': '6B',
  'F': '7B',
  'C': '8B',
  'G': '9B',
  'D': '10B',
  'A': '11B',
  'E': '12B',
}

// Camelot code to key mapping (using the most common notation)
const CAMELOT_TO_KEY: Record<string, string> = {
  '1A': 'G#m', '1B': 'B',
  '2A': 'D#m', '2B': 'F#',
  '3A': 'A#m', '3B': 'Db',
  '4A': 'Fm', '4B': 'Ab',
  '5A': 'Cm', '5B': 'Eb',
  '6A': 'Gm', '6B': 'Bb',
  '7A': 'Dm', '7B': 'F',
  '8A': 'Am', '8B': 'C',
  '9A': 'Em', '9B': 'G',
  '10A': 'Bm', '10B': 'D',
  '11A': 'F#m', '11B': 'A',
  '12A': 'C#m', '12B': 'E',
}

/**
 * Normalize a key string to standard notation
 * Handles variations like "A minor", "Am", "A min", "a minor"
 */
export function normalizeKey(key: string): string {
  if (!key) return ''

  let cleaned = key.trim()

  // Handle lowercase
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  // Handle "sharp" and "flat" words
  cleaned = cleaned
    .replace(/\s*sharp/i, '#')
    .replace(/\s*flat/i, 'b')

  // Handle "minor" and "major" variations
  cleaned = cleaned
    .replace(/\s*minor/i, 'm')
    .replace(/\s*min$/i, 'm')
    .replace(/\s*maj$/i, '')
    .replace(/\s*major/i, '')

  // Remove spaces
  cleaned = cleaned.replace(/\s+/g, '')

  return cleaned
}

/**
 * Convert a musical key to Camelot wheel notation
 * Returns null if key is not recognized
 */
export function keyToCamelot(key: string | undefined): string | null {
  if (!key) return null

  const normalized = normalizeKey(key)
  return KEY_TO_CAMELOT[normalized] || null
}

/**
 * Convert Camelot code to musical key
 */
export function camelotToKey(code: string): string | null {
  return CAMELOT_TO_KEY[code] || null
}

/**
 * Parse a Camelot code into its numeric and letter components
 */
function parseCamelotCode(code: string): { num: number; letter: 'A' | 'B' } | null {
  const match = code.match(/^(\d{1,2})([AB])$/)
  if (!match) return null

  const num = parseInt(match[1], 10)
  if (num < 1 || num > 12) return null

  return { num, letter: match[2] as 'A' | 'B' }
}

/**
 * Get all compatible Camelot codes for a given code
 * Compatible transitions:
 * 1. Same key (perfect match)
 * 2. +1 position (moving clockwise)
 * 3. -1 position (moving counter-clockwise)
 * 4. Same position, different column (relative major/minor)
 */
export function getCompatibleCodes(code: string): string[] {
  const parsed = parseCamelotCode(code)
  if (!parsed) return [code]

  const { num, letter } = parsed

  // Calculate adjacent positions (wrapping 1-12)
  const prevNum = num === 1 ? 12 : num - 1
  const nextNum = num === 12 ? 1 : num + 1
  const otherLetter = letter === 'A' ? 'B' : 'A'

  return [
    code,                      // Same key
    `${nextNum}${letter}`,     // +1 position
    `${prevNum}${letter}`,     // -1 position
    `${num}${otherLetter}`,    // Relative major/minor
  ]
}

/**
 * Calculate key compatibility between two keys
 * Returns a compatibility level for UI feedback
 */
export function getKeyCompatibility(
  key1: string | undefined,
  key2: string | undefined
): KeyCompatibility {
  // If either key is unknown, return compatible (don't warn)
  if (!key1 || !key2) return 'compatible'

  const code1 = keyToCamelot(key1)
  const code2 = keyToCamelot(key2)

  // If we can't determine Camelot codes, don't warn
  if (!code1 || !code2) return 'compatible'

  // Same key = perfect
  if (code1 === code2) return 'perfect'

  // Check if in compatible list
  const compatible = getCompatibleCodes(code1)
  if (compatible.includes(code2)) return 'compatible'

  // Parse both codes to check distance
  const parsed1 = parseCamelotCode(code1)
  const parsed2 = parseCamelotCode(code2)

  if (!parsed1 || !parsed2) return 'compatible'

  // Calculate circular distance (1-12 wrapping)
  const diff = Math.abs(parsed1.num - parsed2.num)
  const circularDiff = Math.min(diff, 12 - diff)

  // Within 2 positions is a warning (might work with skill)
  if (circularDiff <= 2) return 'warning'

  // Everything else is a clash
  return 'clash'
}

/**
 * Get color for key compatibility indicator
 */
export function getCompatibilityColor(compatibility: KeyCompatibility): string {
  switch (compatibility) {
    case 'perfect':
      return '#00ff88' // Bright green
    case 'compatible':
      return '#00f2ff' // Cyan
    case 'warning':
      return '#ffaa00' // Orange/amber
    case 'clash':
      return '#ff4444' // Red
    default:
      return '#666666' // Gray for unknown
  }
}

/**
 * Get a human-readable description of the key compatibility
 */
export function getCompatibilityDescription(compatibility: KeyCompatibility): string {
  switch (compatibility) {
    case 'perfect':
      return 'Perfect key match'
    case 'compatible':
      return 'Harmonically compatible'
    case 'warning':
      return 'Key clash possible'
    case 'clash':
      return 'Keys will clash'
    default:
      return 'Unknown compatibility'
  }
}

/**
 * Calculate BPM match quality score (0-100)
 * Considers half/double time compatibility
 */
export function calculateBpmMatchScore(
  bpm1: number | undefined,
  bpm2: number | undefined
): number {
  if (!bpm1 || !bpm2) return 50 // Unknown = neutral

  // Check direct difference
  const directDiff = Math.abs(bpm1 - bpm2)

  // Check half/double time (common DJ technique)
  const halfDiff = Math.abs(bpm1 - bpm2 / 2)
  const doubleDiff = Math.abs(bpm1 - bpm2 * 2)

  // Use the smallest difference
  const effectiveDiff = Math.min(directDiff, halfDiff, doubleDiff)

  if (effectiveDiff <= 2) return 100 // Perfect match
  if (effectiveDiff <= 5) return 85  // Great match
  if (effectiveDiff <= 10) return 70 // Good match
  if (effectiveDiff <= 15) return 50 // Acceptable
  if (effectiveDiff <= 20) return 30 // Marginal
  return 10 // Poor match
}

/**
 * Calculate overall transition compatibility score (0-100)
 * Combines BPM match, key compatibility, and energy flow
 */
export function calculateTransitionScore(
  fromBpm: number | undefined,
  toBpm: number | undefined,
  fromKey: string | undefined,
  toKey: string | undefined,
  fromEnergy: number | undefined,
  toEnergy: number | undefined
): number {
  const bpmScore = calculateBpmMatchScore(fromBpm, toBpm)

  const keyCompat = getKeyCompatibility(fromKey, toKey)
  const keyScore: Record<KeyCompatibility, number> = {
    perfect: 100,
    compatible: 85,
    warning: 50,
    clash: 20,
  }

  const energyDiff = Math.abs((fromEnergy || 50) - (toEnergy || 50))
  const energyScore = Math.max(0, 100 - energyDiff * 2)

  // Weighted average
  return Math.round(
    bpmScore * 0.35 +
    keyScore[keyCompat] * 0.35 +
    energyScore * 0.30
  )
}

/**
 * Recommend crossfade duration based on transition quality
 * Better matches can have longer, more seamless crossfades
 * Poor matches should be shorter and more cut-like
 */
export function recommendCrossfadeDuration(
  bpm1: number | undefined,
  bpm2: number | undefined,
  key1: string | undefined,
  key2: string | undefined,
  baseDuration: number = 10
): number {
  const bpmScore = calculateBpmMatchScore(bpm1, bpm2)
  const keyCompat = getKeyCompatibility(key1, key2)

  let duration = baseDuration

  // Adjust for BPM compatibility
  if (bpmScore >= 85) {
    duration = Math.min(duration * 1.5, 30) // Allow longer crossfade
  } else if (bpmScore <= 30) {
    duration = Math.max(duration * 0.5, 5) // Shorter crossfade
  }

  // Adjust for key compatibility
  if (keyCompat === 'clash') {
    duration = Math.max(duration * 0.6, 5)
  } else if (keyCompat === 'warning') {
    duration = Math.max(duration * 0.8, 6)
  }

  return Math.round(duration)
}
