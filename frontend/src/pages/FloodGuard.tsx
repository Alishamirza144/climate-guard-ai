import ModuleDetailPage from '../components/ModuleDetailPage'
import { api } from '../lib/api'

export default function FloodGuard() {
  return (
    <ModuleDetailPage
      title="FloodGuard AI"
      subtitle="Short-lead flood risk and drainage stress monitoring built from rainfall, runoff, and terrain exposure."
      moduleKey="flood"
      accentClass="from-cyan-500/30 via-sky-500/10 to-slate-950"
      badge="FREE-DATA FLOOD"
      fetchData={(lat, lon) => api.riskFlood(lat, lon) as Promise<Record<string, unknown>>}
      recommendations={{
        Citizen: [
          'Move valuables and low-lying gear to higher ground before peak runoff arrives.',
          'Avoid crossing flooded roads or underpasses while rainfall remains elevated.',
          'Monitor local ward updates and keep an emergency bag ready if the lead time shortens.',
        ],
        Authority: [
          'Deploy pumps and sandbags to the most exposed catchments before the next three-hour peak.',
          'Coordinate road closure orders for low-lying segments and drainage channels.',
          'Prioritise camp and shelter access for zones with the highest runoff sensitivity.',
        ],
        Farmer: [
          'Protect downstream plots and seed storage from overtopping and field-to-field pooling.',
          'Shift short-cycle crops away from depressions and drainage channels with the highest exposure.',
          'Check bund integrity and drainage outlets before the next intense rain burst.',
        ],
      }}
    />
  )
}
