'use client'

import { useState, useEffect } from 'react'
import {
  FolderOpen,
  Music2,
  Calendar,
  Trash2,
  Loader2,
  Download,
  AlertCircle,
  Youtube,
  TrendingUp
} from 'lucide-react'
import { Modal, Button, Badge } from '@/components/ui'
import { useYTDJStore } from '@/store'
import { cn } from '@/lib/utils'

interface SavedSet {
  id: string
  dbId: string
  name: string
  trackCount: number
  arcTemplate?: string
  createdAt: string
  updatedAt: string
  isExported: boolean
  youtubePlaylistId?: string
}

interface BrowseSetsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BrowseSetsModal({ isOpen, onClose }: BrowseSetsModalProps) {
  const { listCloudSets, loadSetFromCloud, deleteSetFromCloud, isSyncing } = useYTDJStore()
  const [savedSets, setSavedSets] = useState<SavedSet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingSetId, setLoadingSetId] = useState<string | null>(null)
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadSavedSets()
    }
  }, [isOpen])

  const loadSavedSets = async () => {
    setLoading(true)
    setError('')

    const result = await listCloudSets()

    if (result.success && result.sets) {
      setSavedSets(result.sets)
    } else {
      setError(result.error || 'Failed to load saved sets')
    }

    setLoading(false)
  }

  const handleLoadSet = async (setId: string) => {
    setLoadingSetId(setId)
    const result = await loadSetFromCloud(setId)

    if (result.success) {
      onClose()
    } else {
      setError(result.error || 'Failed to load set')
    }

    setLoadingSetId(null)
  }

  const handleDeleteSet = async (setId: string, setName: string) => {
    if (!confirm(`Are you sure you want to delete "${setName}"? This cannot be undone.`)) {
      return
    }

    setDeletingSetId(setId)
    const result = await deleteSetFromCloud(setId)

    if (result.success) {
      setSavedSets(savedSets.filter(s => s.id !== setId))
    } else {
      setError(result.error || 'Failed to delete set')
    }

    setDeletingSetId(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Browse Saved Sets"
      size="lg"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/60">
            {savedSets.length} saved {savedSets.length === 1 ? 'set' : 'sets'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSavedSets}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Refresh'
            )}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Error</p>
              <p className="text-xs text-red-400/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && savedSets.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && savedSets.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-white/30" />
            </div>
            <p className="text-white/60 mb-2">No saved sets yet</p>
            <p className="text-sm text-white/40">
              Save your first set using the Save button
            </p>
          </div>
        )}

        {/* Sets List */}
        {!loading && savedSets.length > 0 && (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {savedSets.map((set) => (
              <div
                key={set.id}
                className={cn(
                  'group relative p-4 rounded-lg border transition-all',
                  'bg-white/5 border-white/10 hover:border-cyan-500/50',
                  loadingSetId === set.id && 'border-cyan-500 bg-cyan-500/10'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Set Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-semibold text-white truncate">
                        {set.name}
                      </h3>
                      {set.isExported && (
                        <Badge variant="cyan" className="text-xs flex items-center gap-1">
                          <Youtube className="w-3 h-3" />
                          Exported
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-white/50">
                      <span className="flex items-center gap-1">
                        <Music2 className="w-3 h-3" />
                        {set.trackCount} tracks
                      </span>
                      {set.arcTemplate && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {set.arcTemplate}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(set.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleLoadSet(set.id)}
                      disabled={loadingSetId === set.id || deletingSetId === set.id}
                      className="min-w-[80px]"
                    >
                      {loadingSetId === set.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-1" />
                          Load
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSet(set.id, set.name)}
                      disabled={loadingSetId === set.id || deletingSetId === set.id}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      {deletingSetId === set.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-white/10">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
