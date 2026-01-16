'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Check, Zap, Crown, Sparkles, Music2, Play, Layers, Wand2,
  Radio, Download, Cloud, Gauge, Shuffle, KeyRound, Volume2
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PRO_FEATURES = [
  {
    icon: Zap,
    title: '50 AI Generations/Month',
    description: '10x more than free tier'
  },
  {
    icon: Wand2,
    title: 'AI Wizard PRO',
    description: 'Advanced 7-step customization'
  },
  {
    icon: Sparkles,
    title: 'All AI Providers',
    description: 'OpenAI, Claude, and Gemini'
  },
  {
    icon: Cloud,
    title: 'Unlimited Cloud Saves',
    description: 'Never lose a set'
  },
  {
    icon: Gauge,
    title: 'Priority Queue',
    description: 'Faster generation times'
  },
  {
    icon: Shuffle,
    title: 'Weighted Vibe Blending',
    description: 'Mix multiple vibes with %'
  },
  {
    icon: Layers,
    title: 'Segmented Set Designer',
    description: 'Multi-phase DJ sets'
  },
  {
    icon: Radio,
    title: 'AutoMix Mode',
    description: 'Continuous crossfade playback'
  },
  {
    icon: KeyRound,
    title: 'Key Compatibility',
    description: 'Camelot wheel matching'
  },
  {
    icon: Download,
    title: 'Export Anywhere',
    description: 'YouTube, M3U, and more'
  },
]

const FEATURE_SHOWCASES = [
  {
    id: 'automix',
    title: 'AutoMix Mode',
    subtitle: 'Continuous, Beat-Matched Playback',
    description: 'Seamless crossfade transitions between tracks with AI-estimated BPM and key matching. Watch your set flow like a professional DJ mix.',
    gradient: 'from-cyan-500 to-blue-600',
    preview: (
      <div className="relative bg-black/60 rounded-xl p-4 border border-cyan-500/30">
        {/* Mini player visualization */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center">
            <Play className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-white">Track A</div>
            <div className="text-xs text-white/50">128 BPM • 8A</div>
          </div>
          <div className="text-xs font-mono text-cyan-400">PLAYING</div>
        </div>
        {/* Crossfade visualization */}
        <div className="relative h-8 bg-white/5 rounded-lg overflow-hidden mb-4">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '30%' }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500/60 to-cyan-500/20 rounded-l-lg"
          />
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '70%' }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
            className="absolute right-0 top-0 h-full bg-gradient-to-l from-pink-500/60 to-pink-500/20 rounded-r-lg"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Crossfading...</span>
          </div>
        </div>
        {/* Next track */}
        <div className="flex items-center gap-4 opacity-70">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center">
            <Volume2 className="w-5 h-5 text-pink-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-white">Track B</div>
            <div className="text-xs text-white/50">126 BPM • 8B</div>
          </div>
          <div className="text-xs font-mono text-pink-400">PRELOADED</div>
        </div>
        {/* Key compatibility badge */}
        <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">
          <span className="text-[9px] font-bold text-green-400 uppercase">Perfect Key Match</span>
        </div>
      </div>
    )
  },
  {
    id: 'segments',
    title: 'Segmented Set Designer',
    subtitle: 'Build Multi-Phase DJ Sets',
    description: 'Design professional DJ sets with distinct phases: Warmup → Build → Peak → Land. Each segment has its own energy, mood, and constraints.',
    gradient: 'from-purple-500 to-pink-600',
    preview: (
      <div className="relative bg-black/60 rounded-xl p-4 border border-purple-500/30">
        {/* Segment bars */}
        <div className="flex gap-1 h-16 mb-4">
          <div className="flex-[2] bg-blue-500/30 rounded-lg border border-blue-500/50 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-blue-400 uppercase">Warmup</span>
            <span className="text-[9px] text-white/50">30-55</span>
          </div>
          <div className="flex-[3] bg-purple-500/30 rounded-lg border border-purple-500/50 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-purple-400 uppercase">Build</span>
            <span className="text-[9px] text-white/50">50-75</span>
          </div>
          <div className="flex-[4] bg-pink-500/30 rounded-lg border border-pink-500/50 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-pink-400 uppercase">Peak</span>
            <span className="text-[9px] text-white/50">75-100</span>
          </div>
          <div className="flex-[2] bg-cyan-500/30 rounded-lg border border-cyan-500/50 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-cyan-400 uppercase">Land</span>
            <span className="text-[9px] text-white/50">40-65</span>
          </div>
        </div>
        {/* Energy curve */}
        <svg viewBox="0 0 200 40" className="w-full h-10">
          <defs>
            <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="30%" stopColor="#8B5CF6" />
              <stop offset="60%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          <path
            d="M 0 35 Q 25 30, 50 25 Q 80 15, 120 8 Q 160 20, 200 28"
            fill="none"
            stroke="url(#energyGradient)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center text-[10px] text-white/40 mt-2">Energy Profile • 2 hour set</div>
      </div>
    )
  },
  {
    id: 'wizard',
    title: 'AI Wizard PRO',
    subtitle: '7-Step Guided Customization',
    description: 'Fine-tune every aspect of your set: weighted vibes, context settings, anchor tracks, vocal density, energy presets, and more.',
    gradient: 'from-amber-500 to-orange-600',
    preview: (
      <div className="relative bg-black/60 rounded-xl p-4 border border-amber-500/30">
        {/* Wizard steps */}
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4, 5, 6, 7].map((step) => (
            <div
              key={step}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                step <= 3
                  ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
                  : 'bg-white/10 text-white/40'
              )}
            >
              {step <= 3 ? <Check className="w-4 h-4" /> : step}
            </div>
          ))}
        </div>
        {/* Current step preview - Weighted Vibes */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Weighted Vibe Blending</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="w-[60%] h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
              </div>
              <span className="text-xs text-white/60 w-16">"chill" 60%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="w-[40%] h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
              </div>
              <span className="text-xs text-white/60 w-16">"groovy" 40%</span>
            </div>
          </div>
        </div>
        {/* Anchor tracks */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="text-[10px] font-bold text-white/40 uppercase mb-2">Anchor Tracks (Must Include)</div>
          <div className="flex gap-2">
            <div className="px-2 py-1 bg-amber-500/20 rounded text-[10px] text-amber-400 font-medium">
              "Billie Jean"
            </div>
            <div className="px-2 py-1 bg-amber-500/20 rounded text-[10px] text-amber-400 font-medium">
              "Around The World"
            </div>
          </div>
        </div>
      </div>
    )
  },
]

const CREDIT_PACKS = [
  { credits: 10, price: 5, priceType: 'credits_10' },
  { credits: 30, price: 12, priceType: 'credits_30', popular: true },
  { credits: 100, price: 35, priceType: 'credits_100' },
]

export default function PricingPage() {
  const { data: session, status: authStatus } = useSession()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleCheckout = async (priceType: string) => {
    if (authStatus !== 'authenticated') {
      window.location.href = '/api/auth/signin?callbackUrl=/pricing'
      return
    }

    setIsLoading(priceType)
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceType }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned')
        setIsLoading(null)
      }
    } catch (error) {
      console.error('Failed to create checkout:', error)
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#05060f] text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-purple-500/5 blur-[150px] rounded-full" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-pink-500/5 blur-[150px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-cyan-500/5 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-500 to-pink-500 flex items-center justify-center font-black text-black text-sm">
              <Music2 className="w-4 h-4" />
            </div>
            <span className="text-lg font-extrabold tracking-tighter uppercase">
              YTDJ<span className="text-cyan-400">.AI</span>
            </span>
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-white/20 transition-all"
          >
            Back to App
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-400">Unlock the full YTDJ.AI experience</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black tracking-tight mb-4"
          >
            Go <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Pro</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-white/60 max-w-2xl mx-auto"
          >
            Everything you need to create professional DJ sets with AI. AutoMix, segmented sets, advanced customization, and more.
          </motion.p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
          {/* Free Tier */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="relative rounded-2xl p-8 bg-[#0a0c1c] border border-white/10"
          >
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-white/60" />
              <h2 className="text-2xl font-black">Free</h2>
            </div>

            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-black">$0</span>
            </div>
            <p className="text-sm text-white/60 mb-6">Get started with AI-powered DJ sets</p>

            <ul className="space-y-3 mb-8">
              {[
                '5 AI generations per month',
                'Basic prompt generation',
                '3 cloud saves',
                'OpenAI provider only',
                'Standard generation queue',
              ].map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-white/40 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white/60">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="w-full py-3 rounded-xl font-bold text-sm text-center bg-white/5 text-white/50">
              Current Plan
            </div>
          </motion.div>

          {/* Pro Tier */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="relative rounded-2xl p-8 bg-[#0a0c1c] border border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.15)]"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="px-4 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-xs font-bold text-white">
                RECOMMENDED
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-black">Pro</h2>
            </div>

            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-black">$12</span>
              <span className="text-white/50">/month</span>
            </div>
            <p className="text-sm text-white/60 mb-6">Unlock the full power of YTDJ.AI</p>

            <ul className="space-y-3 mb-8">
              {PRO_FEATURES.slice(0, 6).map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <feature.icon className="w-3 h-3 text-purple-400" />
                  </div>
                  <div>
                    <span className="text-sm text-white/80 font-medium">{feature.title}</span>
                    <span className="text-sm text-white/40 ml-1">— {feature.description}</span>
                  </div>
                </li>
              ))}
              <li className="text-sm text-purple-400 font-medium pl-8">
                + {PRO_FEATURES.length - 6} more features below ↓
              </li>
            </ul>

            <button
              onClick={() => handleCheckout('pro')}
              disabled={isLoading === 'pro'}
              className={cn(
                'w-full py-3 rounded-xl font-bold text-sm transition-all',
                'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
                'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]',
                isLoading === 'pro' && 'opacity-70 cursor-not-allowed'
              )}
            >
              {isLoading === 'pro' ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading...
                </span>
              ) : (
                'Upgrade to Pro'
              )}
            </button>
          </motion.div>
        </div>

        {/* Feature Showcases with Previews */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-3">See What You Get</h2>
            <p className="text-white/60">Interactive previews of Pro-exclusive features</p>
          </div>

          <div className="space-y-8">
            {FEATURE_SHOWCASES.map((showcase, index) => (
              <motion.div
                key={showcase.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className={cn(
                  'rounded-2xl p-8 border',
                  'bg-[#0a0c1c]',
                  index === 0 && 'border-cyan-500/30',
                  index === 1 && 'border-purple-500/30',
                  index === 2 && 'border-amber-500/30'
                )}
              >
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className={index % 2 === 1 ? 'md:order-2' : ''}>
                    <div className={cn(
                      'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4',
                      `bg-gradient-to-r ${showcase.gradient} text-white`
                    )}>
                      <Crown className="w-3 h-3" />
                      Pro Feature
                    </div>
                    <h3 className="text-2xl font-black mb-2">{showcase.title}</h3>
                    <p className="text-lg text-white/60 mb-4">{showcase.subtitle}</p>
                    <p className="text-sm text-white/50 leading-relaxed">{showcase.description}</p>
                  </div>
                  <div className={index % 2 === 1 ? 'md:order-1' : ''}>
                    {showcase.preview}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* All Pro Features Grid */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black mb-3">Everything in Pro</h2>
            <p className="text-white/60">All the features that make YTDJ.AI the best AI DJ platform</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PRO_FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-3 group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all">
                  <feature.icon className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-bold text-sm text-white mb-1">{feature.title}</h3>
                <p className="text-xs text-white/50">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Credit Packs */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black mb-2">Need More Credits?</h2>
            <p className="text-white/60">Purchase credit packs for additional generations without a subscription.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.credits}
                className={cn(
                  'relative rounded-xl p-6 text-center',
                  'bg-[#0a0c1c] border',
                  pack.popular ? 'border-cyan-500/50' : 'border-white/10'
                )}
              >
                {pack.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <div className="px-3 py-0.5 rounded-full bg-cyan-500 text-xs font-bold text-black">
                      POPULAR
                    </div>
                  </div>
                )}

                <div className="text-3xl font-black mb-1">{pack.credits}</div>
                <div className="text-sm text-white/50 mb-4">credits</div>
                <div className="text-xl font-bold mb-4">${pack.price}</div>

                <button
                  onClick={() => handleCheckout(pack.priceType)}
                  disabled={isLoading === pack.priceType}
                  className={cn(
                    'w-full py-2 rounded-lg font-bold text-sm transition-all',
                    pack.popular
                      ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                      : 'bg-white/10 text-white hover:bg-white/20',
                    isLoading === pack.priceType && 'opacity-70 cursor-not-allowed'
                  )}
                >
                  {isLoading === pack.priceType ? 'Loading...' : 'Buy Credits'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-10">Frequently Asked Questions</h2>

          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <h3 className="font-bold mb-2">What is AutoMix Mode?</h3>
              <p className="text-sm text-white/60">
                AutoMix enables continuous playback with automatic crossfade transitions between tracks. It uses AI to estimate BPM and musical key, then applies the Camelot wheel to ensure harmonic compatibility. Your sets play like a professional DJ mix.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <h3 className="font-bold mb-2">What is the Segmented Set Designer?</h3>
              <p className="text-sm text-white/60">
                Build multi-phase DJ sets with distinct segments like Warmup, Build, Peak, and Land. Each segment can have its own energy range, mood, and track constraints. Perfect for planning club nights or long sets.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <h3 className="font-bold mb-2">What&apos;s included in AI Wizard PRO?</h3>
              <p className="text-sm text-white/60">
                AI Wizard PRO is an advanced 7-step guided workflow that lets you fine-tune every aspect of your set generation, including weighted vibe blending (mix multiple moods with percentages), context settings (time of day, activity, weather), anchor tracks (must-include songs), vocal density controls, and much more.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <h3 className="font-bold mb-2">What happens when I run out of credits?</h3>
              <p className="text-sm text-white/60">
                You won&apos;t be able to generate new sets until your credits reset at the start of the next billing cycle, or you can purchase a credit pack for immediate access.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <h3 className="font-bold mb-2">Can I cancel my subscription anytime?</h3>
              <p className="text-sm text-white/60">
                Yes, you can cancel your Pro subscription at any time. You&apos;ll continue to have Pro access until the end of your current billing period.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <h3 className="font-bold mb-2">Do unused credits roll over?</h3>
              <p className="text-sm text-white/60">
                Monthly credits reset at the start of each billing cycle. However, credits purchased through credit packs never expire and are added to your balance.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 mt-20">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} YTDJ.AI. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="text-sm text-white/40 hover:text-white/60 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-white/40 hover:text-white/60 transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
