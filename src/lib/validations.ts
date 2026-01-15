import { z } from 'zod'

// AI Provider enum
export const aiProviderSchema = z.enum(['openai', 'claude', 'gemini'])

// Track schema for swap requests
export const trackSchema = z.object({
  id: z.string().optional(),
  youtubeId: z.string().optional(),
  title: z.string().min(1).max(500),
  artist: z.string().min(1).max(500),
  duration: z.number().min(0).max(36000).optional(), // max 10 hours
  key: z.string().max(20).optional(),
  genre: z.string().max(100).optional(),
  energy: z.number().min(1).max(100).optional(),
  thumbnail: z.string().url().optional(),
  aiReasoning: z.string().max(2000).optional(),
})

// Energy range constraint
export const energyRangeSchema = z.object({
  min: z.number().min(1).max(100),
  max: z.number().min(1).max(100),
}).refine(data => data.min <= data.max, {
  message: 'min must be less than or equal to max',
})

// Weighted phrase for multi-phrase blending
export const weightedPhraseSchema = z.object({
  text: z.string().min(1).max(200),
  weight: z.number().min(0).max(1),
})

// AI Constraints schema
export const aiConstraintsSchema = z.object({
  energyTolerance: z.number().min(1).max(20).optional(),
  novelty: z.number().min(0).max(100).optional(),
  artistDiversity: z.number().min(0).max(100).optional(),
  genreDiversity: z.number().min(0).max(100).optional(),
  decadeSpread: z.number().min(0).max(100).optional(),
  avoidArtists: z.array(z.string().max(200)).max(100).optional(),
  avoidGenres: z.array(z.string().max(100)).max(50).optional(),
  avoidExplicit: z.boolean().optional(),
  trackCount: z.number().int().min(1).max(50).optional(),
  transitionQualityThreshold: z.number().min(0).max(100).optional(),
  moods: z.array(z.string().max(50)).max(10).optional(),
  excludeArtists: z.array(z.string().max(200)).max(100).optional(),
  energyRange: energyRangeSchema.optional(),
  syncopation: z.number().min(0).max(100).optional(),
  keyMatch: z.enum(['strict', 'loose']).optional(),
  activeDecades: z.array(z.enum(['80s', '90s', '00s', '10s', '20s'])).optional(),
  discovery: z.number().min(0).max(100).optional(),
  blacklist: z.array(z.string().max(200)).max(100).optional(),
  weightedPhrases: z.array(weightedPhraseSchema).max(10).optional(),
  avoidConcepts: z.array(z.string().max(200)).max(50).optional(),
}).optional()

// Generate playlist request schema
export const generatePlaylistSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000, 'Prompt too long'),
  arcTemplate: z.string().max(500).optional(),
  duration: z.number().min(1).max(600).optional(), // max 10 hours in minutes
  trackCount: z.number().int().min(1).max(50).optional(),
  constraints: aiConstraintsSchema,
  provider: aiProviderSchema,
})

// Swap track request schema
export const swapTrackSchema = z.object({
  currentTrack: trackSchema,
  previousTrack: trackSchema.optional().nullable(),
  nextTrack: trackSchema.optional().nullable(),
  targetEnergy: z.number().min(1).max(100).optional(),
  constraints: aiConstraintsSchema,
  provider: aiProviderSchema.default('openai'),
  styleHint: z.string().max(500).optional(),
})

// YouTube enrichment request schema
export const youtubeEnrichSchema = z.object({
  artist: z.string().min(1, 'Artist is required').max(500),
  title: z.string().min(1, 'Title is required').max(500),
})

// YouTube search request schema
export const youtubeSearchSchema = z.object({
  q: z.string().min(1, 'Query is required').max(500),
})

// Save set request schema
export const saveSetSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1, 'Set name is required').max(200),
  data: z.any(), // The set data structure is complex, validated at runtime
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

// Type exports for use in API routes
export type GeneratePlaylistInput = z.infer<typeof generatePlaylistSchema>
export type SwapTrackInput = z.infer<typeof swapTrackSchema>
export type YouTubeEnrichInput = z.infer<typeof youtubeEnrichSchema>
export type YouTubeSearchInput = z.infer<typeof youtubeSearchSchema>
export type SaveSetInput = z.infer<typeof saveSetSchema>

/**
 * Validate request body against a Zod schema
 * Returns the parsed data or throws a formatted error response
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details: z.typeToFlattenedError<T> } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    error: 'Invalid request body',
    details: result.error.flatten() as z.typeToFlattenedError<T>,
  }
}
