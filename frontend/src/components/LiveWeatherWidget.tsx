import {
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  CloudRain,
  Clock,
  Radio,
  AlertCircle,
  MapPin,
  Scale,
  CheckCircle2,
} from 'lucide-react'
import type { LiveWeatherResponse } from '../lib/api'
import { useLocaleFormatter } from '../i18n/formatters'
import { localizeCity, localizeState } from '../i18n/locations'

interface LiveWeatherWidgetProps {
  weather: LiveWeatherResponse | undefined
  isLoading: boolean
}

export default function LiveWeatherWidget({ weather, isLoading }: LiveWeatherWidgetProps) {
  const { formatNumber, formatCoordinates, formatDigits, lang } = useLocaleFormatter()
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-[#285274] bg-[#12385C] p-5 shadow-lg animate-pulse space-y-4">
        <div className="h-6 w-48 rounded-xl bg-[#0E2B49]" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[#0B2545]" />
          ))}
        </div>
      </div>
    )
  }

  const params = weather?.parameters
  const comp = weather?.comparison
  const actualObs = weather?.actual_observation
  const isAvailable = weather && weather.status !== 'DATA UNAVAILABLE' && params

  return (
    <section className="rounded-3xl border border-[#285274] bg-[#12385C] p-5 shadow-xl text-[#F3F8FF] space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#285274]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Radio className="h-5 w-5 text-[#25C5DC] animate-pulse" />
            <h3 className="font-display font-extrabold text-base sm:text-lg text-[#F3F8FF]">
              Atmospheric Telemetry & Model Assimilation
            </h3>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-[#2389D7]/20 text-[#25C5DC] border border-[#2389D7]/40">
              ECMWF IFS & IMD Reference
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-[#F4BC4D]/15 text-[#F4BC4D] border border-[#F4BC4D]/30">
              Model Estimate
            </span>
          </div>
          <p className="text-xs text-[#B6C9DC] mt-1">
            Station: <span className="font-bold text-[#F3F8FF]">{weather?.reference_station?.name || `IMD ${weather?.city || ''} Observatory`}</span>
            {weather?.reference_station?.wmo_id ? ` (WMO: ${weather.reference_station.wmo_id})` : ''} •{' '}
            <span className="font-semibold text-[#8ED8F5]">
              {weather?.city ? localizeCity(weather.city, lang) : ''}, {weather?.state ? localizeState(weather.state, lang) : ''}
            </span>
          </p>
          <p className="text-[11px] text-[#8ED8F5]/80 mt-0.5">
            Coord: {weather ? formatCoordinates(weather.lat, weather.lon) : ''}
            {weather?.grid_lat && weather?.grid_lon ? ` • Grid: ${formatCoordinates(weather.grid_lat, weather.grid_lon)}` : ''}
            {weather?.elevation_m ? ` • ${formatNumber(weather.elevation_m)} m ASL` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#B6C9DC]">
          <span className="flex items-center gap-1 rounded-xl bg-[#0E2B49] px-2.5 py-1 border border-[#285274]">
            <Clock className="h-3.5 w-3.5 text-[#25C5DC]" />
            Cycle: {weather?.observation_time ? formatDigits(weather.observation_time.replace('T', ' '), lang) : 'Current'} ({weather?.timezone || 'IST'})
          </span>
          <span className="rounded-xl bg-[#0E2B49] px-2.5 py-1 border border-[#285274] text-[10px] text-[#25C5DC] font-bold">
            ECMWF High-Res NWP
          </span>
        </div>
      </div>

      {!isAvailable ? (
        <div className="rounded-2xl border border-[#F4BC4D]/40 bg-[#0E2B49] p-4 text-center text-xs font-bold text-[#F4BC4D] flex items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-[#F4BC4D]" />
          <span>LIVE ATMOSPHERIC DATA CURRENTLY RETRIEVING OR RATE-LIMITED FOR THIS COORDINATE</span>
        </div>
      ) : (
        /* 5 Meteorological Parameters Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 1. Current Temp & Min/Max */}
          <div className="rounded-2xl border border-[#285274] bg-[#0E2B49] p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-[#B6C9DC]">
              <span>Temperature</span>
              <Thermometer className="h-4 w-4 text-[#25C5DC]" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-[#F3F8FF]">
                {typeof params.temperature_c === 'number' ? `${formatNumber(params.temperature_c, { maximumFractionDigits: 1 })}°C` : params.temperature_c}
              </div>
              <p className="text-[10px] font-bold text-[#25C5DC] mt-0.5">
                Feels like: {typeof params.feels_like_c === 'number' ? `${formatNumber(params.feels_like_c, { maximumFractionDigits: 1 })}°C` : (typeof params.temperature_c === 'number' ? `${formatNumber(params.temperature_c, { maximumFractionDigits: 1 })}°C` : '—')}
              </p>
              <p className="text-[10px] font-bold text-[#8ED8F5]">
                Min: {formatNumber(params.temp_min_c, { maximumFractionDigits: 1 })}°C • Max: {formatNumber(params.temp_max_c, { maximumFractionDigits: 1 })}°C
              </p>
            </div>
          </div>

          {/* 2. Relative Humidity */}
          <div className="rounded-2xl border border-[#285274] bg-[#0E2B49] p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-[#B6C9DC]">
              <span>Relative Humidity</span>
              <Droplets className="h-4 w-4 text-[#25C5DC]" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-[#F3F8FF]">
                {typeof params.relative_humidity_pct === 'number'
                  ? `${formatNumber(params.relative_humidity_pct)}%`
                  : params.relative_humidity_pct}
              </div>
              <p className="text-[10px] font-bold text-[#B6C9DC] mt-0.5">
                {Number(params.relative_humidity_pct) < 30
                  ? 'Dry (Fire Watch)'
                  : Number(params.relative_humidity_pct) > 75
                  ? 'Humid (Runoff Risk)'
                  : 'Optimal Range'}
              </p>
            </div>
          </div>

          {/* 3. Rainfall (Past 24h & Current Intensity) */}
          <div className="rounded-2xl border border-[#285274] bg-[#0E2B49] p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-[#B6C9DC]">
              <span>24h Rainfall</span>
              <CloudRain className="h-4 w-4 text-[#2389D7]" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-[#F3F8FF]">
                {typeof params.rainfall_past_24h_mm === 'number'
                  ? `${formatNumber(params.rainfall_past_24h_mm, { maximumFractionDigits: 1 })} mm`
                  : params.rainfall_past_24h_mm}
              </div>
              <p className="text-[10px] font-bold text-[#8ED8F5] mt-0.5">
                Intensity: {formatNumber(params.precipitation_intensity_mm_h, { maximumFractionDigits: 1 })} mm/h
              </p>
            </div>
          </div>

          {/* 4. Wind Speed & Direction */}
          <div className="rounded-2xl border border-[#285274] bg-[#0E2B49] p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-[#B6C9DC]">
              <span>Wind Velocity</span>
              <Wind className="h-4 w-4 text-[#25C5DC]" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-[#F3F8FF]">
                {typeof params.wind_speed_kmh === 'number'
                  ? `${formatNumber(params.wind_speed_kmh, { maximumFractionDigits: 1 })} km/h`
                  : params.wind_speed_kmh}
              </div>
              <p className="text-[10px] font-bold text-[#8ED8F5] mt-0.5">
                Bearing: {formatNumber(params.wind_direction_deg)}° • Gusts: {typeof params.wind_gusts_kmh === 'number' ? `${formatNumber(params.wind_gusts_kmh, { maximumFractionDigits: 1 })} km/h` : '—'}
              </p>
            </div>
          </div>

          {/* 5. Pressure & Soil Moisture */}
          <div className="rounded-2xl border border-[#285274] bg-[#0E2B49] p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-[#B6C9DC]">
              <span>Pressure & Clouds</span>
              <Gauge className="h-4 w-4 text-[#35C58B]" />
            </div>
            <div className="mt-2">
              <div className="text-base font-black text-[#F3F8FF] truncate">
                {params.weather_condition || 'Fair'}
              </div>
              <p className="text-[10px] font-bold text-[#B6C9DC] mt-0.5">
                {formatNumber(params.surface_pressure_hpa)} hPa • Clouds: {typeof params.cloud_cover_pct === 'number' ? `${formatNumber(params.cloud_cover_pct)}%` : '—'}
              </p>
              <p className="text-[10px] font-bold text-[#35C58B]">
                Soil: {typeof params.soil_moisture_m3_m3 === 'number'
                  ? `${formatNumber(params.soil_moisture_m3_m3, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} m³/m³`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TRANSPARENT VERIFIED OBSERVATION VS MODEL COMPARISON ── */}
      {comp && comp.is_comparable && (
        <div className="rounded-2xl border border-[#2389D7]/40 bg-[#0B2545]/90 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#285274]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#35C58B]" />
              <h4 className="text-xs font-black uppercase tracking-wider text-[#F3F8FF]">
                Ground Observation vs. NWP Model Comparison
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#35C58B]/20 text-[#35C58B] border border-[#35C58B]/40">
                {comp.agreement_status}
              </span>
            </div>
            <div className="text-[11px] text-[#B6C9DC] font-semibold">
              Station: <span className="text-[#F3F8FF] font-bold">{comp.station_name}</span> ({typeof comp.station_distance_km === 'number' ? `${formatNumber(comp.station_distance_km, { maximumFractionDigits: 1 })} km away` : ''})
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Ground Observatory Reading */}
            <div className="rounded-xl border border-[#285274] bg-[#0E2B49] p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[#B6C9DC] font-bold text-[11px]">
                <span className="text-[#35C58B] flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#35C58B]" /> IMD Ground Station
                </span>
                <span className="text-[10px] font-mono text-[#8ED8F5]">ID: {comp.station_id}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black font-mono text-[#F3F8FF]">
                  {typeof comp.station_temp_max_c === 'number' ? `${formatNumber(comp.station_temp_max_c, { maximumFractionDigits: 1 })}°C` : '—'}
                </span>
                <span className="text-[10px] text-[#B6C9DC]">
                  Min: {typeof comp.station_temp_min_c === 'number' ? `${formatNumber(comp.station_temp_min_c, { maximumFractionDigits: 1 })}°C` : '—'}
                </span>
              </div>
              <div className="text-[10px] text-[#B6C9DC] space-y-0.5">
                <p>24h Rain: <span className="font-bold text-[#F3F8FF]">{formatNumber(comp.station_rainfall_24h_mm, { maximumFractionDigits: 1 })} mm</span> • RH: <span className="font-bold text-[#F3F8FF]">{formatNumber(comp.station_rh_pct)}%</span></p>
                <p className="text-[#8ED8F5]/80 truncate">Observed: {comp.station_obs_timestamp ? formatDigits(comp.station_obs_timestamp, lang) : '—'} IST ({comp.station_freshness || 'Verified'})</p>
              </div>
            </div>

            {/* Numerical Weather Prediction Model */}
            <div className="rounded-xl border border-[#285274] bg-[#0E2B49] p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[#B6C9DC] font-bold text-[11px]">
                <span className="text-[#25C5DC] flex items-center gap-1">
                  <Radio className="h-3.5 w-3.5 text-[#25C5DC]" /> ECMWF IFS 0.1° Model
                </span>
                <span className="text-[10px] font-mono text-[#8ED8F5]">Grid Output</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black font-mono text-[#F3F8FF]">
                  {typeof comp.model_temp_max_c === 'number' ? `${formatNumber(comp.model_temp_max_c, { maximumFractionDigits: 1 })}°C` : '—'}
                </span>
                <span className="text-[10px] text-[#B6C9DC]">
                  Min: {typeof comp.model_temp_min_c === 'number' ? `${formatNumber(comp.model_temp_min_c, { maximumFractionDigits: 1 })}°C` : '—'}
                </span>
              </div>
              <div className="text-[10px] text-[#B6C9DC] space-y-0.5">
                <p>Current: <span className="font-bold text-[#F3F8FF]">{formatNumber(comp.model_current_temp_c, { maximumFractionDigits: 1 })}°C</span> • Rain: <span className="font-bold text-[#F3F8FF]">{formatNumber(comp.model_rainfall_24h_mm, { maximumFractionDigits: 1 })} mm</span></p>
                <p className="text-[#8ED8F5]/80 truncate">Cycle: {comp.model_timestamp ? formatDigits(comp.model_timestamp.replace('T', ' '), lang) : '—'}</p>
              </div>
            </div>

            {/* Variance & Comparison Details (Never Averaged) */}
            <div className="rounded-xl border border-[#285274] bg-[#0E2B49] p-3 space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[#B6C9DC] font-bold text-[11px]">
                  <span className="text-[#F4BC4D] flex items-center gap-1">
                    <Scale className="h-3.5 w-3.5 text-[#F4BC4D]" /> Discrepancy & Variance
                  </span>
                  <span className="text-[9px] uppercase font-bold text-[#35C58B] px-1.5 py-0.5 bg-[#35C58B]/10 rounded border border-[#35C58B]/30">Unblended</span>
                </div>
                <div className="mt-1 flex items-baseline gap-3">
                  <div>
                    <span className="text-[10px] text-[#B6C9DC] block">Max Temp Variance</span>
                    <span className="text-lg font-black font-mono text-[#F3F8FF]">
                      {typeof comp.delta_temp_max_c === 'number' ? `${comp.delta_temp_max_c > 0 ? '+' : ''}${formatNumber(comp.delta_temp_max_c, { maximumFractionDigits: 1 })}°C` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#B6C9DC] block">Min Temp Variance</span>
                    <span className="text-lg font-black font-mono text-[#F3F8FF]">
                      {typeof comp.delta_temp_min_c === 'number' ? `${comp.delta_temp_min_c > 0 ? '+' : ''}${formatNumber(comp.delta_temp_min_c, { maximumFractionDigits: 1 })}°C` : '—'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-[#B6C9DC] leading-tight">
                {comp.methodology_note}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
