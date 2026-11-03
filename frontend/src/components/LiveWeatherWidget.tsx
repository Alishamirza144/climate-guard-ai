import {
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  CloudRain,
  Clock,
  Radio,
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
  const isAvailable = weather && weather.status !== 'DATA UNAVAILABLE' && params

  return (
    <section className="rounded-3xl border border-[#285274] bg-[#12385C] p-5 shadow-xl text-[#F3F8FF] space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#285274]">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-[#25C5DC] animate-pulse" />
            <h3 className="font-display font-extrabold text-base sm:text-lg text-[#F3F8FF]">
              Atmospheric Telemetry & Model Assimilation
            </h3>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-[#2389D7]/20 text-[#25C5DC] border border-[#2389D7]/40">
              ECMWF IFS & IMD Assimilation
            </span>
          </div>
          <p className="text-xs text-[#B6C9DC] mt-0.5">
            Coordinates: {weather?.lat.toFixed(4)}°N, {weather?.lon.toFixed(4)}°E •{' '}
            <span className="font-semibold text-[#8ED8F5]">
              {weather?.city}, {weather?.state}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#B6C9DC]">
          <span className="flex items-center gap-1 rounded-xl bg-[#0E2B49] px-2.5 py-1 border border-[#285274]">
            <Clock className="h-3.5 w-3.5 text-[#25C5DC]" />
            Model Cycle: {weather?.observation_time ? weather.observation_time.replace('T', ' ') : 'Current'}
          </span>
          <span className="rounded-xl bg-[#0E2B49] px-2.5 py-1 border border-[#285274] text-[10px] text-[#25C5DC] font-bold">
            Open-Meteo Numerical Grid
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
                {typeof params.temperature_c === 'number' ? `${params.temperature_c}°C` : params.temperature_c}
              </div>
              <p className="text-[10px] font-bold text-[#8ED8F5] mt-0.5">
                Min: {params.temp_min_c}°C • Max: {params.temp_max_c}°C
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
                  ? `${params.relative_humidity_pct}%`
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
                  ? `${params.rainfall_past_24h_mm} mm`
                  : params.rainfall_past_24h_mm}
              </div>
              <p className="text-[10px] font-bold text-[#8ED8F5] mt-0.5">
                Intensity: {params.precipitation_intensity_mm_h} mm/h
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
                  ? `${params.wind_speed_kmh} km/h`
                  : params.wind_speed_kmh}
              </div>
              <p className="text-[10px] font-bold text-[#B6C9DC] mt-0.5">
                Bearing: {params.wind_direction_deg}° (Vector)
              </p>
            </div>
          </div>

          {/* 5. Pressure & Soil Moisture */}
          <div className="rounded-2xl border border-[#285274] bg-[#0E2B49] p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-[#B6C9DC]">
              <span>Pressure & Soil</span>
              <Gauge className="h-4 w-4 text-[#35C58B]" />
            </div>
            <div className="mt-2">
              <div className="text-base font-black text-[#F3F8FF] truncate">
                {params.weather_condition || 'Fair'}
              </div>
              <p className="text-[10px] font-bold text-[#B6C9DC] mt-0.5">
                {params.surface_pressure_hpa} hPa • Soil:{' '}
                {typeof params.soil_moisture_m3_m3 === 'number'
                  ? `${params.soil_moisture_m3_m3} m³/m³`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
