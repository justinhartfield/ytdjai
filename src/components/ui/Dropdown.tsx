'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DropdownOption {
  value: string
  label: string
  icon?: React.ReactNode
  description?: string
}

interface DropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  className?: string
}

export function Dropdown({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select option',
  className
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-white/60 mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-3',
          'bg-white/5 border border-white/10 rounded-lg',
          'text-white text-left transition-all duration-200',
          'hover:border-cyan-500/50 focus:outline-none focus:border-cyan-500',
          isOpen && 'border-cyan-500'
        )}
      >
        <div className="flex items-center gap-2">
          {selectedOption?.icon}
          <span>{selectedOption?.label || placeholder}</span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-white/40 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 w-full mt-2 py-2',
              'bg-[#0a0c1c] border border-white/10 rounded-lg',
              'shadow-xl shadow-black/50'
            )}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left',
                  'transition-all duration-150',
                  value === option.value
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-white/80 hover:bg-white/5'
                )}
              >
                {option.icon && (
                  <span className="flex-shrink-0">{option.icon}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-white/40 mt-0.5">
                      {option.description}
                    </div>
                  )}
                </div>
                {value === option.value && (
                  <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
