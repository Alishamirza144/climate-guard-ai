/**
 * Client-side Stale-While-Revalidate (SWR) cache for live climate telemetry.
 *
 * Persists observations to localStorage so the dashboard and AI modules can render
 * instantaneously while background queries poll for live updates.
 *
 * Rules:
 * - Never fabricate values.
 * - Always record the exact observation timestamp and cache capture time.
 * - Clearly flag cached data with its original timestamp.
 */

export interface CachedItem<T> {
  data: T
  cachedAt: number // epoch ms
  observationTime: string
}

const PREFIX = 'climateguard_cache_v1_'

export function setCachedTelemetry<T>(key: string, data: T, observationTime?: string): void {
  if (typeof window === 'undefined' || !data) return
  try {
    const payload: CachedItem<T> = {
      data,
      cachedAt: Date.now(),
      observationTime: observationTime || new Date().toISOString(),
    }
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(payload))
  } catch {
    // Gracefully ignore quota or private browsing storage errors
  }
}

export function getCachedTelemetry<T>(
  key: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000
): CachedItem<T> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedItem<T>
    if (!parsed || !parsed.data) return null
    // If older than maxAge, invalidate
    if (Date.now() - parsed.cachedAt > maxAgeMs) {
      localStorage.removeItem(`${PREFIX}${key}`)
      return null
    }
    return parsed
  } catch {
    return null
  }
}
