// DJ Export Utilities - Generate export files for DJ software (Rekordbox, Serato, etc.)
import type { PlaylistNode, Set } from '@/types'

// === KEY CONVERSION ===

// Map musical keys to Camelot wheel notation
// Format: Key -> Camelot Code (e.g., "C major" -> "8B", "A minor" -> "8A")
const KEY_TO_CAMELOT: Record<string, string> = {
  // Major keys (B suffix)
  'C': '8B', 'C major': '8B', 'Cmaj': '8B',
  'C#': '3B', 'C# major': '3B', 'C#maj': '3B', 'Db': '3B', 'Db major': '3B', 'Dbmaj': '3B',
  'D': '10B', 'D major': '10B', 'Dmaj': '10B',
  'D#': '5B', 'D# major': '5B', 'D#maj': '5B', 'Eb': '5B', 'Eb major': '5B', 'Ebmaj': '5B',
  'E': '12B', 'E major': '12B', 'Emaj': '12B',
  'F': '7B', 'F major': '7B', 'Fmaj': '7B',
  'F#': '2B', 'F# major': '2B', 'F#maj': '2B', 'Gb': '2B', 'Gb major': '2B', 'Gbmaj': '2B',
  'G': '9B', 'G major': '9B', 'Gmaj': '9B',
  'G#': '4B', 'G# major': '4B', 'G#maj': '4B', 'Ab': '4B', 'Ab major': '4B', 'Abmaj': '4B',
  'A': '11B', 'A major': '11B', 'Amaj': '11B',
  'A#': '6B', 'A# major': '6B', 'A#maj': '6B', 'Bb': '6B', 'Bb major': '6B', 'Bbmaj': '6B',
  'B': '1B', 'B major': '1B', 'Bmaj': '1B',

  // Minor keys (A suffix)
  'Cm': '5A', 'C minor': '5A', 'Cmin': '5A', 'C min': '5A',
  'C#m': '12A', 'C# minor': '12A', 'C#min': '12A', 'Dbm': '12A', 'Db minor': '12A', 'Dbmin': '12A',
  'Dm': '7A', 'D minor': '7A', 'Dmin': '7A', 'D min': '7A',
  'D#m': '2A', 'D# minor': '2A', 'D#min': '2A', 'Ebm': '2A', 'Eb minor': '2A', 'Ebmin': '2A',
  'Em': '9A', 'E minor': '9A', 'Emin': '9A', 'E min': '9A',
  'Fm': '4A', 'F minor': '4A', 'Fmin': '4A', 'F min': '4A',
  'F#m': '11A', 'F# minor': '11A', 'F#min': '11A', 'Gbm': '11A', 'Gb minor': '11A', 'Gbmin': '11A',
  'Gm': '6A', 'G minor': '6A', 'Gmin': '6A', 'G min': '6A',
  'G#m': '1A', 'G# minor': '1A', 'G#min': '1A', 'Abm': '1A', 'Ab minor': '1A', 'Abmin': '1A',
  'Am': '8A', 'A minor': '8A', 'Amin': '8A', 'A min': '8A',
  'A#m': '3A', 'A# minor': '3A', 'A#min': '3A', 'Bbm': '3A', 'Bb minor': '3A', 'Bbmin': '3A',
  'Bm': '10A', 'B minor': '10A', 'Bmin': '10A', 'B min': '10A',
}

/**
 * Convert a musical key to Camelot notation
 * @param key - Musical key (e.g., "C major", "Am", "F#m")
 * @returns Camelot notation (e.g., "8B", "8A", "11A") or original if unknown
 */
export function toCamelotKey(key: string | undefined): string {
  if (!key) return ''

  // Normalize: trim and check directly
  const normalized = key.trim()

  // Direct lookup
  if (KEY_TO_CAMELOT[normalized]) {
    return KEY_TO_CAMELOT[normalized]
  }

  // Try lowercase variations
  const lower = normalized.toLowerCase()
  for (const [k, v] of Object.entries(KEY_TO_CAMELOT)) {
    if (k.toLowerCase() === lower) {
      return v
    }
  }

  // Return original if no match (might already be Camelot)
  if (/^[1-9]|1[0-2][AB]$/i.test(normalized)) {
    return normalized.toUpperCase()
  }

  return key
}

/**
 * Get the original musical key notation
 */
export function toClassicalKey(key: string | undefined): string {
  return key || ''
}


// === SEGMENT LABELING ===

export type SegmentLabel = 'Intro' | 'Warmup' | 'Build' | 'Peak' | 'Sustain' | 'Cooldown' | 'Outro'

/**
 * Determine segment label based on position and energy in the set
 * Uses position (%) and energy level to determine the segment
 */
export function getSegmentLabel(
  position: number,
  totalTracks: number,
  energy: number,
  energies: number[]
): SegmentLabel {
  const positionPercent = (position / (totalTracks - 1)) * 100
  const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length
  const maxEnergy = Math.max(...energies)

  // First 10% of set
  if (positionPercent <= 10) {
    return 'Intro'
  }

  // Last 10% of set
  if (positionPercent >= 90) {
    return 'Outro'
  }

  // Check if this is near the peak (within 5 points of max energy)
  if (energy >= maxEnergy - 5 && energy >= 75) {
    return 'Peak'
  }

  // Early part of set (10-40%)
  if (positionPercent < 40) {
    if (energy < avgEnergy) {
      return 'Warmup'
    }
    return 'Build'
  }

  // Middle to late (40-70%)
  if (positionPercent < 70) {
    if (energy >= 70) {
      return 'Peak'
    }
    if (energy >= avgEnergy) {
      return 'Sustain'
    }
    return 'Build'
  }

  // Late part (70-90%)
  if (energy >= 70) {
    return 'Sustain'
  }
  return 'Cooldown'
}


// === EXPORT FORMAT TYPES ===

export type ExportFormat = 'rekordbox' | 'serato' | 'generic' | 'm3u'

export interface DJExportTrack {
  position: number
  title: string
  artist: string
  duration: string // MM:SS format
  durationSeconds: number
  url: string
  key: string // Classical notation
  camelotKey: string
  energy: number
  segment: SegmentLabel
  aiNotes: string
  genres: string
  explicit: boolean
}

/**
 * Transform playlist nodes into DJ export format
 */
export function transformToExportTracks(nodes: PlaylistNode[]): DJExportTrack[] {
  const energies = nodes.map(n => n.targetEnergy ?? n.track.energy ?? 50)

  return nodes.map((node, index) => {
    const track = node.track
    const energy = node.targetEnergy ?? track.energy ?? 50
    const durationSeconds = track.duration || 0
    const minutes = Math.floor(durationSeconds / 60)
    const seconds = durationSeconds % 60

    return {
      position: index + 1,
      title: track.title || 'Unknown',
      artist: track.artist || 'Unknown',
      duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      durationSeconds,
      url: track.youtubeId ? `https://youtube.com/watch?v=${track.youtubeId}` : '',
      key: toClassicalKey(track.key),
      camelotKey: toCamelotKey(track.key),
      energy,
      segment: getSegmentLabel(index, nodes.length, energy, energies),
      aiNotes: track.aiReasoning || '',
      genres: (track.genres || []).join(', ') || track.genre || '',
      explicit: track.isExplicit || false,
    }
  })
}


// === CSV GENERATORS ===

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSV(field: string | number | boolean): string {
  const str = String(field)
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Generate Rekordbox-compatible CSV
 * Rekordbox uses specific column headers
 */
export function generateRekordboxCSV(tracks: DJExportTrack[], setName: string): string {
  const headers = [
    '#', 'Track Title', 'Artist', 'Time', 'Key', 'Energy', 'Genre', 'Comments'
  ]

  const rows = tracks.map(t => [
    t.position,
    escapeCSV(t.title),
    escapeCSV(t.artist),
    t.duration,
    t.camelotKey || t.key,
    t.energy,
    escapeCSV(t.genres),
    escapeCSV(`[${t.segment}] ${t.aiNotes}`.trim()),
  ])

  // Add metadata comment at top
  const comment = `# YTDJ.AI Export - ${setName} - ${new Date().toISOString().split('T')[0]}`

  return [
    comment,
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
}

/**
 * Generate Serato-compatible CSV
 */
export function generateSeratoCSV(tracks: DJExportTrack[], setName: string): string {
  const headers = [
    'Name', 'Artist', 'Key', 'BPM', 'Time', 'Label', 'Comment'
  ]

  const rows = tracks.map(t => [
    escapeCSV(t.title),
    escapeCSV(t.artist),
    t.camelotKey || t.key,
    '', // BPM - not available from our data
    t.duration,
    escapeCSV(t.segment),
    escapeCSV(t.aiNotes),
  ])

  const comment = `# YTDJ.AI Export - ${setName}`

  return [
    comment,
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
}

/**
 * Generate comprehensive generic CSV with all available metadata
 */
export function generateGenericCSV(tracks: DJExportTrack[], setName: string): string {
  const headers = [
    'Position',
    'Title',
    'Artist',
    'Duration',
    'Duration (sec)',
    'YouTube URL',
    'Key',
    'Camelot Key',
    'Energy',
    'Segment',
    'Genres',
    'Explicit',
    'AI Notes'
  ]

  const rows = tracks.map(t => [
    t.position,
    escapeCSV(t.title),
    escapeCSV(t.artist),
    t.duration,
    t.durationSeconds,
    t.url,
    t.key,
    t.camelotKey,
    t.energy,
    t.segment,
    escapeCSV(t.genres),
    t.explicit ? 'Yes' : 'No',
    escapeCSV(t.aiNotes),
  ])

  const meta = [
    `# Set Name: ${setName}`,
    `# Exported: ${new Date().toISOString()}`,
    `# Tracks: ${tracks.length}`,
    `# Total Duration: ${formatTotalDurationExport(tracks)}`,
    '#',
  ]

  return [
    ...meta,
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
}


// === M3U PLAYLIST GENERATOR ===

/**
 * Generate M3U playlist file
 * This creates YouTube URLs that can be opened in browser
 */
export function generateM3U(tracks: DJExportTrack[], setName: string): string {
  const lines = [
    '#EXTM3U',
    `#PLAYLIST:${setName}`,
    '',
  ]

  for (const track of tracks) {
    // Extended info: duration in seconds, artist - title
    lines.push(`#EXTINF:${track.durationSeconds},${track.artist} - ${track.title}`)
    // Additional metadata as comments
    lines.push(`#YTDJ:energy=${track.energy},key=${track.camelotKey || track.key},segment=${track.segment}`)
    // Use YouTube URL if available, otherwise create a search URL
    const url = track.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.artist} ${track.title}`)}`
    lines.push(url)
    lines.push('')
  }

  return lines.join('\n')
}


// === TEXT EXPORT (Simple readable format) ===

/**
 * Generate a simple text file with set information
 */
export function generateTextExport(tracks: DJExportTrack[], setName: string): string {
  const lines = [
    '═'.repeat(60),
    `  ${setName.toUpperCase()}`,
    '═'.repeat(60),
    `  Exported from YTDJ.AI | ${new Date().toLocaleDateString()}`,
    `  ${tracks.length} tracks | ${formatTotalDurationExport(tracks)}`,
    '═'.repeat(60),
    '',
  ]

  let currentSegment = ''

  for (const track of tracks) {
    // Add segment header when it changes
    if (track.segment !== currentSegment) {
      currentSegment = track.segment
      lines.push('')
      lines.push(`── ${track.segment.toUpperCase()} ${'─'.repeat(45 - track.segment.length)}`)
      lines.push('')
    }

    lines.push(`${track.position.toString().padStart(2, '0')}. ${track.artist} - ${track.title}`)
    lines.push(`    ${track.duration} | Energy: ${track.energy} | Key: ${track.camelotKey || track.key || 'N/A'}`)
    if (track.aiNotes) {
      lines.push(`    "${track.aiNotes}"`)
    }
    lines.push('')
  }

  lines.push('═'.repeat(60))
  lines.push('  Generated with YTDJ.AI - https://ytdj.ai')
  lines.push('═'.repeat(60))

  return lines.join('\n')
}


// === HELPER FUNCTIONS ===

function formatTotalDurationExport(tracks: DJExportTrack[]): string {
  const totalSeconds = tracks.reduce((acc, t) => acc + t.durationSeconds, 0)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}


// === DOWNLOAD HELPERS ===

/**
 * Trigger file download in browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up
  URL.revokeObjectURL(url)
}

/**
 * Get filename with proper extension based on format
 */
export function getExportFilename(setName: string, format: ExportFormat): string {
  const safeName = setName
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase()

  const date = new Date().toISOString().split('T')[0]

  switch (format) {
    case 'rekordbox':
      return `${safeName}_rekordbox_${date}.csv`
    case 'serato':
      return `${safeName}_serato_${date}.csv`
    case 'generic':
      return `${safeName}_${date}.csv`
    case 'm3u':
      return `${safeName}_${date}.m3u`
    default:
      return `${safeName}_${date}.txt`
  }
}

/**
 * Main export function - generates and downloads the file
 */
export function exportSet(
  set: Set,
  format: ExportFormat
): void {
  const tracks = transformToExportTracks(set.playlist)
  const setName = set.name || 'YTDJ_Set'

  let content: string
  let mimeType: string

  switch (format) {
    case 'rekordbox':
      content = generateRekordboxCSV(tracks, setName)
      mimeType = 'text/csv'
      break
    case 'serato':
      content = generateSeratoCSV(tracks, setName)
      mimeType = 'text/csv'
      break
    case 'generic':
      content = generateGenericCSV(tracks, setName)
      mimeType = 'text/csv'
      break
    case 'm3u':
      content = generateM3U(tracks, setName)
      mimeType = 'audio/x-mpegurl'
      break
    default:
      content = generateTextExport(tracks, setName)
      mimeType = 'text/plain'
  }

  const filename = getExportFilename(setName, format)
  downloadFile(content, filename, mimeType)
}


// === EXPORT METADATA FOR UI ===

export const EXPORT_FORMATS: {
  id: ExportFormat
  name: string
  description: string
  icon: string
  extension: string
}[] = [
  {
    id: 'rekordbox',
    name: 'Rekordbox',
    description: 'Pioneer DJ Rekordbox compatible CSV',
    icon: '🎛️',
    extension: '.csv',
  },
  {
    id: 'serato',
    name: 'Serato',
    description: 'Serato DJ compatible CSV',
    icon: '💿',
    extension: '.csv',
  },
  {
    id: 'generic',
    name: 'Full CSV',
    description: 'Complete metadata with all fields',
    icon: '📊',
    extension: '.csv',
  },
  {
    id: 'm3u',
    name: 'M3U Playlist',
    description: 'Standard playlist with YouTube links',
    icon: '📝',
    extension: '.m3u',
  },
]
