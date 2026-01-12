'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Star, Clock, Archive, Layout, X, Trash2, Play } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import type { Set, PlaylistNode } from '@/types'

interface SetsDashboardProps {
  isOpen: boolean
  onClose: () => void
  onSelectSet: (set: Set) => void
}

type FilterType = 'recent' | 'favorites' | 'templates' | 'archived'

// Generate SVG curve from playlist nodes
function generateCurvePath(playlist: PlaylistNode[]): string {
  if (playlist.length < 2) return 'M0,15 L100,15'

  const points = playlist.map((node, index) => {
    const x = ((index + 1) / (playlist.length + 1)) * 100
    const bpm = node.targetBpm || node.track?.bpm || 120
    const y = 30 - ((bpm - 60) / 140) * 30
    return { x, y: Math.max(5, Math.min(25, y)) }
  })

  let d = `M ${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i]
    const next = points[i + 1]
    const cpX = (curr.x + next.x) / 2
    d += ` C ${cpX},${curr.y} ${cpX},${next.y} ${next.x},${next.y}`
  }
  return d
}

export function SetsDashboard({ isOpen, onClose, onSelectSet }: SetsDashboardProps) {
  const { sets, addSet, deleteSet, setCurrentSet } = useYTDJStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('recent')
  const [showNewSetModal, setShowNewSetModal] = useState(false)
  const [newSetName, setNewSetName] = useState('')

  const filters = [
    { id: 'recent' as FilterType, label: 'Recent', icon: Clock },
    { id: 'favorites' as FilterType, label: 'Favorites', icon: Star },
    { id: 'templates' as FilterType, label: 'Templates', icon: Layout },
    { id: 'archived' as FilterType, label: 'Archived', icon: Archive }
  ]

  const filteredSets = useMemo(() => {
    let result = [...sets]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(set =>
        set.name.toLowerCase().includes(query) ||
        set.prompt?.toLowerCase().includes(query)
      )
    }

    // Apply type filter
    switch (activeFilter) {
      case 'recent':
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        break
      case 'favorites':
        // For now, no favorites flag - could add later
        break
      case 'templates':
        result = result.filter(set => set.arcTemplate)
        break
      case 'archived':
        // For now, no archived flag - could add later
        result = []
        break
    }

    return result
  }, [sets, searchQuery, activeFilter])

  const handleCreateSet = () => {
    if (!newSetName.trim()) return

    const newSet: Set = {
      id: `set-${Date.now()}`,
      name: newSetName.trim(),
      playlist: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    addSet(newSet)
    setCurrentSet(newSet)
    setNewSetName('')
    setShowNewSetModal(false)
    onSelectSet(newSet)
  }

  const handleSelectSet = (set: Set) => {
    setCurrentSet(set)
    onSelectSet(set)
  }

  const handleDeleteSet = (e: React.MouseEvent, setId: string) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this set?')) {
      deleteSet(setId)
    }
  }

  const getTotalDuration = (playlist: PlaylistNode[]) => {
    return playlist.reduce((acc, node) => acc + (node.track?.duration || 0), 0)
  }

  const getBpmRange = (playlist: PlaylistNode[]) => {
    if (playlist.length === 0) return { min: 0, max: 0 }
    const bpms = playlist.map(n => n.targetBpm || n.track?.bpm || 120)
    return { min: Math.min(...bpms), max: Math.max(...bpms) }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-96 bg-[#0a0c1c]/95 backdrop-blur-xl border-r border-white/5 flex flex-col overflow-hidden z-30"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black uppercase tracking-wider">My Sets</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sets..."
                className="w-full pl-10 pr-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
              {filters.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveFilter(id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                    activeFilter === id
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "bg-white/5 text-gray-500 hover:text-white border border-transparent"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sets Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {/* Create New Set Card */}
            <button
              onClick={() => setShowNewSetModal(true)}
              className="w-full p-4 border-2 border-dashed border-white/10 rounded-2xl hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group"
            >
              <div className="flex items-center justify-center gap-3 py-4">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                  <Plus className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-sm font-bold text-gray-400 group-hover:text-cyan-400 transition-colors">
                  Create New Set
                </span>
              </div>
            </button>

            {/* Set Cards */}
            {filteredSets.map((set) => {
              const bpmRange = getBpmRange(set.playlist)
              const duration = getTotalDuration(set.playlist)

              return (
                <motion.div
                  key={set.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-cyan-500/30 hover:bg-white/[0.07] transition-all cursor-pointer"
                  onClick={() => handleSelectSet(set)}
                >
                  {/* Curve Preview */}
                  <div className="mb-3 p-2 bg-black/30 rounded-xl">
                    <svg className="w-full h-8" viewBox="0 0 100 30" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id={`grad-${set.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#00f2ff" />
                          <stop offset="100%" stopColor="#ff00e5" />
                        </linearGradient>
                      </defs>
                      <path
                        d={generateCurvePath(set.playlist)}
                        fill="none"
                        stroke={`url(#grad-${set.id})`}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Set Info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-white truncate pr-2">{set.name}</h3>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDeleteSet(e, set.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {set.prompt && (
                      <p className="text-[11px] text-gray-500 line-clamp-2">{set.prompt}</p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-[10px] font-bold text-gray-600">
                        {set.playlist.length} tracks
                      </span>
                      {duration > 0 && (
                        <>
                          <span className="text-gray-700">•</span>
                          <span className="text-[10px] font-bold text-gray-600">
                            {formatDuration(duration)}
                          </span>
                        </>
                      )}
                      {bpmRange.min > 0 && (
                        <>
                          <span className="text-gray-700">•</span>
                          <span className="text-[10px] font-bold text-cyan-500">
                            {bpmRange.min}-{bpmRange.max} BPM
                          </span>
                        </>
                      )}
                    </div>

                    {/* Last Edited */}
                    <div className="text-[9px] text-gray-600 uppercase tracking-wider">
                      Edited {new Date(set.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                      <Play className="w-5 h-5 text-black ml-0.5" />
                    </div>
                  </div>
                </motion.div>
              )
            })}

            {filteredSets.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 text-sm">No sets found</p>
                <p className="text-gray-700 text-xs mt-1">
                  {searchQuery ? 'Try a different search term' : 'Create your first set to get started'}
                </p>
              </div>
            )}
          </div>

          {/* New Set Modal */}
          <AnimatePresence>
            {showNewSetModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="w-full max-w-sm bg-[#0a0c1c] border border-white/10 rounded-2xl p-6 space-y-6"
                >
                  <h3 className="text-xl font-black uppercase tracking-tighter">New Set</h3>

                  <input
                    type="text"
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSet()}
                    placeholder="Set name..."
                    autoFocus
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowNewSetModal(false)
                        setNewSetName('')
                      }}
                      className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-400 bg-white/5 hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateSet}
                      disabled={!newSetName.trim()}
                      className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-black bg-cyan-500 hover:bg-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
