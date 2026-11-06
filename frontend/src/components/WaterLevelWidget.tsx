import { useTranslation } from 'react-i18next'
import { Waves, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import type { WaterLevelsResponse, WaterStation } from '../lib/api'
import { useLocaleFormatter } from '../i18n/formatters'
import { localizeCity, localizeState } from '../i18n/locations'

interface WaterLevelWidgetProps {
  waterData: WaterLevelsResponse | undefined
  isLoading: boolean
}

export default function WaterLevelWidget({ waterData, isLoading }: WaterLevelWidgetProps) {
  const { t } = useTranslation()
  const { formatNumber, formatDigits, lang } = useLocaleFormatter()
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-[#285274] bg-[#12385C] p-5 shadow-lg animate-pulse space-y-4">
        <div className="h-6 w-48 rounded-xl bg-[#0E2B49]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="h-28 rounded-2xl bg-[#0B2545]" />
          <div className="h-28 rounded-2xl bg-[#0B2545]" />
        </div>
      </div>
    )
  }

  const stations = waterData?.stations ?? []
  const hasStations = stations.length > 0 && waterData?.status !== 'LIVE WATER-LEVEL DATA UNAVAILABLE'

  return (
    <section className="rounded-3xl border border-[#285274] bg-[#12385C] p-5 shadow-xl text-[#F3F8FF] space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#285274]">
        <div>
          <div className="flex items-center gap-2">
            <Waves className="h-5 w-5 text-[#25C5DC]" />
            <h3 className="font-display font-extrabold text-base sm:text-lg text-[#F3F8FF]">
              {t('dashboard.riverTitle', 'River Gauge Monitoring & Calibrated Water-Level')}
            </h3>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#2389D7]/20 text-[#25C5DC] border border-[#2389D7]/40">
              {t('water.cwcBenchmarks', 'CWC Benchmarks · GloFAS Coupling')}
            </span>
          </div>
          <p className="text-xs text-[#B6C9DC] mt-0.5">
            {t('water.activeChannels', 'Active river channels, tidal stations, and hydrometric gauges for')}{' '}
            <span className="font-semibold text-[#8ED8F5]">
              {waterData?.city ? localizeCity(waterData.city, lang) : ''}, {waterData?.state ? localizeState(waterData.state, lang) : ''}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#B6C9DC]">
          <span>{t('water.modelCycle', 'Model Cycle')}: {waterData?.timestamp ? formatDigits(waterData.timestamp, lang) : t('common.live', 'Live')}</span>
        </div>
      </div>

      {!hasStations ? (
        <div className="rounded-2xl border border-[#285274] bg-[#0E2B49] p-6 text-center space-y-2">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#2389D7]/20 text-[#25C5DC]">
            <Info className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-extrabold text-[#F3F8FF]">{t('water.indexedRunoff', 'RIVER GAUGE DATA INDEXED VIA RUNOFF MODEL')}</h4>
          <p className="text-xs text-[#B6C9DC] max-w-md mx-auto">
            {waterData?.message || t('water.noCwcGauges', 'No active Central Water Commission (CWC) river gauges currently indexed for this municipality. Urban runoff and micro-drainage are computed via hydrologic model.')}
          </p>
          <p className="text-[10px] text-[#25C5DC] font-bold uppercase tracking-wider">
            {t('water.hydroSource', 'Source: Central Water Commission (CWC) Hydro-telemetry Network & Copernicus GloFAS')}
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
                className="rounded-2xl border border-[#285274] bg-[#0E2B49] p-4 flex flex-col justify-between space-y-3 transition hover:border-[#2389D7]"
              >
                {/* Station & River */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-[#F3F8FF] leading-tight">{st.station_name}</h4>
                      <p className="text-xs font-bold text-[#25C5DC] mt-0.5">{st.river_name}</p>
                    </div>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isDanger
                          ? 'bg-[#F06470]/20 text-[#F06470] border border-[#F06470]/40'
                          : isWarning
                          ? 'bg-[#F4BC4D]/20 text-[#F4BC4D] border border-[#F4BC4D]/40'
                          : 'bg-[#35C58B]/20 text-[#35C58B] border border-[#35C58B]/40'
                      }`}
                    >
                      {st.status}
                    </span>
                  </div>

                  {/* Level Metrics */}
                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black font-mono text-[#F3F8FF]">
                        {formatNumber(st.current_water_level_m, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} {st.unit}
                      </span>
                      <span className="block text-[10px] font-bold text-[#B6C9DC] uppercase tracking-wider">
                        {t('water.calibratedStage', 'Calibrated River Stage')}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs font-bold">
                        {st.water_level_change_3h_m > 0 ? (
                          <span className="flex items-center text-[#F06470]">
                            <TrendingUp className="h-3.5 w-3.5 mr-0.5" />+{formatNumber(st.water_level_change_3h_m, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}m
                          </span>
                        ) : st.water_level_change_3h_m < 0 ? (
                          <span className="flex items-center text-[#35C58B]">
                            <TrendingDown className="h-3.5 w-3.5 mr-0.5" />{formatNumber(st.water_level_change_3h_m, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}m
                          </span>
                        ) : (
                          <span className="flex items-center text-[#B6C9DC]">
                            <Minus className="h-3.5 w-3.5 mr-0.5" />{t('common.stable', 'Stable')}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#B6C9DC] font-semibold">
                        {st.rate_of_change_m_per_hour >= 0 ? '+' : ''}
                        {formatNumber(st.rate_of_change_m_per_hour, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} m/h
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar vs warning/danger thresholds */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#B6C9DC] mb-1">
                    <span>{t('common.normalFlow', 'Normal Flow')}</span>
                    <span>{t('risk.warning', 'Warning')}: {formatNumber(st.warning_threshold_m, { minimumFractionDigits: 1 })}m</span>
                    <span className="text-[#F06470]">{t('risk.critical', 'Danger')}: {formatNumber(st.danger_threshold_m, { minimumFractionDigits: 1 })}m</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#102F50] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isDanger ? 'bg-[#F06470]' : isWarning ? 'bg-[#F4BC4D]' : 'bg-[#2389D7]'
                      }`}
                      style={{ width: `${pctOfWarning}%` }}
                    />
                  </div>
                </div>

                {/* Station metadata footer */}
                <div className="pt-2 border-t border-[#285274]/60 flex items-center justify-between text-[9px] font-semibold text-[#B6C9DC]">
                  <span>{t('water.thresholdsBenchmark', 'Thresholds: CWC Benchmark')}</span>
                  <span className="text-[#25C5DC] font-bold">● {st.freshness || t('water.calibratedStage', 'Calibrated Model')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hasStations && (
        <div className="rounded-xl border border-[#285274] bg-[#0E2B49] px-3.5 py-2 text-[11px] text-[#B6C9DC] flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-[#25C5DC]" />
          <span>
            {t('water.hydroNote', 'Warning/danger thresholds represent official CWC / State WRD standards. Current river stages are calibrated hydrological estimates derived from Copernicus GloFAS river discharge and station cross-sections.')}
          </span>
        </div>
      )}
    </section>
  )
}
