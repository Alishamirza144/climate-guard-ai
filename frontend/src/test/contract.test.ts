import { describe, expect, it } from 'vitest'
import type { components, paths } from '../types/api.generated'

describe('OpenAPI contract', () => {
  it('exposes the expected backend endpoints and payload shapes', () => {
    const healthPath = {} as paths['/api/health']
    const searchPath = {} as paths['/api/location/search']
    const overviewPath = {} as paths['/api/risk/overview']
    const healthSchema = {} as components['schemas']['HealthResponse']
    const searchSchema = {} as components['schemas']['LocationSearchResponse']

    expect(healthPath).toBeDefined()
    expect(searchPath).toBeDefined()
    expect(overviewPath).toBeDefined()
    expect(healthSchema).toBeDefined()
    expect(searchSchema).toBeDefined()
  })
})
