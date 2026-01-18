import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase'
import { canSaveToCloud } from '@/lib/subscription'
import { checkCSRF } from '@/lib/csrf'

export async function POST(req: NextRequest) {
  try {
    // CSRF protection
    const csrfError = checkCSRF(req)
    if (csrfError) return csrfError

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { setData } = body

    if (!setData || !setData.id || !setData.name) {
      return NextResponse.json(
        { error: 'Invalid set data' },
        { status: 400 }
      )
    }

    const supabase = getServerSupabase()
    const userEmail = session.user.email

    // Check if set already exists (upsert behavior)
    const { data: existingSet } = await supabase
      .from('dj_sets')
      .select('id')
      .eq('user_email', userEmail)
      .eq('set_id', setData.id)
      .single()

    // For new sets, check cloud save limit
    if (!existingSet) {
      const canSave = await canSaveToCloud(userEmail)
      if (!canSave.allowed) {
        return NextResponse.json(
          {
            error: canSave.reason || 'Cloud save limit reached',
            code: 'save_limit_reached'
          },
          { status: 402 }
        )
      }
    }

    let result

    if (existingSet) {
      // Update existing set
      result = await supabase
        .from('dj_sets')
        .update({
          name: setData.name,
          data: setData,
          updated_at: new Date().toISOString()
        })
        .eq('user_email', userEmail)
        .eq('set_id', setData.id)
        .select()
        .single()
    } else {
      // Insert new set
      result = await supabase
        .from('dj_sets')
        .insert({
          user_email: userEmail,
          set_id: setData.id,
          name: setData.name,
          data: setData
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('Supabase error:', result.error)
      return NextResponse.json(
        { error: 'Failed to save set', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      set: result.data
    })
  } catch (error) {
    console.error('Save set error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
