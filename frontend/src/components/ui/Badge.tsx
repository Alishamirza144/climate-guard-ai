import React from 'react'
import { type RiskLevel } from '../../lib/risk'

export type { RiskLevel }
export type BadgeVariant = RiskLevel | 'primary' | 'neutral' | 'info'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
  pulsing?: boolean
  children: React.ReactNode
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  pulsing = false,
  children,
  className = '',
  ...props
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
    low: {
      container: 'bg-lime/15 text-lime border-lime/30',
      dot: 'bg-lime',
    },
    moderate: {
      container: 'bg-brand-orange/15 text-brand-orange border-brand-orange/30',
      dot: 'bg-brand-orange',
    },
    high: {
      container: 'bg-brand-olive/20 text-[#D8D03F] border-brand-olive/40',
      dot: 'bg-[#D8D03F]',
    },
    critical: {
      container: 'bg-brand-red/15 text-brand-red border-brand-red/30',
      dot: 'bg-brand-red',
    },
    primary: {
      container: 'bg-primary/30 text-lime border-primary-light/40',
      dot: 'bg-lime',
    },
    info: {
      container: 'bg-brand-teal/20 text-teal-300 border-brand-teal/40',
      dot: 'bg-brand-teal',
    },
    neutral: {
      container: 'bg-white/10 text-white/80 border-white/15',
      dot: 'bg-white/60',
    },
  }

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-medium',
  }[size]

  const style = variantStyles[variant]

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border transition-colors select-none ${style.container} ${sizeStyles} ${className}`}
      {...props}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulsing && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`} />
        </span>
      )}
      {children}
    </span>
  )
}
