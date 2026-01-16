'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Download, Check, FileSpreadsheet, Music, FileText,
  Disc3, ChevronRight, Sparkles
} from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import {
  exportSet,
  transformToExportTracks,
  EXPORT_FORMATS,
  type ExportFormat,
  type DJExportTrack,
} from '@/lib/dj-export'

interface DJExportModalProps {
  isOpen: boolean
  onClose: () => void
}

// Icon mapping for formats
const FORMAT_ICONS: Record<ExportFormat, React.ElementType> = {
  rekordbox: Disc3,
  serato: Disc3,
  generic: FileSpreadsheet,
  m3u: Music,
}

export function DJExportModal({ isOpen, onClose }: DJExportModalProps) {
  const { currentSet } = useYTDJStore()
  const playlist = currentSet?.playlist || []

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null)
  const [exported, setExported] = useState(false)
  const [previewTracks, setPreviewTracks] = useState<DJExportTrack[] | null>(null)

  // Calculate stats
  const totalDuration = playlist.reduce((acc, n) => acc + (n.track?.duration || 0), 0)
  const energies = playlist.map(n => n.targetEnergy || n.track?.energy || 50)
  const avgEnergy = Math.round(energies.reduce((a, b) => a + b, 0) / energies.length)
  const trackCount = playlist.length

  const handleFormatSelect = (format: ExportFormat) => {
    setSelectedFormat(format)
    setExported(false)
    // Generate preview data
    const tracks = transformToExportTracks(playlist)
    setPreviewTracks(tracks)
  }

  const handleExport = () => {
    if (!currentSet || !selectedFormat) return

    exportSet(currentSet, selectedFormat)
    setExported(true)

    // Reset after a delay
    setTimeout(() => {
      setExported(false)
    }, 3000)
  }

  const handleClose = () => {
    setSelectedFormat(null)
    setPreviewTracks(null)
    setExported(false)
    onClose()
  }

  // Get segment distribution for preview
  const getSegmentDistribution = () => {
    if (!previewTracks) return {}
    const distribution: Record<string, number> = {}
    previewTracks.forEach(t => {
      distribution[t.segment] = (distribution[t.segment] || 0) + 1
    })
    return distribution
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
        >
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={handleClose} />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-[#0a0c1c] border border-white/10 max-w-2xl w-full rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Decorative glow */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-orange-500/10 blur-[100px]" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-cyan-500/10 blur-[100px]" />

            {/* Header */}
            <div className="relative p-6 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">
                    Export to DJ Tools
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {trackCount} tracks • {formatDuration(totalDuration)} • Avg energy: {avgEnergy}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="relative p-6 overflow-y-auto flex-1">
              {/* Format Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Select Export Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {EXPORT_FORMATS.map((format) => {
                    const Icon = FORMAT_ICONS[format.id]
                    const isSelected = selectedFormat === format.id

                    return (
                      <button
                        key={format.id}
                        onClick={() => handleFormatSelect(format.id)}
                        className={cn(
                          "p-4 rounded-xl border transition-all text-left group",
                          isSelected
                            ? "bg-orange-500/10 border-orange-500/50"
                            : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                            isSelected ? "bg-orange-500/20" : "bg-white/5 group-hover:bg-white/10"
                          )}>
                            <Icon className={cn(
                              "w-5 h-5",
                              isSelected ? "text-orange-400" : "text-gray-500 group-hover:text-gray-400"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{format.name}</span>
                              <span className="text-[10px] text-gray-600 font-mono">{format.extension}</span>
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5">{format.description}</div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-orange-400 shrink-0" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Preview Section */}
              {selectedFormat && previewTracks && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 space-y-4"
                >
                  {/* What's Included */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">What&apos;s Included</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Check className="w-3 h-3 text-green-400" />
                          <span>Track title & artist</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Check className="w-3 h-3 text-green-400" />
                          <span>Duration & YouTube URL</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Check className="w-3 h-3 text-green-400" />
                          <span>Key (Camelot notation)</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Check className="w-3 h-3 text-green-400" />
                          <span>Energy score (1-100)</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Check className="w-3 h-3 text-green-400" />
                          <span>Set segment labels</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Check className="w-3 h-3 text-green-400" />
                          <span>AI curation notes</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Segment Distribution */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                      Set Structure Preview
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(getSegmentDistribution()).map(([segment, count]) => (
                        <div
                          key={segment}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2",
                            segment === 'Peak' ? "bg-red-500/20 text-red-400" :
                            segment === 'Build' ? "bg-orange-500/20 text-orange-400" :
                            segment === 'Warmup' ? "bg-yellow-500/20 text-yellow-400" :
                            segment === 'Cooldown' ? "bg-blue-500/20 text-blue-400" :
                            segment === 'Intro' ? "bg-green-500/20 text-green-400" :
                            segment === 'Outro' ? "bg-purple-500/20 text-purple-400" :
                            "bg-white/10 text-gray-400"
                          )}
                        >
                          <span>{segment}</span>
                          <span className="opacity-60">×{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Track Preview */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                      First 5 Tracks Preview
                    </div>
                    <div className="space-y-2">
                      {previewTracks.slice(0, 5).map((track) => (
                        <div
                          key={track.position}
                          className="flex items-center gap-3 text-xs"
                        >
                          <span className="w-5 text-gray-600 font-mono">{track.position}.</span>
                          <span className="text-gray-400 truncate flex-1">{track.artist} - {track.title}</span>
                          <span className="text-gray-600 font-mono">{track.camelotKey || '-'}</span>
                          <span className="text-gray-600">{track.energy}</span>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded",
                            track.segment === 'Peak' ? "bg-red-500/20 text-red-400" :
                            track.segment === 'Build' ? "bg-orange-500/20 text-orange-400" :
                            track.segment === 'Warmup' ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-white/10 text-gray-500"
                          )}>
                            {track.segment}
                          </span>
                        </div>
                      ))}
                      {previewTracks.length > 5 && (
                        <div className="text-xs text-gray-600 pt-2">
                          + {previewTracks.length - 5} more tracks...
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="relative p-6 border-t border-white/5 shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-4 bg-white/5 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={!selectedFormat}
                  className={cn(
                    "flex-[2] py-4 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
                    selectedFormat
                      ? exported
                        ? "bg-green-500 text-black"
                        : "bg-gradient-to-r from-orange-500 to-pink-500 text-black hover:opacity-90"
                      : "bg-white/10 text-gray-600 cursor-not-allowed"
                  )}
                >
                  {exported ? (
                    <>
                      <Check className="w-4 h-4" />
                      Downloaded!
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download {selectedFormat ? EXPORT_FORMATS.find(f => f.id === selectedFormat)?.extension : ''}
                    </>
                  )}
                </button>
              </div>

              {/* Pro Tip */}
              <div className="mt-4 flex items-start gap-2 text-[10px] text-gray-600">
                <FileText className="w-3 h-3 shrink-0 mt-0.5" />
                <span>
                  Import the CSV into Rekordbox/Serato as a reference. YouTube URLs can be used
                  with tools like youtube-dl to download tracks for your library.
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
