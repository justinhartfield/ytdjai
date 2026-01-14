# Parallel AI Generation with Progressive Loading

## Deep Analysis: Is This a Good Idea?

### The Problem
Currently, if the selected AI provider fails (network timeout, rate limit, bad response), the user sees an error and must retry. On Netlify, there's a ~26s timeout constraint making this worse.

### The Proposed Solution
Launch generation requests to all 3 AI providers (OpenAI, Claude, Gemini) simultaneously, show ghost/skeleton tracks immediately in the IDE, and populate tracks as results arrive. **Keep all results** - don't cancel remaining providers.

### Pros
1. **Dramatically improved reliability** - If any 1 of 3 providers succeeds, user gets results
2. **Faster perceived performance** - User sees IDE immediately with loading state
3. **3x the variety** - Each AI has different taste, user gets alternative suggestions
4. **No wasted API cost** - Canceling mid-generation saves almost nothing (billed per token generated)
5. **Graceful degradation** - Partial results still useful

### Cons & Mitigations
1. **3x API cost** - Acceptable tradeoff for reliability + variety
2. **Complexity** - Clean abstraction with streaming/SSE pattern
3. **UI for alternatives** - Need to surface alternate suggestions elegantly

### Verdict: YES - "Parallel Enrichment" Mode
Don't cancel remaining providers. First result becomes primary playlist, later results become **alternative track suggestions** users can swap in. Same cost, 3x the value.

---

## Implementation Plan

### Phase 1: Backend - SSE Streaming Endpoint

**File: `/src/app/api/ai/generate-stream/route.ts`** (NEW)

Create a Server-Sent Events endpoint that:
1. Accepts same parameters as current generate endpoint
2. Immediately sends `{ event: 'started', providers: ['openai', 'claude', 'gemini'] }`
3. Fires all 3 provider requests in parallel
4. As each provider responds, streams: `{ event: 'provider-result', provider: 'openai', tracks: [...] }`
5. First success also sends: `{ event: 'primary-result', provider: 'openai', tracks: [...] }`
6. Later results send: `{ event: 'alternative-result', provider: 'claude', tracks: [...] }`
7. Handles YouTube enrichment progressively per track
8. Sends `{ event: 'track-enriched', index: 0, track: {...} }` as each track gets YouTube data
9. Ends with `{ event: 'complete' }` or `{ event: 'all-failed', errors: [...] }`

### Phase 2: Types - Alternative Tracks

**File: `/src/types/index.ts`** (MODIFY)

Add types for alternative suggestions:
```typescript
export interface AlternativeTrack {
  provider: AIProvider
  track: Track
  forIndex: number // which position this is an alternative for
}

export interface GenerationResult {
  primaryPlaylist: Track[]
  primaryProvider: AIProvider
  alternatives: Map<number, AlternativeTrack[]> // index -> alternatives from other AIs
}
```

### Phase 3: Client - Streaming Service

**File: `/src/lib/ai-stream-service.ts`** (NEW)

Create client-side EventSource handler:
```typescript
export function streamGeneratePlaylist(
  params: GeneratePlaylistRequest,
  callbacks: {
    onStarted: () => void
    onPrimaryResult: (provider: AIProvider, tracks: Track[]) => void
    onAlternativeResult: (provider: AIProvider, tracks: Track[]) => void
    onTrackEnriched: (provider: AIProvider, index: number, track: Track) => void
    onComplete: () => void
    onError: (error: string) => void
  }
): () => void // returns cleanup function
```

### Phase 4: Store - Loading State + Alternatives

**File: `/src/store/index.ts`** (MODIFY)

Add new state for progressive loading and alternatives:
```typescript
interface GenerationProgress {
  isGenerating: boolean
  activeProviders: AIProvider[]
  completedProviders: AIProvider[]
  failedProviders: AIProvider[]
  skeletonCount: number
  enrichedCount: number
  primaryProvider: AIProvider | null
  alternatives: Map<number, AlternativeTrack[]>
}

// New actions
startGeneration: (trackCount: number) => void
receivePrimaryResult: (provider: AIProvider, tracks: Track[]) => void
receiveAlternativeResult: (provider: AIProvider, tracks: Track[]) => void
enrichTrack: (provider: AIProvider, index: number, track: Track) => void
swapWithAlternative: (index: number, alternative: AlternativeTrack) => void
completeGeneration: () => void
failGeneration: (error: string) => void
```

### Phase 5: UI - Ghost Track Components

**File: `/src/components/features/GhostTrackNode.tsx`** (NEW)

Skeleton loader styled like TrackNode:
```typescript
export function GhostTrackNode({ index }: { index: number }) {
  return (
    <motion.div
      className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/30"
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ repeat: Infinity, duration: 1.5, delay: index * 0.1 }}
    >
      {/* Shimmer skeleton matching TrackNode layout */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-zinc-700/50 rounded animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-700/50 rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-zinc-700/50 rounded w-1/2 animate-pulse" />
        </div>
      </div>
    </motion.div>
  )
}
```

### Phase 6: UI - Alternative Indicator on Tracks

**File: `/src/components/features/TrackNode.tsx`** (MODIFY)

Add indicator when alternatives exist:
```typescript
// Show small badge when track has alternatives from other AIs
{alternatives.length > 0 && (
  <button
    className="absolute -right-2 -top-2 bg-purple-500 text-xs rounded-full w-5 h-5"
    onClick={() => showAlternatives(index)}
  >
    {alternatives.length}
  </button>
)}
```

### Phase 7: LaunchPad - Immediate Transition

**File: `/src/components/features/LaunchPad.tsx`** (MODIFY)

Update `handleGenerate`:
1. Call `startGeneration(trackCount)` immediately
2. Call `onComplete()` to transition to IDE
3. Start streaming in background
4. Store handles progressive updates

### Phase 8: ArrangementCanvas - Render Ghost Tracks

**File: `/src/components/features/ArrangementCanvas.tsx`** (MODIFY)

Update to render ghost tracks during loading, progressively replace with real tracks.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `/src/app/api/ai/generate-stream/route.ts` | CREATE | SSE endpoint for parallel generation |
| `/src/types/index.ts` | MODIFY | Add AlternativeTrack types |
| `/src/lib/ai-stream-service.ts` | CREATE | Client EventSource handler |
| `/src/store/index.ts` | MODIFY | Add generation progress + alternatives state |
| `/src/components/features/GhostTrackNode.tsx` | CREATE | Skeleton loader component |
| `/src/components/features/TrackNode.tsx` | MODIFY | Show alternatives indicator |
| `/src/components/features/LaunchPad.tsx` | MODIFY | Immediate transition + streaming |
| `/src/components/features/ArrangementCanvas.tsx` | MODIFY | Render ghost tracks progressively |

---

## Verification Steps

1. Generate from LaunchPad - should immediately go to IDE
2. See skeleton tracks appear with shimmer animation
3. See first AI result populate tracks (note which provider)
4. See alternative indicators appear as other AIs complete
5. Click alternative indicator - see suggestions from other AIs
6. Swap a track with an alternative
7. If one provider fails, others should still succeed
8. If all fail, show error state with retry option

---

## UX Enhancement: "3 AI Perspectives"

Later enhancement - add a panel/modal showing:
- "OpenAI suggested: [track list]"
- "Claude suggested: [track list]"
- "Gemini suggested: [track list]"

Users can cherry-pick favorites from any AI's suggestions.
