'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface WizardStepProps {
  title: string
  subtitle: string
  children: React.ReactNode
  className?: string
}

export function WizardStep({ title, subtitle, children, className }: WizardStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className={cn('space-y-6', className)}
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="text-sm text-white/50">{subtitle}</p>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </motion.div>
  )
}
