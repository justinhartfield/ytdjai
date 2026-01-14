'use client'

import { FileText, Sparkles } from 'lucide-react'
import { useYTDJStore } from '@/store'
import { WizardStep } from '../WizardStep'

const EXAMPLE_PROMPTS = [
  "The feeling of driving through an empty city at 3am, streetlights reflecting off wet pavement, that bittersweet nostalgia of endings and new beginnings...",
  "A rainy Sunday afternoon, coffee getting cold, re-reading old letters, the kind of sadness that feels like home...",
  "That moment when the sun breaks through storm clouds, the world feels infinite, possibilities are endless, pure hope..."
]

export function DeepDiveStep() {
  const { generationControls, setLongFormInput } = useYTDJStore()

  const handleExampleClick = (example: string) => {
    setLongFormInput(example)
  }

  return (
    <WizardStep
      title="Want to add more context?"
      subtitle="Optional: Paste a paragraph, poem, or scene description"
    >
      <div className="space-y-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-amber-400">DEEP CONTEXT</h3>
        </div>

        <p className="text-xs text-white/40">
          Paste any text - a diary entry, poem, scene description, or mood board - and we'll distill it into musical attributes
        </p>

        <textarea
          value={generationControls.longFormInput}
          onChange={(e) => setLongFormInput(e.target.value)}
          placeholder="Paste a paragraph that captures the mood you're going for..."
          className="w-full h-40 px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none"
        />

        {generationControls.longFormInput && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/30">
              {generationControls.longFormInput.length} characters
            </span>
            <button
              onClick={() => setLongFormInput('')}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Clear text
            </button>
          </div>
        )}

        {/* Example prompts */}
        {!generationControls.longFormInput && (
          <div className="space-y-3 pt-3 border-t border-white/5">
            <p className="text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Try an example
            </p>
            <div className="space-y-2">
              {EXAMPLE_PROMPTS.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example)}
                  className="w-full p-3 text-left bg-white/5 border border-white/10 rounded-lg text-xs text-white/50 hover:bg-white/10 hover:text-white/70 transition-all line-clamp-2"
                >
                  "{example.slice(0, 100)}..."
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-lg">
        <span className="text-base">*</span>
        <p className="text-xs text-white/50">
          <span className="text-pink-400 font-medium">This step is optional.</span>{' '}
          Skip if your main prompt already captures what you want.
        </p>
      </div>
    </WizardStep>
  )
}
