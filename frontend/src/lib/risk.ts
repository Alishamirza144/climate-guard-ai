export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical'

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
