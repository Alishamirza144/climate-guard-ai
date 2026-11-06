import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Database, Waves, ArrowDownRight, ArrowUpRight, ShieldCheck, AlertTriangle, Layers, Info } from 'lucide-react'
import { api, ReservoirData } from '../lib/api'
import { useLocationContext } from './LocationProvider'

export default function DamMonitoringWidget() {
  const { t } = useTranslation()
  const { location } = useLocationContext()
  const [dams, setDams] = useState<ReservoirData[]>([])
  const [selectedDamId, setSelectedDamId] = useState<string>('gangapur')
  const [dam, setDam] = useState<ReservoirData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.listDams(location.lat, location.lon)
      .then((data) => {
        if (mounted) {
          setDams(data)
          if (data.length > 0) {
            const closest = data[0]
            setSelectedDamId(closest.id)
            setDam(closest)
          }
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [location.lat, location.lon])

  const handleSelectDam = (damId: string) => {
    setSelectedDamId(damId)
    setLoading(true)
    api.getDam(damId)
      .then((data) => {
        setDam(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }

  if (!dam && loading) {
    return (
      <div className="bg-[#12385C] border border-[#285274] rounded-2xl p-6 text-center text-[#B6C9DC] animate-pulse">
        Loading regional river basin reservoir capacity telemetry...
      </div>
    )
  }

  if (!dam) return null

  const isHighDischarge = dam.outflow_cusecs >= dam.downstream_warning_discharge_cusecs
  const isHighStorage = dam.storage_percentage >= 85.0

  return (
    <div className="bg-[#12385C] border-2 border-[#285274] rounded-3xl p-5 shadow-2xl text-[#F3F8FF] space-y-5">
      {/* Header and Reservoir Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#285274]">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#25C5DC]" />
            <h3 className="font-display font-extrabold text-base sm:text-lg text-[#F3F8FF]">
              {t('dashboard.reservoirTitle', 'Dam & Reservoir Capacity Monitoring')}
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#2389D7]/20 text-[#25C5DC] border border-[#2389D7]/40">
              WRD Register · Water-Balance Model
            </span>
          </div>
          <p className="text-xs text-[#B6C9DC] mt-0.5">
            {dam.location} • {dam.river} flood retention & controlled spillway discharge (Model Balance Estimate)
          </p>
        </div>

        {/* Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="reservoir-select" className="text-xs font-bold text-[#B6C9DC] shrink-0">
            Select Dam:
          </label>
          <select
            id="reservoir-select"
            value={selectedDamId}
            onChange={(e) => handleSelectDam(e.target.value)}
            className="text-xs font-bold bg-[#0E2B49] text-[#F3F8FF] border border-[#285274] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2389D7]"
          >
            {dams.map((d) => (
              <option key={d.id} value={d.id} className="bg-[#0B2545] text-white">
                {d.name} ({d.storage_percentage}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main KPI Gauge & Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Storage Percentage Gauge */}
        <div className="bg-[#0E2B49] border border-[#285274] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[#B6C9DC]">Storage Capacity</span>
          <div className="relative w-28 h-28 my-2 flex items-center justify-center">
            {/* Circular Gauge Representation */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[#102F50]"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={isHighStorage ? 'text-[#F06470]' : 'text-[#25C5DC]'}
                strokeDasharray={`${dam.storage_percentage}, 100`}
                strokeWidth="3.8"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black font-mono text-[#F3F8FF]">{dam.storage_percentage}%</span>
              <span className="text-[10px] text-[#8ED8F5] font-bold">FILLED</span>
            </div>
          </div>
          <span
            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
              isHighStorage ? 'bg-[#F06470]/20 text-[#F06470] border border-[#F06470]/30' : 'bg-[#35C58B]/20 text-[#35C58B] border border-[#35C58B]/30'
            }`}
          >
            {dam.spillway_status}
          </span>
        </div>

        {/* Current Storage Card */}
        <div className="bg-[#0E2B49] border border-[#285274] rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-[#B6C9DC]">
              <span className="text-xs font-bold uppercase tracking-wider">Current Water Storage</span>
              <Waves className="w-4 h-4 text-[#25C5DC]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#F3F8FF] mt-2">
              {dam.current_storage_mcm} <span className="text-xs font-bold text-[#8ED8F5]">MCM</span>
            </div>
            <div className="text-xs font-medium text-[#B6C9DC] mt-0.5">
              {dam.current_storage_tmc} TMC equivalent
            </div>
          </div>
          <div className="pt-2 border-t border-[#285274]/60 text-[11px] text-[#B6C9DC]">
            Total Gross: <span className="font-bold text-[#F3F8FF]">{dam.total_capacity_mcm} MCM</span> ({dam.total_capacity_tmc} TMC)
          </div>
        </div>

        {/* Available Capacity Card */}
        <div className="bg-[#0E2B49] border border-[#285274] rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-[#B6C9DC]">
              <span className="text-xs font-bold uppercase tracking-wider">Available Buffer Storage</span>
              <Layers className="w-4 h-4 text-[#35C58B]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#35C58B] mt-2">
              {dam.available_storage_mcm} <span className="text-xs font-bold text-[#B6C9DC]">MCM</span>
            </div>
            <div className="text-xs font-medium text-[#B6C9DC] mt-0.5">
              {dam.available_storage_tmc} TMC remaining capacity
            </div>
          </div>
          <div className="pt-2 border-t border-[#285274]/60 text-[11px] text-[#B6C9DC]">
            Full Reservoir Level: <span className="font-bold text-[#F3F8FF]">{dam.frl_m} m</span> (Current: {dam.current_water_level_m} m)
          </div>
        </div>

        {/* Inflow vs Outflow Rate */}
        <div className="bg-[#0E2B49] border border-[#285274] rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-[#B6C9DC]">
              <span className="text-xs font-bold uppercase tracking-wider">Discharge Telemetry</span>
              {isHighDischarge ? (
                <AlertTriangle className="w-4 h-4 text-[#F06470]" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-[#35C58B]" />
              )}
            </div>
            <div className="space-y-1.5 mt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-[#B6C9DC]">
                  <ArrowDownRight className="w-3.5 h-3.5 text-[#35C58B]" /> Inflow:
                </span>
                <span className="font-mono font-bold text-[#F3F8FF]">{dam.inflow_cusecs.toLocaleString()} cusecs</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-[#B6C9DC]">
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#25C5DC]" /> Outflow:
                </span>
                <span className="font-mono font-bold text-[#F3F8FF]">{dam.outflow_cusecs.toLocaleString()} cusecs</span>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-[#285274]/60 text-[11px] text-[#B6C9DC]">
            Warning Mark: <span className="font-bold text-[#F4BC4D]">{dam.downstream_warning_discharge_cusecs.toLocaleString()} cusecs</span>
          </div>
        </div>
      </div>

      {/* Graphs Row: Historical Storage Trend and Inflow vs Outflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Historical 7-Day Storage Percentage Trend */}
        <div className="bg-[#0E2B49] border border-[#285274] rounded-2xl p-4">
          <div className="text-xs font-bold text-[#F3F8FF] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>7-Day Reservoir Storage Trend (% Capacity)</span>
            <span className="text-[10px] text-[#B6C9DC]">Updated: {dam.last_updated}</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dam.historical_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="storageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2389D7" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#2389D7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#285274" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#B6C9DC' }} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 10, fill: '#B6C9DC' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#071A33', borderColor: '#285274', borderRadius: '12px', fontSize: '11px', color: '#F3F8FF' }}
                  formatter={(val: number) => [`${val}%`, 'Storage']}
                />
                <Area type="monotone" dataKey="storage_pct" stroke="#25C5DC" strokeWidth={2.5} fillOpacity={1} fill="url(#storageGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Inflow vs Outflow Comparison */}
        <div className="bg-[#0E2B49] border border-[#285274] rounded-2xl p-4">
          <div className="text-xs font-bold text-[#F3F8FF] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Inflow vs Spillway Outflow Discharge (cusecs)</span>
            <span className="text-[10px] text-[#8ED8F5]">{dam.spillway_gates} Radial Spillway Gates</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dam.inflow_outflow_trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#285274" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#B6C9DC' }} />
                <YAxis tick={{ fontSize: 10, fill: '#B6C9DC' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#071A33', borderColor: '#285274', borderRadius: '12px', fontSize: '11px', color: '#F3F8FF' }}
                  formatter={(val: number) => [`${val.toLocaleString()} cusecs`]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="inflow_cusecs" name="Inflow (cusecs)" fill="#35C58B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outflow_cusecs" name="Outflow (cusecs)" fill="#2389D7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Metadata and Data Attribution Footer */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-[#285274] text-[11px] text-[#B6C9DC]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#25C5DC] shrink-0" />
            <span>
              Register Source: <strong className="text-[#8ED8F5]">{dam.data_source}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#0E2B49] border border-[#285274] font-semibold text-[#8ED8F5]">
              Hydrological Water-Balance Model
            </span>
          </div>
        </div>
        <p className="text-[10px] text-[#B6C9DC]/80 italic">
          * Note: Dam capacities and FRL specifications are sourced from official WRD/CWC registers. Current storage percentage, inflow, and outflow are hydrological water-balance model estimates, not verified live SCADA telemetry.
        </p>
      </div>
    </div>
  )
}
