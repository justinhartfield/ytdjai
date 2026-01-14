'use client'

import { useRef, useEffect, ReactNode } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  snapPoints?: number[] // Percentages of screen height [50, 90]
  initialSnap?: number // Index of snapPoints
  className?: string
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [90],
  initialSnap = 0,
  className
}: MobileBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const currentSnapIndex = useRef(initialSnap)

  const handleDragEnd = (_: any, info: PanInfo) => {
    const velocity = info.velocity.y
    const offset = info.offset.y

    // If dragged down significantly or with high velocity, close
    if (offset > 100 || velocity > 500) {
      onClose()
    }
  }

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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50',
              'bg-[#0a0c1c] rounded-t-3xl',
              'border-t border-white/10',
              'shadow-[0_-10px_50px_rgba(0,0,0,0.5)]',
              'max-h-[90vh] flex flex-col',
              className
            )}
            style={{ height: `${snapPoints[currentSnapIndex.current]}vh` }}
          >
            {/* Drag Handle */}
            <div className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 pb-4 border-b border-white/5">
                <h2 className="text-lg font-black uppercase tracking-tight text-white">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white/70" />
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
