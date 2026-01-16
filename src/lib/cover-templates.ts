/**
 * Cover Art Templates for Mixtapes
 *
 * Each template defines:
 * - Visual style (SVG-based rendering)
 * - Default colors that work well together
 * - Text positioning for title overlay
 */

import type { CoverTemplateId, CoverColors } from '@/types'

export interface CoverTemplate {
  id: CoverTemplateId
  name: string
  description: string
  style: 'dark' | 'light' | 'vibrant'
  defaultColors: CoverColors
  // SVG viewBox and content will be rendered by CoverPreview component
  // These are hints for the component
  hasGlow: boolean
  hasPattern: boolean
  textPosition: 'center' | 'bottom-left' | 'top-left'
  textColor: 'light' | 'dark' | 'gradient'
}

export const COVER_TEMPLATES: Record<CoverTemplateId, CoverTemplate> = {
  'neon-gradient': {
    id: 'neon-gradient',
    name: 'Neon Gradient',
    description: 'Cyberpunk gradient mesh with glow effects',
    style: 'dark',
    defaultColors: {
      primary: '#00f2ff',   // Cyan
      secondary: '#7000ff', // Purple
      accent: '#ff00e5',    // Magenta
    },
    hasGlow: true,
    hasPattern: false,
    textPosition: 'center',
    textColor: 'light',
  },

  'vintage-cassette': {
    id: 'vintage-cassette',
    name: 'Vintage Cassette',
    description: 'Retro cassette tape aesthetic',
    style: 'light',
    defaultColors: {
      primary: '#f5e6d3',   // Cream
      secondary: '#2d2d2d', // Dark gray
      accent: '#e63946',    // Red
    },
    hasGlow: false,
    hasPattern: true,
    textPosition: 'center',
    textColor: 'dark',
  },

  'minimal-wave': {
    id: 'minimal-wave',
    name: 'Minimal Wave',
    description: 'Clean lines with waveform accent',
    style: 'dark',
    defaultColors: {
      primary: '#1a1a2e',   // Dark navy
      secondary: '#ffffff', // White
      accent: '#00d9ff',    // Bright cyan
    },
    hasGlow: false,
    hasPattern: true,
    textPosition: 'bottom-left',
    textColor: 'light',
  },

  'vinyl-classic': {
    id: 'vinyl-classic',
    name: 'Vinyl Classic',
    description: 'Vinyl record with center label',
    style: 'dark',
    defaultColors: {
      primary: '#1a1a1a',   // Black
      secondary: '#f4d03f', // Gold
      accent: '#c0392b',    // Deep red
    },
    hasGlow: false,
    hasPattern: true,
    textPosition: 'center',
    textColor: 'light',
  },

  'glitch-digital': {
    id: 'glitch-digital',
    name: 'Glitch Digital',
    description: 'Digital artifacts with RGB split',
    style: 'dark',
    defaultColors: {
      primary: '#ff0040',   // Red
      secondary: '#00ff88', // Green
      accent: '#0088ff',    // Blue
    },
    hasGlow: true,
    hasPattern: true,
    textPosition: 'center',
    textColor: 'light',
  },

  'sunset-gradient': {
    id: 'sunset-gradient',
    name: 'Sunset Gradient',
    description: 'Warm sunset color gradients',
    style: 'vibrant',
    defaultColors: {
      primary: '#ff6b6b',   // Coral
      secondary: '#feca57', // Yellow
      accent: '#5f27cd',    // Purple
    },
    hasGlow: true,
    hasPattern: false,
    textPosition: 'bottom-left',
    textColor: 'light',
  },

  'dark-abstract': {
    id: 'dark-abstract',
    name: 'Dark Abstract',
    description: 'Abstract shapes on deep background',
    style: 'dark',
    defaultColors: {
      primary: '#0a0a0f',   // Almost black
      secondary: '#2d3436', // Dark gray
      accent: '#6c5ce7',    // Purple
    },
    hasGlow: true,
    hasPattern: true,
    textPosition: 'top-left',
    textColor: 'light',
  },

  'nature-organic': {
    id: 'nature-organic',
    name: 'Nature Organic',
    description: 'Botanical and earthy tones',
    style: 'light',
    defaultColors: {
      primary: '#2d5a27',   // Forest green
      secondary: '#f4ede4', // Off-white
      accent: '#d4a373',    // Warm tan
    },
    hasGlow: false,
    hasPattern: true,
    textPosition: 'bottom-left',
    textColor: 'dark',
  },

  'geometric-bold': {
    id: 'geometric-bold',
    name: 'Geometric Bold',
    description: 'Bold geometric shapes and patterns',
    style: 'vibrant',
    defaultColors: {
      primary: '#ff4757',   // Red
      secondary: '#2f3542', // Dark slate
      accent: '#ffa502',    // Orange
    },
    hasGlow: false,
    hasPattern: true,
    textPosition: 'center',
    textColor: 'light',
  },

  'holographic': {
    id: 'holographic',
    name: 'Holographic',
    description: 'Iridescent metallic shimmer',
    style: 'vibrant',
    defaultColors: {
      primary: '#a29bfe',   // Lavender
      secondary: '#74b9ff', // Light blue
      accent: '#fd79a8',    // Pink
    },
    hasGlow: true,
    hasPattern: false,
    textPosition: 'center',
    textColor: 'dark',
  },

  'paper-texture': {
    id: 'paper-texture',
    name: 'Paper Texture',
    description: 'Indie paper texture with handwritten feel',
    style: 'light',
    defaultColors: {
      primary: '#ffeaa7',   // Cream yellow
      secondary: '#2d3436', // Dark gray
      accent: '#e17055',    // Terracotta
    },
    hasGlow: false,
    hasPattern: true,
    textPosition: 'center',
    textColor: 'dark',
  },

  'circuit-tech': {
    id: 'circuit-tech',
    name: 'Circuit Tech',
    description: 'Circuit board patterns and tech aesthetic',
    style: 'dark',
    defaultColors: {
      primary: '#0c0c0c',   // Near black
      secondary: '#00ff00', // Matrix green
      accent: '#00d4ff',    // Cyan
    },
    hasGlow: true,
    hasPattern: true,
    textPosition: 'top-left',
    textColor: 'light',
  },
}

// Get template by ID with fallback
export function getCoverTemplate(id: CoverTemplateId): CoverTemplate {
  return COVER_TEMPLATES[id] || COVER_TEMPLATES['neon-gradient']
}

// Get all templates as array
export function getAllCoverTemplates(): CoverTemplate[] {
  return Object.values(COVER_TEMPLATES)
}

// Get templates by style
export function getCoverTemplatesByStyle(style: CoverTemplate['style']): CoverTemplate[] {
  return Object.values(COVER_TEMPLATES).filter(t => t.style === style)
}

// Color presets for quick customization
export const COLOR_PRESETS: { name: string; colors: CoverColors }[] = [
  { name: 'Neon Nights', colors: { primary: '#00f2ff', secondary: '#7000ff', accent: '#ff00e5' } },
  { name: 'Sunset Vibes', colors: { primary: '#ff6b6b', secondary: '#feca57', accent: '#5f27cd' } },
  { name: 'Forest', colors: { primary: '#2d5a27', secondary: '#f4ede4', accent: '#d4a373' } },
  { name: 'Ocean', colors: { primary: '#0077b6', secondary: '#00b4d8', accent: '#90e0ef' } },
  { name: 'Fire', colors: { primary: '#e63946', secondary: '#f4a261', accent: '#ffd166' } },
  { name: 'Monochrome', colors: { primary: '#1a1a1a', secondary: '#333333', accent: '#ffffff' } },
  { name: 'Pastel', colors: { primary: '#a29bfe', secondary: '#74b9ff', accent: '#fd79a8' } },
  { name: 'Retro', colors: { primary: '#f5e6d3', secondary: '#2d2d2d', accent: '#e63946' } },
]

// Generate a slug from title
export function generateShareSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')          // Replace spaces with dashes
    .replace(/-+/g, '-')           // Collapse multiple dashes
    .slice(0, 30)                  // Max 30 chars
    .replace(/-$/, '')             // Remove trailing dash

  // Add random suffix for uniqueness
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${slug}-${suffix}`
}
