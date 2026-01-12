'use client'

import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3',
            'text-sm focus:outline-none focus:border-accent-cyan/50 input-glow transition-all',
            'placeholder:text-gray-600',
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
