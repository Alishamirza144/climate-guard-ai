export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical' | 'very_high' | 'extreme'

/**
 * Standardized 0–100 ClimateGuard Risk Level classification:
 * Low: 0–29
 * Moderate: 30–59
 * High: 60–84
 * Critical: 85–100
 */
export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score < 30) return 'low'
  if (score < 60) return 'moderate'
  if (score < 85) return 'high'
  return 'critical'
}

/**
 * Part 8 Risk Index Bands Specification:
 * 0–19: LOW (CONDITIONS NORMAL when all telemetry is fresh and nominal)
 * 20–39: MODERATE
 * 40–59: HIGH
 * 60–79: VERY HIGH
 * 80–100: EXTREME
 */
export function getRiskBand(score: number): { band: string; level: string; color: string } {
  if (score < 20) return { band: 'LOW', level: 'Low', color: '#299765' }
  if (score < 40) return { band: 'MODERATE', level: 'Moderate', color: '#2784D8' }
  if (score < 60) return { band: 'HIGH', level: 'High', color: '#F2B544' }
  if (score < 80) return { band: 'VERY HIGH', level: 'Very High', color: '#E45B62' }
  return { band: 'EXTREME', level: 'Extreme', color: '#B91C1C' }
}
