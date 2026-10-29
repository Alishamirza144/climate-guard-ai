import { Radio, AlertTriangle, Cpu } from 'lucide-react'

export interface DataSourceBadgeProps {
  source: 'live' | 'simulated' | 'model'
  provider?: string // e.g. "Open-Meteo", "NASA POWER", "NASA FIRMS", "Sentinel-2"
  updatedAt?: string // e.g. "2 min ago", "just now"
  label?: string
  className?: string
}

export function DataSourceBadge({
  source,
  provider,
  updatedAt,
  label,
  className = '',
}: DataSourceBadgeProps) {
  if (source === 'simulated') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-brand-orange/20 text-brand-orange border border-brand-orange/40 shadow-sm select-none ${className}`}
        title="Simulated data: strictly for demonstration and testing purposes"
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{label ?? 'SIMULATED'}</span>
        {provider && <span className="text-brand-orange/70 font-normal">({provider})</span>}
      </span>
    )
  }

  if (source === 'model') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide bg-brand-teal/20 text-teal-300 border border-brand-teal/40 select-none ${className}`}
      >
        <Cpu className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{label ?? (provider ? `MODEL · ${provider}` : 'TRAINED MODEL')}</span>
        {updatedAt && <span className="text-teal-400/60 text-[10px]">· {updatedAt}</span>}
      </span>
    )
  }

  // Live stream
  const displayProvider = provider ?? 'Open-Meteo'
  const displayUpdated = updatedAt ?? 'just now'
  const text = label ?? `LIVE · ${displayProvider} · updated ${displayUpdated}`

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide bg-primary/25 text-lime border border-lime/30 shadow-sm select-none ${className}`}
      title={`Live API Feed from ${displayProvider}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-lime" />
      </span>
      <Radio className="w-3 h-3 shrink-0 text-lime/80" aria-hidden="true" />
      <span>{text}</span>
    </span>
  )
}
