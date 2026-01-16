import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import SpotifyProvider from 'next-auth/providers/spotify'

// Extended session type to include provider info
declare module 'next-auth' {
  interface Session {
    accessToken?: string
    provider?: string
    spotifyAccessToken?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    provider?: string
    spotifyAccessToken?: string
    spotifyRefreshToken?: string
    spotifyExpiresAt?: number
  }
}

// Refresh an expired Google access token
async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string
  expires_at: number
  refresh_token?: string
} | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[Auth] Google token refresh failed:', data)
      return null
    }

    return {
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      refresh_token: data.refresh_token, // Google may return a new refresh token
    }
  } catch (error) {
    console.error('[Auth] Error refreshing Google token:', error)
    return null
  }
}

// Refresh an expired Spotify access token
async function refreshSpotifyToken(refreshToken: string): Promise<{
  access_token: string
  expires_at: number
} | null> {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[Auth] Spotify token refresh failed:', data)
      return null
    }

    return {
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    }
  } catch (error) {
    console.error('[Auth] Error refreshing Spotify token:', error)
    return null
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/youtube',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    ...(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
      ? [
          SpotifyProvider({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            authorization: {
              params: {
                scope: 'playlist-modify-public playlist-modify-private user-read-email',
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: save the tokens
      if (account) {
        if (account.provider === 'google') {
          token.accessToken = account.access_token
          token.refreshToken = account.refresh_token
          token.expiresAt = account.expires_at
          token.provider = 'google'
        } else if (account.provider === 'spotify') {
          token.spotifyAccessToken = account.access_token
          token.spotifyRefreshToken = account.refresh_token
          token.spotifyExpiresAt = account.expires_at
          token.provider = 'spotify'
        }
        return token
      }

      // Check if Google token needs refresh (5 minute buffer)
      if (token.expiresAt && token.refreshToken) {
        const shouldRefresh = Date.now() > (token.expiresAt as number - 300) * 1000
        if (shouldRefresh) {
          console.log('[Auth] Google token expired, refreshing...')
          const refreshed = await refreshGoogleToken(token.refreshToken as string)
          if (refreshed) {
            token.accessToken = refreshed.access_token
            token.expiresAt = refreshed.expires_at
            if (refreshed.refresh_token) {
              token.refreshToken = refreshed.refresh_token
            }
            console.log('[Auth] Google token refreshed successfully')
          } else {
            console.error('[Auth] Failed to refresh Google token')
          }
        }
      }

      // Check if Spotify token needs refresh (5 minute buffer)
      if (token.spotifyExpiresAt && token.spotifyRefreshToken) {
        const shouldRefresh = Date.now() > (token.spotifyExpiresAt as number - 300) * 1000
        if (shouldRefresh) {
          console.log('[Auth] Spotify token expired, refreshing...')
          const refreshed = await refreshSpotifyToken(token.spotifyRefreshToken as string)
          if (refreshed) {
            token.spotifyAccessToken = refreshed.access_token
            token.spotifyExpiresAt = refreshed.expires_at
            console.log('[Auth] Spotify token refreshed successfully')
          } else {
            console.error('[Auth] Failed to refresh Spotify token')
          }
        }
      }

      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken as string
      session.provider = token.provider as string
      session.spotifyAccessToken = token.spotifyAccessToken as string
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
