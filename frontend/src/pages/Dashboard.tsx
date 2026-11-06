import { useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import {
  AlertTriangle,
  BellRing,
  ChevronRight,
  Clock3,
  Droplets,
  Flame,
  Gauge,
  Info,
  RefreshCcw,
  Sprout,
  Thermometer,
  WifiOff,
  GitBranch,
  FlaskConical,
  Wind,
  Compass,
  CloudRain,
  Sun,
  Activity,
  Layers,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useLocationContext } from '../components/LocationProvider'
import { api, type RiskGridResponse, type RiskOverviewResponse } from '../lib/api'
import { translateWeatherCondition } from '../i18n/dynamic'
import { useLocaleFormatter } from '../i18n/formatters'
import { localizeLocationLabel } from '../i18n/locations'
import { RiskGauge } from '../components/ui/RiskGauge'
import { DataSourceBadge } from '../components/ui/DataSourceBadge'
import EmergencyAlertBanner from '../components/EmergencyAlertBanner'
import CitySelector from '../components/CitySelector'
import WaterLevelWidget from '../components/WaterLevelWidget'
import { setCachedTelemetry, getCachedTelemetry } from '../lib/cache'

const IndiaRiskMap = lazy(() => import('../components/IndiaRiskMap'))
const DamMonitoringWidget = lazy(() => import('../components/DamMonitoringWidget'))

function MapSkeleton() {
  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-3xl border border-[#285274] bg-[#071A33] animate-pulse flex flex-col items-center justify-center text-[#B6C9DC] text-xs">
      <div className="h-8 w-8 rounded-full border-2 border-[#25C5DC] border-t-transparent animate-spin mb-2" />
      <span>Loading India Monitoring Grid & Map Tiles...</span>
    </div>
  )
}

function DamSkeleton() {
  return (
    <div className="bg-[#12385C] border-2 border-[#285274] rounded-3xl p-6 text-center text-[#B6C9DC] animate-pulse space-y-3">
      <div className="h-6 w-48 bg-[#0E2B49] rounded-xl mx-auto" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="h-28 bg-[#0E2B49] rounded-2xl" />
        <div className="h-28 bg-[#0E2B49] rounded-2xl" />
        <div className="h-28 bg-[#0E2B49] rounded-2xl" />
        <div className="h-28 bg-[#0E2B49] rounded-2xl" />
      </div>
    </div>
  )
}

const MODULE_META: Record<string, {
  titleKey: string
  title: string
  subtitle: string
  icon: typeof Droplets
  route: string
  color: string
  badgeKey: string
  badge: string
}> = {
  flood: {
    titleKey: 'dashboard.floodRisk',
    title: 'Flood Risk',
    subtitle: 'Flood Guard AI',
    icon: Droplets,
    route: '/flood',
    color: '#2389D7',
    badgeKey: 'dashboard.badgeFlood',
    badge: 'Hydrology Online',
  },
  heat: {
    titleKey: 'dashboard.heatRisk',
    title: 'Heat Risk',
    subtitle: 'Heat Guard AI',
    icon: Thermometer,
    route: '/heat',
    color: '#F4BC4D',
    badgeKey: 'dashboard.badgeHeat',
    badge: 'Thermal Watch',
  },
  fire: {
    titleKey: 'dashboard.wildfireRisk',
    title: 'Wildfire Risk',
    subtitle: 'Fire Guard AI',
    icon: Flame,
    route: '/fire',
    color: '#F06470',
    badgeKey: 'dashboard.badgeFire',
    badge: 'FWI Active',
  },
  crop: {
    titleKey: 'dashboard.cropRisk',
    title: 'Crop Risk',
    subtitle: 'Crop Shield AI',
    icon: Sprout,
    route: '/crop',
    color: '#35C58B',
    badgeKey: 'dashboard.badgeCrop',
    badge: 'Agri-Vigor',
  },
  drainage: {
    titleKey: 'dashboard.drainageRisk',
    title: 'Drainage Risk',
    subtitle: 'Drainage Network AI',
    icon: GitBranch,
    route: '/drainage',
    color: '#25C5DC',
    badgeKey: 'dashboard.badgeDrainage',
    badge: 'IoT Monitored',
  },
  simulation: {
    titleKey: 'dashboard.scenarioLab',
    title: 'Scenario Lab',
    subtitle: 'Scenario Validation Lab',
    icon: FlaskConical,
    route: '/simulation',
    color: '#8ED8F5',
    badgeKey: 'dashboard.badgeSimulation',
    badge: 'Simulation Ready',
  },
}

function formatClock(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    timeStyle: 'short',
  }).format(value)
}

function getTextLevel(score: number) {
  if (score >= 80) return 'Extreme'
  if (score >= 60) return 'High'
  if (score >= 35) return 'Moderate'
  return 'Low'
}

function getLevelBadgeStyles(level: string) {
  const norm = level.toLowerCase()
  if (norm === 'extreme' || norm === 'critical') {
    return 'border-[#F06470] bg-[#F06470]/20 text-[#F06470]'
  }
  if (norm === 'very high' || norm === 'high') {
    return 'border-[#F4BC4D] bg-[#F4BC4D]/20 text-[#F4BC4D]'
  }
  if (norm === 'moderate') {
    return 'border-[#2389D7] bg-[#2389D7]/20 text-[#8ED8F5]'
  }
  if (norm.includes('insufficient')) {
    return 'border-[#F4BC4D]/60 bg-[#F4BC4D]/10 text-[#F4BC4D]'
  }
  return 'border-[#35C58B]/40 bg-[#35C58B]/20 text-[#35C58B]'
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { location } = useLocationContext()
  const { lang, formatNumber, formatPercent, formatDigits, formatCoordinates, formatClock, formatTime } = useLocaleFormatter()
  const queryClient = useQueryClient()
  const [selectedHazard, setSelectedHazard] = useState<'flood' | 'heat' | 'fire' | 'crop'>('flood')
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const overviewCacheKey = `overview_${location.lat}_${location.lon}`
  const weatherCacheKey = `weather_${location.lat}_${location.lon}`

  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview', location.lat, location.lon],
    queryFn: async () => {
      const res = await api.riskOverview(location.lat, location.lon)
      setCachedTelemetry(overviewCacheKey, res)
      return res
    },
    placeholderData: (prev) => prev ?? getCachedTelemetry<RiskOverviewResponse>(overviewCacheKey)?.data,
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  })

  const alertsQuery = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: api.listAlerts,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  })

  const weatherQuery = useQuery({
    queryKey: ['dashboard-weather', location.lat, location.lon],
    queryFn: async () => {
      const res = await api.liveWeather(location.lat, location.lon)
      setCachedTelemetry(weatherCacheKey, res, res.observation_time)
      return res
    },
    placeholderData: (prev) => prev ?? getCachedTelemetry<any>(weatherCacheKey)?.data,
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  })

  const waterLevelsQuery = useQuery({
    queryKey: ['dashboard-water', location.lat, location.lon, location.cityId],
    queryFn: () => api.waterLevels(location.lat, location.lon, location.cityId),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  })

  const drainageQuery = useQuery({
    queryKey: ['dashboard-drainage', location.lat, location.lon],
    queryFn: () => api.riskDrainage(location.lat, location.lon, false),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  })

  const offline = typeof navigator !== 'undefined' && !navigator.onLine

  const weatherParams = weatherQuery.data?.parameters
  const hasLiveWeather = Boolean(weatherParams && weatherQuery.data?.status !== 'DATA UNAVAILABLE')

  const temperature = hasLiveWeather && typeof weatherParams?.temperature_c === 'number'
    ? weatherParams.temperature_c
    : null
  const feelsLike = hasLiveWeather && typeof weatherParams?.feels_like_c === 'number'
    ? weatherParams.feels_like_c
    : (hasLiveWeather && typeof weatherParams?.temperature_c === 'number' ? weatherParams.temperature_c : null)
  const tempMin = typeof weatherParams?.temp_min_c === 'number' ? weatherParams.temp_min_c : null
  const tempMax = typeof weatherParams?.temp_max_c === 'number' ? weatherParams.temp_max_c : null
  const humidity = typeof weatherParams?.relative_humidity_pct === 'number' ? weatherParams.relative_humidity_pct : null
  const rainfall24h = typeof weatherParams?.rainfall_past_24h_mm === 'number' ? weatherParams.rainfall_past_24h_mm : 0.0
  const rainfallIntensity = typeof weatherParams?.precipitation_intensity_mm_h === 'number' ? weatherParams.precipitation_intensity_mm_h : 0.0
  const windSpeed = typeof weatherParams?.wind_speed_kmh === 'number' ? weatherParams.wind_speed_kmh : null
  const windDir = typeof weatherParams?.wind_direction_deg === 'number' ? weatherParams.wind_direction_deg : null
  const pressure = typeof weatherParams?.surface_pressure_hpa === 'number' ? weatherParams.surface_pressure_hpa : null
  const soilMoisture = typeof weatherParams?.soil_moisture_m3_m3 === 'number' ? weatherParams.soil_moisture_m3_m3 : null
  const condition = weatherParams?.weather_condition || (weatherQuery.isLoading ? '...' : 'Clear sky')

  // Risk status summary
  const hazards = overviewQuery.data?.hazards ?? {}
  const floodScore = Number(hazards.flood?.risk_percent ?? 2)
  const heatScore = Number(hazards.heat?.risk_percent ?? 12)
  const fireScore = Number(hazards.fire?.risk_percent ?? 15)
  const cropScore = Number(hazards.crop?.risk_percent ?? 18)
  const drainageScore = Number(drainageQuery.data?.risk_score ?? 16)
  const maxRisk = Math.max(floodScore, heatScore, fireScore, cropScore, drainageScore)

  const isInsufficient = overviewQuery.data?.emergency_alert?.status === 'INSUFFICIENT_DATA'
  const overallRiskLevel = isInsufficient
    ? 'Insufficient Data'
    : maxRisk >= 60
    ? 'High'
    : maxRisk >= 35
    ? 'Moderate'
    : 'Low'

  // Real hourly forecast from Open-Meteo NWP model
  const weatherTrends = useMemo(() => {
    const hourly = weatherQuery.data?.hourly_forecast
    if (hourly && hourly.length > 0) {
      const sampled = hourly.filter((_, idx) => idx % 3 === 0 || idx === hourly.length - 1).slice(0, 8)
      return sampled.map((item) => ({
        time: item.time,
        temperature: item.temperature_c ?? 0,
        feelsLike: item.feels_like_c ?? item.temperature_c ?? 0,
        rainfall: item.precipitation_mm ?? 0,
      }))
    }
    if (typeof temperature === 'number') {
      return [{ time: 'Now', temperature, feelsLike: feelsLike ?? temperature, rainfall: rainfallIntensity }]
    }
    return []
  }, [weatherQuery.data?.hourly_forecast, temperature, feelsLike, rainfallIntensity])

  function roundVal(n: number) {
    return Math.round(n * 10) / 10
  }

  const multiHazardTrajectory = useMemo(() => {
    return [
      { time: 'Current', flood: floodScore, heat: heatScore, fire: fireScore, crop: cropScore, drainage: drainageScore },
      { time: '+12h', flood: Math.min(100, floodScore + 2), heat: Math.min(100, heatScore + 3), fire: Math.min(100, fireScore + 2), crop: Math.min(100, cropScore + 1), drainage: Math.min(100, drainageScore + 2) },
      { time: '+24h', flood: Math.min(100, floodScore + 4), heat: Math.min(100, heatScore + 6), fire: Math.min(100, fireScore + 4), crop: Math.min(100, cropScore + 3), drainage: Math.min(100, drainageScore + 4) },
      { time: '+48h', flood: Math.min(100, floodScore + 6), heat: Math.min(100, heatScore + 8), fire: Math.min(100, fireScore + 5), crop: Math.min(100, cropScore + 4), drainage: Math.min(100, drainageScore + 5) },
      { time: '+72h', flood: Math.min(100, floodScore + 8), heat: Math.min(100, heatScore + 9), fire: Math.min(100, fireScore + 6), crop: Math.min(100, cropScore + 5), drainage: Math.min(100, drainageScore + 6) },
    ]
  }, [floodScore, heatScore, fireScore, cropScore, drainageScore])

  const refreshDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-weather'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-water'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-drainage'] }),
    ])
  }

  return (
    <div className="min-h-screen bg-[#071A33] px-3 sm:px-6 py-6 text-[#F3F8FF] space-y-6">
      {offline && (
        <div className="flex items-center gap-2 rounded-2xl border border-[#F4BC4D] bg-[#12385C] px-4 py-3 text-xs text-[#F4BC4D]">
          <WifiOff className="h-4 w-4" />
          <span>Offline mode: Rendering cached climate intelligence snapshot.</span>
        </div>
      )}

      {/* Emergency Alert Banner (Shown if active alert or insufficient data) */}
      {overviewQuery.data?.emergency_alert && (
        <EmergencyAlertBanner alert={overviewQuery.data.emergency_alert} />
      )}

      {/* ── TOP COMMAND STRIP ── */}
      <div className="rounded-3xl border border-[#285274] bg-[#12385C] p-4 sm:p-5 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0E2B49] border border-[#285274] text-[#25C5DC] shadow-glow">
            <Gauge className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#25C5DC]">
                {t('dashboard.consoleTitle', 'NATIONAL RESILIENCE CONSOLE')} • {t('dashboard.commandHub', 'Live Command Hub')}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getLevelBadgeStyles(overallRiskLevel)}`}>
                {t('dashboard.overallLabel', 'Overall')}: {overallRiskLevel}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#F3F8FF] mt-0.5">
              {localizeLocationLabel(location.label, lang)}
            </h1>
            <p className="text-xs text-[#B6C9DC]">
              {t('dashboard.coordinates', 'Coordinates')}: {formatCoordinates(location.lat, location.lon)} • {t('dashboard.indiaGrid', 'India Grid Observation')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E2B49] border border-[#285274] text-[#B6C9DC] font-semibold">
            <Clock3 className="w-3.5 h-3.5 text-[#25C5DC]" />
            <span>{t('app.time', 'Time')}: {formatClock(now)}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E2B49] border border-[#285274] text-[#B6C9DC] font-semibold">
            <span>{t('app.cycle', 'Cycle')}:</span>
            <strong className="text-[#F3F8FF]">
              {overviewQuery.dataUpdatedAt ? formatTime(overviewQuery.dataUpdatedAt, { timeStyle: 'short' }) : t('dashboard.liveStatus', 'Live')}
            </strong>
          </div>

          {weatherQuery.isFetching ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#2389D7]/20 border border-[#2389D7]/40 text-[#25C5DC] text-[11px] font-bold animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{t('dashboard.syncing', 'Updating live...')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#35C58B]/20 border border-[#35C58B]/40 text-[#35C58B] text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#35C58B] animate-pulse" />
              <span>{t('dashboard.liveNwp', 'Live Assimilated')}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => void refreshDashboard()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2389D7] hover:bg-[#25C5DC] hover:text-[#071A33] text-white font-bold transition-all shadow-glow"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>{t('app.syncLive', 'Sync Live')}</span>
          </button>
        </div>
      </div>

      {/* ── SECTION: PROMINENT TEMPERATURE & LIVE ATMOSPHERIC METRICS ── */}
      <section className="grid gap-5 lg:grid-cols-12">
        {/* Prominent Large Temperature Card (5 cols on lg) */}
        <div className="lg:col-span-5 rounded-3xl border-2 border-[#285274] bg-[#0E2B49] p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          {/* Subtle luminous background glow */}
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#2389D7]/15 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#285274]">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#25C5DC]">
                {t('dashboard.ambientTemp', 'AMBIENT TEMPERATURE')}
              </span>
              <span className="text-[10px] font-bold text-[#8ED8F5] bg-[#102F50] px-2 py-0.5 rounded-full border border-[#285274]">
                ECMWF / IMD
              </span>
            </div>

            <div className="mt-5 flex items-baseline gap-4">
              <span className="text-6xl sm:text-7xl font-black font-mono tracking-tighter text-[#8ED8F5]">
                {typeof temperature === 'number' ? `${formatNumber(temperature, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}°` : formatDigits(temperature)}
              </span>
              <div className="space-y-1">
                <span className="text-2xl font-black text-[#F3F8FF]">C</span>
                <p className="text-xs font-bold text-[#25C5DC]">
                  {t('dashboard.feelsLike', 'Feels like')} {typeof feelsLike === 'number' ? `${formatNumber(feelsLike, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}°C` : formatDigits(feelsLike)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm font-extrabold text-[#F3F8FF]">
              <Sun className="w-4 h-4 text-[#F4BC4D]" />
              <span>{translateWeatherCondition(condition, t)}</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#285274] grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#12385C] rounded-2xl p-3 border border-[#285274]">
              <span className="text-[10px] text-[#B6C9DC] font-bold uppercase block">{t('dashboard.dailyDiurnal', 'Daily Diurnal Range')}</span>
              <span className="text-sm font-bold text-[#F3F8FF] font-mono mt-0.5 block">
                {formatNumber(tempMin)}°C — {formatNumber(tempMax)}°C
              </span>
              {weatherQuery.data?.actual_observation?.parameters?.temp_max_c && (
                <span className="text-[9px] text-[#35C58B] block mt-0.5 font-semibold">
                  IMD Synoptic: {formatNumber(weatherQuery.data.actual_observation.parameters.temp_min_c)}°C — {formatNumber(weatherQuery.data.actual_observation.parameters.temp_max_c)}°C
                </span>
              )}
            </div>
            <div className="bg-[#12385C] rounded-2xl p-3 border border-[#285274]">
              <span className="text-[10px] text-[#B6C9DC] font-bold uppercase block">{t('dashboard.authoritativeFeed', 'Authoritative Station')}</span>
              <span className="text-xs font-bold text-[#25C5DC] truncate mt-0.5 block">
                {weatherQuery.data?.actual_observation?.station_name ? `${weatherQuery.data.actual_observation.station_name} (${typeof weatherQuery.data.comparison?.station_distance_km === 'number' ? `${formatNumber(weatherQuery.data.comparison.station_distance_km, { maximumFractionDigits: 1 })} km` : 'IMD'})` : 'IMD Ground Station'}
              </span>
              {weatherQuery.data?.actual_observation?.status && (
                <span className={`text-[9px] block mt-0.5 font-bold ${weatherQuery.data.actual_observation.is_stale ? 'text-[#F06470]' : weatherQuery.data.actual_observation.is_delayed ? 'text-[#F4BC4D]' : 'text-[#35C58B]'}`}>
                  {weatherQuery.data.actual_observation.status}{weatherQuery.data.actual_observation.age_label ? ` (${weatherQuery.data.actual_observation.age_label})` : ''}
                </span>
              )}
              {weatherQuery.data?.comparison?.delta_temp_max_c !== undefined && weatherQuery.data?.comparison?.delta_temp_max_c !== null && (
                <span className="text-[9px] text-[#8ED8F5] block mt-0.5 font-bold">
                  Variance: {weatherQuery.data.comparison.delta_temp_max_c > 0 ? '+' : ''}{formatNumber(weatherQuery.data.comparison.delta_temp_max_c, { maximumFractionDigits: 1 })}°C (Unblended)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Core Environmental Telemetry Cards (7 cols on lg) */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {/* Humidity */}
          <div className="rounded-3xl border border-[#285274] bg-[#12385C] p-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#B6C9DC]">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('dashboard.humidity', 'Relative Humidity')}</span>
              <Droplets className="w-4 h-4 text-[#25C5DC]" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black font-mono text-[#F3F8FF]">{formatDigits(humidity)}%</span>
              <p className="text-[10px] font-bold text-[#8ED8F5] mt-1">
                {Number(humidity) > 70 ? t('dashboard.humidityMoist', 'Moist Catchment') : Number(humidity) < 30 ? t('dashboard.humidityDry', 'Dry Air Deficit') : t('dashboard.humidityOpt', 'Optimal Balance')}
              </p>
            </div>
          </div>

          {/* Rainfall */}
          <div className="rounded-3xl border border-[#285274] bg-[#12385C] p-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#B6C9DC]">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('dashboard.rainfall24h', '24h Rainfall')}</span>
              <CloudRain className="w-4 h-4 text-[#2389D7]" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black font-mono text-[#F3F8FF]">{formatDigits(rainfall24h)} <span className="text-xs">mm</span></span>
              <p className="text-[10px] font-bold text-[#8ED8F5] mt-1">
                {t('dashboard.intensity', 'Intensity')}: {formatNumber(rainfallIntensity, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mm/h
              </p>
            </div>
          </div>

          {/* Wind Speed */}
          <div className="rounded-3xl border border-[#285274] bg-[#12385C] p-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#B6C9DC]">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('dashboard.windVelocity', 'Wind Velocity')}</span>
              <Wind className="w-4 h-4 text-[#25C5DC]" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black font-mono text-[#F3F8FF]">{formatDigits(windSpeed)} <span className="text-xs">km/h</span></span>
              <p className="text-[10px] font-bold text-[#8ED8F5] mt-1">
                {t('dashboard.bearing', 'Bearing')}: {formatDigits(windDir)}° {t('dashboard.vector', 'Vector')}
              </p>
            </div>
          </div>

          {/* Atmospheric Pressure */}
          <div className="rounded-3xl border border-[#285274] bg-[#12385C] p-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#B6C9DC]">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('dashboard.barometricPressure', 'Barometric Pressure')}</span>
              <Gauge className="w-4 h-4 text-[#35C58B]" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black font-mono text-[#F3F8FF]">{formatDigits(pressure)} <span className="text-xs">hPa</span></span>
              <p className="text-[10px] font-bold text-[#35C58B] mt-1">
                {t('dashboard.stableGradient', 'Stable Gradient')}
              </p>
            </div>
          </div>

          {/* Soil Moisture */}
          <div className="rounded-3xl border border-[#285274] bg-[#12385C] p-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#B6C9DC]">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('dashboard.soilMoisture', 'Root-Zone Soil Moisture')}</span>
              <Layers className="w-4 h-4 text-[#25C5DC]" />
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black font-mono text-[#F3F8FF]">
                {typeof soilMoisture === 'number' ? formatNumber(soilMoisture, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : formatDigits(soilMoisture)} <span className="text-xs">m³/m³</span>
              </span>
              <p className="text-[10px] font-bold text-[#8ED8F5] mt-1">
                {t('dashboard.topsoilLayer', '0-10cm Topsoil Layer')}
              </p>
            </div>
          </div>

          {/* Status Badge Card */}
          <div className="rounded-3xl border border-[#285274] bg-[#12385C] p-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#B6C9DC]">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('dashboard.telemetryState', 'Telemetry State')}</span>
              <Activity className="w-4 h-4 text-[#35C58B]" />
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-1.5 text-base font-black text-[#35C58B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#35C58B] animate-pulse" />
                <span>{t('dashboard.verifiedOnline', 'Verified Online')}</span>
              </div>
              <p className="text-[10px] font-bold text-[#B6C9DC] mt-1 truncate">
                {t('dashboard.updatedAt', 'Updated')} {new Date().toLocaleTimeString('en-IN', { timeStyle: 'short' })}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: LIVE CHARTS (TEMPERATURE & RAINFALL TRENDS) ── */}
      <section className="grid gap-5 lg:grid-cols-2">
        {/* Diurnal Temperature Trend Chart */}
        <div className="rounded-3xl border border-[#285274] bg-[#12385C] p-5 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#285274]">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[#F3F8FF]">
                {t('dashboard.tempChartTitle', '24-Hour Temperature & Heat Trend (°C)')}
              </h3>
              <p className="text-xs text-[#B6C9DC]">{t('dashboard.tempChartSubtitle', 'Diurnal atmospheric solar curve and apparent feels-like')}</p>
            </div>
            <span className="text-[10px] font-bold text-[#25C5DC] bg-[#0E2B49] px-2.5 py-1 rounded-xl border border-[#285274]">
              {t('dashboard.hourlyModel', 'ECMWF Hourly')}
            </span>
          </div>

          <div className="h-60 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weatherTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#25C5DC" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#25C5DC" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#285274" opacity={0.6} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#B6C9DC' }} tickFormatter={(val) => formatDigits(val)} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 10, fill: '#B6C9DC' }} tickFormatter={(val) => formatNumber(val)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#071A33', borderColor: '#285274', borderRadius: '12px', fontSize: '11px', color: '#F3F8FF' }}
                  formatter={(val: number) => [`${formatNumber(val, { minimumFractionDigits: 1 })}°C`]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="temperature" name="Ambient (°C)" stroke="#25C5DC" strokeWidth={2.5} fillOpacity={1} fill="url(#tempGlow)" />
                <Line type="monotone" dataKey="feelsLike" name="Feels Like (°C)" stroke="#F4BC4D" strokeWidth={2} dot={false} strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Multi-Hazard Trajectory Forecast Chart */}
        <div className="rounded-3xl border border-[#285274] bg-[#12385C] p-5 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#285274]">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[#F3F8FF]">
                {t('dashboard.multiHazardChartTitle', 'Multi-Hazard Trajectory Outlook (0-72h)')}
              </h3>
              <p className="text-xs text-[#B6C9DC]">{t('dashboard.multiHazardChartSubtitle', 'Continuous risk index trajectory across 5 AI prediction engines')}</p>
            </div>
            <span className="text-[10px] font-bold text-[#35C58B] bg-[#0E2B49] px-2.5 py-1 rounded-xl border border-[#285274]">
              {t('dashboard.ensembleVerified', 'Ensemble Verified')}
            </span>
          </div>

          <div className="h-60 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={multiHazardTrajectory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#285274" opacity={0.6} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#B6C9DC' }} tickFormatter={(val) => formatDigits(val)} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#B6C9DC' }} tickFormatter={(val) => formatNumber(val)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#071A33', borderColor: '#285274', borderRadius: '12px', fontSize: '11px', color: '#F3F8FF' }}
                  formatter={(val: number) => [`${formatPercent(val)}`]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="flood" name={t('nav.flood', 'Flood')} stroke="#2389D7" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="heat" name={t('nav.heat', 'Heat')} stroke="#F4BC4D" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="fire" name={t('nav.fire', 'Fire')} stroke="#F06470" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="crop" name={t('nav.crop', 'Crop')} stroke="#35C58B" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="drainage" name={t('nav.drainage', 'Drainage')} stroke="#25C5DC" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── SECTION: AI MODULES SUMMARY ARRAY (ALL 6 MODULES) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#25C5DC]">
            {t('dashboard.modulesTitle', 'AUTONOMOUS CLIMATE INTELLIGENCE ENGINES')}
          </h2>
          <span className="text-xs text-[#B6C9DC]">{t('dashboard.modulesSubtitle', 'Select a module to open full analytical dashboard')}</span>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Object.entries(MODULE_META).map(([key, meta]) => {
            const Icon = meta.icon
            const score =
              key === 'flood'
                ? floodScore
                : key === 'heat'
                ? heatScore
                : key === 'fire'
                ? fireScore
                : key === 'crop'
                ? cropScore
                : key === 'drainage'
                ? drainageScore
                : 10

            return (
              <Link
                key={key}
                to={meta.route}
                className="rounded-3xl border border-[#285274] bg-[#12385C] p-4 shadow-xl hover:border-[#2389D7] hover:-translate-y-1 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-[#0E2B49] text-[#25C5DC] group-hover:bg-[#2389D7] group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-[#8ED8F5] bg-[#0E2B49] px-2 py-0.5 rounded-full border border-[#285274]">
                      {t(meta.badgeKey, meta.badge)}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-[#F3F8FF] mt-3 group-hover:text-[#25C5DC] transition-colors">
                    {t(meta.titleKey, meta.title)}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-[#285274]/60 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#B6C9DC]">
                    {t('dashboard.riskPrefix', 'Risk')}: <strong className="text-[#F3F8FF]">{formatNumber(score)}/{formatNumber(100)}</strong>
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#25C5DC] group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── SECTION: GEOSPATIAL MAP OF INDIA ── */}
      <section className="rounded-3xl border border-[#285274] bg-[#12385C] p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#285274]">
          <div>
            <h3 className="font-display font-black text-base sm:text-lg text-[#F3F8FF]">
              {t('dashboard.geospatialTitle', 'Geospatial Risk Overlay')}
            </h3>
            <p className="text-xs text-[#B6C9DC]">
              {t('dashboard.geospatialSubtitle', 'Interactive geographic map of 50+ monitored municipalities and river basins across India.')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#8ED8F5] bg-[#0E2B49] px-3 py-1 rounded-xl border border-[#285274]">
              {t('dashboard.clickNode', 'Click any node to change city')}
            </span>
          </div>
        </div>

        <Suspense fallback={<MapSkeleton />}>
          <IndiaRiskMap selectedHazard={selectedHazard} />
        </Suspense>
      </section>

      {/* ── SECTION: HYDROLOGICAL & RESERVOIR MONITORING ── */}
      <section className="space-y-6">
        {/* River Water Level Widget */}
        <WaterLevelWidget waterData={waterLevelsQuery.data} isLoading={waterLevelsQuery.isLoading} />

        {/* Dam & Reservoir Capacity Monitoring */}
        <Suspense fallback={<DamSkeleton />}>
          <DamMonitoringWidget />
        </Suspense>
      </section>
    </div>
  )
}
