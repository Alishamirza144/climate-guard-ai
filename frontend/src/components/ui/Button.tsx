import React from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

export type ButtonVariant = 'primary' | 'lime' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-light border border-primary-light/40 shadow-glow-primary focus-visible:ring-lime',
  lime:
    'bg-lime text-navy font-bold hover:bg-lime-light border border-lime shadow-glow focus-visible:ring-lime-dark',
  secondary:
    'bg-white/10 text-white hover:bg-white/15 border border-white/15 dark:bg-navy-card dark:hover:bg-white/10 focus-visible:ring-lime',
  outline:
    'bg-transparent text-white border border-white/30 hover:border-lime hover:text-lime focus-visible:ring-lime',
  ghost:
    'bg-transparent text-white/80 hover:text-white hover:bg-white/10 border border-transparent focus-visible:ring-lime',
  danger:
    'bg-brand-red text-white hover:bg-red-600 border border-red-400/30 shadow-glow-red focus-visible:ring-brand-red',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3.5 text-base rounded-xl gap-2.5 font-semibold',
}

const buttonClassName = (variant: ButtonVariant, size: ButtonSize, className: string) =>
  `inline-flex items-center justify-center font-medium transition-all duration-150 hover:scale-[1.01] active:scale-[0.98] disabled:hover:scale-100 disabled:active:scale-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-navy disabled:opacity-50 disabled:cursor-not-allowed select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={buttonClassName(variant, size, className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

export interface ButtonLinkProps extends Omit<LinkProps, 'children' | 'className'> {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  children,
  className = '',
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClassName(variant, size, className)} {...props}>
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </Link>
  )
}
