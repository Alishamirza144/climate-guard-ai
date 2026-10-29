import { useEffect, useState } from 'react'
import { getRiskLevelFromScore, type RiskLevel } from '../../lib/risk'

export interface RiskGaugeProps {
  score: number // 0 - 100
  size?: number // diameter in pixels (default 140)
  strokeWidth?: number
  label?: string
  showLevel?: boolean
  showScore?: boolean
  className?: string
}

export function RiskGauge({
  score,
  size = 140,
  strokeWidth = 10,
  label,
  showLevel = true,
  showScore = true,
  className = '',
}: RiskGaugeProps) {
  const [animateGauge, setAnimateGauge] = useState(false)

  useEffect(() => {
    setAnimateGauge(true)
  }, [])

  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)))
  const level: RiskLevel = getRiskLevelFromScore(clampedScore)

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  // Using an arc or full circle gauge: standard 270 degree or full 360 circle
  const progressOffset = circumference - (clampedScore / 100) * circumference

  const levelConfig: Record<
    RiskLevel,
    { color: string; label: string; textClass: string; glow: string }
  > = {
    low: {
      color: '#AFD17F',
      label: 'LOW',
      textClass: 'text-lime',
      glow: 'rgba(175, 209, 127, 0.4)',
    },
    moderate: {
      color: '#FDB52B',
      label: 'MODERATE',
      textClass: 'text-brand-orange',
      glow: 'rgba(253, 181, 43, 0.4)',
    },
    high: {
      color: '#BAB329',
      label: 'HIGH',
      textClass: 'text-[#D8D03F]',
      glow: 'rgba(186, 179, 41, 0.4)',
    },
    critical: {
      color: '#E5484D',
      label: 'CRITICAL',
      textClass: 'text-brand-red',
      glow: 'rgba(229, 72, 77, 0.5)',
    },
  }

  const current = levelConfig[level]

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}
      role="meter"
      aria-label={label || 'Climate Risk Score'}
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${clampedScore} - ${current.label} Risk`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 overflow-visible"
          aria-hidden="true"
        >
          {/* Subtle Glow Filter */}
          <defs>
            <filter id={`gauge-glow-${level}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={current.color} floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Background track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-white/10"
            fill="transparent"
          />

          {/* Animated score arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={current.color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={animateGauge ? progressOffset : circumference}
            strokeLinecap="round"
            fill="transparent"
            style={{
              filter: `drop-shadow(0 0 6px ${current.glow})`,
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {showScore && (
            <span
              className="font-display font-black leading-none tracking-tight text-white"
              style={{ fontSize: size * 0.28 }}
            >
              {clampedScore}
            </span>
          )}

          {showLevel && (
            <span
              className={`font-semibold tracking-wider uppercase mt-1 ${current.textClass}`}
              style={{ fontSize: Math.max(10, size * 0.08) }}
            >
              {current.label}
            </span>
          )}
        </div>
      </div>

      {label && (
        <span className="text-xs text-white/60 font-medium tracking-wide mt-2 text-center">
          {label}
        </span>
      )}
    </div>
  )
}
