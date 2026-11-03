import ModuleDetailPage from '../components/ModuleDetailPage'
import { api } from '../lib/api'

export default function HeatGuard() {
  return (
    <ModuleDetailPage
      title="Heat Guard AI"
      subtitle="Extreme daytime heat, relative humidity, apparent temperature, and heatwave early warnings based on IMD climatology standards."
      moduleKey="heat"
      accentClass="from-[#F4BC4D]/30 via-[#102F50] to-[#071A33]"
      badge="THERMAL INTELLIGENCE · IMD CRITERIA"
      fetchData={(lat, lon) => api.riskHeat(lat, lon) as Promise<Record<string, unknown>>}
      recommendations={{
        Citizen: [
          'Reduce strenuous outdoor physical activity during the daily peak heat window (12:00 PM – 4:00 PM).',
          'Maintain frequent hydration with oral rehydration salts (ORS), lemon water, and electrolyte fluids.',
          'Check vulnerable neighbors, especially infants and senior citizens, for signs of heat exhaustion.',
        ],
        Authority: [
          'Issue municipal heatwave alerts to public health centers and activate designated shaded cooling stations.',
          'Adjust outdoor worker shifts to early morning and late evening hours.',
          'Ensure uninterrupted electrical grid power supply to municipal water pumping and hospital facilities.',
        ],
        Farmer: [
          'Shift field labor to morning hours (6:00 AM – 10:00 AM) to limit direct solar exposure.',
          'Provide shaded shelter and abundant drinking water for livestock and dairy cattle.',
          'Schedule crop watering during early dawn or twilight to minimize evaporative losses.',
        ],
      }}
    />
  )
}
