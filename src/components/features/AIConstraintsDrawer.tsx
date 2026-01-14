'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Sparkles, RefreshCw, Brain, Zap, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import type { AIProvider } from '@/types'

const AI_PROVIDERS: {
  id: AIProvider
  name: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    id: 'openai',
    name: 'OpenAI GPT-4',
    description: 'Powerful reasoning',
    icon: <Sparkles className="w-4 h-4" />
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    description: 'Nuanced analysis',
    icon: <Brain className="w-4 h-4" />
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Fast inference',
    icon: <Zap className="w-4 h-4" />
  }
]

interface AIConstraintsDrawerProps {
  isOpen: boolean
  onClose: () => void
  onRegenerate?: () => void
}

export function AIConstraintsDrawer({ isOpen, onClose, onRegenerate }: AIConstraintsDrawerProps) {
  const {
    constraints,
    setConstraints,
    addToBlacklist,
    removeFromBlacklist,
    toggleDecade,
    isGenerating,
    aiProvider,
    setAIProvider
  } = useYTDJStore()

  const [blacklistInput, setBlacklistInput] = useState('')
  const [showMoreDecades, setShowMoreDecades] = useState(false)

  const mainDecades = ['80s', '90s', '00s', '10s', '20s']
  const olderDecades = ['1850s', '1860s', '1870s', '1880s', '1890s', '1900s', '1910s', '1920s', '1930s', '1940s', '1950s', '1960s', '1970s']

  const handleAddBlacklist = () => {
    if (blacklistInput.trim()) {
      addToBlacklist(blacklistInput.trim())
      setBlacklistInput('')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 h-full w-80 bg-[#0a0c1c]/95 backdrop-blur-xl border-r border-white/5 flex flex-col overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider">AI Settings</h2>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Engine Constraints</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            {/* AI Model Selection */}
            <section className="space-y-5">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                AI Model
              </h3>
              <div className="space-y-2">
                {AI_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setAIProvider(provider.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all border",
                      aiProvider === provider.id
                        ? "bg-purple-500/20 border-purple-500/50"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      aiProvider === provider.id
                        ? "bg-purple-500/30 text-purple-400"
                        : "bg-white/10 text-gray-400"
                    )}>
                      {provider.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={cn(
                        "text-xs font-bold",
                        aiProvider === provider.id ? "text-purple-400" : "text-white"
                      )}>
                        {provider.name}
                      </p>
                      <p className="text-[10px] text-gray-500">{provider.description}</p>
                    </div>
                    {aiProvider === provider.id && (
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Rhythm Metrics Section */}
            <section className="space-y-5">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                Rhythm Metrics
              </h3>

              {/* Energy Tolerance */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-gray-400">Energy Tolerance</label>
                  <span className="text-sm font-mono text-cyan-400">±{constraints.energyTolerance}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={constraints.energyTolerance}
                  onChange={(e) => setConstraints({ energyTolerance: parseInt(e.target.value) })}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-[9px] font-bold text-gray-600 uppercase">
                  <span>Strict</span>
                  <span>Flexible</span>
                </div>
              </div>

              {/* Beat Complexity (Syncopation) */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-gray-400">Beat Complexity</label>
                  <span className="text-sm font-mono text-pink-400">{constraints.syncopation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={constraints.syncopation}
                  onChange={(e) => setConstraints({ syncopation: parseInt(e.target.value) })}
                  className="w-full accent-pink-500"
                />
                <div className="flex justify-between text-[9px] font-bold text-gray-600 uppercase">
                  <span>Simple</span>
                  <span>Complex</span>
                </div>
              </div>

              {/* Key Compatibility */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400">Key Compatibility</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConstraints({ keyMatch: 'strict' })}
                    className={cn(
                      "py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                      constraints.keyMatch === 'strict'
                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                        : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20"
                    )}
                  >
                    Strict Match
                  </button>
                  <button
                    onClick={() => setConstraints({ keyMatch: 'loose' })}
                    className={cn(
                      "py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                      constraints.keyMatch === 'loose'
                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                        : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20"
                    )}
                  >
                    Loose Match
                  </button>
                </div>
              </div>
            </section>

            {/* Curation Logic Section */}
            <section className="space-y-5">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                Curation Logic
              </h3>

              {/* Artist Diversity */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-gray-400">Artist Diversity</label>
                  <span className="text-sm font-mono text-cyan-400">{constraints.diversity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={constraints.diversity}
                  onChange={(e) => setConstraints({ diversity: parseInt(e.target.value) })}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-[9px] font-bold text-gray-600 uppercase">
                  <span>Same Artist OK</span>
                  <span>Max Variety</span>
                </div>
              </div>

              {/* Decade Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400">Active Decades</label>
                <div className="flex flex-wrap gap-2">
                  {mainDecades.map((decade) => (
                    <button
                      key={decade}
                      onClick={() => toggleDecade(decade)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                        constraints.activeDecades.includes(decade)
                          ? "bg-pink-500/20 border-pink-500/50 text-pink-400"
                          : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20"
                      )}
                    >
                      {decade}
                    </button>
                  ))}
                </div>

                {/* More Decades Toggle */}
                <button
                  onClick={() => setShowMoreDecades(!showMoreDecades)}
                  className="text-[10px] font-bold text-gray-500 hover:text-gray-300 uppercase tracking-wider transition-colors flex items-center gap-1"
                >
                  <Plus className={cn("w-3 h-3 transition-transform", showMoreDecades && "rotate-45")} />
                  {showMoreDecades ? 'Hide Older Decades' : 'More Decades'}
                </button>

                {/* Older Decades (Hidden by default) */}
                <AnimatePresence>
                  {showMoreDecades && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                        {olderDecades.map((decade) => (
                          <button
                            key={decade}
                            onClick={() => toggleDecade(decade)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                              constraints.activeDecades.includes(decade)
                                ? "bg-pink-500/20 border-pink-500/50 text-pink-400"
                                : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20"
                            )}
                          >
                            {decade}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Discovery Bias */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-gray-400">Discovery Bias</label>
                  <span className="text-sm font-mono text-pink-400">{constraints.discovery}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={constraints.discovery}
                  onChange={(e) => setConstraints({ discovery: parseInt(e.target.value) })}
                  className="w-full accent-pink-500"
                />
                <div className="flex justify-between text-[9px] font-bold text-gray-600 uppercase">
                  <span>Chart Hits</span>
                  <span>Underground</span>
                </div>
              </div>
            </section>

            {/* Blacklist Section */}
            <section className="space-y-5">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Blacklist
              </h3>

              {/* Add Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={blacklistInput}
                  onChange={(e) => setBlacklistInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddBlacklist()}
                  placeholder="Artist or genre to exclude..."
                  className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
                />
                <button
                  onClick={handleAddBlacklist}
                  disabled={!blacklistInput.trim()}
                  className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Blacklist Items */}
              {constraints.blacklist.length > 0 ? (
                <div className="space-y-2">
                  {constraints.blacklist.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg group"
                    >
                      <span className="text-sm text-red-400">{item}</span>
                      <button
                        onClick={() => removeFromBlacklist(index)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-600 italic">No exclusions added</p>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 bg-black/20">
            <button
              onClick={() => onRegenerate?.()}
              disabled={isGenerating}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Apply & Regenerate
                </>
              )}
            </button>
          </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
