'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Check, Zap, Crown, Sparkles, Music2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIERS = [
  {
    name: 'Free',
    price: 0,
    description: 'Get started with AI-powered DJ sets',
    features: [
      '5 AI generations per month',
      'Basic prompt generation',
      '3 cloud saves',
      'OpenAI provider only',
      'Standard generation queue',
    ],
    cta: 'Current Plan',
    priceType: null,
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 12,
    description: 'Unlock the full power of YTDJ.AI',
    features: [
      '50 AI generations per month',
      'AI Wizard PRO - advanced customization',
      'Unlimited cloud saves',
      'All AI providers (OpenAI, Claude, Gemini)',
      'Priority generation queue',
      'Weighted vibe blending',
      'Context-aware generation',
      'Anchor tracks & playlist references',
    ],
    cta: 'Upgrade to Pro',
    priceType: 'pro',
    highlighted: true,
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
      // Redirect to sign in
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-400">Simple, transparent pricing</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Unlock Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Creative Potential</span>
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Choose the plan that fits your workflow. All plans include access to AI-powered DJ set generation.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                'relative rounded-2xl p-8',
                'bg-[#0a0c1c] border',
                tier.highlighted
                  ? 'border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.15)]'
                  : 'border-white/10'
              )}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-xs font-bold text-white">
                    RECOMMENDED
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                {tier.highlighted ? (
                  <Crown className="w-6 h-6 text-purple-400" />
                ) : (
                  <Zap className="w-6 h-6 text-white/60" />
                )}
                <h2 className="text-2xl font-black">{tier.name}</h2>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-black">${tier.price}</span>
                {tier.price > 0 && <span className="text-white/50">/month</span>}
              </div>
              <p className="text-sm text-white/60 mb-6">{tier.description}</p>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>

              {tier.priceType ? (
                <button
                  onClick={() => handleCheckout(tier.priceType!)}
                  disabled={isLoading === tier.priceType}
                  className={cn(
                    'w-full py-3 rounded-xl font-bold text-sm transition-all',
                    tier.highlighted
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                      : 'bg-white/10 text-white hover:bg-white/20',
                    isLoading === tier.priceType && 'opacity-70 cursor-not-allowed'
                  )}
                >
                  {isLoading === tier.priceType ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    tier.cta
                  )}
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl font-bold text-sm text-center bg-white/5 text-white/50">
                  {tier.cta}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Credit Packs */}
        <div className="max-w-4xl mx-auto">
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
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-2xl font-black text-center mb-10">Frequently Asked Questions</h2>

          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <h3 className="font-bold mb-2">What happens when I run out of credits?</h3>
              <p className="text-sm text-white/60">
                You won&apos;t be able to generate new sets until your credits reset at the start of the next billing cycle,
                or you can purchase a credit pack for immediate access.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <h3 className="font-bold mb-2">Can I cancel my subscription anytime?</h3>
              <p className="text-sm text-white/60">
                Yes, you can cancel your Pro subscription at any time. You&apos;ll continue to have Pro access until the end
                of your current billing period.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <h3 className="font-bold mb-2">Do unused credits roll over?</h3>
              <p className="text-sm text-white/60">
                Monthly credits reset at the start of each billing cycle. However, credits purchased through credit packs
                never expire and are added to your balance.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <h3 className="font-bold mb-2">What&apos;s included in AI Wizard PRO?</h3>
              <p className="text-sm text-white/60">
                AI Wizard PRO is an advanced 7-step guided workflow that lets you fine-tune every aspect of your
                set generation, including weighted vibe blending, context settings, anchor tracks, and much more.
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
