import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getServerSupabase()
    const userEmail = session.user.email

    // Fetch all sets for the user, ordered by most recently updated
    const { data: sets, error } = await supabase
      .from('dj_sets')
      .select('*')
      .eq('user_email', userEmail)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sets', details: error },
        { status: 500 }
      )
    }

    // Return sets with metadata
    const setsWithMetadata = sets.map(set => ({
      id: set.set_id,
      dbId: set.id,
      name: set.name,
      trackCount: set.data?.playlist?.length || 0,
      arcTemplate: set.data?.arcTemplate,
      createdAt: set.created_at,
      updatedAt: set.updated_at,
      isExported: set.data?.isExported || false,
      youtubePlaylistId: set.data?.youtubePlaylistId
    }))

    return NextResponse.json({
      success: true,
      sets: setsWithMetadata
    })
  } catch (error) {
    console.error('List sets error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
