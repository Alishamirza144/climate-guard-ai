import React from 'react'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: 'rounded-md h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  }[variant]

  const inlineStyles: React.CSSProperties = {
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
    ...style,
  }

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-white/10 dark:bg-white/5 border border-white/5 ${variantStyles} ${className}`}
      style={inlineStyles}
      {...props}
    />
  )
}
