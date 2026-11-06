import { describe, it, expect, beforeEach } from 'vitest'
import { setCachedTelemetry, getCachedTelemetry } from '../lib/cache'

describe('Telemetry SWR Cache', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores and retrieves cached telemetry accurately', () => {
    const testData = { temperature_c: 29.4, city: 'Nashik' }
    setCachedTelemetry('test_weather', testData, '2026-11-06T12:00:00Z')

    const retrieved = getCachedTelemetry<typeof testData>('test_weather')
    expect(retrieved).not.toBeNull()
    expect(retrieved?.data.temperature_c).toBe(29.4)
    expect(retrieved?.observationTime).toBe('2026-11-06T12:00:00Z')
    expect(retrieved?.cachedAt).toBeGreaterThan(0)
  })

  it('invalidates cache when older than maxAgeMs', () => {
    const testData = { risk: 45 }
    setCachedTelemetry('test_stale', testData)

    // Query with negative or 0 maxAge to simulate expiry
    const expired = getCachedTelemetry('test_stale', -1)
    expect(expired).toBeNull()
  })

  it('returns null for non-existent keys', () => {
    expect(getCachedTelemetry('non_existent')).toBeNull()
  })
})
