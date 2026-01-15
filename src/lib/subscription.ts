import { getServerSupabase } from './supabase'
import { TIER_CONFIG, Tier } from './stripe'

export interface UserSubscription {
  id: string
  user_email: string
  tier: Tier
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  credits_remaining: number
  credits_reset_at: string | null
  created_at: string
  updated_at: string
}

export interface CanGenerateResult {
  allowed: boolean
  reason?: string
  creditsRemaining?: number
  tier?: Tier
}

// Get or create user subscription
export async function getUserSubscription(email: string): Promise<UserSubscription> {
  const supabase = getServerSupabase()

  // Try to get existing subscription
  const { data: existing, error: fetchError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_email', email)
    .single()

  if (existing && !fetchError) {
    return existing as UserSubscription
  }

  // Create new subscription for user (free tier with 5 credits)
  const { data: created, error: createError } = await supabase
    .from('user_subscriptions')
    .insert({
      user_email: email,
      tier: 'free',
      credits_remaining: TIER_CONFIG.free.monthlyCredits,
      credits_reset_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (createError) {
    throw new Error(`Failed to create subscription: ${createError.message}`)
  }

  // Log the initial credits
  await logCreditTransaction(email, TIER_CONFIG.free.monthlyCredits, 'initial', {
    tier: 'free',
  })

  return created as UserSubscription
}

// Check if user can generate (has credits)
export async function checkCanGenerate(email: string): Promise<CanGenerateResult> {
  const subscription = await getUserSubscription(email)

  if (subscription.credits_remaining <= 0) {
    return {
      allowed: false,
      reason: 'no_credits',
      creditsRemaining: 0,
      tier: subscription.tier as Tier,
    }
  }

  return {
    allowed: true,
    creditsRemaining: subscription.credits_remaining,
    tier: subscription.tier as Tier,
  }
}

// Consume a credit after successful generation
export async function consumeCredit(email: string): Promise<boolean> {
  const supabase = getServerSupabase()

  // Get current subscription
  const subscription = await getUserSubscription(email)
  if (subscription.credits_remaining <= 0) {
    return false
  }

  // Decrement credits
  const { error: updateError } = await supabase
    .from('user_subscriptions')
    .update({
      credits_remaining: subscription.credits_remaining - 1,
    })
    .eq('user_email', email)

  if (updateError) {
    console.error('Failed to consume credit:', updateError)
    return false
  }

  // Log the transaction
  await logCreditTransaction(email, -1, 'generation', {
    timestamp: new Date().toISOString(),
  })

  return true
}

// Add credits to user account
export async function addCredits(
  email: string,
  amount: number,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = getServerSupabase()
  const subscription = await getUserSubscription(email)

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      credits_remaining: subscription.credits_remaining + amount,
    })
    .eq('user_email', email)

  if (error) {
    throw new Error(`Failed to add credits: ${error.message}`)
  }

  await logCreditTransaction(email, amount, reason, metadata)
}

// Reset monthly credits (called on subscription renewal)
export async function resetMonthlyCredits(email: string): Promise<void> {
  const supabase = getServerSupabase()
  const subscription = await getUserSubscription(email)
  const tierConfig = TIER_CONFIG[subscription.tier as Tier]

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      credits_remaining: tierConfig.monthlyCredits,
      credits_reset_at: new Date().toISOString(),
    })
    .eq('user_email', email)

  if (error) {
    throw new Error(`Failed to reset credits: ${error.message}`)
  }

  await logCreditTransaction(email, tierConfig.monthlyCredits, 'monthly_reset', {
    tier: subscription.tier,
    previousCredits: subscription.credits_remaining,
  })
}

// Upgrade user to pro tier
export async function upgradeToProTier(
  email: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string
): Promise<void> {
  const supabase = getServerSupabase()

  // Use upsert to handle case where user doesn't have a subscription record yet
  const { error } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_email: email,
      tier: 'pro',
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      credits_remaining: TIER_CONFIG.pro.monthlyCredits,
      credits_reset_at: new Date().toISOString(),
    }, {
      onConflict: 'user_email',
    })

  if (error) {
    throw new Error(`Failed to upgrade to pro: ${error.message}`)
  }

  await logCreditTransaction(email, TIER_CONFIG.pro.monthlyCredits, 'upgrade_to_pro', {
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
  })
}

// Downgrade user to free tier
export async function downgradeToFreeTier(email: string): Promise<void> {
  const supabase = getServerSupabase()
  const subscription = await getUserSubscription(email)

  // Keep remaining credits but cap at free tier max
  const cappedCredits = Math.min(
    subscription.credits_remaining,
    TIER_CONFIG.free.monthlyCredits
  )

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      tier: 'free',
      stripe_subscription_id: null,
      credits_remaining: cappedCredits,
    })
    .eq('user_email', email)

  if (error) {
    throw new Error(`Failed to downgrade: ${error.message}`)
  }

  await logCreditTransaction(email, 0, 'downgrade_to_free', {
    previousCredits: subscription.credits_remaining,
    cappedCredits,
  })
}

// Get user's cloud save count
export async function getCloudSaveCount(email: string): Promise<number> {
  const supabase = getServerSupabase()

  const { count, error } = await supabase
    .from('dj_sets')
    .select('*', { count: 'exact', head: true })
    .eq('user_email', email)

  if (error) {
    console.error('Failed to get cloud save count:', error)
    return 0
  }

  return count || 0
}

// Check if user can save to cloud
export async function canSaveToCloud(email: string): Promise<{ allowed: boolean; reason?: string }> {
  const subscription = await getUserSubscription(email)
  const tierConfig = TIER_CONFIG[subscription.tier as Tier]
  const saveCount = await getCloudSaveCount(email)

  if (saveCount >= tierConfig.maxCloudSaves) {
    return {
      allowed: false,
      reason: `Free tier limited to ${tierConfig.maxCloudSaves} cloud saves. Upgrade to Pro for unlimited.`,
    }
  }

  return { allowed: true }
}

// Log credit transaction
async function logCreditTransaction(
  email: string,
  amount: number,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = getServerSupabase()

  const { error } = await supabase.from('credit_transactions').insert({
    user_email: email,
    amount,
    reason,
    metadata: metadata || {},
  })

  if (error) {
    console.error('Failed to log credit transaction:', error)
  }
}

// Get credit transaction history
export async function getCreditHistory(
  email: string,
  limit: number = 20
): Promise<Array<{ amount: number; reason: string; created_at: string; metadata: unknown }>> {
  const supabase = getServerSupabase()

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('amount, reason, created_at, metadata')
    .eq('user_email', email)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to get credit history:', error)
    return []
  }

  return data || []
}
