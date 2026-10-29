import { Badge } from '../components/ui/Badge'
import { GlassCard } from '../components/ui/GlassCard'

const team = [
  { name: 'Umesh R Jadhav', role: 'Team Leader', expertise: 'System architecture and risk orchestration' },
  { name: 'Aniket S Patil', role: 'AI/ML Lead', expertise: 'Predictive modeling and feature engineering' },
  { name: 'Ashish S Dandage', role: 'Software Developer', expertise: 'Full-stack engineering and resilient APIs' },
  { name: 'Alisha A Mirza', role: 'UI & Research Lead', expertise: 'Climate science research and system storytelling' },
  { name: 'Madhulika R Muthal', role: 'Hardware & IoT Lead', expertise: 'Stormwater telemetry and edge sensing' },
]

export default function About() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-lime">Team Spartans</p>
        <h1 className="text-3xl font-black text-white md:text-5xl">ClimateGuard AI</h1>
      </div>

      <GlassCard className="mb-8 p-6" variant="primary">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-lime">Institution</p>
            <h2 className="mt-3 text-2xl font-black text-white">K K Wagh Institute of Engineering Education & Research</h2>
            <p className="mt-3 text-slate-200">Nashik, Maharashtra</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-lime">Hackathon context</p>
            <p className="mt-3 text-slate-200">
              Built as a practical adaptation and resilience tool for Indian urban and agricultural climate risk monitoring,
              grounded in public data and transparent explainable decision support.
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {team.map((member) => (
          <GlassCard key={member.name} className="p-4" hoverEffect>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-lime text-lg font-black text-navy">
              {member.name
                .split(' ')
                .map((word) => word[0])
                .slice(0, 2)
                .join('')}
            </div>
            <h2 className="text-lg font-bold text-white">{member.name}</h2>
            <p className="mt-1 text-sm font-medium text-lime">{member.role}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{member.expertise}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-lime">Responsible use</p>
          <h2 className="text-2xl font-black text-white">Decision-support only</h2>
          <p className="mt-3 text-slate-200">
            ClimateGuard AI is an operational advisory layer, not a substitute for official forecasts or emergency response authorities.
            Follow local advisories from IMD, CWC, NDMA, and district disaster management teams before acting on critical warnings.
          </p>
          <div className="mt-4">
            <Badge variant="moderate">Follow official IMD/CWC/NDMA advisories.</Badge>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-lime">Data credits</p>
          <ul className="space-y-3 text-sm leading-6 text-slate-200">
            <li>• Open-Meteo for weather forecasts and hydrological context</li>
            <li>• NASA POWER for climatology and agricultural weather normals</li>
            <li>• NASA FIRMS for active thermal hotspots and wildfire signals</li>
            <li>• OpenStreetMap / Nominatim / Overpass for mapping and geocoding</li>
          </ul>
        </GlassCard>
      </div>
    </div>
  )
}
