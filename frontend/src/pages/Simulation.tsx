import { useEffect, useState } from 'react'
import { api } from '../lib/api'

const defaultLat = 18.5204
const defaultLon = 73.8567

export default function Simulation() {
  const [selectedScenarioId, setSelectedScenarioId] = useState('cloudburst')
  const [lat, setLat] = useState(defaultLat)
  const [lon, setLon] = useState(defaultLon)
  const [eventDate, setEventDate] = useState('2024-06-15')
  const [reportHazard, setReportHazard] = useState('flood')
  const [scenarioData, setScenarioData] = useState<Record<string, unknown> | null>(null)
  const [backtest, setBacktest] = useState<Record<string, unknown> | null>(null)
  const [metrics, setMetrics] = useState<Record<string, Record<string, unknown>> | null>(null)
  const [report, setReport] = useState<string>('')
  const [scenarios, setScenarios] = useState<Array<Record<string, unknown>>>([])

  useEffect(() => {
    void api.simulationScenarios().then((data) => setScenarios(data.scenarios)).catch(() => undefined)
    void api.validationMetrics().then((data) => setMetrics(data.hazards)).catch(() => undefined)
    void api.validationReport(reportHazard).then((data) => setReport(data.report)).catch(() => undefined)
  }, [reportHazard])

  const scenarioList = scenarios as Array<Record<string, any>>
  const selectedScenario = scenarioList.find((scenario) => scenario.id === selectedScenarioId) ?? scenarioList[0]

  const runScenario = async () => {
    const result = await api.runSimulation({ scenario_id: String(selectedScenarioId), lat, lon })
    setScenarioData(result)
  }

  const runBacktest = async () => {
    const result = await api.validationBacktest(lat, lon, eventDate)
    setBacktest(result)
  }

  const metricCards = metrics ? Object.entries(metrics) : []

  return (
    <div className="space-y-6 p-4 text-slate-100">
      <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-4 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
        <div className="mb-3 inline-flex rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          SIMULATION
        </div>
        <h1 className="text-3xl font-bold text-white">Scenario lab & validation</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Run synthetic weather and sensor conditions through each engine without touching live services, then compare model evidence against archive data.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
          <h2 className="mb-4 text-xl font-semibold text-white">Scenario library</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {scenarioList.map((scenario) => {
              const locationName = (scenario.location as Record<string, any> | undefined)?.name ?? 'Location'
              const active = scenario.id === selectedScenarioId
              return (
                <button
                  key={String(scenario.id)}
                  onClick={() => setSelectedScenarioId(String(scenario.id))}
                  className={`rounded-xl border p-3 text-left transition ${
                    active ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                  }`}
                >
                  <div className="text-sm uppercase tracking-[0.16em] text-cyan-300">{String(scenario.hazard)}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{String(scenario.title)}</div>
                  <div className="mt-1 text-sm text-slate-300">{locationName}</div>
                </button>
              )
            })}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-300">
              Latitude
              <input value={lat} onChange={(e) => setLat(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
            </label>
            <label className="text-sm text-slate-300">
              Longitude
              <input value={lon} onChange={(e) => setLon(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
            </label>
          </div>

          <button onClick={runScenario} className="mt-5 rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20">
            Run scenario
          </button>

          {scenarioData && (
            <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-emerald-300">Result</div>
              <div className="mt-2 text-2xl font-bold text-white">{String((scenarioData.summary as Record<string, unknown>)?.level ?? 'Ready')}</div>
              <div className="mt-2 text-sm text-slate-300">{String((scenarioData.summary as Record<string, unknown>)?.probability ?? '0')} probability</div>
              <div className="mt-4 space-y-2">
                {(scenarioData.alerts as Array<Record<string, unknown>> | undefined ?? []).map((alert, index) => (
                  <div key={`${String(alert.hazard)}-${index}`} className="rounded-lg border border-slate-700 bg-slate-950/60 p-2 text-sm text-slate-200">
                    <div className="font-semibold text-white">{String(alert.hazard)}</div>
                    <div>{String(alert.level)} • score {String(alert.score)}</div>
                    <div className="text-slate-400">{String(alert.message)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <h2 className="mb-4 text-xl font-semibold text-white">Historical back-test</h2>
            <label className="block text-sm text-slate-300">
              Event date
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
            </label>
            <button onClick={runBacktest} className="mt-4 w-full rounded-xl bg-violet-500 px-4 py-2 font-semibold text-white">
              Run archive comparison
            </button>
            {backtest && (
              <div className="mt-4 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 text-sm text-slate-200">
                <div className="font-semibold text-white">Forecast vs observation</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>Temp MAE: {String((backtest.metrics as Record<string, unknown>)?.temperature_mae_c ?? 'n/a')}</div>
                  <div>Temp RMSE: {String((backtest.metrics as Record<string, unknown>)?.temperature_rmse_c ?? 'n/a')}</div>
                  <div>Rain MAE: {String((backtest.metrics as Record<string, unknown>)?.precipitation_mae_mm ?? 'n/a')}</div>
                  <div>Rain RMSE: {String((backtest.metrics as Record<string, unknown>)?.precipitation_rmse_mm ?? 'n/a')}</div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <h2 className="mb-4 text-xl font-semibold text-white">Model metrics</h2>
            <div className="space-y-3">
              {metricCards.map(([hazard, item]) => (
                <div key={hazard} className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-200">
                  <div className="mb-2 text-base font-semibold uppercase text-cyan-300">{hazard}</div>
                  <div>ROC-AUC: {String(item.roc_auc ?? 'n/a')}</div>
                  <div>PR-AUC: {String(item.pr_auc ?? 'n/a')}</div>
                  <div>Brier: {String(item.brier_score ?? 'n/a')}</div>
                  <div>Precision: {String(item.precision ?? 'n/a')}</div>
                  <div>Recall: {String(item.recall ?? 'n/a')}</div>
                  <div>False alarm: {String(item.false_alarm_rate ?? 'n/a')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Validation report</h2>
          <select value={reportHazard} onChange={(e) => setReportHazard(e.target.value)} className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white">
            <option value="flood">flood</option>
            <option value="heat">heat</option>
            <option value="fire">fire</option>
          </select>
        </div>
        <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-xs text-slate-200">
          {report || 'Loading validation notes...'}
        </pre>
      </div>
    </div>
  )
}
