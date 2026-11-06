/**
 * Typed API client for ClimateGuard AI backend.
 * Base URL is read from VITE_API_URL env var (defaults to relative '').
 * Integrates live latency monitoring and dam capacity telemetry.
 */

import { notifyFetchStart, recordLatency } from './latency'

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname.includes('onrender.com') ||
    window.location.hostname.includes('vercel.app'))
    ? 'https://climateguard-demo-api.onrender.com'
    : '')
).replace(/\/$/, '')

export interface HealthResponse {
  status: string
  version: string
  timestamp: string
  python: string
  platform: string
}

const inFlightRequests = new Map<string, Promise<any>>()

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isGet = !init || !init.method || init.method.toUpperCase() === 'GET'
  const url = `${API_BASE_URL}${path}`

  if (isGet && inFlightRequests.has(url)) {
    return inFlightRequests.get(url)! as Promise<T>
  }

  notifyFetchStart()
  const start = performance.now()

  const promise = (async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 18000)

      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        ...init,
      })
      clearTimeout(timeoutId)
      const elapsedSec = (performance.now() - start) / 1000
      const serverProcessTime = parseFloat(res.headers.get('x-process-time') || '0') || null

      if (!res.ok) {
        recordLatency(elapsedSec, serverProcessTime, true, `HTTP ${res.status}: ${res.statusText}`)
        throw new Error(`API ${res.status}: ${res.statusText} [${path}]`)
      }

      recordLatency(elapsedSec, serverProcessTime, false)
      return (await res.json()) as T
    } catch (err: unknown) {
      const elapsedSec = (performance.now() - start) / 1000
      const msg = err instanceof Error ? err.message : String(err)
      recordLatency(elapsedSec, null, true, msg)
      throw err
    } finally {
      if (isGet) {
        inFlightRequests.delete(url)
      }
    }
  })()

  if (isGet) {
    inFlightRequests.set(url, promise)
  }

  return promise
}

export interface LocationSearchResponse {
  results: Array<{
    id: number
    name: string
    latitude: number
    longitude: number
    country?: string | null
    admin1?: string | null
    timezone?: string | null
  }>
}

export interface RiskHazardSummary {
  risk_percent: number
  level: string
  probability: number
  badge?: string
  detail?: string
}

export interface EmergencyAlert {
  title: string
  status: 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL' | 'INSUFFICIENT_DATA' | string
  color_category: 'green' | 'blue' | 'amber' | 'coral' | string
  rainfall_summary: string
  river_level_summary: string
  reservoir_summary: string
  reason: string
  recommended_action: string
  timestamp: string
  is_normal?: boolean
  city_name?: string
  state_name?: string
}

export interface RiskOverviewResponse {
  lat: number
  lon: number
  hazards: Record<string, RiskHazardSummary>
  highest_priority_alert?: {
    title: string
    status_badge?: string
    alert_category?: string
    location: string
    recommended_action: string
    hazard: string
    level: string
    is_normal?: boolean
  }
  emergency_alert?: EmergencyAlert
  outlook: Record<string, string>
  disclaimer: string
}

export interface ReservoirData {
  id: string
  name: string
  river: string
  location: string
  lat: number
  lon: number
  total_capacity_mcm: number
  total_capacity_tmc: number
  current_storage_mcm: number
  current_storage_tmc: number
  storage_percentage: number
  available_storage_mcm: number
  available_storage_tmc: number
  frl_m: number
  current_water_level_m: number
  inflow_cusecs: number
  outflow_cusecs: number
  spillway_gates: number
  spillway_status: string
  downstream_threat_level: string
  downstream_warning_discharge_cusecs: number
  downstream_danger_discharge_cusecs: number
  primary_purpose: string
  data_source: string
  is_demonstration: boolean
  last_updated: string
  historical_trend: Array<{ day: string; storage_pct: number; storage_mcm: number }>
  inflow_outflow_trend: Array<{ time: string; inflow_cusecs: number; outflow_cusecs: number }>
}

export type AlertRecord = {
  id: number
  hazard: string
  level: string
  score?: number
  location: string
  message: string
  created_at: string
  acknowledged?: boolean
  state?: string
  channels?: string[]
}

export interface AlertListResponse {
  alerts: AlertRecord[]
}

export interface DataSourceStatus {
  key: string
  name: string
  category: string
  description: string
  url: string
  status: 'online' | 'degraded' | 'offline'
  latency_ms: number | null
  last_successful_call: string | null
}

export interface DataSourceRegistryResponse {
  generated_at: string
  source_count: number
  healthy_count: number
  sources: DataSourceStatus[]
}

export interface RiskGridResponse {
  zones: Array<{ name: string; lat: number; lon: number; score: number }>
  fire_markers?: Array<{ lat: number; lon: number; confidence?: number }>
  radar?: boolean
}

export interface LiveWeatherResponse {
  status: string
  city: string
  state: string
  lat: number
  lon: number
  source: string
  observation_time: string
  fetched_at: string
  freshness: string
  is_observation: boolean
  parameters: {
    temperature_c: number | string
    temp_min_c: number | string
    temp_max_c: number | string
    relative_humidity_pct: number | string
    rainfall_past_24h_mm: number | string
    precipitation_intensity_mm_h: number | string
    wind_speed_kmh: number | string
    wind_direction_deg: number | string
    surface_pressure_hpa: number | string
    weather_condition: string
    weather_code?: number
    soil_moisture_m3_m3: number | string
  }
}

export interface WaterStation {
  station_name: string
  river_name: string
  city: string
  state: string
  current_water_level_m: number
  unit: string
  warning_threshold_m: number
  danger_threshold_m: number
  highest_flood_level_m?: number
  water_level_change_3h_m: number
  rate_of_change_m_per_hour: number
  status: string
  observation_timestamp: string
  freshness: string
  source: string
  data_quality: string
}

export interface WaterLevelsResponse {
  city: string
  state: string
  lat: number
  lon: number
  status: string
  station_count: number
  stations: WaterStation[]
  source: string
  timestamp: string
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),
  liveWeather: (lat: number, lon: number) =>
    request<LiveWeatherResponse>(`/api/weather/live?lat=${lat}&lon=${lon}`),
  waterLevels: (lat: number, lon: number, cityId?: string) => {
    const q = cityId ? `&city_id=${encodeURIComponent(cityId)}` : ''
    return request<WaterLevelsResponse>(`/api/water-levels?lat=${lat}&lon=${lon}${q}`)
  },
  indiaCities: (region?: string, state?: string, query?: string) => {
    const params = new URLSearchParams()
    if (region && region !== 'All') params.append('region', region)
    if (state) params.append('state', state)
    if (query) params.append('q', query)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<{ total: number; cities: Array<Record<string, unknown>> }>(`/api/location/cities${qs}`)
  },
  locationSearch: (query: string) =>
    request<LocationSearchResponse>(`/api/location/search?q=${encodeURIComponent(query)}`),
  locationReverse: (lat: number, lon: number) =>
    request<{ display_name?: string; address?: Record<string, string> }>(
      `/api/location/reverse?lat=${lat}&lon=${lon}`,
    ),
  riskOverview: (lat: number, lon: number) =>
    request<RiskOverviewResponse>(`/api/risk/overview?lat=${lat}&lon=${lon}`),
  listAlerts: () => request<AlertListResponse>('/api/alerts'),
  dataSources: () => request<DataSourceRegistryResponse>('/api/data-sources'),
  riskFlood: (lat: number, lon: number) => request<Record<string, unknown>>(`/api/risk/flood?lat=${lat}&lon=${lon}`),
  riskHeat: (lat: number, lon: number) => request<Record<string, unknown>>(`/api/risk/heat?lat=${lat}&lon=${lon}`),
  riskFire: (lat: number, lon: number) => request<Record<string, unknown>>(`/api/risk/fire?lat=${lat}&lon=${lon}`),
  riskCrop: (lat: number, lon: number, profile?: Record<string, unknown>) => {
    if (profile && (profile.crop || profile.sowing_date)) {
      return request<Record<string, unknown>>('/api/risk/crop', {
        method: 'POST',
        body: JSON.stringify({ lat, lon, ...profile }),
      })
    }
    return request<Record<string, unknown>>(`/api/risk/crop?lat=${lat}&lon=${lon}`)
  },
  riskDrainage: (lat: number, lon: number, simulated: boolean = false) =>
    request<Record<string, unknown>>(`/api/risk/drainage?lat=${lat}&lon=${lon}&simulated=${simulated}`),
  simulateDrainage: (lat: number, lon: number, simulated: boolean = true) =>
    request<Record<string, unknown>>('/api/risk/drainage/simulate', {
      method: 'POST',
      body: JSON.stringify({ lat, lon, simulated }),
    }),
  riskFloodWhatIf: (lat: number, lon: number, addedRainMm: number) =>
    request<Record<string, unknown>>('/api/risk/flood/whatif', {
      method: 'POST',
      body: JSON.stringify({ lat, lon, added_rain_mm: addedRainMm }),
    }),
  listDams: (lat?: number, lon?: number) => {
    const q = lat !== undefined && lon !== undefined ? `?lat=${lat}&lon=${lon}` : ''
    return request<ReservoirData[]>(`/api/dams${q}`)
  },
  getDam: (damId: string, params?: { storage_mcm?: number; inflow?: number; outflow?: number }) => {
    const q = new URLSearchParams()
    if (params?.storage_mcm) q.append('custom_storage_mcm', String(params.storage_mcm))
    if (params?.inflow) q.append('custom_inflow', String(params.inflow))
    if (params?.outflow) q.append('custom_outflow', String(params.outflow))
    const query = q.toString() ? `?${q.toString()}` : ''
    return request<ReservoirData>(`/api/dams/${encodeURIComponent(damId)}${query}`)
  },
  mlMetrics: () => request<Record<string, unknown>>('/api/ml/metrics'),
  iotDevices: () => request<{ devices: Array<Record<string, unknown>> }>('/api/iot/devices'),
  grid: (lat: number, lon: number, hazard: string = 'flood') =>
    request<RiskGridResponse>(`/api/grid?lat=${lat}&lon=${lon}&hazard=${encodeURIComponent(hazard)}`),
  simulationScenarios: () => request<{ scenarios: Array<Record<string, unknown>> }>('/api/simulation/scenarios'),
  runSimulation: (payload: { scenario_id: string; lat?: number; lon?: number }) =>
    request<{ scenario_id: string; title: string; summary: Record<string, unknown>; alerts: Array<Record<string, unknown>>; synthetic_inputs: Record<string, unknown> }>('/api/simulation/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  validationMetrics: () => request<{ hazards: Record<string, Record<string, unknown>> }>('/api/validation/metrics'),
  validationReport: (hazard: string = 'flood') => request<{ hazard: string; report: string }>(`/api/validation/report?hazard=${encodeURIComponent(hazard)}`),
  validationBacktest: (lat: number, lon: number, eventDate: string, hazard: string = 'all') =>
    request<{ comparison: Array<Record<string, unknown>>; metrics: Record<string, number> }>(`/api/validation/backtest?lat=${lat}&lon=${lon}&event_date=${encodeURIComponent(eventDate)}&hazard=${encodeURIComponent(hazard)}`),
} as const
