'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEP_NAMES = [
  'Foundation',
  'Vibe',
  'Context',
  'Boundaries',
  'Shape',
  'Vocals',
  'Deep Dive'
]

interface WizardProgressProps {
  currentStep: number
  completedSteps: number[]
  onStepClick: (step: number) => void
}

export function WizardProgress({ currentStep, completedSteps, onStepClick }: WizardProgressProps) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3">
      {STEP_NAMES.map((name, index) => {
        const isCompleted = completedSteps.includes(index)
        const isCurrent = currentStep === index
        const isClickable = isCompleted || index <= Math.max(...completedSteps, currentStep)

        return (
          <button
            key={index}
            onClick={() => isClickable && onStepClick(index)}
            disabled={!isClickable}
            className={cn(
              'flex flex-col items-center gap-1 transition-all',
              isClickable ? 'cursor-pointer' : 'cursor-default opacity-50'
            )}
          >
            <div className="relative">
              <motion.div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                  isCurrent
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                    : isCompleted
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-white/5 border-white/20 text-white/40'
                )}
                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </motion.div>
              {index < STEP_NAMES.length - 1 && (
                <div
                  className={cn(
                    'absolute top-1/2 left-full w-2 h-0.5 -translate-y-1/2',
                    isCompleted ? 'bg-green-500/50' : 'bg-white/10'
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                'text-[9px] font-medium uppercase tracking-wider transition-colors',
                isCurrent
                  ? 'text-purple-400'
                  : isCompleted
                  ? 'text-green-400'
                  : 'text-white/30'
              )}
            >
              {name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
