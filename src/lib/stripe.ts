import Stripe from 'stripe'

// Server-side Stripe client
let _stripeClient: Stripe | null = null

export const getStripe = (): Stripe => {
  if (!_stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY must be configured')
    }

    _stripeClient = new Stripe(secretKey, {
      typescript: true,
    })
  }
  return _stripeClient
}

// Price IDs from environment
export const STRIPE_PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRO_PRICE_ID || '',
  CREDITS_10: process.env.STRIPE_CREDITS_10_PRICE_ID || '',
  CREDITS_30: process.env.STRIPE_CREDITS_30_PRICE_ID || '',
  CREDITS_100: process.env.STRIPE_CREDITS_100_PRICE_ID || '',
} as const

// Credit amounts for each pack - lookup by price ID at runtime
export function getCreditAmountForPrice(priceId: string): number | null {
  const priceToCredits: Record<string, number> = {
    [process.env.STRIPE_CREDITS_10_PRICE_ID || '']: 10,
    [process.env.STRIPE_CREDITS_30_PRICE_ID || '']: 30,
    [process.env.STRIPE_CREDITS_100_PRICE_ID || '']: 100,
  }
  return priceToCredits[priceId] ?? null
}

// Legacy export for backward compatibility
export const CREDIT_PACK_AMOUNTS: Record<string, number> = {}

// Tier configuration
export const TIER_CONFIG = {
  free: {
    monthlyCredits: 5,
    maxCloudSaves: 3,
    allowedProviders: ['openai'] as const,
    hasWizardPro: false,
    hasSegmentedSets: false,
  },
  pro: {
    monthlyCredits: 50,
    maxCloudSaves: Infinity,
    allowedProviders: ['openai', 'claude', 'gemini'] as const,
    hasWizardPro: true,
    hasSegmentedSets: true,
  },
} as const

export type Tier = keyof typeof TIER_CONFIG
