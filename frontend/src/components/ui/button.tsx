import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-[#e03131] to-[#991b1b] text-white shadow-lg shadow-red-700/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-700/30 active:scale-[0.98]',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-white/40 bg-white/50 backdrop-blur-sm text-[#4c3d8f] hover:bg-white/70 hover:border-white/60',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'text-[#7c6fad] hover:bg-white/50 hover:text-[#4c3d8f]',
        link:
          'text-[#991b1b] underline-offset-4 hover:underline p-0 h-auto font-normal',
      },
      size: {
        default: 'h-11 px-6 py-2',
        sm: 'h-9 rounded-lg px-4 text-xs',
        lg: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
