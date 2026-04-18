import { useMemo, useState, useEffect } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  Area, Legend, ComposedChart, ReferenceLine, Line,
} from 'recharts'
import { useCartographieData } from '../hooks/useCartographieData'
import type { NonVieRow } from '../types/cartographie'
import CartographieLayout from '../components/cartographie/CartographieLayout'
import CartographieKPIGrid from '../components/cartographie/CartographieKPIGrid'
import RegionLegend from '../components/cartographie/RegionLegend'
import AfricaMap from '../components/cartographie/AfricaMap'
import ConfigurableScatterBubble, { ConfigurableScatterPoint, MetricDef } from '../components/cartographie/ConfigurableScatterBubble'
import CountryTable, { TableColumn } from '../components/cartographie/CountryTable'
import InsightPanel from '../components/cartographie/InsightPanel'
import AnimatedControls from '../components/cartographie/AnimatedControls'
import RegionalDonutChart from '../components/cartographie/RegionalDonutChart'
import {
  useChoroplethInsights,
  computeScatterInsights,
  useStructureInsights,
  useTop10Insights,
  useEvolutionInsights,
  useSPDistributionInsights,
  useCountryInsights,
  useRankingInsights,
  useBarRegionalInsights,
} from '../hooks/useNonVieInsights'
import { REGION_COLORS, ALL_REGIONS } from '../utils/cartographieConstants'

// ── Formatters ──────────────────────────────────────────────────────────────
const fmtMn = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)} Md$` : `${v.toFixed(0)} Mn$`
const fmtPct = (v: number) => `${v.toFixed(1)}%`
const fmtUsd = (v: number) => `${v.toFixed(1)}$`

type YearSel = number | 'avg'
type TabId = 'kpis' | 'top10' | 'carte' | 'scatter' | 'evolution' | 'structure' | 'distribution' | 'detail' | 'tableau'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'kpis',         label: 'KPIs',             icon: '📊' },
  { id: 'top10',        label: 'Top 10',            icon: '🏆' },
  { id: 'carte',        label: 'Carte',             icon: '🗺️' },
  { id: 'scatter',      label: 'Scatter',           icon: '🎯' },
  { id: 'evolution',    label: 'Évolution',         icon: '📈' },
  { id: 'structure',    label: 'Structure',         icon: '🥧' },
  { id: 'distribution', label: 'Distribution S/P', icon: '📉' },
  { id: 'detail',       label: 'Détail Pays',       icon: '🌍' },
  { id: 'tableau',      label: 'Classement',        icon: '📋' },
]

// ── Tab Navigation Bar ──────────────────────────────────────────────────────
function TabNav({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (t: TabId) => void }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden mb-1"
      style={{ border: '1px solid hsl(0,0%,90%)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div className="flex overflow-x-auto scrollbar-hide">
        {TABS.map((tab, i) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all relative flex-shrink-0"
              style={active ? {
                color: 'hsl(213,60%,27%)',
                background: 'hsla(213,60%,27%,0.08)',
                borderBottom: '2px solid hsl(213,60%,27%)',
              } : {
                color: '#6b7280',
                borderBottom: '2px solid transparent',
              }}
              id={`tab-nv-${tab.id}`}
            >
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

// ── Tab Progress Indicator ──────────────────────────────────────────────────
function TabProgress({ activeTab }: { activeTab: TabId }) {
  const currentIndex = TABS.findIndex(t => t.id === activeTab)
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {TABS.map((tab, i) => (
        <div key={tab.id} className="h-1 rounded-full transition-all" style={{
          flex: 1,
          background: i === currentIndex
            ? 'hsl(213,60%,27%)'
            : i < currentIndex
            ? 'hsla(213,60%,27%,0.35)'
            : 'hsl(0,0%,90%)',
        }} />
      ))}
    </div>
  )
}

export default function CartographieNonVie() {
  const { data, years, countries, loading, error } = useCartographieData('non-vie')
  const maxYear = years.length ? years[years.length - 1] : 2024

  const [activeTab, setActiveTab] = useState<TabId>('kpis')

  useEffect(() => {
    const container = document.getElementById('scar-main-scroll')
    if (container) container.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [activeTab])

  const currentTabIdx = TABS.findIndex(t => t.id === activeTab)
  const goPrev = () => { if (currentTabIdx > 0) setActiveTab(TABS[currentTabIdx - 1].id) }
  const goNext = () => { if (currentTabIdx < TABS.length - 1) setActiveTab(TABS[currentTabIdx + 1].id) }

  const yearRows = useMemo(
    () => (y: number) => data.filter(r => r.annee === y),
    [data]
  )

  const latestRows = useMemo(() => yearRows(maxYear), [yearRows, maxYear])

  // ── KPIs Macro ──
  const kpis = useMemo(() => {
    if (!latestRows.length) return []
    const primesAll = latestRows.map(r => r.primes_emises_mn_usd ?? 0).reduce((a, b) => a + b, 0)
    const growth = latestRows.map(r => r.croissance_primes_pct).filter((v): v is number => v != null)
    const growthMed = median(growth)
    const pen = latestRows.map(r => r.taux_penetration_pct).filter((v): v is number => v != null)
    const penAvg = avg(pen)
    const sp = latestRows.map(r => r.ratio_sp_pct).filter((v): v is number => v != null)
    const spMed = median(sp)
    return [
      { label: 'Primes Non-Vie totales', value: fmtMn(primesAll), sublabel: `${maxYear} · 34 pays`, accent: 'navy' as const },
      { label: 'Croissance médiane', value: fmtPct(growthMed), sublabel: `${maxYear}`, accent: 'green' as const },
      { label: 'Pénétration moyenne', value: fmtPct(penAvg), sublabel: 'Primes / PIB', accent: 'olive' as const },
      { label: 'Ratio S/P médian', value: fmtPct(spMed), sublabel: 'Seuil technique 70 %', accent: 'amber' as const },
    ]
  }, [latestRows, maxYear])

  // ── Top 10 ──
  const [top10Year, setTop10Year] = useState<YearSel>(maxYear)
  const top10 = useMemo(() => {
    let rows: { pays: string; region: string; value: number }[]
    if (top10Year === 'avg') {
      const acc: Record<string, { region: string; total: number; count: number }> = {}
      for (const r of data) {
        if (r.primes_emises_mn_usd == null) continue
        if (!acc[r.pays]) acc[r.pays] = { region: r.region ?? 'Autre', total: 0, count: 0 }
        acc[r.pays].total += r.primes_emises_mn_usd
        acc[r.pays].count++
      }
      rows = Object.entries(acc).map(([pays, { region, total, count }]) => ({
        pays, region, value: count ? total / count : 0,
      }))
    } else {
      rows = data
        .filter(r => r.annee === top10Year && r.primes_emises_mn_usd != null)
        .map(r => ({ pays: r.pays, region: r.region ?? 'Autre', value: r.primes_emises_mn_usd ?? 0 }))
    }
    return rows.sort((a, b) => b.value - a.value).slice(0, 10)
  }, [top10Year, data])

  const top10Insights = useTop10Insights(data, top10Year)

  // ── Map rows by country/year for AfricaMap ──
  const mapMatrix = useMemo(() => buildMatrix(data, 'primes_emises_mn_usd'), [data])
  const mapMatrixSP = useMemo(() => buildMatrix(data, 'ratio_sp_pct'), [data])
  const mapMatrixPen = useMemo(() => buildMatrix(data, 'taux_penetration_pct'), [data])
  const mapMatrixDens = useMemo(() => buildMatrix(data, 'densite_assurance_usd'), [data])
  const mapMatrixGrowth = useMemo(() => buildMatrix(data, 'croissance_primes_pct'), [data])

  const mapIndicators = [
    { key: 'primes', label: 'Primes Émises (Mn USD)', scale: 'primes' as const, format: fmtMn },
    { key: 'sp', label: 'Ratio S/P (%)', scale: 'sp' as const, format: fmtPct },
    { key: 'pen', label: 'Pénétration (%)', scale: 'penetration' as const, format: (v: number) => v.toFixed(2) + '%' },
    { key: 'dens', label: 'Densité (USD/hab)', scale: 'densite' as const, format: fmtUsd },
    { key: 'growth', label: 'Croissance (%)', scale: 'croissance' as const, format: fmtPct },
  ]

  const allMapMatrices: Record<string, Record<number, Record<string, number | null>>> = useMemo(() => ({
    primes: mapMatrix,
    sp: mapMatrixSP,
    pen: mapMatrixPen,
    dens: mapMatrixDens,
    growth: mapMatrixGrowth,
  }), [mapMatrix, mapMatrixSP, mapMatrixPen, mapMatrixDens, mapMatrixGrowth])

  const choroplethInsights = useChoroplethInsights(data)

  // ── Scatter multi-axes ──
  const scatterMetrics: MetricDef[] = useMemo(() => [
    { key: 'penetration', label: 'Pénétration (%)', format: fmtPct },
    { key: 'densite', label: 'Densité (USD/hab)', format: fmtUsd },
    { key: 'croissance', label: 'Croissance Primes (%)', format: fmtPct, ref: 0 },
    { key: 'sp', label: 'Ratio S/P (%)', format: fmtPct, ref: 70 },
  ], [])

  const [scatterExcludeSA, setScatterExcludeSA] = useState(false)

  const scatterAllByYear = useMemo(() => {
    const out: Record<number, ConfigurableScatterPoint[]> = {}
    for (const r of data) {
      if (r.primes_emises_mn_usd == null || r.primes_emises_mn_usd <= 0) continue
      if (scatterExcludeSA && r.pays === 'Afrique du Sud') continue
      ;(out[r.annee] ??= []).push({
        pays: r.pays,
        region: r.region ?? 'Autre',
        primes: r.primes_emises_mn_usd,
        penetration: r.taux_penetration_pct,
        densite: r.densite_assurance_usd,
        croissance: r.croissance_primes_pct,
        sp: r.ratio_sp_pct,
      })
    }
    return out
  }, [data, scatterExcludeSA])

  const [scatterXKey, setScatterXKey] = useState('penetration')
  const [scatterYKey, setScatterYKey] = useState('croissance')
  const scatterInsights = useMemo(
    () => computeScatterInsights(scatterXKey, scatterYKey, scatterExcludeSA ? data.filter(d => d.pays !== 'Afrique du Sud') : data),
    [scatterXKey, scatterYKey, data, scatterExcludeSA]
  )

  const evolutionInsights = useEvolutionInsights(data)
  const spDistributionInsights = useSPDistributionInsights(data)

  // ── Évolution par région ──
  const evoData = useMemo(() => {
    const out: Record<number, any> = {}
    for (const r of data) {
      const reg = r.region ?? 'Autre'
      if (!out[r.annee]) out[r.annee] = { annee: r.annee }
      out[r.annee][reg] = (out[r.annee][reg] ?? 0) + (r.primes_emises_mn_usd ?? 0)
    }
    return Object.values(out).sort((a: any, b: any) => a.annee - b.annee)
  }, [data])

  // ── Bar régional ──
  const [barYear, setBarYear] = useState(maxYear)
  const [barShowAvg, setBarShowAvg] = useState(false)
  const barRegional = useMemo(() => {
    const acc: Record<string, number> = {}
    if (barShowAvg) {
      for (const r of data) {
        const reg = r.region ?? 'Autre'
        acc[reg] = (acc[reg] ?? 0) + (r.primes_emises_mn_usd ?? 0)
      }
      const n = years.length || 1
      return Object.entries(acc).map(([region, value]) => ({ region, value: value / n })).sort((a, b) => b.value - a.value)
    }
    for (const r of data.filter(r => r.annee === barYear)) {
      const reg = r.region ?? 'Autre'
      acc[reg] = (acc[reg] ?? 0) + (r.primes_emises_mn_usd ?? 0)
    }
    return Object.entries(acc).map(([region, value]) => ({ region, value })).sort((a, b) => b.value - a.value)
  }, [barYear, barShowAvg, data, years])

  const barRegionalInsights = useBarRegionalInsights(data, barYear, barShowAvg, years)

  // ── Structure (donut) ──
  const [pieYear, setPieYear] = useState(maxYear)
  const [pieShowAvg, setPieShowAvg] = useState(false)
  const structureInsights = useStructureInsights(data, pieShowAvg ? 'avg' : pieYear)

  // ── Distribution S/P ──
  const [boxYear, setBoxYear] = useState<YearSel>(maxYear)
  const boxByRegion = useMemo(() => {
    const source = boxYear === 'avg' ? data : data.filter(r => r.annee === boxYear)
    const byReg: Record<string, number[]> = {}
    for (const r of source) {
      const reg = r.region ?? 'Autre'
      if (r.ratio_sp_pct != null) {
        byReg[reg] = byReg[reg] ?? []
        byReg[reg].push(r.ratio_sp_pct)
      }
    }
    return Object.entries(byReg).map(([region, vals]) => {
      vals.sort((a, b) => a - b)
      const q = (p: number) => vals[Math.floor(p * (vals.length - 1))]
      return { region, min: vals[0], q1: q(0.25), median: q(0.5), q3: q(0.75), max: vals[vals.length - 1] }
    }).sort((a, b) => ALL_REGIONS.indexOf(a.region) - ALL_REGIONS.indexOf(b.region))
  }, [boxYear, data])

  // ── Détail pays ──
  const sortedCountries = useMemo(() => [...countries].sort(), [countries])
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const effectiveCountry = selectedCountry || sortedCountries[0] || ''
  const countryTimeseries = useMemo(() => {
    return data.filter(r => r.pays === effectiveCountry).sort((a, b) => a.annee - b.annee)
  }, [data, effectiveCountry])

  const { cards: countryInsights, region: countryRegion, coverage: countryCoverage } = useCountryInsights(data, effectiveCountry)
  const rankingInsights = useRankingInsights(data)

  // ── Tableau ──
  const [tableYear, setTableYear] = useState<YearSel>(maxYear)
  const tableRows = useMemo(() => {
    if (tableYear === 'avg') {
      const acc: Record<string, { region: string; primes: number[]; croissance: number[]; penetration: number[]; sp: number[]; densite: number[] }> = {}
      for (const r of data) {
        if (!acc[r.pays]) acc[r.pays] = { region: r.region ?? 'Autre', primes: [], croissance: [], penetration: [], sp: [], densite: [] }
        if (r.primes_emises_mn_usd != null) acc[r.pays].primes.push(r.primes_emises_mn_usd)
        if (r.croissance_primes_pct != null) acc[r.pays].croissance.push(r.croissance_primes_pct)
        if (r.taux_penetration_pct != null) acc[r.pays].penetration.push(r.taux_penetration_pct)
        if (r.ratio_sp_pct != null) acc[r.pays].sp.push(r.ratio_sp_pct)
        if (r.densite_assurance_usd != null) acc[r.pays].densite.push(r.densite_assurance_usd)
      }
      return Object.entries(acc).map(([pays, v]) => ({
        pays,
        region: v.region,
        primes: v.primes.length ? avg(v.primes) : null,
        croissance: v.croissance.length ? avg(v.croissance) : null,
        penetration: v.penetration.length ? avg(v.penetration) : null,
        sp: v.sp.length ? avg(v.sp) : null,
        densite: v.densite.length ? avg(v.densite) : null,
      }))
    }
    return data.filter(r => r.annee === tableYear).map(r => ({
      pays: r.pays,
      region: r.region ?? 'Autre',
      primes: r.primes_emises_mn_usd,
      croissance: r.croissance_primes_pct,
      penetration: r.taux_penetration_pct,
      sp: r.ratio_sp_pct,
      densite: r.densite_assurance_usd,
    }))
  }, [tableYear, data])

  const tableCols: TableColumn<typeof tableRows[number]>[] = [
    { key: 'pays', label: 'Pays' },
    { key: 'region', label: 'Région' },
    { key: 'primes', label: 'Primes (Mn USD)', numeric: true, format: v => v != null ? fmtMn(v) : '—' },
    { key: 'croissance', label: 'Croissance', numeric: true, format: v => v != null ? fmtPct(v) : '—' },
    { key: 'penetration', label: 'Pénétration', numeric: true, format: v => v != null ? fmtPct(v) : '—' },
    {
      key: 'sp', label: 'Ratio S/P', numeric: true,
      format: v => v != null ? fmtPct(v) : '—',
      badge: v => {
        if (v == null) return null
        if (v < 70) return { color: '#1E8449', bg: 'hsla(140,50%,40%,0.12)' }
        if (v < 90) return { color: '#B9770E', bg: 'hsla(35,85%,55%,0.12)' }
        return { color: '#922B21', bg: 'hsla(0,60%,50%,0.12)' }
      },
    },
    { key: 'densite', label: 'Densité', numeric: true, format: v => v != null ? fmtUsd(v) : '—' },
  ]

  if (loading) return <LoadingState />
  if (error) return <ErrorState msg={error} />

  return (
    <CartographieLayout
      title="Cartographie — Assurance Non-Vie"
      subtitle="Analyse du marché non-vie sur 34 pays africains (2015–2024) : primes, pénétration, ratio S/P et densité."
      dataSource="Axco Navigator · Backcasting"
      navItems={[]}
    >
      {/* ── Tab Navigation ─────────────────────────────────────────────── */}
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      <TabProgress activeTab={activeTab} />

      {/* ── Tab Content ────────────────────────────────────────────────── */}
      <div className="space-y-5">

        {/* ── KPIs ─────────────────────────────────────────────────────── */}
        {activeTab === 'kpis' && (
          <div className="space-y-5 animate-fade-in">
            <RegionLegend />
            <CartographieKPIGrid kpis={kpis} />
          </div>
        )}

        {/* ── Top 10 ───────────────────────────────────────────────────── */}
        {activeTab === 'top10' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <h2 className="text-sm font-bold text-gray-700">Top 10 pays par primes émises</h2>
              <YearOrAvgNav years={years} value={top10Year} onChange={setTop10Year} />
            </div>
            <div className="bg-white rounded-xl p-5"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 40, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtMn} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="pays" tick={{ fontSize: 11, fill: '#374151' }} width={100} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0' }} formatter={(v: number) => fmtMn(v)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {top10.map((t, i) => <Cell key={i} fill={REGION_COLORS[t.region] ?? REGION_COLORS.Autre} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <InsightPanel icon="🏆" title="Analyse du classement" cards={top10Insights} />
          </div>
        )}

        {/* ── Carte ────────────────────────────────────────────────────── */}
        {activeTab === 'carte' && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-sm font-bold text-gray-700">Carte choroplèthe — Afrique</h2>
            <AfricaMap
              indicators={mapIndicators}
              rowsByCountryYear={allMapMatrices}
              years={years}
              defaultYear={maxYear}
            />
            <InsightPanel icon="🗺️" title="Lecture de la carte" subtitle="Calculés sur la moyenne 2015–2024" cards={choroplethInsights} />
          </div>
        )}

        {/* ── Scatter ──────────────────────────────────────────────────── */}
        {activeTab === 'scatter' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-bold text-gray-700">Scatter multi-axes — composez votre vue</h2>
                <p className="text-xs text-gray-500 mt-1">Note : La taille des bulles représente les primes émises.</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 bg-white px-3 py-1.5 rounded-full border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm ml-auto">
                <input
                  type="checkbox"
                  checked={scatterExcludeSA}
                  onChange={e => setScatterExcludeSA(e.target.checked)}
                  className="accent-[#1B3F6B] w-4 h-4 rounded cursor-pointer"
                />
                Exclure l'Afrique du Sud
              </label>
            </div>
            <ConfigurableScatterBubble
              title="Scatter multi-axes"
              metrics={scatterMetrics}
              defaultX="penetration"
              defaultY="croissance"
              sizeLabel="Primes (Mn USD)"
              sizeFormat={fmtMn}
              pointsByYear={scatterAllByYear}
              years={years}
              defaultYear={maxYear}
              onAxesChange={(x, y) => { setScatterXKey(x); setScatterYKey(y) }}
            />
            <InsightPanel
              icon={
                ((scatterXKey === 'penetration' && scatterYKey === 'densite') || (scatterXKey === 'densite' && scatterYKey === 'penetration')) ? '📈' :
                ((scatterXKey === 'croissance' && scatterYKey === 'sp') || (scatterXKey === 'sp' && scatterYKey === 'croissance')) ? '💰' :
                ((scatterXKey === 'densite' && scatterYKey === 'croissance') || (scatterXKey === 'croissance' && scatterYKey === 'densite')) ? '📉' :
                ((scatterXKey === 'penetration' && scatterYKey === 'croissance') || (scatterXKey === 'croissance' && scatterYKey === 'penetration')) ? '🌎' :
                ((scatterXKey === 'penetration' && scatterYKey === 'sp') || (scatterXKey === 'sp' && scatterYKey === 'penetration')) ? '💎' :
                ((scatterXKey === 'densite' && scatterYKey === 'sp') || (scatterXKey === 'sp' && scatterYKey === 'densite')) ? '🛡️' : '📊'
              }
              title={
                (scatterXKey === 'penetration' && scatterYKey === 'densite') ||
                (scatterXKey === 'densite' && scatterYKey === 'penetration')
                  ? 'PÉNÉTRATION VS DENSITÉ'
                  : (scatterXKey === 'croissance' && scatterYKey === 'sp') ||
                    (scatterXKey === 'sp' && scatterYKey === 'croissance')
                  ? 'RENTABILITÉ VS DYNAMISME'
                  : (scatterXKey === 'densite' && scatterYKey === 'croissance') ||
                    (scatterXKey === 'croissance' && scatterYKey === 'densite')
                  ? 'DENSITÉ VS CROISSANCE'
                  : (scatterXKey === 'penetration' && scatterYKey === 'croissance') ||
                    (scatterXKey === 'croissance' && scatterYKey === 'penetration')
                  ? 'PÉNÉTRATION VS CROISSANCE'
                  : (scatterXKey === 'penetration' && scatterYKey === 'sp') ||
                    (scatterXKey === 'sp' && scatterYKey === 'penetration')
                  ? 'PÉNÉTRATION VS RENTABILITÉ'
                  : (scatterXKey === 'densite' && scatterYKey === 'sp') ||
                    (scatterXKey === 'sp' && scatterYKey === 'densite')
                  ? 'DENSITÉ VS RENTABILITÉ'
                  : 'ANALYSE MULTI-AXES'
              }
              subtitle="Se recalcule automatiquement selon les axes sélectionnés"
              cards={scatterInsights}
            />
          </div>
        )}

        {/* ── Évolution ────────────────────────────────────────────────── */}
        {activeTab === 'evolution' && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-sm font-bold text-gray-700">Évolution des primes par région 2015–2024</h2>
            <div className="bg-white rounded-xl p-5"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <ResponsiveContainer width="100%" height={380}>
                <ComposedChart data={evoData as any[]} margin={{ top: 10, right: 75, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="left" tickFormatter={fmtMn} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={fmtMn} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0', fontSize: 12 }} formatter={(v: number) => fmtMn(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {ALL_REGIONS.map(reg => (
                    <Area
                      key={reg}
                      yAxisId="left"
                      type="monotone"
                      dataKey={reg}
                      stackId="1"
                      stroke={REGION_COLORS[reg] ?? REGION_COLORS.Autre}
                      fill={REGION_COLORS[reg] ?? REGION_COLORS.Autre}
                      fillOpacity={0.7}
                    />
                  ))}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="Afrique du Sud"
                    name="Afrique du Sud"
                    stroke={REGION_COLORS['Afrique du Sud']}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: REGION_COLORS['Afrique du Sud'] }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <InsightPanel
              icon="📈"
              title="Dynamiques de croissance régionale"
              subtitle="Calculés sur les CAGR réels 2015–2024 et l'accélération post-2020"
              cards={evolutionInsights}
            />

            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <h3 className="text-sm font-bold text-gray-700">Primes par région</h3>
              <AnimatedControls years={years} value={barYear} onChange={y => { setBarYear(y); setBarShowAvg(false) }} />
              <button
                onClick={() => setBarShowAvg(v => !v)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${barShowAvg ? 'bg-[#1B3F6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Moy. 2015–2024
              </button>
            </div>
            <div className="bg-white rounded-xl p-5"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={barRegional}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tickFormatter={fmtMn} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0' }} formatter={(v: number) => fmtMn(v)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barRegional.map((b, i) => <Cell key={i} fill={REGION_COLORS[b.region] ?? REGION_COLORS.Autre} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <InsightPanel
              icon="📊"
              title="PRIMES PAR RÉGION — ANALYSE COMPARATIVE"
              subtitle={barShowAvg ? 'Calculés sur la moyenne 2015–2024' : `Calculés sur l'année ${barYear} · CAGR sur toute la série`}
              cards={barRegionalInsights}
            />
          </div>
        )}

        {/* ── Structure ────────────────────────────────────────────────── */}
        {activeTab === 'structure' && (
          <div className="space-y-5 animate-fade-in">
            <RegionalDonutChart
              data={data}
              years={years}
              year={pieYear}
              showAvg={pieShowAvg}
              onYearChange={y => { setPieYear(y); setPieShowAvg(false) }}
              onToggleAvg={() => setPieShowAvg(v => !v)}
            />
            <InsightPanel
              icon="🥧"
              title="STRUCTURE RÉGIONALE DU MARCHÉ"
              subtitle="Répartition des primes par zone géographique (hors South Africa)"
              cards={structureInsights}
            />
          </div>
        )}

        {/* ── Distribution S/P ─────────────────────────────────────────── */}
        {activeTab === 'distribution' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-sm font-bold text-gray-700">Distribution du Ratio S/P par région</h2>
              <YearOrAvgNav years={years} value={boxYear} onChange={setBoxYear} />
            </div>
            <div className="bg-white rounded-xl p-5"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={boxByRegion}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tickFormatter={fmtPct} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0', fontSize: 12 }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="bg-white rounded-lg p-3 shadow-lg border border-gray-200 text-xs">
                          <p className="font-bold">{d.region}</p>
                          <p>Médiane : <b>{fmtPct(d.median)}</b></p>
                          <p>Q1–Q3 : {fmtPct(d.q1)} – {fmtPct(d.q3)}</p>
                          <p>Min–Max : {fmtPct(d.min)} – {fmtPct(d.max)}</p>
                        </div>
                      )
                    }}
                  />
                  <ReferenceLine y={70} stroke="#E74C3C" strokeDasharray="4 4" label={{ value: 'Seuil 70 %', fontSize: 10, fill: '#E74C3C', position: 'right' }} />
                  <Bar dataKey="q3" fill="hsla(200,55%,55%,0.45)" />
                  <Bar dataKey="q1" fill="white" />
                  <Line type="monotone" dataKey="median" stroke="#1B3F6B" dot={{ r: 4, fill: '#1B3F6B' }} strokeWidth={0} />
                  <Line type="monotone" dataKey="max" stroke="#94a3b8" dot={{ r: 2 }} strokeWidth={0} />
                  <Line type="monotone" dataKey="min" stroke="#94a3b8" dot={{ r: 2 }} strokeWidth={0} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <InsightPanel
              icon="📊"
              title="DISTRIBUTION S/P PAR RÉGION"
              subtitle="Volatilité et sinistralité comparées 2015–2024"
              cards={spDistributionInsights}
            />
          </div>
        )}

        {/* ── Détail Pays ──────────────────────────────────────────────── */}
        {activeTab === 'detail' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-gray-700">Détail par pays</h2>
              <select
                aria-label="Pays"
                value={effectiveCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300"
              >
                {sortedCountries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="bg-white rounded-xl p-5"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={countryTimeseries as any[]} margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Line yAxisId="left" type="monotone" dataKey="primes_emises_mn_usd" name="Primes" stroke="#1B3F6B" strokeWidth={2.5} dot={{ r: 4 }} />
                  <YAxis yAxisId="left" orientation="left" tickFormatter={fmtMn} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={fmtPct} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="right" dataKey="ratio_sp_pct" name="Ratio S/P" radius={[3, 3, 0, 0]} fillOpacity={0.6}>
                    {countryTimeseries.map((r, i) => (
                      <Cell key={i} fill={(r.ratio_sp_pct ?? 0) >= 70 ? '#E74C3C' : '#1E8449'} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="taux_penetration_pct" name="Pénétration" stroke="#E8940C" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="croissance_primes_pct" name="Croissance" stroke="#8E44AD" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <InsightPanel
              icon="🌍"
              title={`PROFIL NON-VIE - ${effectiveCountry.toUpperCase()}`}
              subtitle={`Region : ${countryRegion || '-'} - Analyse complete ${countryCoverage}`}
              cards={countryInsights}
            />
          </div>
        )}

        {/* ── Classement ───────────────────────────────────────────────── */}
        {activeTab === 'tableau' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-sm font-bold text-gray-700">Classement des pays</h2>
              <YearOrAvgNav years={years} value={tableYear} onChange={setTableYear} />
            </div>
            <CountryTable rows={tableRows} columns={tableCols} initialSort="primes" showRank />
            <InsightPanel
              icon="🏆"
              title="CLASSEMENT DES PAYS — INDICATEURS CLES"
              subtitle="Top 5 par critere de selection Atlantic Re"
              cards={rankingInsights}
            />
          </div>
        )}

      </div>

      {/* ── Prev / Next navigation ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: '1px solid hsl(0,0%,93%)' }}>
        <button
          onClick={goPrev}
          disabled={currentTabIdx === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
          style={currentTabIdx === 0
            ? { background: 'hsl(0,0%,96%)', color: '#d1d5db', cursor: 'not-allowed' }
            : { background: 'hsl(0,0%,97%)', color: '#374151', border: '1px solid hsl(0,0%,88%)', cursor: 'pointer' }}
        >
          <span>←</span>
          <span>{currentTabIdx > 0 ? TABS[currentTabIdx - 1].label : '—'}</span>
        </button>
        <span className="text-xs text-gray-400 font-medium">{currentTabIdx + 1} / {TABS.length}</span>
        <button
          onClick={goNext}
          disabled={currentTabIdx === TABS.length - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
          style={currentTabIdx === TABS.length - 1
            ? { background: 'hsl(0,0%,96%)', color: '#d1d5db', cursor: 'not-allowed' }
            : { background: 'hsl(213,60%,27%)', color: 'white', cursor: 'pointer' }}
        >
          <span>{currentTabIdx < TABS.length - 1 ? TABS[currentTabIdx + 1].label : '—'}</span>
          <span>→</span>
        </button>
      </div>
    </CartographieLayout>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function avg(arr: number[]): number { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0 }
function median(arr: number[]): number {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function buildMatrix(rows: NonVieRow[], key: keyof NonVieRow): Record<number, Record<string, number | null>> {
  const m: Record<number, Record<string, number | null>> = {}
  for (const r of rows) {
    if (!m[r.annee]) m[r.annee] = {}
    m[r.annee][r.pays] = (r[key] as number | null) ?? null
  }
  return m
}

function YearOrAvgNav({ years, value, onChange }: { years: number[]; value: YearSel; onChange: (v: YearSel) => void }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {years.map(y => (
        <button
          key={y}
          onClick={() => onChange(y)}
          className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${value === y ? 'bg-[#1B3F6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          {y}
        </button>
      ))}
      <button
        onClick={() => onChange('avg')}
        className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${value === 'avg' ? 'bg-[#1B3F6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
      >
        Moy. 2015–2024
      </button>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="p-10 text-center text-gray-500">
      <div className="animate-pulse text-sm">Chargement des données de cartographie…</div>
    </div>
  )
}
function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="p-10 text-center text-red-500">
      <p className="text-sm font-semibold">Erreur de chargement</p>
      <p className="text-xs mt-1">{msg}</p>
    </div>
  )
}
