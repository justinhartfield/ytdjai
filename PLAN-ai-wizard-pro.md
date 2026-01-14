# AI Wizard Pro - Implementation Plan

## Overview

Transform the current "Advanced Settings" (hidden behind a toggle) into a polished step-by-step wizard experience called "AI Wizard Pro". The wizard guides users through advanced playlist customization in an intuitive, progressive flow.

## Current State

The Advanced Settings section contains 5 collapsible panels with ~15 individual settings:
- Advanced Prompt Panel (vibe blending, avoid concepts, quick transforms, paragraph input)
- Generation Controls (length, energy preset, content mode, vocal density)
- Anchor Tracks (pin 1-5 tracks)
- Context Tokens (time/season/weather/activity/social)
- Similar to Playlist (reference URL + modifier)

**Problem:** All options visible at once is overwhelming. Users don't know where to start or what matters most.

## Proposed Solution

A **7-step wizard** with clear progression, smart defaults, and the ability to skip steps. Each step focuses on one decision category.

---

## Wizard Steps

### Step 1: Foundation
**Question:** "What's the starting point for your playlist?"

| Option | Description | Settings Used |
|--------|-------------|---------------|
| **Start Fresh** | Build from your prompt alone | Default - no reference |
| **Based on Playlist** | Use a Spotify/YouTube playlist as inspiration | `similarPlaylist.url` |
| **Anchor Songs** | Must include these specific tracks | `anchorTracks[]` |

**UI Components:**
- 3 large radio cards
- If "Based on Playlist" → show URL input + modifier field
- If "Anchor Songs" → show search/add interface (max 5)
- Can select both "Based on Playlist" AND "Anchor Songs"

---

### Step 2: Vibe Crafting
**Question:** "How do you want to shape the mood?"

| Option | Description | Settings Used |
|--------|-------------|---------------|
| **Single Vibe** | One clear mood (from main prompt) | Just main prompt |
| **Blend Vibes** | Mix multiple moods with weights | `weightedPhrases[]` |
| **Quick Style** | Apply preset style transforms | `appliedTemplates[]` |

**UI Components:**
- "Single Vibe" shows preview of their main prompt
- "Blend Vibes" shows multi-input with percentage sliders
- "Quick Style" shows 5 toggle chips (cinematic, danceable, intimate, instrumental, 90s-soundtrack)
- Can combine Blend + Quick Style

---

### Step 3: Context Setting
**Question:** "When and where will you listen?"

5 horizontal chip selectors (all optional):
- **Time:** Morning / Afternoon / Evening / Night / Late-Night
- **Season:** Spring / Summer / Fall / Winter
- **Weather:** Sunny / Cloudy / Rainy / Stormy / Snowy
- **Activity:** Workout / Study / Work / Dinner Party / Driving / Relaxing / Dancing
- **Social:** Solo / Friends / Date / Party / Background

**UI:** Chip groups with single-select per row, "None" option to skip each

---

### Step 4: Boundaries
**Question:** "Any content preferences?"

| Section | Options |
|---------|---------|
| **Content Filter** | Clean (radio-safe) / Explicit OK / Family-friendly |
| **Avoid These** | Tag input for concepts to exclude |

**UI:**
- 3 large radio cards for content mode
- Tag input field with X buttons for avoid concepts
- Suggestions: "sad breakup", "aggressive drops", "country twang"

---

### Step 5: Shape & Length
**Question:** "How long and what energy curve?"

| Section | Options |
|---------|---------|
| **Length** | 15 songs / 30 songs / 60 songs / ~45 min / ~2 hours |
| **Energy** | No Slow Songs / Keep It Mellow / Mid-Tempo Groove / BPM Ramp / Custom (use sliders) |

**UI:**
- 5 length preset buttons (radio)
- 5 energy preset buttons (radio)
- Visual preview of energy curve shape

---

### Step 6: Vocal Balance
**Question:** "How should vocals factor in?"

3 horizontal sliders:
1. **Instrumental ↔ Vocal** (0-100, default 50)
2. **Hooky ↔ Atmospheric** (0-100, default 50)
3. **Clear Lyrics ↔ Abstract** (0-100, default 50)

**UI:**
- Each slider has endpoint labels
- Center (50) marked as "Balanced"
- Quick preset buttons: "All Instrumental", "Vocal-Heavy", "Balanced"

---

### Step 7: Deep Dive (Optional)
**Question:** "Want to add more context?"

**Paste a Paragraph** - freeform text area for:
- Diary entries
- Poems
- Scene descriptions
- Detailed mood explanations

**UI:**
- Large textarea with character count (500 char limit shown)
- Example prompts as placeholder text
- "Skip" button prominently shown

---

## Navigation & UX

### Progress Indicator
- Horizontal step dots at top
- Current step highlighted
- Completed steps show checkmark
- Can click to jump to any completed step

### Navigation Buttons
- **Back** - Go to previous step
- **Skip** - Use defaults for this step, move forward
- **Next** - Save choices, advance
- **Generate** - Only on final step (or any step via "Generate Now")

### "Generate Now" Escape Hatch
- Small text link at bottom: "Ready? Generate now with current settings"
- Allows users to exit wizard early once they have enough customization

### Smart Defaults
- All steps pre-filled with sensible defaults
- User can blaze through with "Next" if defaults are fine
- Only stops to require input on Step 1 if "Based on Playlist" or "Anchor Songs" selected

---

## UI Design

### Modal vs Inline
**Recommendation:** Full-screen modal overlay (like current LaunchPad but specifically for wizard)

### Visual Style
- Clean white/dark cards per step
- Large touch targets
- Minimal text, visual selections where possible
- Progress bar with step names
- Smooth transitions between steps

### Mobile Considerations
- Stack options vertically
- Full-width cards
- Bottom-anchored navigation buttons
- Swipe gestures for next/back (optional)

---

## File Changes

### New Files
1. `src/components/features/AIWizardPro/AIWizardPro.tsx` - Main wizard container
2. `src/components/features/AIWizardPro/WizardStep.tsx` - Reusable step wrapper
3. `src/components/features/AIWizardPro/steps/FoundationStep.tsx`
4. `src/components/features/AIWizardPro/steps/VibeCraftingStep.tsx`
5. `src/components/features/AIWizardPro/steps/ContextSettingStep.tsx`
6. `src/components/features/AIWizardPro/steps/BoundariesStep.tsx`
7. `src/components/features/AIWizardPro/steps/ShapeLengthStep.tsx`
8. `src/components/features/AIWizardPro/steps/VocalBalanceStep.tsx`
9. `src/components/features/AIWizardPro/steps/DeepDiveStep.tsx`
10. `src/components/features/AIWizardPro/WizardProgress.tsx` - Progress indicator

### Modified Files
1. `src/components/features/LaunchPad.tsx` - Replace "Advanced Settings" toggle with "AI Wizard Pro" button
2. `src/store/index.ts` - Add wizard state (currentStep, isWizardOpen)

### Removed/Deprecated
- The inline Advanced Settings panels remain but are accessed via the wizard
- No component deletion, just reorganization

---

## State Management

### New Store Fields
```typescript
interface WizardState {
  isWizardOpen: boolean
  currentStep: number // 0-6
  completedSteps: number[] // [0, 1, 2...]
  // All generation controls already exist in store
}
```

### Actions
```typescript
openWizard: () => void
closeWizard: () => void
setWizardStep: (step: number) => void
markStepComplete: (step: number) => void
resetWizard: () => void
```

---

## Implementation Order

1. **Phase 1:** Create wizard shell and navigation
   - AIWizardPro.tsx container
   - WizardProgress.tsx indicator
   - WizardStep.tsx wrapper
   - Basic next/back/skip logic

2. **Phase 2:** Implement each step (reuse existing components)
   - Port AdvancedPromptPanel pieces into step components
   - Port GenerationControls pieces
   - Wire up to existing store

3. **Phase 3:** Polish
   - Animations/transitions
   - Mobile responsiveness
   - "Generate Now" escape hatch
   - Step jump navigation

4. **Phase 4:** Integration
   - Replace Advanced Settings button in LaunchPad
   - Test full flow
   - Handle edge cases

---

## Open Questions

1. **Should the wizard replace the simple mode entirely?**
   - Recommendation: No, keep quick generate for simple prompts
   - Wizard is for users who want more control

2. **Persist wizard progress?**
   - Recommendation: Yes, if user closes wizard, reopen at same step
   - Clear on successful generation

3. **Show wizard on first visit?**
   - Recommendation: No, let users discover it
   - Maybe tooltip/highlight on first few visits

---

## Success Metrics

- Users who use AI Wizard Pro generate more refined playlists
- Reduced bounce rate on Advanced Settings (currently hidden = rarely used)
- Increased usage of anchor tracks, context tokens, and vibe blending
