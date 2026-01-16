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
      // Persist the OAuth access_token to the token right after signin
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
