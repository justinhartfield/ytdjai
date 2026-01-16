'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Check, Copy, Sparkles, Globe, Lock, Loader2, ExternalLink, Share2, Twitter, RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import type { CoverTemplateId, CoverColors, GeneratedMixtapeMeta } from '@/types'
import { getCoverTemplate } from '@/lib/cover-templates'
import { CoverGenerator } from './CoverGenerator'

interface PublishMixtapeModalProps {
  isOpen: boolean
  onClose: () => void
  youtubePlaylistId?: string
  spotifyPlaylistId?: string
  playlistUrl?: string
}

type PublishStep = 'metadata' | 'cover' | 'publishing' | 'success'

export function PublishMixtapeModal({
  isOpen,
  onClose,
  youtubePlaylistId,
  spotifyPlaylistId,
  playlistUrl,
}: PublishMixtapeModalProps) {
  const { data: session } = useSession()
  const { currentSet } = useYTDJStore()
  const playlist = currentSet?.playlist || []

  const [step, setStep] = useState<PublishStep>('metadata')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [copied, setCopied] = useState(false)

  // Form state
  const [title, setTitle] = useState(currentSet?.name || 'Untitled Mix')
  const [subtitle, setSubtitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [tags, setTags] = useState<string[]>([])
  const [coverTemplate, setCoverTemplate] = useState<CoverTemplateId>('neon-gradient')
  const [coverColors, setCoverColors] = useState<CoverColors>(
    getCoverTemplate('neon-gradient').defaultColors
  )

  // Published result
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  // Calculate stats
  const totalDuration = playlist.reduce((sum, node) => sum + (node.track?.duration || 0), 0)
  const trackCount = playlist.length

  // Generate AI metadata on open
  const generateMetadata = useCallback(async () => {
    if (!playlist.length) return

    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/mixtape-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentSet?.prompt || '',
          tracks: playlist.map(node => ({
            title: node.track?.title || '',
            artist: node.track?.artist || '',
            energy: node.track?.energy,
            genre: node.track?.genre,
          })),
          arcTemplate: currentSet?.arcTemplate,
          duration: totalDuration,
        }),
      })

      if (response.ok) {
        const data: GeneratedMixtapeMeta = await response.json()
        setTitle(data.title)
        setSubtitle(data.subtitle)
        setDescription(data.description)
        setTags(data.tags)
        setCoverTemplate(data.suggestedCoverTemplate)
        setCoverColors(getCoverTemplate(data.suggestedCoverTemplate).defaultColors)
      }
    } catch (error) {
      console.error('[PublishMixtape] Failed to generate metadata:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [playlist, currentSet, totalDuration])

  useEffect(() => {
    if (isOpen && playlist.length > 0) {
      generateMetadata()
      setStep('metadata')
      setShareUrl(null)
    }
  }, [isOpen, generateMetadata, playlist.length])

  const handlePublish = async () => {
    if (!currentSet?.id) return

    setStep('publishing')
    setIsPublishing(true)

    try {
      const response = await fetch('/api/mixtape/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setId: currentSet.id,
          title,
          subtitle,
          description,
          coverTemplate,
          coverColors,
          tags,
          isPublic,
          youtubePlaylistId,
          spotifyPlaylistId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish')
      }

      setShareUrl(`${window.location.origin}${data.shareUrl}`)
      setStep('success')
    } catch (error) {
      console.error('[PublishMixtape] Error:', error)
      // Go back to cover step on error
      setStep('cover')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
        >
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "relative w-full bg-[#0a0a10] rounded-3xl shadow-2xl border border-white/10 overflow-hidden",
              step === 'cover' ? 'max-w-2xl' : 'max-w-lg'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Publish as Mixtape</h2>
                  <p className="text-xs text-gray-500">Share your mix with the world</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Metadata Step */}
              {step === 'metadata' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-3">
                      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                      <p className="text-sm text-gray-400">Generating catchy metadata...</p>
                    </div>
                  ) : (
                    <>
                      {/* Title */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Title
                          </label>
                          <button
                            onClick={generateMetadata}
                            className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Regenerate
                          </button>
                        </div>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="My Awesome Mix"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>

                      {/* Subtitle */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                          Tagline
                        </label>
                        <input
                          type="text"
                          value={subtitle}
                          onChange={(e) => setSubtitle(e.target.value)}
                          placeholder="Why this mix slaps..."
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                          Description
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Tell people about this mix..."
                          rows={3}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none"
                        />
                      </div>

                      {/* Tags */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                          Tags
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-white/5 text-xs text-gray-300 rounded-full border border-white/10"
                            >
                              {tag}
                            </span>
                          ))}
                          {tags.length === 0 && (
                            <span className="text-xs text-gray-600">No tags detected</span>
                          )}
                        </div>
                      </div>

                      {/* Visibility Toggle */}
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          {isPublic ? (
                            <Globe className="w-5 h-5 text-cyan-400" />
                          ) : (
                            <Lock className="w-5 h-5 text-gray-400" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-white">
                              {isPublic ? 'Public on Discover' : 'Private Link Only'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {isPublic
                                ? 'Listed in the public discover feed'
                                : 'Only people with the link can view'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsPublic(!isPublic)}
                          className={cn(
                            "relative w-12 h-6 rounded-full transition-colors",
                            isPublic ? "bg-cyan-500" : "bg-white/10"
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                              isPublic ? "translate-x-7" : "translate-x-1"
                            )}
                          />
                        </button>
                      </div>

                      {/* Stats */}
                      <div className="flex gap-4 p-4 bg-white/5 rounded-xl">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Tracks</p>
                          <p className="text-lg font-bold text-white">{trackCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase">Duration</p>
                          <p className="text-lg font-bold text-white">
                            {Math.floor(totalDuration / 60)} min
                          </p>
                        </div>
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={() => setStep('cover')}
                        disabled={!title}
                        className="w-full py-4 bg-cyan-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-cyan-400 transition-all disabled:opacity-50"
                      >
                        Choose Cover Art
                      </button>
                    </>
                  )}
                </motion.div>
              )}

              {/* Cover Step */}
              {step === 'cover' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <CoverGenerator
                    selectedTemplate={coverTemplate}
                    selectedColors={coverColors}
                    title={title}
                    subtitle={subtitle}
                    trackCount={trackCount}
                    duration={totalDuration}
                    onTemplateChange={setCoverTemplate}
                    onColorsChange={setCoverColors}
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('metadata')}
                      className="flex-1 py-4 bg-white/5 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all border border-white/10"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePublish}
                      className="flex-1 py-4 bg-cyan-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-cyan-400 transition-all"
                    >
                      Publish Mixtape
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Publishing Step */}
              {step === 'publishing' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-12 flex flex-col items-center justify-center space-y-4"
                >
                  <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                  <p className="text-sm text-gray-400">Publishing your mixtape...</p>
                </motion.div>
              )}

              {/* Success Step */}
              {step === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-6 text-center space-y-6"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 to-pink-500 flex items-center justify-center mx-auto">
                    <Check className="w-10 h-10 text-black" />
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white">{title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Your mixtape is now {isPublic ? 'live on Discover' : 'available via link'}!
                    </p>
                  </div>

                  {/* Share URL */}
                  {shareUrl && (
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-[10px] text-gray-500 uppercase mb-2">Share Link</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={shareUrl}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono"
                        />
                        <button
                          onClick={handleCopyLink}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            copied
                              ? "bg-green-500/20 text-green-400"
                              : "bg-white/5 hover:bg-white/10 text-gray-400"
                          )}
                        >
                          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <a
                      href={shareUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 bg-cyan-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-cyan-400 transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Mixtape Page
                    </a>

                    {playlistUrl && (
                      <a
                        href={playlistUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-white/5 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/10"
                      >
                        Open Exported Playlist
                      </a>
                    )}
                  </div>

                  {/* Social Share */}
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">
                      Share on
                    </p>
                    <div className="flex justify-center gap-3">
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                          `Check out my mixtape: ${title}\n\n${subtitle}`
                        )}&url=${encodeURIComponent(shareUrl || '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#1DA1F2]/20 text-gray-500 hover:text-[#1DA1F2] flex items-center justify-center transition-all"
                      >
                        <Twitter className="w-5 h-5" />
                      </a>
                      <button
                        onClick={() => {
                          if (navigator.share && shareUrl) {
                            navigator.share({
                              title: title,
                              text: subtitle,
                              url: shareUrl,
                            })
                          }
                        }}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white flex items-center justify-center transition-all"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
