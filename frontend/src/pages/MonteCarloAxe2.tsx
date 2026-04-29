/**
 * MonteCarloAxe2.tsx — Page "Simulations Monte Carlo 2030" (Axe 2)
 * 5 tabs : Vue d'ensemble | Simulation Pays | Scénarios | Par Variable | Comparaison
 *
 * Design system Axe 2 (olive). Pattern tabs = PredictionsAxe2.tsx.
 * Route : /modelisation/monte-carlo (sous ScarLayout)
 *
 * Méthode : GBM (Geometric Brownian Motion) — 10 000 simulations par pays/variable.
 * Note méthodologique : les résultats P50 peuvent différer légèrement des prédictions
 * par régression (Palier 1) — deux méthodes complémentaires capturant des aspects différents.
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ResponsiveContainer, ComposedChart, LineChart, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Area, Line, ReferenceLine,
  ReferenceArea, Legend, ErrorBar,
} from 'recharts'
import Select from 'react-select'
import {
  TrendingUp, TrendingDown, Minus, Shuffle, Info, ChevronLeft, ChevronRight,
  BarChart2, Globe, GitBranch, Scale,
} from 'lucide-react'
import api from '../utils/api'

// ── Design tokens Axe 2 ──────────────────────────────────────────────────────
const OLIVE        = 'hsl(83,52%,36%)'
const OLIVE_L      = 'hsl(83,50%,55%)'
const NAVY         = 'hsl(213,60%,27%)'
const GREEN        = 'hsl(152,56%,39%)'
const RED          = 'hsl(358,66%,54%)'
const AMBER        = 'hsl(30,88%,56%)'
const GRAY_100     = 'hsl(218,22%,94%)'

// Couleurs scénarios
const C_OPT  = GREEN   // P90 — Optimiste
const C_BASE = NAVY    // P50 — Central
const C_PESS = RED     // P10 — Pessimiste
const C_HIST = OLIVE   // Historique

// Palette multi-pays (Tab 4 / comparaison)
const COUNTRY_COLORS = [NAVY, OLIVE, '#8E44AD', '#E67E22', '#2980B9']

// ── Types ─────────────────────────────────────────────────────────────────────
interface MCPercentiles {
  annees: number[]
  p10: number[]
  p25: number[]
  p50: number[]
  p75: number[]
  p90: number[]
  mean: number[]
}

interface MCScenarios {
  pessimiste: { valeur: number; variation_vs_2024_pct: number | null }
  central:    { valeur: number; variation_vs_2024_pct: number | null }
  optimiste:  { valeur: number; variation_vs_2024_pct: number | null }
}

interface MCProbas {
  prob_hausse_vs_2024: number
  prob_hausse_20pct:   number
  prob_baisse_vs_2024: number
  prob_baisse_20pct:   number
}

interface MCPaysResult {
  pays: string
  variable: string
  dimension: string
  unite: string
  label: string
  sens_favorable: string
  mu: number
  sigma: number
  n_simulations: number
  historique: { annee: number; valeur: number }[]
  trajectoires_sample: number[][]
  percentiles: MCPercentiles
  scenarios_2030: MCScenarios
  probabilites: MCProbas
  error?: string
}

interface OverviewRow {
  pays: string
  primes_nv_2024: number | null
  primes_nv_p10:  number | null
  primes_nv_p50:  number | null
  primes_nv_p90:  number | null
  primes_nv_sigma: number | null
  penetration_p10: number | null
  penetration_p50: number | null
  penetration_p90: number | null
  ratio_sp_p10: number | null
  ratio_sp_p50: number | null
  ratio_sp_p90: number | null
  incertitude_primes:      number | null
  incertitude_penetration: number | null
  incertitude_sp:          number | null
}

interface VariableClassRow {
  pays: string
  valeur_2024: number
  valeur_scenario: number
  p10: number
  p50: number
  p90: number
  variation_pct: number | null
  sigma: number
  incertitude_pct: number | null
  rang: number
}

interface ScenGlobaux {
  primes_nv_total: { p10: number; p50: number; p90: number }
  penetration_moy: { p10: number; p50: number; p90: number }
  ratio_sp_moy:    { p10: number; p50: number; p90: number }
  historique_continent: { annee: number; valeur: number }[]
  predictions_continent: { annee: number; p10: number; p50: number; p90: number }[]
  scenarios: {
    pessimiste: { description: string; primes_nv_total: number; penetration_moy: number; ratio_sp_moy: number }
    central:    { description: string; primes_nv_total: number; penetration_moy: number; ratio_sp_moy: number }
    optimiste:  { description: string; primes_nv_total: number; penetration_moy: number; ratio_sp_moy: number }
  }
}

interface Metadata {
  pays: string[]
  variables: Record<string, { dim: string; type: string; sens: string; unite: string; label: string }>
  dimensions: Record<string, string[]>
  n_simulations: number
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
type TabId = 'overview' | 'simulation' | 'scenarios' | 'variable' | 'comparaison'
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview',    label: "Vue d'ensemble", icon: '🎲' },
  { id: 'simulation',  label: 'Simulation Pays', icon: '🌍' },
  { id: 'scenarios',   label: 'Scénarios',       icon: '🔀' },
  { id: 'variable',    label: 'Par Variable',    icon: '📊' },
  { id: 'comparaison', label: 'Comparaison',     icon: '⚖️' },
]

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtMn(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return '—'
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} Md$`
  return `${v.toFixed(0)} Mn$`
}
function fmtPct(v: number | null | undefined, dec = 1): string {
  if (v == null || isNaN(v)) return '—'
  return `${v.toFixed(dec)}%`
}
function fmtVal(v: number | null | undefined, unite: string): string {
  if (v == null || isNaN(v as number)) return '—'
  const n = v as number
  if (unite === 'Mn USD') return fmtMn(n)
  if (unite === '%')      return fmtPct(n)
  if (unite === 'USD/hab') return `${n.toFixed(1)} USD/hab`
  if (unite === 'USD')    return `${n.toFixed(0)} USD`
  if (unite === 'indice') return n.toFixed(2)
  if (unite === '% PIB')  return fmtPct(n)
  return `${n.toFixed(2)} ${unite}`
}
function fmtPctSign(v: number | null | undefined): string {
  if (v == null || isNaN(v as number)) return '—'
  const n = v as number
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}
function fmtSigma(v: number | null | undefined): string {
  if (v == null) return '—'
  return `${(v * 100).toFixed(1)}%`
}

// ── Helpers UI ────────────────────────────────────────────────────────────────
function Skeleton({ w = '80%', h = 20 }: { w?: string; h?: number }) {
  return <div className="animate-pulse rounded" style={{ width: w, height: h, background: 'hsl(83,10%,88%)' }} />
}

function CardShell({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={`bg-white rounded-xl p-5 ${className ?? ''}`}
      style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-bold" style={{ color: NAVY }}>{children}</h2>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{sub}</p>}
    </div>
  )
}

function MethodNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg text-xs" style={{ background: 'hsla(83,52%,36%,0.06)', border: '1px solid hsla(83,52%,36%,0.15)', color: '#6b7280' }}>
      <Info size={12} className="flex-shrink-0 mt-0.5" style={{ color: OLIVE }} />
      <span>{text}</span>
    </div>
  )
}

function ScenarioBadge({ scenario }: { scenario: 'pessimiste' | 'central' | 'optimiste' }) {
  const map = {
    pessimiste: { color: C_PESS, label: 'Scénario pessimiste (P10)', emoji: '🔴' },
    central:    { color: C_BASE, label: 'Scénario central (P50)',    emoji: '🔵' },
    optimiste:  { color: C_OPT,  label: 'Scénario optimiste (P90)',  emoji: '🟢' },
  }
  const { color, label, emoji } = map[scenario]
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>
      {emoji} {label}
    </span>
  )
}

function IncertBadge({ v }: { v: number | null }) {
  if (v == null) return <span style={{ color: '#9ca3af' }}>—</span>
  const color = v > 60 ? RED : v > 30 ? AMBER : GREEN
  const label = v > 60 ? 'Très incertain' : v > 30 ? 'Modéré' : 'Stable'
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
      {v.toFixed(1)}% · {label}
    </span>
  )
}

function TrendBadge({ v, sens = 'hausse' }: { v: number | null; sens?: string }) {
  if (v == null) return <span style={{ color: '#9ca3af' }}>—</span>
  const good = sens === 'hausse' ? v > 2 : v < -2
  const bad  = sens === 'hausse' ? v < -2 : v > 2
  const color = good ? GREEN : bad ? RED : AMBER
  const icon  = v > 2 ? '↗' : v < -2 ? '↘' : '→'
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
      {icon} {fmtPctSign(v)}
    </span>
  )
}

function ProbaBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-xs w-40 text-right flex-shrink-0" style={{ color: '#6b7280' }}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'hsl(0,0%,92%)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${(value * 100).toFixed(1)}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-12 flex-shrink-0" style={{ color }}>
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  )
}

// ── react-select styles (Axe 2) ───────────────────────────────────────────────
const rsStyles = {
  control: (b: any) => ({ ...b, borderColor: 'hsl(0,0%,88%)', borderRadius: 8, fontSize: 13, minHeight: 36, boxShadow: 'none', '&:hover': { borderColor: OLIVE } }),
  option: (b: any, { isFocused, isSelected }: any) => ({
    ...b, fontSize: 13, background: isSelected ? OLIVE : isFocused ? 'hsla(83,52%,36%,0.08)' : 'white',
    color: isSelected ? 'white' : NAVY,
  }),
  menu: (b: any) => ({ ...b, borderRadius: 10, border: `1px solid hsl(0,0%,88%)`, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999 }),
}

// ── TabNav / TabProgress ──────────────────────────────────────────────────────
function TabNav({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (t: TabId) => void }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden mb-1"
      style={{ border: '1px solid hsl(0,0%,90%)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map((tab, i) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                onTabChange(tab.id)
                document.getElementById('scar-main-scroll')?.scrollTo({ top: 0, behavior: 'instant' })
              }}
              className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all relative flex-shrink-0"
              style={active ? {
                color: NAVY,
                background: 'hsla(213,60%,27%,0.08)',
                borderBottom: `2px solid ${NAVY}`,
              } : { color: '#6b7280', borderBottom: '2px solid transparent' }}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {i < TABS.length - 1 && !active && (
                <span className="absolute right-0 top-1/4 bottom-1/4 w-px" style={{ background: 'hsl(0,0%,90%)' }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TabProgress({ activeTab }: { activeTab: TabId }) {
  const idx = TABS.findIndex(t => t.id === activeTab)
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {TABS.map((tab, i) => (
        <div key={tab.id} className="h-1 rounded-full transition-all" style={{
          flex: 1,
          background: i === idx ? NAVY : i < idx ? 'hsla(213,60%,27%,0.35)' : 'hsl(0,0%,90%)',
        }} />
      ))}
    </div>
  )
}

// ── Fan Chart (graphique signature Monte Carlo) ───────────────────────────────
function FanChart({
  historique,
  percentiles,
  trajectoires,
  unite,
  label,
  colorMain = NAVY,
  height = 420,
}: {
  historique: { annee: number; valeur: number }[]
  percentiles: MCPercentiles
  trajectoires: number[][]
  unite: string
  label: string
  colorMain?: string
  height?: number
}) {
  // Construire les données chart : historique (2015-2024) + prédictions (2025-2030)
  const chartData = useMemo(() => {
    const rows: Record<number, any> = {}

    // Historique
    historique.forEach(pt => {
      rows[pt.annee] = { annee: pt.annee, hist: pt.valeur }
    })

    // Percentiles (prédictions)
    percentiles.annees.forEach((yr, i) => {
      rows[yr] = {
        annee: yr,
        p10:  percentiles.p10[i],
        p25:  percentiles.p25[i],
        p50:  percentiles.p50[i],
        p75:  percentiles.p75[i],
        p90:  percentiles.p90[i],
        mean: percentiles.mean[i],
        // Pont : le dernier point historique → premier point de prédiction
        bridge: yr === 2025 ? historique[historique.length - 1]?.valeur : undefined,
      }
    })

    return Object.values(rows).sort((a, b) => a.annee - b.annee)
  }, [historique, percentiles])

  // Formatter tooltip
  const customTooltip = ({ active, payload, label: yr }: any) => {
    if (!active || !payload?.length) return null
    const row = chartData.find(d => d.annee === yr)
    if (!row) return null
    return (
      <div className="bg-white rounded-xl p-3 text-xs" style={{ border: `1px solid ${colorMain}30`, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 180 }}>
        <p className="font-bold mb-1.5" style={{ color: NAVY }}>{yr}</p>
        {row.hist != null && (
          <p style={{ color: C_HIST }}>Historique : <strong>{fmtVal(row.hist, unite)}</strong></p>
        )}
        {row.p50 != null && <>
          <p style={{ color: C_OPT }}>Optimiste (P90) : <strong>{fmtVal(row.p90, unite)}</strong></p>
          <p style={{ color: C_BASE }}>Central (P50) :   <strong>{fmtVal(row.p50, unite)}</strong></p>
          <p style={{ color: C_PESS }}>Pessimiste (P10) : <strong>{fmtVal(row.p10, unite)}</strong></p>
        </>}
      </div>
    )
  }

  const fmtY = (v: number) => {
    if (unite === 'Mn USD') return fmtMn(v)
    if (unite === '%')      return `${v.toFixed(1)}%`
    return v.toFixed(1)
  }

  return (
    <div style={{ position: 'relative' }}>
      <p className="text-xs mb-2 font-medium" style={{ color: '#6b7280' }}>{label}</p>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="bandP2575" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorMain} stopOpacity={0.25} />
              <stop offset="100%" stopColor={colorMain} stopOpacity={0.10} />
            </linearGradient>
          </defs>

          {/* Séparateur 2024 | Prédictions */}
          <ReferenceArea x1={2024} x2={2024.5} fill="hsla(0,0%,0%,0.03)" />
          <ReferenceLine x={2024.5} stroke="hsl(0,0%,80%)" strokeDasharray="4 3" strokeWidth={1} label={{ value: '→ Simulations', position: 'top', fontSize: 9, fill: '#9ca3af' }} />

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,94%)" />
          <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <YAxis tickFormatter={fmtY} tick={{ fontSize: 10, fill: '#9ca3af' }} width={65} />
          <Tooltip content={customTooltip} />

          {/* Bande P10–P90 (très transparente) */}
          <Area dataKey="p90" stroke="none" fill={colorMain} fillOpacity={0.08} legendType="none" connectNulls />
          <Area dataKey="p10" stroke="none" fill="white" fillOpacity={1} legendType="none" connectNulls baseLine={0} />

          {/* Bande P25–P75 */}
          <Area dataKey="p75" stroke="none" fill={colorMain} fillOpacity={0.22} legendType="none" connectNulls />
          <Area dataKey="p25" stroke="none" fill="white" fillOpacity={1} legendType="none" connectNulls />

          {/* Trajectoires individuelles (200 × très transparentes) */}
          {trajectoires.slice(0, 200).map((traj, idx) => {
            const trajData = traj.map((val, i) => ({ annee: percentiles.annees[i], traj: val }))
            return (
              <Line
                key={`traj-${idx}`}
                data={[{ annee: historique[historique.length - 1]?.annee, traj: historique[historique.length - 1]?.valeur }, ...trajData]}
                dataKey="traj"
                stroke={colorMain}
                strokeWidth={0.5}
                strokeOpacity={0.04}
                dot={false}
                legendType="none"
                isAnimationActive={false}
              />
            )
          })}

          {/* P90 — Optimiste */}
          <Line dataKey="p90" stroke={C_OPT} strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Optimiste (P90)" connectNulls />
          {/* P10 — Pessimiste */}
          <Line dataKey="p10" stroke={C_PESS} strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Pessimiste (P10)" connectNulls />
          {/* P50 — Central */}
          <Line dataKey="p50" stroke={colorMain} strokeWidth={2.5} dot={false} name="Central (P50)" connectNulls />
          {/* Pont P50 depuis historique */}
          <Line dataKey="bridge" stroke={colorMain} strokeWidth={2.5} strokeDasharray="2 2" dot={false} legendType="none" connectNulls />
          {/* Historique */}
          <Line dataKey="hist" stroke={C_HIST} strokeWidth={2.5} dot={false} name="Historique" connectNulls />

          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Histogramme distribution 2030 ────────────────────────────────────────────
function HistoDistrib({
  trajectoires,
  p10,
  p50,
  p90,
  unite,
}: {
  trajectoires: number[][]
  p10: number
  p50: number
  p90: number
  unite: string
}) {
  const { bins, refLines } = useMemo(() => {
    const vals = trajectoires.map(t => t[t.length - 1]).filter(v => isFinite(v))
    if (!vals.length) return { bins: [], refLines: [] }

    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const N_BINS = 30
    const binWidth = (max - min) / N_BINS || 1

    const counts = new Array(N_BINS).fill(0)
    vals.forEach(v => {
      const idx = Math.min(Math.floor((v - min) / binWidth), N_BINS - 1)
      counts[idx]++
    })

    const bins = counts.map((count, i) => ({
      x: min + i * binWidth + binWidth / 2,
      count,
      label: fmtVal(min + i * binWidth + binWidth / 2, unite),
    }))

    return {
      bins,
      refLines: [
        { val: p10, color: C_PESS, label: 'P10' },
        { val: p50, color: C_BASE, label: 'P50' },
        { val: p90, color: C_OPT,  label: 'P90' },
      ],
    }
  }, [trajectoires, p10, p50, p90, unite])

  if (!bins.length) return null

  return (
    <div>
      <p className="text-xs font-medium mb-2" style={{ color: '#6b7280' }}>
        Distribution des simulations — Valeur en 2030
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={bins} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,94%)" />
          <XAxis dataKey="x" tickFormatter={v => fmtVal(v, unite)} tick={{ fontSize: 9, fill: '#9ca3af' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} />
          <Bar dataKey="count" fill={NAVY} fillOpacity={0.6} radius={[2, 2, 0, 0]} name="Nb simulations" />
          {refLines.map(rl => (
            <ReferenceLine key={rl.label} x={rl.val} stroke={rl.color} strokeWidth={2} label={{ value: rl.label, position: 'top', fontSize: 9, fill: rl.color }} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Variable selector groupé ──────────────────────────────────────────────────
function buildVarOptions(meta: Metadata['variables'], dims: Record<string, string[]>) {
  return Object.entries(dims).map(([dim, vars]) => ({
    label: dim === 'non_vie' ? 'Non-Vie' : dim === 'vie' ? 'Vie' : dim === 'macro' ? 'Macro' : 'Gouvernance',
    options: vars.filter(v => meta[v]).map(v => ({ value: v, label: meta[v].label, unite: meta[v].unite })),
  }))
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB 1 — VUE D'ENSEMBLE
// ══════════════════════════════════════════════════════════════════════════════
function TabOverview({ overview, loading }: { overview: OverviewRow[]; loading: boolean }) {
  const [sortCol, setSortCol] = useState<string>('primes_nv_p50')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const sorted = useMemo(() => {
    return [...overview].sort((a, b) => {
      const va = (a as any)[sortCol] ?? -Infinity
      const vb = (b as any)[sortCol] ?? -Infinity
      return sortDir === 'desc' ? vb - va : va - vb
    })
  }, [overview, sortCol, sortDir])

  const handleSort = (col: string) => {
    if (col === sortCol) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  // KPI cards
  const totalP50 = overview.reduce((s, r) => s + (r.primes_nv_p50 ?? 0), 0)
  const bestGrowth = useMemo(() => {
    const valid = overview.filter(r => r.primes_nv_2024 && r.primes_nv_p50)
    const best = valid.reduce((b, r) => {
      const v = (r.primes_nv_p50! - r.primes_nv_2024!) / Math.abs(r.primes_nv_2024!) * 100
      const bv = (b.primes_nv_p50! - b.primes_nv_2024!) / Math.abs(b.primes_nv_2024!) * 100
      return v > bv ? r : b
    }, valid[0])
    if (!best) return null
    const pct = (best.primes_nv_p50! - best.primes_nv_2024!) / Math.abs(best.primes_nv_2024!) * 100
    return { pays: best.pays, pct }
  }, [overview])
  const maxIncert = useMemo(() => {
    const valid = overview.filter(r => r.incertitude_primes != null)
    return valid.reduce((b, r) => (r.incertitude_primes! > (b?.incertitude_primes ?? 0) ? r : b), valid[0] ?? null)
  }, [overview])

  const SH = ({ col, label }: { col: string; label: string }) => (
    <th className="px-3 py-2 text-left text-[10px] font-semibold cursor-pointer select-none whitespace-nowrap"
      style={{ color: sortCol === col ? NAVY : '#9ca3af' }}
      onClick={() => handleSort(col)}>
      {label} {sortCol === col ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  )

  // Top 10 pour le graphique en barres
  const top10 = useMemo(() =>
    [...overview]
      .filter(r => r.primes_nv_p50 != null)
      .sort((a, b) => (b.primes_nv_p50 ?? 0) - (a.primes_nv_p50 ?? 0))
      .slice(0, 10)
      .map(r => ({
        pays: r.pays,
        p50: r.primes_nv_p50,
        p10: r.primes_nv_p10,
        p90: r.primes_nv_p90,
        hist: r.primes_nv_2024,
        delta: r.primes_nv_2024 != null && r.primes_nv_p50 != null ? r.primes_nv_p50 - r.primes_nv_2024 : 0,
      }))
  , [overview])

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '🎲', label: 'Simulations', value: '10 000 × 34 pays', sub: 'GBM Horizon 2030', color: NAVY },
          { icon: '📈', label: 'Primes NV P50 2030', value: loading ? '…' : fmtMn(totalP50), sub: 'Scénario central continent', color: OLIVE },
          { icon: '🌟', label: 'Meilleure croissance P50', value: loading ? '…' : (bestGrowth ? bestGrowth.pays : '—'), sub: bestGrowth ? fmtPctSign(bestGrowth.pct) + ' vs 2024' : '', color: GREEN },
          { icon: '⚡', label: 'Incertitude max', value: loading ? '…' : (maxIncert?.pays ?? '—'), sub: maxIncert ? `${maxIncert.incertitude_primes?.toFixed(1)}% écart P10–P90` : '', color: AMBER },
        ].map(k => (
          <CardShell key={k.label}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
                style={{ background: `${k.color}15` }}>{k.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: '#6b7280' }}>{k.label}</p>
                {loading ? <Skeleton w="70%" h={20} /> : (
                  <p className="text-base font-bold mt-0.5 truncate" style={{ color: k.color }}>{k.value}</p>
                )}
                {k.sub && <p className="text-[10px] mt-0.5" style={{ color: '#9ca3af' }}>{k.sub}</p>}
              </div>
            </div>
          </CardShell>
        ))}
      </div>

      {/* Top 10 Bar Chart */}
      <CardShell>
        <SectionTitle sub="Fourchette P10–P90 par pays (top 10 selon scénario central)">
          Primes Non-Vie 2030 — Fourchette d'incertitude (Top 10)
        </SectionTitle>
        {loading ? <Skeleton w="100%" h={220} /> : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 60, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,94%)" horizontal={false} />
              <XAxis type="number" tickFormatter={v => fmtMn(v)} tick={{ fontSize: 9, fill: '#9ca3af' }} />
              <YAxis type="category" dataKey="pays" tick={{ fontSize: 10, fill: '#374151' }} width={75} />
              <Tooltip
                formatter={(v: any, name: string) => [fmtMn(v), name]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="p10" name="Pessimiste (P10)" fill={C_PESS} fillOpacity={0.6} radius={[0, 0, 0, 0]} stackId="none" />
              <Bar dataKey="p50" name="Central (P50)" fill={C_BASE} fillOpacity={0.75} radius={[0, 3, 3, 0]} />
              <Bar dataKey="p90" name="Optimiste (P90)" fill={C_OPT} fillOpacity={0.55} radius={[0, 3, 3, 0]} />
              <ReferenceLine x={0} stroke={NAVY} strokeWidth={1} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <MethodNote text="Chaque barre représente la fourchette P10–P50–P90 de 10 000 simulations GBM. Les pays sont classés selon le scénario central (P50)." />
      </CardShell>

      {/* Tableau synthèse */}
      <CardShell style={{ padding: 0 }}>
        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid hsl(0,0%,93%)' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: NAVY }}>Tableau de synthèse — 34 pays</h2>
            <p className="text-xs" style={{ color: '#6b7280' }}>Primes Non-Vie · Scénarios Monte Carlo 2030</p>
          </div>
          <span className="text-xs px-2 py-1 rounded" style={{ background: 'hsla(83,52%,36%,0.08)', color: OLIVE }}>
            {overview.length} pays
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full min-w-[780px]">
            <thead>
              <tr style={{ background: 'hsl(218,22%,97%)' }}>
                <th className="px-3 py-2 text-left text-[10px] font-semibold" style={{ color: '#9ca3af' }}>#</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold" style={{ color: '#9ca3af' }}>Pays</th>
                <SH col="primes_nv_2024"  label="Primes 2024" />
                <SH col="primes_nv_p10"   label="P10 2030" />
                <SH col="primes_nv_p50"   label="P50 2030" />
                <SH col="primes_nv_p90"   label="P90 2030" />
                <SH col="incertitude_primes" label="Incertitude" />
                <th className="px-3 py-2 text-left text-[10px] font-semibold" style={{ color: '#9ca3af' }}>Tendance P50</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid hsl(0,0%,95%)' }}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5"><Skeleton w="80%" h={14} /></td>
                  ))}
                </tr>
              )) : sorted.map((row, i) => {
                const trend = row.primes_nv_2024 && row.primes_nv_p50
                  ? (row.primes_nv_p50 - row.primes_nv_2024) / Math.abs(row.primes_nv_2024) * 100
                  : null
                return (
                  <tr key={row.pays} style={{ borderBottom: '1px solid hsl(0,0%,96%)' }}
                    className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-xs font-bold" style={{ color: '#9ca3af' }}>{i + 1}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: NAVY }}>{row.pays}</td>
                    <td className="px-3 py-2.5 text-xs">{fmtMn(row.primes_nv_2024)}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: C_PESS }}>{fmtMn(row.primes_nv_p10)}</td>
                    <td className="px-3 py-2.5 text-xs font-bold" style={{ color: C_BASE }}>{fmtMn(row.primes_nv_p50)}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: C_OPT }}>{fmtMn(row.primes_nv_p90)}</td>
                    <td className="px-3 py-2.5"><IncertBadge v={row.incertitude_primes} /></td>
                    <td className="px-3 py-2.5"><TrendBadge v={trend} sens="hausse" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardShell>

      <MethodNote text="Les résultats Monte Carlo (P50) sont basés sur 10 000 simulations GBM. Ils peuvent différer des prédictions par régression (Palier 1) car les deux méthodes capturent différents aspects des tendances historiques." />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB 2 — SIMULATION PAYS
// ══════════════════════════════════════════════════════════════════════════════
function TabSimulation({
  metadata,
  metaLoading,
}: {
  metadata: Metadata | null
  metaLoading: boolean
}) {
  const [pays, setPays] = useState<string | null>(null)
  const [variable, setVariable] = useState<string>('Primes_NonVie')
  const [result, setResult] = useState<MCPaysResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const paysOptions = useMemo(() =>
    (metadata?.pays ?? []).map(p => ({ value: p, label: p }))
  , [metadata])

  const varOptions = useMemo(() => {
    if (!metadata) return []
    return buildVarOptions(metadata.variables, metadata.dimensions)
  }, [metadata])

  const load = useCallback(async () => {
    if (!pays || !variable) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/monte-carlo/pays/${encodeURIComponent(pays)}?variable=${variable}`)
      setResult(res.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [pays, variable])

  useEffect(() => { load() }, [load])

  const varMeta = metadata?.variables[variable]
  const sens = varMeta?.sens ?? 'hausse'

  return (
    <div className="space-y-4">
      {/* Sélecteurs */}
      <CardShell>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: NAVY }}>Pays</label>
            <Select
              options={paysOptions}
              value={paysOptions.find(o => o.value === pays) ?? null}
              onChange={o => setPays(o?.value ?? null)}
              placeholder="Sélectionner un pays…"
              styles={rsStyles}
              isLoading={metaLoading}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: NAVY }}>Variable</label>
            <Select
              options={varOptions}
              value={varOptions.flatMap(g => g.options).find(o => o.value === variable) ?? null}
              onChange={(o: any) => setVariable(o?.value ?? 'Primes_NonVie')}
              placeholder="Variable à simuler…"
              styles={rsStyles}
            />
          </div>
        </div>
      </CardShell>

      {!pays && (
        <CardShell>
          <div className="text-center py-10">
            <Globe size={36} className="mx-auto mb-3" style={{ color: OLIVE, opacity: 0.5 }} />
            <p className="text-sm font-medium" style={{ color: '#6b7280' }}>Sélectionnez un pays pour lancer la simulation</p>
            <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>10 000 trajectoires GBM · Horizon 2030</p>
          </div>
        </CardShell>
      )}

      {pays && loading && (
        <CardShell>
          <div className="text-center py-10">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 animate-spin"
              style={{ borderColor: OLIVE, borderTopColor: 'transparent' }} />
            <p className="text-sm font-medium" style={{ color: '#6b7280' }}>Calcul de 10 000 simulations en cours…</p>
            <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>GBM · {pays} · {varMeta?.label}</p>
          </div>
        </CardShell>
      )}

      {error && (
        <CardShell>
          <div className="text-center py-6">
            <p className="text-sm font-semibold" style={{ color: RED }}>Erreur : {error}</p>
            <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>Ce pays n'a peut-être pas suffisamment de données historiques (minimum 4 points requis).</p>
          </div>
        </CardShell>
      )}

      {result && !loading && (
        <>
          {/* Bloc A — Paramètres */}
          <CardShell>
            <SectionTitle>Paramètres de la simulation</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Données historiques', value: '2015 – 2024 (10 ans)' },
                { label: 'Méthode', value: 'GBM (Brownien géométrique)', tooltip: true },
                { label: 'Simulations', value: `${(result.n_simulations).toLocaleString()}` },
                { label: 'Dérive annuelle (μ)', value: `${(result.mu * 100).toFixed(3)}%` },
                { label: 'Volatilité annuelle (σ)', value: fmtSigma(result.sigma) },
                { label: 'Horizon', value: '2030 (6 ans)' },
              ].map(p => (
                <div key={p.label} className="p-3 rounded-lg" style={{ background: GRAY_100 }}>
                  <p className="text-[10px] font-medium" style={{ color: '#9ca3af' }}>{p.label}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: NAVY }}>
                    {p.value}
                    {p.tooltip && (
                      <span title="Le modèle GBM suppose une croissance log-normale. μ représente la tendance moyenne, σ la variabilité historique des rendements annuels."
                        className="ml-1 cursor-help" style={{ color: OLIVE }}>
                        ⓘ
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </CardShell>

          {/* Bloc B — Fan Chart */}
          <CardShell>
            <SectionTitle sub={`${result.pays} · ${result.label} · ${result.unite}`}>
              Fan Chart Monte Carlo — Éventail des simulations
            </SectionTitle>
            <FanChart
              historique={result.historique}
              percentiles={result.percentiles}
              trajectoires={result.trajectoires_sample}
              unite={result.unite}
              label=""
            />
            <MethodNote text="Les traits fins gris représentent 200 trajectoires individuelles (parmi 10 000). La bande foncée = P25–P75, la bande claire = P10–P90. Le trait épais = scénario central (médiane P50)." />
          </CardShell>

          {/* Bloc C — Scénarios 2030 */}
          <CardShell>
            <SectionTitle>Scénarios 2030</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr style={{ background: 'hsl(218,22%,97%)' }}>
                    <th className="px-4 py-2 text-left text-xs font-semibold" style={{ color: '#9ca3af' }}>Scénario</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: '#9ca3af' }}>Valeur 2030</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: '#9ca3af' }}>vs 2024</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: '#9ca3af' }}>Probabilité</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    { key: 'optimiste',  color: C_OPT,  emoji: '🟢', proba: '10% des simulations supérieures' },
                    { key: 'central',    color: C_BASE, emoji: '🔵', proba: 'Médiane des 10 000 simulations' },
                    { key: 'pessimiste', color: C_PESS, emoji: '🔴', proba: '10% des simulations inférieures' },
                  ] as const).map(({ key, color, emoji, proba }) => {
                    const s = result.scenarios_2030[key]
                    const good = (key === 'optimiste' && sens === 'hausse') || (key === 'pessimiste' && sens === 'baisse') || (key === 'central')
                    return (
                      <tr key={key} style={{ borderBottom: '1px solid hsl(0,0%,96%)' }}>
                        <td className="px-4 py-3 text-sm font-semibold" style={{ color }}>
                          {emoji} Scénario {key}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-right" style={{ color }}>
                          {fmtVal(s.valeur, result.unite)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <TrendBadge v={s.variation_vs_2024_pct} sens={sens} />
                        </td>
                        <td className="px-4 py-3 text-xs text-right" style={{ color: '#6b7280' }}>{proba}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardShell>

          {/* Bloc D — Histogramme + Bloc E — Probabilités */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CardShell>
              <HistoDistrib
                trajectoires={result.trajectoires_sample}
                p10={result.percentiles.p10[5]}
                p50={result.percentiles.p50[5]}
                p90={result.percentiles.p90[5]}
                unite={result.unite}
              />
            </CardShell>

            <CardShell>
              <SectionTitle>Probabilités</SectionTitle>
              <div className="space-y-1 mt-2">
                <ProbaBar
                  value={result.probabilites.prob_hausse_vs_2024}
                  color={sens === 'hausse' ? GREEN : RED}
                  label="P(hausse vs 2024)"
                />
                <ProbaBar
                  value={result.probabilites.prob_hausse_20pct}
                  color={sens === 'hausse' ? GREEN : AMBER}
                  label="P(hausse > +20%)"
                />
                <ProbaBar
                  value={result.probabilites.prob_baisse_vs_2024}
                  color={sens === 'baisse' ? GREEN : RED}
                  label="P(baisse vs 2024)"
                />
                <ProbaBar
                  value={result.probabilites.prob_baisse_20pct}
                  color={RED}
                  label="P(baisse > -20%)"
                />
              </div>
            </CardShell>
          </div>

          {/* Bloc F — Insights */}
          <CardShell>
            <SectionTitle>Analyse automatique</SectionTitle>
            <div className="space-y-2.5">
              {(() => {
                const sigma = result.sigma
                const incertLabel = sigma > 0.3 ? 'élevée' : sigma > 0.15 ? 'modérée' : 'faible'
                const p50_2030 = result.scenarios_2030.central.valeur
                const var2024 = fmtPctSign(result.scenarios_2030.central.variation_vs_2024_pct)
                const probHausse20 = (result.probabilites.prob_hausse_20pct * 100).toFixed(1)
                const isFavorable = (sens === 'hausse' && (result.probabilites.prob_hausse_vs_2024 > 0.5)) ||
                                    (sens === 'baisse' && (result.probabilites.prob_baisse_vs_2024 > 0.5))
                const insights = [
                  `Avec une volatilité historique de σ=${fmtSigma(sigma)}, la variable "${result.label}" pour ${result.pays} présente une incertitude ${incertLabel} à horizon 2030.`,
                  `Scénario central (P50) : "${result.label}" atteindra ${fmtVal(p50_2030, result.unite)} en 2030, soit ${var2024} par rapport à 2024.`,
                  `Probabilité d'une hausse supérieure à 20% : ${probHausse20}% — ${isFavorable ? 'favorable pour la stratégie de souscription d\'Atlantic Re.' : 'contexte de vigilance pour la stratégie de souscription d\'Atlantic Re.'}`,
                ]
                return insights.map((text, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg"
                    style={{ background: i === 0 ? 'hsla(83,52%,36%,0.06)' : i === 1 ? 'hsla(213,60%,27%,0.05)' : 'hsla(152,56%,39%,0.05)', border: `1px solid ${i === 0 ? OLIVE : i === 1 ? NAVY : GREEN}20` }}>
                    <span className="text-base flex-shrink-0">{i === 0 ? '📊' : i === 1 ? '🎯' : '💡'}</span>
                    <p className="text-xs leading-relaxed" style={{ color: '#374151' }}>{text}</p>
                  </div>
                ))
              })()}
            </div>
          </CardShell>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB 3 — SCÉNARIOS GLOBAUX
// ══════════════════════════════════════════════════════════════════════════════
function TabScenarios() {
  const [data, setData] = useState<ScenGlobaux | null>(null)
  const [loading, setLoading] = useState(true)
  const [scenFilter, setScenFilter] = useState<'p10' | 'p50' | 'p90'>('p50')

  useEffect(() => {
    api.get('/monte-carlo/scenarios-globaux')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Top5 / Bottom5 — Primes NV
  const rankData = useMemo(() => {
    // On n'a pas les données par pays ici — on affiche un message
    return null
  }, [data])

  // Fusionner historique + prédictions pour le graphique
  const chartData = useMemo(() => {
    if (!data) return []
    const hist = data.historique_continent.map(r => ({ annee: r.annee, hist: r.valeur }))
    const pred = data.predictions_continent.map(r => ({
      annee: r.annee,
      p50: r.p50,
      p10: r.p10,
      p90: r.p90,
      bridge: r.annee === 2025 ? data.historique_continent[data.historique_continent.length - 1]?.valeur : undefined,
    }))
    return [...hist, ...pred]
  }, [data])

  const scens = [
    { key: 'pessimiste' as const, color: C_PESS, emoji: '🔴', label: 'Scénario Pessimiste (P10)' },
    { key: 'central'    as const, color: C_BASE, emoji: '🔵', label: 'Scénario Central (P50)' },
    { key: 'optimiste'  as const, color: C_OPT,  emoji: '🟢', label: 'Scénario Optimiste (P90)' },
  ]

  return (
    <div className="space-y-5">
      {/* 3 Cartes scénarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scens.map(({ key, color, emoji, label }) => {
          const s = data?.scenarios[key]
          return (
            <CardShell key={key} style={{ borderTop: `3px solid ${color}` }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{emoji}</span>
                <p className="text-sm font-bold" style={{ color }}>{label}</p>
              </div>
              {loading ? (
                <>
                  <Skeleton w="100%" h={18} />
                  <Skeleton w="80%" h={14} />
                </>
              ) : s ? (
                <>
                  <p className="text-2xl font-extrabold" style={{ color }}>{fmtMn(s.primes_nv_total)}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Primes NV totales Afrique 2030</p>
                  <div className="mt-3 space-y-1.5 pt-3" style={{ borderTop: '1px solid hsl(0,0%,93%)' }}>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: '#6b7280' }}>Pénétration moy.</span>
                      <span className="font-bold" style={{ color }}>{fmtPct(s.penetration_moy, 2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: '#6b7280' }}>Ratio S/P moy.</span>
                      <span className="font-bold" style={{ color }}>{fmtPct(s.ratio_sp_moy, 1)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] mt-3 leading-relaxed" style={{ color: '#9ca3af' }}>{s.description}</p>
                </>
              ) : null}
            </CardShell>
          )
        })}
      </div>

      {/* Graphique évolution continentale */}
      <CardShell>
        <SectionTitle sub="Somme des primes Non-Vie des 34 pays africains simulés">
          Évolution continentale des primes Non-Vie 2015–2030
        </SectionTitle>
        {loading ? <Skeleton w="100%" h={320} /> : (
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="gradCont" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={NAVY} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={NAVY} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <ReferenceArea x1={2024} x2={2024.5} fill="hsla(0,0%,0%,0.03)" />
              <ReferenceLine x={2024.5} stroke="hsl(0,0%,80%)" strokeDasharray="4 3" label={{ value: '→ Simulations', position: 'top', fontSize: 9, fill: '#9ca3af' }} />
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,94%)" />
              <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tickFormatter={v => fmtMn(v)} tick={{ fontSize: 10, fill: '#9ca3af' }} width={65} />
              <Tooltip formatter={(v: any) => [fmtMn(v), '']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area dataKey="p90" stroke="none" fill={NAVY} fillOpacity={0.08} legendType="none" connectNulls />
              <Area dataKey="p10" stroke="none" fill="white" fillOpacity={1} legendType="none" connectNulls />
              <Line dataKey="hist"   stroke={C_HIST} strokeWidth={2.5} dot={false} name="Historique" connectNulls />
              <Line dataKey="bridge" stroke={NAVY} strokeWidth={2.5} strokeDasharray="2 2" dot={false} legendType="none" connectNulls />
              <Line dataKey="p50"   stroke={NAVY} strokeWidth={2.5} strokeDasharray="6 3" dot={false} name="Central (P50)" connectNulls />
              <Line dataKey="p90"   stroke={C_OPT}  strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Optimiste (P90)" connectNulls />
              <Line dataKey="p10"   stroke={C_PESS} strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Pessimiste (P10)" connectNulls />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        <MethodNote text="L'éventail P10–P90 représente la fourchette de probabilité à 80% de l'évolution du marché africain Non-Vie. La bande s'élargit avec l'horizon — propriété fondamentale des simulations stochastiques." />
      </CardShell>

      {/* Insights scénarios */}
      <CardShell>
        <SectionTitle>Analyse stratégique</SectionTitle>
        {loading ? <Skeleton w="100%" h={100} /> : data ? (
          <div className="space-y-3">
            {[
              {
                icon: '🔵',
                color: C_BASE,
                text: `Scénario central : le marché africain Non-Vie devrait atteindre ${fmtMn(data.scenarios.central.primes_nv_total)} en 2030 — une évolution prudente fondée sur la continuation des tendances historiques. La pénétration moyenne se maintiendrait à ${fmtPct(data.scenarios.central.penetration_moy, 2)}.`,
              },
              {
                icon: '🔴',
                color: C_PESS,
                text: `Scénario pessimiste : dans un environnement défavorable (instabilité politique, chocs macro, ralentissement économique), le marché se contracterait à ${fmtMn(data.scenarios.pessimiste.primes_nv_total)}. Le ratio S/P moyen atteindrait ${fmtPct(data.scenarios.pessimiste.ratio_sp_moy, 1)}, signalant une détérioration de la rentabilité technique.`,
              },
              {
                icon: '🟢',
                color: C_OPT,
                text: `Scénario optimiste : en cas d'accélération (digitalisation, régulation favorable, forte croissance économique), le potentiel du marché atteindrait ${fmtMn(data.scenarios.optimiste.primes_nv_total)} — un marché très attractif pour Atlantic Re sur les segments Non-Vie.`,
              },
            ].map((ins, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3.5 rounded-lg"
                style={{ background: `${ins.color}07`, border: `1px solid ${ins.color}20` }}>
                <span className="text-lg flex-shrink-0">{ins.icon}</span>
                <p className="text-xs leading-relaxed" style={{ color: '#374151' }}>{ins.text}</p>
              </div>
            ))}
          </div>
        ) : null}
      </CardShell>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB 4 — PAR VARIABLE
// ══════════════════════════════════════════════════════════════════════════════
function TabVariable({ metadata }: { metadata: Metadata | null }) {
  const [variable, setVariable]   = useState<string>('Primes_NonVie')
  const [scenario, setScenario]   = useState<'pessimiste' | 'central' | 'optimiste'>('central')
  const [horizon, setHorizon]     = useState<number>(2030)
  const [data, setData]           = useState<{ classement: VariableClassRow[]; meta: any } | null>(null)
  const [loading, setLoading]     = useState(false)
  const [sortCol, setSortCol]     = useState<string>('p50')
  const [sortDir, setSortDir]     = useState<'desc' | 'asc'>('desc')

  const varOptions = useMemo(() => {
    if (!metadata) return []
    return buildVarOptions(metadata.variables, metadata.dimensions)
  }, [metadata])

  useEffect(() => {
    setLoading(true)
    api.get(`/monte-carlo/variable/${variable}?scenario=${scenario}&horizon=${horizon}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [variable, scenario, horizon])

  const sorted = useMemo(() => {
    if (!data?.classement) return []
    return [...data.classement].sort((a, b) => {
      const va = (a as any)[sortCol] ?? -Infinity
      const vb = (b as any)[sortCol] ?? -Infinity
      return sortDir === 'desc' ? vb - va : va - vb
    })
  }, [data, sortCol, sortDir])

  const varMeta = metadata?.variables[variable]
  const unite = varMeta?.unite ?? ''
  const sens  = varMeta?.sens  ?? 'hausse'

  const handleSort = (col: string) => {
    if (col === sortCol) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const SH = ({ col, label }: { col: string; label: string }) => (
    <th className="px-3 py-2 text-left text-[10px] font-semibold cursor-pointer select-none whitespace-nowrap"
      style={{ color: sortCol === col ? NAVY : '#9ca3af' }}
      onClick={() => handleSort(col)}>
      {label} {sortCol === col ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  )

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <CardShell>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: NAVY }}>Variable</label>
            <Select
              options={varOptions}
              value={varOptions.flatMap(g => g.options).find((o: any) => o.value === variable) ?? null}
              onChange={(o: any) => setVariable(o?.value ?? 'Primes_NonVie')}
              styles={rsStyles}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: NAVY }}>Scénario</label>
            <div className="flex gap-1.5">
              {(['pessimiste', 'central', 'optimiste'] as const).map(s => (
                <button key={s} onClick={() => setScenario(s)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                  style={scenario === s
                    ? { background: s === 'pessimiste' ? C_PESS : s === 'central' ? C_BASE : C_OPT, color: 'white' }
                    : { background: GRAY_100, color: '#6b7280' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: NAVY }}>Horizon</label>
            <div className="flex gap-1.5">
              {[2025, 2027, 2030].map(h => (
                <button key={h} onClick={() => setHorizon(h)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={horizon === h ? { background: NAVY, color: 'white' } : { background: GRAY_100, color: '#6b7280' }}>
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardShell>

      {/* Tableau classement */}
      <CardShell style={{ padding: 0 }}>
        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid hsl(0,0%,93%)' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: NAVY }}>
              Classement — {varMeta?.label ?? variable}
            </h2>
            <p className="text-xs" style={{ color: '#6b7280' }}>
              Scénario {scenario} · Horizon {horizon}
            </p>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full min-w-[700px]">
            <thead>
              <tr style={{ background: 'hsl(218,22%,97%)' }}>
                <th className="px-3 py-2 text-left text-[10px] font-semibold" style={{ color: '#9ca3af' }}>#</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold" style={{ color: '#9ca3af' }}>Pays</th>
                <SH col="valeur_2024"    label="Valeur 2024" />
                <SH col="p10"           label="P10 2030" />
                <SH col="p50"           label="P50 2030" />
                <SH col="p90"           label="P90 2030" />
                <SH col="variation_pct" label="Variation P50" />
                <SH col="incertitude_pct" label="Incertitude" />
                <SH col="sigma"         label="Volatilité σ" />
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid hsl(0,0%,95%)' }}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5"><Skeleton w="80%" h={14} /></td>
                  ))}
                </tr>
              )) : sorted.map((row, i) => (
                <tr key={row.pays} style={{ borderBottom: '1px solid hsl(0,0%,96%)' }}
                  className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 text-xs font-bold" style={{ color: '#9ca3af' }}>{i + 1}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: NAVY }}>{row.pays}</td>
                  <td className="px-3 py-2.5 text-xs">{fmtVal(row.valeur_2024, unite)}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: C_PESS }}>{fmtVal(row.p10, unite)}</td>
                  <td className="px-3 py-2.5 text-xs font-bold" style={{ color: C_BASE }}>{fmtVal(row.p50, unite)}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: C_OPT }}>{fmtVal(row.p90, unite)}</td>
                  <td className="px-3 py-2.5"><TrendBadge v={row.variation_pct} sens={sens} /></td>
                  <td className="px-3 py-2.5"><IncertBadge v={row.incertitude_pct} /></td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: '#6b7280' }}>{fmtSigma(row.sigma)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardShell>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  TAB 5 — COMPARAISON
// ══════════════════════════════════════════════════════════════════════════════
function TabComparaison({ metadata }: { metadata: Metadata | null }) {
  const [paysA, setPaysA]   = useState<string | null>(null)
  const [paysB, setPaysB]   = useState<string | null>(null)
  const [variable, setVar]  = useState<string>('Primes_NonVie')
  const [data, setData]     = useState<{ pays_a: MCPaysResult; pays_b: MCPaysResult; meta: any } | null>(null)
  const [loading, setLoad]  = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const paysOptions = useMemo(() =>
    (metadata?.pays ?? []).map(p => ({ value: p, label: p }))
  , [metadata])

  const varOptions = useMemo(() => {
    if (!metadata) return []
    return buildVarOptions(metadata.variables, metadata.dimensions)
  }, [metadata])

  const COLOR_A = NAVY
  const COLOR_B = OLIVE

  const canLoad = paysA && paysB && paysA !== paysB && variable

  useEffect(() => {
    if (!canLoad) return
    setLoad(true)
    setError(null)
    api.get(`/monte-carlo/comparaison?pays_a=${encodeURIComponent(paysA!)}&pays_b=${encodeURIComponent(paysB!)}&variable=${variable}`)
      .then(r => setData(r.data))
      .catch(e => setError(e?.response?.data?.detail ?? 'Erreur'))
      .finally(() => setLoad(false))
  }, [paysA, paysB, variable, canLoad])

  const unite = metadata?.variables[variable]?.unite ?? ''
  const sens  = metadata?.variables[variable]?.sens  ?? 'hausse'

  return (
    <div className="space-y-4">
      {/* Sélecteurs */}
      <CardShell>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: COLOR_A }}>Pays A</label>
            <Select
              options={paysOptions}
              value={paysOptions.find(o => o.value === paysA) ?? null}
              onChange={o => setPaysA(o?.value ?? null)}
              placeholder="Pays A…"
              styles={{ ...rsStyles, control: (b: any) => ({ ...rsStyles.control(b), borderColor: `${COLOR_A}60` }) }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: COLOR_B }}>Pays B</label>
            <Select
              options={paysOptions}
              value={paysOptions.find(o => o.value === paysB) ?? null}
              onChange={o => setPaysB(o?.value ?? null)}
              placeholder="Pays B…"
              styles={{ ...rsStyles, control: (b: any) => ({ ...rsStyles.control(b), borderColor: `${COLOR_B}60` }) }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: NAVY }}>Variable</label>
            <Select
              options={varOptions}
              value={varOptions.flatMap(g => g.options).find((o: any) => o.value === variable) ?? null}
              onChange={(o: any) => setVar(o?.value ?? 'Primes_NonVie')}
              styles={rsStyles}
            />
          </div>
        </div>
        {paysA && paysB && paysA === paysB && (
          <p className="text-xs mt-2" style={{ color: RED }}>Les deux pays doivent être différents.</p>
        )}
      </CardShell>

      {!canLoad && (
        <CardShell>
          <div className="text-center py-10">
            <Scale size={36} className="mx-auto mb-3" style={{ color: OLIVE, opacity: 0.5 }} />
            <p className="text-sm font-medium" style={{ color: '#6b7280' }}>Sélectionnez deux pays et une variable pour comparer</p>
          </div>
        </CardShell>
      )}

      {loading && canLoad && (
        <CardShell>
          <div className="text-center py-10">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 animate-spin"
              style={{ borderColor: OLIVE, borderTopColor: 'transparent' }} />
            <p className="text-sm font-medium" style={{ color: '#6b7280' }}>Chargement de la comparaison…</p>
          </div>
        </CardShell>
      )}

      {error && <CardShell><p className="text-sm text-center py-4" style={{ color: RED }}>{error}</p></CardShell>}

      {data && !loading && (
        <>
          {/* Fan Charts côte à côte */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {([
              { mc: data.pays_a, pays: paysA!, color: COLOR_A },
              { mc: data.pays_b, pays: paysB!, color: COLOR_B },
            ] as const).map(({ mc, pays, color }) => (
              !('error' in mc) ? (
                <CardShell key={pays}>
                  <p className="text-sm font-bold mb-2" style={{ color }}>
                    {pays}
                    <span className="text-xs font-normal ml-2" style={{ color: '#6b7280' }}>
                      σ={fmtSigma((mc as MCPaysResult).sigma)}
                    </span>
                  </p>
                  <FanChart
                    historique={(mc as MCPaysResult).historique}
                    percentiles={(mc as MCPaysResult).percentiles}
                    trajectoires={(mc as MCPaysResult).trajectoires_sample}
                    unite={unite}
                    label={metadata?.variables[variable]?.label ?? variable}
                    colorMain={color}
                    height={280}
                  />
                </CardShell>
              ) : (
                <CardShell key={pays}>
                  <p className="text-sm text-center py-6" style={{ color: '#9ca3af' }}>
                    Données insuffisantes pour {pays}
                  </p>
                </CardShell>
              )
            ))}
          </div>

          {/* Tableau comparatif */}
          <CardShell style={{ padding: 0 }}>
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid hsl(0,0%,93%)' }}>
              <h2 className="text-sm font-bold" style={{ color: NAVY }}>Tableau comparatif — {metadata?.variables[variable]?.label}</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr style={{ background: 'hsl(218,22%,97%)' }}>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold" style={{ color: '#9ca3af' }}>Métrique</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold" style={{ color: COLOR_A }}>{paysA} 2024</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold" style={{ color: `${C_PESS}` }}>P10</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold" style={{ color: C_BASE }}>P50</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold" style={{ color: C_OPT }}>P90</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold" style={{ color: COLOR_B }}>{paysB} 2024</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold" style={{ color: C_PESS }}>P10</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold" style={{ color: C_BASE }}>P50</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold" style={{ color: C_OPT }}>P90</th>
                  </tr>
                </thead>
                <tbody>
                  {['pessimiste', 'central', 'optimiste'].map((s, idx) => {
                    const pctKey = idx === 0 ? 'p10' : idx === 1 ? 'p50' : 'p90'
                    const mcA = data.pays_a as MCPaysResult
                    const mcB = data.pays_b as MCPaysResult
                    if ('error' in data.pays_a || 'error' in data.pays_b) return null
                    const va_2024 = mcA.historique?.[mcA.historique.length - 1]?.valeur
                    const vb_2024 = mcB.historique?.[mcB.historique.length - 1]?.valeur
                    return (
                      <tr key={s} style={{ borderBottom: '1px solid hsl(0,0%,96%)' }}>
                        <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: idx === 0 ? C_PESS : idx === 1 ? C_BASE : C_OPT }}>
                          Scénario {s}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-right">{fmtVal(va_2024, unite)}</td>
                        <td className="px-4 py-2.5 text-xs text-right" style={{ color: C_PESS }}>{fmtVal(mcA.percentiles.p10[5], unite)}</td>
                        <td className="px-4 py-2.5 text-xs font-bold text-right" style={{ color: C_BASE }}>{fmtVal(mcA.percentiles.p50[5], unite)}</td>
                        <td className="px-4 py-2.5 text-xs text-right" style={{ color: C_OPT }}>{fmtVal(mcA.percentiles.p90[5], unite)}</td>
                        <td className="px-4 py-2.5 text-xs text-right">{fmtVal(vb_2024, unite)}</td>
                        <td className="px-4 py-2.5 text-xs text-right" style={{ color: C_PESS }}>{fmtVal(mcB.percentiles.p10[5], unite)}</td>
                        <td className="px-4 py-2.5 text-xs font-bold text-right" style={{ color: C_BASE }}>{fmtVal(mcB.percentiles.p50[5], unite)}</td>
                        <td className="px-4 py-2.5 text-xs text-right" style={{ color: C_OPT }}>{fmtVal(mcB.percentiles.p90[5], unite)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardShell>

          {/* Probabilités comparées */}
          {!('error' in data.pays_a) && !('error' in data.pays_b) && (() => {
            const mcA = data.pays_a as MCPaysResult
            const mcB = data.pays_b as MCPaysResult
            const rows = [
              { label: 'P(hausse vs 2024)', va: mcA.probabilites.prob_hausse_vs_2024, vb: mcB.probabilites.prob_hausse_vs_2024, goodHigh: sens === 'hausse' },
              { label: 'P(hausse > +20%)',  va: mcA.probabilites.prob_hausse_20pct,   vb: mcB.probabilites.prob_hausse_20pct,   goodHigh: sens === 'hausse' },
              { label: 'P(baisse > -20%)',  va: mcA.probabilites.prob_baisse_20pct,   vb: mcB.probabilites.prob_baisse_20pct,   goodHigh: false },
            ]
            return (
              <CardShell>
                <SectionTitle>Probabilités comparées</SectionTitle>
                <div className="space-y-3">
                  {rows.map(row => {
                    const aBetter = row.goodHigh ? row.va > row.vb : row.va < row.vb
                    return (
                      <div key={row.label}>
                        <p className="text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>{row.label}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-2.5 rounded-lg" style={{ background: aBetter ? `${COLOR_A}10` : GRAY_100, border: `1px solid ${aBetter ? COLOR_A : 'transparent'}30` }}>
                            <p className="text-xs font-medium" style={{ color: COLOR_A }}>{paysA}</p>
                            <p className="text-lg font-bold" style={{ color: aBetter ? COLOR_A : '#374151' }}>
                              {(row.va * 100).toFixed(1)}%
                              {aBetter && <span className="text-xs ml-1">✓</span>}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-lg" style={{ background: !aBetter ? `${COLOR_B}10` : GRAY_100, border: `1px solid ${!aBetter ? COLOR_B : 'transparent'}30` }}>
                            <p className="text-xs font-medium" style={{ color: COLOR_B }}>{paysB}</p>
                            <p className="text-lg font-bold" style={{ color: !aBetter ? COLOR_B : '#374151' }}>
                              {(row.vb * 100).toFixed(1)}%
                              {!aBetter && <span className="text-xs ml-1">✓</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Insight comparaison */}
                <div className="mt-4 space-y-2">
                  {(() => {
                    const mcA = data.pays_a as MCPaysResult
                    const mcB = data.pays_b as MCPaysResult
                    const va50 = mcA.scenarios_2030.central.valeur
                    const vb50 = mcB.scenarios_2030.central.valeur
                    const aWins = sens === 'hausse' ? va50 > vb50 : va50 < vb50
                    const ecart = va50 && vb50 ? Math.abs((va50 - vb50) / Math.min(Math.abs(va50), Math.abs(vb50)) * 100).toFixed(1) : '—'
                    const sigmaA = mcA.sigma
                    const sigmaB = mcB.sigma
                    const riskPays = sigmaA > sigmaB ? paysA : paysB
                    const riskVs   = sigmaA > sigmaB ? paysB : paysA
                    return [
                      `Selon le scénario central (P50), ${aWins ? paysA : paysB} devrait surperformer ${aWins ? paysB : paysA} en 2030 sur "${metadata?.variables[variable]?.label}" : ${fmtVal(va50, unite)} vs ${fmtVal(vb50, unite)} (écart de ${ecart}%).`,
                      `En termes de risque, ${riskPays} présente une volatilité plus élevée (σ=${fmtSigma(Math.max(sigmaA, sigmaB))} vs ${fmtSigma(Math.min(sigmaA, sigmaB))}) — son potentiel de hausse est supérieur, mais son incertitude aussi.`,
                    ].map((text, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg"
                        style={{ background: 'hsla(83,52%,36%,0.05)', border: '1px solid hsla(83,52%,36%,0.12)' }}>
                        <span className="flex-shrink-0">{i === 0 ? '🎯' : '⚡'}</span>
                        <p className="text-xs leading-relaxed" style={{ color: '#374151' }}>{text}</p>
                      </div>
                    ))
                  })()}
                </div>
              </CardShell>
            )
          })()}
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════════════════════
export default function MonteCarloAxe2() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [overview, setOverview]   = useState<OverviewRow[]>([])
  const [overviewLoading, setOL]  = useState(true)
  const [metadata, setMetadata]   = useState<Metadata | null>(null)
  const [metaLoading, setML]      = useState(true)

  // Charger l'overview et les métadonnées au montage
  useEffect(() => {
    api.get('/monte-carlo/overview')
      .then(r => setOverview(r.data))
      .catch(console.error)
      .finally(() => setOL(false))

    api.get('/monte-carlo/metadata')
      .then(r => setMetadata(r.data))
      .catch(console.error)
      .finally(() => setML(false))
  }, [])

  return (
    <div className="min-h-full" style={{ background: 'hsl(210,20%,98%)' }}>
      {/* Header de la page */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${OLIVE} 100%)` }}>
            <Shuffle size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: NAVY }}>
              Simulations Monte Carlo 2030
            </h1>
            <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
              10 000 trajectoires GBM · 34 pays africains · 3 scénarios stratégiques
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ background: 'hsla(83,52%,36%,0.10)', color: OLIVE, border: `1px solid hsla(83,52%,36%,0.25)` }}>
              Palier 2 · Stochastique
            </div>
            <div className="hidden md:block px-2.5 py-1 rounded-lg text-xs"
              style={{ background: 'hsla(213,60%,27%,0.07)', color: NAVY, border: `1px solid hsla(213,60%,27%,0.18)` }}>
              Complément au Palier 1 · Régression
            </div>
          </div>
        </div>

        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
        <TabProgress activeTab={activeTab} />
      </div>

      {/* Contenu des tabs */}
      <div className="px-6 pb-8">
        {activeTab === 'overview' && (
          <TabOverview overview={overview} loading={overviewLoading} />
        )}
        {activeTab === 'simulation' && (
          <TabSimulation metadata={metadata} metaLoading={metaLoading} />
        )}
        {activeTab === 'scenarios' && (
          <TabScenarios />
        )}
        {activeTab === 'variable' && (
          <TabVariable metadata={metadata} />
        )}
        {activeTab === 'comparaison' && (
          <TabComparaison metadata={metadata} />
        )}
      </div>
    </div>
  )
}
