import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { hasInternalAccess } from "@/lib/requireInternalAccess"

type Snapshot = {
  home_probability: number
  draw_probability: number
  away_probability: number
  predicted_outcome: "HOME WIN" | "DRAW" | "AWAY WIN" | "PASS"
  confidence: number
  value_percent: number | null
  actual_home_goals: number | null
  actual_away_goals: number | null
  outcome_status: string
}

function actualOutcome(snapshot: Snapshot) {
  if (snapshot.actual_home_goals === null || snapshot.actual_away_goals === null) return null
  if (snapshot.actual_home_goals === snapshot.actual_away_goals) return "DRAW"
  return snapshot.actual_home_goals > snapshot.actual_away_goals ? "HOME WIN" : "AWAY WIN"
}

function percentage(value: number | null) {
  return value === null ? "-" : `${value}%`
}

export default async function InternalPerformancePage() {
  if (!(await hasInternalAccess())) notFound()

  const { data, error } = supabase
    ? await supabase
        .from("prediction_snapshots")
        .select("home_probability,draw_probability,away_probability,predicted_outcome,confidence,value_percent,actual_home_goals,actual_away_goals,outcome_status")
        .order("fixture_date", { ascending: false })
    : { data: null, error: new Error("Prediction tracking is not configured") }

  const rows = (data || []) as Snapshot[]
  const settled = rows.filter((row) => row.outcome_status === "settled" && actualOutcome(row))
  const correct = settled.filter((row) => row.predicted_outcome === actualOutcome(row)).length
  const averageConfidence = rows.length
    ? Math.round(rows.reduce((total, row) => total + Number(row.confidence || 0), 0) / rows.length)
    : null
  const valueRows = settled.filter((row) => Number(row.value_percent || 0) >= 5)
  const valueCorrect = valueRows.filter((row) => row.predicted_outcome === actualOutcome(row)).length
  const bands = [
    { label: "50-59%", min: 50, max: 59 },
    { label: "60-69%", min: 60, max: 69 },
    { label: "70-79%", min: 70, max: 79 },
    { label: "80%+", min: 80, max: 100 },
  ].map((band) => {
    const bandRows = settled.filter((row) => {
      const probability = Math.max(row.home_probability, row.draw_probability, row.away_probability)
      return probability >= band.min && probability <= band.max
    })
    const bandCorrect = bandRows.filter((row) => row.predicted_outcome === actualOutcome(row)).length
    return { ...band, count: bandRows.length, accuracy: bandRows.length ? Math.round((bandCorrect / bandRows.length) * 100) : null }
  })

  return (
    <main className="qe-grid min-h-screen px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-cyan-100/10 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">Internal model monitoring</p>
          <h1 className="mt-2 text-4xl font-bold">Performance review</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Private calibration and outcome monitoring for Quant Edge operations.</p>
        </header>

        {error && <div className="mt-6 border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">Prediction tracking is not available yet.</div>}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Total snapshots", rows.length],
            ["Settled", settled.length],
            ["Aligned", settled.length ? correct : "-"],
            ["Observed alignment", percentage(settled.length ? Math.round((correct / settled.length) * 100) : null)],
            ["Average confidence", percentage(averageConfidence)],
          ].map(([label, value]) => (
            <div className="qe-panel rounded-2xl border p-5" key={label}>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
              <p className="mt-3 text-3xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Calibration</p>
            <h2 className="mt-2 text-2xl font-bold">Observed alignment by probability band</h2>
            <div className="qe-panel mt-5 overflow-hidden rounded-2xl border">
              {bands.map((band) => (
                <div className="border-b border-slate-800 p-4 last:border-b-0" key={band.label}>
                  <div className="flex items-center justify-between text-sm"><span className="font-semibold">{band.label}</span><span className="text-slate-400">{band.count} settled</span></div>
                  <div className="mt-3 h-2 bg-slate-800"><div className="h-full bg-cyan-300" style={{ width: `${band.accuracy ?? 0}%` }} /></div>
                  <p className="mt-2 text-xs text-slate-500">Observed alignment: {percentage(band.accuracy)}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">Review set</p>
            <h2 className="mt-2 text-2xl font-bold">Higher-signal snapshots</h2>
            <div className="qe-panel mt-5 rounded-2xl border p-5">
              <p className="text-sm text-slate-400">Settled snapshots with at least +5 percentage points of model-versus-market difference.</p>
              <p className="mt-5 text-4xl font-bold text-lime-300">{valueRows.length ? `${Math.round((valueCorrect / valueRows.length) * 100)}%` : "-"}</p>
              <p className="mt-2 text-sm text-slate-500">{valueCorrect} aligned from {valueRows.length} reviewed snapshots</p>
              <p className="mt-5 border-t border-slate-800 pt-4 text-xs text-slate-500">Internal calibration metric only. It is not presented as financial performance or user guidance.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}