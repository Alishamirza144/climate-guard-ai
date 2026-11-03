import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react'
import { getLatencyMetric, subscribeLatency, LatencyMetric } from '../lib/latency'

export default function DataLatencyIndicator() {
  const [metric, setMetric] = useState<LatencyMetric>(getLatencyMetric())
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    return subscribeLatency(setMetric)
  }, [])

  const statusColor =
    metric.status === 'green'
      ? 'bg-[#299765] text-white'
      : metric.status === 'amber'
      ? 'bg-[#F2B544] text-[#20364D]'
      : 'bg-[#E45B62] text-white'

  const statusDot =
    metric.status === 'green'
      ? 'bg-[#299765]'
      : metric.status === 'amber'
      ? 'bg-[#F2B544]'
      : 'bg-[#E45B62]'

  const statusText =
    metric.status === 'green'
      ? 'Normal Latency'
      : metric.status === 'amber'
      ? 'High Latency / Delay'
      : 'Network Lag / Fault'

  return (
    <aside
      aria-label="Live System Latency Monitor"
      className="fixed bottom-4 right-4 z-50 pointer-events-auto select-none"
    >
      <div className="rounded-2xl border border-[#B9D9F5] bg-[#F0F8FF]/95 shadow-xl backdrop-blur-md overflow-hidden text-[#20364D] transition-all duration-300 w-64">
        {/* Header Bar */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={!collapsed}
          aria-controls="latency-details-panel"
          onClick={() => setCollapsed(!collapsed)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setCollapsed(!collapsed)
            }
          }}
          className="flex items-center justify-between px-3.5 py-2 bg-[#B9DEFF]/70 cursor-pointer hover:bg-[#B9DEFF] transition-colors border-b border-[#B9D9F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2784D8]"
        >
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${statusDot} ${metric.isFetching ? 'animate-ping' : ''}`} />
            <span className="text-xs font-bold tracking-wide uppercase text-[#20364D] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#2784D8]" />
              Data Latency
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {metric.isFetching && <RefreshCw className="w-3 h-3 text-[#2784D8] animate-spin" />}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${statusColor}`}>
              {metric.totalClientSeconds}s
            </span>
          </div>
        </div>

        {/* Detailed Metrics Panel */}
        {!collapsed && (
          <div id="latency-details-panel" className="p-3 text-[11px] space-y-2 bg-[#F0F8FF]">
            {metric.totalClientSeconds > 3.0 && (
              <div className="flex items-start gap-1.5 p-1.5 rounded-lg bg-[#F2B544]/20 border border-[#F2B544]/40 text-[#20364D] text-[10px]">
                <AlertTriangle className="w-3.5 h-3.5 text-[#F2B544] shrink-0 mt-0.5" />
                <span>External APIs experiencing higher than average propagation delay.</span>
              </div>
            )}

            {metric.hasError && (
              <div className="flex items-start gap-1.5 p-1.5 rounded-lg bg-[#E45B62]/15 border border-[#E45B62]/40 text-[#20364D] text-[10px]">
                <XCircle className="w-3.5 h-3.5 text-[#E45B62] shrink-0 mt-0.5" />
                <span>{metric.errorMessage || 'Connection failure. Using cached telemetry.'}</span>
              </div>
            )}

            <div className="space-y-1.5 font-medium">
              <div className="flex justify-between items-center text-[#5B7188]">
                <span>Weather API:</span>
                <span className="font-mono font-semibold text-[#20364D]">{metric.weatherApiSeconds} s</span>
              </div>
              <div className="flex justify-between items-center text-[#5B7188]">
                <span>Risk Engine:</span>
                <span className="font-mono font-semibold text-[#20364D]">{metric.riskEngineSeconds} s</span>
              </div>
              <div className="flex justify-between items-center text-[#5B7188]">
                <span>Backend Response:</span>
                <span className="font-mono font-semibold text-[#20364D]">{metric.backendSeconds} s</span>
              </div>
              <div className="pt-1.5 border-t border-[#B9D9F5]/60 flex justify-between items-center text-[10px]">
                <span className="text-[#5B7188]">Last Updated:</span>
                <span className="font-mono text-[#20364D] font-bold">{metric.lastUpdated}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-[#5B7188]">Status:</span>
                <span className="font-bold flex items-center gap-1">
                  {metric.status === 'green' ? (
                    <CheckCircle2 className="w-3 h-3 text-[#299765]" />
                  ) : metric.status === 'amber' ? (
                    <AlertTriangle className="w-3 h-3 text-[#F2B544]" />
                  ) : (
                    <XCircle className="w-3 h-3 text-[#E45B62]" />
                  )}
                  {statusText}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
