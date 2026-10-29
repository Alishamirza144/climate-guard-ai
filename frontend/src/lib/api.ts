/**
 * Typed API client for ClimateGuard AI backend.
 * Base URL is read from VITE_API_URL env var (never hard-coded).
 */

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export interface HealthResponse {
  status: string
  version: string
  timestamp: string
  python: string
  platform: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText} [${path}]`)
  }
  return res.json() as Promise<T>
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
}

export interface RiskOverviewResponse {
  lat: number
  lon: number
  hazards: Record<string, RiskHazardSummary>
  highest_priority_alert?: {
    title: string
    location: string
    recommended_action: string
    hazard: string
    level: string
  }
  outlook: Record<string, string>
  disclaimer: string
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
