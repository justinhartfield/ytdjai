'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  ListMusic,
  Sparkles,
  RefreshCw,
  Download,
  Share2,
  MoreHorizontal,
  Music,
  Wand2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Badge, Tabs, TabList, Tab, TabPanel } from '@/components/ui'
import { TrackCard, AIPromptPanel, PlaylistTimeline } from '@/components/features'
import { useYTDJStore } from '@/store'
import { generatePlaylist, swapTrack } from '@/lib/ai-service'
import type { AIConstraints, PlaylistNode, Track } from '@/types'

export function WorkspacePanel() {
  const [activeTab, setActiveTab] = useState('playlist')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSwapping, setIsSwapping] = useState<string | null>(null)

  const {
    currentSet,
    aiProvider,
    setCurrentSet,
    updatePlaylist,
    setIsGenerating: setStoreGenerating
  } = useYTDJStore()

  const playlist = currentSet?.playlist || []
  const totalDuration = playlist.reduce((acc, node) => acc + node.track.duration, 0)

  const handleGenerate = useCallback(async (prompt: string, constraints: Partial<AIConstraints>) => {
    setIsGenerating(true)
    setStoreGenerating(true)

    try {
      const result = await generatePlaylist({
        prompt,
        constraints: constraints as AIConstraints,
        provider: aiProvider
      })

      if (result.success && result.playlist) {
        updatePlaylist(result.playlist)
      }
    } catch (error) {
      console.error('Failed to generate playlist:', error)
    } finally {
      setIsGenerating(false)
      setStoreGenerating(false)
    }
  }, [aiProvider, updatePlaylist, setStoreGenerating])

  const handleSwapTrack = useCallback(async (nodeId: string) => {
    const node = playlist.find(n => n.id === nodeId)
    if (!node) return

    const prevNode = playlist[playlist.findIndex(n => n.id === nodeId) - 1]
    const nextNode = playlist[playlist.findIndex(n => n.id === nodeId) + 1]

    setIsSwapping(nodeId)

    try {
      const result = await swapTrack({
        currentTrack: node.track,
        previousTrack: prevNode?.track,
        nextTrack: nextNode?.track,
        constraints: currentSet?.constraints,
        provider: aiProvider
      })

      if (result.success && result.newTrack) {
        const newPlaylist = playlist.map(n =>
          n.id === nodeId
            ? { ...n, track: result.newTrack! }
            : n
        )
        updatePlaylist(newPlaylist)
      }
    } catch (error) {
      console.error('Failed to swap track:', error)
    } finally {
      setIsSwapping(null)
    }
  }, [playlist, currentSet, aiProvider, updatePlaylist])

  const handleReorder = useCallback((newOrder: PlaylistNode[]) => {
    updatePlaylist(newOrder)
  }, [updatePlaylist])

  const handleRemoveTrack = useCallback((nodeId: string) => {
    const newPlaylist = playlist.filter(n => n.id !== nodeId)
    updatePlaylist(newPlaylist)
  }, [playlist, updatePlaylist])

  const handleMoveTrack = useCallback((nodeId: string, direction: 'up' | 'down') => {
    const index = playlist.findIndex(n => n.id === nodeId)
    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === playlist.length - 1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const newPlaylist = [...playlist]
    const [removed] = newPlaylist.splice(index, 1)
    newPlaylist.splice(newIndex, 0, removed)
    updatePlaylist(newPlaylist)
  }, [playlist, updatePlaylist])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Workspace Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white">
            {currentSet?.name || 'New Set'}
          </h2>
          <p className="text-sm text-white/50">
            {playlist.length} tracks · {Math.floor(totalDuration / 60)} min
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Regenerate
          </Button>
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button variant="ghost" size="sm">
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-3 border-b border-white/10">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <TabList>
            <Tab value="playlist" icon={<ListMusic className="w-4 h-4" />}>
              Playlist
            </Tab>
            <Tab value="generate" icon={<Sparkles className="w-4 h-4" />}>
              AI Generate
            </Tab>
          </TabList>
        </Tabs>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'playlist' && (
          <>
            {/* Playlist View */}
            <div className="flex-1 overflow-y-auto p-6">
              {playlist.length > 0 ? (
                <Reorder.Group
                  axis="y"
                  values={playlist}
                  onReorder={handleReorder}
                  className="space-y-2"
                >
                  <AnimatePresence>
                    {playlist.map((node, index) => (
                      <Reorder.Item
                        key={node.id}
                        value={node}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <TrackCard
                          track={node.track}
                          index={index}
                          isActive={false}
                          transitionQuality={node.transitionToNext?.quality}
                          onSwap={() => handleSwapTrack(node.id)}
                          onRemove={() => handleRemoveTrack(node.id)}
                          onMoveUp={() => handleMoveTrack(node.id, 'up')}
                          onMoveDown={() => handleMoveTrack(node.id, 'down')}
                          draggable={false}
                          className={cn(
                            isSwapping === node.id && 'opacity-50 animate-pulse'
                          )}
                        />
                      </Reorder.Item>
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              ) : (
                /* Empty State */
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-magenta-500/20 flex items-center justify-center mb-4">
                    <Music className="w-10 h-10 text-white/30" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No tracks yet</h3>
                  <p className="text-white/50 mb-6 max-w-sm">
                    Use the AI Generator to create your perfect DJ set based on your preferences
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setActiveTab('generate')}
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate with AI
                  </Button>
                </div>
              )}
            </div>

            {/* Timeline */}
            {playlist.length > 0 && (
              <PlaylistTimeline
                nodes={playlist}
                currentTime={currentTime}
                totalDuration={totalDuration}
                isPlaying={isPlaying}
                onSeek={setCurrentTime}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onSkipPrev={() => setCurrentTime(0)}
                onSkipNext={() => setCurrentTime(totalDuration)}
              />
            )}
          </>
        )}

        {activeTab === 'generate' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-magenta-500 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">AI Set Generator</h3>
                <p className="text-white/50">
                  Describe your perfect DJ set and let AI curate it for you
                </p>
              </div>

              <AIPromptPanel
                onGenerate={handleGenerate}
                isLoading={isGenerating}
              />

              {/* Tips */}
              <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 className="text-sm font-semibold text-white mb-3">Tips for better results</h4>
                <ul className="space-y-2 text-sm text-white/60">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    Be specific about the genre, mood, and energy level
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    Mention specific artists or tracks as reference points
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    Describe the journey: how should the set progress?
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    Use the advanced settings to fine-tune BPM and transitions
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
