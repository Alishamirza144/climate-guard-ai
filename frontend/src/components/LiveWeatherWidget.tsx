import {
  Thermometer,
  Droplets,
  Wind,
  Compass,
  Gauge,
  CloudRain,
  Sun,
  Layers,
  Clock,
  Radio,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { LiveWeatherResponse } from '../lib/api'

interface LiveWeatherWidgetProps {
  weather: LiveWeatherResponse | undefined
  isLoading: boolean
}

export default function LiveWeatherWidget({ weather, isLoading }: LiveWeatherWidgetProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-[#B9D9F5] bg-[#F0F8FF] p-5 shadow-sm animate-pulse space-y-4">
        <div className="h-6 w-48 rounded-xl bg-[#CDE8FF]" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-[#EDF7FF]" />
          ))}
        </div>
      </div>
    )
  }

  const params = weather?.parameters
  const isAvailable = weather && weather.status !== 'DATA UNAVAILABLE' && params

  return (
    <section className="rounded-3xl border border-[#B9D9F5] bg-[#F0F8FF] p-5 shadow-sm text-[#20364D] space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#B9D9F5]">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-[#2784D8] animate-pulse" />
            <h3 className="font-display font-extrabold text-base sm:text-lg text-[#20364D]">
              Atmospheric Telemetry & Model Assimilation
            </h3>
            <span
              className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-[#2784D8]/20 text-[#2784D8] border border-[#2784D8]/30"
            >
              ECMWF IFS & IMD Assimilation
            </span>
          </div>
          <p className="text-xs text-[#5B7188] mt-0.5">
            Coordinates: {weather?.lat.toFixed(4)}°N, {weather?.lon.toFixed(4)}°E •{' '}
            <span className="font-semibold text-[#20364D]">
              {weather?.city}, {weather?.state}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#5B7188]">
          <span className="flex items-center gap-1 rounded-xl bg-[#EDF7FF] px-2.5 py-1 border border-[#B9D9F5]">
            <Clock className="h-3.5 w-3.5 text-[#2784D8]" />
            Model Cycle: {weather?.observation_time ? weather.observation_time.replace('T', ' ') : 'Current'}
          </span>
          <span className="rounded-xl bg-[#EDF7FF] px-2.5 py-1 border border-[#B9D9F5] text-[10px] text-[#16A6A3] font-bold">
            Open-Meteo & IMD Numerical Grid
          </span>
        </div>
      </div>

      {!isAvailable ? (
        <div className="rounded-2xl border border-[#F2B544] bg-[#FFFBEB] p-4 text-center text-xs font-bold text-[#B47510] flex items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-[#B47510]" />
          <span>LIVE ATMOSPHERIC DATA CURRENTLY UNAVAILABLE FOR THIS COORDINATE</span>
        </div>
      ) : (
        /* 10 Meteorological Parameters Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 1. Current Temp & Min/Max */}
          <div className="rounded-2xl border border-[#B9D9F5] bg-[#EDF7FF] p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-[#5B7188]">
              <span>Temperature</span>
              <Thermometer className="h-4 w-4 text-[#2784D8]" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-[#20364D]">
                {typeof params.temperature_c === 'number' ? `${params.temperature_c}°C` : params.temperature_c}
              </div>
              <p className="text-[10px] font-bold text-[#5B7188] mt-0.5">
                Min: {params.temp_min_c}°C • Max: {params.temp_max_c}°C
              </p>
            </div>
          </div>

          {/* 2. Relative Humidity */}
          <div className="rounded-2xl border border-[#B9D9F5] bg-[#EDF7FF] p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-[#5B7188]">
              <span>Relative Humidity</span>
              <Droplets className="h-4 w-4 text-[#16A6A3]" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-[#20364D]">
                {typeof params.relative_humidity_pct === 'number'
                  ? `${params.relative_humidity_pct}%`
                  : params.relative_humidity_pct}
              </div>
              <p className="text-[10px] font-bold text-[#5B7188] mt-0.5">
                {Number(params.relative_humidity_pct) < 30
                  ? 'Dry (Fire Watch)'
                  : Number(params.relative_humidity_pct) > 75
                  ? 'Humid (Runoff Risk)'
                  : 'Optimal Range'}
              </p>
            </div>
          </div>

          {/* 3. Rainfall (Past 24h & Current Intensity) */}
          <div className="rounded-2xl border border-[#B9D9F5] bg-[#EDF7FF] p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-[#5B7188]">
              <span>24h Rainfall</span>
              <CloudRain className="h-4 w-4 text-[#2784D8]" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-[#20364D]">
                {typeof params.rainfall_past_24h_mm === 'number'
                  ? `${params.rainfall_past_24h_mm} mm`
                  : params.rainfall_past_24h_mm}
              </div>
              <p className="text-[10px] font-bold text-[#5B7188] mt-0.5">
                Intensity: {params.precipitation_intensity_mm_h} mm/h
              </p>
            </div>
          </div>

          {/* 4. Wind Speed & Direction */}
          <div className="rounded-2xl border border-[#B9D9F5] bg-[#EDF7FF] p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-[#5B7188]">
              <span>Wind Velocity</span>
              <Wind className="h-4 w-4 text-[#2784D8]" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-[#20364D]">
                {typeof params.wind_speed_kmh === 'number'
                  ? `${params.wind_speed_kmh} km/h`
                  : params.wind_speed_kmh}
              </div>
              <p className="text-[10px] font-bold text-[#5B7188] mt-0.5">
                Bearing: {params.wind_direction_deg}° (Vector Direction)
              </p>
            </div>
          </div>

          {/* 5. Pressure, Soil Moisture & Sky */}
          <div className="rounded-2xl border border-[#B9D9F5] bg-[#EDF7FF] p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-[#5B7188]">
              <span>Pressure & Soil</span>
              <Gauge className="h-4 w-4 text-[#299765]" />
            </div>
            <div className="mt-2">
              <div className="text-base font-black text-[#20364D] truncate">
                {params.weather_condition || 'Fair'}
              </div>
              <p className="text-[10px] font-bold text-[#5B7188] mt-0.5">
                {params.surface_pressure_hpa} hPa • Soil:{' '}
                {typeof params.soil_moisture_m3_m3 === 'number'
                  ? `${params.soil_moisture_m3_m3} m³/m³`
                  : 'DATA UNAVAILABLE'}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
