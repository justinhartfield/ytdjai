'use client'

import { motion } from 'framer-motion'
import { X, Lock, Unlock, Trash2, Sparkles, Music, Clock, Zap, Key } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { haptics } from '@/lib/haptics'
import type { PlaylistNode } from '@/types'

interface TrackInspectorProps {
  node: PlaylistNode
  index: number
  onClose: () => void
  onDelete: () => void
  onLockToggle: () => void
}

export function TrackInspector({
  node,
  index,
  onClose,
  onDelete,
  onLockToggle
}: TrackInspectorProps) {
  const { playTrack, player } = useYTDJStore()
  const isPlaying = player.playingNodeIndex === index && player.isPlaying

  const handlePlay = () => {
    haptics.medium()
    playTrack(index)
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Inspector Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-0 right-0 bottom-0 w-[320px] z-50 bg-[#0a0c1c]/95 backdrop-blur-xl border-l border-white/10 shadow-[-20px_0_60px_rgba(0,0,0,0.5)] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-xs font-bold">
              #{String(index + 1).padStart(2, '0')}
            </span>
            <h2 className="text-sm font-black uppercase tracking-tight text-white">
              Track Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Album Art */}
          <motion.div
            className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group"
            onClick={handlePlay}
            whileTap={{ scale: 0.98 }}
          >
            <img
              src={node.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=225&fit=crop'}
              alt={node.track.title}
              className="w-full h-full object-cover"
            />

            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center',
                isPlaying ? 'bg-green-500 text-black' : 'bg-white text-black'
              )}>
                <Music className="w-8 h-8" />
              </div>
            </div>

            {/* Lock badge */}
            {node.isLocked && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-cyan-500 text-black text-xs font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Locked
              </div>
            )}

            {/* Playing indicator */}
            {isPlaying && (
              <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-green-500 text-black text-xs font-bold flex items-center gap-1">
                <div className="flex gap-0.5">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-0.5 bg-black rounded-full"
                      animate={{ height: [4, 12, 4] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
                Playing
              </div>
            )}
          </motion.div>

          {/* Track Info */}
          <div>
            <h3 className="text-lg font-black text-white mb-1">{node.track.title}</h3>
            <p className="text-sm text-cyan-400 font-bold">{node.track.artist}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-bold text-white/50 uppercase">Energy</span>
              </div>
              <span className="text-2xl font-black text-cyan-400">{node.track.energy || '?'}</span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Key className="w-3 h-3 text-pink-400" />
                <span className="text-[10px] font-bold text-white/50 uppercase">Key</span>
              </div>
              <span className="text-xl font-black text-pink-400">{node.track.key || 'N/A'}</span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3 h-3 text-white/50" />
                <span className="text-[10px] font-bold text-white/50 uppercase">Duration</span>
              </div>
              <span className="text-lg font-bold text-white">{formatDuration(node.track.duration)}</span>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Music className="w-3 h-3 text-white/50" />
                <span className="text-[10px] font-bold text-white/50 uppercase">Genre</span>
              </div>
              <span className="text-sm font-bold text-white truncate">{node.track.genre || 'Unknown'}</span>
            </div>
          </div>

          {/* AI Reasoning */}
          {node.track.aiReasoning && (
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-cyan-400 mb-2">
                <Sparkles className="w-3 h-3" />
                Why AI Chose This
              </div>
              <p className="text-sm text-white/70 leading-relaxed italic">
                "{node.track.aiReasoning}"
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 p-4 border-t border-white/5 space-y-2">
          <div className="flex gap-2">
            <motion.button
              onClick={() => {
                haptics.medium()
                onLockToggle()
              }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all',
                node.isLocked
                  ? 'bg-cyan-500 text-black'
                  : 'bg-white/10 text-white border border-white/10 hover:bg-white/15'
              )}
            >
              {node.isLocked ? (
                <>
                  <Unlock className="w-4 h-4" />
                  Unlock
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Lock Track
                </>
              )}
            </motion.button>

            <motion.button
              onClick={() => {
                onDelete()
                onClose()
              }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-bold hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  )
}
