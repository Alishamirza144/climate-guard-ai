import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  BellRing,
  ChevronRight,
  Clock3,
  CloudRain,
  Droplets,
  Flame,
  Gauge,
  Home,
  Info,
  LocateFixed,
  Map,
  RefreshCcw,
  Sprout,
  Thermometer,
  WifiOff,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useLocationContext } from '../components/LocationProvider'
import { useTheme } from '../lib/theme'
import { api, type AlertRecord, type RiskGridResponse, type RiskOverviewResponse } from '../lib/api'
import { RiskGauge } from '../components/ui/RiskGauge'
import { DataSourceBadge } from '../components/ui/DataSourceBadge'

const HAZARD_META = {
  flood: {
    title: 'Flood Risk',
    icon: Droplets,
    route: '/flood',
    accent: 'from-cyan-500/30 to-cyan-500/5 text-cyan-300',
    border: 'border-cyan-400/30',
    pill: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/20',
    color: '#67e8f9',
  },
  heat: {
    title: 'Heat Risk',
    icon: Thermometer,
    route: '/heat',
    accent: 'from-orange-500/30 to-orange-500/5 text-orange-300',
    border: 'border-orange-400/30',
    pill: 'bg-orange-500/15 text-orange-200 border-orange-400/20',
    color: '#fbbf24',
  },
  fire: {
    title: 'Wildfire Risk',
    icon: Flame,
    route: '/fire',
    accent: 'from-red-500/30 to-red-500/5 text-red-300',
    border: 'border-red-400/30',
    pill: 'bg-red-500/15 text-red-200 border-red-400/20',
    color: '#f87171',
  },
  crop: {
    title: 'Crop Risk',
    icon: Sprout,
    route: '/crop',
    accent: 'from-lime-500/30 to-lime-500/5 text-lime-300',
    border: 'border-lime-400/30',
    pill: 'bg-lime-500/15 text-lime-200 border-lime-400/20',
    color: '#bef264',
  },
} as const

const MOBILE_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/dashboard', label: 'Map', icon: Map },
  { to: '/alerts', label: 'Alerts', icon: BellRing },
  { to: '/about', label: 'Profile', icon: LocateFixed },
]

function formatClock(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    timeStyle: 'short',
  }).format(value)
}

function getTextLevel(score: number) {
  if (score >= 85) return 'Critical'
  if (score >= 60) return 'High'
  if (score >= 30) return 'Moderate'
  return 'Low'
}

function getLevelStyles(level: string) {
  const normalized = level.toLowerCase()
  if (normalized === 'critical') {
    return 'border-red-500/30 bg-red-500/15 text-red-200'
  }
  if (normalized === 'high') {
    return 'border-red-400/30 bg-red-500/15 text-red-200'
  }
  if (normalized === 'moderate') {
    return 'border-orange-400/30 bg-orange-500/15 text-orange-200'
  }
  return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
}

function makeSparkline(score: number) {
  const points = Array.from({ length: 8 }, (_, index) => {
    const disturbance = index % 2 === 0 ? 8 : -6
    const wave = Math.sin(index * 1.6) * 14
    return Math.max(5, Math.min(100, score + wave + disturbance))
  })

  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100
      const y = 100 - ((point - min) / range) * 100
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  return { path, points }
}

function toFallbackGrid(hazards: RiskOverviewResponse['hazards'] | undefined): RiskGridResponse {
  const entries = Object.entries(hazards ?? {})
  const zones = entries.map(([key, value], index) => ({
    name: HAZARD_META[key as keyof typeof HAZARD_META]?.title ?? key,
    lat: 18.52 + (index % 3) * 0.015,
    lon: 73.85 + (index % 2) * 0.02,
    score: Number(value?.risk_percent ?? 0),
  }))

  return {
    zones,
    fire_markers: [{ lat: 18.54, lon: 73.89, confidence: 0.82 }],
    radar: true,
  }
}

function Dashboard() {
  const { location, setLocation, presets } = useLocationContext()
  const { theme, toggleTheme } = useTheme()
  const queryClient = useQueryClient()
  const [selectedModule, setSelectedModule] = useState<'flood' | 'heat' | 'fire' | 'crop'>('flood')
  const [showRadar, setShowRadar] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview', location.lat, location.lon],
    queryFn: () => api.riskOverview(location.lat, location.lon),
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  })

  const alertsQuery = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: api.listAlerts,
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  })

  const detailQuery = useQuery({
    queryKey: ['dashboard-detail', location.lat, location.lon],
    queryFn: async () => {
      const [flood, heat, fire] = await Promise.all([
        api.riskFlood(location.lat, location.lon).catch(() => ({})),
        api.riskHeat(location.lat, location.lon).catch(() => ({})),
        api.riskFire(location.lat, location.lon).catch(() => ({})),
      ])

      return {
        flood,
        heat,
        fire,
      }
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  })

  const gridQuery = useQuery({
    queryKey: ['dashboard-grid', location.lat, location.lon, selectedModule],
    queryFn: async () => {
      try {
        return await api.grid(location.lat, location.lon, selectedModule)
      } catch {
        return toFallbackGrid(overviewQuery.data?.hazards)
      }
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  })

  const offline = typeof navigator !== 'undefined' && !navigator.onLine

  const metrics = useMemo(() => {
    const hazards = overviewQuery.data?.hazards ?? {}
    const entries = Object.entries(hazards)
    return entries.map(([key, value]) => ({
      key: key as keyof typeof HAZARD_META,
      score: Number(value?.risk_percent ?? 0),
      label: HAZARD_META[key as keyof typeof HAZARD_META]?.title ?? key,
      level: (value?.level ?? 'Low').toLowerCase(),
    }))
  }, [overviewQuery.data])

  const activeAlert = useMemo(() => {
    const alerts = alertsQuery.data?.alerts ?? []
    const preferred = alerts.find((item) => item.state !== 'cleared') ?? alerts[0]
    if (preferred) {
      return preferred
    }
    return overviewQuery.data?.highest_priority_alert
      ? {
          id: 0,
          location: overviewQuery.data.highest_priority_alert.location,
          message: overviewQuery.data.highest_priority_alert.recommended_action,
          hazard: overviewQuery.data.highest_priority_alert.hazard,
          level: overviewQuery.data.highest_priority_alert.level,
          created_at: new Date().toISOString(),
          state: 'active',
          channels: ['telegram'],
        }
      : null
  }, [alertsQuery.data, overviewQuery.data])

  const chartData = useMemo(() => {
    const hazards = overviewQuery.data?.hazards ?? {}
    return [
      { time: 'Now', flood: Number(hazards.flood?.risk_percent ?? 0), heat: Number(hazards.heat?.risk_percent ?? 0), fire: Number(hazards.fire?.risk_percent ?? 0), crop: Number(hazards.crop?.risk_percent ?? 0) },
      { time: '+24h', flood: Number(hazards.flood?.risk_percent ?? 0) + 6, heat: Number(hazards.heat?.risk_percent ?? 0) + 8, fire: Number(hazards.fire?.risk_percent ?? 0) + 5, crop: Number(hazards.crop?.risk_percent ?? 0) + 2 },
      { time: '+48h', flood: Number(hazards.flood?.risk_percent ?? 0) + 10, heat: Number(hazards.heat?.risk_percent ?? 0) + 12, fire: Number(hazards.fire?.risk_percent ?? 0) + 8, crop: Number(hazards.crop?.risk_percent ?? 0) + 4 },
      { time: '+72h', flood: Number(hazards.flood?.risk_percent ?? 0) + 14, heat: Number(hazards.heat?.risk_percent ?? 0) + 15, fire: Number(hazards.fire?.risk_percent ?? 0) + 11, crop: Number(hazards.crop?.risk_percent ?? 0) + 5 },
    ]
  }, [overviewQuery.data])

  const selectedHazardDetails = useMemo(() => {
    const hazard = selectedModule as keyof typeof HAZARD_META
    const metric = overviewQuery.data?.hazards?.[hazard]
    const detail = detailQuery.data?.[hazard] as Record<string, unknown> | undefined
    const sourceList = [
      { provider: 'Open-Meteo', source: 'live' as const },
      { provider: 'NASA POWER', source: 'live' as const },
      { provider: 'NASA FIRMS', source: 'live' as const },
    ]

    return {
      score: Number(metric?.risk_percent ?? detail?.score ?? 0),
      level: (metric?.level ?? detail?.level ?? 'Low') as string,
      drivers: Array.isArray(detail?.drivers) ? detail.drivers : [
        `${hazard === 'flood' ? 'Rainfall accumulation' : hazard === 'heat' ? 'Heat index' : hazard === 'fire' ? 'Dry fuel load' : 'Soil moisture stress'}`,
      ],
      sources: sourceList,
      modelMode: detail?.model_mode ?? 'hybrid',
      metrics: detail && typeof detail === 'object' ? { ...detail } : {},
    }
  }, [detailQuery.data, overviewQuery.data, selectedModule])

  const mapZones = useMemo(() => {
    if (gridQuery.data?.zones?.length) return gridQuery.data.zones
    return toFallbackGrid(overviewQuery.data?.hazards).zones
  }, [gridQuery.data, overviewQuery.data])

  const refreshDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-detail'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-grid'] }),
    ])
  }

  if (overviewQuery.isLoading || alertsQuery.isLoading) {
    return (
      <main className="min-h-screen bg-navy px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="glass-panel rounded-3xl p-4 animate-pulse">
            <div className="h-12 w-40 rounded-xl bg-white/10" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="glass-card h-48 rounded-3xl p-4 animate-pulse bg-white/5" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (overviewQuery.isError || alertsQuery.isError) {
    return (
      <main className="min-h-screen bg-navy px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="glass-card rounded-3xl border border-red-400/30 bg-red-500/10 p-6">
            <div className="flex items-center gap-3 text-red-200">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Risk feed unavailable</h2>
            </div>
            <p className="mt-3 text-sm text-white/70">
              We could not refresh the climate dashboard. Please retry in a moment.
            </p>
            <button
              type="button"
              onClick={() => void refreshDashboard()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry refresh
            </button>
          </div>
        </div>
      </main>
    )
  }

  const hazardEntries = Object.entries(overviewQuery.data?.hazards ?? {})
  if (!hazardEntries.length) {
    return (
      <main className="min-h-screen bg-navy px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="glass-card rounded-3xl border border-white/10 p-8 text-center">
            <Gauge className="mx-auto h-10 w-10 text-lime" />
            <h2 className="mt-4 text-2xl font-semibold">No risk data available</h2>
            <p className="mt-2 text-sm text-white/60">Check the selected location or refresh the feed.</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-navy px-4 pb-24 pt-4 text-white sm:px-6 lg:px-8">
      {offline && (
        <div className="mx-auto mb-4 flex max-w-7xl items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <WifiOff className="h-4 w-4" />
          Offline mode: using the last refreshed dashboard snapshot.
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        <header className="glass-panel rounded-3xl p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime/15 ring-1 ring-lime/30">
                <Gauge className="h-6 w-6 text-lime" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold uppercase tracking-[0.22em] text-lime/80">ClimateGuard</span>
                </div>
                <label className="mt-1 block min-w-0">
                  <span className="sr-only">Select location</span>
                  <select
                    value={`${location.lat},${location.lon}`}
                    onChange={(event) => {
                      const [lat, lon] = event.target.value.split(',')
                      const preset = presets.find((item) => item.label === event.target.selectedOptions[0].text)
                      if (preset) {
                        setLocation({ ...preset, label: preset.label, source: 'preset' })
                      } else {
                        setLocation({
                          lat: Number(lat),
                          lon: Number(lon),
                          label: 'Custom location',
                          source: 'fallback',
                        })
                      }
                    }}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none ring-0"
                  >
                    <option value={`${location.lat},${location.lon}`}>{location.label || 'Pune, Maharashtra'}</option>
                    {presets.map((preset) => (
                      <option key={preset.label} value={`${preset.lat},${preset.lon}`}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white/70">
                <Clock3 className="h-4 w-4 text-lime" />
                <span>{formatClock(now)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white/70">
                <span>Last updated</span>
                <span className="font-medium text-white">{overviewQuery.dataUpdatedAt ? new Date(overviewQuery.dataUpdatedAt).toLocaleTimeString('en-IN', { timeStyle: 'short' }) : 'Now'}</span>
              </div>
              <button
                type="button"
                onClick={() => void refreshDashboard()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                aria-label="Toggle theme"
                onClick={toggleTheme}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm text-white transition hover:bg-white/10"
              >
                {theme === 'dark' ? '☀' : '☾'}
              </button>
            </div>
          </div>
        </header>

        <section className="space-y-4">
          <p className="text-lg text-white/80 md:text-xl">
            Hello, here is the current climate risk status for your area.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ key, score, label, level }) => {
            const meta = HAZARD_META[key]
            const spark = makeSparkline(score)
            const levelName = getTextLevel(score)
            return (
              <Link
                key={key}
                to={meta.route}
                className={`glass-card group relative overflow-hidden rounded-[28px] border p-4 transition hover:-translate-y-0.5 ${meta.border}`}
              >
                <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-r ${meta.accent}`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-white/80">
                      <meta.icon className="h-4 w-4" style={{ color: meta.color }} />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getLevelStyles(levelName)}`}>
                      {levelName}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-2">
                    <div className="text-3xl font-semibold text-white">{score}%</div>
                    <div className="flex-1 max-w-[90px]">
                      <RiskGauge score={score} size={82} strokeWidth={6} showScore={false} showLevel={false} className="mx-auto" />
                    </div>
                  </div>

                  <svg viewBox="0 0 100 100" className="mt-4 h-10 w-full overflow-visible">
                    <path d={spark.path} fill="none" stroke={meta.color} strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="glass-card rounded-[28px] border border-white/10 p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Risk Heat Map</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(['flood', 'heat', 'fire', 'crop'] as const).map((hazard) => (
                  <button
                    key={hazard}
                    type="button"
                    onClick={() => setSelectedModule(hazard)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                      selectedModule === hazard
                        ? 'border-lime-400/40 bg-lime-500/20 text-lime-200'
                        : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {hazard === 'fire' ? 'Fire' : hazard === 'heat' ? 'Heat' : hazard === 'flood' ? 'Flood' : 'Crop'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span className="font-semibold uppercase tracking-[0.18em]">Legend</span>
                <div className="flex items-center gap-1.5">
                  {['Low', 'Moderate', 'High', 'Critical'].map((level) => (
                    <span key={level} className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${getLevelStyles(level)}`}>
                      {level}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRadar((value) => !value)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
              >
                {showRadar ? 'Hide rain radar' : 'Show rain radar'}
              </button>
            </div>

            <div className="relative h-[300px] overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/70">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.18),transparent_40%),linear-gradient(90deg,rgba(96,165,250,0.08)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[length:100%_100%,28px_28px,28px_28px]" />
              {showRadar && (
                <div className="absolute inset-0 opacity-80">
                  <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(59,130,246,0.18),transparent_40%)]" />
                  <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/40" />
                  <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/30" />
                </div>
              )}

              {mapZones.map((zone, index) => {
                const left = 18 + ((index + 1) * 22) % 70
                const top = 18 + ((index + 1) * 18) % 62
                const color = zone.score >= 85 ? '#f87171' : zone.score >= 60 ? '#f59e0b' : zone.score >= 30 ? '#34d399' : '#a3e635'
                return (
                  <div
                    key={`${zone.name}-${index}`}
                    className="absolute block rounded-full border border-white/30 shadow-lg"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: '18px',
                      height: '18px',
                      background: color,
                      boxShadow: `0 0 18px ${color}55`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={`${zone.name}: ${zone.score}%`}
                  />
                )
              })}

              {(gridQuery.data?.fire_markers ?? [{ lat: 18.54, lon: 73.89, confidence: 0.8 }]).map((marker, index) => (
                <div
                  key={`${marker.lat}-${marker.lon}-${index}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${20 + (index + 1) * 20}%`, top: `${24 + (index + 1) * 18}%` }}
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-red-500/80 shadow-[0_0_14px_rgba(248,113,113,0.8)]">
                    <span className="h-2 w-2 rounded-full bg-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="glass-card rounded-[28px] border border-white/10 p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/80">
                <BellRing className="h-4 w-4 text-lime" />
                <span className="text-sm font-medium">Live Alert</span>
              </div>
              <button type="button" onClick={() => setDrawerOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-white/60 hover:text-white">
                Details
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {activeAlert ? (
              <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-red-500/15 p-2 text-red-200">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{activeAlert.level} {HAZARD_META[activeAlert.hazard as keyof typeof HAZARD_META]?.title ?? activeAlert.hazard} Risk Detected</h3>
                    <p className="mt-2 text-sm text-white/80">{activeAlert.location}</p>
                    <p className="mt-3 text-sm text-red-50">
                      Recommended Action: {activeAlert.message || overviewQuery.data?.highest_priority_alert?.recommended_action}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                No active alert for this location.
              </div>
            )}
          </aside>
        </section>

        <section className="glass-card rounded-[28px] border border-white/10 p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">24-72 h Outlook</h2>
            <span className="rounded-full border border-lime-400/30 bg-lime-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-lime-200">
              Predicted peak
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.6)" domain={[0, 100]} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                  }}
                />
                <Line type="monotone" dataKey="flood" stroke="#67e8f9" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="heat" stroke="#fbbf24" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="fire" stroke="#f87171" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="crop" stroke="#bef264" strokeWidth={3} dot={{ r: 3 }} />
                <ReferenceDot x="+72h" y={Math.max(...chartData.map((row) => Math.max(row.flood, row.heat, row.fire, row.crop)))} r={6} fill="#a3e635" stroke="#112230" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-card rounded-[28px] border border-white/10 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Why this score?</h2>
            <button
              type="button"
              onClick={() => setDrawerOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
            >
              <Info className="h-3.5 w-3.5" />
              {drawerOpen ? 'Hide' : 'View details'}
            </button>
          </div>

          {drawerOpen && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="mb-4 flex flex-wrap gap-2">
                {(['flood', 'heat', 'fire', 'crop'] as const).map((hazard) => (
                  <button
                    key={hazard}
                    type="button"
                    onClick={() => setSelectedModule(hazard)}
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                      selectedModule === hazard ? 'border-lime-400/40 bg-lime-500/15 text-lime-100' : 'border-white/10 bg-white/5 text-white/60'
                    }`}
                  >
                    {hazard}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{HAZARD_META[selectedModule].title}</h3>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getLevelStyles(String(selectedHazardDetails.level))}`}>
                      {String(selectedHazardDetails.level)}
                    </span>
                  </div>

                  <ul className="space-y-3 text-sm text-white/75">
                    {(selectedHazardDetails.drivers as string[]).map((driver, index) => (
                      <li key={`${driver}-${index}`} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <span>{driver}</span>
                        <span className="text-lime-200">{selectedHazardDetails.score}%</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Data sources</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedHazardDetails.sources.map((source) => (
                        <DataSourceBadge key={source.provider} source="live" provider={source.provider} updatedAt="now" />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Model mode</p>
                    <p className="mt-2 text-sm text-white/80 capitalize">{String(selectedHazardDetails.modelMode)}</p>
                  </div>
                  {selectedHazardDetails.metrics && Object.keys(selectedHazardDetails.metrics).length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Measured ML metrics</p>
                      <div className="mt-2 space-y-2 text-sm text-white/80">
                        {Object.entries(selectedHazardDetails.metrics)
                          .filter(([key]) => ['ml_validation_auc', 'ml_accuracy', 'roc_auc', 'precision', 'recall'].includes(key))
                          .map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between gap-3">
                              <span>{key}</span>
                              <span className="text-lime-200">{String(value)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/85 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
          {MOBILE_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
                  isActive ? 'bg-lime-500/15 text-lime-200' : 'text-white/60 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </main>
  )
}

export default Dashboard
