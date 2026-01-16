import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserSubscription, getCreditHistory, getCloudSaveCount } from '@/lib/subscription'
import { TIER_CONFIG, Tier } from '@/lib/stripe'

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    const subscription = await getUserSubscription(userEmail)
    const tierConfig = TIER_CONFIG[subscription.tier as Tier]
    const cloudSaveCount = await getCloudSaveCount(userEmail)

    // Optionally include credit history
    const url = new URL(req.url)
    const includeHistory = url.searchParams.get('history') === 'true'
    let creditHistory = null
    if (includeHistory) {
      creditHistory = await getCreditHistory(userEmail)
    }

    return NextResponse.json({
      tier: subscription.tier,
      creditsRemaining: subscription.credits_remaining,
      creditsResetAt: subscription.credits_reset_at,
      hasStripeSubscription: !!subscription.stripe_subscription_id,
      limits: {
        monthlyCredits: tierConfig.monthlyCredits,
        maxCloudSaves: tierConfig.maxCloudSaves === Infinity ? null : tierConfig.maxCloudSaves,
        allowedProviders: tierConfig.allowedProviders,
        hasWizardPro: tierConfig.hasWizardPro,
        hasSegmentedSets: tierConfig.hasSegmentedSets,
      },
      usage: {
        cloudSaves: cloudSaveCount,
      },
      ...(creditHistory && { creditHistory }),
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    )
  }
}
