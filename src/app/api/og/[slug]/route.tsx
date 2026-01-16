import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { getCoverTemplate, COVER_TEMPLATES } from '@/lib/cover-templates'
import type { CoverTemplateId, CoverColors, PlaylistNode } from '@/types'

export const runtime = 'edge'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params

    if (!slug) {
      return new Response('Slug is required', { status: 400 })
    }

    const supabase = getServerSupabase()

    // Fetch the mixtape
    const { data: mixtapeData, error } = await supabase
      .from('dj_sets')
      .select('*')
      .eq('share_slug', slug)
      .single()

    if (error || !mixtapeData) {
      // Return a default OG image for not found
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0a0a0a',
              color: '#fff',
              fontSize: 48,
              fontWeight: 'bold',
            }}
          >
            YTDJ.AI - Mixtape Not Found
          </div>
        ),
        { width: 1200, height: 630 }
      )
    }

    const title = mixtapeData.title || mixtapeData.name || 'Untitled Mix'
    const subtitle = mixtapeData.subtitle || ''
    const templateId = (mixtapeData.cover_template as CoverTemplateId) || 'neon-gradient'
    const colors: CoverColors = mixtapeData.cover_colors || {
      primary: '#00f2ff',
      secondary: '#7000ff',
      accent: '#ff00e5',
    }

    // Calculate stats
    const setData = mixtapeData.data || {}
    const playlist: PlaylistNode[] = setData?.playlist || []
    const totalDuration = playlist.reduce((sum, node) => sum + (node.track?.duration || 0), 0)
    const minutes = Math.floor(totalDuration / 60)
    const trackCount = playlist.length

    // Get template for background style
    const template = getCoverTemplate(templateId)

    // Render the OG image
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background based on template */}
          {renderBackground(templateId, colors)}

          {/* Content overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: 60,
            }}
          >
            {/* Top section with logo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 40,
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 'bold',
                  color: '#fff',
                  opacity: 0.9,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span style={{ marginRight: 10 }}>🎵</span>
                YTDJ.AI
              </div>
            </div>

            {/* Main content area */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              {/* Title */}
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 'bold',
                  color: '#fff',
                  lineHeight: 1.1,
                  marginBottom: 20,
                  textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  maxWidth: '90%',
                }}
              >
                {title}
              </div>

              {/* Subtitle */}
              {subtitle && (
                <div
                  style={{
                    fontSize: 32,
                    color: 'rgba(255,255,255,0.8)',
                    marginBottom: 30,
                    maxWidth: '80%',
                    display: 'flex',
                    flexWrap: 'wrap',
                  }}
                >
                  {subtitle}
                </div>
              )}

              {/* Stats row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 30,
                  fontSize: 24,
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 8 }}>🎵</span>
                  {trackCount} tracks
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 8 }}>⏱️</span>
                  {minutes} min
                </div>
                {mixtapeData.view_count > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: 8 }}>👁️</span>
                    {formatCount(mixtapeData.view_count)} views
                  </div>
                )}
              </div>
            </div>

            {/* Bottom accent line */}
            <div
              style={{
                width: '100%',
                height: 6,
                background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.accent})`,
                borderRadius: 3,
              }}
            />
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('[OG Image] Error:', error)
    return new Response('Error generating image', { status: 500 })
  }
}

function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

function renderBackground(templateId: CoverTemplateId, colors: CoverColors) {
  const { primary, secondary, accent } = colors

  switch (templateId) {
    case 'neon-gradient':
      return (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${primary}40 0%, #0a0a0a 50%, ${secondary}40 100%)`,
            display: 'flex',
          }}
        >
          {/* Glow orbs */}
          <div
            style={{
              position: 'absolute',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${primary}60, transparent 70%)`,
              top: -100,
              right: -50,
              filter: 'blur(60px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${secondary}60, transparent 70%)`,
              bottom: -50,
              left: 100,
              filter: 'blur(50px)',
            }}
          />
        </div>
      )

    case 'sunset-gradient':
      return (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(180deg, ${primary} 0%, ${secondary} 50%, ${accent} 100%)`,
            display: 'flex',
          }}
        />
      )

    case 'dark-abstract':
      return (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#0a0a0a',
            display: 'flex',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 600,
              height: 600,
              borderRadius: '50%',
              background: `${primary}30`,
              top: -200,
              left: -200,
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: `${secondary}30`,
              bottom: -100,
              right: -100,
            }}
          />
        </div>
      )

    case 'holographic':
      return (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(45deg, ${primary}80, ${secondary}80, ${accent}80, ${primary}80)`,
            display: 'flex',
          }}
        />
      )

    case 'geometric-bold':
      return (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: primary,
            display: 'flex',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              borderLeft: '400px solid transparent',
              borderRight: '400px solid transparent',
              borderBottom: `600px solid ${secondary}`,
              right: 0,
              bottom: 0,
            }}
          />
        </div>
      )

    case 'minimal-wave':
      return (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#fafafa',
            display: 'flex',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 200,
              background: `linear-gradient(90deg, ${primary}40, ${secondary}40)`,
            }}
          />
        </div>
      )

    case 'vintage-cassette':
      return (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(180deg, ${primary}90, ${secondary}90)`,
            display: 'flex',
          }}
        >
          {/* Noise texture effect via gradient */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.1)',
            }}
          />
        </div>
      )

    case 'glitch-digital':
      return (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#0a0a0a',
            display: 'flex',
          }}
        >
          {/* Glitch lines */}
          <div
            style={{
              position: 'absolute',
              top: 100,
              left: 0,
              width: '100%',
              height: 4,
              background: primary,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 250,
              left: 0,
              width: '60%',
              height: 2,
              background: secondary,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 150,
              right: 0,
              width: '40%',
              height: 3,
              background: accent,
            }}
          />
        </div>
      )

    case 'circuit-tech':
      return (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#0d1117',
            display: 'flex',
          }}
        >
          {/* Circuit-like grid lines */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 100,
              width: 2,
              height: '100%',
              background: `${primary}30`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 300,
              width: 2,
              height: '100%',
              background: `${primary}30`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 200,
              left: 0,
              width: '100%',
              height: 2,
              background: `${secondary}30`,
            }}
          />
        </div>
      )

    case 'vinyl-classic':
      return (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#1a1a1a',
            display: 'flex',
          }}
        >
          {/* Vinyl circle */}
          <div
            style={{
              position: 'absolute',
              width: 500,
              height: 500,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${primary}20 0%, #000 50%, ${secondary}20 100%)`,
              right: -150,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
        </div>
      )

    case 'nature-organic':
      return (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(180deg, ${primary}40, ${secondary}60)`,
            display: 'flex',
          }}
        />
      )

    case 'paper-texture':
      return (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#f5f5dc',
            display: 'flex',
          }}
        >
          {/* Accent strip */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,
              background: `linear-gradient(90deg, ${primary}, ${secondary})`,
            }}
          />
        </div>
      )

    default:
      return (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(135deg, ${primary}40 0%, #0a0a0a 50%, ${secondary}40 100%)`,
            display: 'flex',
          }}
        />
      )
  }
}
