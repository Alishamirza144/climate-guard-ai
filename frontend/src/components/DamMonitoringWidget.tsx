import { useState, useEffect } from 'react'
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
            const preferred = data.find((d) => d.id === selectedDamId) || data[0]
            setSelectedDamId(preferred.id)
            setDam(preferred)
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
      <div className="bg-[#F0F8FF] border border-[#B9D9F5] rounded-2xl p-6 text-center text-[#5B7188] animate-pulse">
        Loading Godavari basin reservoir capacity telemetry...
      </div>
    )
  }

  if (!dam) return null

  const isHighDischarge = dam.outflow_cusecs >= dam.downstream_warning_discharge_cusecs
  const isHighStorage = dam.storage_percentage >= 85.0

  return (
    <div className="bg-[#F0F8FF] border-2 border-[#B9D9F5] rounded-2xl p-5 shadow-sm text-[#20364D] space-y-5">
      {/* Header and Reservoir Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#B9D9F5]">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#2784D8]" />
            <h3 className="font-display font-extrabold text-base sm:text-lg text-[#20364D]">
              Dam & Reservoir Capacity Monitoring
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#16A6A3]/20 text-[#16A6A3] border border-[#16A6A3]/30">
              WRD Telemetry
            </span>
          </div>
          <p className="text-xs text-[#5B7188] mt-0.5">
            {dam.location} • {dam.river} flood retention & controlled spillway discharge
          </p>
        </div>

        {/* Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="reservoir-select" className="text-xs font-bold text-[#5B7188] shrink-0">
            Select Dam:
          </label>
          <select
            id="reservoir-select"
            value={selectedDamId}
            onChange={(e) => handleSelectDam(e.target.value)}
            className="text-xs font-bold bg-[#EDF7FF] text-[#20364D] border border-[#B9D9F5] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2784D8]"
          >
            {dams.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.storage_percentage}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main KPI Gauge & Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Storage Percentage Gauge */}
        <div className="bg-[#EDF7FF] border border-[#B9D9F5] rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[#5B7188]">Storage Capacity</span>
          <div className="relative w-28 h-28 my-2 flex items-center justify-center">
            {/* Circular Gauge Representation */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[#B9DEFF]"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={isHighStorage ? 'text-[#E45B62]' : 'text-[#2784D8]'}
                strokeDasharray={`${dam.storage_percentage}, 100`}
                strokeWidth="3.8"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black font-mono text-[#20364D]">{dam.storage_percentage}%</span>
              <span className="text-[10px] text-[#5B7188] font-bold">FILLED</span>
            </div>
          </div>
          <span
            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
              isHighStorage ? 'bg-[#E45B62]/20 text-[#E45B62]' : 'bg-[#299765]/20 text-[#299765]'
            }`}
          >
            {dam.spillway_status}
          </span>
        </div>

        {/* Current Storage Card */}
        <div className="bg-[#EDF7FF] border border-[#B9D9F5] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-[#5B7188]">
              <span className="text-xs font-bold uppercase tracking-wider">Current Water Storage</span>
              <Waves className="w-4 h-4 text-[#2784D8]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#20364D] mt-2">
              {dam.current_storage_mcm} <span className="text-xs font-bold text-[#5B7188]">MCM</span>
            </div>
            <div className="text-xs font-medium text-[#5B7188] mt-0.5">
              {dam.current_storage_tmc} TMC equivalent
            </div>
          </div>
          <div className="pt-2 border-t border-[#B9D9F5]/60 text-[11px] text-[#5B7188]">
            Total Gross: <span className="font-bold text-[#20364D]">{dam.total_capacity_mcm} MCM</span> ({dam.total_capacity_tmc} TMC)
          </div>
        </div>

        {/* Available Capacity Card */}
        <div className="bg-[#EDF7FF] border border-[#B9D9F5] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-[#5B7188]">
              <span className="text-xs font-bold uppercase tracking-wider">Available Buffer Storage</span>
              <Layers className="w-4 h-4 text-[#16A6A3]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#16A6A3] mt-2">
              {dam.available_storage_mcm} <span className="text-xs font-bold text-[#5B7188]">MCM</span>
            </div>
            <div className="text-xs font-medium text-[#5B7188] mt-0.5">
              {dam.available_storage_tmc} TMC remaining capacity
            </div>
          </div>
          <div className="pt-2 border-t border-[#B9D9F5]/60 text-[11px] text-[#5B7188]">
            Full Reservoir Level: <span className="font-bold text-[#20364D]">{dam.frl_m} m</span> (Current: {dam.current_water_level_m} m)
          </div>
        </div>

        {/* Inflow vs Outflow Rate */}
        <div className="bg-[#EDF7FF] border border-[#B9D9F5] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-[#5B7188]">
              <span className="text-xs font-bold uppercase tracking-wider">Discharge Telemetry</span>
              {isHighDischarge ? (
                <AlertTriangle className="w-4 h-4 text-[#E45B62]" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-[#299765]" />
              )}
            </div>
            <div className="space-y-1.5 mt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-[#5B7188]">
                  <ArrowDownRight className="w-3.5 h-3.5 text-[#299765]" /> Inflow:
                </span>
                <span className="font-mono font-bold text-[#20364D]">{dam.inflow_cusecs.toLocaleString()} cusecs</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-[#5B7188]">
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#2784D8]" /> Outflow:
                </span>
                <span className="font-mono font-bold text-[#20364D]">{dam.outflow_cusecs.toLocaleString()} cusecs</span>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-[#B9D9F5]/60 text-[11px] text-[#5B7188]">
            Warning Mark: <span className="font-bold text-[#20364D]">{dam.downstream_warning_discharge_cusecs.toLocaleString()} cusecs</span>
          </div>
        </div>
      </div>

      {/* Graphs Row: Historical Storage Trend and Inflow vs Outflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Historical 7-Day Storage Percentage Trend */}
        <div className="bg-[#EDF7FF] border border-[#B9D9F5] rounded-xl p-4">
          <div className="text-xs font-bold text-[#20364D] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>7-Day Reservoir Storage Trend (% Capacity)</span>
            <span className="text-[10px] text-[#5B7188]">Updated: {dam.last_updated}</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dam.historical_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="storageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2784D8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2784D8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#B9D9F5" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#5B7188' }} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 10, fill: '#5B7188' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#F0F8FF', borderColor: '#B9D9F5', borderRadius: '8px', fontSize: '11px', color: '#20364D' }}
                  formatter={(val: number) => [`${val}%`, 'Storage']}
                />
                <Area type="monotone" dataKey="storage_pct" stroke="#2784D8" strokeWidth={2.5} fillOpacity={1} fill="url(#storageGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Inflow vs Outflow Comparison */}
        <div className="bg-[#EDF7FF] border border-[#B9D9F5] rounded-xl p-4">
          <div className="text-xs font-bold text-[#20364D] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Inflow vs Spillway Outflow Discharge (cusecs)</span>
            <span className="text-[10px] text-[#5B7188]">{dam.spillway_gates} Radial Spillway Gates</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dam.inflow_outflow_trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#B9D9F5" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#5B7188' }} />
                <YAxis tick={{ fontSize: 10, fill: '#5B7188' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#F0F8FF', borderColor: '#B9D9F5', borderRadius: '8px', fontSize: '11px', color: '#20364D' }}
                  formatter={(val: number) => [`${val.toLocaleString()} cusecs`]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="inflow_cusecs" name="Inflow (cusecs)" fill="#299765" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outflow_cusecs" name="Outflow (cusecs)" fill="#2784D8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Metadata and Data Attribution Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#B9D9F5] text-[11px] text-[#5B7188]">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#2784D8] shrink-0" />
          <span>
            Data Source: <strong className="text-[#20364D]">{dam.data_source}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-white border border-[#B9D9F5] font-semibold text-[#20364D]">
            {dam.is_demonstration ? 'Demonstration Benchmark Telemetry' : 'Live Official Telemetry'}
          </span>
          <span>Catchment Area: <strong>{dam.catchment_sq_km} km²</strong></span>
        </div>
      </div>
    </div>
  )
}
