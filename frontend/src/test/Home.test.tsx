import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from '../pages/Home'
import { MotionProvider } from '../lib/MotionProvider'

vi.mock('../lib/api', () => ({
  api: {
    health: vi.fn().mockResolvedValue({
      status: 'ok',
      version: '0.1.0',
      timestamp: '2026-10-19T10:00:00Z',
      python: '3.12.7',
      platform: 'win32',
    }),
  },
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <MotionProvider>
      <MemoryRouter>
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </MemoryRouter>
    </MotionProvider>
  )
}

describe('Home page', () => {
  it('renders the brand title and tagline in hero', () => {
    render(<Home />, { wrapper })
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent(/CLIMATEGUARD/i)
    expect(h1).toHaveTextContent('CLIMATEGUARD AI')
    expect(screen.getAllByText(/PREDICT\. PREPARE\. PROTECT\./i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Open Live Dashboard/i }).querySelector('button')).toBeNull()
  })

  it('renders the exact Problem Statement and four hazard cards', () => {
    render(<Home />, { wrapper })
    expect(
      screen.getByText(/Climate Risks Are Local, Fast & Difficult to Predict/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Heatwaves/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Flooding/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Forest Fires/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Crop Stress/i })).toBeInTheDocument()
  })

  it('renders the Proposed Solution pipeline stepper', () => {
    render(<Home />, { wrapper })
    expect(screen.getByRole('button', { name: /SENSE/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /LEARN/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /PREDICT/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /WARN/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ACT/i })).toBeInTheDocument()
  })

  it('renders the four multi-hazard modules with input data specifications', () => {
    render(<Home />, { wrapper })
    expect(screen.getByRole('heading', { name: /FloodGuard AI/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /HeatGuard AI/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /FireGuard AI/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /CropShield AI/i })).toBeInTheDocument()
  })

  it('places the simulated default-city preview after modules and before impact', () => {
    const { container } = render(<Home />, { wrapper })
    const sections = Array.from(container.querySelectorAll('section'))
    const modules = sections.find((section) => section.querySelector('#modules-heading'))
    const cityPreview = sections.find((section) =>
      section.getAttribute('aria-label')?.includes('Default city risk')
    )
    const impact = sections.find((section) => section.querySelector('#impact-heading'))

    expect(modules).toBeDefined()
    expect(cityPreview).toBeDefined()
    expect(impact).toBeDefined()
    expect(modules!.compareDocumentPosition(cityPreview!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(cityPreview!.compareDocumentPosition(impact!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getAllByText('SIMULATED').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/Live city-risk data integration planned for Task 11/i)).toBeInTheDocument()
  })

  it('keeps the demo cards visibly marked as simulated instead of looking live', () => {
    render(<Home />, { wrapper })
    expect(screen.getByText(/Pune City · Default Demo/i)).toBeInTheDocument()
    expect(screen.getAllByText('SIMULATED').length).toBeGreaterThanOrEqual(3)
  })

  it('renders the Team Spartans section with all 5 members and college', () => {
    render(<Home />, { wrapper })
    expect(
      screen.getByText(/K K Wagh Institute of Engineering Education & Research, Nashik/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/Umesh R Jadhav/i)).toBeInTheDocument()
    expect(screen.getByText(/Aniket S Patil/i)).toBeInTheDocument()
    expect(screen.getByText(/Ashish S Dandage/i)).toBeInTheDocument()
    expect(screen.getByText(/Alisha A Mirza/i)).toBeInTheDocument()
    expect(screen.getByText(/Madhulika R Muthal/i)).toBeInTheDocument()
  })
})
