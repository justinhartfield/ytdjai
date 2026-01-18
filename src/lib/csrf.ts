/**
 * CSRF Protection Utility
 *
 * Validates request origin to prevent Cross-Site Request Forgery attacks.
 * Should be called at the start of all POST/PUT/DELETE API routes that modify data.
 */

// Allowed origins for CSRF validation
const ALLOWED_ORIGINS = [
  process.env.NEXTAUTH_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
  'https://ytdj.ai',
  'https://www.ytdj.ai',
].filter(Boolean) as string[]

// Also allow localhost in development
if (process.env.NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push(
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000'
  )
}

export interface CSRFValidationResult {
  valid: boolean
  reason?: string
}

/**
 * Validates the request origin against allowed origins.
 *
 * @param request - The incoming request
 * @returns Validation result with valid flag and optional reason
 */
export function validateOrigin(request: Request): CSRFValidationResult {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // For same-origin requests, browsers may not send Origin header
  // In this case, we check the Referer header
  if (!origin) {
    // If no origin, check referer
    if (referer) {
      try {
        const refererUrl = new URL(referer)
        const refererOrigin = refererUrl.origin
        if (ALLOWED_ORIGINS.some(allowed => allowed && refererOrigin === new URL(allowed).origin)) {
          return { valid: true }
        }
      } catch {
        // Invalid referer URL
      }
    }

    // Allow requests without origin/referer in development only
    // (This can happen with tools like curl, Postman, etc.)
    if (process.env.NODE_ENV === 'development') {
      return { valid: true }
    }

    // In production, missing origin is suspicious for POST requests
    return {
      valid: false,
      reason: 'Missing origin header'
    }
  }

  // Validate origin against allowed list
  const isAllowed = ALLOWED_ORIGINS.some(allowed => {
    if (!allowed) return false
    try {
      return origin === new URL(allowed).origin
    } catch {
      return origin === allowed
    }
  })

  if (!isAllowed) {
    console.warn(`[CSRF] Blocked request from unauthorized origin: ${origin}`)
    return {
      valid: false,
      reason: `Origin not allowed: ${origin}`
    }
  }

  return { valid: true }
}

/**
 * Middleware function to check CSRF for API routes.
 * Returns a NextResponse if validation fails, or null if valid.
 *
 * Usage:
 * ```
 * const csrfError = checkCSRF(request)
 * if (csrfError) return csrfError
 * ```
 */
export function checkCSRF(request: Request): Response | null {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  const method = request.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return null
  }

  const validation = validateOrigin(request)

  if (!validation.valid) {
    return new Response(
      JSON.stringify({
        error: 'CSRF validation failed',
        code: 'csrf_error',
        details: validation.reason
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  return null
}

/**
 * List of paths that should skip CSRF validation.
 * Typically webhooks from external services.
 */
const CSRF_EXEMPT_PATHS = [
  '/api/stripe/webhook', // Stripe webhook has its own signature verification
  '/api/auth',           // NextAuth handles its own CSRF
]

/**
 * Check if a path should skip CSRF validation.
 */
export function isCSRFExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some(exempt => pathname.startsWith(exempt))
}
