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

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.endsWith('/api/risk/overview?lat=18.5204&lon=73.8567')) {
      return {
        ok: true,
        json: async () => ({
          lat: 18.5204,
          lon: 73.8567,
          hazards: {
            flood: { risk_percent: 82, level: 'High', probability: 0.82 },
            heat: { risk_percent: 64, level: 'High', probability: 0.64 },
            fire: { risk_percent: 41, level: 'Moderate', probability: 0.41 },
            crop: { risk_percent: 28, level: 'Low', probability: 0.28 },
          },
          highest_priority_alert: {
            title: 'High Flood Risk Detected',
            location: 'Pune, Maharashtra',
            recommended_action: 'Inspect drainage system and clear blockages',
            hazard: 'flood',
            level: 'High',
          },
          outlook: {
            '24h': 'Flood risk remains High.',
            '72h': 'Heat and Fire remain watch points.',
          },
          disclaimer: 'Decision-support only. Follow official IMD/CWC/NDMA advisories.',
        }),
      } as Response
    }
    if (url.endsWith('/api/alerts')) {
      return {
        ok: true,
        json: async () => ({
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
        }),
      } as Response
    }
    if (url.includes('/api/grid')) {
      return {
        ok: true,
        json: async () => ({
          zones: [
            { name: 'Riverside Area', lat: 18.52, lon: 73.86, score: 82 },
            { name: 'Market Zone', lat: 18.53, lon: 73.85, score: 64 },
          ],
          fire_markers: [{ lat: 18.54, lon: 73.88, confidence: 0.8 }],
          radar: true,
        }),
      } as Response
    }
    return {
      ok: true,
      json: async () => ({ status: 'ok' }),
    } as Response
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
      expect(screen.getByText(/Hello, here is the current climate risk status for your area\./i)).toBeInTheDocument()
    })

    expect(screen.getByText('Flood Risk')).toBeInTheDocument()
    expect(screen.getByText('Heat Risk')).toBeInTheDocument()
    expect(screen.getByText('Wildfire Risk')).toBeInTheDocument()
    expect(screen.getByText('Risk Heat Map')).toBeInTheDocument()
  })
})
