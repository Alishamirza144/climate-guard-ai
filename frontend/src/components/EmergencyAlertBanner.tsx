import { useTranslation } from 'react-i18next'
import { ShieldAlert, ShieldCheck, AlertTriangle, AlertCircle, Clock, Droplets, Waves, Database, Compass } from 'lucide-react'
import { EmergencyAlert } from '../lib/api'
import { translateAlertTitle, translateAlertReason, translateRecommendedAction } from '../i18n/dynamic'
import { useLocaleFormatter } from '../i18n/formatters'
import { localizeCity, localizeState } from '../i18n/locations'

interface EmergencyAlertBannerProps {
  alert?: EmergencyAlert | null
  className?: string
}

export default function EmergencyAlertBanner({ alert, className = '' }: EmergencyAlertBannerProps) {
  const { t } = useTranslation()
  const { formatDigits, lang } = useLocaleFormatter()
  if (!alert) return null

  const isInsufficient = alert.status === 'INSUFFICIENT_DATA'
  const isCritical = alert.status === 'CRITICAL'
  const isWarning = alert.status === 'WARNING'
  const isWatch = alert.status === 'WATCH'

  const localizedTitle = translateAlertTitle(alert.title, t)
  const localizedReason = translateAlertReason(alert.reason, t, alert.city_name, alert.state_name)
  const localizedAction = translateRecommendedAction(alert.recommended_action, t, alert.city_name)
  const localizedStatus =
    alert.status === 'CRITICAL'
      ? t('risk.critical', 'Critical')
      : alert.status === 'WARNING'
      ? t('risk.warning', 'Warning')
      : alert.status === 'WATCH'
      ? t('risk.watch', 'Watch')
      : alert.status === 'INSUFFICIENT_DATA'
      ? t('risk.insufficient', 'Insufficient Data')
      : t('risk.normal', 'Normal')

  // Navy-blue theme aligned accent styles
  const config = isInsufficient
    ? {
        border: 'border-[#2389D7]',
        bg: 'bg-gradient-to-r from-[#2389D7]/20 via-[#102F50] to-[#0E2B49]',
        badgeBg: 'bg-[#2389D7] text-white',
        iconColor: 'text-[#25C5DC]',
        icon: AlertCircle,
        headerText: 'text-[#8ED8F5]',
      }
    : isCritical
    ? {
        border: 'border-[#F06470]',
        bg: 'bg-gradient-to-r from-[#F06470]/25 via-[#102F50] to-[#0E2B49]',
        badgeBg: 'bg-[#F06470] text-white',
        iconColor: 'text-[#F06470]',
        icon: AlertCircle,
        headerText: 'text-[#F06470]',
      }
    : isWarning
    ? {
        border: 'border-[#F4BC4D]',
        bg: 'bg-gradient-to-r from-[#F4BC4D]/25 via-[#102F50] to-[#0E2B49]',
        badgeBg: 'bg-[#F4BC4D] text-[#071A33]',
        iconColor: 'text-[#F4BC4D]',
        icon: AlertTriangle,
        headerText: 'text-[#F4BC4D]',
      }
    : isWatch
    ? {
        border: 'border-[#25C5DC]',
        bg: 'bg-gradient-to-r from-[#25C5DC]/20 via-[#102F50] to-[#0E2B49]',
        badgeBg: 'bg-[#25C5DC] text-[#071A33]',
        iconColor: 'text-[#25C5DC]',
        icon: ShieldAlert,
        headerText: 'text-[#25C5DC]',
      }
    : {
        border: 'border-[#35C58B]',
        bg: 'bg-gradient-to-r from-[#35C58B]/20 via-[#102F50] to-[#0E2B49]',
        badgeBg: 'bg-[#35C58B] text-[#071A33]',
        iconColor: 'text-[#35C58B]',
        icon: ShieldCheck,
        headerText: 'text-[#35C58B]',
      }

  const Icon = config.icon

  return (
    <div
      className={`rounded-2xl border-2 ${config.border} ${config.bg} p-5 shadow-2xl transition-all text-[#F3F8FF] ${className}`}
      role="region"
      aria-label="Climate Early Warning Emergency Banner"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#285274]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#071A33] shadow-sm shrink-0 border border-[#285274]">
            <Icon className={`w-7 h-7 ${config.iconColor}`} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${config.badgeBg}`}>
                {localizedStatus}
              </span>
              <h2 className={`font-display font-black text-base sm:text-lg tracking-tight ${config.headerText}`}>
                {localizedTitle}
              </h2>
            </div>
            <p className="text-xs text-[#B6C9DC] font-medium mt-0.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#25C5DC]" />
              <span>{t('common.catchment', 'Catchment')}: {alert.city_name ? `${localizeCity(alert.city_name, lang)} ${t('common.region', 'Region')} (${localizeState(alert.state_name || 'India', lang)})` : 'Regional Municipal Catchment'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-center text-xs font-semibold text-[#8ED8F5] bg-[#071A33]/80 px-3 py-1.5 rounded-xl border border-[#285274]">
          <Clock className="w-3.5 h-3.5 text-[#25C5DC]" />
          <span>{t('common.issued', 'Issued')}: {formatDigits(alert.timestamp, lang)}</span>
        </div>
      </div>

      {/* Real-time telemetry indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="bg-[#12385C] rounded-xl p-3 border border-[#285274]">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#B6C9DC] uppercase tracking-wider">
            <Droplets className="w-3.5 h-3.5 text-[#25C5DC]" />
            {t('dashboard.rainfall24h', 'Rainfall (24h)')}
          </div>
          <div className="text-sm sm:text-base font-extrabold text-[#F3F8FF] mt-1 font-mono">
            {alert.rainfall_summary ? formatDigits(alert.rainfall_summary, lang) : formatDigits('0.0 mm', lang)}
          </div>
        </div>

        <div className="bg-[#12385C] rounded-xl p-3 border border-[#285274]">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#B6C9DC] uppercase tracking-wider">
            <Waves className="w-3.5 h-3.5 text-[#25C5DC]" />
            {t('dashboard.riverTitle', 'River Stage')}
          </div>
          <div className="text-sm sm:text-base font-extrabold text-[#F3F8FF] mt-1 font-mono">
            {alert.river_level_summary ? formatDigits(alert.river_level_summary, lang) : formatDigits('Stable (1.8m)', lang)}
          </div>
        </div>

        <div className="bg-[#12385C] rounded-xl p-3 border border-[#285274] col-span-2 sm:col-span-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#B6C9DC] uppercase tracking-wider">
            <Database className="w-3.5 h-3.5 text-[#25C5DC]" />
            {t('dashboard.reservoirTitle', 'Reservoir Status')}
          </div>
          <div className="text-sm sm:text-base font-extrabold text-[#F3F8FF] mt-1 font-mono truncate">
            {alert.reservoir_summary ? formatDigits(alert.reservoir_summary, lang) : 'Catchment Reservoir System: Nominal'}
          </div>
        </div>
      </div>

      {/* Causal Reason & Recommended Actions */}
      <div className="space-y-2 pt-2 text-xs">
        <div className="bg-[#071A33]/70 p-3 rounded-xl border border-[#285274]">
          <span className="font-bold text-[#8ED8F5] uppercase tracking-wider text-[11px] block mb-1">
            {t('common.causalReason', 'Causal Reason:')}
          </span>
          <p className="text-[#F3F8FF] leading-relaxed">{localizedReason}</p>
        </div>

        <div className="bg-[#102F50]/90 p-3 rounded-xl border border-[#285274]">
          <span className="font-bold text-[#35C58B] uppercase tracking-wider text-[11px] block mb-1">
            {t('alerts.actionRequired', 'Precautionary Action Protocol:')}
          </span>
          <p className="text-[#F3F8FF] leading-relaxed font-medium">{localizedAction}</p>
        </div>
      </div>
    </div>
  )
}
