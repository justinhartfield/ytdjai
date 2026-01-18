const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'is1-ssl.mzstatic.com',
        pathname: '/**',
      },
    ],
  },
  // NOTE: Server-side API routes read from process.env directly at runtime
  // Only include env vars here that need to be available at build time
  // or passed to client-side code (use NEXT_PUBLIC_ prefix for client-side)
  env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  },
  // Enable experimental features for better Netlify compatibility
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppress source map upload logs in CI
  silent: true,

  // Upload source maps to Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Hide source maps from being served to the browser
  hideSourceMaps: true,

  // Disable Sentry telemetry
  disableLogger: true,

  // Automatically instrument API routes
  autoInstrumentServerFunctions: true,

  // Tunnel Sentry events through the app to avoid ad blockers
  tunnelRoute: '/monitoring',
}

// Only wrap with Sentry if DSN is configured
module.exports = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig
