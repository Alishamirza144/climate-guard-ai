import { useQuery } from '@tanstack/react-query'
import { Activity, Clock3, Globe2, Wifi, WifiOff } from 'lucide-react'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { GlassCard } from '../components/ui/GlassCard'

const statusStyles = {
  online: 'low',
  degraded: 'moderate',
  offline: 'critical',
} as const

export default function DataSources() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['data-sources'],
    queryFn: api.dataSources,
    refetchInterval: 120000,
  })

  const sources = data?.sources ?? []

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-lime">Live integrity</p>
          <h1 className="text-3xl font-black text-white md:text-5xl">Data source status</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
            <Activity className="h-4 w-4 text-lime" />
            <span>{data ? `${data.healthy_count} online` : 'Checking…'}</span>
          </div>
        </div>
      </div>

      <GlassCard className="mb-8 p-5 sm:p-6" variant="primary">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lime/80">Source registry</p>
            <p className="mt-2 text-lg text-white/90">
              ClimateGuard AI uses free public APIs with a live call recorder and graceful fallback logic.
            </p>
          </div>
          {data && (
            <div className="rounded-xl border border-white/10 bg-navy/40 px-4 py-3 text-sm text-slate-200">
              <div className="flex items-center gap-2 text-lime">
                <Clock3 className="h-4 w-4" />
                <span>Updated {new Date(data.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {isLoading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
          Loading live source health…
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
          Unable to load source health: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sources.map((source) => {
          const status = String(source.status).toLowerCase()
          const statusVariant = statusStyles[status as keyof typeof statusStyles] ?? 'neutral'
          const icon = status === 'online' ? Wifi : WifiOff
          const Icon = icon

          return (
            <GlassCard key={source.key} className="p-5" hoverEffect>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-lime/30 bg-lime/10 text-lime">
                    <Globe2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{source.name}</h2>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">{source.category}</p>
                  </div>
                </div>
                <Badge variant={statusVariant} dot>
                  {status}
                </Badge>
              </div>

              <p className="mb-5 text-sm leading-6 text-slate-300">{source.description}</p>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <span>Latency</span>
                  <span className="font-semibold text-white">
                    {source.latency_ms == null ? 'n/a' : `${source.latency_ms} ms`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <span>Last success</span>
                  <span className="font-semibold text-white">
                    {source.last_successful_call ? new Date(source.last_successful_call).toLocaleString() : 'No successful check'}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2 text-xs text-slate-200">
                <Icon className="h-4 w-4 text-lime" />
                <span className="truncate">{source.url}</span>
              </div>
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}
