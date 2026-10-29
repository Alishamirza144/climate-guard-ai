import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ModuleDetailPage, { normalizePercent } from '../components/ModuleDetailPage'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { RiskGauge } from '../components/ui/RiskGauge'
import { DataSourceBadge } from '../components/ui/DataSourceBadge'
import { Stat } from '../components/ui/Stat'
import { getRiskLevelFromScore } from '../lib/risk'
import { MotionProvider } from '../lib/MotionProvider'
import { api } from '../lib/api'

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={queryClient}>
      <MotionProvider>{children}</MotionProvider>
    </QueryClientProvider>
  )
}

describe('UI Design System', () => {
  describe('Risk Level Classification (Rule 1 & Non-negotiables)', () => {
    it('correctly maps scores to strictly defined risk levels', () => {
      expect(getRiskLevelFromScore(0)).toBe('low')
      expect(getRiskLevelFromScore(29)).toBe('low')
      expect(getRiskLevelFromScore(30)).toBe('moderate')
      expect(getRiskLevelFromScore(59)).toBe('moderate')
      expect(getRiskLevelFromScore(60)).toBe('high')
      expect(getRiskLevelFromScore(84)).toBe('high')
      expect(getRiskLevelFromScore(85)).toBe('critical')
      expect(getRiskLevelFromScore(100)).toBe('critical')
    })
  })

  describe('Badge component', () => {
    it('renders with correct variant and text', () => {
      render(<Badge variant="critical">CRITICAL HAZARD</Badge>, { wrapper })
      expect(screen.getByText('CRITICAL HAZARD')).toBeInTheDocument()
    })
  })

  describe('RiskGauge component', () => {
    it('renders accessible meter with aria attributes', () => {
      render(<RiskGauge score={72} label="River Flood Risk" />, { wrapper })
      const meter = screen.getByRole('meter')
      expect(meter).toHaveAttribute('aria-valuenow', '72')
      expect(meter).toHaveAttribute('aria-valuemin', '0')
      expect(meter).toHaveAttribute('aria-valuemax', '100')
      expect(screen.getByText('72')).toBeInTheDocument()
      expect(screen.getByText('HIGH')).toBeInTheDocument()
    })
  })

  describe('DataSourceBadge component (Rule 1 Non-negotiable)', () => {
    it('renders LIVE stream badge with provider name', () => {
      render(<DataSourceBadge source="live" provider="Open-Meteo" updatedAt="2 min ago" />, { wrapper })
      expect(screen.getByText(/LIVE · Open-Meteo/i)).toBeInTheDocument()
    })

    it('renders prominent SIMULATED badge for synthetic/test data', () => {
      render(<DataSourceBadge source="simulated" provider="Synthetic Scenario" />, { wrapper })
      expect(screen.getByText('SIMULATED')).toBeInTheDocument()
      expect(screen.getByText('(Synthetic Scenario)')).toBeInTheDocument()
    })
  })

  describe('Button component', () => {
    it('renders text and handles disabled/loading state', () => {
      render(<Button isLoading>Submit</Button>, { wrapper })
      const btn = screen.getByRole('button')
      expect(btn).toBeDisabled()
    })
  })

  describe('Stat component', () => {
    it('renders metric with unit and label', () => {
      render(
        <Stat
          label="Ambient Temperature"
          value={38.4}
          unit="°C"
          trend="up"
          trendValue="+1.2 °C/h"
        />,
        { wrapper }
      )
      expect(screen.getByText('Ambient Temperature')).toBeInTheDocument()
      expect(screen.getByText('38.4')).toBeInTheDocument()
      expect(screen.getByText('°C')).toBeInTheDocument()
      expect(screen.getByText('+1.2 °C/h')).toBeInTheDocument()
    })
  })

  describe('Module detail number normalization', () => {
    it('treats fractional and already-percent probability values as the same percentage', () => {
      const fractionalProbability = 0.68
      const alreadyPercent = 68

      // Hand-calculated example: 0.68 = 68%, and 68 already means 68%.
      expect(normalizePercent(fractionalProbability)).toBe(68)
      expect(normalizePercent(alreadyPercent)).toBe(68)
    })

    it('shows a clear unavailable state instead of a blank or NaN score', async () => {
      vi.spyOn(api, 'mlMetrics').mockResolvedValue({ model_confidence: 0.72 })
      vi.spyOn(api, 'grid').mockResolvedValue({ zones: [] })

      render(
        <ModuleDetailPage
          title="Heat Guard"
          subtitle="Heat and humidity stress tracking"
          moduleKey="heat"
          accentClass="from-orange-500/30 to-rose-500/20"
          badge="LIVE"
          fetchData={async () => ({ score: Number.NaN, probability: 'NaN' })}
          recommendations={{
            Citizen: ['Drink water and reduce strenuous activity outside.'],
            Authority: ['Issue heat advisory if prolonged exposure persists.'],
            Farmer: ['Protect workers and livestock during peak heat.'],
          }}
        />,
        { wrapper }
      )

      expect(await screen.findByText('Data unavailable')).toBeInTheDocument()
    })
  })
})
