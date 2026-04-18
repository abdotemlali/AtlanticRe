import { useMemo, useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Select from 'react-select'
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Line, ReferenceLine, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import { useCartographieData } from '../hooks/useCartographieData'
import CartographieLayout from '../components/cartographie/CartographieLayout'
import CartographieKPIGrid from '../components/cartographie/CartographieKPIGrid'
import InsightPanel from '../components/cartographie/InsightPanel'
import { REGION_COLORS } from '../utils/cartographieConstants'
import { useCountryInsights as useNvCountryInsights } from '../hooks/useNonVieInsights'
import { useVieCountryInsights } from '../hooks/useVieInsights'
import { useMacroCountryInsights } from '../hooks/useMacroInsights'
import { useGouvCountryInsights } from '../hooks/useGouvInsights'
import { useAnalysePaysInsights } from '../hooks/useAnalyseInsights'

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

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'kpis',            label: 'KPIs & Évolution', icon: '📊' },
  { id: 'radar',           label: 'Radar',             icon: '🎯' },
  { id: 'non-vie',         label: 'Non-Vie',           icon: '🔵' },
  { id: 'vie',             label: 'Vie',               icon: '🟢' },
  { id: 'macro',           label: 'Macroéconomie',    icon: '💹' },
  { id: 'gouvernance',     label: 'Gouvernance',       icon: '🏛' },
  { id: 'positionnement',  label: 'Positionnement',   icon: '🏆' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function avg(a: number[]) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0 }
function median(a: number[]) {
  if (!a.length) return 0
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const fmtMn  = (v: number | null) => v == null ? '—' : v >= 1000 ? `${(v / 1000).toFixed(1)} Mrd$` : `${v.toFixed(0)} Mn$`
const fmtPct = (v: number | null) => v == null ? '—' : `${v.toFixed(1)}%`
const fmtPctSgn = (v: number | null) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
const fmtUsd = (v: number | null) => v == null ? '—' : `$${Math.round(v).toLocaleString()}/hab`
const fmtWgi = (v: number | null) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}`
const fmtBn  = (v: number | null) => v == null ? '—' : v >= 1000 ? `${(v / 1000).toFixed(1)} Mrd$` : `${v.toFixed(0)} Mn$`

function getRowVal<T>(rows: T[], field: keyof T, year: YearSel): number | null {
  if (year === 'avg') {
    const vals = rows.map(r => r[field] as unknown as number | null).filter((v): v is number => v != null)
    return vals.length ? avg(vals) : null
  }
  const row = rows.find(r => (r as any).annee === year)
  return row ? (row[field] as unknown as number | null) : null
}

// ── YearOrAvgNav ──────────────────────────────────────────────────────────────
function YearOrAvgNav({ years, value, onChange }: { years: number[]; value: YearSel; onChange: (v: YearSel) => void }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {years.map(y => (
        <button
          key={y}
          onClick={() => onChange(y)}
          className="px-2 py-0.5 rounded text-xs font-semibold transition-colors"
          style={value === y
            ? { background: 'hsl(83,52%,36%)', color: 'white' }
            : { background: 'hsl(0,0%,93%)', color: '#6b7280' }}
        >{y}</button>
      ))}
      <button
        onClick={() => onChange('avg')}
        className="px-2 py-0.5 rounded text-xs font-semibold transition-colors"
        style={value === 'avg'
          ? { background: 'hsl(83,52%,36%)', color: 'white' }
          : { background: 'hsl(0,0%,93%)', color: '#6b7280' }}
      >Moy. 2015–2024</button>
    </div>
  )
}

// ── Badge helpers ──────────────────────────────────────────────────────────────
function StabBadge({ v }: { v: number | null }) {
  if (v == null) return <span className="text-gray-400">—</span>
  const [label, color, bg] =
    v >= 0.5  ? ['Stable',   '#1E8449', 'hsla(140,50%,40%,0.12)'] :
    v >= -0.5 ? ['Modéré',   '#B9770E', 'hsla(35,85%,55%,0.12)'] :
               ['Instable',  '#922B21', 'hsla(0,60%,50%,0.12)']
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color, background: bg }}>{label}</span>
}
function KaopenBadge({ v }: { v: number | null }) {
  if (v == null) return <span className="text-gray-400">—</span>
  const [label, color, bg] =
    v > 1    ? ['Ouvert',  '#1E8449', 'hsla(140,50%,40%,0.12)'] :
    v >= -0.5 ? ['Partiel', '#B9770E', 'hsla(35,85%,55%,0.12)'] :
               ['Fermé',   '#922B21', 'hsla(0,60%,50%,0.12)']
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color, background: bg }}>{label}</span>
}
function FdiBadge({ v }: { v: number | null }) {
  if (v == null) return <span className="text-gray-400">—</span>
  const [label, color, bg] =
    v >= 5  ? ['Attractif', '#1E8449', 'hsla(140,50%,40%,0.12)'] :
    v >= 1  ? ['Modéré',    '#B9770E', 'hsla(35,85%,55%,0.12)'] :
              ['Faible',    '#922B21', 'hsla(0,60%,50%,0.12)']
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color, background: bg }}>{label}</span>
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

// ── Tab Navigation Bar ─────────────────────────────────────────────────────────
function TabNav({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId
  onTabChange: (t: TabId) => void
}) {
  return (
    <div
      className="bg-white rounded-xl overflow-hidden mb-1"
      style={{ border: '1px solid hsl(0,0%,90%)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
    >
      <div className="flex overflow-x-auto scrollbar-hide">
        {TABS.map((tab, i) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all relative flex-shrink-0"
              style={
                active
                  ? {
                      color: 'hsl(83,52%,30%)',
                      background: 'hsla(83,52%,42%,0.08)',
                      borderBottom: '2px solid hsl(83,52%,36%)',
                    }
                  : {
                      color: '#6b7280',
                      borderBottom: '2px solid transparent',
                    }
              }
              id={`tab-${tab.id}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {i < TABS.length - 1 && !active && (
                <span
                  className="absolute right-0 top-1/4 bottom-1/4 w-px"
                  style={{ background: 'hsl(0,0%,90%)' }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab progress indicator ─────────────────────────────────────────────────────
function TabProgress({ activeTab }: { activeTab: TabId }) {
  const currentIndex = TABS.findIndex(t => t.id === activeTab)
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {TABS.map((tab, i) => (
        <div
          key={tab.id}
          className="h-1 rounded-full transition-all"
          style={{
            flex: 1,
            background: i === currentIndex
              ? 'hsl(83,52%,36%)'
              : i < currentIndex
              ? 'hsla(83,52%,36%,0.35)'
              : 'hsl(0,0%,90%)',
          }}
        />
      ))}
    </div>
  )
}

// ── NAV items (sidebar désactivée pour AnalysePays) ───────────────────────────
const NAV_ITEMS: { id: string; label: string }[] = []

// ── Main component ─────────────────────────────────────────────────────────────
export default function AnalysePays() {
  const { pays } = useParams<{ pays: string }>()
  const navigate = useNavigate()

  const { data: nvData,    years } = useCartographieData('non-vie')
  const { data: vieData }          = useCartographieData('vie')
  const { data: macroData }        = useCartographieData('macroeconomie')
  const { data: gouvData }         = useCartographieData('gouvernance')

  const [selectedYear, setSelectedYear] = useState<YearSel>('avg')
  const [activeTab, setActiveTab] = useState<TabId>('kpis')
  const paysDecoded = pays ? decodeURIComponent(pays) : ''

  // ── Scroll to top when country or tab changes ─────────────────────────────
  useEffect(() => {
    const container = document.getElementById('scar-main-scroll')
    if (container) container.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pays, activeTab])

  // ── Reset tab to kpis when country changes ────────────────────────────────
  useEffect(() => {
    setActiveTab('kpis')
  }, [pays])

  // ── Filter rows for this country ──────────────────────────────────────────
  const nvRows   = useMemo(() => nvData.filter(r => r.pays === paysDecoded).sort((a, b) => a.annee - b.annee),   [nvData, paysDecoded])
  const vieRows  = useMemo(() => vieData.filter(r => r.pays === paysDecoded).sort((a, b) => a.annee - b.annee),  [vieData, paysDecoded])
  const macRows  = useMemo(() => macroData.filter(r => r.pays === paysDecoded).sort((a, b) => a.annee - b.annee), [macroData, paysDecoded])
  const gouvRows = useMemo(() => gouvData.filter(r => r.pays === paysDecoded).sort((a, b) => a.annee - b.annee), [gouvData, paysDecoded])

  // ── Countries for selector ────────────────────────────────────────────────
  const allCountries = useMemo(() => {
    const s = new Set<string>()
    nvData.forEach(r => s.add(r.pays))
    macroData.forEach(r => s.add(r.pays))
    return [...s].sort()
  }, [nvData, macroData])

  const countryOptions = useMemo(() =>
    allCountries.map(c => ({ value: c, label: c })), [allCountries])

  // ── Country region ────────────────────────────────────────────────────────
  const countryRegion = nvRows[0]?.region ?? macRows[0]?.region ?? 'Autre'
  const regionColor   = REGION_COLORS[countryRegion] ?? REGION_COLORS.Autre

  // ── Invalid country guard ─────────────────────────────────────────────────
  const isLoading = nvData.length === 0 && macroData.length === 0
  const notFound  = !isLoading && nvRows.length === 0 && macRows.length === 0

  if (notFound) {
    return (
      <div className="px-8 py-16 text-center">
        <p className="text-lg font-bold text-gray-700 mb-2">Pays introuvable</p>
        <p className="text-sm text-gray-500 mb-6">« {paysDecoded} » ne figure pas dans nos données.</p>
        <button
          onClick={() => navigate('/modelisation/analyse')}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'hsl(83,52%,36%)' }}
        >← Retour à l'analyse globale</button>
      </div>
    )
  }

  // ── Helper: value for year/avg ────────────────────────────────────────────
  const nvVal   = (f: keyof typeof nvRows[0])   => getRowVal(nvRows,   f, selectedYear)
  const vieVal  = (f: keyof typeof vieRows[0])  => getRowVal(vieRows,  f, selectedYear)
  const macVal  = (f: keyof typeof macRows[0])  => getRowVal(macRows,  f, selectedYear)
  const gouvVal = (f: keyof typeof gouvRows[0]) => getRowVal(gouvRows, f, selectedYear)

  // ── Scorecard KPIs ────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const primesNV  = nvVal('primes_emises_mn_usd')
    const penetNV   = nvVal('taux_penetration_pct')
    const primesVie = vieVal('primes_emises_mn_usd')
    const penetVie  = vieVal('taux_penetration_pct')
    const gdpMn     = macVal('gdp_mn')
    const gdpCap    = macVal('gdp_per_capita')
    const polStab   = gouvVal('political_stability')
    const fdi       = gouvVal('fdi_inflows_pct_gdp')

    return [
      { label: 'Primes Non-Vie',      value: fmtMn(primesNV),  sublabel: 'Mn USD',                accent: 'navy' as const },
      { label: 'Pénétration NV',       value: fmtPct(penetNV),   sublabel: 'Primes / PIB',          accent: 'olive' as const },
      { label: 'Primes Vie',           value: fmtMn(primesVie), sublabel: 'Mn USD',                accent: 'green' as const },
      { label: 'Pénétration Vie',      value: fmtPct(penetVie),  sublabel: 'Primes / PIB',          accent: 'amber' as const },
      { label: 'PIB',                  value: fmtBn(gdpMn),     sublabel: 'Mn USD',                accent: 'navy' as const },
      { label: 'PIB / habitant',       value: fmtUsd(gdpCap),    sublabel: 'USD',                   accent: 'olive' as const },
      {
        label: 'Stabilité politique',
        value: fmtWgi(polStab),
        sublabel: polStab != null ? (polStab >= 0.5 ? '✓ Stable' : polStab >= -0.5 ? '~ Modéré' : '⚠ Instable') : '—',
        accent: polStab != null && polStab >= 0.5 ? 'green' as const : polStab != null && polStab >= -0.5 ? 'amber' as const : 'red' as const,
      },
      {
        label: 'IDE (% PIB)',
        value: fmtPct(fdi),
        sublabel: fdi != null ? (fdi >= 5 ? '✓ Attractif' : fdi >= 1 ? '~ Modéré' : '⚠ Faible') : '—',
        accent: fdi != null && fdi >= 5 ? 'green' as const : fdi != null && fdi >= 1 ? 'amber' as const : 'red' as const,
      },
    ]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nvRows, vieRows, macRows, gouvRows, selectedYear])

  // ── Evolution data (full series, ignores year selector) ───────────────────
  const evoData = useMemo(() => {
    const nvByYear: Record<number, number | null> = {}
    const vieByYear: Record<number, number | null> = {}
    const macByYear: Record<number, { gdp_growth_pct: number | null; inflation_rate_pct: number | null }> = {}

    nvRows.forEach(r => { nvByYear[r.annee] = r.primes_emises_mn_usd })
    vieRows.forEach(r => { vieByYear[r.annee] = r.primes_emises_mn_usd })
    macRows.forEach(r => { macByYear[r.annee] = { gdp_growth_pct: r.gdp_growth_pct, inflation_rate_pct: r.inflation_rate_pct } })

    const allYears = [...new Set([...Object.keys(nvByYear), ...Object.keys(macByYear)].map(Number))].sort()
    return allYears.map(y => ({
      annee: y,
      primes_nv:    nvByYear[y] ?? null,
      primes_vie:   vieByYear[y] ?? null,
      gdp_growth:   macByYear[y]?.gdp_growth_pct ?? null,
      inflation:    macByYear[y]?.inflation_rate_pct ?? null,
    }))
  }, [nvRows, vieRows, macRows])

  // ── Radar 6D ──────────────────────────────────────────────────────────────
  const radarData = useMemo(() => {
    const source = selectedYear === 'avg' ? nvData : nvData.filter(r => r.annee === selectedYear)
    const macSrc  = selectedYear === 'avg' ? macroData : macroData.filter(r => r.annee === selectedYear)
    const gouvSrc = selectedYear === 'avg' ? gouvData : gouvData.filter(r => r.annee === selectedYear)

    const maxContPrimesNV  = Math.max(0, ...source.map(r => r.primes_emises_mn_usd ?? 0))
    const maxContPenetNV   = Math.max(0, ...source.map(r => r.taux_penetration_pct ?? 0))
    const maxContGdpCap    = Math.max(0, ...macSrc.map(r => r.gdp_per_capita ?? 0))

    const primesNV  = nvVal('primes_emises_mn_usd')
    const penetNV   = nvVal('taux_penetration_pct')
    const primesVie = vieVal('primes_emises_mn_usd')
    const gdpCap    = macVal('gdp_per_capita')
    const polStab   = gouvVal('political_stability')
    const kaopen    = gouvVal('kaopen')

    const vieSrc = selectedYear === 'avg' ? vieData : vieData.filter(r => r.annee === selectedYear)
    const maxContPrimesVie = Math.max(0, ...vieSrc.map(r => r.primes_emises_mn_usd ?? 0))

    const norm = (v: number | null, max: number) => v != null && max > 0 ? Math.min(100, (v / max) * 100) : 0
    const normWgi = (v: number | null) => v != null ? Math.max(0, Math.min(100, ((v + 2.5) / 5) * 100)) : 0

    const medPrimesNV  = median((selectedYear === 'avg' ? nvData : nvData.filter(r => r.annee === selectedYear)).map(r => r.primes_emises_mn_usd).filter((v): v is number => v != null))
    const medPenetNV   = median((selectedYear === 'avg' ? nvData : nvData.filter(r => r.annee === selectedYear)).map(r => r.taux_penetration_pct).filter((v): v is number => v != null))
    const medPrimesVie = median((selectedYear === 'avg' ? vieData : vieData.filter(r => r.annee === selectedYear)).map(r => r.primes_emises_mn_usd).filter((v): v is number => v != null))
    const medGdpCap    = median(macSrc.map(r => r.gdp_per_capita).filter((v): v is number => v != null))
    const medPolStab   = median(gouvSrc.map(r => r.political_stability).filter((v): v is number => v != null))
    const medKaopen    = median(gouvSrc.map(r => r.kaopen).filter((v): v is number => v != null))

    return [
      { dim: 'Primes NV',     pays: norm(primesNV, maxContPrimesNV), mediane: norm(medPrimesNV, maxContPrimesNV), fullMark: 100 },
      { dim: 'Pénétration NV', pays: norm(penetNV, maxContPenetNV),  mediane: norm(medPenetNV, maxContPenetNV),  fullMark: 100 },
      { dim: 'Primes Vie',    pays: norm(primesVie, maxContPrimesVie), mediane: norm(medPrimesVie, maxContPrimesVie), fullMark: 100 },
      { dim: 'PIB/hab',       pays: norm(gdpCap, maxContGdpCap),    mediane: norm(medGdpCap, maxContGdpCap),    fullMark: 100 },
      { dim: 'Stabilité pol.', pays: normWgi(polStab),               mediane: normWgi(medPolStab),               fullMark: 100 },
      { dim: 'Ouverture fin.', pays: normWgi(kaopen),                mediane: normWgi(medKaopen),                fullMark: 100 },
    ]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nvData, vieData, macroData, gouvData, nvRows, vieRows, macRows, gouvRows, selectedYear])

  // ── NV positioning bar ────────────────────────────────────────────────────
  const nvPositionData = useMemo(() => {
    const source = selectedYear === 'avg' ? nvData : nvData.filter(r => r.annee === selectedYear)
    const byPays: Record<string, { region: string; vals: number[] }> = {}
    for (const r of source) {
      if (r.primes_emises_mn_usd == null) continue
      if (!byPays[r.pays]) byPays[r.pays] = { region: r.region ?? 'Autre', vals: [] }
      byPays[r.pays].vals.push(r.primes_emises_mn_usd)
    }
    const ranked = Object.entries(byPays)
      .map(([p, { region, vals }]) => ({ pays: p, region, value: avg(vals) }))
      .sort((a, b) => b.value - a.value)
    const top10 = ranked.slice(0, 10)
    const currentIdx = top10.findIndex(r => r.pays === paysDecoded)
    if (currentIdx === -1) {
      const currentEntry = ranked.find(r => r.pays === paysDecoded)
      if (currentEntry) top10.push({ ...currentEntry, pays: `... ${currentEntry.pays}` })
    }
    return top10
  }, [nvData, paysDecoded, selectedYear])

  // ── Country insights hooks ────────────────────────────────────────────────
  const { cards: nvInsights }   = useNvCountryInsights(nvData, paysDecoded)
  const { cards: vieInsights }  = useVieCountryInsights(vieData, paysDecoded)
  const { cards: macInsights }  = useMacroCountryInsights(macroData, paysDecoded)
  const gouvInsights             = useGouvCountryInsights(gouvData, paysDecoded)

  // ── Synthèse pays insights ────────────────────────────────────────────────
  const syntheseInsights = useAnalysePaysInsights(
    paysDecoded, nvRows, vieRows, macRows, gouvRows, nvData, macroData, gouvData
  )

  // ── Positionnement continental ────────────────────────────────────────────
  const positionnement = useMemo(() => {
    const source = selectedYear === 'avg' ? null : selectedYear

    const getContVal = <T extends { pays: string; annee: number }>(
      data: T[], field: keyof T
    ): Map<string, number> => {
      const m = new Map<string, number[]>()
      const rows = source ? data.filter(r => r.annee === source) : data
      rows.forEach(r => {
        const v = r[field] as unknown as number | null
        if (v == null) return
        const arr = m.get(r.pays) ?? []
        arr.push(v)
        m.set(r.pays, arr)
      })
      const out = new Map<string, number>()
      m.forEach((vals, p) => out.set(p, avg(vals)))
      return out
    }

    const nvPrimesMap  = getContVal(nvData,    'primes_emises_mn_usd')
    const nvPenetMap   = getContVal(nvData,    'taux_penetration_pct')
    const viePrimesMap = getContVal(vieData,   'primes_emises_mn_usd')
    const gdpCapMap    = getContVal(macroData, 'gdp_per_capita')
    const gdpGrMap     = getContVal(macroData, 'gdp_growth_pct')
    const polStabMap   = getContVal(gouvData,  'political_stability')
    const fdiMap       = getContVal(gouvData,  'fdi_inflows_pct_gdp')

    const rank = (m: Map<string, number>, p: string, desc = true) => {
      const sorted = [...m.entries()].sort((a, b) => desc ? b[1] - a[1] : a[1] - b[1])
      const idx = sorted.findIndex(([pays]) => pays === p)
      return idx >= 0 ? idx + 1 : null
    }

    const indicators = [
      { label: 'Primes NV (Mn USD)',   value: nvPrimesMap.get(paysDecoded) ?? null,  rank: rank(nvPrimesMap, paysDecoded),  fmt: fmtMn },
      { label: 'Pénétration NV (%)',   value: nvPenetMap.get(paysDecoded) ?? null,   rank: rank(nvPenetMap, paysDecoded),   fmt: fmtPct },
      { label: 'Primes Vie (Mn USD)',  value: viePrimesMap.get(paysDecoded) ?? null, rank: rank(viePrimesMap, paysDecoded), fmt: fmtMn },
      { label: 'PIB/hab (USD)',        value: gdpCapMap.get(paysDecoded) ?? null,    rank: rank(gdpCapMap, paysDecoded),    fmt: (v: number | null) => fmtUsd(v) },
      { label: 'Croissance PIB (%)',   value: gdpGrMap.get(paysDecoded) ?? null,     rank: rank(gdpGrMap, paysDecoded),    fmt: fmtPctSgn },
      { label: 'Stabilité pol. (WGI)', value: polStabMap.get(paysDecoded) ?? null,   rank: rank(polStabMap, paysDecoded),  fmt: fmtWgi },
      { label: 'IDE (% PIB)',          value: fdiMap.get(paysDecoded) ?? null,       rank: rank(fdiMap, paysDecoded),      fmt: fmtPct },
    ]

    const region = countryRegion
    const regNvPrimesVals  = [...nvPrimesMap.entries()].filter(([p]) => (nvData.find(r => r.pays === p)?.region ?? '') === region).map(([, v]) => v)
    const regNvPenetVals   = [...nvPenetMap.entries()].filter(([p]) => (nvData.find(r => r.pays === p)?.region ?? '') === region).map(([, v]) => v)
    const regGdpCapVals    = [...gdpCapMap.entries()].filter(([p]) => (macroData.find(r => r.pays === p)?.region ?? '') === region).map(([, v]) => v)
    const regPolStabVals   = [...polStabMap.entries()].filter(([p]) => (gouvData.find(r => r.pays === p)?.region ?? '') === region).map(([, v]) => v)
    const regFdiVals       = [...fdiMap.entries()].filter(([p]) => (gouvData.find(r => r.pays === p)?.region ?? '') === region).map(([, v]) => v)

    const regAvg = {
      nvPrimes: regNvPrimesVals.length ? avg(regNvPrimesVals) : null,
      nvPenet:  regNvPenetVals.length  ? avg(regNvPenetVals)  : null,
      gdpCap:   regGdpCapVals.length   ? avg(regGdpCapVals)   : null,
      polStab:  regPolStabVals.length  ? avg(regPolStabVals)  : null,
      fdi:      regFdiVals.length      ? avg(regFdiVals)      : null,
    }

    const medContNvPrimes = median([...nvPrimesMap.values()])
    const medContNvPenet  = median([...nvPenetMap.values()])
    const medContGdpCap   = median([...gdpCapMap.values()])
    const medContPolStab  = median([...polStabMap.values()])
    const medContFdi      = median([...fdiMap.values()])

    return { indicators, regAvg, median: { nvPrimes: medContNvPrimes, nvPenet: medContNvPenet, gdpCap: medContGdpCap, polStab: medContPolStab, fdi: medContFdi } }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nvData, vieData, macroData, gouvData, paysDecoded, selectedYear, countryRegion])

  const yearLabel = selectedYear === 'avg' ? 'Moy. 2015–2024' : String(selectedYear)
  const tooltipStyle = { borderRadius: 8, border: '1px solid #D1D9E0', fontSize: 12 }

  const handleTabChange = useCallback((t: TabId) => {
    setActiveTab(t)
  }, [])

  // ── Tab button navigation (prev/next) ─────────────────────────────────────
  const currentTabIdx = TABS.findIndex(t => t.id === activeTab)
  const goPrev = () => { if (currentTabIdx > 0) setActiveTab(TABS[currentTabIdx - 1].id) }
  const goNext = () => { if (currentTabIdx < TABS.length - 1) setActiveTab(TABS[currentTabIdx + 1].id) }

  return (
    <CartographieLayout
      title=""
      subtitle=""
      dataSource=""
      navItems={NAV_ITEMS}
    >
      {/* ── HEADER PERMANENT ────────────────────────────────────────────── */}
      <div
        id="tab-nav"
        className="bg-white rounded-xl overflow-hidden"
        style={{ border: '1px solid hsl(0,0%,88%)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
      >
        {/* Ligne 1 — Identité pays + actions */}
        <div
          className="px-5 py-4 flex items-center gap-4"
          style={{ borderBottom: '1px solid hsl(0,0%,93%)' }}
        >
          {/* Badge région (couleur) */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
            style={{ background: `${regionColor}18`, border: `2px solid ${regionColor}35` }}
          >🌍</div>

          {/* Nom pays + région */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 leading-none truncate">{paysDecoded}</h1>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase flex-shrink-0"
                style={{ background: `${regionColor}18`, color: regionColor }}
              >{countryRegion}</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Afrique · 34 pays couverts · Axco · World Bank · WGI</p>
          </div>

          {/* Dropdown changement de pays */}
          <div className="w-52 flex-shrink-0 hidden sm:block">
            <Select
              options={countryOptions}
              value={countryOptions.find(o => o.value === paysDecoded) || null}
              onChange={v => v && navigate(`/modelisation/analyse/${encodeURIComponent(v.value)}`)}
              placeholder="Changer de pays…"
              isClearable={false}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              styles={{
                control: (b: any) => ({
                  ...b, borderRadius: 8, minHeight: 34, fontSize: 12,
                  borderColor: 'hsl(0,0%,86%)', boxShadow: 'none',
                  '&:hover': { borderColor: 'hsl(83,52%,42%)' },
                }),
                valueContainer: (b: any) => ({ ...b, padding: '0 8px' }),
                option: (b: any, s: any) => ({
                  ...b, fontSize: 12,
                  background: s.isFocused ? 'hsla(83,52%,42%,0.10)' : 'white',
                  color: '#374151',
                }),
              }}
            />
          </div>

          {/* Bouton retour */}
          <button
            onClick={() => navigate('/modelisation/analyse')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 hover:shadow-sm"
            style={{
              background: 'hsl(0,0%,97%)',
              color: '#374151',
              border: '1px solid hsl(0,0%,86%)',
            }}
          >
            <span style={{ fontSize: 14 }}>←</span>
            <span className="hidden sm:inline">Analyse globale</span>
          </button>

          {/* Bouton comparaison */}
          <button
            onClick={() => navigate(`/modelisation/comparaison?a=${encodeURIComponent(paysDecoded)}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 hover:shadow-sm"
            style={{
              background: 'hsla(83,52%,36%,0.10)',
              color: 'hsl(83,52%,28%)',
              border: '1px solid hsla(83,52%,36%,0.30)',
            }}
          >
            <span>⚖️</span>
            <span className="hidden sm:inline">Comparer</span>
          </button>
        </div>

        {/* Ligne 2 — Sélecteur de période */}
        <div
          className="px-5 py-2.5 flex items-center gap-3"
          style={{ borderBottom: '1px solid hsl(0,0%,93%)', background: 'hsl(0,0%,98.5%)' }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0"
            style={{ color: 'hsl(0,0%,50%)' }}
          >Période</span>
          <div className="flex items-center gap-1 flex-wrap">
            {years.map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className="px-2 py-0.5 rounded text-[11px] font-semibold transition-colors"
                style={selectedYear === y
                  ? { background: 'hsl(83,52%,36%)', color: 'white' }
                  : { background: 'white', color: '#6b7280', border: '1px solid hsl(0,0%,88%)' }}
              >{y}</button>
            ))}
            <button
              onClick={() => setSelectedYear('avg')}
              className="px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors"
              style={selectedYear === 'avg'
                ? { background: 'hsl(83,52%,36%)', color: 'white' }
                : { background: 'white', color: '#6b7280', border: '1px solid hsl(0,0%,88%)' }}
            >Moy. 2015–2024</button>
          </div>
        </div>

        {/* Ligne 3 — Barre de tabs */}
        <TabNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Progress bar */}
      <TabProgress activeTab={activeTab} />

      {/* ── TAB CONTENT ─────────────────────────────────────────────────── */}
      <div id="tab-content" className="space-y-5">

        {/* ── TAB: KPIs + ÉVOLUTION ─────────────────────────────────────── */}
        {activeTab === 'kpis' && (
          <div className="space-y-5 animate-fade-in">
            <SectionTitle>📊 Tableau de bord — {paysDecoded}</SectionTitle>
            <CartographieKPIGrid kpis={kpis} />

            {/* Évolution 2015–2024 */}
            <SectionTitle>📈 Évolution 2015–2024 : Assurance &amp; Macroéconomie</SectionTitle>
            <div
              className="bg-white rounded-xl p-5"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
            >
              <p className="text-xs text-gray-500 mb-4">
                Série complète 2015–2024. Axe gauche : primes (Mn$) · Axe droit : indicateurs macroéconomiques (%).
              </p>
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={evoData} margin={{ top: 10, right: 50, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="left" tickFormatter={v => fmtMn(v)} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v?.toFixed(1)}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine yAxisId="right" y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Bar yAxisId="left" dataKey="primes_nv"  name="Primes NV"  fill="hsl(83,52%,42%)"  fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="left" dataKey="primes_vie" name="Primes Vie" fill="hsl(140,50%,40%)" fillOpacity={0.5} radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="gdp_growth" name="Croiss. PIB %"  stroke="#1B3F6B" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="inflation"  name="Inflation %"    stroke="#E8940C" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── TAB: RADAR ────────────────────────────────────────────────── */}
        {activeTab === 'radar' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <SectionTitle>🎯 Profil multidimensionnel — {yearLabel}</SectionTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Période :</span>
                <YearOrAvgNav years={years} value={selectedYear} onChange={setSelectedYear} />
              </div>
            </div>
            <div
              className="bg-white rounded-xl p-5"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
            >
              <p className="text-xs text-gray-500 mb-4">
                Comparaison du pays vs la médiane des 34 pays africains sur 6 dimensions normalisées (0–100).
              </p>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Radar name={paysDecoded} dataKey="pays"    stroke="hsl(83,52%,42%)"  fill="hsl(83,52%,42%)"  fillOpacity={0.3} strokeWidth={2} />
                  <Radar name="Médiane continentale" dataKey="mediane" stroke="#1B3F6B" fill="#1B3F6B" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="5 3" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── TAB: NON-VIE ──────────────────────────────────────────────── */}
        {activeTab === 'non-vie' && (
          <div className="space-y-5 animate-fade-in">
            <SectionTitle>🔵 Assurance Non-Vie — {paysDecoded}</SectionTitle>

            <div
              className="bg-white rounded-xl p-5"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <h3 className="text-xs font-bold text-gray-600 mb-3">Évolution des indicateurs Non-Vie 2015–2024</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={nvRows} margin={{ top: 5, right: 50, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="left"  tickFormatter={v => fmtMn(v)} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v?.toFixed(1)}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine yAxisId="right" y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Bar    yAxisId="left"  dataKey="primes_emises_mn_usd" name="Primes (Mn$)"  fill="hsl(83,52%,42%)" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                  <Line   yAxisId="right" type="monotone" dataKey="taux_penetration_pct" name="Pénétration %" stroke="#1B3F6B" strokeWidth={2} dot={{ r: 3 }} />
                  <Line   yAxisId="right" type="monotone" dataKey="densite_assurance_usd" name="Densité ($/hab)" stroke="#E8940C" strokeWidth={1.5} dot={{ r: 2 }} />
                  <Line   yAxisId="right" type="monotone" dataKey="croissance_primes_pct" name="Croissance %"  stroke="#1E8449" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div
              className="bg-white rounded-xl p-5"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <h3 className="text-xs font-bold text-gray-600 mb-3">Rang continental — Primes Non-Vie ({yearLabel})</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={nvPositionData} layout="vertical" margin={{ top: 5, right: 50, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => fmtMn(v)} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="pays" tick={{ fontSize: 10, fill: '#374151' }} width={100} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtMn(v)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Primes NV">
                    {nvPositionData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.pays === paysDecoded || entry.pays.includes(paysDecoded)
                          ? 'hsl(83,52%,36%)'
                          : 'hsla(27,47%,37%,0.30)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <NvTable rows={nvRows} />
            <InsightPanel icon="🔵" title={`PROFIL NON-VIE — ${paysDecoded.toUpperCase()}`} cards={nvInsights} />
          </div>
        )}

        {/* ── TAB: VIE ──────────────────────────────────────────────────── */}
        {activeTab === 'vie' && (
          <div className="space-y-5 animate-fade-in">
            <SectionTitle>🟢 Assurance Vie — {paysDecoded}</SectionTitle>

            <div
              className="bg-white rounded-xl p-5"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <h3 className="text-xs font-bold text-gray-600 mb-3">Évolution des indicateurs Vie 2015–2024</h3>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={vieRows} margin={{ top: 5, right: 50, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="left"  tickFormatter={v => fmtMn(v)} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v?.toFixed(1)}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar    yAxisId="left"  dataKey="primes_emises_mn_usd" name="Primes Vie (Mn$)" fill="hsl(140,50%,40%)" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                  <Line   yAxisId="right" type="monotone" dataKey="taux_penetration_pct" name="Pénétration %" stroke="hsl(83,52%,36%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line   yAxisId="right" type="monotone" dataKey="densite_assurance_usd" name="Densité ($/hab)" stroke="#E8940C" strokeWidth={1.5} dot={{ r: 2 }} />
                  <Line   yAxisId="right" type="monotone" dataKey="croissance_primes_pct" name="Croissance %" stroke="#1E8449" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <NvVieStructure nvRows={nvRows} vieRows={vieRows} />
            <VieTable rows={vieRows} />
            <InsightPanel icon="🟢" title={`PROFIL VIE — ${paysDecoded.toUpperCase()}`} cards={vieInsights} />
          </div>
        )}

        {/* ── TAB: MACROÉCONOMIE ────────────────────────────────────────── */}
        {activeTab === 'macro' && (
          <div className="space-y-5 animate-fade-in">
            <SectionTitle>💹 Macroéconomie — {paysDecoded}</SectionTitle>

            <div
              className="bg-white rounded-xl p-5"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <h3 className="text-xs font-bold text-gray-600 mb-3">Évolution macro 2015–2024</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={macRows} margin={{ top: 5, right: 50, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="left"  tickFormatter={v => fmtMn(v)} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v?.toFixed(1)}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine yAxisId="right" y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Bar    yAxisId="left"  dataKey="gdp_mn"           name="PIB (Mn$)"         fill="hsl(209,42%,30%)" fillOpacity={0.6} radius={[3, 3, 0, 0]} />
                  <Line   yAxisId="right" type="monotone" dataKey="gdp_growth_pct"    name="Croiss. PIB %"  stroke="#1E8449" strokeWidth={2} dot={{ r: 3 }} />
                  <Line   yAxisId="right" type="monotone" dataKey="inflation_rate_pct" name="Inflation %"   stroke="#E8940C" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Période :</span>
              <YearOrAvgNav years={years} value={selectedYear} onChange={setSelectedYear} />
            </div>

            <MacroRadar macRows={macRows} allMacroData={macroData} countryRegion={countryRegion} pays={paysDecoded} selectedYear={selectedYear} />
            <MacroTable rows={macRows} />
            <InsightPanel icon="📊" title={`PROFIL MACRO — ${paysDecoded.toUpperCase()}`} cards={macInsights} />
          </div>
        )}

        {/* ── TAB: GOUVERNANCE ──────────────────────────────────────────── */}
        {activeTab === 'gouvernance' && (
          <div className="space-y-5 animate-fade-in">
            <SectionTitle>🏛 Gouvernance — {paysDecoded}</SectionTitle>

            <div
              className="bg-white rounded-xl p-5"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <h3 className="text-xs font-bold text-gray-600 mb-3">Évolution des indicateurs de gouvernance 2015–2024</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={gouvRows} margin={{ top: 5, right: 50, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="left"  domain={[-2.5, 2.5]} tickFormatter={v => v.toFixed(1)} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v?.toFixed(1)}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine yAxisId="left" y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Line yAxisId="left"  type="monotone" dataKey="political_stability" name="Stab. politique" stroke="#1B3F6B" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="left"  type="monotone" dataKey="regulatory_quality"  name="Qualité régl."  stroke="#1E8449" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="left"  type="monotone" dataKey="kaopen"              name="KAOPEN"          stroke="#8E44AD" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="5 3" />
                  <Line yAxisId="right" type="monotone" dataKey="fdi_inflows_pct_gdp" name="IDE (% PIB)"    stroke="#E8940C" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Période :</span>
              <YearOrAvgNav years={years} value={selectedYear} onChange={setSelectedYear} />
            </div>

            <GouvRadar gouvRows={gouvRows} allGouvData={gouvData} pays={paysDecoded} selectedYear={selectedYear} />
            <GouvScorecard gouvRows={gouvRows} />
            <GouvTable rows={gouvRows} />
            <InsightPanel icon="🏛" title={`PROFIL GOUVERNANCE — ${paysDecoded.toUpperCase()}`} cards={gouvInsights} />
          </div>
        )}

        {/* ── TAB: POSITIONNEMENT ───────────────────────────────────────── */}
        {activeTab === 'positionnement' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <SectionTitle>🏆 Positionnement Continental — {yearLabel}</SectionTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Période :</span>
                <YearOrAvgNav years={years} value={selectedYear} onChange={setSelectedYear} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Bloc 1 — Rang continental */}
              <div
                className="bg-white rounded-xl p-5"
                style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                <h3 className="text-xs font-bold text-gray-700 mb-3">Rang continental (sur 34 pays)</h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-1.5 text-left font-bold text-gray-500">Indicateur</th>
                      <th className="py-1.5 text-right font-bold text-gray-500">Valeur</th>
                      <th className="py-1.5 text-right font-bold text-gray-500">Rang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionnement.indicators.map(ind => (
                      <tr key={ind.label} className="border-b border-gray-100">
                        <td className="py-1.5 text-gray-700">{ind.label}</td>
                        <td className="py-1.5 text-right font-mono text-gray-700">{ind.fmt(ind.value)}</td>
                        <td className="py-1.5 text-right">
                          {ind.rank != null ? (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={ind.rank <= 10
                                ? { color: '#1E8449', background: 'hsla(140,50%,40%,0.12)' }
                                : ind.rank <= 20
                                ? { color: '#B9770E', background: 'hsla(35,85%,55%,0.12)' }
                                : { color: '#922B21', background: 'hsla(0,60%,50%,0.12)' }
                              }
                            >{ind.rank}/34</span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bloc 2 — Vs région */}
              <div
                className="bg-white rounded-xl p-5"
                style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                <h3 className="text-xs font-bold text-gray-700 mb-1">Vs moyenne de sa région</h3>
                <p className="text-[11px] text-gray-500 mb-3">{countryRegion}</p>
                <VsTable
                  pays={paysDecoded}
                  items={[
                    { label: 'Primes NV',    pays: positionnement.indicators[0].value,    ref: positionnement.regAvg.nvPrimes, fmt: fmtMn,     higher: true },
                    { label: 'Pénétration NV', pays: positionnement.indicators[1].value,  ref: positionnement.regAvg.nvPenet,  fmt: fmtPct,    higher: true },
                    { label: 'PIB/hab',      pays: positionnement.indicators[3].value,    ref: positionnement.regAvg.gdpCap,   fmt: fmtUsd,    higher: true },
                    { label: 'Stab. pol.',   pays: positionnement.indicators[5].value,    ref: positionnement.regAvg.polStab,  fmt: fmtWgi,    higher: true },
                    { label: 'IDE (% PIB)',  pays: positionnement.indicators[6].value,    ref: positionnement.regAvg.fdi,      fmt: fmtPct,    higher: true },
                  ]}
                />
              </div>

              {/* Bloc 3 — Vs médiane continentale */}
              <div
                className="bg-white rounded-xl p-5"
                style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                <h3 className="text-xs font-bold text-gray-700 mb-1">Vs médiane continentale</h3>
                <p className="text-[11px] text-gray-500 mb-3">34 pays africains</p>
                <VsTable
                  pays={paysDecoded}
                  items={[
                    { label: 'Primes NV',    pays: positionnement.indicators[0].value,   ref: positionnement.median.nvPrimes,  fmt: fmtMn,  higher: true },
                    { label: 'Pénétration NV', pays: positionnement.indicators[1].value, ref: positionnement.median.nvPenet,   fmt: fmtPct, higher: true },
                    { label: 'PIB/hab',      pays: positionnement.indicators[3].value,   ref: positionnement.median.gdpCap,    fmt: fmtUsd, higher: true },
                    { label: 'Stab. pol.',   pays: positionnement.indicators[5].value,   ref: positionnement.median.polStab,   fmt: fmtWgi, higher: true },
                    { label: 'IDE (% PIB)',  pays: positionnement.indicators[6].value,   ref: positionnement.median.fdi,       fmt: fmtPct, higher: true },
                  ]}
                />
              </div>
            </div>

            {/* Synthèse finale */}
            <InsightPanel
              icon="🎯"
              title={`SYNTHÈSE — ${paysDecoded.toUpperCase()} · PERSPECTIVES ATLANTIC RE`}
              cards={syntheseInsights}
            />
          </div>
        )}

        {/* ── PREV / NEXT NAVIGATION ────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid hsl(0,0%,92%)' }}>
          <button
            onClick={goPrev}
            disabled={currentTabIdx === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={
              currentTabIdx === 0
                ? { color: '#d1d5db', cursor: 'not-allowed' }
                : { color: 'hsl(83,52%,30%)', background: 'hsla(83,52%,42%,0.08)', border: '1px solid hsla(83,52%,42%,0.20)' }
            }
          >
            ← {currentTabIdx > 0 ? `${TABS[currentTabIdx - 1].icon} ${TABS[currentTabIdx - 1].label}` : 'Début'}
          </button>

          <span className="text-xs text-gray-400 font-semibold">
            {currentTabIdx + 1} / {TABS.length}
          </span>

          <button
            onClick={goNext}
            disabled={currentTabIdx === TABS.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={
              currentTabIdx === TABS.length - 1
                ? { color: '#d1d5db', cursor: 'not-allowed' }
                : { color: 'hsl(83,52%,30%)', background: 'hsla(83,52%,42%,0.08)', border: '1px solid hsla(83,52%,42%,0.20)' }
            }
          >
            {currentTabIdx < TABS.length - 1 ? `${TABS[currentTabIdx + 1].icon} ${TABS[currentTabIdx + 1].label}` : 'Fin'} →
          </button>
        </div>
      </div>
    </CartographieLayout>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NvTable({ rows }: { rows: Array<{ annee: number; primes_emises_mn_usd: number | null; taux_penetration_pct: number | null; densite_assurance_usd: number | null; croissance_primes_pct: number | null; ratio_sp_pct: number | null }> }) {
  const sorted = [...rows].sort((a, b) => b.annee - a.annee)
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-xs font-bold text-gray-600">Tableau Non-Vie — Série historique</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="py-2 px-3 text-left font-bold text-gray-500">Année</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">Primes (Mn$)</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">Pénétration (%)</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">Densité ($/hab)</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">Croissance (%)</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">S/P (%)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 font-bold text-gray-700">{r.annee}</td>
                <td className="py-2 px-3 text-right tabular-nums">{fmtMn(r.primes_emises_mn_usd)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{fmtPct(r.taux_penetration_pct)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{r.densite_assurance_usd != null ? `$${r.densite_assurance_usd.toFixed(1)}` : '—'}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {r.croissance_primes_pct != null ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={r.croissance_primes_pct >= 0
                        ? { color: '#1E8449', background: 'hsla(140,50%,40%,0.12)' }
                        : { color: '#922B21', background: 'hsla(0,60%,50%,0.12)' }}>
                      {fmtPctSgn(r.croissance_primes_pct)}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">{fmtPct(r.ratio_sp_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function VieTable({ rows }: { rows: Array<{ annee: number; primes_emises_mn_usd: number | null; taux_penetration_pct: number | null; densite_assurance_usd: number | null; croissance_primes_pct: number | null }> }) {
  const sorted = [...rows].sort((a, b) => b.annee - a.annee)
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-xs font-bold text-gray-600">Tableau Vie — Série historique</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="py-2 px-3 text-left font-bold text-gray-500">Année</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">Primes (Mn$)</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">Pénétration (%)</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">Densité ($/hab)</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">Croissance (%)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 font-bold text-gray-700">{r.annee}</td>
                <td className="py-2 px-3 text-right tabular-nums">{fmtMn(r.primes_emises_mn_usd)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{fmtPct(r.taux_penetration_pct)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{r.densite_assurance_usd != null ? `$${r.densite_assurance_usd.toFixed(1)}` : '—'}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {r.croissance_primes_pct != null ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={r.croissance_primes_pct >= 0
                        ? { color: '#1E8449', background: 'hsla(140,50%,40%,0.12)' }
                        : { color: '#922B21', background: 'hsla(0,60%,50%,0.12)' }}>
                      {fmtPctSgn(r.croissance_primes_pct)}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NvVieStructure({
  nvRows, vieRows,
}: {
  nvRows: Array<{ annee: number; primes_emises_mn_usd: number | null }>
  vieRows: Array<{ annee: number; primes_emises_mn_usd: number | null }>
}) {
  const data = useMemo(() => {
    const years = [...new Set([...nvRows.map(r => r.annee), ...vieRows.map(r => r.annee)])].sort()
    const nvByY: Record<number, number | null> = {}
    const vieByY: Record<number, number | null> = {}
    nvRows.forEach(r => { nvByY[r.annee] = r.primes_emises_mn_usd })
    vieRows.forEach(r => { vieByY[r.annee] = r.primes_emises_mn_usd })
    return years.map(y => ({ annee: y, nv: nvByY[y] ?? null, vie: vieByY[y] ?? null }))
  }, [nvRows, vieRows])

  return (
    <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <h3 className="text-xs font-bold text-gray-600 mb-3">Structure du marché local — NV vs Vie</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tickFormatter={v => fmtMn(v)} tick={{ fontSize: 10, fill: '#64748b' }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0', fontSize: 12 }} formatter={(v: number) => fmtMn(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="nv"  name="Primes NV"  fill="hsl(83,52%,42%)"  radius={[3, 3, 0, 0]} />
          <Bar dataKey="vie" name="Primes Vie" fill="hsl(140,50%,40%)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function MacroTable({ rows }: { rows: Array<{ annee: number; gdp_mn: number | null; gdp_per_capita: number | null; gdp_growth_pct: number | null; inflation_rate_pct: number | null; current_account_mn: number | null; integration_regionale_score: number | null }> }) {
  const sorted = [...rows].sort((a, b) => b.annee - a.annee)
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-xs font-bold text-gray-600">Tableau Macro — Série historique</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="py-2 px-3 text-left font-bold text-gray-500">Année</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">PIB (Mn$)</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">PIB/hab</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">Croissance</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">Inflation</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">Solde courant</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">Intégration</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 font-bold text-gray-700">{r.annee}</td>
                <td className="py-2 px-3 text-right tabular-nums">{fmtBn(r.gdp_mn)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{fmtUsd(r.gdp_per_capita)}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {r.gdp_growth_pct != null ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={r.gdp_growth_pct >= 5
                        ? { color: '#1E8449', background: 'hsla(140,50%,40%,0.12)' }
                        : r.gdp_growth_pct >= 0
                        ? { color: '#B9770E', background: 'hsla(35,85%,55%,0.12)' }
                        : { color: '#922B21', background: 'hsla(0,60%,50%,0.12)' }}>
                      {fmtPctSgn(r.gdp_growth_pct)}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {r.inflation_rate_pct != null ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={r.inflation_rate_pct <= 5
                        ? { color: '#1E8449', background: 'hsla(140,50%,40%,0.12)' }
                        : r.inflation_rate_pct <= 10
                        ? { color: '#B9770E', background: 'hsla(35,85%,55%,0.12)' }
                        : { color: '#922B21', background: 'hsla(0,60%,50%,0.12)' }}>
                      {fmtPct(r.inflation_rate_pct)}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">{fmtBn(r.current_account_mn)}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {r.integration_regionale_score != null ? r.integration_regionale_score.toFixed(3) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MacroRadar({
  macRows, allMacroData, countryRegion, pays, selectedYear,
}: {
  macRows: Array<{ annee: number; gdp_growth_pct: number | null; inflation_rate_pct: number | null; gdp_per_capita: number | null; integration_regionale_score: number | null }>
  allMacroData: typeof macRows
  countryRegion: string
  pays: string
  selectedYear: YearSel
}) {
  const data = useMemo(() => {
    const getVal = (rows: typeof macRows, field: keyof typeof macRows[0]): number | null => {
      if (selectedYear === 'avg') {
        const vals = rows.map(r => r[field] as unknown as number | null).filter((v): v is number => v != null)
        return vals.length ? avg(vals) : null
      }
      const r = rows.find(r => r.annee === selectedYear)
      return r ? (r[field] as unknown as number | null) : null
    }

    const source = selectedYear === 'avg' ? allMacroData : allMacroData.filter(r => r.annee === selectedYear)
    const regRows = source.filter(r => (r as any).region === countryRegion)

    const growthScore = (v: number | null) => v != null ? Math.min(100, Math.max(0, 20 + v * 8)) : 50
    const inflScore   = (v: number | null) => v != null ? Math.min(100, Math.max(0, 100 - v * 5)) : 50
    const gdpCapScore = (v: number | null) => v != null ? Math.min(100, v / 120) : 50
    const integScore  = (v: number | null) => v != null ? Math.min(100, v * 100 / 0.65) : 50

    const paysGrowth  = growthScore(getVal(macRows, 'gdp_growth_pct'))
    const paysInfl    = inflScore(getVal(macRows, 'inflation_rate_pct'))
    const paysGdpCap  = gdpCapScore(getVal(macRows, 'gdp_per_capita'))
    const paysInteg   = integScore(getVal(macRows, 'integration_regionale_score'))

    const regGrowths  = regRows.map(r => r.gdp_growth_pct).filter((v): v is number => v != null)
    const regInfls    = regRows.map(r => r.inflation_rate_pct).filter((v): v is number => v != null)
    const regGdpCaps  = regRows.map(r => r.gdp_per_capita).filter((v): v is number => v != null)
    const regIntegs   = regRows.map(r => r.integration_regionale_score).filter((v): v is number => v != null)

    const regGrowthScore = growthScore(regGrowths.length ? avg(regGrowths) : null)
    const regInflScore   = inflScore(regInfls.length ? avg(regInfls) : null)
    const regGdpCapScore = gdpCapScore(regGdpCaps.length ? avg(regGdpCaps) : null)
    const regIntegScore  = integScore(regIntegs.length ? avg(regIntegs) : null)

    return [
      { dim: 'Croissance PIB', pays: paysGrowth, region: regGrowthScore, fullMark: 100 },
      { dim: 'Stabilité prix', pays: paysInfl,   region: regInflScore,   fullMark: 100 },
      { dim: 'PIB/hab',        pays: paysGdpCap, region: regGdpCapScore, fullMark: 100 },
      { dim: 'Intégration',    pays: paysInteg,  region: regIntegScore,  fullMark: 100 },
    ]
  }, [macRows, allMacroData, countryRegion, pays, selectedYear])

  return (
    <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <h3 className="text-xs font-bold text-gray-600 mb-3">Profil macro vs {countryRegion}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: '#374151' }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <Radar name={pays}              dataKey="pays"   stroke="hsl(83,52%,42%)" fill="hsl(83,52%,42%)" fillOpacity={0.3} strokeWidth={2} />
          <Radar name={`Moy. ${countryRegion}`} dataKey="region" stroke="#1B3F6B"         fill="#1B3F6B"         fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="5 3" />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

function GouvRadar({
  gouvRows, allGouvData, pays, selectedYear,
}: {
  gouvRows: Array<{ annee: number; political_stability: number | null; regulatory_quality: number | null; kaopen: number | null; fdi_inflows_pct_gdp: number | null }>
  allGouvData: typeof gouvRows
  pays: string
  selectedYear: YearSel
}) {
  const data = useMemo(() => {
    const getVal = (rows: typeof gouvRows, field: keyof typeof gouvRows[0]): number | null => {
      if (selectedYear === 'avg') {
        const vals = rows.map(r => r[field] as unknown as number | null).filter((v): v is number => v != null)
        return vals.length ? avg(vals) : null
      }
      const r = rows.find(r => r.annee === selectedYear)
      return r ? (r[field] as unknown as number | null) : null
    }

    const source = selectedYear === 'avg' ? allGouvData : allGouvData.filter(r => r.annee === selectedYear)

    const normWgi = (v: number | null) => v != null ? Math.max(0, Math.min(100, ((v + 2.5) / 5) * 100)) : 50
    const normFdi = (v: number | null) => v != null ? Math.min(100, v * 6.67) : 50

    const paysStab = normWgi(getVal(gouvRows, 'political_stability'))
    const paysReg  = normWgi(getVal(gouvRows, 'regulatory_quality'))
    const paysKa   = normWgi(getVal(gouvRows, 'kaopen'))
    const paysFdi  = normFdi(getVal(gouvRows, 'fdi_inflows_pct_gdp'))

    const contStabs = source.map(r => r.political_stability).filter((v): v is number => v != null)
    const contRegs  = source.map(r => r.regulatory_quality).filter((v): v is number => v != null)
    const contKas   = source.map(r => r.kaopen).filter((v): v is number => v != null)
    const contFdis  = source.map(r => r.fdi_inflows_pct_gdp).filter((v): v is number => v != null)

    const contStab = normWgi(contStabs.length ? median(contStabs) : null)
    const contReg  = normWgi(contRegs.length  ? median(contRegs)  : null)
    const contKa   = normWgi(contKas.length   ? median(contKas)   : null)
    const contFdi  = normFdi(contFdis.length  ? median(contFdis)  : null)

    return [
      { dim: 'Stabilité pol.',  pays: paysStab, continent: contStab, fullMark: 100 },
      { dim: 'Qualité régl.',   pays: paysReg,  continent: contReg,  fullMark: 100 },
      { dim: 'KAOPEN',          pays: paysKa,   continent: contKa,   fullMark: 100 },
      { dim: 'IDE (% PIB)',     pays: paysFdi,  continent: contFdi,  fullMark: 100 },
    ]
  }, [gouvRows, allGouvData, pays, selectedYear])

  return (
    <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <h3 className="text-xs font-bold text-gray-600 mb-3">Profil WGI vs médiane continentale</h3>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: '#374151' }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
          <Radar name={pays}                   dataKey="pays"      stroke="hsl(83,52%,42%)" fill="hsl(83,52%,42%)" fillOpacity={0.3} strokeWidth={2} />
          <Radar name="Médiane continentale"   dataKey="continent" stroke="#1B3F6B"         fill="#1B3F6B"         fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="5 3" />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

function GouvScorecard({ gouvRows }: { gouvRows: Array<{ political_stability: number | null; regulatory_quality: number | null; kaopen: number | null; fdi_inflows_pct_gdp: number | null }> }) {
  const a = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => x != null)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }
  const avgStab = a(gouvRows.map(r => r.political_stability))
  const avgReg  = a(gouvRows.map(r => r.regulatory_quality))
  const avgKa   = a(gouvRows.map(r => r.kaopen))
  const avgFdi  = a(gouvRows.map(r => r.fdi_inflows_pct_gdp))

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {[
        {
          label: 'Stab. politique',
          value: fmtWgi(avgStab),
          badge: <StabBadge v={avgStab} />,
          sublabel: 'WGI · Moy. 2015–2024',
        },
        {
          label: 'Qualité réglementaire',
          value: fmtWgi(avgReg),
          badge: avgReg != null ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={avgReg >= 0
                ? { color: '#1E8449', background: 'hsla(140,50%,40%,0.12)' }
                : { color: '#922B21', background: 'hsla(0,60%,50%,0.12)' }}>
              {avgReg >= 0 ? 'Favorable' : 'Faible'}
            </span>
          ) : null,
          sublabel: 'WGI · Moy. 2015–2024',
        },
        {
          label: 'KAOPEN (ouverture fin.)',
          value: avgKa != null ? avgKa.toFixed(2) : '—',
          badge: <KaopenBadge v={avgKa} />,
          sublabel: 'Moy. 2015–2024',
        },
        {
          label: 'IDE (% PIB)',
          value: fmtPct(avgFdi),
          badge: <FdiBadge v={avgFdi} />,
          sublabel: 'Moy. 2015–2024',
        },
      ].map((item, i) => (
        <div key={i} className="bg-white rounded-xl p-4"
          style={{ border: '1px solid hsl(0,0%,92%)', borderLeftWidth: 4, borderLeftColor: 'hsl(83,52%,42%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', minHeight: 110 }}>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{item.label}</span>
          <div className="text-2xl font-bold mt-2 text-gray-900">{item.value}</div>
          <div className="mt-2">{item.badge}</div>
          <span className="text-[10px] text-gray-400 mt-1 block">{item.sublabel}</span>
        </div>
      ))}
    </div>
  )
}

function GouvTable({ rows }: { rows: Array<{ annee: number; political_stability: number | null; regulatory_quality: number | null; kaopen: number | null; fdi_inflows_pct_gdp: number | null }> }) {
  const sorted = [...rows].sort((a, b) => b.annee - a.annee)
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-xs font-bold text-gray-600">Tableau Gouvernance — Série historique</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="py-2 px-3 text-left font-bold text-gray-500">Année</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">Stab. pol. (WGI)</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">Qualité régl. (WGI)</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">KAOPEN</th>
              <th className="py-2 px-3 text-right font-bold text-gray-500">IDE (% PIB)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 font-bold text-gray-700">{r.annee}</td>
                <td className="py-2 px-3 text-right">
                  <StabBadge v={r.political_stability} />
                  <span className="ml-1 tabular-nums font-mono">{fmtWgi(r.political_stability)}</span>
                </td>
                <td className="py-2 px-3 text-right tabular-nums font-mono">{fmtWgi(r.regulatory_quality)}</td>
                <td className="py-2 px-3 text-right">
                  <KaopenBadge v={r.kaopen} />
                  <span className="ml-1 tabular-nums font-mono">{r.kaopen != null ? r.kaopen.toFixed(2) : '—'}</span>
                </td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {r.fdi_inflows_pct_gdp != null ? (
                    <><FdiBadge v={r.fdi_inflows_pct_gdp} /><span className="ml-1 font-mono">{fmtPct(r.fdi_inflows_pct_gdp)}</span></>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function VsTable({
  pays: _pays,
  items,
}: {
  pays: string
  items: Array<{ label: string; pays: number | null; ref: number | null; fmt: (v: number | null) => string; higher: boolean }>
}) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="py-1.5 text-left font-bold text-gray-500">Indicateur</th>
          <th className="py-1.5 text-right font-bold text-gray-500">Pays</th>
          <th className="py-1.5 text-right font-bold text-gray-500">Réf.</th>
          <th className="py-1.5 text-right font-bold text-gray-500">Écart</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => {
          const diff = item.pays != null && item.ref != null ? item.pays - item.ref : null
          const favorable = diff != null ? (item.higher ? diff >= 0 : diff <= 0) : null
          return (
            <tr key={item.label} className="border-b border-gray-100">
              <td className="py-1.5 text-gray-700">{item.label}</td>
              <td className="py-1.5 text-right font-mono font-bold text-gray-800">{item.fmt(item.pays)}</td>
              <td className="py-1.5 text-right font-mono text-gray-500">{item.fmt(item.ref)}</td>
              <td className="py-1.5 text-right">
                {diff != null ? (
                  <span
                    className="font-mono font-bold text-[10px]"
                    style={{ color: favorable ? '#1E8449' : '#922B21' }}
                  >
                    {favorable ? '↑' : '↓'} {Math.abs(diff) > 100 ? fmtMn(Math.abs(diff)) : `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}`}
                  </span>
                ) : '—'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
