/**
 * Environment Variable Validation
 *
 * Validates that required environment variables are set.
 * Call validateEnv() early in the app lifecycle to catch misconfigurations.
 */

// Required for core functionality
const REQUIRED_SERVER_VARS = [
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
] as const

// Required for payments (only validate if Stripe is being used)
const STRIPE_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
] as const

// Required for rate limiting in production
const RATE_LIMIT_VARS = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
] as const

// At least one AI provider must be configured
const AI_PROVIDER_VARS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_AI_API_KEY',
] as const

export interface EnvValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validates environment variables for production readiness.
 * Returns validation result with errors and warnings.
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const isProduction = process.env.NODE_ENV === 'production'

  // Check required server variables
  for (const varName of REQUIRED_SERVER_VARS) {
    if (!process.env[varName]) {
      errors.push(`Missing required env var: ${varName}`)
    }
  }

  // Check Stripe variables (warn if missing, not error - might not be using payments yet)
  const hasAnyStripeVar = STRIPE_VARS.some(v => process.env[v])
  if (hasAnyStripeVar) {
    for (const varName of STRIPE_VARS) {
      if (!process.env[varName]) {
        warnings.push(`Stripe partially configured, missing: ${varName}`)
      }
    }
  }

  // Check rate limiting in production
  if (isProduction) {
    const hasRateLimit = RATE_LIMIT_VARS.every(v => process.env[v])
    if (!hasRateLimit) {
      errors.push('Rate limiting (Upstash Redis) is required in production')
    }
  } else {
    const hasRateLimit = RATE_LIMIT_VARS.every(v => process.env[v])
    if (!hasRateLimit) {
      warnings.push('Rate limiting not configured (optional in development)')
    }
  }

  // Check at least one AI provider
  const hasAIProvider = AI_PROVIDER_VARS.some(v => process.env[v])
  if (!hasAIProvider) {
    errors.push('At least one AI provider must be configured (OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_AI_API_KEY)')
  }

  // Check Sentry in production
  if (isProduction && !process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    warnings.push('Sentry DSN not configured - errors will not be tracked')
  }

  // Validate OAuth (need at least one provider)
  const hasGoogleOAuth = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  const hasSpotifyOAuth = process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
  if (!hasGoogleOAuth && !hasSpotifyOAuth) {
    errors.push('At least one OAuth provider must be configured (Google or Spotify)')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates environment and throws if invalid.
 * Use this at app startup to fail fast on misconfiguration.
 */
export function requireValidEnv(): void {
  const result = validateEnv()

  // Log warnings
  for (const warning of result.warnings) {
    console.warn(`[Env] Warning: ${warning}`)
  }

  // Throw on errors
  if (!result.valid) {
    const errorMessage = [
      'Environment validation failed:',
      ...result.errors.map(e => `  - ${e}`),
    ].join('\n')

    console.error(errorMessage)

    // In production, throw to prevent startup
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMessage)
    }
  }
}

/**
 * Get a summary of configured services for logging.
 */
export function getEnvSummary(): Record<string, boolean> {
  return {
    supabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
    stripe: !!process.env.STRIPE_SECRET_KEY,
    rateLimit: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    sentry: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    gemini: !!process.env.GOOGLE_AI_API_KEY,
    googleOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    spotifyOAuth: !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
  }
}
