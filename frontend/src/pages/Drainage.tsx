import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react'

export default function Drainage() {
  const [simulated, setSimulated] = useState(false)

  const readings = useMemo(() => {
    if (simulated) {
      return [
        { label: 'Water level', value: '1.85 m', status: 'CRITICAL — Rising (+0.14 m/10m)', color: 'text-rose-400' },
        { label: 'Flow velocity', value: '0.18 m/s', status: 'STAGNANT — Flow Dropping (-93%)', color: 'text-amber-400' },
        { label: 'Conduit surcharge', value: '94%', status: 'OBSTRUCTED — Backflow Impending', color: 'text-rose-400' },
      ]
    }
    return [
      { label: 'Water level', value: '0.42 m', status: 'Normal (Base flow depth)', color: 'text-emerald-400' },
      { label: 'Flow velocity', value: '2.6 m/s', status: 'Optimal (Free-surface flow)', color: 'text-emerald-400' },
      { label: 'Conduit surcharge', value: '18%', status: 'Normal (Full clearance)', color: 'text-emerald-400' },
    ]
  }, [simulated])

  const alertMessage = simulated
    ? 'CRITICAL ALERT: Outfall Blockage Detected at Ward-7 Culvert Node D-04. Hydraulic head differential exceeds safe threshold (+1.43 m).'
    : 'No active blockage alerts. Acoustic & ultrasonic telemetry within nominal operating parameters.'

  const recommendedActions = [
    'Emergency Dispatch: Deploy municipal vacuum jetting and de-silting crew to Culvert Node D-04 immediately.',
    'Hydraulic Diversion: Open bypass sluice gate S-01 to reroute peak urban runoff toward detention basin B-2.',
    'Public Safety: Issue ward-level automated siren notification for low-lying underpass roads adjacent to Channel 3.',
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 text-white">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-lime">Drainage Network</p>
            {simulated && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                SIMULATED
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Urban Drainage Blockage Simulator</h1>
        </div>
        <button
          type="button"
          onClick={() => setSimulated(!simulated)}
          className={`rounded-xl border px-4 py-2.5 text-sm font-bold shadow-lg transition ${
            simulated
              ? 'border-rose-400/50 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
              : 'border-lime/50 bg-lime/10 text-lime hover:bg-lime/20'
          }`}
        >
          {simulated ? 'Reset Nominal Flow' : 'Start Blocked-Drain Scenario'}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {readings.map((reading) => (
          <div key={reading.label} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{reading.label}</p>
            <p className={`mt-3 text-3xl font-black ${reading.color}`}>{reading.value}</p>
            <p className="mt-2 text-xs font-medium text-slate-300">{reading.status}</p>
          </div>
        ))}
      </div>

      <div
        className={`mt-8 rounded-2xl border p-5 transition ${
          simulated
            ? 'border-rose-500/30 bg-rose-950/20'
            : 'border-cyan-500/20 bg-cyan-500/10'
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">System Telemetry & Blockage Status</p>
          {simulated && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
              <ShieldAlert className="h-3 w-3" /> FAULT TRIGGERED
            </span>
          )}
        </div>
        <p className="mt-3 text-lg font-semibold">
          {simulated
            ? 'Blocked outfall detected: Water level is rising rapidly while flow velocity has dropped to near zero.'
            : 'Monitoring stable — continuous acoustic flow and conduit level verification nominal.'}
        </p>
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${
            simulated
              ? 'border-rose-500/40 bg-rose-950/50 text-rose-200'
              : 'border-white/10 bg-slate-950/40 text-slate-300'
          }`}
        >
          {alertMessage}
        </div>

        {simulated && (
          <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/80 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              Recommended Emergency Response (SIMULATED)
            </div>
            <div className="mt-3 space-y-2">
              {recommendedActions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/5 p-2.5 text-xs text-slate-200">
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
