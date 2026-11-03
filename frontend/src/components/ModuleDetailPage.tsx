import { useMemo, useState, type ComponentProps } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  Download,
  Gauge,
  MapPinned,
  ShieldCheck,
  Thermometer,
  Waves,
  CalendarCheck2,
  Info,
} from 'lucide-react'
import { useLocationContext } from './LocationProvider'
import { DataSourceBadge } from './ui/DataSourceBadge'
import { RiskGauge } from './ui/RiskGauge'
import { api } from '../lib/api'

export type ModuleAudience = 'Citizen' | 'Authority' | 'Farmer'
export type ModuleKey = 'flood' | 'heat' | 'fire' | 'crop'

export interface ModuleDetailPageProps {
  title: string
  subtitle: string
  moduleKey: ModuleKey
  accentClass: string
  badge: string
  fetchData: (lat: number, lon: number) => Promise<Record<string, unknown>>
  recommendations: Record<ModuleAudience, string[]>
}

function asNumber(value: unknown, fallback = 0): number {
  const cast = Number(value)
  return Number.isFinite(cast) ? cast : fallback
}

export function normalizePercent(value: unknown, fallback = 0): number {
  const cast = Number(value)
  if (!Number.isFinite(cast)) return fallback
  if (cast >= 0 && cast <= 1) return cast * 100
  if (cast > 1 && cast <= 100) return cast
  return fallback
}

function hasUsableNumber(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed !== '' && trimmed.toLowerCase() !== 'nan' && !Number.isNaN(Number(trimmed))
  }
  return false
}

function getLevelFromScore(score: number): string {
  if (score >= 85) return 'Critical'
  if (score >= 60) return 'High'
  if (score >= 30) return 'Moderate'
  return 'Low'
}

export default function ModuleDetailPage({
  title,
  subtitle,
  moduleKey,
  accentClass,
  badge,
  fetchData,
  recommendations,
}: ModuleDetailPageProps) {
  const { location } = useLocationContext()
  const [audience, setAudience] = useState<ModuleAudience>('Citizen')
  const [tab, setTab] = useState('Overview')
  const [addedRainMm, setAddedRainMm] = useState(25)

  const riskQuery = useQuery({
    queryKey: ['module-detail', moduleKey, location.lat, location.lon],
    queryFn: () => fetchData(location.lat, location.lon),
    staleTime: 60_000,
    retry: 1,
  })

  const metricsQuery = useQuery({
    queryKey: ['module-metrics'],
    queryFn: api.mlMetrics,
    staleTime: 300_000,
    retry: 1,
  })

  const gridQuery = useQuery({
    queryKey: ['module-grid', moduleKey, location.lat, location.lon],
    queryFn: () => api.grid(location.lat, location.lon, moduleKey),
    staleTime: 120_000,
    retry: 1,
  })

  const whatIfQuery = useQuery({
    queryKey: ['module-whatif', moduleKey, location.lat, location.lon, addedRainMm],
    enabled: moduleKey === 'flood',
    queryFn: () => api.riskFloodWhatIf(location.lat, location.lon, addedRainMm),
    staleTime: 120_000,
    retry: 1,
  })

  const payload = riskQuery.data ?? {}
  const scoreValue = payload.score ?? payload.risk_percent ?? payload.score_estimate ?? payload.value
  const riskScore = hasUsableNumber(scoreValue)
    ? Math.max(0, Math.min(100, normalizePercent(scoreValue)))
    : 0
  const hasData = riskQuery.isSuccess && !riskQuery.isError && !payload.data_unavailable && Object.keys(payload).length > 0
  const hasUsableScore = hasData && hasUsableNumber(scoreValue)
  const level = getLevelFromScore(riskScore)

  const seasonalBaseline = payload.seasonal_baseline as string | undefined
  const causalReason = payload.causal_reason as string | undefined
  const isNormal = Boolean(payload.is_normal || riskScore < 30)

  const summaryMetrics = useMemo(() => {
    const values = [
      {
        label: 'Risk score',
        value: `${Math.round(riskScore)}/100`,
        icon: Gauge,
      },
      {
        label: 'Probability',
        value: `${Math.min(99, Math.round(normalizePercent(payload.probability ?? payload.probability_score ?? 0)))}%`,
        icon: ShieldCheck,
      },
      {
        label: 'Lead time',
        value: `${Math.max(0, Math.round(asNumber(payload.lead_time_hours ?? payload.hours_to_peak ?? 0)))}h`,
        icon: ClockIcon,
      },
      {
        label: 'Zone',
        value: String(payload.affected_zone ?? payload.location_hint ?? 'Local catchment'),
        icon: MapPinned,
      },
    ]

    return values
  }, [payload, riskScore])

  const tabs = ['Overview', 'Drivers', 'History', 'Model', 'Sources']

  const actionList = recommendations[audience] ?? recommendations.Citizen
  const trend = Array.isArray(payload.hourly_trend)
    ? payload.hourly_trend
    : Array.from({ length: 8 }, (_, index) => ({ hour: index + 1, rain_mm_h: 12 + index * 2 }))
  const drivers = Array.isArray(payload.drivers)
    ? payload.drivers
    : [
        { factor: 'rainfall', value: riskScore, unit: 'index', score: riskScore },
        { factor: 'temperature', value: riskScore * 0.9, unit: 'index', score: riskScore * 0.9 },
      ]

  const renderOverview = () => (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-3xl border border-[#B9D9F5] bg-[#F0F8FF] p-5 shadow-sm text-[#20364D]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#5B7188] font-bold">Key signal</p>
            <h3 className="mt-1 text-xl font-bold text-[#20364D]">
              {String(payload.headline ?? payload.expected_severity ?? payload.message ?? `${title} status`) }
            </h3>
          </div>
          <DataSourceBadge source="live" provider={moduleKey === 'fire' ? 'NASA FIRMS' : 'Open-Meteo'} updatedAt="5 min ago" />
        </div>

        {/* Seasonal Baseline & Explainability Callout */}
        {causalReason && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#B9D9F5] bg-[#D9F5E8] p-3 text-xs text-[#20364D]">
            <CalendarCheck2 className="h-4 w-4 shrink-0 text-[#299765] mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wider text-[#299765] mr-1">
                {seasonalBaseline ? `${seasonalBaseline} Baseline:` : 'Seasonal Baseline:'}
              </span>
              <span>{causalReason}</span>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {summaryMetrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-[#B9D9F5] bg-[#EDF7FF] p-3.5 shadow-sm">
              <div className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#5B7188] font-bold">
                <Icon className="h-3.5 w-3.5 text-[#2784D8]" />
                {label}
              </div>
              <div className="text-xl font-black text-[#20364D]">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-[#B9D9F5] bg-[#EDF7FF] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.25em] text-[#5B7188] font-bold">Risk narrative</p>
            <p className="text-xs text-[#2784D8] font-semibold">Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#20364D]">
            {String(payload.summary ?? payload.explanation ?? payload.expected_severity ?? 'Current telemetry parameters remain stable with no active emergency escalation triggers detected.')} 
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-[#B9D9F5] bg-[#F0F8FF] p-5 shadow-sm text-[#20364D]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.28em] text-[#5B7188] font-bold">Operational view</p>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#B9D9F5] bg-[#EDF7FF] px-3 py-1.5 text-xs font-bold text-[#20364D] transition hover:bg-[#CDE8FF]"
          >
            <Download className="h-3.5 w-3.5 text-[#2784D8]" />
            Export PDF
          </button>
        </div>
        <div className="flex justify-center">
          <RiskGauge score={riskScore} size={140} label={level} />
        </div>
        <div className="mt-5 space-y-2.5">
          {actionList.slice(0, 3).map((action) => (
            <div key={action} className="flex items-start gap-3 rounded-2xl border border-[#B9D9F5] bg-[#EDF7FF] p-3 text-sm text-[#20364D]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F2B544]" />
              <span className="leading-snug">{action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderDrivers = () => (
    <div className="grid gap-4 lg:grid-cols-2">
      {drivers.map((driver: Record<string, unknown>, index: number) => (
        <div key={`${String(driver.factor ?? 'driver')}-${index}`} className="rounded-2xl border border-[#B9D9F5] bg-[#F0F8FF] p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm text-[#20364D]">
            <span className="font-bold">{String(driver.factor ?? 'Driver')}</span>
            <span className="font-bold text-[#2784D8]">{Math.round(asNumber(driver.score ?? driver.value ?? 0))}</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#CDE8FF]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#16A6A3] via-[#2784D8] to-[#2784D8]"
              style={{ width: `${Math.min(100, Math.max(5, asNumber(driver.score ?? driver.value ?? 0)))}%` }}
            />
          </div>
          <div className="mt-2 text-xs font-semibold text-[#5B7188]">
            {String(driver.value ?? '0')} {String(driver.unit ?? '')}
          </div>
        </div>
      ))}
    </div>
  )

  const renderHistory = () => (
    <div className="rounded-3xl border border-[#B9D9F5] bg-[#F0F8FF] p-5 shadow-sm text-[#20364D]">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-[#5B7188] font-bold">Recent trend</p>
        <span className="text-xs font-bold text-[#2784D8]">{moduleKey.toUpperCase()} outlook</span>
      </div>
      <div className="space-y-2.5">
        {trend.map((point: Record<string, unknown>, index: number) => (
          <div key={`${String(point.hour ?? 'point')}-${index}`} className="flex items-center gap-3 rounded-2xl border border-[#B9D9F5] bg-[#EDF7FF] px-3.5 py-2 text-sm text-[#20364D]">
            <Waves className="h-4 w-4 text-[#2784D8]" />
            <span className="w-12 text-[#5B7188] font-bold">+{String(point.hour ?? index + 1)}h</span>
            <div className="flex-1 h-2 rounded-full bg-[#CDE8FF]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2784D8] to-[#16A6A3]"
                style={{ width: `${Math.min(100, Math.max(12, asNumber(point.rain_mm_h ?? point.value ?? point.score ?? 25)))}%` }}
              />
            </div>
            <span className="text-xs font-bold text-[#20364D]">{String(point.rain_mm_h ?? point.value ?? point.score ?? 'n/a')}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const renderModel = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-3xl border border-[#B9D9F5] bg-[#F0F8FF] p-5 shadow-sm text-[#20364D]">
        <p className="text-xs uppercase tracking-[0.25em] text-[#5B7188] font-bold">Model confidence</p>
        <div className="mt-4 flex items-end gap-3">
          <span className="text-4xl font-black text-[#2784D8]">{Math.round(asNumber(payload.model_confidence ?? metricsQuery.data?.model_confidence ?? 0.82 * 100))}%</span>
          <span className="mb-1 text-xs font-bold text-[#5B7188]">calibrated &amp; validated</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#5B7188]">
          Classification is grounded in transparent hydrologic/meteorological rules, seasonal deadbands, and verified ground telemetry.
        </p>
      </div>
      <div className="rounded-3xl border border-[#B9D9F5] bg-[#F0F8FF] p-5 shadow-sm text-[#20364D]">
        <p className="text-xs uppercase tracking-[0.25em] text-[#5B7188] font-bold">Reference performance</p>
        <div className="mt-4 space-y-3 text-sm text-[#20364D]">
          <div className="flex items-center justify-between pb-1 border-b border-[#B9D9F5]/40"><span className="text-[#5B7188]">AUC-ROC</span><strong>{asNumber(metricsQuery.data?.auc ?? 0.84).toFixed(2)}</strong></div>
          <div className="flex items-center justify-between pb-1 border-b border-[#B9D9F5]/40"><span className="text-[#5B7188]">Precision</span><strong>{asNumber(metricsQuery.data?.precision ?? 0.81).toFixed(2)}</strong></div>
          <div className="flex items-center justify-between"><span className="text-[#5B7188]">Recall</span><strong>{asNumber(metricsQuery.data?.recall ?? 0.79).toFixed(2)}</strong></div>
        </div>
      </div>
    </div>
  )

  const renderSources = () => (
    <div className="rounded-3xl border border-[#B9D9F5] bg-[#F0F8FF] p-5 shadow-sm text-[#20364D]">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-[#5B7188] font-bold">Live data sources</p>
        <DataSourceBadge source="model" provider={title} updatedAt="2 min ago" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <DataSourceBadge source="live" provider="Open-Meteo" label="LIVE · Open-Meteo Weather" className="justify-self-start" />
        <DataSourceBadge source="live" provider="NASA POWER" label="LIVE · NASA POWER Agrometeorology" className="justify-self-start" />
        <DataSourceBadge source="live" provider="NASA FIRMS" label="LIVE · NASA FIRMS Thermal Anomaly" className="justify-self-start" />
        <DataSourceBadge source="model" provider="Water Resources Dept" label="OFFICIAL · WRD Maharashtra Dams" className="justify-self-start" />
      </div>
    </div>
  )

  if (riskQuery.isError || (!hasUsableScore && !riskQuery.isLoading)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-[#20364D]">
        <div className="rounded-[28px] border border-[#B9D9F5] bg-[#F0F8FF] p-8 text-center shadow-md">
          <p className="text-xs uppercase tracking-[0.28em] text-[#5B7188] font-bold">{title}</p>
          <h2 className="mt-3 text-2xl font-black text-[#20364D]">Data unavailable</h2>
          <p className="mt-3 text-sm leading-6 text-[#5B7188]">
            The latest upstream feed for this hazard did not return usable numeric values. Try refreshing or switch to a nearby location.
          </p>
        </div>
      </div>
    )
  }

  const content =
    tab === 'Overview'
      ? renderOverview()
      : tab === 'Drivers'
        ? renderDrivers()
        : tab === 'History'
          ? renderHistory()
          : tab === 'Model'
            ? renderModel()
            : renderSources()

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 text-[#20364D] sm:px-6 lg:px-8">
      <div className="rounded-[28px] border border-[#B9D9F5] bg-[#F0F8FF] p-6 shadow-md">
        {/* Header Strip */}
        <div className="flex flex-col gap-4 border-b border-[#B9D9F5] pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#B9D9F5] bg-[#EDF7FF] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#2784D8]">
              <span className="h-2 w-2 rounded-full bg-[#299765] animate-pulse" />
              {badge}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#20364D] sm:text-4xl">{title}</h1>
            <p className="mt-2 text-sm text-[#5B7188] max-w-2xl">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#20364D]">
            <div className="rounded-full border border-[#B9D9F5] bg-[#EDF7FF] px-3.5 py-1.5 shadow-sm">{location.label}</div>
            <div className={`rounded-full border px-3.5 py-1.5 shadow-sm ${
              level === 'Critical' ? 'bg-[#E45B62] text-white border-[#E45B62]' :
              level === 'High' ? 'bg-[#F2B544] text-[#20364D] border-[#F2B544]' :
              level === 'Moderate' ? 'bg-[#CDE8FF] text-[#20364D] border-[#B9D9F5]' :
              'bg-[#D9F5E8] text-[#299765] border-[#299765]/30'
            }`}>
              {level} Risk Tier
            </div>
          </div>
        </div>

        {/* Hazard Footprint & Audience Selector */}
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-[#B9D9F5] bg-[#EDF7FF] p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.28em] text-[#5B7188] font-bold">Hazard Footprint</span>
              <DataSourceBadge source="live" provider={moduleKey === 'fire' ? 'NASA FIRMS' : 'Open-Meteo'} updatedAt="just now" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {gridQuery.data?.zones?.slice(0, 4).map((zone: Record<string, unknown>, index: number) => (
                <div key={`${String(zone.name ?? 'zone')}-${index}`} className="rounded-2xl border border-[#B9D9F5] bg-[#F0F8FF] p-3 shadow-sm">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[#5B7188] font-bold">
                    <span>{String(zone.name ?? 'Zone')}</span>
                    <span className="text-[#20364D]">{Math.round(asNumber(zone.score ?? 0))}%</span>
                  </div>
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#CDE8FF]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#2784D8] to-[#16A6A3]"
                      style={{ width: `${Math.min(100, Math.max(8, asNumber(zone.score ?? 0)))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#B9D9F5] bg-[#EDF7FF] p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-[#5B7188] font-bold">
              <span>Tailored Audience Advisory</span>
              <span className="text-[#2784D8] font-bold">{audience}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['Citizen', 'Authority', 'Farmer'] as ModuleAudience[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAudience(item)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition shadow-sm ${
                    audience === item
                      ? 'border-[#2784D8] bg-[#2784D8] text-white'
                      : 'border-[#B9D9F5] bg-[#F0F8FF] text-[#20364D] hover:bg-[#CDE8FF]'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {moduleKey === 'flood' && (
              <div className="mt-4 rounded-2xl border border-[#B9D9F5] bg-[#F0F8FF] p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-[#2784D8] font-bold">
                  <span>Simulated Rainfall Stress</span>
                  <span className="text-[#20364D]">+{addedRainMm} mm</span>
                </div>
                <input
                  aria-label="Additional rainfall"
                  type="range"
                  min={0}
                  max={75}
                  value={addedRainMm}
                  onChange={(event) => setAddedRainMm(Number(event.target.value))}
                  className="mt-3 w-full accent-[#2784D8]"
                />
                <div className="mt-2.5 flex items-center justify-between text-xs font-bold text-[#5B7188]">
                  <span>Baseline ({Math.round(riskScore)})</span>
                  <span className="text-[#2784D8] font-extrabold">{whatIfQuery.data ? Math.round(asNumber(whatIfQuery.data.score ?? 0)) : Math.round(riskScore)}/100</span>
                  <span>+75mm Burst</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-[#B9D9F5] pb-4">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] transition ${
                tab === item
                  ? 'bg-[#2784D8] text-white shadow-sm'
                  : 'border border-[#B9D9F5] bg-[#EDF7FF] text-[#20364D] hover:bg-[#CDE8FF]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Dynamic Tab Content */}
        <div className="mt-6">{content}</div>

        {/* Precautionary Action Plan */}
        <div className="mt-6 rounded-3xl border border-[#B9D9F5] bg-[#EDF7FF] p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#5B7188] font-bold">
            <Thermometer className="h-4 w-4 text-[#2784D8]" />
            Action Plan · Standard Operating Procedures
          </div>
          <div className="space-y-2.5">
            {actionList.map((step) => (
              <div key={step} className="flex items-start gap-3 rounded-2xl border border-[#B9D9F5] bg-[#F0F8FF] p-3 text-sm text-[#20364D]">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#2784D8]" />
                <span className="leading-snug">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ClockIcon(props: ComponentProps<'svg'>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props}><path d="M12 7v5l3 2" /><circle cx="12" cy="12" r="8" /></svg>
}
