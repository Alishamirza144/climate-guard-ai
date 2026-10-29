import { expect, test } from '@playwright/test'

const mockOverview = {
  lat: 19.9975,
  lon: 73.7898,
  hazards: {
    flood: { risk_percent: 78, level: 'High', probability: 0.78 },
    heat: { risk_percent: 66, level: 'High', probability: 0.66 },
    fire: { risk_percent: 34, level: 'Moderate', probability: 0.34 },
    crop: { risk_percent: 26, level: 'Low', probability: 0.26 },
  },
  highest_priority_alert: {
    title: 'Flash flooding risk',
    location: 'Nashik',
    recommended_action: 'Move valuables to higher ground.',
    hazard: 'flood',
    level: 'High',
  },
  outlook: {
    flood: 'Heavy rain expected in the next 6 hours.',
    heat: 'Nighttime recovery remains limited.',
  },
  disclaimer: 'Decision-support only. Follow official advisories.',
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/location/search**', async (route) => {
    await route.fulfill({
      json: {
        results: [
          {
            id: 1,
            name: 'Nashik',
            latitude: 19.9975,
            longitude: 73.7898,
            country: 'India',
            admin1: 'Maharashtra',
            timezone: 'Asia/Kolkata',
          },
        ],
      },
    })
  })

  await page.route('**/api/risk/overview**', async (route) => {
    await route.fulfill({ json: mockOverview })
  })

  await page.route('**/api/risk/flood**', async (route) => {
    await route.fulfill({
      json: {
        score: 78,
        level: 'High',
        probability: 0.78,
        expected_severity: 'Minor drainage stress',
        estimated_peak_runoff_depth_mm: 32.4,
        lead_time_hours: 12,
        affected_zone: 'Nashik',
        model_mode: 'physics',
      },
    })
  })

  await page.route('**/api/risk/heat**', async (route) => {
    await route.fulfill({
      json: {
        score: 66,
        level: 'High',
        probability: 0.66,
        headline: 'High heat risk detected in Nashik',
        model_mode: 'physics',
      },
    })
  })

  await page.route('**/api/risk/fire**', async (route) => {
    await route.fulfill({
      json: {
        score: 34,
        level: 'Moderate',
        probability: 0.34,
        headline: 'Moderate wildfire risk',
        model_mode: 'physics',
      },
    })
  })

  await page.route('**/api/grid**', async (route) => {
    await route.fulfill({
      json: {
        zones: [
          { name: 'Nashik Central', lat: 19.9975, lon: 73.7898, score: 78 },
          { name: 'Market Zone', lat: 20.005, lon: 73.78, score: 64 },
        ],
        fire_markers: [{ lat: 19.99, lon: 73.8, confidence: 0.7 }],
        radar: true,
      },
    })
  })

  await page.route('**/api/alerts**', async (route) => {
    await route.fulfill({ json: { alerts: [] } })
  })

  await page.route('**/api/data-sources**', async (route) => {
    await route.fulfill({
      json: {
        generated_at: '2026-10-25T12:00:00Z',
        source_count: 3,
        healthy_count: 3,
        sources: [
          { key: 'openmeteo', name: 'Open-Meteo', category: 'forecast', description: 'Forecast data', url: 'https://open-meteo.com', status: 'online', latency_ms: 140, last_successful_call: '2026-10-25T11:55:00Z' },
        ],
      },
    })
  })
})

test('landing page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('CLIMATEGUARD')
  await page.screenshot({ path: '../docs/qa/landing-page.png', fullPage: true })
})

test('search Nashik updates dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByLabel('Search location').fill('Nashik')
  await expect(page.getByRole('button', { name: /Nashik/i })).toBeVisible()
  await page.getByRole('button', { name: /Nashik/i }).click()
  await expect(page.getByText(/Nashik/i).first()).toBeVisible()
  await page.screenshot({ path: '../docs/qa/dashboard-nashik.png', fullPage: true })
})

test('module pages render with data', async ({ page }) => {
  await page.goto('/flood')
  await expect(page.getByRole('heading', { name: /FloodGuard AI/i })).toBeVisible()
  await expect(page.getByText(/Short-lead flood risk/i)).toBeVisible()
  await page.goto('/heat')
  await expect(page.getByRole('heading', { name: /HeatGuard AI/i })).toBeVisible()
  await page.screenshot({ path: '../docs/qa/module-pages.png', fullPage: true })
})

test('drainage simulator triggers an alert', async ({ page }) => {
  await page.goto('/drainage')
  await page.getByRole('button', { name: /Trigger blockage alert/i }).click()
  await expect(page.getByText(/Drainage alert triggered/i)).toBeVisible()
  await page.screenshot({ path: '../docs/qa/drainage-alert.png', fullPage: true })
})

test('PWA offline shell loads', async ({ page }) => {
  await page.goto('/offline.html')
  await expect(page.getByText(/Offline mode/i)).toBeVisible()
  await page.screenshot({ path: '../docs/qa/pwa-offline.png', fullPage: true })
})

test('mobile viewport renders correctly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('banner')).toBeVisible()
  await page.screenshot({ path: '../docs/qa/mobile-home.png', fullPage: true })
})
