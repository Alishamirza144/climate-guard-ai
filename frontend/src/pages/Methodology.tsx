import { Badge } from '../components/ui/Badge'
import { GlassCard } from '../components/ui/GlassCard'

const steps = [
  {
    name: 'SENSE',
    title: 'Capture the signal',
    detail: 'Continuously ingest rainfall, temperature, soil, wildfire, and satellite observations from free public APIs and on-ground telemetry.',
  },
  {
    name: 'NORMALIZE',
    title: 'Normalize the inputs',
    detail: 'Convert heterogeneous measurements to SI units, align timestamps, and compute rolling baselines and anomaly windows.',
  },
  {
    name: 'LEARN',
    title: 'Train adaptive models',
    detail: 'Use explainable ML and statistical baselines to learn the local relationship between drivers and hazard conditions.',
  },
  {
    name: 'RISK',
    title: 'Generate a 0–100 score',
    detail: 'Transform model outputs into a consistent risk ladder: Low, Moderate, High, and Critical for every hazard.',
  },
  {
    name: 'WARN',
    title: 'Trigger early alerts',
    detail: 'Apply warnings with hysteresis, escalation logic, and deduplication to reduce alert fatigue while preserving urgency.',
  },
  {
    name: 'ACT',
    title: 'Translate to action',
    detail: 'Map each hazard level to transparent SOPs for communities, field teams, and local agencies.',
  },
  {
    name: 'MONITOR',
    title: 'Track outcomes',
    detail: 'Validate forecast quality, compare against observed events, and refine local thresholds using field feedback.',
  },
  {
    name: 'ADAPT',
    title: 'Scale resilience',
    detail: 'Create dashboards, watchlists, and public guidance flows that help people prepare before risk becomes damage.',
  },
]

export default function Methodology() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-lime">Methodology & science</p>
        <h1 className="text-3xl font-black text-white md:text-5xl">
          AI-Driven Solutions for Advancing Adaptation Action
        </h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="relative min-h-[550px] p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(173,209,127,0.12),_transparent_60%)]" />
          <div className="relative mx-auto h-[480px] w-full max-w-[480px]">
            <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-navy/20" />
            <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-lime/15" />

            {steps.map((step, index) => {
              const angle = (Math.PI * 2 * index) / steps.length - Math.PI / 2
              const radius = 160
              const x = 50 + (Math.cos(angle) * radius) / 4.6
              const y = 50 + (Math.sin(angle) * radius) / 4.6

              return (
                <div
                  key={step.name}
                  className="absolute w-[150px] -translate-x-1/2 -translate-y-1/2 text-center"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <div className="rounded-2xl border border-white/10 bg-navy/70 px-3 py-3 shadow-glass backdrop-blur-sm">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.28em] text-lime">{step.name}</div>
                    <div className="text-sm font-bold text-white">{step.title}</div>
                  </div>
                </div>
              )
            })}

            <div className="absolute left-1/2 top-1/2 flex h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-lime/30 bg-gradient-to-br from-primary/50 to-navy-dark/80 text-center shadow-glow">
              <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-lime">ClimateGuard</div>
              <div className="mt-2 text-xl font-black text-white">Adaptation loop</div>
            </div>
          </div>
        </GlassCard>

        <div className="space-y-5">
          {steps.map((step) => (
            <GlassCard key={step.name} className="p-4" hoverEffect>
              <div className="mb-2 flex items-center justify-between gap-3">
                <Badge variant="primary" size="sm">{step.name}</Badge>
                <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">signal</span>
              </div>
              <h2 className="text-lg font-bold text-white">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{step.detail}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  )
}
