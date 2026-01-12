import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { TransitionQuality, PlaylistNode } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function formatTotalDuration(nodes: PlaylistNode[]): string {
  const totalSeconds = nodes.reduce((acc, node) => acc + node.track.duration, 0)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes} min`
}

export function calculateTransitionQuality(
  fromNode: PlaylistNode,
  toNode: PlaylistNode
): TransitionQuality {
  const bpmDelta = Math.abs(fromNode.track.bpm - toNode.track.bpm)
  const energyDelta = Math.abs(fromNode.track.energy - toNode.track.energy)

  let score: 'smooth' | 'ok' | 'jarring'
  if (bpmDelta <= 5 && energyDelta <= 20) {
    score = 'smooth'
  } else if (bpmDelta <= 15 || energyDelta <= 40) {
    score = 'ok'
  } else {
    score = 'jarring'
  }

  return {
    from: fromNode.id,
    to: toNode.id,
    score,
    bpmDelta,
    energyDelta,
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function interpolateCurve(
  points: { x: number; y: number }[],
  numPoints: number = 100
): { x: number; y: number }[] {
  if (points.length < 2) return points

  const result: { x: number; y: number }[] = []
  const step = (points.length - 1) / (numPoints - 1)

  for (let i = 0; i < numPoints; i++) {
    const index = i * step
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const fraction = index - lower

    if (upper >= points.length) {
      result.push(points[points.length - 1])
    } else {
      result.push({
        x: points[lower].x * (1 - fraction) + points[upper].x * fraction,
        y: points[lower].y * (1 - fraction) + points[upper].y * fraction,
      })
    }
  }

  return result
}

export function bpmToY(bpm: number, minBpm: number = 60, maxBpm: number = 180, height: number = 400): number {
  const normalized = (bpm - minBpm) / (maxBpm - minBpm)
  return height - normalized * height
}

export function yToBpm(y: number, minBpm: number = 60, maxBpm: number = 180, height: number = 400): number {
  const normalized = (height - y) / height
  return Math.round(minBpm + normalized * (maxBpm - minBpm))
}

export function getTransitionColor(quality: 'smooth' | 'ok' | 'jarring'): string {
  switch (quality) {
    case 'smooth':
      return '#22c55e' // green-500
    case 'ok':
      return '#eab308' // yellow-500
    case 'jarring':
      return '#ef4444' // red-500
    default:
      return '#6b7280' // gray-500
  }
}

export function getNodeStateStyles(state: string): {
  ring: string
  bg: string
  icon?: string
} {
  switch (state) {
    case 'user-locked':
      return { ring: 'ring-accent-cyan', bg: 'bg-accent-cyan/10', icon: 'lock' }
    case 'bpm-locked':
      return { ring: 'ring-accent-magenta', bg: 'bg-accent-magenta/10', icon: 'target' }
    case 'playing':
      return { ring: 'ring-accent-cyan animate-pulse-ring', bg: 'bg-accent-cyan/20' }
    case 'previewing':
      return { ring: 'ring-dashed ring-accent-cyan/50', bg: 'bg-accent-cyan/5' }
    case 'unresolved':
      return { ring: 'ring-yellow-500', bg: 'bg-yellow-500/10', icon: 'alert-triangle' }
    case 'unavailable':
      return { ring: 'ring-red-500', bg: 'bg-red-500/10', icon: 'x-circle' }
    case 'loading':
      return { ring: 'ring-gray-500', bg: 'bg-gray-500/10', icon: 'loader' }
    default:
      return { ring: 'ring-white/20', bg: 'bg-white/5' }
  }
}
