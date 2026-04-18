// ComparaisonPays.tsx — Axe 2 · Comparaison côte-à-côte de deux pays africains
// Respecte la forme d'AnalysePays (header permanent + 7 tabs) et l'esprit de Comparison (Axe 1)
import { useMemo, useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Select from 'react-select'
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import { useCartographieData } from '../hooks/useCartographieData'
import CartographieLayout from '../components/cartographie/CartographieLayout'
import { REGION_COLORS } from '../utils/cartographieConstants'

// ── Types ──────────────────────────────────────────────────────────────────────
type YearSel = number | 'avg'

type TabId =
  | 'kpis'
  | 'radar'
  | 'non-vie'
  | 'vie'
  | 'macro'
  | 'gouvernance'
  | 'positionnement'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'kpis',           label: 'KPIs & Évolution', icon: '📊' },
  { id: 'radar',          label: 'Radar',             icon: '🎯' },
  { id: 'non-vie',        label: 'Non-Vie',           icon: '🔵' },
  { id: 'vie',            label: 'Vie',               icon: '🟢' },
  { id: 'macro',          label: 'Macroéconomie',     icon: '💹' },
  { id: 'gouvernance',    label: 'Gouvernance',        icon: '🏛' },
  { id: 'positionnement', label: 'Positionnement',    icon: '🏆' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function avg(a: number[]) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0 }
function median(a: number[]) {
  if (!a.length) return 0
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function getRowVal<T extends { annee: number }>(rows: T[], field: keyof T, year: YearSel): number | null {
  if (year === 'avg') {
    const vals = rows.map(r => r[field] as unknown as number | null).filter((v): v is number => v != null)
    return vals.length ? avg(vals) : null
  }
  const row = rows.find(r => (r as any).annee === year)
  return row ? (row[field] as unknown as number | null) : null
}

const fmtMn    = (v: number | null) => v == null ? '—' : v >= 1000 ? `${(v / 1000).toFixed(1)} Mrd$` : `${v.toFixed(0)} Mn$`
const fmtBn    = (v: number | null) => v == null ? '—' : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} Bn$` : fmtMn(v)
const fmtPct   = (v: number | null) => v == null ? '—' : `${v.toFixed(1)}%`
const fmtPctSgn= (v: number | null) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
const fmtUsd   = (v: number | null) => v == null ? '—' : `$${Math.round(v).toLocaleString()}/hab`
const fmtWgi   = (v: number | null) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}`

// ── Colors for A vs B ─────────────────────────────────────────────────────────
const COLOR_A = '#1B3F6B'         // navy
const COLOR_B = 'hsl(83,52%,36%)' // olive

// ── Delta badge ──────────────────────────────────────────────────────────────
function DeltaBadge({ a, b, lowerIsBetter = false }: { a: number | null; b: number | null; lowerIsBetter?: boolean }) {
  if (a == null || b == null || b === 0) return <span className="text-gray-400 text-[10px]">—</span>
  const diff = ((a - b) / Math.abs(b)) * 100
  if (Math.abs(diff) < 0.1) return <span className="text-gray-400 text-[10px] font-bold">=</span>
  const positive = lowerIsBetter ? diff < 0 : diff > 0
  return (
    <span className="text-[10px] font-bold" style={{ color: positive ? COLOR_B : '#B91C1C' }}>
      {diff > 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}%
    </span>
  )
}

// ── KPI comparison row ────────────────────────────────────────────────────────
function KpiRow({ label, valA, valB, fmt, lowerIsBetter = false }: {
  label: string; valA: number | null; valB: number | null
  fmt: (v: number | null) => string; lowerIsBetter?: boolean
}) {
  const aWins = valA != null && valB != null && (lowerIsBetter ? valA < valB : valA > valB)
  const bWins = valA != null && valB != null && (lowerIsBetter ? valB < valA : valB > valA)
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center py-2 px-4 border-b last:border-0 hover:bg-gray-50 transition-colors"
      style={{ borderColor: 'hsl(0,0%,94%)' }}>
      {/* Valeur A */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold" style={{ color: COLOR_A }}>{fmt(valA)}</span>
        {aWins && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1 rounded">✓</span>}
      </div>
      {/* Label + delta au centre */}
      <div className="flex flex-col items-center px-3 w-36">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
        <DeltaBadge a={valA} b={valB} lowerIsBetter={lowerIsBetter} />
      </div>
      {/* Valeur B */}
      <div className="flex items-center justify-end gap-2">
        {bWins && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1 rounded">✓</span>}
        <span className="text-sm font-bold" style={{ color: COLOR_B }}>{fmt(valB)}</span>
      </div>
    </div>
  )
}

// ── Section title ──────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 pb-2"
      style={{ borderBottom: '2px solid hsla(83,52%,42%,0.20)' }}>
      {children}
    </h2>
  )
}

// ── Tab bar ────────────────────────────────────────────────────────────────────
function TabNav({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (t: TabId) => void }) {
  return (
    <div className="flex overflow-x-auto scrollbar-hide">
      {TABS.map((tab, i) => {
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all relative flex-shrink-0"
            style={active
              ? { color: 'hsl(83,52%,30%)', background: 'hsla(83,52%,42%,0.08)', borderBottom: '2px solid hsl(83,52%,36%)' }
              : { color: '#6b7280', borderBottom: '2px solid transparent' }}
            id={`cmp-tab-${tab.id}`}
          >
            <span>{tab.icon}</span><span>{tab.label}</span>
            {i < TABS.length - 1 && !active && (
              <span className="absolute right-0 top-1/4 bottom-1/4 w-px" style={{ background: 'hsl(0,0%,90%)' }} />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Progress bar ───────────────────────────────────────────────────────────────
function TabProgress({ activeTab }: { activeTab: TabId }) {
  const idx = TABS.findIndex(t => t.id === activeTab)
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {TABS.map((tab, i) => (
        <div key={tab.id} className="h-1 rounded-full transition-all" style={{
          flex: 1,
          background: i === idx ? 'hsl(83,52%,36%)' : i < idx ? 'hsla(83,52%,36%,0.35)' : 'hsl(0,0%,90%)',
        }} />
      ))}
    </div>
  )
}

// ── Prev/Next nav ──────────────────────────────────────────────────────────────
function TabNavButtons({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (t: TabId) => void }) {
  const idx = TABS.findIndex(t => t.id === activeTab)
  const prev = idx > 0 ? TABS[idx - 1] : null
  const next = idx < TABS.length - 1 ? TABS[idx + 1] : null
  return (
    <div className="flex items-center justify-between mt-8 pt-4" style={{ borderTop: '1px solid hsl(0,0%,93%)' }}>
      <button
        onClick={() => prev && onTabChange(prev.id)}
        disabled={!prev}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
        style={prev
          ? { background: 'hsla(83,52%,36%,0.08)', color: 'hsl(83,52%,30%)', border: '1px solid hsla(83,52%,36%,0.25)' }
          : { background: 'hsl(0,0%,95%)', color: '#9ca3af', border: '1px solid hsl(0,0%,90%)', cursor: 'not-allowed' }}
      >← {prev ? prev.label : '—'}</button>
      <span className="text-[11px] text-gray-400 font-medium">{idx + 1} / {TABS.length}</span>
      <button
        onClick={() => next && onTabChange(next.id)}
        disabled={!next}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
        style={next
          ? { background: 'hsla(83,52%,36%,0.08)', color: 'hsl(83,52%,30%)', border: '1px solid hsla(83,52%,36%,0.25)' }
          : { background: 'hsl(0,0%,95%)', color: '#9ca3af', border: '1px solid hsl(0,0%,90%)', cursor: 'not-allowed' }}
      >{next ? next.label : '—'} →</button>
    </div>
  )
}

// ── NAV items (disabled) ───────────────────────────────────────────────────────
const NAV_ITEMS: { id: string; label: string }[] = []

// ── Country pill ──────────────────────────────────────────────────────────────
function CountryPill({ label, pays, region, color }: { label: 'A' | 'B'; pays: string | null; region: string; color: string }) {
  if (!pays) return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed text-xs text-gray-400"
      style={{ borderColor: color }}>
      <span className="font-bold text-[10px] uppercase" style={{ color }}>{label}</span>
      <span>Sélectionner…</span>
    </div>
  )
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
      style={{ background: `${color}12`, border: `1.5px solid ${color}40`, color }}>
      <span className="font-bold text-[10px] uppercase opacity-60">{label}</span>
      <span className="font-bold text-gray-800 text-sm">{pays}</span>
      <span className="text-[10px] opacity-70">{region}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main component ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export default function ComparaisonPays() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { data: nvData,   years } = useCartographieData('non-vie')
  const { data: vieData }         = useCartographieData('vie')
  const { data: macroData }       = useCartographieData('macroeconomie')
  const { data: gouvData }        = useCartographieData('gouvernance')

  const [paysA, setPaysA] = useState<string | null>(null)
  const [paysB, setPaysB] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<YearSel>('avg')
  const [activeTab, setActiveTab] = useState<TabId>('kpis')

  // Pre-fill from query param ?a=<pays>
  useEffect(() => {
    const a = searchParams.get('a')
    if (a) setPaysA(decodeURIComponent(a))
  }, [searchParams])

  // Scroll to top on tab change
  useEffect(() => {
    const c = document.getElementById('scar-main-scroll')
    if (c) c.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [activeTab])

  // ── All countries ──────────────────────────────────────────────────────────
  const allCountries = useMemo(() => {
    const s = new Set<string>()
    nvData.forEach(r => s.add(r.pays))
    macroData.forEach(r => s.add(r.pays))
    return [...s].sort()
  }, [nvData, macroData])

  const countryOptions = useMemo(() =>
    allCountries.map(c => ({ value: c, label: c })), [allCountries])

  // ── Rows for A and B ──────────────────────────────────────────────────────
  const nvA    = useMemo(() => nvData.filter(r => r.pays === paysA).sort((a, b) => a.annee - b.annee),    [nvData, paysA])
  const nvB    = useMemo(() => nvData.filter(r => r.pays === paysB).sort((a, b) => a.annee - b.annee),    [nvData, paysB])
  const vieA   = useMemo(() => vieData.filter(r => r.pays === paysA).sort((a, b) => a.annee - b.annee),   [vieData, paysA])
  const vieB   = useMemo(() => vieData.filter(r => r.pays === paysB).sort((a, b) => a.annee - b.annee),   [vieData, paysB])
  const macA   = useMemo(() => macroData.filter(r => r.pays === paysA).sort((a, b) => a.annee - b.annee), [macroData, paysA])
  const macB   = useMemo(() => macroData.filter(r => r.pays === paysB).sort((a, b) => a.annee - b.annee), [macroData, paysB])
  const gouvA  = useMemo(() => gouvData.filter(r => r.pays === paysA).sort((a, b) => a.annee - b.annee),  [gouvData, paysA])
  const gouvB  = useMemo(() => gouvData.filter(r => r.pays === paysB).sort((a, b) => a.annee - b.annee),  [gouvData, paysB])

  // ── Regions & colors ──────────────────────────────────────────────────────
  const regionA = nvA[0]?.region ?? macA[0]?.region ?? 'Autre'
  const regionB = nvB[0]?.region ?? macB[0]?.region ?? 'Autre'

  // ── Val helpers ───────────────────────────────────────────────────────────
  const vA = useCallback((rows: any[], f: string) => getRowVal(rows, f as any, selectedYear), [selectedYear])
  const vB = useCallback((rows: any[], f: string) => getRowVal(rows, f as any, selectedYear), [selectedYear])

  const handleTabChange = useCallback((t: TabId) => setActiveTab(t), [])

  const tooltipStyle = { borderRadius: 8, border: '1px solid #D1D9E0', fontSize: 12 }

  // ── Evolution data (full series) ──────────────────────────────────────────
  const evoData = useMemo(() => {
    const map: Record<number, any> = {}
    const allYears = [...new Set([...nvA, ...nvB, ...macA, ...macB].map(r => r.annee))].sort()
    allYears.forEach(y => { map[y] = { annee: y } })
    nvA.forEach(r  => { if (map[r.annee]) map[r.annee].nvA  = r.primes_emises_mn_usd })
    nvB.forEach(r  => { if (map[r.annee]) map[r.annee].nvB  = r.primes_emises_mn_usd })
    vieA.forEach(r => { if (map[r.annee]) map[r.annee].vieA = r.primes_emises_mn_usd })
    vieB.forEach(r => { if (map[r.annee]) map[r.annee].vieB = r.primes_emises_mn_usd })
    macA.forEach(r => { if (map[r.annee]) { map[r.annee].gdpA = r.gdp_growth_pct; map[r.annee].infA = r.inflation_rate_pct } })
    macB.forEach(r => { if (map[r.annee]) { map[r.annee].gdpB = r.gdp_growth_pct; map[r.annee].infB = r.inflation_rate_pct } })
    return Object.values(map)
  }, [nvA, nvB, vieA, vieB, macA, macB])

  // ── Radar 6D (3 series: A, B, médiane) ────────────────────────────────────
  const radarData = useMemo(() => {
    const src    = selectedYear === 'avg' ? nvData      : nvData.filter(r => r.annee === selectedYear)
    const macSrc = selectedYear === 'avg' ? macroData   : macroData.filter(r => r.annee === selectedYear)
    const govSrc = selectedYear === 'avg' ? gouvData    : gouvData.filter(r => r.annee === selectedYear)
    const vieSrc = selectedYear === 'avg' ? vieData     : vieData.filter(r => r.annee === selectedYear)

    const maxNV  = Math.max(0, ...src.map(r => r.primes_emises_mn_usd ?? 0))
    const maxPen = Math.max(0, ...src.map(r => r.taux_penetration_pct ?? 0))
    const maxVie = Math.max(0, ...vieSrc.map(r => r.primes_emises_mn_usd ?? 0))
    const maxGdp = Math.max(0, ...macSrc.map(r => r.gdp_per_capita ?? 0))

    const norm   = (v: number | null, max: number) => v != null && max > 0 ? Math.min(100, (v / max) * 100) : 0
    const normWgi= (v: number | null) => v != null ? Math.max(0, Math.min(100, ((v + 2.5) / 5) * 100)) : 0

    const medNV  = median(src.map(r => r.primes_emises_mn_usd).filter((v): v is number => v != null))
    const medPen = median(src.map(r => r.taux_penetration_pct).filter((v): v is number => v != null))
    const medVie = median(vieSrc.map(r => r.primes_emises_mn_usd).filter((v): v is number => v != null))
    const medGdp = median(macSrc.map(r => r.gdp_per_capita).filter((v): v is number => v != null))
    const medPol = median(govSrc.map(r => r.political_stability).filter((v): v is number => v != null))
    const medKao = median(govSrc.map(r => r.kaopen).filter((v): v is number => v != null))

    const getVals = (rows: any[], rowsVie: any[], rowsMac: any[], rowsGouv: any[]) => ({
      nvPrimes: norm(getRowVal(rows, 'primes_emises_mn_usd' as any, selectedYear), maxNV),
      nvPenet:  norm(getRowVal(rows, 'taux_penetration_pct' as any, selectedYear), maxPen),
      viePrimes:norm(getRowVal(rowsVie, 'primes_emises_mn_usd' as any, selectedYear), maxVie),
      gdpCap:   norm(getRowVal(rowsMac, 'gdp_per_capita' as any, selectedYear), maxGdp),
      polStab:  normWgi(getRowVal(rowsGouv, 'political_stability' as any, selectedYear)),
      kaopen:   normWgi(getRowVal(rowsGouv, 'kaopen' as any, selectedYear)),
    })

    const valsA = getVals(nvA, vieA, macA, gouvA)
    const valsB = getVals(nvB, vieB, macB, gouvB)

    return [
      { dim: 'Primes NV',       A: valsA.nvPrimes,  B: valsB.nvPrimes,  med: norm(medNV, maxNV),   fullMark: 100 },
      { dim: 'Pénétration NV',  A: valsA.nvPenet,   B: valsB.nvPenet,   med: norm(medPen, maxPen), fullMark: 100 },
      { dim: 'Primes Vie',      A: valsA.viePrimes, B: valsB.viePrimes, med: norm(medVie, maxVie), fullMark: 100 },
      { dim: 'PIB/hab',         A: valsA.gdpCap,    B: valsB.gdpCap,    med: norm(medGdp, maxGdp), fullMark: 100 },
      { dim: 'Stabilité pol.',  A: valsA.polStab,   B: valsB.polStab,   med: normWgi(medPol),      fullMark: 100 },
      { dim: 'Ouverture fin.',  A: valsA.kaopen,    B: valsB.kaopen,    med: normWgi(medKao),      fullMark: 100 },
    ]
  }, [nvData, vieData, macroData, gouvData, nvA, nvB, vieA, vieB, macA, macB, gouvA, gouvB, selectedYear])

  // ── Historical table helper ────────────────────────────────────────────────
  function HistoTable({ rowsA, rowsB, fields }: {
    rowsA: any[]; rowsB: any[]
    fields: { key: string; label: string; fmt: (v: number | null) => string }[]
  }) {
    const allYears = [...new Set([...rowsA, ...rowsB].map(r => r.annee))].sort()
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ background: 'hsl(0,0%,97%)' }}>
              <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider border-b" style={{ borderColor: 'hsl(0,0%,90%)' }}>Année</th>
              {fields.map(f => (
                <th key={f.key} colSpan={2} className="px-3 py-2 text-center font-bold text-gray-500 uppercase tracking-wider border-b" style={{ borderColor: 'hsl(0,0%,90%)' }}>{f.label}</th>
              ))}
            </tr>
            <tr style={{ background: 'hsl(0,0%,98%)' }}>
              <th className="px-3 py-1 border-b" style={{ borderColor: 'hsl(0,0%,90%)' }}></th>
              {fields.map(f => (
                <>
                  <th key={`${f.key}-a`} className="px-3 py-1 text-center font-bold border-b" style={{ color: COLOR_A, borderColor: 'hsl(0,0%,90%)' }}>A</th>
                  <th key={`${f.key}-b`} className="px-3 py-1 text-center font-bold border-b" style={{ color: COLOR_B, borderColor: 'hsl(0,0%,90%)' }}>B</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {allYears.map(y => {
              const rA = rowsA.find(r => r.annee === y)
              const rB = rowsB.find(r => r.annee === y)
              return (
                <tr key={y} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 font-bold text-gray-700 border-b text-center" style={{ borderColor: 'hsl(0,0%,94%)' }}>{y}</td>
                  {fields.map(f => (
                    <>
                      <td key={`${f.key}-a`} className="px-3 py-2 text-center font-semibold border-b" style={{ color: COLOR_A, borderColor: 'hsl(0,0%,94%)' }}>
                        {f.fmt(rA ? rA[f.key] : null)}
                      </td>
                      <td key={`${f.key}-b`} className="px-3 py-2 text-center font-semibold border-b" style={{ color: COLOR_B, borderColor: 'hsl(0,0%,94%)' }}>
                        {f.fmt(rB ? rB[f.key] : null)}
                      </td>
                    </>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Guard ─────────────────────────────────────────────────────────────────
  const ready = paysA && paysB && paysA !== paysB

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <CartographieLayout title="" subtitle="" dataSource="" navItems={NAV_ITEMS}>

      {/* ── HEADER PERMANENT ──────────────────────────────────────────────── */}
      <div
        className="bg-white rounded-xl overflow-hidden"
        style={{ border: '1px solid hsl(0,0%,88%)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
      >
        {/* Ligne 1 — Titre + sélecteurs */}
        <div className="px-5 py-4 flex flex-col gap-4" style={{ borderBottom: '1px solid hsl(0,0%,93%)' }}>
          {/* Header row */}
          <div className="flex items-center gap-3 flex-wrap justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: 'hsla(83,52%,36%,0.10)', border: '1.5px solid hsla(83,52%,36%,0.25)' }}>⚖️</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-none">Comparaison de pays</h1>
                <p className="text-[11px] text-gray-400 mt-0.5">Analyse comparative · Afrique 2030 · 34 pays</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/modelisation/analyse')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'hsl(0,0%,97%)', color: '#374151', border: '1px solid hsl(0,0%,86%)' }}
            ><span style={{ fontSize: 14 }}>←</span><span className="hidden sm:inline">Analyse par pays</span></button>
          </div>

          {/* Sélecteurs A vs B */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Pays A */}
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: COLOR_A }}>
                Pays A
              </label>
              <Select
                options={countryOptions.filter(o => o.value !== paysB)}
                value={paysA ? { value: paysA, label: paysA } : null}
                onChange={v => { setPaysA(v?.value ?? null); setActiveTab('kpis') }}
                placeholder="Sélectionner pays A…"
                isClearable menuPortalTarget={document.body} menuPosition="fixed"
                styles={{
                  control: (b: any) => ({ ...b, borderRadius: 8, minHeight: 36, fontSize: 12, borderColor: `${COLOR_A}50`, boxShadow: 'none', '&:hover': { borderColor: COLOR_A } }),
                  option: (b: any, s: any) => ({ ...b, fontSize: 12, background: s.isFocused ? `${COLOR_A}10` : 'white', color: '#374151' }),
                }}
              />
            </div>

            {/* VS badge */}
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1B3F6B, hsl(83,52%,36%))' }}>vs</div>
            </div>

            {/* Pays B */}
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: COLOR_B }}>
                Pays B
              </label>
              <Select
                options={countryOptions.filter(o => o.value !== paysA)}
                value={paysB ? { value: paysB, label: paysB } : null}
                onChange={v => { setPaysB(v?.value ?? null); setActiveTab('kpis') }}
                placeholder="Sélectionner pays B…"
                isClearable menuPortalTarget={document.body} menuPosition="fixed"
                styles={{
                  control: (b: any) => ({ ...b, borderRadius: 8, minHeight: 36, fontSize: 12, borderColor: `${COLOR_B}80`, boxShadow: 'none', '&:hover': { borderColor: COLOR_B } }),
                  option: (b: any, s: any) => ({ ...b, fontSize: 12, background: s.isFocused ? `${COLOR_B}10` : 'white', color: '#374151' }),
                }}
              />
            </div>
          </div>
        </div>

        {/* Ligne 2 — Période */}
        <div className="px-5 py-2.5 flex items-center gap-3 flex-wrap"
          style={{ borderBottom: '1px solid hsl(0,0%,93%)', background: 'hsl(0,0%,98.5%)' }}>
          <span className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0" style={{ color: 'hsl(0,0%,50%)' }}>Période</span>
          <div className="flex items-center gap-1 flex-wrap">
            {years.map(y => (
              <button key={y} onClick={() => setSelectedYear(y)}
                className="px-2 py-0.5 rounded text-[11px] font-semibold transition-colors"
                style={selectedYear === y
                  ? { background: 'hsl(83,52%,36%)', color: 'white' }
                  : { background: 'white', color: '#6b7280', border: '1px solid hsl(0,0%,88%)' }}
              >{y}</button>
            ))}
            <button onClick={() => setSelectedYear('avg')}
              className="px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors"
              style={selectedYear === 'avg'
                ? { background: 'hsl(83,52%,36%)', color: 'white' }
                : { background: 'white', color: '#6b7280', border: '1px solid hsl(0,0%,88%)' }}
            >Moy. 2015–2024</button>
          </div>

          {/* Pills pays sélectionnés */}
          {(paysA || paysB) && (
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <CountryPill label="A" pays={paysA} region={regionA} color={COLOR_A} />
              <CountryPill label="B" pays={paysB} region={regionB} color={COLOR_B} />
            </div>
          )}
        </div>

        {/* Ligne 3 — Tabs (désactivés si pas de sélection) */}
        {ready && <TabNav activeTab={activeTab} onTabChange={handleTabChange} />}
      </div>

      {/* Barre de progression */}
      {ready && <TabProgress activeTab={activeTab} />}

      {/* ── PLACEHOLDER — Sélection requise ──────────────────────────────── */}
      {!ready && (
        <div className="bg-white rounded-xl p-12 text-center" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div className="text-4xl mb-4">⚖️</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Sélectionnez deux pays à comparer</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Choisissez un pays A et un pays B dans les menus ci-dessus pour démarrer l'analyse comparative sur les 7 dimensions.
          </p>
          {paysA && !paysB && (
            <p className="text-xs font-semibold mt-4" style={{ color: COLOR_A }}>✓ Pays A sélectionné — choisissez maintenant le pays B</p>
          )}
        </div>
      )}

      {/* ── TAB CONTENT ───────────────────────────────────────────────────── */}
      {ready && (
        <div className="space-y-5">

          {/* ═══ TAB: KPIs & Évolution ═══════════════════════════════════════ */}
          {activeTab === 'kpis' && (
            <div className="space-y-5 animate-fade-in">
              <SectionTitle>📊 KPIs clés — {paysA} vs {paysB}</SectionTitle>

              {/* Légende couleurs */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ background: COLOR_A }} /><span className="text-xs font-bold text-gray-600">Pays A — {paysA}</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ background: COLOR_B }} /><span className="text-xs font-bold text-gray-600">Pays B — {paysB}</span></div>
              </div>

              {/* KPI rows */}
              <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                {/* Header pays */}
                <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-3"
                  style={{ background: `linear-gradient(to right, ${COLOR_A}10, white 50%, ${COLOR_B}10)`, borderBottom: '1px solid hsl(0,0%,92%)' }}>
                  <span className="text-sm font-bold" style={{ color: COLOR_A }}>{paysA}</span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-36 text-center">Indicateur</span>
                  <span className="text-sm font-bold text-right" style={{ color: COLOR_B }}>{paysB}</span>
                </div>
                <KpiRow label="Primes Non-Vie"    valA={vA(nvA, 'primes_emises_mn_usd')}    valB={vB(nvB, 'primes_emises_mn_usd')}    fmt={fmtMn} />
                <KpiRow label="Pénétration NV"    valA={vA(nvA, 'taux_penetration_pct')}     valB={vB(nvB, 'taux_penetration_pct')}     fmt={fmtPct} />
                <KpiRow label="Primes Vie"        valA={vA(vieA, 'primes_emises_mn_usd')}   valB={vB(vieB, 'primes_emises_mn_usd')}   fmt={fmtMn} />
                <KpiRow label="Pénétration Vie"   valA={vA(vieA, 'taux_penetration_pct')}    valB={vB(vieB, 'taux_penetration_pct')}    fmt={fmtPct} />
                <KpiRow label="PIB"               valA={vA(macA, 'gdp_mn')}                 valB={vB(macB, 'gdp_mn')}                 fmt={fmtBn} />
                <KpiRow label="PIB / habitant"    valA={vA(macA, 'gdp_per_capita')}          valB={vB(macB, 'gdp_per_capita')}          fmt={fmtUsd} />
                <KpiRow label="Croiss. PIB"       valA={vA(macA, 'gdp_growth_pct')}          valB={vB(macB, 'gdp_growth_pct')}          fmt={fmtPctSgn} />
                <KpiRow label="Stabilité pol."    valA={vA(gouvA, 'political_stability')}    valB={vB(gouvB, 'political_stability')}    fmt={fmtWgi} />
                <KpiRow label="IDE (% PIB)"       valA={vA(gouvA, 'fdi_inflows_pct_gdp')}   valB={vB(gouvB, 'fdi_inflows_pct_gdp')}   fmt={fmtPct} />
              </div>

              {/* Évolution primes */}
              <SectionTitle>📈 Évolution des primes 2015–2024</SectionTitle>
              <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <p className="text-xs text-gray-500 mb-4">Non-Vie et Vie · Axe gauche : Mn USD · Série complète 2015–2024</p>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={evoData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tickFormatter={v => fmtMn(v)} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="nvA"  name={`NV A (${paysA})`}  fill={COLOR_A}  fillOpacity={0.8} radius={[3,3,0,0]} />
                    <Bar dataKey="nvB"  name={`NV B (${paysB})`}  fill={COLOR_B}  fillOpacity={0.8} radius={[3,3,0,0]} />
                    <Bar dataKey="vieA" name={`Vie A (${paysA})`} fill={COLOR_A}  fillOpacity={0.4} radius={[3,3,0,0]} />
                    <Bar dataKey="vieB" name={`Vie B (${paysB})`} fill={COLOR_B}  fillOpacity={0.4} radius={[3,3,0,0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Évolution macro */}
              <SectionTitle>💹 Évolution macro — PIB & Inflation</SectionTitle>
              <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={evoData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tickFormatter={v => `${v?.toFixed(1)}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="gdpA" name={`Croiss. PIB A`} stroke={COLOR_A} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="gdpB" name={`Croiss. PIB B`} stroke={COLOR_B} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="infA" name={`Inflation A`}   stroke={COLOR_A} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                    <Line type="monotone" dataKey="infB" name={`Inflation B`}   stroke={COLOR_B} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <TabNavButtons activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
          )}

          {/* ═══ TAB: RADAR ══════════════════════════════════════════════════ */}
          {activeTab === 'radar' && (
            <div className="space-y-5 animate-fade-in">
              <SectionTitle>🎯 Radar multidimensionnel — {paysA} vs {paysB}</SectionTitle>
              <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ background: COLOR_A }} /><span className="text-xs font-semibold">{paysA}</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ background: COLOR_B }} /><span className="text-xs font-semibold">{paysB}</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ background: '#94a3b8' }} /><span className="text-xs font-semibold text-gray-500">Médiane continentale</span></div>
                </div>
                <ResponsiveContainer width="100%" height={380}>
                  <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                    <PolarGrid stroke="hsl(0,0%,88%)" />
                    <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name={paysA!} dataKey="A" stroke={COLOR_A} fill={COLOR_A} fillOpacity={0.15} strokeWidth={2} />
                    <Radar name={paysB!} dataKey="B" stroke={COLOR_B} fill={COLOR_B} fillOpacity={0.15} strokeWidth={2} />
                    <Radar name="Médiane" dataKey="med" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.05} strokeWidth={1.5} strokeDasharray="5 3" />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${Number(v).toFixed(1)} / 100`]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <TabNavButtons activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
          )}

          {/* ═══ TAB: NON-VIE ════════════════════════════════════════════════ */}
          {activeTab === 'non-vie' && (
            <div className="space-y-5 animate-fade-in">
              <SectionTitle>🔵 Non-Vie — {paysA} vs {paysB}</SectionTitle>

              {/* Bar chart primes NV */}
              <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <p className="text-xs text-gray-500 mb-4">Évolution des primes émises Non-Vie (Mn USD)</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={evoData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tickFormatter={v => fmtMn(v)} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtMn(v)]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="nvA" name={`Primes NV — ${paysA}`} fill={COLOR_A} fillOpacity={0.8} radius={[3,3,0,0]} />
                    <Bar dataKey="nvB" name={`Primes NV — ${paysB}`} fill={COLOR_B} fillOpacity={0.8} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tableau comparatif */}
              <SectionTitle>📋 Historique comparatif Non-Vie</SectionTitle>
              <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <HistoTable rowsA={nvA} rowsB={nvB} fields={[
                  { key: 'primes_emises_mn_usd',  label: 'Primes (Mn$)',  fmt: fmtMn },
                  { key: 'taux_penetration_pct',   label: 'Pénétration',  fmt: fmtPct },
                  { key: 'taux_sinistralite_pct',  label: 'Sinistralité', fmt: fmtPct },
                ]} />
              </div>
              <TabNavButtons activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
          )}

          {/* ═══ TAB: VIE ════════════════════════════════════════════════════ */}
          {activeTab === 'vie' && (
            <div className="space-y-5 animate-fade-in">
              <SectionTitle>🟢 Vie — {paysA} vs {paysB}</SectionTitle>
              <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <p className="text-xs text-gray-500 mb-4">Évolution des primes émises Vie (Mn USD)</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={evoData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tickFormatter={v => fmtMn(v)} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmtMn(v)]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="vieA" name={`Primes Vie — ${paysA}`} fill={COLOR_A} fillOpacity={0.8} radius={[3,3,0,0]} />
                    <Bar dataKey="vieB" name={`Primes Vie — ${paysB}`} fill={COLOR_B} fillOpacity={0.8} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <SectionTitle>📋 Historique comparatif Vie</SectionTitle>
              <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <HistoTable rowsA={vieA} rowsB={vieB} fields={[
                  { key: 'primes_emises_mn_usd', label: 'Primes (Mn$)',  fmt: fmtMn },
                  { key: 'taux_penetration_pct',  label: 'Pénétration',  fmt: fmtPct },
                  { key: 'taux_sinistralite_pct', label: 'Sinistralité', fmt: fmtPct },
                ]} />
              </div>
              <TabNavButtons activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
          )}

          {/* ═══ TAB: MACROÉCONOMIE ══════════════════════════════════════════ */}
          {activeTab === 'macro' && (
            <div className="space-y-5 animate-fade-in">
              <SectionTitle>💹 Macroéconomie — {paysA} vs {paysB}</SectionTitle>
              <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <p className="text-xs text-gray-500 mb-4">Croissance du PIB (%) · Série complète 2015–2024</p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={evoData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tickFormatter={v => `${v?.toFixed(1)}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="gdpA" name={`Croiss. PIB — ${paysA}`} stroke={COLOR_A} strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="gdpB" name={`Croiss. PIB — ${paysB}`} stroke={COLOR_B} strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="infA" name={`Inflation — ${paysA}`}   stroke={COLOR_A} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                    <Line type="monotone" dataKey="infB" name={`Inflation — ${paysB}`}   stroke={COLOR_B} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <SectionTitle>📋 Historique macro comparatif</SectionTitle>
              <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <HistoTable rowsA={macA} rowsB={macB} fields={[
                  { key: 'gdp_per_capita',     label: 'PIB/hab',     fmt: fmtUsd },
                  { key: 'gdp_growth_pct',     label: 'Croiss. PIB', fmt: fmtPctSgn },
                  { key: 'inflation_rate_pct', label: 'Inflation',   fmt: fmtPct },
                ]} />
              </div>
              <TabNavButtons activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
          )}

          {/* ═══ TAB: GOUVERNANCE ════════════════════════════════════════════ */}
          {activeTab === 'gouvernance' && (
            <div className="space-y-5 animate-fade-in">
              <SectionTitle>🏛 Gouvernance — {paysA} vs {paysB}</SectionTitle>

              {/* Radar WGI comparatif */}
              <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <p className="text-xs text-gray-500 mb-4">Indicateurs WGI normalisés [0–100]</p>
                {(() => {
                  const normWgi = (v: number | null) => v != null ? Math.max(0, Math.min(100, ((v + 2.5) / 5) * 100)) : 0
                  const dims = [
                    { label: 'Stabilité pol.', keyGov: 'political_stability' },
                    { label: 'Efficacité gvt', keyGov: 'government_effectiveness' },
                    { label: 'Règle de droit', keyGov: 'rule_of_law' },
                    { label: 'Contrôle corr.', keyGov: 'control_of_corruption' },
                    { label: 'Qualité régl.',  keyGov: 'regulatory_quality' },
                    { label: 'Ouverture fin.', keyGov: 'kaopen' },
                  ]
                  const govRadar = dims.map(d => ({
                    dim: d.label,
                    A: normWgi(vA(gouvA, d.keyGov)),
                    B: normWgi(vB(gouvB, d.keyGov)),
                  }))
                  return (
                    <ResponsiveContainer width="100%" height={320}>
                      <RadarChart data={govRadar} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                        <PolarGrid stroke="hsl(0,0%,88%)" />
                        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: '#64748b' }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name={paysA!} dataKey="A" stroke={COLOR_A} fill={COLOR_A} fillOpacity={0.15} strokeWidth={2} />
                        <Radar name={paysB!} dataKey="B" stroke={COLOR_B} fill={COLOR_B} fillOpacity={0.15} strokeWidth={2} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${Number(v).toFixed(1)} / 100`]} />
                      </RadarChart>
                    </ResponsiveContainer>
                  )
                })()}
              </div>

              {/* Tableau WGI historique */}
              <SectionTitle>📋 Indicateurs WGI historiques</SectionTitle>
              <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <HistoTable rowsA={gouvA} rowsB={gouvB} fields={[
                  { key: 'political_stability',    label: 'Stab. Pol.',  fmt: fmtWgi },
                  { key: 'fdi_inflows_pct_gdp',    label: 'IDE (%)',      fmt: fmtPct },
                  { key: 'kaopen',                 label: 'Ouverture',   fmt: fmtWgi },
                ]} />
              </div>
              <TabNavButtons activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
          )}

          {/* ═══ TAB: POSITIONNEMENT ══════════════════════════════════════════ */}
          {activeTab === 'positionnement' && (() => {
            // Rang continental pour chaque pays
            const rank = (data: any[], field: string, pays: string, desc = true) => {
              const src = selectedYear === 'avg' ? data : data.filter(r => r.annee === selectedYear)
              const byPays: Record<string, number[]> = {}
              src.forEach(r => {
                const v = r[field] as number | null
                if (v == null) return
                if (!byPays[r.pays]) byPays[r.pays] = []
                byPays[r.pays].push(v)
              })
              const sorted = Object.entries(byPays)
                .map(([p, vals]) => ({ pays: p, val: avg(vals) }))
                .sort((a, b) => desc ? b.val - a.val : a.val - b.val)
              const idx = sorted.findIndex(r => r.pays === pays)
              return { rank: idx >= 0 ? idx + 1 : null, total: sorted.length }
            }

            const metricsA = [
              { label: 'Primes Non-Vie', ...rank(nvData, 'primes_emises_mn_usd', paysA!), fmt: fmtMn, val: vA(nvA, 'primes_emises_mn_usd') },
              { label: 'Pénétration NV', ...rank(nvData, 'taux_penetration_pct', paysA!), fmt: fmtPct, val: vA(nvA, 'taux_penetration_pct') },
              { label: 'Primes Vie',     ...rank(vieData, 'primes_emises_mn_usd', paysA!), fmt: fmtMn, val: vA(vieA, 'primes_emises_mn_usd') },
              { label: 'PIB/hab',        ...rank(macroData, 'gdp_per_capita', paysA!), fmt: fmtUsd, val: vA(macA, 'gdp_per_capita') },
              { label: 'Stabilité pol.', ...rank(gouvData, 'political_stability', paysA!), fmt: fmtWgi, val: vA(gouvA, 'political_stability') },
              { label: 'IDE (% PIB)',    ...rank(gouvData, 'fdi_inflows_pct_gdp', paysA!), fmt: fmtPct, val: vA(gouvA, 'fdi_inflows_pct_gdp') },
            ]
            const metricsB = [
              { label: 'Primes Non-Vie', ...rank(nvData, 'primes_emises_mn_usd', paysB!), fmt: fmtMn, val: vB(nvB, 'primes_emises_mn_usd') },
              { label: 'Pénétration NV', ...rank(nvData, 'taux_penetration_pct', paysB!), fmt: fmtPct, val: vB(nvB, 'taux_penetration_pct') },
              { label: 'Primes Vie',     ...rank(vieData, 'primes_emises_mn_usd', paysB!), fmt: fmtMn, val: vB(vieB, 'primes_emises_mn_usd') },
              { label: 'PIB/hab',        ...rank(macroData, 'gdp_per_capita', paysB!), fmt: fmtUsd, val: vB(macB, 'gdp_per_capita') },
              { label: 'Stabilité pol.', ...rank(gouvData, 'political_stability', paysB!), fmt: fmtWgi, val: vB(gouvB, 'political_stability') },
              { label: 'IDE (% PIB)',    ...rank(gouvData, 'fdi_inflows_pct_gdp', paysB!), fmt: fmtPct, val: vB(gouvB, 'fdi_inflows_pct_gdp') },
            ]

            return (
              <div className="space-y-5 animate-fade-in">
                <SectionTitle>🏆 Positionnement continental — {paysA} vs {paysB}</SectionTitle>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {[{ label: 'A', pays: paysA!, color: COLOR_A, metrics: metricsA }, { label: 'B', pays: paysB!, color: COLOR_B, metrics: metricsB }].map(side => (
                    <div key={side.label} className="bg-white rounded-xl overflow-hidden" style={{ border: `2px solid ${side.color}25`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                      <div className="px-4 py-3 flex items-center gap-3" style={{ background: `${side.color}10`, borderBottom: `1px solid ${side.color}20` }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: side.color }}>
                          {side.label}
                        </div>
                        <span className="font-bold text-gray-800">{side.pays}</span>
                        <span className="text-xs text-gray-500">{side.label === 'A' ? regionA : regionB}</span>
                      </div>
                      <div>
                        {side.metrics.map(m => (
                          <div key={m.label} className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 hover:bg-gray-50 transition-colors"
                            style={{ borderColor: 'hsl(0,0%,94%)' }}>
                            <div>
                              <p className="text-xs font-semibold text-gray-700">{m.label}</p>
                              <p className="text-sm font-bold mt-0.5" style={{ color: side.color }}>{m.fmt(m.val)}</p>
                            </div>
                            <div className="text-right">
                              {m.rank != null ? (
                                <>
                                  <div className="text-lg font-bold text-gray-800">#{m.rank}</div>
                                  <div className="text-[10px] text-gray-400">sur {m.total} pays</div>
                                </>
                              ) : <span className="text-gray-400 text-xs">—</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <TabNavButtons activeTab={activeTab} onTabChange={handleTabChange} />
              </div>
            )
          })()}

        </div>
      )}
    </CartographieLayout>
  )
}
