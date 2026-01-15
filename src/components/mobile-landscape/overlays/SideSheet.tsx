'use client'

import { useEffect, ReactNode } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SideSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  side?: 'left' | 'right'
  width?: string
  className?: string
}

export function SideSheet({
  isOpen,
  onClose,
  children,
  title,
  side = 'right',
  width = 'w-[280px]',
  className
}: SideSheetProps) {
  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100
    const velocity = 300

    if (side === 'right') {
      if (info.offset.x > threshold || info.velocity.x > velocity) {
        onClose()
      }
    } else {
      if (info.offset.x < -threshold || info.velocity.x < -velocity) {
        onClose()
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: side === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed top-0 bottom-0 z-50',
              side === 'right' ? 'right-0' : 'left-0',
              width,
              'bg-[#0a0c1c] border-l border-white/10',
              'shadow-[-20px_0_60px_rgba(0,0,0,0.5)]',
              'flex flex-col',
              className
            )}
          >
            {/* Drag Handle */}
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-1 h-16 rounded-full bg-white/20',
                side === 'right' ? 'left-2' : 'right-2'
              )}
            />

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
                <h2 className="text-base font-black uppercase tracking-tight text-white">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
