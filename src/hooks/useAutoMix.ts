'use client'

import { useMemo, useCallback } from 'react'
import { useYTDJStore } from '@/store'
import {
  getKeyCompatibility,
  calculateBpmMatchScore,
  calculateTransitionScore,
  recommendCrossfadeDuration,
} from '@/lib/camelot'
import type { KeyCompatibility, TransitionAnalysis } from '@/types'

/**
 * Custom hook for AutoMix functionality
 *
 * Provides:
 * - Transition analysis between tracks
 * - Mix point calculations
 * - Crossfade duration recommendations
 * - Transition quality summaries
 */
export function useAutoMix() {
  const { autoMix, currentSet, player } = useYTDJStore()

  const playlist = currentSet?.playlist || []

  /**
   * Analyze the transition between two adjacent tracks
   */
  const analyzeTransition = useCallback(
    (fromIndex: number, toIndex: number): TransitionAnalysis | null => {
      const fromNode = playlist[fromIndex]
      const toNode = playlist[toIndex]

      if (!fromNode || !toNode) return null

      const fromTrack = fromNode.track
      const toTrack = toNode.track

      const keyCompat = getKeyCompatibility(fromTrack.key, toTrack.key)
      const bpmDiff = Math.abs((fromTrack.bpm || 0) - (toTrack.bpm || 0))
      const overallScore = calculateTransitionScore(
        fromTrack.bpm,
        toTrack.bpm,
        fromTrack.key,
        toTrack.key,
        fromTrack.energy,
        toTrack.energy
      )
      const recommendedDuration = recommendCrossfadeDuration(
        fromTrack.bpm,
        toTrack.bpm,
        fromTrack.key,
        toTrack.key,
        autoMix.crossfadeDuration
      )

      return {
        fromTrack,
        toTrack,
        keyCompatibility: keyCompat,
        bpmDifference: bpmDiff,
        overallScore,
        recommendedCrossfadeDuration: recommendedDuration,
      }
    },
    [playlist, autoMix.crossfadeDuration]
  )

  /**
   * Get all transition analyses for the playlist
   */
  const transitionAnalyses = useMemo((): TransitionAnalysis[] => {
    if (playlist.length < 2) return []

    const analyses: TransitionAnalysis[] = []
    for (let i = 0; i < playlist.length - 1; i++) {
      const analysis = analyzeTransition(i, i + 1)
      if (analysis) {
        analyses.push(analysis)
      }
    }
    return analyses
  }, [playlist, analyzeTransition])

  /**
   * Summary of transition quality across the set
   */
  const transitionSummary = useMemo(() => {
    const total = transitionAnalyses.length
    if (total === 0) {
      return {
        total: 0,
        perfect: 0,
        compatible: 0,
        warning: 0,
        clash: 0,
        averageScore: 0,
        hasIssues: false,
      }
    }

    const counts: Record<KeyCompatibility, number> = {
      perfect: 0,
      compatible: 0,
      warning: 0,
      clash: 0,
    }

    let totalScore = 0

    for (const analysis of transitionAnalyses) {
      counts[analysis.keyCompatibility]++
      totalScore += analysis.overallScore
    }

    return {
      total,
      ...counts,
      averageScore: Math.round(totalScore / total),
      hasIssues: counts.warning > 0 || counts.clash > 0,
    }
  }, [transitionAnalyses])

  /**
   * Get transitions that have compatibility issues
   */
  const problemTransitions = useMemo(() => {
    return transitionAnalyses
      .map((analysis, index) => ({ ...analysis, index }))
      .filter(
        (analysis) =>
          analysis.keyCompatibility === 'warning' || analysis.keyCompatibility === 'clash'
      )
  }, [transitionAnalyses])

  /**
   * Calculate optimal mix out point for a track
   * Considers BPM match quality with next track
   */
  const calculateMixOutPoint = useCallback(
    (trackIndex: number): number => {
      const node = playlist[trackIndex]
      if (!node) return 30

      const track = node.track
      const duration = track.duration

      // If there's a preset mix out point, use it
      if (node.transitionToNext?.mixOutPoint) {
        return node.transitionToNext.mixOutPoint
      }

      // Base mix out point (percentage of track)
      let mixOutPoint = Math.min(30, duration * 0.15)

      // Get next track for compatibility analysis
      const nextNode = playlist[trackIndex + 1]
      if (!nextNode) return mixOutPoint

      const nextTrack = nextNode.track

      // Adjust based on BPM match quality
      if (track.bpm && nextTrack.bpm) {
        const bpmScore = calculateBpmMatchScore(track.bpm, nextTrack.bpm)

        if (bpmScore >= 85) {
          // Great BPM match - can have longer crossfade
          mixOutPoint = Math.min(45, duration * 0.2)
        } else if (bpmScore <= 30) {
          // Poor BPM match - shorter crossfade
          mixOutPoint = Math.min(15, duration * 0.08)
        }
      }

      // Adjust based on key compatibility
      const keyCompat = getKeyCompatibility(track.key, nextTrack.key)
      if (keyCompat === 'clash') {
        mixOutPoint = Math.min(mixOutPoint, 15)
      }

      // Ensure we don't exceed a reasonable portion of the track
      return Math.min(mixOutPoint, duration * 0.25)
    },
    [playlist]
  )

  /**
   * Calculate mix in point for incoming track
   */
  const calculateMixInPoint = useCallback(
    (trackIndex: number): number => {
      const node = playlist[trackIndex]
      if (!node) return 0

      // If there's a preset start time (skip intro), use it
      if (node.startTime) {
        return node.startTime
      }

      // If there's a preset mix in point, use it
      if (trackIndex > 0) {
        const prevNode = playlist[trackIndex - 1]
        if (prevNode?.transitionToNext?.mixInPoint) {
          return prevNode.transitionToNext.mixInPoint
        }
      }

      // Default: start from beginning
      return 0
    },
    [playlist]
  )

  /**
   * Calculate recommended crossfade duration for a transition
   */
  const calculateCrossfadeDuration = useCallback(
    (fromIndex: number, toIndex: number): number => {
      const analysis = analyzeTransition(fromIndex, toIndex)
      if (!analysis) return autoMix.crossfadeDuration

      return analysis.recommendedCrossfadeDuration
    },
    [analyzeTransition, autoMix.crossfadeDuration]
  )

  /**
   * Get the current transition analysis (from currently playing to next)
   */
  const currentTransition = useMemo(() => {
    if (player.playingNodeIndex === null) return null
    if (player.playingNodeIndex >= playlist.length - 1) return null

    return analyzeTransition(player.playingNodeIndex, player.playingNodeIndex + 1)
  }, [player.playingNodeIndex, playlist.length, analyzeTransition])

  /**
   * Time until next transition starts (in seconds)
   */
  const timeUntilTransition = useMemo(() => {
    if (!autoMix.enabled) return null
    if (player.playingNodeIndex === null) return null
    if (player.playingNodeIndex >= playlist.length - 1) return null

    const mixOutPoint = calculateMixOutPoint(player.playingNodeIndex)
    const transitionTime = player.duration - mixOutPoint
    const remaining = transitionTime - player.currentTime

    return Math.max(0, remaining)
  }, [
    autoMix.enabled,
    player.playingNodeIndex,
    player.duration,
    player.currentTime,
    playlist.length,
    calculateMixOutPoint,
  ])

  /**
   * Check if tracks need BPM/key estimation
   */
  const tracksNeedingEstimation = useMemo(() => {
    return playlist
      .map((node, index) => ({ node, index }))
      .filter(({ node }) => !node.track.bpm || !node.track.key)
      .map(({ node, index }) => ({
        index,
        title: node.track.title,
        artist: node.track.artist,
        genre: node.track.genre || node.track.genres?.[0],
      }))
  }, [playlist])

  return {
    // State
    isEnabled: autoMix.enabled,
    mode: autoMix.mode,
    crossfadeDuration: autoMix.crossfadeDuration,

    // Analyses
    transitionAnalyses,
    transitionSummary,
    problemTransitions,
    currentTransition,

    // Calculations
    analyzeTransition,
    calculateMixOutPoint,
    calculateMixInPoint,
    calculateCrossfadeDuration,

    // Timing
    timeUntilTransition,

    // Enrichment
    tracksNeedingEstimation,
  }
}
