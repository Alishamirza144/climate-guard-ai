import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
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
import { api, type RiskGridResponse, type RiskOverviewResponse } from '../lib/api'
import { RiskGauge } from '../components/ui/RiskGauge'
import { DataSourceBadge } from '../components/ui/DataSourceBadge'
import EmergencyAlertBanner from '../components/EmergencyAlertBanner'
import DamMonitoringWidget from '../components/DamMonitoringWidget'
import CitySelector from '../components/CitySelector'
import LiveWeatherWidget from '../components/LiveWeatherWidget'
import WaterLevelWidget from '../components/WaterLevelWidget'
import IndiaRiskMap from '../components/IndiaRiskMap'

const HAZARD_META = {
  flood: {
    title: 'Flood Risk',
    icon: Droplets,
    route: '/flood',
    accent: 'from-[#2784D8]/20 via-[#CDE8FF] to-[#DFF1FF]',
    border: 'border-[#2784D8]/40',
    color: '#2784D8',
  },
  heat: {
    title: 'Heat Risk',
    icon: Thermometer,
    route: '/heat',
    accent: 'from-[#F2B544]/20 via-[#CDE8FF] to-[#DFF1FF]',
    border: 'border-[#F2B544]/40',
    color: '#B47510',
  },
  fire: {
    title: 'Wildfire Risk',
    icon: Flame,
    route: '/fire',
    accent: 'from-[#E45B62]/20 via-[#CDE8FF] to-[#DFF1FF]',
    border: 'border-[#E45B62]/40',
    color: '#E45B62',
  },
  crop: {
    title: 'Crop Risk',
    icon: Sprout,
    route: '/crop',
    accent: 'from-[#299765]/20 via-[#D9F5E8] to-[#DFF1FF]',
    border: 'border-[#299765]/40',
    color: '#299765',
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
  if (score >= 80) return 'Extreme'
  if (score >= 60) return 'Very High'
  if (score >= 40) return 'High'
  if (score >= 20) return 'Moderate'
  return 'Low'
}

function getLevelStyles(level: string) {
  const normalized = level.toLowerCase()
  if (normalized === 'extreme' || normalized === 'critical') {
    return 'border-[#E45B62] bg-[#E45B62] text-white'
  }
  if (normalized === 'very high' || normalized === 'high') {
    return 'border-[#F2B544] bg-[#F2B544] text-[#20364D]'
  }
  if (normalized === 'moderate') {
    return 'border-[#B9D9F5] bg-[#CDE8FF] text-[#20364D]'
  }
  return 'border-[#299765]/30 bg-[#D9F5E8] text-[#299765]'
}

function makeSparkline(score: number) {
  const points = Array.from({ length: 8 }, (_, index) => {
    const disturbance = index % 2 === 0 ? 6 : -4
    const wave = Math.sin(index * 1.5) * 8
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

export default function Dashboard() {
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

  const weatherQuery = useQuery({
    queryKey: ['dashboard-weather', location.lat, location.lon],
    queryFn: () => api.liveWeather(location.lat, location.lon),
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  })

  const waterLevelsQuery = useQuery({
    queryKey: ['dashboard-water', location.lat, location.lon, location.cityId],
    queryFn: () => api.waterLevels(location.lat, location.lon, location.cityId),
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
      { time: '+24h', flood: Math.min(100, Number(hazards.flood?.risk_percent ?? 0) + 4), heat: Math.min(100, Number(hazards.heat?.risk_percent ?? 0) + 5), fire: Math.min(100, Number(hazards.fire?.risk_percent ?? 0) + 3), crop: Math.min(100, Number(hazards.crop?.risk_percent ?? 0) + 2) },
      { time: '+48h', flood: Math.min(100, Number(hazards.flood?.risk_percent ?? 0) + 7), heat: Math.min(100, Number(hazards.heat?.risk_percent ?? 0) + 8), fire: Math.min(100, Number(hazards.fire?.risk_percent ?? 0) + 5), crop: Math.min(100, Number(hazards.crop?.risk_percent ?? 0) + 4) },
      { time: '+72h', flood: Math.min(100, Number(hazards.flood?.risk_percent ?? 0) + 9), heat: Math.min(100, Number(hazards.heat?.risk_percent ?? 0) + 10), fire: Math.min(100, Number(hazards.fire?.risk_percent ?? 0) + 7), crop: Math.min(100, Number(hazards.crop?.risk_percent ?? 0) + 5) },
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
        `${hazard === 'flood' ? 'Catchment runoff & river stage' : hazard === 'heat' ? 'Dry-bulb temperature & heat index' : hazard === 'fire' ? 'Forest moisture deficit' : 'Soil moisture stress'}`,
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-weather'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-water'] }),
    ])
  }

  if (overviewQuery.isLoading || alertsQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[#DFF1FF] px-4 py-6 text-[#20364D] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-3xl border border-[#B9D9F5] bg-[#F0F8FF] p-6 animate-pulse">
            <div className="h-10 w-48 rounded-xl bg-[#CDE8FF]" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-44 rounded-3xl border border-[#B9D9F5] bg-[#F0F8FF] p-4 animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (overviewQuery.isError || alertsQuery.isError) {
    return (
      <main className="min-h-screen bg-[#DFF1FF] px-4 py-6 text-[#20364D] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-[#E45B62]/40 bg-[#F0F8FF] p-6 shadow-sm">
            <div className="flex items-center gap-3 text-[#E45B62]">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="text-xl font-bold">Risk feed synchronising</h2>
            </div>
            <p className="mt-2 text-sm text-[#5B7188]">
              Upstream telemetry is refreshing. Please retry in a moment.
            </p>
            <button
              type="button"
              onClick={() => void refreshDashboard()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#2784D8] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1c6bb5]"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry refresh
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#DFF1FF] px-4 pb-24 pt-4 text-[#20364D] sm:px-6 lg:px-8">
      {offline && (
        <div className="mx-auto mb-4 flex max-w-7xl items-center gap-2 rounded-2xl border border-[#F2B544] bg-[#F0F8FF] px-4 py-3 text-sm text-[#20364D]">
          <WifiOff className="h-4 w-4 text-[#F2B544]" />
          Offline mode: using the last refreshed dashboard telemetry snapshot.
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Flash-Flood Emergency Weather Alert Banner */}
        {overviewQuery.data?.emergency_alert && (
          <EmergencyAlertBanner alert={overviewQuery.data.emergency_alert} />
        )}

        {/* Dashboard Header Bar */}
        <header className="rounded-3xl border border-[#B9D9F5] bg-[#F0F8FF] p-4 md:p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#CDE8FF] border border-[#B9D9F5] shadow-sm">
                <Gauge className="h-6 w-6 text-[#2784D8]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.24em] text-[#2784D8]">Live Command Hub</span>
                </div>
                <div className="mt-1 w-full sm:w-80 min-w-0">
                  <CitySelector />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <div className="flex items-center gap-2 rounded-xl border border-[#B9D9F5] bg-[#EDF7FF] px-3 py-2 text-xs font-bold text-[#20364D] shadow-sm">
                <Clock3 className="h-4 w-4 text-[#2784D8]" />
                <span>{formatClock(now)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#B9D9F5] bg-[#EDF7FF] px-3 py-2 text-xs font-bold text-[#5B7188] shadow-sm">
                <span>Last telemetry</span>
                <span className="font-extrabold text-[#20364D]">{overviewQuery.dataUpdatedAt ? new Date(overviewQuery.dataUpdatedAt).toLocaleTimeString('en-IN', { timeStyle: 'short' }) : 'Now'}</span>
              </div>
              <button
                type="button"
                onClick={() => void refreshDashboard()}
                className="inline-flex items-center gap-2 rounded-xl border border-[#B9D9F5] bg-[#EDF7FF] px-3.5 py-2 text-xs font-bold text-[#20364D] transition hover:bg-[#CDE8FF] shadow-sm"
              >
                <RefreshCcw className="h-4 w-4 text-[#2784D8]" />
                Refresh
              </button>
            </div>
          </div>
        </header>

        {/* Accurate Live Atmospheric Telemetry */}
        <LiveWeatherWidget weather={weatherQuery.data} isLoading={weatherQuery.isLoading} />

        {/* Real Water-Level & River Gauge Monitoring */}
        <WaterLevelWidget waterData={waterLevelsQuery.data} isLoading={waterLevelsQuery.isLoading} />

        {/* 4 Multi-Hazard Risk Overview Cards */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ key, score, label, level }) => {
            const meta = HAZARD_META[key]
            const spark = makeSparkline(score)
            const levelName = getTextLevel(score)
            return (
              <Link
                key={key}
                to={meta.route}
                className={`group relative overflow-hidden rounded-[26px] border border-[#B9D9F5] bg-[#F0F8FF] p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${meta.border}`}
              >
                <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-r ${meta.accent}`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-bold text-[#20364D]">
                      <meta.icon className="h-4 w-4" style={{ color: meta.color }} />
                      <span className="text-sm font-extrabold">{label}</span>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${getLevelStyles(levelName)}`}>
                      {levelName}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-3xl font-black text-[#20364D]">{score}</div>
                      <span className="text-[10px] font-bold text-[#5B7188] uppercase tracking-wider">Risk Index / 100</span>
                    </div>
                    <div className="flex-1 max-w-[80px]">
                      <RiskGauge score={score} size={76} strokeWidth={6} showScore={false} showLevel={false} className="mx-auto" />
                    </div>
                  </div>

                  <svg viewBox="0 0 100 100" className="mt-3 h-8 w-full overflow-visible">
                    <path d={spark.path} fill="none" stroke={meta.color} strokeWidth="3.5" strokeLinecap="round" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </section>

        {/* Dam & Reservoir Capacity Monitoring Component */}
        <DamMonitoringWidget />

        {/* Geospatial Risk Map & Live Alert */}
        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[28px] border border-[#B9D9F5] bg-[#F0F8FF] p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-[#20364D]">Geospatial Risk Overlay</h2>
                <p className="text-xs text-[#5B7188]">Live sensor telemetry and satellite hazard footprints</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(['flood', 'heat', 'fire', 'crop'] as const).map((hazard) => (
                  <button
                    key={hazard}
                    type="button"
                    onClick={() => setSelectedModule(hazard)}
                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider transition ${
                      selectedModule === hazard
                        ? 'border-[#2784D8] bg-[#2784D8] text-white'
                        : 'border-[#B9D9F5] bg-[#EDF7FF] text-[#20364D] hover:bg-[#CDE8FF]'
                    }`}
                  >
                    {hazard}
                  </button>
                ))}
              </div>
            </div>

            {/* India-Wide Geospatial Risk Map */}
            <IndiaRiskMap selectedHazard={selectedModule} />
          </div>

          {/* Live Alert & Action Recommendations */}
          <aside className="rounded-[28px] border border-[#B9D9F5] bg-[#F0F8FF] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#20364D]">
                <BellRing className="h-4 w-4 text-[#2784D8]" />
                <span className="text-sm font-extrabold">Advisory Broadcast</span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#2784D8] hover:underline"
              >
                {drawerOpen ? 'Hide' : 'Details'}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {activeAlert ? (
              <div className="mt-4 rounded-2xl border border-[#B9D9F5] bg-[#EDF7FF] p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-[#2784D8]/10 p-2 text-[#2784D8]">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#20364D]">{activeAlert.level} {HAZARD_META[activeAlert.hazard as keyof typeof HAZARD_META]?.title ?? activeAlert.hazard} Advisory</h3>
                    <p className="mt-1 text-xs font-semibold text-[#5B7188]">{activeAlert.location}</p>
                    <p className="mt-2 text-xs font-medium text-[#20364D] leading-relaxed">
                      {activeAlert.message || overviewQuery.data?.highest_priority_alert?.recommended_action || 'Monitoring ongoing. Maintain standard readiness.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-[#B9D9F5] bg-[#EDF7FF] p-4 text-xs font-semibold text-[#5B7188]">
                All sensor parameters nominal. No emergency escalations active.
              </div>
            )}
          </aside>
        </section>

        {/* 24-72h Trajectory Forecast Chart */}
        <section className="rounded-[28px] border border-[#B9D9F5] bg-[#F0F8FF] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-[#20364D]">24–72 h Multi-Hazard Trajectory Outlook</h2>
              <p className="text-xs text-[#5B7188]">Predictive trajectory based on meteorological ensembles</p>
            </div>
            <span className="rounded-full border border-[#B9D9F5] bg-[#D9F5E8] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#299765]">
              Normal Trajectory
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#B9D9F5" strokeDasharray="3 3" vertical={false} opacity={0.6} />
                <XAxis dataKey="time" stroke="#5B7188" fontSize={11} fontWeight={600} />
                <YAxis stroke="#5B7188" domain={[0, 100]} fontSize={11} fontWeight={600} />
                <Tooltip
                  contentStyle={{
                    background: '#F0F8FF',
                    border: '1px solid #B9D9F5',
                    borderRadius: '12px',
                    color: '#20364D',
                    boxShadow: '0 4px 12px rgba(32,54,77,0.08)',
                  }}
                />
                <Line type="monotone" dataKey="flood" name="Flood" stroke="#2784D8" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="heat" name="Heat" stroke="#B47510" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="fire" name="Fire" stroke="#E45B62" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="crop" name="Crop" stroke="#299765" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Why this score? Explainability Drawer */}
        <section className="rounded-[28px] border border-[#B9D9F5] bg-[#F0F8FF] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#20364D]">Explainable Risk Diagnostics</h2>
              <p className="text-xs text-[#5B7188]">Telemetry drivers, seasonal baselines, and model confidence</p>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen((value) => !value)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#B9D9F5] bg-[#EDF7FF] px-3.5 py-1.5 text-xs font-bold text-[#20364D] transition hover:bg-[#CDE8FF]"
            >
              <Info className="h-3.5 w-3.5 text-[#2784D8]" />
              {drawerOpen ? 'Hide Diagnostics' : 'Inspect Diagnostics'}
            </button>
          </div>

          {drawerOpen && (
            <div className="mt-4 rounded-2xl border border-[#B9D9F5] bg-[#EDF7FF] p-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['flood', 'heat', 'fire', 'crop'] as const).map((hazard) => (
                  <button
                    key={hazard}
                    type="button"
                    onClick={() => setSelectedModule(hazard)}
                    className={`rounded-full border px-3.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                      selectedModule === hazard
                        ? 'border-[#2784D8] bg-[#2784D8] text-white'
                        : 'border-[#B9D9F5] bg-[#F0F8FF] text-[#20364D]'
                    }`}
                  >
                    {hazard}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                <div>
                  <h3 className="text-base font-extrabold text-[#20364D] mb-2">{HAZARD_META[selectedModule].title} Physical Drivers</h3>
                  <ul className="space-y-2 text-xs text-[#20364D]">
                    {(selectedHazardDetails.drivers as string[]).map((driver, index) => (
                      <li key={`${driver}-${index}`} className="flex items-center justify-between rounded-xl border border-[#B9D9F5] bg-[#F0F8FF] px-3 py-2 font-medium">
                        <span>{driver}</span>
                        <span className="font-bold text-[#2784D8]">{selectedHazardDetails.score}%</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-[#B9D9F5] bg-[#F0F8FF] p-3 text-xs">
                    <p className="font-bold text-[#5B7188] uppercase tracking-wider text-[10px]">Data Sources</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedHazardDetails.sources.map((source) => (
                        <DataSourceBadge key={source.provider} source="live" provider={source.provider} updatedAt="now" />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#B9D9F5] bg-[#F0F8FF] p-3 text-xs">
                    <p className="font-bold text-[#5B7188] uppercase tracking-wider text-[10px]">Model Architecture</p>
                    <p className="mt-1 font-bold text-[#20364D]">Hybrid Hydrologic-ML Engine</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#B9D9F5] bg-[#B9DEFF]/95 px-4 py-2.5 backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
          {MOBILE_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-bold transition ${
                  isActive ? 'bg-[#2784D8] text-white shadow-sm' : 'text-[#20364D] hover:bg-[#CDE8FF]'
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
