import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import type { PublicMixtape, PlaylistNode, CoverTemplateId } from '@/types'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    const supabase = getServerSupabase()

    // Fetch the mixtape by share_slug
    const { data: mixtapeData, error: fetchError } = await supabase
      .from('dj_sets')
      .select('*')
      .eq('share_slug', slug)
      .single()

    if (fetchError || !mixtapeData) {
      return NextResponse.json({ error: 'Mixtape not found' }, { status: 404 })
    }

    // If not public, only allow owner to view (check session if needed)
    // For now, we allow viewing any mixtape with a share slug

    // Increment view count (fire and forget)
    supabase
      .from('dj_sets')
      .update({ view_count: (mixtapeData.view_count || 0) + 1 })
      .eq('share_slug', slug)
      .then(() => {})

    // Parse set data
    const setData = mixtapeData.data || {}
    const playlist: PlaylistNode[] = setData?.playlist || []

    // Calculate stats
    const totalDuration = playlist.reduce((sum, node) => sum + (node.track?.duration || 0), 0)
    const energies = playlist.map(node => node.track?.energy || 50).filter(e => e > 0)
    const bpms = playlist.map(node => node.track?.bpm).filter((bpm): bpm is number => bpm !== undefined && bpm > 0)

    const energyRange = {
      min: energies.length > 0 ? Math.min(...energies) : 0,
      max: energies.length > 0 ? Math.max(...energies) : 100,
    }

    const bpmRange = bpms.length > 0
      ? { min: Math.min(...bpms), max: Math.max(...bpms) }
      : undefined

    const response: PublicMixtape = {
      id: mixtapeData.id,
      setId: mixtapeData.set_id,
      shareSlug: mixtapeData.share_slug!,
      isPublic: mixtapeData.is_public || false,
      coverTemplate: (mixtapeData.cover_template as CoverTemplateId) || 'neon-gradient',
      coverColors: mixtapeData.cover_colors || {
        primary: '#00f2ff',
        secondary: '#7000ff',
        accent: '#ff00e5',
      },
      title: mixtapeData.title || mixtapeData.name || 'Untitled Mix',
      subtitle: mixtapeData.subtitle || '',
      description: mixtapeData.description || '',
      tags: mixtapeData.tags || [],
      viewCount: (mixtapeData.view_count || 0) + 1, // Include current view
      likeCount: mixtapeData.like_count || 0,
      publishedAt: mixtapeData.published_at ? new Date(mixtapeData.published_at) : undefined,
      youtubePlaylistId: mixtapeData.youtube_playlist_id || undefined,
      spotifyPlaylistId: mixtapeData.spotify_playlist_id || undefined,
      authorEmail: mixtapeData.user_email,
      // Don't expose full email publicly
      authorName: mixtapeData.user_email.split('@')[0],
      playlist,
      prompt: setData.prompt || undefined,
      arcTemplate: setData.arcTemplate || undefined,
      totalDuration,
      trackCount: playlist.length,
      energyRange,
      bpmRange,
      createdAt: new Date(mixtapeData.created_at),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[GetMixtape] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
