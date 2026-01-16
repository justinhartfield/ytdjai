import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import type { DiscoverResponse, MixtapeCard, CoverTemplateId, PlaylistNode } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const sort = searchParams.get('sort') || 'recent' // recent, popular, trending
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || []
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)

    const offset = (page - 1) * limit

    const supabase = getServerSupabase()

    // Build query for public mixtapes with share_slug
    let query = supabase
      .from('dj_sets')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .not('share_slug', 'is', null)

    // Search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,subtitle.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Tags filter (if tags column contains any of the specified tags)
    if (tags.length > 0) {
      query = query.overlaps('tags', tags)
    }

    // Sorting
    switch (sort) {
      case 'popular':
        query = query.order('like_count', { ascending: false })
        break
      case 'trending':
        // Trending = high views in recent time (view_count / days_old)
        // For simplicity, we'll use view_count with recency bias
        query = query
          .order('view_count', { ascending: false })
          .order('published_at', { ascending: false })
        break
      case 'recent':
      default:
        query = query.order('published_at', { ascending: false })
        break
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: mixtapes, count, error } = await query

    if (error) {
      console.error('[Discover] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch mixtapes' }, { status: 500 })
    }

    // Transform to MixtapeCard format
    const cards: MixtapeCard[] = (mixtapes || []).map(m => {
      const setData = m.data || {}
      const playlist: PlaylistNode[] = setData?.playlist || []
      const totalDuration = playlist.reduce((sum: number, node: PlaylistNode) => sum + (node.track?.duration || 0), 0)

      return {
        shareSlug: m.share_slug!,
        title: m.title || m.name || 'Untitled Mix',
        subtitle: m.subtitle || '',
        coverTemplate: (m.cover_template as CoverTemplateId) || 'neon-gradient',
        coverColors: m.cover_colors || {
          primary: '#00f2ff',
          secondary: '#7000ff',
          accent: '#ff00e5',
        },
        authorName: m.user_email?.split('@')[0] || 'Anonymous',
        trackCount: playlist.length,
        totalDuration,
        viewCount: m.view_count || 0,
        likeCount: m.like_count || 0,
        tags: m.tags || [],
        publishedAt: new Date(m.published_at || m.created_at),
      }
    })

    const response: DiscoverResponse = {
      mixtapes: cards,
      total: count || 0,
      page,
      hasMore: (count || 0) > offset + limit,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Discover] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
