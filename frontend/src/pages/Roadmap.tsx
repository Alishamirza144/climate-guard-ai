import { useEffect, useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { GlassCard } from '../components/ui/GlassCard'

type PhaseStatus = 'Done' | 'In progress' | 'Planned'

type Phase = {
  id: string
  name: string
  status: PhaseStatus
  description: string
}

const statusVariant: Record<PhaseStatus, 'low' | 'moderate' | 'neutral'> = {
  Done: 'low',
  'In progress': 'moderate',
  Planned: 'neutral',
}

export default function Roadmap() {
  const [phases, setPhases] = useState<Phase[]>([])

  useEffect(() => {
    fetch('/status.json')
      .then((response) => response.json())
      .then((payload) => setPhases(Array.isArray(payload.phases) ? payload.phases : []))
      .catch(() => setPhases([]))
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-lime">Product roadmap</p>
        <h1 className="text-3xl font-black text-white md:text-5xl">Road to resilient climate action</h1>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {phases.map((phase, index) => (
          <GlassCard key={phase.id} className="flex h-full flex-col p-5" hoverEffect>
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/40">0{index + 1}</span>
              <Badge variant={statusVariant[phase.status]}>{phase.status}</Badge>
            </div>
            <h2 className="text-xl font-bold text-white">{phase.name}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{phase.description}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
