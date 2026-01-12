'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-accent-cyan text-black font-bold hover:bg-accent-cyan/90 shadow-[0_0_20px_rgba(0,242,255,0.3)]',
      secondary: 'bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 hover:border-white/20',
      ghost: 'text-gray-400 hover:text-white hover:bg-white/5',
      danger: 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-md',
      md: 'px-5 py-2.5 text-sm rounded-lg',
      lg: 'px-8 py-4 text-base rounded-xl',
    }

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
          'active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
