import { Waves, TrendingUp, TrendingDown, Minus, AlertTriangle, ShieldCheck, Info } from 'lucide-react'
import type { WaterLevelsResponse, WaterStation } from '../lib/api'

interface WaterLevelWidgetProps {
  waterData: WaterLevelsResponse | undefined
  isLoading: boolean
}

export default function WaterLevelWidget({ waterData, isLoading }: WaterLevelWidgetProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-[#B9D9F5] bg-[#F0F8FF] p-5 shadow-sm animate-pulse space-y-4">
        <div className="h-6 w-48 rounded-xl bg-[#CDE8FF]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="h-28 rounded-2xl bg-[#EDF7FF]" />
          <div className="h-28 rounded-2xl bg-[#EDF7FF]" />
        </div>
      </div>
    )
  }

  const stations = waterData?.stations ?? []
  const hasStations = stations.length > 0 && waterData?.status !== 'LIVE WATER-LEVEL DATA UNAVAILABLE'

  return (
    <section className="rounded-3xl border-2 border-[#B9D9F5] bg-[#F0F8FF] p-5 shadow-sm text-[#20364D] space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#B9D9F5]">
        <div>
          <div className="flex items-center gap-2">
            <Waves className="h-5 w-5 text-[#2784D8]" />
            <h3 className="font-display font-extrabold text-base sm:text-lg text-[#20364D]">
              Real Water-Level & River Gauge Monitoring
            </h3>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#2784D8]/20 text-[#2784D8] border border-[#2784D8]/30">
              CWC & WRD Hydro Gauges
            </span>
          </div>
          <p className="text-xs text-[#5B7188] mt-0.5">
            Active river channels, tidal stations, and hydrometric gauges for{' '}
            <span className="font-semibold text-[#20364D]">
              {waterData?.city}, {waterData?.state}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#5B7188]">
          <span>Observation: {waterData?.timestamp || 'Live'}</span>
        </div>
      </div>

      {!hasStations ? (
        <div className="rounded-2xl border border-[#B9D9F5] bg-[#EDF7FF] p-6 text-center space-y-2">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#2784D8]/10 text-[#2784D8]">
            <Info className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-extrabold text-[#20364D]">LIVE WATER-LEVEL DATA UNAVAILABLE</h4>
          <p className="text-xs text-[#5B7188] max-w-md mx-auto">
            {waterData?.message ||
              `No active Central Water Commission (CWC) river gauges currently indexed for this municipality. Urban runoff and micro-drainage are computed via hydrologic model.`}
          </p>
          <p className="text-[10px] text-[#5B7188] font-bold uppercase tracking-wider">
            Source: Central Water Commission (CWC) Hydro-telemetry Network
          </p>
        </div>
      ) : (
        /* Grid of Real River Monitoring Stations */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((st: WaterStation) => {
            const pctOfWarning = Math.min(100, Math.round((st.current_water_level_m / st.warning_threshold_m) * 100))
            const isDanger = st.current_water_level_m >= st.danger_threshold_m
            const isWarning = st.current_water_level_m >= st.warning_threshold_m

            return (
              <div
                key={st.station_name}
                className="rounded-2xl border border-[#B9D9F5] bg-[#EDF7FF] p-4 flex flex-col justify-between space-y-3 transition hover:shadow-sm"
              >
                {/* Station & River */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-[#20364D] leading-tight">{st.station_name}</h4>
                      <p className="text-xs font-bold text-[#2784D8] mt-0.5">{st.river_name}</p>
                    </div>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isDanger
                          ? 'bg-[#E45B62]/20 text-[#E45B62] border border-[#E45B62]/30'
                          : isWarning
                          ? 'bg-[#F2B544]/20 text-[#B47510] border border-[#F2B544]/30'
                          : 'bg-[#299765]/20 text-[#299765] border border-[#299765]/30'
                      }`}
                    >
                      {st.status}
                    </span>
                  </div>

                  {/* Level Metrics */}
                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black font-mono text-[#20364D]">
                        {st.current_water_level_m} {st.unit}
                      </span>
                      <span className="block text-[10px] font-bold text-[#5B7188] uppercase tracking-wider">
                        Current Measured Gauge
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs font-bold">
                        {st.water_level_change_3h_m > 0 ? (
                          <span className="flex items-center text-[#E45B62]">
                            <TrendingUp className="h-3.5 w-3.5 mr-0.5" />+{st.water_level_change_3h_m}m
                          </span>
                        ) : st.water_level_change_3h_m < 0 ? (
                          <span className="flex items-center text-[#299765]">
                            <TrendingDown className="h-3.5 w-3.5 mr-0.5" />{st.water_level_change_3h_m}m
                          </span>
                        ) : (
                          <span className="flex items-center text-[#5B7188]">
                            <Minus className="h-3.5 w-3.5 mr-0.5" />Stable
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#5B7188] font-semibold">
                        {st.rate_of_change_m_per_hour >= 0 ? '+' : ''}
                        {st.rate_of_change_m_per_hour} m/h
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar vs warning/danger thresholds */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#5B7188] mb-1">
                    <span>Normal Flow</span>
                    <span>Warning: {st.warning_threshold_m}m</span>
                    <span className="text-[#E45B62]">Danger: {st.danger_threshold_m}m</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#B9DEFF] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isDanger ? 'bg-[#E45B62]' : isWarning ? 'bg-[#F2B544]' : 'bg-[#2784D8]'
                      }`}
                      style={{ width: `${pctOfWarning}%` }}
                    />
                  </div>
                </div>

                {/* Station metadata footer */}
                <div className="pt-2 border-t border-[#B9D9F5]/60 flex items-center justify-between text-[9px] font-semibold text-[#5B7188]">
                  <span>Source: {st.source.split('/')[0]}</span>
                  <span className="text-[#299765] font-bold">● {st.freshness}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
