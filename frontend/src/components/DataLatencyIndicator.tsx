import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react'
import { getLatencyMetric, subscribeLatency, LatencyMetric } from '../lib/latency'
import { translateLatencyStatus } from '../i18n/dynamic'
import { useLocaleFormatter } from '../i18n/formatters'

export default function DataLatencyIndicator() {
  const { t } = useTranslation()
  const { formatNumber, formatDigits, lang } = useLocaleFormatter()
  const [metric, setMetric] = useState<LatencyMetric>(getLatencyMetric())
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    return subscribeLatency(setMetric)
  }, [])

  const statusColor =
    metric.status === 'green'
      ? 'bg-[#35C58B] text-[#071A33]'
      : metric.status === 'amber'
      ? 'bg-[#F4BC4D] text-[#071A33]'
      : 'bg-[#F06470] text-white'

  const statusDot =
    metric.status === 'green'
      ? 'bg-[#35C58B]'
      : metric.status === 'amber'
      ? 'bg-[#F4BC4D]'
      : 'bg-[#F06470]'

  const statusText = translateLatencyStatus(metric.status, t)

  return (
    <aside
      aria-label="Live System Latency Monitor"
      className="fixed bottom-4 right-4 z-50 pointer-events-auto select-none"
    >
      <div className="rounded-2xl border border-[#285274] bg-[#0E2B49]/95 shadow-2xl backdrop-blur-md overflow-hidden text-[#F3F8FF] transition-all duration-300 w-64">
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
          className="flex items-center justify-between px-3.5 py-2 bg-[#102F50] cursor-pointer hover:bg-[#12385C] transition-colors border-b border-[#285274] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2389D7]"
        >
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${statusDot} ${metric.isFetching ? 'animate-ping' : ''}`} />
            <span className="text-xs font-bold tracking-wide uppercase text-[#F3F8FF] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#25C5DC]" />
              {t('latency.title', 'Data Latency')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {metric.isFetching && <RefreshCw className="w-3 h-3 text-[#25C5DC] animate-spin" />}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${statusColor}`}>
              {formatNumber(metric.totalClientSeconds, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}s
            </span>
          </div>
        </div>

        {/* Detailed Metrics Panel */}
        {!collapsed && (
          <div id="latency-details-panel" className="p-3 text-[11px] space-y-2 bg-[#0E2B49]">
            {metric.totalClientSeconds > 3.0 && (
              <div className="flex items-start gap-1.5 p-1.5 rounded-lg bg-[#F4BC4D]/20 border border-[#F4BC4D]/40 text-[#F4BC4D] text-[10px]">
                <AlertTriangle className="w-3.5 h-3.5 text-[#F4BC4D] shrink-0 mt-0.5" />
                <span>{t('latency.highPropagation', 'External APIs experiencing higher than average propagation delay.')}</span>
              </div>
            )}

            {metric.hasError && (
              <div className="flex items-start gap-1.5 p-1.5 rounded-lg bg-[#F06470]/15 border border-[#F06470]/40 text-[#F06470] text-[10px]">
                <XCircle className="w-3.5 h-3.5 text-[#F06470] shrink-0 mt-0.5" />
                <span>{metric.errorMessage || t('latency.connectionFailure', 'Connection failure. Using cached telemetry.')}</span>
              </div>
            )}

            <div className="space-y-1.5 font-medium">
              <div className="flex justify-between items-center text-[#B6C9DC]">
                <span>{t('latency.weatherApi', 'Weather API')}:</span>
                <span className="font-mono font-semibold text-[#8ED8F5]">{formatNumber(metric.weatherApiSeconds, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s</span>
              </div>
              <div className="flex justify-between items-center text-[#B6C9DC]">
                <span>{t('latency.riskEngine', 'Risk Engine')}:</span>
                <span className="font-mono font-semibold text-[#8ED8F5]">{formatNumber(metric.riskEngineSeconds, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s</span>
              </div>
              <div className="flex justify-between items-center text-[#B6C9DC]">
                <span>{t('latency.backendResponse', 'Backend Response')}:</span>
                <span className="font-mono font-semibold text-[#8ED8F5]">{formatNumber(metric.backendSeconds, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s</span>
              </div>
              <div className="pt-1.5 border-t border-[#285274]/60 flex justify-between items-center text-[10px]">
                <span className="text-[#B6C9DC]">{t('latency.lastUpdated', 'Last Updated')}:</span>
                <span className="font-mono text-[#F3F8FF] font-bold">{formatDigits(metric.lastUpdated, lang)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-[#B6C9DC]">{t('latency.status', 'Status')}:</span>
                <span className="font-bold flex items-center gap-1">
                  {metric.status === 'green' ? (
                    <CheckCircle2 className="w-3 h-3 text-[#35C58B]" />
                  ) : metric.status === 'amber' ? (
                    <AlertTriangle className="w-3 h-3 text-[#F4BC4D]" />
                  ) : (
                    <XCircle className="w-3 h-3 text-[#F06470]" />
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
