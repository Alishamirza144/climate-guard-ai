import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../pages/Dashboard'
import { LocationProvider } from '../components/LocationProvider'
import i18n from '../i18n'

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
          city_name: 'Nashik',
          state_name: 'Maharashtra',
          recommended_action: 'Inspect drainage system and clear blockages',
          hazard: 'flood',
          level: 'High',
          timestamp: '2026-11-06T12:00:00Z',
          rainfall_summary: '14.2 mm',
          river_level_summary: 'Stable (1.8m)',
          reservoir_summary: 'Nominal',
        },
        outlook: {
          '24h': 'Flood risk remains High.',
          '48h': 'Moderate flood risk expected as runoff recedes.',
          confidence: 'Calibrated SCS-CN hydrologic runoff curve',
        },
        disclaimer: 'Decision-support only. Follow official advisories.',
      })
    }
    if (url.includes('/api/weather/live')) {
      return createMockResponse({
        status: 'OPTIMAL',
        city: 'Nashik',
        state: 'Maharashtra',
        lat: 19.9975,
        lon: 73.7898,
        observation_time: '2026-11-06T12:00:00Z',
        parameters: {
          temperature_c: 28.5,
          temp_min_c: 21.0,
          temp_max_c: 32.0,
          relative_humidity_pct: 65,
          rainfall_past_24h_mm: 12.4,
          precipitation_intensity_mm_h: 2.1,
          wind_speed_kmh: 14.2,
          wind_direction_deg: 240,
          surface_pressure_hpa: 1012,
          soil_moisture_m3_m3: 0.35,
          weather_condition: 'Fair',
        },
      })
    }
    if (url.includes('/api/reservoirs')) {
      return createMockResponse([])
    }
    if (url.includes('/api/water-levels')) {
      return createMockResponse({ stations: [] })
    }
    return createMockResponse({})
  }))
})

describe('Dashboard Multilingual Number and Location Localization', () => {
  it('renders localized location name and native numerals in Hindi', async () => {
    await i18n.changeLanguage('hi')
    const client = buildClient()

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <LocationProvider>
            <Dashboard />
          </LocationProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      // Check that Nashik, Maharashtra is localized to नाशिक, महाराष्ट्र
      expect(screen.getAllByText(/नाशिक/i).length).toBeGreaterThan(0)
    })

    // Check that Devanagari numerals are present in the DOM
    const bodyText = document.body.textContent || ''
    expect(/[\u0966-\u096F]/.test(bodyText)).toBe(true)
  })

  it('renders localized location name and native numerals in Marathi', async () => {
    await i18n.changeLanguage('mr')
    const client = buildClient()

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <LocationProvider>
            <Dashboard />
          </LocationProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getAllByText(/नाशिक/i).length).toBeGreaterThan(0)
    })

    const bodyText = document.body.textContent || ''
    expect(/[\u0966-\u096F]/.test(bodyText)).toBe(true)
  })

  it('switches back to English cleanly', async () => {
    await i18n.changeLanguage('en')
    const client = buildClient()

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <LocationProvider>
            <Dashboard />
          </LocationProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getAllByText(/Nashik/i).length).toBeGreaterThan(0)
    })
  })
})
