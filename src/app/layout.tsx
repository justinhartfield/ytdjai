import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'YTDJ.AI - AI-Powered DJ Set Creator',
  description: 'Create perfect DJ sets with AI-powered music curation and intelligent transitions',
  keywords: ['DJ', 'AI', 'music', 'playlist', 'YouTube Music', 'transitions', 'mixing'],
  authors: [{ name: 'YTDJ.AI' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'YTDJ.AI'
  },
  openGraph: {
    title: 'YTDJ.AI - AI-Powered DJ Set Creator',
    description: 'Create perfect DJ sets with AI-powered music curation',
    type: 'website'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#00f2ff'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* PWA Meta Tags */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Orientation lock to landscape */}
        <meta name="screen-orientation" content="landscape" />
        <meta name="x5-orientation" content="landscape" />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
