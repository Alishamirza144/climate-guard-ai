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
    city_name: 'Nashik',
    state_name: 'Maharashtra',
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

const mockWeather = {
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
}

test.describe('Multilingual Number and Location Localization', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/risk/overview**', async (route) => {
      await route.fulfill({ json: mockOverview })
    })
    await page.route('**/api/weather/live**', async (route) => {
      await route.fulfill({ json: mockWeather })
    })
    await page.route('**/api/reservoirs/**', async (route) => {
      await route.fulfill({ json: [] })
    })
    await page.route('**/api/water-levels/**', async (route) => {
      await route.fulfill({ json: { stations: [] } })
    })
  })

  test('switches language reactively and updates numerals and locations', async ({ page }) => {
    await page.goto('/')

    // Navigate to Dashboard
    await page.getByRole('link', { name: /live intelligence/i }).first().click()
    await expect(page).toHaveURL(/.*dashboard/)

    // Initially in English
    const selector = page.locator('#language-select')
    await expect(selector).toBeVisible()

    // Switch to Hindi (hi)
    await selector.selectOption('hi')
    await page.waitForTimeout(500)

    // Check location label in Hindi
    const pageText = await page.textContent('body')
    expect(pageText).toContain('नाशिक, महाराष्ट्र')

    // Check Devanagari numerals are rendered in the dashboard (e.g. coordinates or temperatures)
    // Devanagari digits: ० १ २ ३ ४ ५ ६ ७ ८ ९
    expect(/[\u0966-\u096F]/.test(pageText || '')).toBe(true)

    // Switch to Bengali (bn)
    await selector.selectOption('bn')
    await page.waitForTimeout(500)

    const bnText = await page.textContent('body')
    // Bengali location and numerals (e.g. ০-৯)
    expect(/[\u09E6-\u09EF]/.test(bnText || '')).toBe(true)

    // Switch back to English (en)
    await selector.selectOption('en')
    await page.waitForTimeout(500)

    const enText = await page.textContent('body')
    expect(enText).toContain('Nashik, Maharashtra')
  })
})
