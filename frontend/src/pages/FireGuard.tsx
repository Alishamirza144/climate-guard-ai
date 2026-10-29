import ModuleDetailPage from '../components/ModuleDetailPage'
import { api } from '../lib/api'

export default function FireGuard() {
  return (
    <ModuleDetailPage
      title="FireGuard AI"
      subtitle="Satellite fire detection, dryness, and fire-weather risk for quick operational forest monitoring."
      moduleKey="fire"
      accentClass="from-red-500/25 via-orange-500/10 to-slate-950"
      badge="FIRE WEATHER"
      fetchData={(lat, lon) => api.riskFire(lat, lon) as Promise<Record<string, unknown>>}
      recommendations={{
        Citizen: [
          'Avoid campfires, smoking, and open burning in the current fire weather band.',
          'Stay alert for smoke drift and follow local fire advisories in nearby forest corridors.',
          'Keep emergency routes and water sources ready if the risk escalates.',
        ],
        Authority: [
          'Place crews on watch at high-risk vegetation patches and validate FIRMS detections immediately.',
          'Activate fire suppression planning in dry, windy corridors before a spread event develops.',
          'Coordinate community alerts and evacuation readiness if hotspots cluster or grow.',
        ],
        Farmer: [
          'Inspect crop residue and field edges where dry fuel load and wind can amplify spread risk.',
          'Avoid controlled burning in dry conditions, and keep firebreaks clear and accessible.',
          'Prioritise water and power access in fields adjacent to fire-prone vegetation.',
        ],
      }}
    />
  )
}
