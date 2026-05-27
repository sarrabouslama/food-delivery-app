import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3.5 text-[#7c6fad] pointer-events-none select-none">
            {leftIcon}
          </span>
        )}
        <input
          type={type}
          className={cn(
            'flex h-11 w-full rounded-xl border border-white/40 bg-white/60 backdrop-blur-sm px-4 py-2 text-sm text-[#1e1b4b] placeholder:text-[#7c6fad]/60 shadow-sm transition-all outline-none',
            'focus:border-[#6b8fff] focus:bg-white/85 focus:ring-2 focus:ring-[#6b8fff]/20 focus:shadow-md',
            'disabled:cursor-not-allowed disabled:opacity-50',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className,
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3.5 text-[#7c6fad]">
            {rightIcon}
          </span>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'

export { Input }
