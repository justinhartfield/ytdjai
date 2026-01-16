import type { Metadata } from 'next'
import { getServerSupabase } from '@/lib/supabase'
import type { CoverColors, PlaylistNode } from '@/types'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id: slug } = await params

  try {
    const supabase = getServerSupabase()

    const { data: mixtapeData, error } = await supabase
      .from('dj_sets')
      .select('title, subtitle, description, share_slug, cover_template, cover_colors, data, view_count')
      .eq('share_slug', slug)
      .single()

    if (error || !mixtapeData) {
      return {
        title: 'Mixtape Not Found | YTDJ.AI',
        description: 'This mixtape could not be found.',
      }
    }

    const title = mixtapeData.title || 'Untitled Mix'
    const subtitle = mixtapeData.subtitle || ''
    const description = mixtapeData.description || subtitle || `A curated mixtape created with YTDJ.AI`

    const setData = mixtapeData.data || {}
    const playlist: PlaylistNode[] = setData?.playlist || []
    const trackCount = playlist.length
    const totalDuration = playlist.reduce((sum, node) => sum + (node.track?.duration || 0), 0)
    const minutes = Math.floor(totalDuration / 60)

    const ogImageUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ytdj.ai'}/api/og/${slug}`
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ytdj.ai'}/share/${slug}`

    return {
      title: `${title} | YTDJ.AI Mixtape`,
      description: description.slice(0, 160),
      keywords: ['mixtape', 'playlist', 'music', 'dj set', 'YTDJ.AI'],
      authors: [{ name: 'YTDJ.AI' }],
      openGraph: {
        type: 'music.playlist',
        title: `${title} - YTDJ.AI Mixtape`,
        description: subtitle || description.slice(0, 160),
        url: shareUrl,
        siteName: 'YTDJ.AI',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `${title} - Mixtape Cover`,
          },
        ],
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} - YTDJ.AI Mixtape`,
        description: subtitle || description.slice(0, 160),
        images: [ogImageUrl],
        creator: '@ytdjai',
      },
      other: {
        'music:song_count': String(trackCount),
        'music:duration': String(totalDuration),
      },
      alternates: {
        canonical: shareUrl,
      },
    }
  } catch (error) {
    console.error('[ShareLayout] Metadata error:', error)
    return {
      title: 'Mixtape | YTDJ.AI',
      description: 'AI-powered DJ mixtape creator',
    }
  }
}

export default function ShareLayout({ children }: LayoutProps) {
  return children
}
