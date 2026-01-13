import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase'

// GET /api/sets/[id] - Load a specific set
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const setId = params.id

    // Fetch the specific set
    const { data: set, error } = await supabase
      .from('dj_sets')
      .select('*')
      .eq('user_email', userEmail)
      .eq('set_id', setId)
      .single()

    if (error || !set) {
      return NextResponse.json(
        { error: 'Set not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      set: set.data
    })
  } catch (error) {
    console.error('Load set error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/sets/[id] - Delete a specific set
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const setId = params.id

    // Delete the set
    const { error } = await supabase
      .from('dj_sets')
      .delete()
      .eq('user_email', userEmail)
      .eq('set_id', setId)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to delete set', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Set deleted successfully'
    })
  } catch (error) {
    console.error('Delete set error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
