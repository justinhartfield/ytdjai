'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Zap, Check, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  feature?: string
}

const PRO_FEATURES = [
  '50 AI generations per month',
  'AI Wizard PRO - 7-step customization',
  'All AI providers (OpenAI, Claude, Gemini)',
  'AutoMix - continuous crossfade playback',
  'Segmented Set Designer',
  'Key compatibility (Camelot wheel)',
  'Unlimited cloud saves',
  'Priority generation queue',
]

export function UpgradeModal({ isOpen, onClose, feature }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceType: 'pro' }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned:', data)
        setError(data.error || 'Unable to start checkout. Please try again.')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Failed to create checkout:', error)
      setError('Network error. Please check your connection and try again.')
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-md overflow-hidden bg-[#0a0c1c] border border-white/10 rounded-2xl shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors z-10"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>

          {/* Pro Badge Header */}
          <div className="relative px-6 pt-8 pb-6 bg-gradient-to-b from-purple-500/20 to-transparent">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Crown className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-white text-center">
              {feature === 'AI generations' ? "You've run out of credits" : 'Upgrade to Pro'}
            </h2>
            {feature && (
              <p className="text-sm text-white/60 text-center mt-2">
                {feature === 'AI generations' ? (
                  'Upgrade to Pro for 50 AI generations per month'
                ) : (
                  <><span className="text-purple-400">{feature}</span> is a Pro feature</>
                )}
              </p>
            )}
          </div>

          {/* Features List */}
          <div className="px-6 pb-6">
            <div className="space-y-3 mb-6">
              {PRO_FEATURES.map((feat, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-400" />
                  </div>
                  <span className="text-sm text-white/80">{feat}</span>
                </div>
              ))}
            </div>

            {/* Price */}
            <div className="flex items-baseline justify-center gap-1 mb-6">
              <span className="text-4xl font-black text-white">$12</span>
              <span className="text-white/50">/month</span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400 text-center">{error}</p>
              </div>
            )}

            {/* CTA Button */}
            <motion.button
              onClick={handleUpgrade}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-sm',
                'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
                'shadow-[0_0_20px_rgba(168,85,247,0.4)]',
                'hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]',
                'transition-all',
                isLoading && 'opacity-70 cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Upgrade to Pro</span>
                </>
              )}
            </motion.button>

            {/* Skip link */}
            <button
              onClick={onClose}
              className="w-full mt-3 text-center text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
