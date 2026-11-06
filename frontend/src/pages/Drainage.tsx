import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Layers,
  Gauge,
  Droplets,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import { useLocationContext } from '../components/LocationProvider'
import { api } from '../lib/api'
import { useLocaleFormatter } from '../i18n/formatters'
import { localizeCity } from '../i18n/locations'

export default function Drainage() {
  const { t } = useTranslation()
  const { location } = useLocationContext()
  const { formatNumber, formatDigits, lang } = useLocaleFormatter()
  const [simulated, setSimulated] = useState(false)

  const drainageQuery = useQuery({
    queryKey: ['drainage-risk', location.lat, location.lon, simulated],
    queryFn: () => api.riskDrainage(location.lat, location.lon, simulated),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  })

  const data = drainageQuery.data ?? {}
  const telemetry = data.telemetry ?? {}
  const hotspots = data.hotspots ?? []
  const isSimulated = Boolean(data.simulated)
  const isCritical = data.level === 'Critical' || isSimulated

  const readings = [
    {
      label: t('dashboard.riverTitle', 'Water Level'),
      value: `${formatNumber(telemetry.water_level_m ?? 0.42, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} m`,
      status: telemetry.water_level_trend ?? t('drainage.clearanceNominal', 'Stable nominal baseflow'),
      color: isCritical ? 'text-[#F06470]' : 'text-[#35C58B]',
      icon: Droplets,
    },
    {
      label: t('drainage.flowVelocity', 'Flow Velocity'),
      value: `${formatNumber(telemetry.flow_velocity_mps ?? 2.6, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} m/s`,
      status: telemetry.flow_status ?? 'Optimal (Free-surface flow)',
      color: isCritical ? 'text-[#F4BC4D]' : 'text-[#25C5DC]',
      icon: Activity,
    },
    {
      label: t('drainage.conduitStatus', 'Conduit Surcharge'),
      value: `${formatNumber(telemetry.conduit_surcharge_pct ?? 18)}%`,
      status: telemetry.surcharge_status ?? t('drainage.clearanceNominal', 'Nominal — Full clearance'),
      color: isCritical ? 'text-[#F06470]' : 'text-[#35C58B]',
      icon: Gauge,
    },
  ]

  const alertMessage = data.alert_message ?? (
    isSimulated
      ? `CRITICAL ALERT: Outfall Blockage Detected at ${data.city_name || 'Municipal'} Ward-7 Culvert Node D-04. Hydraulic head differential exceeds safe threshold (+1.43 m).`
      : `No active blockage alerts in ${data.city_name || 'selected city'}. Acoustic & ultrasonic telemetry within nominal operating parameters.`
  )

  const actions = data.recommended_actions ?? [
    `Emergency Dispatch: Inspect ${data.city_name || 'ward'} municipal drainage nodes.`,
    'Hydraulic Balancing: Verify detention basin sluice gates and bypass channels.',
    'Public Safety: Check automated underpass barrier sensors.',
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 text-[#F3F8FF] space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#285274]">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-[#25C5DC]">
              {t('nav.drainage', 'DRAINAGE NETWORK AI')}
            </span>
            <span className="rounded-full bg-[#102F50] border border-[#285274] px-2.5 py-0.5 text-[10px] font-bold text-[#8ED8F5]">
              {localizeCity(data.city_name || location.label.split(',')[0], lang)} Catchment
            </span>
            {isSimulated && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#F4BC4D]/40 bg-[#F4BC4D]/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#F4BC4D]">
                FAULT SIMULATED
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-[#F3F8FF]">
            Urban Stormwater Conduit &amp; Blockage Intelligence
          </h1>
          <p className="text-xs text-[#B6C9DC] mt-1">
            Real-time acoustic cross-correlation, hydraulic balancing, and SCS-CN urban runoff estimation for {data.city_name || 'local wards'}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSimulated(!simulated)}
          className={`rounded-2xl border px-4 py-2.5 text-xs font-bold shadow-lg transition-all flex items-center gap-2 ${
            simulated
              ? 'border-[#F06470]/60 bg-[#F06470]/20 text-[#F06470] hover:bg-[#F06470]/30 shadow-glow-red'
              : 'border-[#25C5DC]/60 bg-[#25C5DC]/10 text-[#25C5DC] hover:bg-[#25C5DC]/20 shadow-glow-cyan'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{simulated ? t('drainage.restoreNominal', 'Reset Nominal Hydraulic Flow') : t('drainage.simulateBlockage', 'Trigger Blocked-Drain Scenario')}</span>
        </button>
      </div>

      {/* Real-Time Sensor Readings Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {readings.map((reading) => {
          const Icon = reading.icon
          return (
            <div
              key={reading.label}
              className="rounded-3xl border border-[#285274] bg-[#12385C] p-5 shadow-xl flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#B6C9DC] font-bold">
                  {reading.label}
                </span>
                <Icon className="w-4 h-4 text-[#25C5DC]" />
              </div>
              <div className={`mt-3 text-3xl font-black ${reading.color} font-mono`}>
                {reading.value}
              </div>
              <div className="mt-2 text-xs font-medium text-[#B6C9DC]">
                {reading.status}
              </div>
            </div>
          )
        })}
      </div>

      {/* Hydraulic Balancing & Telemetry Status Card */}
      <div
        className={`rounded-3xl border-2 p-6 transition-all shadow-2xl ${
          isSimulated
            ? 'border-[#F06470]/60 bg-gradient-to-r from-[#F06470]/20 via-[#102F50] to-[#0E2B49]'
            : 'border-[#285274] bg-[#0E2B49]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#285274]">
          <div className="flex items-center gap-2">
            {isSimulated ? (
              <ShieldAlert className="h-5 w-5 text-[#F06470]" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-[#35C58B]" />
            )}
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#25C5DC]">
              {t('drainage.conduitStatus', 'Hydraulic Network Telemetry & Blockage Status')}
            </span>
          </div>
          <span className="text-[11px] text-[#B6C9DC]">
            {t('nav.sources', 'Source')}: {data.source || 'Municipal IoT Sensor Stream'}
          </span>
        </div>

        <p className="mt-4 text-base sm:text-lg font-bold text-[#F3F8FF]">
          {data.headline ||
            (isSimulated
              ? 'Blocked outfall detected: Water level is rising rapidly while flow velocity has dropped to near zero.'
              : 'Drainage network nominal: continuous acoustic flow and conduit level verification stable.')}
        </p>

        <div className="mt-3 rounded-2xl border border-[#285274] bg-[#071A33]/70 p-4 text-xs font-medium text-[#B6C9DC] leading-relaxed">
          {alertMessage}
        </div>

        {/* Contributing Factors & Runoff Summary */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#12385C] border border-[#285274]">
            <span className="text-[#B6C9DC] block text-[10px] uppercase font-bold">{t('dashboard.rainfall24h', 'Rainfall (24h)')}</span>
            <span className="text-sm font-black text-[#F3F8FF] font-mono">{formatNumber(data.rainfall_24h_mm ?? 0, { maximumFractionDigits: 1 })} mm</span>
          </div>
          <div className="p-3 rounded-xl bg-[#12385C] border border-[#285274]">
            <span className="text-[#B6C9DC] block text-[10px] uppercase font-bold">{t('dashboard.intensity', 'Rainfall Intensity')}</span>
            <span className="text-sm font-black text-[#F3F8FF] font-mono">{formatNumber(data.rainfall_intensity_mm_h ?? 0, { maximumFractionDigits: 1 })} mm/h</span>
          </div>
          <div className="p-3 rounded-xl bg-[#12385C] border border-[#285274]">
            <span className="text-[#B6C9DC] block text-[10px] uppercase font-bold">SCS Surface Runoff</span>
            <span className="text-sm font-black text-[#25C5DC] font-mono">{formatNumber(data.runoff_depth_mm ?? 0, { maximumFractionDigits: 1 })} mm</span>
          </div>
          <div className="p-3 rounded-xl bg-[#12385C] border border-[#285274]">
            <span className="text-[#B6C9DC] block text-[10px] uppercase font-bold">{t('risk.headline', 'Risk Assessment')}</span>
            <span className={`text-sm font-black ${isCritical ? 'text-[#F06470]' : 'text-[#35C58B]'}`}>
              {data.level ? t(`risk.${String(data.level).toLowerCase()}`, String(data.level)) : t('risk.low', 'Low')} ({formatDigits(data.risk_score ?? 15, lang)}/{formatDigits(100, lang)})
            </span>
          </div>
        </div>

        {/* Drainage Hotspots Mapping */}
        {hotspots.length > 0 && (
          <div className="mt-5 space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#25C5DC]">
              {t('drainage.hotspots', 'Culvert & Sump Hotspot Vulnerability Nodes')}
            </span>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {hotspots.map((hs: any) => (
                <div
                  key={hs.node}
                  className="rounded-2xl border border-[#285274] bg-[#12385C] p-3 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold text-[#8ED8F5] block">{hs.node}</span>
                    <span className="text-xs font-extrabold text-[#F3F8FF] block truncate max-w-[170px]">{hs.name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      hs.status === 'Critical' || hs.status === 'Blocked'
                        ? 'bg-[#F06470]/20 text-[#F06470] border border-[#F06470]/40'
                        : hs.status === 'Warning'
                        ? 'bg-[#F4BC4D]/20 text-[#F4BC4D] border border-[#F4BC4D]/40'
                        : 'bg-[#35C58B]/20 text-[#35C58B] border border-[#35C58B]/40'
                    }`}
                  >
                    {formatDigits(hs.capacity_pct, lang)}% Surcharge
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Protocol */}
        <div className="mt-5 rounded-2xl border border-[#285274] bg-[#12385C] p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#25C5DC]">
            <AlertTriangle className="h-4 w-4" />
            <span>{t('alerts.actionRequired', 'Recommended Mitigation Protocol')} ({isSimulated ? 'SIMULATED FAULT' : 'OPERATIONAL'})</span>
          </div>
          <div className="mt-3 space-y-2">
            {actions.map((action: string, idx: number) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-[#285274]/50 bg-[#071A33]/50 p-2.5 text-xs text-[#F3F8FF]"
              >
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#25C5DC]" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
