import ModuleDetailPage from '../components/ModuleDetailPage'
import { api } from '../lib/api'

export default function FireGuard() {
  return (
    <ModuleDetailPage
      title="Fire Guard AI"
      subtitle="Forest and grassland fire weather risk, Canadian FWI index, fuel dryness, and thermal anomaly detection context."
      moduleKey="fire"
      accentClass="from-[#F06470]/30 via-[#102F50] to-[#071A33]"
      badge="FIRE WEATHER INDEX · FWI ENGINE"
      fetchData={(lat, lon) => api.riskFire(lat, lon) as Promise<Record<string, unknown>>}
      recommendations={{
        Citizen: [
          'Strictly avoid open burning, agricultural residue burning, or campfires in dry or windy weather.',
          'Create a defensible perimeter around rural property by clearing dry brush, dead leaves, and dry thatch.',
          'Report any roadside or forest smoke plumes immediately to the local forest department or fire emergency (101).',
        ],
        Authority: [
          'Pre-position quick-response forest fire patrols and water tenders in designated high-risk forest ranges.',
          'Monitor satellite thermal anomaly feeds (NASA FIRMS / ISRO Bhuvan) for rapid containment.',
          'Enforce strict bans on unpermitted agricultural stubble or brush burning in dry conditions.',
        ],
        Farmer: [
          'Maintain firebreak corridors of bare earth around standing crop fields and dry grain storage sheds.',
          'Safely wet down haystacks and store flammable agricultural fuels in sealed, shaded structures.',
          'Never burn dry field margins without notifying local agricultural and panchayat authorities.',
        ],
      }}
    />
  )
}
