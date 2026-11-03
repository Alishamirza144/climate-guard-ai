/**
 * Typed API client for ClimateGuard AI backend.
 * Base URL is read from VITE_API_URL env var (defaults to relative '').
 * Integrates live latency monitoring and dam capacity telemetry.
 */

import { notifyFetchStart, recordLatency } from './latency'

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export interface HealthResponse {
  status: string
  version: string
  timestamp: string
  python: string
  platform: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  notifyFetchStart()
  const start = performance.now()

  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
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
  }
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
  status: 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL'
  color_category: 'green' | 'blue' | 'amber' | 'coral'
  rainfall_summary: string
  river_level_summary: string
  reservoir_summary: string
  reason: string
  recommended_action: string
  timestamp: string
  is_normal?: boolean
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

export const api = {
  health: () => request<HealthResponse>('/api/health'),
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
  riskCrop: (lat: number, lon: number, profile?: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/risk/crop?lat=${lat}&lon=${lon}`, {
      method: 'POST',
      body: JSON.stringify(profile ?? { lat, lon }),
    }),
  riskFloodWhatIf: (lat: number, lon: number, addedRainMm: number) =>
    request<Record<string, unknown>>('/api/risk/flood/whatif', {
      method: 'POST',
      body: JSON.stringify({ lat, lon, added_rain_mm: addedRainMm }),
    }),
  listDams: () => request<ReservoirData[]>('/api/dams'),
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
