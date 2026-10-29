import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface StatProps {
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  trendLabel?: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  className?: string
}

export function Stat({
  label,
  value,
  unit,
  trend,
  trendValue,
  trendLabel,
  icon,
  badge,
  className = '',
}: StatProps) {
  const trendConfig = {
    up: {
      icon: TrendingUp,
      color: 'text-brand-red',
      bg: 'bg-brand-red/10',
    },
    down: {
      icon: TrendingDown,
      color: 'text-lime',
      bg: 'bg-lime/10',
    },
    neutral: {
      icon: Minus,
      color: 'text-white/50',
      bg: 'bg-white/5',
    },
  }

  const trendData = trend ? trendConfig[trend] : null
  const TrendIcon = trendData?.icon

  return (
    <div
      className={`p-4 rounded-xl border border-white/10 bg-navy-card/80 backdrop-blur-sm flex flex-col justify-between gap-3 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white/60 tracking-wide uppercase">
          {label}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lime shrink-0">
            {icon}
          </div>
        )}
        {badge}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-2xl font-black text-white tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-semibold text-lime/80">{unit}</span>
        )}
      </div>

      {(trendValue || trendLabel) && trendData && TrendIcon && (
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${trendData.bg} ${trendData.color}`}
          >
            <TrendIcon className="w-3 h-3" aria-hidden="true" />
            {trendValue}
          </span>
          {trendLabel && <span className="text-white/40">{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}
