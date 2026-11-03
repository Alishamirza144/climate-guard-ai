import { ShieldAlert, ShieldCheck, AlertTriangle, AlertCircle, Clock, Droplets, Waves, Database, Compass } from 'lucide-react'
import { EmergencyAlert } from '../lib/api'

interface EmergencyAlertBannerProps {
  alert?: EmergencyAlert | null
  className?: string
}

export default function EmergencyAlertBanner({ alert, className = '' }: EmergencyAlertBannerProps) {
  if (!alert) return null

  const isNormal = alert.status === 'NORMAL' || alert.is_normal
  const isWatch = alert.status === 'WATCH'
  const isWarning = alert.status === 'WARNING'
  const isCritical = alert.status === 'CRITICAL'

  // Sky-blue theme aligned accent styles
  const config = isCritical
    ? {
        border: 'border-[#E45B62]',
        bg: 'bg-gradient-to-r from-[#E45B62]/15 via-[#F0F8FF] to-[#E45B62]/10',
        badgeBg: 'bg-[#E45B62] text-white',
        iconColor: 'text-[#E45B62]',
        icon: AlertCircle,
        headerText: 'text-[#E45B62]',
      }
    : isWarning
    ? {
        border: 'border-[#F2B544]',
        bg: 'bg-gradient-to-r from-[#F2B544]/15 via-[#F0F8FF] to-[#F2B544]/10',
        badgeBg: 'bg-[#F2B544] text-[#20364D]',
        iconColor: 'text-[#F2B544]',
        icon: AlertTriangle,
        headerText: 'text-[#B47510]',
      }
    : isWatch
    ? {
        border: 'border-[#16A6A3]',
        bg: 'bg-gradient-to-r from-[#16A6A3]/15 via-[#F0F8FF] to-[#2784D8]/10',
        badgeBg: 'bg-[#16A6A3] text-white',
        iconColor: 'text-[#16A6A3]',
        icon: ShieldAlert,
        headerText: 'text-[#16A6A3]',
      }
    : {
        border: 'border-[#299765]',
        bg: 'bg-gradient-to-r from-[#299765]/15 via-[#F0F8FF] to-[#D9F5E8]/40',
        badgeBg: 'bg-[#299765] text-white',
        iconColor: 'text-[#299765]',
        icon: ShieldCheck,
        headerText: 'text-[#299765]',
      }

  const Icon = config.icon

  return (
    <div
      className={`rounded-2xl border-2 ${config.border} ${config.bg} p-5 shadow-lg transition-all text-[#20364D] ${className}`}
      role="region"
      aria-label="Climate Early Warning Emergency Banner"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#B9D9F5]/70">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white shadow-sm shrink-0 border border-[#B9D9F5]">
            <Icon className={`w-7 h-7 ${config.iconColor}`} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${config.badgeBg}`}>
                {alert.status}
              </span>
              <h2 className={`font-display font-black text-base sm:text-lg tracking-tight ${config.headerText}`}>
                {alert.title}
              </h2>
            </div>
            <p className="text-xs text-[#5B7188] font-medium mt-0.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#2784D8]" />
              <span>Catchment: Upper Godavari Basin (Nashik District, Maharashtra)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-center text-xs font-semibold text-[#5B7188] bg-white/70 px-3 py-1.5 rounded-xl border border-[#B9D9F5]">
          <Clock className="w-3.5 h-3.5 text-[#2784D8]" />
          <span>Issued: {alert.timestamp}</span>
        </div>
      </div>

      {/* Real-time telemetry indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="bg-[#EDF7FF] rounded-xl p-2.5 border border-[#B9D9F5]">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5B7188] uppercase tracking-wider">
            <Droplets className="w-3.5 h-3.5 text-[#2784D8]" />
            Rainfall (24h)
          </div>
          <div className="text-sm sm:text-base font-extrabold text-[#20364D] mt-1 font-mono">
            {alert.rainfall_summary || '0.0 mm'}
          </div>
        </div>

        <div className="bg-[#EDF7FF] rounded-xl p-2.5 border border-[#B9D9F5]">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5B7188] uppercase tracking-wider">
            <Waves className="w-3.5 h-3.5 text-[#16A6A3]" />
            River Stage
          </div>
          <div className="text-sm sm:text-base font-extrabold text-[#20364D] mt-1 font-mono">
            {alert.river_level_summary || 'Stable (1.8m)'}
          </div>
        </div>

        <div className="bg-[#EDF7FF] rounded-xl p-2.5 border border-[#B9D9F5] col-span-2 sm:col-span-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5B7188] uppercase tracking-wider">
            <Database className="w-3.5 h-3.5 text-[#2784D8]" />
            Reservoir Status
          </div>
          <div className="text-sm sm:text-base font-extrabold text-[#20364D] mt-1 font-mono truncate">
            {alert.reservoir_summary || 'Gangapur Dam: 72% Storage'}
          </div>
        </div>
      </div>

      {/* Causal Reason & Recommended Actions */}
      <div className="space-y-2 pt-2 text-xs">
        <div className="bg-white/80 p-3 rounded-xl border border-[#B9D9F5]">
          <span className="font-bold text-[#20364D] uppercase tracking-wider text-[11px] block mb-1">
            Causal Reason:
          </span>
          <p className="text-[#20364D] leading-relaxed">{alert.reason}</p>
        </div>

        <div className="bg-[#D9F5E8]/60 p-3 rounded-xl border border-[#299765]/30">
          <span className="font-bold text-[#20364D] uppercase tracking-wider text-[11px] block mb-1">
            Precautionary Action Protocol:
          </span>
          <p className="text-[#20364D] leading-relaxed font-medium">{alert.recommended_action}</p>
        </div>
      </div>
    </div>
  )
}
