import React from 'react'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon = <Inbox className="w-8 h-8 text-white/40" />,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-lime">
        {icon}
      </div>
      <h4 className="font-display text-base font-bold text-white tracking-tight mb-1">
        {title}
      </h4>
      {description && (
        <p className="text-xs text-white/60 max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
