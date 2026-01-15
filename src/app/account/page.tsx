'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Music2,
  Crown,
  Zap,
  CreditCard,
  Clock,
  Check,
  ArrowUpRight,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'

interface CreditTransaction {
  amount: number
  reason: string
  created_at: string
  metadata: any
}

function AccountPageContent() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { subscription, fetchSubscription } = useYTDJStore()
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  // Check for checkout success
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setShowSuccessMessage(true)
      // Refresh subscription data
      setTimeout(() => {
        fetchSubscription()
      }, 1000)
      // Hide message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000)
    }
  }, [searchParams, fetchSubscription])

  // Redirect if not authenticated
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/api/auth/signin?callbackUrl=/account')
    }
  }, [authStatus, router])

  // Fetch subscription and credit history
  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchSubscription()
      loadCreditHistory()
    }
  }, [authStatus, fetchSubscription])

  const loadCreditHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch('/api/user/subscription?history=true')
      if (response.ok) {
        const data = await response.json()
        setCreditHistory(data.creditHistory || [])
      }
    } catch (error) {
      console.error('Failed to load credit history:', error)
    }
    setIsLoadingHistory(false)
  }

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true)
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No portal URL returned')
        setIsLoadingPortal(false)
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error)
      setIsLoadingPortal(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatReason = (reason: string) => {
    const labels: Record<string, string> = {
      generation: 'AI Generation',
      monthly_reset: 'Monthly Reset',
      purchase: 'Credit Purchase',
      bonus: 'Bonus Credits',
      initial: 'Welcome Credits',
      upgrade_to_pro: 'Pro Upgrade',
      downgrade_to_free: 'Plan Change',
    }
    return labels[reason] || reason
  }

  const isPro = subscription.tier === 'pro'

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#05060f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#05060f] text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-cyan-500/5 blur-[150px] rounded-full" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-500/5 blur-[150px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
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

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-6">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <Check className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">
              Payment successful! Your account has been updated.
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black tracking-tight mb-8">Account & Billing</h1>

        <div className="grid gap-6">
          {/* Current Plan */}
          <div className="rounded-2xl p-6 bg-[#0a0c1c] border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {isPro ? (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white/60" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold">{isPro ? 'Pro Plan' : 'Free Plan'}</h2>
                  <p className="text-sm text-white/50">
                    {isPro ? '$12/month' : 'No charge'}
                  </p>
                </div>
              </div>

              {isPro ? (
                <button
                  onClick={handleManageSubscription}
                  disabled={isLoadingPortal}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg',
                    'bg-white/10 text-white text-sm font-medium',
                    'hover:bg-white/20 transition-colors',
                    isLoadingPortal && 'opacity-70 cursor-not-allowed'
                  )}
                >
                  {isLoadingPortal ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  Manage Subscription
                </button>
              ) : (
                <Link
                  href="/pricing"
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg',
                    'bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold',
                    'hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all'
                  )}
                >
                  <Crown className="w-4 h-4" />
                  Upgrade to Pro
                </Link>
              )}
            </div>

            {/* Credits */}
            <div className="p-4 rounded-xl bg-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-white/60">Credits Remaining</span>
                <span className="text-sm text-white/60">
                  {subscription.creditsRemaining} / {subscription.limits.monthlyCredits}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    subscription.creditsRemaining > subscription.limits.monthlyCredits * 0.5
                      ? 'bg-green-500'
                      : subscription.creditsRemaining > subscription.limits.monthlyCredits * 0.2
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  )}
                  style={{
                    width: `${Math.min(100, (subscription.creditsRemaining / subscription.limits.monthlyCredits) * 100)}%`,
                  }}
                />
              </div>
              {subscription.creditsResetAt && (
                <p className="text-xs text-white/40 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Resets {formatDate(subscription.creditsResetAt)}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/pricing#credits"
              className="p-4 rounded-xl bg-[#0a0c1c] border border-white/10 hover:border-cyan-500/30 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  <span className="font-medium">Buy Credit Packs</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-cyan-400 transition-colors" />
              </div>
              <p className="text-sm text-white/50 mt-2">Get extra credits without a subscription</p>
            </Link>

            <Link
              href="/pricing"
              className="p-4 rounded-xl bg-[#0a0c1c] border border-white/10 hover:border-purple-500/30 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-purple-400" />
                  <span className="font-medium">View All Plans</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-purple-400 transition-colors" />
              </div>
              <p className="text-sm text-white/50 mt-2">Compare features and pricing</p>
            </Link>
          </div>

          {/* Credit History */}
          <div className="rounded-2xl p-6 bg-[#0a0c1c] border border-white/10">
            <h3 className="text-lg font-bold mb-4">Credit History</h3>

            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
              </div>
            ) : creditHistory.length > 0 ? (
              <div className="space-y-3">
                {creditHistory.map((transaction, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{formatReason(transaction.reason)}</p>
                      <p className="text-xs text-white/40">{formatDate(transaction.created_at)}</p>
                    </div>
                    <span
                      className={cn(
                        'font-bold',
                        transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                      )}
                    >
                      {transaction.amount > 0 ? '+' : ''}
                      {transaction.amount}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-sm text-white/40">No credit history yet</p>
              </div>
            )}
          </div>

          {/* Account Info */}
          <div className="rounded-2xl p-6 bg-[#0a0c1c] border border-white/10">
            <h3 className="text-lg font-bold mb-4">Account Information</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-white/50 mb-1">Email</p>
                <p className="font-medium">{session?.user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-white/50 mb-1">Name</p>
                <p className="font-medium">{session?.user?.name || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} YTDJ.AI
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

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#05060f] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
        </div>
      }
    >
      <AccountPageContent />
    </Suspense>
  )
}
