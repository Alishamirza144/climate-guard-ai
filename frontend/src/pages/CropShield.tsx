import { useState } from 'react'
import ModuleDetailPage from '../components/ModuleDetailPage'
import { api } from '../lib/api'
import { Sprout, Calendar, Layers, Droplet } from 'lucide-react'

const CROP_OPTIONS = [
  { id: '', label: 'General Agricultural Baseline (Regional)' },
  { id: 'Wheat', label: 'Wheat (Rabi Season)' },
  { id: 'Rice', label: 'Rice / Paddy (Kharif)' },
  { id: 'Cotton', label: 'Cotton' },
  { id: 'Soybean', label: 'Soybean' },
  { id: 'Sugarcane', label: 'Sugarcane' },
  { id: 'Grapes', label: 'Grapes / Horticulture' },
]

export default function CropShield() {
  const [selectedCrop, setSelectedCrop] = useState<string>('')
  const [sowingDate, setSowingDate] = useState<string>('2026-10-15')
  const [soilType, setSoilType] = useState<string>('loam')

  return (
    <div className="space-y-6 pb-12">
      {/* Crop Selection Bar */}
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#285274] bg-[#12385C] p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-[#F3F8FF]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#0E2B49] text-[#35C58B] border border-[#285274]">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#35C58B]">
                AGRONOMIC PROFILE SELECTOR
              </span>
              <p className="text-xs text-[#B6C9DC]">
                {selectedCrop
                  ? `Evaluating variety-specific thermal time and crop water stress for ${selectedCrop}`
                  : 'General regional agrometeorological indicators and root-zone soil moisture active'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div>
              <label htmlFor="crop-select" className="sr-only">Crop</label>
              <select
                id="crop-select"
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="rounded-xl border border-[#285274] bg-[#0E2B49] px-3 py-1.5 text-xs font-bold text-[#F3F8FF] focus:outline-none focus:ring-1 focus:ring-[#35C58B]"
              >
                {CROP_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#071A33] text-white">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedCrop && (
              <>
                <div className="flex items-center gap-1.5 rounded-xl border border-[#285274] bg-[#0E2B49] px-2.5 py-1">
                  <Calendar className="w-3.5 h-3.5 text-[#35C58B]" />
                  <input
                    type="date"
                    value={sowingDate}
                    onChange={(e) => setSowingDate(e.target.value)}
                    className="bg-transparent text-[11px] font-mono text-[#F3F8FF] outline-none cursor-pointer"
                  />
                </div>

                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="rounded-xl border border-[#285274] bg-[#0E2B49] px-2.5 py-1.5 text-xs font-bold text-[#F3F8FF] outline-none"
                >
                  <option value="loam" className="bg-[#071A33]">Loam Soil</option>
                  <option value="clay" className="bg-[#071A33]">Black Clay (Regur)</option>
                  <option value="sandy" className="bg-[#071A33]">Sandy Loam</option>
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      <ModuleDetailPage
        key={`${selectedCrop}-${sowingDate}-${soilType}`}
        title="Crop Shield AI"
        subtitle="Field-level crop stress, root-zone soil moisture, drought indicators, and agrometeorological forecasting."
        moduleKey="crop"
        accentClass="from-[#35C58B]/30 via-[#102F50] to-[#071A33]"
        badge="SMART AGRI · ICAR BENCHMARK"
        fetchData={(lat, lon) => {
          if (selectedCrop) {
            return api.riskCrop(lat, lon, {
              crop: selectedCrop,
              sowing_date: sowingDate,
              soil_type: soilType,
              irrigation: 'drip',
            }) as Promise<Record<string, unknown>>
          }
          return api.riskCrop(lat, lon) as Promise<Record<string, unknown>>
        }}
        recommendations={{
          Citizen: [
            'Review irrigation timing and postpone non-urgent field watering during peak afternoon evaporation.',
            'Inspect topsoil moisture before applying fertilizer or scheduling water deliveries.',
            'Support local farmer markets and regional agro-climatic water conservation advisories.',
          ],
          Authority: [
            'Coordinate agronomic advisories for vulnerable crop clusters in rainfed and drought-prone belts.',
            'Watch for root-zone moisture deficits in irrigation canal tails and rural talukas.',
            'Prepare emergency water allocation guidelines for high-value horticultural zones.',
          ],
          Farmer: [
            selectedCrop
              ? `Check ${selectedCrop} canopy temperature and adjust watering to avoid moisture stress at key growth stages.`
              : 'Focus watering on stressed rows and nursery plots before topsoil moisture drops below threshold.',
            'Inspect crops for fungal pressure or root-zone waterlogging following intense rainfall intervals.',
            'Use drip irrigation during early morning hours to limit evaporative losses by up to 35%.',
          ],
        }}
      />
    </div>
  )
}
