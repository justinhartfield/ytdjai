'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  SkipForward,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WizardProgress } from './WizardProgress'
import { FoundationStep } from './steps/FoundationStep'
import { VibeCraftingStep } from './steps/VibeCraftingStep'
import { ContextSettingStep } from './steps/ContextSettingStep'
import { BoundariesStep } from './steps/BoundariesStep'
import { ShapeLengthStep } from './steps/ShapeLengthStep'
import { VocalBalanceStep } from './steps/VocalBalanceStep'
import { DeepDiveStep } from './steps/DeepDiveStep'

const TOTAL_STEPS = 7

interface AIWizardProProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: () => void
}

export function AIWizardPro({ isOpen, onClose, onGenerate }: AIWizardProProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const handleNext = useCallback(() => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep])
    }
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1)
    }
  }, [currentStep, completedSteps])

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep])

  const handleSkip = useCallback(() => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep])
    }
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1)
    }
  }, [currentStep, completedSteps])

  const handleStepClick = useCallback((step: number) => {
    setCurrentStep(step)
  }, [])

  const handleGenerate = useCallback(() => {
    onGenerate()
    onClose()
  }, [onGenerate, onClose])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const isLastStep = currentStep === TOTAL_STEPS - 1

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <FoundationStep />
      case 1:
        return <VibeCraftingStep />
      case 2:
        return <ContextSettingStep />
      case 3:
        return <BoundariesStep />
      case 4:
        return <ShapeLengthStep />
      case 5:
        return <VocalBalanceStep />
      case 6:
        return <DeepDiveStep />
      default:
        return null
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-[#0a0c1c] border border-white/10 rounded-2xl shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">AI WIZARD PRO</h2>
                <p className="text-xs text-white/50">Advanced playlist customization</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {/* Progress */}
          <div className="border-b border-white/5">
            <WizardProgress
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepClick={handleStepClick}
            />
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#0a0c1c]">
            {/* Left: Back button */}
            <div>
              {currentStep > 0 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Back</span>
                </button>
              ) : (
                <div /> /* Spacer */
              )}
            </div>

            {/* Center: Generate Now shortcut */}
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Generate Now</span>
            </button>

            {/* Right: Skip / Next / Generate buttons */}
            <div className="flex items-center gap-2">
              {!isLastStep && (
                <button
                  onClick={handleSkip}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-white/40 hover:text-white/60 transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                  <span className="text-sm">Skip</span>
                </button>
              )}

              {isLastStep ? (
                <motion.button
                  onClick={handleGenerate}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm',
                    'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
                    'shadow-[0_0_20px_rgba(168,85,247,0.4)]',
                    'hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]',
                    'transition-all'
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  GENERATE MY SET
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleNext}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm',
                    'bg-white/10 border border-white/20 text-white',
                    'hover:bg-white/20 transition-all'
                  )}
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
