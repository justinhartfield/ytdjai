import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  checks: {
    database: 'ok' | 'error'
    redis: 'ok' | 'error' | 'not_configured'
    ai_providers: {
      openai: 'configured' | 'not_configured'
      anthropic: 'configured' | 'not_configured'
      google: 'configured' | 'not_configured'
    }
  }
  latency?: {
    database_ms: number
  }
  error?: string
}

async function checkDatabase(): Promise<{ ok: boolean; latency: number }> {
  const start = Date.now()
  try {
    const supabase = getServerSupabase()
    const { error } = await supabase.from('user_subscriptions').select('user_email').limit(1)
    const latency = Date.now() - start
    return { ok: !error, latency }
  } catch {
    return { ok: false, latency: Date.now() - start }
  }
}

async function checkRedis(): Promise<'ok' | 'error' | 'not_configured'> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return 'not_configured'
  }

  try {
    // Simple ping using Upstash REST API
    const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      },
    })
    return response.ok ? 'ok' : 'error'
  } catch {
    return 'error'
  }
}

export async function GET() {
  const [dbResult, redisStatus] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ])

  const aiProviders = {
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
    anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not_configured',
    google: process.env.GOOGLE_AI_API_KEY ? 'configured' : 'not_configured',
  } as const

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  if (!dbResult.ok) {
    status = 'unhealthy'
  } else if (redisStatus === 'error') {
    status = 'degraded'
  }

  const health: HealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: dbResult.ok ? 'ok' : 'error',
      redis: redisStatus,
      ai_providers: aiProviders,
    },
    latency: {
      database_ms: dbResult.latency,
    },
  }

  return NextResponse.json(health, {
    status: status === 'unhealthy' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
