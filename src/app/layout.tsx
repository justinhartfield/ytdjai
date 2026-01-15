import type { Metadata, Viewport } from 'next'
import { Syne } from 'next/font/google'
import '@/styles/globals.css'
import { Providers } from '@/components/Providers'
import { HomePageStructuredData } from '@/components/StructuredData'

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-syne',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://ytdj.ai'),
  title: 'YTDJ.AI - AI-Powered DJ Set Creator',
  description: 'Create perfect DJ sets with AI-powered music curation and intelligent transitions. Generate playlists in seconds with smooth energy flows.',
  keywords: ['DJ', 'AI', 'music', 'playlist', 'YouTube Music', 'transitions', 'mixing', 'DJ set creator', 'music curation', 'AI playlist generator'],
  authors: [{ name: 'YTDJ.AI' }],
  creator: 'YTDJ.AI',
  publisher: 'YTDJ.AI',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'YTDJ.AI'
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'YTDJ.AI - AI-Powered DJ Set Creator',
    description: 'Create perfect DJ sets with AI-powered music curation and intelligent transitions',
    type: 'website',
    url: 'https://ytdj.ai',
    siteName: 'YTDJ.AI',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'YTDJ.AI - AI-Powered DJ Set Creator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YTDJ.AI - AI-Powered DJ Set Creator',
    description: 'Create perfect DJ sets with AI-powered music curation and intelligent transitions',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'screen-orientation': 'landscape',
    'x5-orientation': 'landscape'
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
    <html lang="en" className={`dark ${syne.variable}`}>
      <head>
        <HomePageStructuredData />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
