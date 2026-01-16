import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, action } = body // action: 'like' | 'unlike'

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    const supabase = getServerSupabase()

    // Get current like count
    const { data: mixtape, error: fetchError } = await supabase
      .from('dj_sets')
      .select('like_count')
      .eq('share_slug', slug)
      .single()

    if (fetchError || !mixtape) {
      return NextResponse.json({ error: 'Mixtape not found' }, { status: 404 })
    }

    const currentLikes = mixtape.like_count || 0
    const newLikes = action === 'unlike'
      ? Math.max(0, currentLikes - 1)
      : currentLikes + 1

    // Update like count
    const { error: updateError } = await supabase
      .from('dj_sets')
      .update({ like_count: newLikes })
      .eq('share_slug', slug)

    if (updateError) {
      console.error('[Like] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update like' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      likeCount: newLikes,
    })
  } catch (error) {
    console.error('[Like] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
