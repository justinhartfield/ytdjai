'use client'

import { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  valueLabel?: string
}

export function Slider({ className, label, valueLabel, ...props }: SliderProps) {
  return (
    <div className="space-y-2">
      {(label || valueLabel) && (
        <div className="flex justify-between items-center">
          {label && (
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {label}
            </label>
          )}
          {valueLabel && (
            <span className="text-xs font-mono text-accent-cyan">{valueLabel}</span>
          )}
        </div>
      )}
      <input
        type="range"
        className={cn('w-full cursor-pointer', className)}
        {...props}
      />
    </div>
  )
}
