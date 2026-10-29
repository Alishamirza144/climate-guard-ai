import React from 'react'

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean
  blur?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary' | 'subtle'
}

export function GlassCard({
  className = '',
  hoverEffect = true,
  blur = 'md',
  variant = 'default',
  children,
  ...props
}: GlassCardProps) {
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-xl',
  }[blur]

  const variantClasses = {
    default:
      'bg-navy-dark/60 border-white/10 text-white shadow-glass',
    primary:
      'bg-gradient-to-br from-primary/30 to-navy-dark/70 border-primary-light/30 text-white shadow-glow-primary',
    subtle:
      'bg-white/[0.03] border-white/5 text-white',
  }[variant]

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${blurClasses} ${variantClasses} ${
        hoverEffect ? 'hover:border-lime/40 hover:-translate-y-1 hover:shadow-glow' : ''
      } ${className}`}
      {...props}
    >
      {/* Subtle top edge specular reflection highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"
        aria-hidden="true"
      />
      {children}
    </div>
  )
}
