import ModuleDetailPage from '../components/ModuleDetailPage'
import { api } from '../lib/api'

export default function CropShield() {
  return (
    <ModuleDetailPage
      title="CropShield AI"
      subtitle="Field-level crop stress, soil moisture, and weather-driven productivity monitoring."
      moduleKey="crop"
      accentClass="from-lime-500/25 via-emerald-500/10 to-slate-950"
      badge="SMART AGRI"
      fetchData={(lat, lon) => api.riskCrop(lat, lon) as Promise<Record<string, unknown>>}
      recommendations={{
        Citizen: [
          'Review irrigation timing and postpone non-urgent field operations in the hottest part of the day.',
          'Check seedlings and root-zone moisture in exposed plots before heat or stress builds.',
          'Use the field risk score to prioritise protective actions and targeted nutrient follow-up.',
        ],
        Authority: [
          'Coordinate agronomy support for vulnerable crops in high-risk micro-climates and dry belts.',
          'Watch for crop stress clustering in irrigation gaps and dry-season hotspots.',
          'Prepare water allocation guidance for communities with high crop sensitivity.',
        ],
        Farmer: [
          'Focus watering on stressed rows and high-value crop blocks before a sharp yield drop.',
          'Inspect for wilting, nutrient stress, or fungal pressure after warm, damp intervals.',
          'Use the field profile to direct resource allocation to the most exposed plots first.',
        ],
      }}
    />
  )
}
