import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase'
import { generateShareSlug } from '@/lib/cover-templates'
import { checkCSRF } from '@/lib/csrf'
import type { PublishMixtapeRequest, PublicMixtape, PlaylistNode } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    const csrfError = checkCSRF(request)
    if (csrfError) return csrfError

    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body: PublishMixtapeRequest = await request.json()
    const {
      setId,
      title,
      subtitle,
      description,
      coverTemplate,
      coverColors,
      tags,
      isPublic,
      youtubePlaylistId,
      spotifyPlaylistId,
    } = body

    if (!setId || !title) {
      return NextResponse.json({ error: 'setId and title are required' }, { status: 400 })
    }

    const supabase = getServerSupabase()

    // Fetch the existing set
    const { data: existingSet, error: fetchError } = await supabase
      .from('dj_sets')
      .select('*')
      .eq('set_id', setId)
      .eq('user_email', session.user.email)
      .single()

    if (fetchError || !existingSet) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 })
    }

    // Generate a unique share slug
    let shareSlug = existingSet.share_slug
    if (!shareSlug) {
      shareSlug = generateShareSlug(title)

      // Ensure uniqueness
      let attempts = 0
      while (attempts < 5) {
        const { data: existing } = await supabase
          .from('dj_sets')
          .select('share_slug')
          .eq('share_slug', shareSlug)
          .single()

        if (!existing) break

        // Regenerate with new suffix
        shareSlug = generateShareSlug(title)
        attempts++
      }
    }

    // Update the set with mixtape metadata
    const { error: updateError } = await supabase
      .from('dj_sets')
      .update({
        share_slug: shareSlug,
        is_public: isPublic,
        cover_template: coverTemplate,
        cover_colors: coverColors,
        title: title,
        subtitle: subtitle,
        description: description,
        tags: tags,
        youtube_playlist_id: youtubePlaylistId || existingSet.youtube_playlist_id,
        spotify_playlist_id: spotifyPlaylistId || existingSet.spotify_playlist_id,
        published_at: isPublic ? new Date().toISOString() : existingSet.published_at,
        updated_at: new Date().toISOString(),
      })
      .eq('set_id', setId)
      .eq('user_email', session.user.email)

    if (updateError) {
      console.error('[PublishMixtape] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to publish mixtape' }, { status: 500 })
    }

    // Calculate stats from set data
    const setData = existingSet.data
    const playlist: PlaylistNode[] = setData?.playlist || []
    const totalDuration = playlist.reduce((sum, node) => sum + (node.track?.duration || 0), 0)
    const energies = playlist.map(node => node.track?.energy || 50).filter(e => e > 0)
    const energyRange = {
      min: energies.length > 0 ? Math.min(...energies) : 0,
      max: energies.length > 0 ? Math.max(...energies) : 100,
    }

    const response: Partial<PublicMixtape> = {
      shareSlug,
      isPublic,
      coverTemplate,
      coverColors,
      title,
      subtitle,
      description,
      tags,
      viewCount: existingSet.view_count || 0,
      likeCount: existingSet.like_count || 0,
      publishedAt: isPublic ? new Date() : undefined,
      youtubePlaylistId: youtubePlaylistId || existingSet.youtube_playlist_id,
      spotifyPlaylistId: spotifyPlaylistId || existingSet.spotify_playlist_id,
      setId,
      authorEmail: session.user.email,
      authorName: session.user.name || undefined,
      totalDuration,
      trackCount: playlist.length,
      energyRange,
    }

    return NextResponse.json({
      success: true,
      shareUrl: `/share/${shareSlug}`,
      mixtape: response,
    })
  } catch (error) {
    console.error('[PublishMixtape] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
