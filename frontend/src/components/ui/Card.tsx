import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean
  glowColor?: 'none' | 'primary' | 'lime' | 'red'
}

export function Card({
  className = '',
  hoverEffect = false,
  glowColor = 'none',
  children,
  ...props
}: CardProps) {
  const glowClasses = {
    none: '',
    primary: 'hover:border-primary-light/60 hover:shadow-glow-primary',
    lime: 'hover:border-lime/60 hover:shadow-glow',
    red: 'hover:border-brand-red/60 hover:shadow-glow-red',
  }[glowColor]

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-navy-card/90 dark:bg-navy-card/95 text-white shadow-xl transition-all duration-200 ${
        hoverEffect ? 'hover:-translate-y-1 hover:border-white/20' : ''
      } ${glowClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 pb-3 flex flex-col gap-1.5 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`font-display text-lg font-bold text-white tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-white/60 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  )
}

export function CardContent({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 pt-2 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 pt-0 flex items-center justify-between border-t border-white/5 mt-4 ${className}`} {...props}>
      {children}
    </div>
  )
}
