'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Menu, Sparkles, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { haptics } from '@/lib/haptics'
import { EnergyTimeline } from './player/EnergyTimeline'
import { HorizontalTrackList } from './tracklist/HorizontalTrackList'
import { NowPlayingDeck } from './player/NowPlayingDeck'
import { TransportBar } from './player/TransportBar'
import { MenuDrawer } from './overlays/MenuDrawer'
import { TrackInspector } from './overlays/TrackInspector'
import { SideSheet } from './overlays/SideSheet'
import { generatePlaylist } from '@/lib/ai-service'
import type { AIConstraints } from '@/types'

interface LandscapeLayoutProps {
  onNewSet: () => void
}

export function LandscapeLayout({ onNewSet }: LandscapeLayoutProps) {
  const {
    currentSet,
    updatePlaylist,
    updateSetWithPrompt,
    aiProvider,
    isGenerating,
    setIsGenerating,
    player,
    playTrack,
    constraints,
    setShowExportModal
  } = useYTDJStore()

  const playlist = currentSet?.playlist || []
  const { playingNodeIndex } = player

  const [showMenu, setShowMenu] = useState(false)
  const [showGenerateSheet, setShowGenerateSheet] = useState(false)
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(null)
  const [showInspector, setShowInspector] = useState(false)
  const [targetTrackCount, setTargetTrackCount] = useState(8)

  const handleSelectTrack = useCallback((index: number) => {
    haptics.light()
    setSelectedNodeIndex(index)
    setShowInspector(true)
  }, [])

  const handleCloseInspector = useCallback(() => {
    setShowInspector(false)
    setSelectedNodeIndex(null)
  }, [])

  const handleDeleteTrack = useCallback((index: number) => {
    haptics.error()
    const newPlaylist = playlist.filter((_, i) => i !== index)
    updatePlaylist(newPlaylist)
    if (selectedNodeIndex === index) {
      handleCloseInspector()
    }
  }, [playlist, updatePlaylist, selectedNodeIndex, handleCloseInspector])

  const handleLockToggle = useCallback((index: number) => {
    haptics.medium()
    const newPlaylist = [...playlist]
    newPlaylist[index] = {
      ...newPlaylist[index],
      isLocked: !newPlaylist[index].isLocked
    }
    updatePlaylist(newPlaylist)
  }, [playlist, updatePlaylist])

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    haptics.medium()
    const newPlaylist = [...playlist]
    const [removed] = newPlaylist.splice(fromIndex, 1)
    newPlaylist.splice(toIndex, 0, removed)
    updatePlaylist(newPlaylist)
  }, [playlist, updatePlaylist])

  const handleRegenerate = useCallback(async (mode: 'replace' | 'append') => {
    const prompt = currentSet?.prompt || 'Create an amazing DJ set'
    setIsGenerating(true)
    haptics.medium()

    try {
      const countToGenerate = mode === 'append'
        ? Math.min(targetTrackCount, 20 - playlist.length)
        : targetTrackCount

      const result = await generatePlaylist({
        prompt,
        constraints: {
          trackCount: countToGenerate,
          energyRange: { min: 20, max: 80 },
          energyTolerance: constraints.energyTolerance,
          syncopation: constraints.syncopation,
          keyMatch: constraints.keyMatch,
          artistDiversity: constraints.diversity,
          discovery: constraints.discovery,
          activeDecades: constraints.activeDecades,
          blacklist: constraints.blacklist
        } as AIConstraints,
        provider: aiProvider
      })

      if (result.success && result.playlist) {
        haptics.success()
        if (mode === 'append') {
          const newPlaylist = [...playlist, ...result.playlist]
          updateSetWithPrompt(newPlaylist, prompt)
        } else {
          updateSetWithPrompt(result.playlist, prompt)
        }
      } else {
        haptics.error()
      }
    } catch (error) {
      console.error('Failed to regenerate playlist:', error)
      haptics.error()
    } finally {
      setIsGenerating(false)
      setShowGenerateSheet(false)
    }
  }, [currentSet, playlist, targetTrackCount, constraints, aiProvider, updateSetWithPrompt, setIsGenerating])

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 h-12 flex items-center justify-between px-4 border-b border-white/5 bg-[#0a0c1c]/60 backdrop-blur-xl">
        <button
          onClick={() => {
            haptics.light()
            setShowMenu(true)
          }}
          className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <Menu className="w-5 h-5 text-white/80" />
        </button>

        <div className="flex items-center gap-3">
          <h1 className="text-lg font-black tracking-tight">
            YTDJ<span className="text-cyan-400">.AI</span>
          </h1>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
            {playlist.length} Tracks
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              haptics.light()
              setShowGenerateSheet(true)
            }}
            className="w-9 h-9 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-colors"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </button>
          <button
            onClick={() => {
              haptics.light()
              setShowGenerateSheet(true)
            }}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5 text-white/80" />
          </button>
        </div>
      </header>

      {/* Main Content - Grid Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - Energy Timeline */}
        <div className="w-[100px] flex-shrink-0 border-r border-white/5 bg-[#0a0c1c]/40">
          <EnergyTimeline
            playlist={playlist}
            playingIndex={playingNodeIndex}
            onSeekToTrack={(index) => {
              haptics.medium()
              playTrack(index)
            }}
          />
        </div>

        {/* Center - Track List */}
        <div className="flex-1 min-w-0">
          <HorizontalTrackList
            playlist={playlist}
            playingIndex={playingNodeIndex}
            selectedIndex={selectedNodeIndex}
            onSelect={handleSelectTrack}
            onDelete={handleDeleteTrack}
            onLockToggle={handleLockToggle}
            onReorder={handleReorder}
            onNewSet={onNewSet}
          />
        </div>

        {/* Right Sidebar - Now Playing */}
        <div className="w-[140px] flex-shrink-0 border-l border-white/5 bg-[#0a0c1c]/40">
          <NowPlayingDeck />
        </div>
      </div>

      {/* Bottom - Transport Bar */}
      <TransportBar />

      {/* Overlays */}
      <AnimatePresence>
        {showMenu && (
          <MenuDrawer
            onClose={() => setShowMenu(false)}
            onNewSet={() => {
              setShowMenu(false)
              onNewSet()
            }}
            onExport={() => {
              setShowMenu(false)
              setShowExportModal(true)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInspector && selectedNodeIndex !== null && playlist[selectedNodeIndex] && (
          <TrackInspector
            node={playlist[selectedNodeIndex]}
            index={selectedNodeIndex}
            onClose={handleCloseInspector}
            onDelete={() => handleDeleteTrack(selectedNodeIndex)}
            onLockToggle={() => handleLockToggle(selectedNodeIndex)}
          />
        )}
      </AnimatePresence>

      {/* Generate Sheet */}
      <SideSheet
        isOpen={showGenerateSheet}
        onClose={() => setShowGenerateSheet(false)}
        title="Generate Tracks"
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
              Number of Tracks
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="4"
                max="20"
                value={targetTrackCount}
                onChange={(e) => setTargetTrackCount(parseInt(e.target.value))}
                className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-500"
              />
              <span className="w-8 text-center text-lg font-bold text-white">{targetTrackCount}</span>
            </div>
          </div>

          <button
            onClick={() => handleRegenerate('replace')}
            disabled={isGenerating}
            className={cn(
              'w-full py-3 rounded-xl font-bold text-white bg-cyan-500 hover:bg-cyan-400 transition-all',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isGenerating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </div>
            ) : (
              'Replace All'
            )}
          </button>

          <button
            onClick={() => handleRegenerate('append')}
            disabled={isGenerating || playlist.length >= 20}
            className={cn(
              'w-full py-3 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 transition-all border border-white/10',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Add More
          </button>
        </div>
      </SideSheet>
    </div>
  )
}
