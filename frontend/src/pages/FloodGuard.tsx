import { useQuery } from '@tanstack/react-query'
import ModuleDetailPage from '../components/ModuleDetailPage'
import DamMonitoringWidget from '../components/DamMonitoringWidget'
import EmergencyAlertBanner from '../components/EmergencyAlertBanner'
import { useLocationContext } from '../components/LocationProvider'
import { api } from '../lib/api'

export default function FloodGuard() {
  const { location } = useLocationContext()

  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview', location.lat, location.lon],
    queryFn: () => api.riskOverview(location.lat, location.lon),
    staleTime: 60_000,
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Flash-Flood Emergency Weather Alert Banner */}
      {overviewQuery.data?.emergency_alert && (
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <EmergencyAlertBanner alert={overviewQuery.data.emergency_alert} />
        </div>
      )}

      {/* Dam & Reservoir Capacity Monitoring Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <DamMonitoringWidget />
      </div>

      {/* FloodGuard AI Detail Engine View */}
      <ModuleDetailPage
        title="FloodGuard AI"
        subtitle="Short-lead flood risk, river stage monitoring, and drainage stress built from rainfall, runoff, and terrain exposure."
        moduleKey="flood"
        accentClass="from-[#2784D8]/30 via-[#CDE8FF] to-[#DFF1FF]"
        badge="PRECISION HYDROLOGY · MAHARASHTRA"
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
    </div>
  )
}
