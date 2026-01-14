'use client'

import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Plus, Sparkles, Settings, RefreshCw, Download, Cloud, Menu, X, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { generatePlaylist } from '@/lib/ai-service'
import { haptics } from '@/lib/haptics'
import { share } from '@/lib/share'
import { MobileTrackCard } from './MobileTrackCard'
import { MobileBottomSheet } from './MobileBottomSheet'
import { MobilePlayer } from './MobilePlayer'
import type { PlaylistNode, AIConstraints } from '@/types'

interface MobileArrangementProps {
  onShowLaunchPad: () => void
}

export function MobileArrangement({ onShowLaunchPad }: MobileArrangementProps) {
  const {
    currentSet,
    updatePlaylist,
    updateSetWithPrompt,
    aiProvider,
    isGenerating,
    setIsGenerating,
    player,
    playTrack,
    pauseTrack,
    constraints,
    setShowExportModal
  } = useYTDJStore()

  const playlist = currentSet?.playlist || []
  const { isPlaying, playingNodeIndex } = player

  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(null)
  const [showInspector, setShowInspector] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showGenerateOptions, setShowGenerateOptions] = useState(false)
  const [targetTrackCount, setTargetTrackCount] = useState(8)

  // Drag and drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const dragStartY = useRef<number>(0)

  const handlePlay = useCallback((index: number) => {
    if (isPlaying && playingNodeIndex === index) {
      pauseTrack()
    } else {
      playTrack(index)
    }
  }, [isPlaying, playingNodeIndex, playTrack, pauseTrack])

  const handleSelect = useCallback((index: number) => {
    setSelectedNodeIndex(index)
    setShowInspector(true)
  }, [])

  const handleDelete = useCallback((index: number) => {
    const newPlaylist = playlist.filter((_, i) => i !== index)
    updatePlaylist(newPlaylist)
    if (selectedNodeIndex === index) {
      setSelectedNodeIndex(null)
      setShowInspector(false)
    }
  }, [playlist, updatePlaylist, selectedNodeIndex])

  const handleLockToggle = useCallback((index: number) => {
    const newPlaylist = [...playlist]
    newPlaylist[index] = {
      ...newPlaylist[index],
      isLocked: !newPlaylist[index].isLocked
    }
    updatePlaylist(newPlaylist)
  }, [playlist, updatePlaylist])

  const handleDragStart = useCallback((e: React.TouchEvent, index: number) => {
    dragStartY.current = e.touches[0].clientY
    setDraggedIndex(index)
  }, [])

  const handleDragMove = useCallback((e: React.TouchEvent) => {
    if (draggedIndex === null) return

    const currentY = e.touches[0].clientY
    const deltaY = currentY - dragStartY.current

    // Calculate which position we're over
    const cardHeight = 100 // Approximate height of a track card
    const offset = Math.round(deltaY / cardHeight)
    const targetIndex = Math.max(0, Math.min(playlist.length - 1, draggedIndex + offset))

    if (targetIndex !== draggedIndex) {
      setDropTargetIndex(targetIndex)
    } else {
      setDropTargetIndex(null)
    }
  }, [draggedIndex, playlist.length])

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dropTargetIndex !== null && draggedIndex !== dropTargetIndex) {
      const newPlaylist = [...playlist]
      const [removed] = newPlaylist.splice(draggedIndex, 1)
      newPlaylist.splice(dropTargetIndex, 0, removed)
      updatePlaylist(newPlaylist)
    }
    setDraggedIndex(null)
    setDropTargetIndex(null)
  }, [draggedIndex, dropTargetIndex, playlist, updatePlaylist])

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
      setShowGenerateOptions(false)
    }
  }, [currentSet, playlist, targetTrackCount, constraints, aiProvider, updateSetWithPrompt, setIsGenerating])

  const handleShare = useCallback(async () => {
    haptics.light()
    const setName = currentSet?.name || 'Untitled Set'
    const success = await share.shareSet(setName, playlist.length)
    if (success) {
      haptics.success()
    }
  }, [currentSet, playlist.length])

  const selectedNode = selectedNodeIndex !== null ? playlist[selectedNodeIndex] : null

  return (
    <div className="h-screen bg-[#05060f] flex flex-col overflow-hidden">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 242, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 border-b border-white/5 bg-[#0a0c1c]/80 backdrop-blur-xl">
        <button
          onClick={() => setShowMenu(true)}
          className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black uppercase tracking-tight">
            YTDJ<span className="text-cyan-400">.AI</span>
          </h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">
            {playlist.length} Tracks
          </p>
        </div>
        <button
          onClick={() => setShowGenerateOptions(true)}
          className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center"
        >
          <Sparkles className="w-5 h-5 text-cyan-400" />
        </button>
      </header>

      {/* Track List */}
      <div
        className="relative flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 pb-32"
        onTouchMove={draggedIndex !== null ? handleDragMove : undefined}
        onTouchEnd={draggedIndex !== null ? handleDragEnd : undefined}
      >
        {playlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-white/30" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No tracks yet</h3>
            <p className="text-sm text-white/50 mb-6">Generate your first set to get started</p>
            <button
              onClick={onShowLaunchPad}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold"
            >
              Generate Set
            </button>
          </div>
        ) : (
          <>
            {playlist.map((node, index) => (
              <MobileTrackCard
                key={node.id}
                node={node}
                index={index}
                isPlaying={isPlaying && playingNodeIndex === index}
                isSelected={selectedNodeIndex === index}
                onPlay={() => handlePlay(index)}
                onSelect={() => handleSelect(index)}
                onDelete={() => handleDelete(index)}
                onLockToggle={() => handleLockToggle(index)}
                onDragStart={handleDragStart}
              />
            ))}
          </>
        )}
      </div>

      {/* Mobile Player */}
      <MobilePlayer />

      {/* Menu Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        title="Menu"
      >
        <div className="p-6 space-y-3">
          <button
            onClick={() => {
              haptics.light()
              setShowMenu(false)
              onShowLaunchPad()
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
          >
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-white">New Set</span>
          </button>
          <button
            onClick={() => {
              haptics.light()
              setShowMenu(false)
              handleShare()
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
          >
            <Share2 className="w-5 h-5 text-white" />
            <span className="font-bold text-white">Share Set</span>
          </button>
          <button
            onClick={() => {
              haptics.light()
              setShowMenu(false)
              // TODO: Open constraints
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
          >
            <Settings className="w-5 h-5 text-white" />
            <span className="font-bold text-white">AI Settings</span>
          </button>
          <button
            onClick={() => {
              haptics.light()
              setShowMenu(false)
              // TODO: Open cloud save
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
          >
            <Cloud className="w-5 h-5 text-white" />
            <span className="font-bold text-white">Cloud Save</span>
          </button>
          <button
            onClick={() => {
              haptics.light()
              setShowMenu(false)
              setShowExportModal(true)
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
          >
            <Download className="w-5 h-5 text-white" />
            <span className="font-bold text-white">Export Set</span>
          </button>
        </div>
      </MobileBottomSheet>

      {/* Generate Options Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showGenerateOptions}
        onClose={() => setShowGenerateOptions(false)}
        title="Generate Tracks"
      >
        <div className="p-6 space-y-6">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">
              Number of Tracks
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={targetTrackCount}
              onChange={(e) => setTargetTrackCount(parseInt(e.target.value) || 8)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-center"
            />
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleRegenerate('replace')}
              disabled={isGenerating}
              className={cn(
                'w-full py-4 rounded-xl font-bold text-white bg-cyan-500 hover:bg-cyan-400 transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </div>
              ) : (
                <>Replace All Tracks</>
              )}
            </button>

            <button
              onClick={() => handleRegenerate('append')}
              disabled={isGenerating || playlist.length >= 20}
              className={cn(
                'w-full py-4 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 transition-all border border-white/10',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Add More Tracks
            </button>
          </div>
        </div>
      </MobileBottomSheet>

      {/* Inspector Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showInspector && selectedNode !== null}
        onClose={() => {
          setShowInspector(false)
          setSelectedNodeIndex(null)
        }}
        title="Track Details"
      >
        {selectedNode && (
          <div className="p-6 space-y-6">
            {/* Track Cover */}
            <div className="relative">
              <img
                src={selectedNode.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop'}
                alt={selectedNode.track.title}
                className="w-full aspect-video rounded-2xl object-cover"
              />
            </div>

            {/* Track Info */}
            <div>
              <h3 className="text-xl font-black text-white mb-1">{selectedNode.track.title}</h3>
              <p className="text-base text-cyan-400 font-bold">{selectedNode.track.artist}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Energy</div>
                <div className="text-2xl font-black text-cyan-400">{selectedNode.track.energy || '?'}</div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Key</div>
                <div className="text-2xl font-black text-pink-400">{selectedNode.track.key || 'N/A'}</div>
              </div>
            </div>

            {/* AI Reasoning */}
            {selectedNode.track.aiReasoning && (
              <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-cyan-400 mb-2">
                  <Sparkles className="w-3 h-3" />
                  Why AI Chose This
                </div>
                <p className="text-xs text-gray-300 leading-relaxed italic">
                  {selectedNode.track.aiReasoning}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleLockToggle(selectedNodeIndex!)}
                className={cn(
                  'flex-1 py-3 rounded-xl font-bold transition-all',
                  selectedNode.isLocked
                    ? 'bg-cyan-500 text-black'
                    : 'bg-white/10 text-white border border-white/10'
                )}
              >
                {selectedNode.isLocked ? 'Unlock' : 'Lock Track'}
              </button>
              <button
                onClick={() => {
                  handleDelete(selectedNodeIndex!)
                  setShowInspector(false)
                }}
                className="px-6 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </MobileBottomSheet>
    </div>
  )
}
