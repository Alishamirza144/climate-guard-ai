import { useQuery } from '@tanstack/react-query'
import ModuleDetailPage from '../components/ModuleDetailPage'
import DamMonitoringWidget from '../components/DamMonitoringWidget'
import EmergencyAlertBanner from '../components/EmergencyAlertBanner'
import { useLocationContext } from '../components/LocationProvider'
import { api } from '../lib/api'

export default function FloodGuard() {
  const { location } = useLocationContext()

  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview', location.lat, location.lon, location.cityId],
    queryFn: () => api.riskOverview(location.lat, location.lon, location.cityId),
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
        title="Flood Guard AI"
        subtitle="Hydrological runoff modeling, CWC river stage benchmarks, rainfall accumulation, and drainage surcharge prediction."
        moduleKey="flood"
        accentClass="from-[#2389D7]/30 via-[#102F50] to-[#071A33]"
        badge="PRECISION HYDROLOGY · PAN-INDIA CATCHMENTS"
        fetchData={(lat, lon, cityId) => api.riskFlood(lat, lon, cityId) as Promise<Record<string, unknown>>}
        recommendations={{
          Citizen: [
            'Relocate electrical equipment, vehicles, and valuables from low-lying ground before peak runoff arrives.',
            'Never attempt to drive or walk through flooded roadways, causeways, or submerged railway underpasses.',
            'Keep emergency grab bags packed with dry food, flashlight, drinking water, and essential medications.',
          ],
          Authority: [
            'Pre-deploy de-watering suction pumps and sandbags to historically vulnerable low-lying urban catchments.',
            'Issue traffic diversion orders away from riverbanks and arterial storm channels.',
            'Coordinate emergency relief shelters with medical supplies and potable drinking water.',
          ],
          Farmer: [
            'Clear field drainage bunds and check outlet channels to prevent root-zone water stagnation.',
            'Move harvested produce and bags to elevated concrete platforms away from natural drainage channels.',
            'Secure livestock in high-elevation barns before intense rainfall bursts commence.',
          ],
        }}
      />
    </div>
  )
}
