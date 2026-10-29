import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from './Button'

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  action?: React.ReactNode
  className?: string
}

export function ErrorState({
  title = 'Data Feed Unavailable',
  message,
  onRetry,
  action,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-brand-red/30 bg-brand-red/5 text-white ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mb-3 text-brand-red">
        <AlertCircle className="w-6 h-6" aria-hidden="true" />
      </div>
      <h4 className="font-display text-base font-bold text-white tracking-tight mb-1">
        {title}
      </h4>
      <p className="text-xs text-white/70 max-w-sm mb-4 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          onClick={onRetry}
        >
          Retry Connection
        </Button>
      )}
      {action && !onRetry && <div>{action}</div>}
    </div>
  )
}
