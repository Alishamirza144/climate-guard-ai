import ModuleDetailPage from '../components/ModuleDetailPage'
import { api } from '../lib/api'

export default function HeatGuard() {
  return (
    <ModuleDetailPage
      title="HeatGuard AI"
      subtitle="Hot-day, humidity, and nighttime heat stress risk using live weather and climatology context."
      moduleKey="heat"
      accentClass="from-orange-500/25 via-amber-500/10 to-slate-950"
      badge="HEATWAVE WATCH"
      fetchData={(lat, lon) => api.riskHeat(lat, lon) as Promise<Record<string, unknown>>}
      recommendations={{
        Citizen: [
          'Reduce outdoor exertion during the daily peak heat window and keep hydration close by.',
          'Open shaded, cooler rooms and avoid direct sun exposure through the hottest hours.',
          'Check vulnerable neighbours, especially older adults and infants, for heat stress signs.',
        ],
        Authority: [
          'Issue a public heat warning to vulnerable areas and schedule cooling centres in dense districts.',
          'Increase staffing for emergency response around midday peaks and wet-bulb stress conditions.',
          'Coordinate transport and power support for heat-vulnerable urban hotspots.',
        ],
        Farmer: [
          'Shift field work to early morning and late evening to limit crop heat stress.',
          'Increase irrigation coverage and protect nursery stock from high afternoon temperatures.',
          'Inspect orchards and open fields for wilting and thermal stress before sunset.',
        ],
      }}
    />
  )
}
