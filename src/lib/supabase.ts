import { createClient } from '@supabase/supabase-js'

// Lazy initialization to avoid build-time errors when env vars aren't set
let _supabaseClient: ReturnType<typeof createClient> | null = null

// Client for browser/client-side operations
export const getSupabase = () => {
  if (!_supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL and Anon Key must be configured')
    }

    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }
  return _supabaseClient
}

// Backward compatibility export
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    return getSupabase()[prop as keyof ReturnType<typeof createClient>]
  }
})

// Server client with service role for API routes
export const getServerSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase URL and Service Role Key must be configured')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Types for database
export interface DbDjSet {
  id: string
  user_email: string
  set_id: string
  name: string
  data: any // The full Set object
  created_at: string
  updated_at: string
  // Mixtape fields (nullable for non-published sets)
  share_slug?: string | null
  is_public?: boolean
  cover_template?: string | null
  cover_colors?: { primary: string; secondary: string; accent: string } | null
  title?: string | null
  subtitle?: string | null
  description?: string | null
  tags?: string[] | null
  view_count?: number
  like_count?: number
  youtube_playlist_id?: string | null
  spotify_playlist_id?: string | null
  published_at?: string | null
}
