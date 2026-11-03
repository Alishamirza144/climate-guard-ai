import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../pages/Dashboard'
import { ThemeProvider } from '../lib/theme'
import { LocationProvider } from '../components/LocationProvider'

function buildClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

function createMockResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'x-process-time': '0.02' }),
    json: async () => data,
  } as unknown as Response
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/risk/overview')) {
      return createMockResponse({
        lat: 19.9975,
        lon: 73.7898,
        hazards: {
          flood: { risk_percent: 82, level: 'High', probability: 0.82 },
          heat: { risk_percent: 64, level: 'High', probability: 0.64 },
          fire: { risk_percent: 41, level: 'Moderate', probability: 0.41 },
          crop: { risk_percent: 28, level: 'Low', probability: 0.28 },
        },
        highest_priority_alert: {
          title: 'High Flood Risk Detected',
          location: 'Nashik, Maharashtra',
          recommended_action: 'Inspect drainage system and clear blockages',
          hazard: 'flood',
          level: 'High',
        },
        outlook: {
          '24h': 'Flood risk remains High.',
          '72h': 'Heat and Fire remain watch points.',
        },
        disclaimer: 'Decision-support only. Follow official IMD/CWC/NDMA advisories.',
      })
    }
    if (url.includes('/api/weather/live')) {
      return createMockResponse({
        location: 'Nashik, Maharashtra',
        lat: 19.9975,
        lon: 73.7898,
        current_temp_c: 29.5,
        temp_max_c: 34.0,
        temp_min_c: 21.0,
        relative_humidity_pct: 62,
        rain_mm: 0.0,
        precipitation_intensity_mm_h: 0.0,
        wind_speed_kmh: 14.5,
        wind_direction_deg: 260,
        pressure_hpa: 1012,
        weather_condition: 'Partly Cloudy',
        soil_moisture_m3m3: 0.24,
        data_source: 'Open-Meteo & IMD Numerical Grid',
        observation_timestamp: '2026-11-03T16:00:00Z',
        is_live: true,
        status: 'live',
      })
    }
    if (url.includes('/api/water-levels')) {
      return createMockResponse({
        city: 'Nashik, Maharashtra',
        lat: 19.9975,
        lon: 73.7898,
        status: 'live',
        data_source: 'Central Water Commission (CWC) & Maharashtra WRD',
        stations: [
          {
            station_name: 'Ramkund / Godavari River Gauge',
            river_name: 'Godavari River',
            location: 'Nashik Urban',
            current_level_m: 564.2,
            unit: 'm',
            observation_timestamp: '2026-11-03T15:30:00Z',
            warning_level_m: 566.0,
            danger_level_m: 567.5,
            change_status: 'stable',
            rate_of_change: '+0.02 m/h',
            source: 'Maharashtra WRD & CWC Hydrometry',
            is_live: true,
            data_freshness: '15 min ago',
          },
        ],
      })
    }
    if (url.includes('/api/dams')) {
      return createMockResponse({
        dams: [
          {
            name: 'Gangapur Dam',
            gross_capacity_mcft: 5630,
            live_storage_mcft: 4890,
            live_storage_pct: 86.86,
            water_level_m: 610.5,
            inflow_cusecs: 250,
            outflow_cusecs: 0,
            status: 'Normal Storage',
            source: 'WRD Maharashtra',
            observation_date: '2026-11-03',
          },
        ],
      })
    }
    if (url.includes('/api/alerts')) {
      return createMockResponse({
        alerts: [
          {
            id: 1,
            hazard: 'flood',
            level: 'High',
            location: 'Near Riverside Area (Sector 12)',
            message: 'Inspect drainage system and clear blockages',
            state: 'active',
            channels: ['telegram'],
            created_at: '2026-10-25T13:00:00Z',
          },
        ],
      })
    }
    if (url.includes('/api/grid')) {
      return createMockResponse({
        zones: [
          { name: 'Riverside Area', lat: 18.52, lon: 73.86, score: 82 },
          { name: 'Market Zone', lat: 18.53, lon: 73.85, score: 64 },
        ],
        fire_markers: [{ lat: 18.54, lon: 73.88, confidence: 0.8 }],
        radar: true,
      })
    }
    return createMockResponse({ status: 'ok' })
  }))
})

describe('Dashboard', () => {
  it('renders the risk overview and dashboard shell', async () => {
    render(
      <QueryClientProvider client={buildClient()}>
        <ThemeProvider>
          <LocationProvider>
            <MemoryRouter>
              <Dashboard />
            </MemoryRouter>
          </LocationProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Live Command Hub/i)).toBeInTheDocument()
    })

    expect(screen.getByText('Flood Risk')).toBeInTheDocument()
    expect(screen.getByText('Heat Risk')).toBeInTheDocument()
    expect(screen.getByText('Wildfire Risk')).toBeInTheDocument()
    expect(screen.getByText('Geospatial Risk Overlay')).toBeInTheDocument()
  })
})
