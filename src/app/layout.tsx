import type { Metadata } from 'next'
import '@/styles/globals.css'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'YTDJ.AI - AI-Powered DJ Set Creator',
  description: 'Create perfect DJ sets with AI-powered music curation and intelligent transitions',
  keywords: ['DJ', 'AI', 'music', 'playlist', 'YouTube Music', 'transitions', 'mixing'],
  authors: [{ name: 'YTDJ.AI' }],
  openGraph: {
    title: 'YTDJ.AI - AI-Powered DJ Set Creator',
    description: 'Create perfect DJ sets with AI-powered music curation',
    type: 'website'
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
