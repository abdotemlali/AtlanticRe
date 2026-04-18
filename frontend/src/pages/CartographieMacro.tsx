/**
 * CartographieMacro — Cartographie Macroéconomique Afrique
 * 7 indicateurs : PIB, croissance, inflation, compte courant, taux de change, PIB/hab, intégration régionale.
 * Navigation par onglets paginés (style AnalysePays).
 */
import { useMemo, useState, useEffect } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  Area, Legend, ComposedChart, ReferenceLine, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { useCartographieData } from '../hooks/useCartographieData'
import type { MacroRow } from '../types/cartographie'
import CartographieLayout from '../components/cartographie/CartographieLayout'
import CartographieKPIGrid from '../components/cartographie/CartographieKPIGrid'
import RegionLegend from '../components/cartographie/RegionLegend'
import AfricaMap from '../components/cartographie/AfricaMap'
import ConfigurableScatterBubble, { ConfigurableScatterPoint, MetricDef } from '../components/cartographie/ConfigurableScatterBubble'
import CountryTable, { TableColumn } from '../components/cartographie/CountryTable'
import InsightPanel from '../components/cartographie/InsightPanel'
import AnimatedControls from '../components/cartographie/AnimatedControls'
import HeatmapChart from '../components/cartographie/HeatmapChart'
import {
  useMacroChoroplethInsights,
  computeMacroScatterInsights,
  useMacroEvolutionInsights,
  useMacroTop10Insights,
  useMacroBarRegionalInsights,
  useMacroInflationDistributionInsights,
  useMacroIntegrationInsights,
  useMacroCountryInsights,
  useMacroRankingInsights,
} from '../hooks/useMacroInsights'
import { REGION_COLORS, ALL_REGIONS } from '../utils/cartographieConstants'

// ── Formatters ──────────────────────────────────────────────────────────────
const fmtBn = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)} Mrd` : `$${v.toFixed(0)}M`
const fmtPct = (v: number) => `${v.toFixed(1)}%`
const fmtPctSgn = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
const fmtUsd = (v: number) => `$${v.toFixed(0)}/hab`
const fmtScore = (v: number) => v.toFixed(3)

type YearSel = number | 'avg'
type TabId = 'kpis' | 'top10' | 'carte' | 'scatter' | 'evolution' | 'inflation' | 'integration' | 'detail' | 'tableau'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'kpis',        label: 'KPIs',                   icon: '📊' },
  { id: 'top10',       label: 'Top 10 PIB',             icon: '🏆' },
  { id: 'carte',       label: 'Carte',                  icon: '🗺️' },
  { id: 'scatter',     label: 'Scatter',                icon: '🎯' },
  { id: 'evolution',   label: 'Évolution PIB',          icon: '📈' },
  { id: 'inflation',   label: 'Inflation',              icon: '🌡️' },
  { id: 'integration', label: 'Intégration',            icon: '🤝' },
  { id: 'detail',      label: 'Détail Pays',            icon: '🌍' },
  { id: 'tableau',     label: 'Classement',             icon: '📋' },
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
                color: 'hsl(35,85%,30%)',
                background: 'hsla(35,85%,55%,0.10)',
                borderBottom: '2px solid hsl(35,85%,55%)',
              } : {
                color: '#6b7280',
                borderBottom: '2px solid transparent',
              }}
              id={`tab-macro-${tab.id}`}
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
            ? 'hsl(35,85%,55%)'
            : i < currentIndex
            ? 'hsla(35,85%,55%,0.35)'
            : 'hsl(0,0%,90%)',
        }} />
      ))}
    </div>
  )
}

export default function CartographieMacro() {
  const { data, years, countries, loading, error } = useCartographieData('macroeconomie')
  const maxYear = years.length ? years[years.length - 1] : 2024

  const [activeTab, setActiveTab] = useState<TabId>('kpis')

  useEffect(() => {
    const container = document.getElementById('scar-main-scroll')
    if (container) container.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [activeTab])

  const currentTabIdx = TABS.findIndex(t => t.id === activeTab)
  const goPrev = () => { if (currentTabIdx > 0) setActiveTab(TABS[currentTabIdx - 1].id) }
  const goNext = () => { if (currentTabIdx < TABS.length - 1) setActiveTab(TABS[currentTabIdx + 1].id) }

  // SA est traité comme un pays normal dans cartographie macro — appartient à Afrique Australe
  const macroData = useMemo(
    () => data.map(r => r.pays === 'Afrique du Sud' && (r.region === 'Afrique du Sud' || r.region == null)
      ? { ...r, region: 'Afrique Australe' }
      : r),
    [data]
  )

  const yearRows = useMemo(() => (y: number) => macroData.filter(r => r.annee === y), [macroData])
  const latestRows = useMemo(() => yearRows(maxYear), [yearRows, maxYear])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!latestRows.length) return []
    const growth = latestRows.map(r => r.gdp_growth_pct).filter((v): v is number => v != null)
    const infl = latestRows.map(r => r.inflation_rate_pct).filter((v): v is number => v != null)
    const gdpCap = latestRows.map(r => r.gdp_per_capita).filter((v): v is number => v != null)
    const topInteg = [...latestRows]
      .filter(r => r.integration_regionale_score != null)
      .sort((a, b) => (b.integration_regionale_score ?? 0) - (a.integration_regionale_score ?? 0))[0]
    return [
      { label: 'Croissance PIB médiane', value: fmtPct(median(growth)), sublabel: `${maxYear} · ${latestRows.length} pays`, accent: 'green' as const },
      { label: 'PIB/hab médian', value: fmtUsd(median(gdpCap)), sublabel: 'USD par habitant', accent: 'navy' as const },
      { label: 'Inflation médiane', value: fmtPct(median(infl)), sublabel: `${maxYear}`, accent: 'amber' as const },
      { label: 'Meilleure intégration', value: topInteg?.pays ?? '—', sublabel: topInteg?.integration_regionale_score != null ? `Score ${fmtScore(topInteg.integration_regionale_score)}` : '—', accent: 'olive' as const },
    ]
  }, [latestRows, maxYear])

  // ── Top 10 PIB ─────────────────────────────────────────────────────────────
  const [top10Year, setTop10Year] = useState<YearSel>(maxYear)
  const top10 = useMemo(() => {
    let rows: { pays: string; region: string; value: number }[]
    if (top10Year === 'avg') {
      const acc: Record<string, { region: string; total: number; count: number }> = {}
      for (const r of macroData) {
        if (r.gdp_mn == null) continue
        if (!acc[r.pays]) acc[r.pays] = { region: r.region ?? 'Autre', total: 0, count: 0 }
        acc[r.pays].total += r.gdp_mn
        acc[r.pays].count++
      }
      rows = Object.entries(acc).map(([pays, { region, total, count }]) => ({ pays, region, value: count ? total / count : 0 }))
    } else {
      rows = macroData.filter(r => r.annee === top10Year && r.gdp_mn != null).map(r => ({ pays: r.pays, region: r.region ?? 'Autre', value: r.gdp_mn ?? 0 }))
    }
    return rows.sort((a, b) => b.value - a.value).slice(0, 10)
  }, [top10Year, macroData])

  const top10Insights = useMacroTop10Insights(macroData, top10Year)

  // ── Map ─────────────────────────────────────────────────────────────────────
  const mapMatrixGdp = useMemo(() => buildMatrix(macroData, 'gdp_mn'), [macroData])
  const mapMatrixGdpCap = useMemo(() => buildMatrix(macroData, 'gdp_per_capita'), [macroData])
  const mapMatrixGrowth = useMemo(() => buildMatrix(macroData, 'gdp_growth_pct'), [macroData])
  const mapMatrixInfl = useMemo(() => buildMatrix(macroData, 'inflation_rate_pct'), [macroData])
  const mapMatrixCA = useMemo(() => buildMatrix(macroData, 'current_account_mn'), [macroData])
  const mapMatrixInteg = useMemo(() => buildMatrix(macroData, 'integration_regionale_score'), [macroData])

  const mapIndicators = [
    { key: 'gdp', label: 'PIB (Mn USD)', scale: 'gdp' as const, format: fmtBn },
    { key: 'gdpCap', label: 'PIB / hab (USD)', scale: 'gdpCap' as const, format: fmtUsd },
    { key: 'growth', label: 'Croissance PIB (%)', scale: 'croissance' as const, format: fmtPct },
    { key: 'infl', label: 'Inflation (%)', scale: 'inflation' as const, format: fmtPct },
    { key: 'ca', label: 'Compte courant (Mn USD)', scale: 'currentAcc' as const, format: (v: number) => `${fmtBn(v)}` },
    { key: 'integ', label: 'Intégration régionale', scale: 'wgi' as const, format: fmtScore },
  ]

  const allMapMatrices = useMemo(() => ({
    gdp: mapMatrixGdp, gdpCap: mapMatrixGdpCap, growth: mapMatrixGrowth,
    infl: mapMatrixInfl, ca: mapMatrixCA, integ: mapMatrixInteg,
  }), [mapMatrixGdp, mapMatrixGdpCap, mapMatrixGrowth, mapMatrixInfl, mapMatrixCA, mapMatrixInteg])

  const choroplethInsights = useMacroChoroplethInsights(macroData)

  // ── Scatter multi-axes ─────────────────────────────────────────────────────
  const scatterMetrics: MetricDef[] = useMemo(() => [
    { key: 'inflation', label: 'Inflation (%)', format: fmtPct, ref: 5 },
    { key: 'growth', label: 'Croissance PIB (%)', format: fmtPct, ref: 0 },
    { key: 'gdpCap', label: 'PIB/hab (USD)', format: fmtUsd },
    { key: 'currentAcc', label: 'Compte courant (Mn USD)', format: fmtBn, ref: 0 },
    { key: 'gdp', label: 'PIB (Mn USD)', format: fmtBn },
  ], [])

  const scatterAllByYear = useMemo(() => {
    const out: Record<number, ConfigurableScatterPoint[]> = {}
    for (const r of macroData) {
      if (r.gdp_mn == null || r.gdp_mn <= 0) continue
      ;(out[r.annee] ??= []).push({
        pays: r.pays,
        region: r.region ?? 'Autre',
        primes: r.gdp_mn,
        gdp: r.gdp_mn,
        inflation: r.inflation_rate_pct,
        growth: r.gdp_growth_pct,
        gdpCap: r.gdp_per_capita,
        currentAcc: r.current_account_mn,
      })
    }
    return out
  }, [macroData])

  const [scatterXKey, setScatterXKey] = useState('inflation')
  const [scatterYKey, setScatterYKey] = useState('growth')
  const scatterInsights = useMemo(
    () => computeMacroScatterInsights(scatterXKey, scatterYKey, macroData),
    [scatterXKey, scatterYKey, macroData]
  )

  // ── Évolution PIB par région ────────────────────────────────────────────────
  const evoData = useMemo(() => {
    const out: Record<number, any> = {}
    for (const r of macroData) {
      const reg = r.region ?? 'Autre'
      if (!out[r.annee]) out[r.annee] = { annee: r.annee }
      out[r.annee][reg] = (out[r.annee][reg] ?? 0) + (r.gdp_mn ?? 0)
    }
    return Object.values(out).sort((a: any, b: any) => a.annee - b.annee)
  }, [macroData])

  const evolutionInsights = useMacroEvolutionInsights(macroData)

  // ── Bar PIB par région ──────────────────────────────────────────────────────
  const [barYear, setBarYear] = useState(maxYear)
  const [barShowAvg, setBarShowAvg] = useState(false)
  const barRegional = useMemo(() => {
    const acc: Record<string, number> = {}
    const source = barShowAvg ? macroData : macroData.filter(r => r.annee === barYear)
    const nYrs = barShowAvg ? (years.length || 1) : 1
    for (const r of source) {
      const reg = r.region ?? 'Autre'
      acc[reg] = (acc[reg] ?? 0) + (r.gdp_mn ?? 0)
    }
    return Object.entries(acc).map(([region, total]) => ({ region, value: total / nYrs })).sort((a, b) => b.value - a.value)
  }, [barYear, barShowAvg, macroData, years])

  const barRegionalInsights = useMacroBarRegionalInsights(macroData, barYear, barShowAvg, years)

  // ── Heatmap inflation ───────────────────────────────────────────────────────
  const heatMatrix = useMemo(() => buildHeatMatrix(macroData, 'inflation_rate_pct'), [macroData])
  const heatRegions = useMemo(() => {
    const m: Record<string, string> = {}
    for (const r of macroData) m[r.pays] = r.region ?? 'Autre'
    return m
  }, [macroData])
  const inflationDistribInsights = useMacroInflationDistributionInsights(macroData)

  // ── Intégration régionale ───────────────────────────────────────────────────
  const integrationRows = useMemo(() => {
    const best: Record<string, { pays: string; region: string; score: number }> = {}
    for (const r of macroData) {
      if (r.integration_regionale_score == null) continue
      if (!best[r.pays] || r.integration_regionale_score > best[r.pays].score)
        best[r.pays] = { pays: r.pays, region: r.region ?? 'Autre', score: r.integration_regionale_score }
    }
    return Object.values(best).sort((a, b) => b.score - a.score)
  }, [macroData])

  const integrationInsights = useMacroIntegrationInsights(macroData)

  // ── Radar macro par région ──────────────────────────────────────────────────
  const radarData = useMemo(() => {
    const byReg: Record<string, { growth: number[]; inflation: number[]; gdpCap: number[]; integration: number[]; caPos: number }> = {}
    for (const r of macroData) {
      const reg = r.region ?? 'Autre'
      if (!byReg[reg]) byReg[reg] = { growth: [], inflation: [], gdpCap: [], integration: [], caPos: 0 }
      const e = byReg[reg]
      if (r.gdp_growth_pct != null) e.growth.push(r.gdp_growth_pct)
      if (r.inflation_rate_pct != null) e.inflation.push(r.inflation_rate_pct)
      if (r.gdp_per_capita != null) e.gdpCap.push(r.gdp_per_capita)
      if (r.integration_regionale_score != null) e.integration.push(r.integration_regionale_score)
      if ((r.current_account_mn ?? -1) > 0) e.caPos++
    }
    return Object.entries(byReg).map(([region, e]) => {
      const avgRow = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
      const avgGrow = avgRow(e.growth)
      const avgInfl = avgRow(e.inflation)
      const avgGdpCap = avgRow(e.gdpCap)
      const avgInteg = avgRow(e.integration)
      const growthScore = Math.min(100, Math.max(0, 20 + avgGrow * 8))
      const inflScore = Math.min(100, Math.max(0, 100 - avgInfl * 5))
      const gdpCapScore = Math.min(100, avgGdpCap / 120)
      const integScore = avgInteg * 100 / 0.65
      return { region, growthScore, inflScore, gdpCapScore, integScore }
    }).filter(r => r.region !== 'Autre').slice(0, 7)
  }, [macroData])

  // ── Détail pays ─────────────────────────────────────────────────────────────
  const sortedCountries = useMemo(() => [...countries].sort(), [countries])
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const effectiveCountry = selectedCountry || sortedCountries[0] || ''
  const countryTimeseries = useMemo(
    () => macroData.filter(r => r.pays === effectiveCountry).sort((a, b) => a.annee - b.annee),
    [macroData, effectiveCountry]
  )
  const { cards: countryInsights, region: countryRegion, coverage: countryCoverage } = useMacroCountryInsights(macroData, effectiveCountry)
  const rankingInsights = useMacroRankingInsights(macroData)

  // ── Tableau ─────────────────────────────────────────────────────────────────
  const [tableYear, setTableYear] = useState<YearSel>(maxYear)
  const tableRows = useMemo(() => {
    if (tableYear === 'avg') {
      const acc: Record<string, { region: string; gdp: number[]; gdpCap: number[]; growth: number[]; infl: number[]; ca: number[]; integ: number[] }> = {}
      for (const r of macroData) {
        if (!acc[r.pays]) acc[r.pays] = { region: r.region ?? 'Autre', gdp: [], gdpCap: [], growth: [], infl: [], ca: [], integ: [] }
        if (r.gdp_mn != null) acc[r.pays].gdp.push(r.gdp_mn)
        if (r.gdp_per_capita != null) acc[r.pays].gdpCap.push(r.gdp_per_capita)
        if (r.gdp_growth_pct != null) acc[r.pays].growth.push(r.gdp_growth_pct)
        if (r.inflation_rate_pct != null) acc[r.pays].infl.push(r.inflation_rate_pct)
        if (r.current_account_mn != null) acc[r.pays].ca.push(r.current_account_mn)
        if (r.integration_regionale_score != null) acc[r.pays].integ.push(r.integration_regionale_score)
      }
      return Object.entries(acc).map(([pays, e]) => ({
        pays, region: e.region,
        gdp: e.gdp.length ? avgArr(e.gdp) : null,
        gdpCap: e.gdpCap.length ? avgArr(e.gdpCap) : null,
        growth: e.growth.length ? avgArr(e.growth) : null,
        inflation: e.infl.length ? avgArr(e.infl) : null,
        currentAcc: e.ca.length ? avgArr(e.ca) : null,
        integration: e.integ.length ? avgArr(e.integ) : null,
      }))
    }
    return macroData.filter(r => r.annee === tableYear).map(r => ({
      pays: r.pays, region: r.region ?? 'Autre',
      gdp: r.gdp_mn, gdpCap: r.gdp_per_capita, growth: r.gdp_growth_pct,
      inflation: r.inflation_rate_pct, currentAcc: r.current_account_mn,
      integration: r.integration_regionale_score,
    }))
  }, [tableYear, macroData])

  const tableCols: TableColumn<typeof tableRows[number]>[] = [
    { key: 'pays', label: 'Pays' },
    { key: 'region', label: 'Région' },
    { key: 'gdp', label: 'PIB (Mn USD)', numeric: true, format: v => v != null ? fmtBn(v) : '—' },
    { key: 'gdpCap', label: 'PIB/hab', numeric: true, format: v => v != null ? fmtUsd(v) : '—' },
    {
      key: 'growth', label: 'Croissance', numeric: true,
      format: v => v != null ? fmtPctSgn(v) : '—',
      badge: v => {
        if (v == null) return null
        if (v >= 5) return { color: '#1E8449', bg: 'hsla(140,50%,40%,0.12)' }
        if (v >= 0) return { color: '#E8940C', bg: 'hsla(35,85%,55%,0.12)' }
        return { color: '#C0392B', bg: 'hsla(0,60%,50%,0.12)' }
      },
    },
    {
      key: 'inflation', label: 'Inflation', numeric: true,
      format: v => v != null ? fmtPct(v) : '—',
      badge: v => {
        if (v == null) return null
        if (v <= 5) return { color: '#1E8449', bg: 'hsla(140,50%,40%,0.12)' }
        if (v <= 10) return { color: '#E8940C', bg: 'hsla(35,85%,55%,0.12)' }
        return { color: '#C0392B', bg: 'hsla(0,60%,50%,0.12)' }
      },
    },
    { key: 'currentAcc', label: 'Compte Courant', numeric: true, format: v => v != null ? fmtBn(v) : '—' },
    { key: 'integration', label: 'Intégration', numeric: true, format: v => v != null ? fmtScore(v) : '—' },
  ]

  if (loading) return <div className="p-10 text-center text-gray-500 animate-pulse text-sm">Chargement des données macroéconomiques…</div>
  if (error) return <div className="p-10 text-center text-red-500"><p className="text-sm font-semibold">Erreur de chargement</p><p className="text-xs mt-1">{error}</p></div>

  return (
    <CartographieLayout
      title="Cartographie — Macroéconomie"
      subtitle="Analyse macroéconomique de 34 pays africains (2015–2024) : PIB, croissance, inflation, solde courant, taux de change et intégration régionale."
      dataSource="World Bank · IMF · UNCTAD"
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

        {/* ── Top 10 PIB ───────────────────────────────────────────────── */}
        {activeTab === 'top10' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <h2 className="text-sm font-bold text-gray-700">Top 10 PIB africains</h2>
              <YearOrAvgNav years={years} value={top10Year} onChange={setTop10Year} />
            </div>
            <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 40, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtBn} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="pays" tick={{ fontSize: 11, fill: '#374151' }} width={100} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0' }} formatter={(v: number) => fmtBn(v)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {top10.map((t, i) => <Cell key={i} fill={REGION_COLORS[t.region] ?? REGION_COLORS.Autre} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <InsightPanel icon="💰" title="Analyse du classement PIB" cards={top10Insights} />
          </div>
        )}

        {/* ── Carte ────────────────────────────────────────────────────── */}
        {activeTab === 'carte' && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-sm font-bold text-gray-700">Carte choroplèthe — Afrique Macroéconomie</h2>
            <AfricaMap
              indicators={mapIndicators}
              rowsByCountryYear={allMapMatrices}
              years={years}
              defaultYear={maxYear}
              showZafBorder={false}
            />
            <InsightPanel
              icon="🗺️"
              title="Lecture de la carte macroéconomique"
              subtitle="Calculés sur la moyenne 2015–2024"
              cards={choroplethInsights}
            />
          </div>
        )}

        {/* ── Scatter ──────────────────────────────────────────────────── */}
        {activeTab === 'scatter' && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-sm font-bold text-gray-700">Scatter multi-axes — Positionnement macro des pays</h2>
            <ConfigurableScatterBubble
              title="Scatter macro multi-axes"
              metrics={scatterMetrics}
              defaultX="inflation"
              defaultY="growth"
              sizeLabel="PIB (Mn USD)"
              sizeFormat={fmtBn}
              pointsByYear={scatterAllByYear}
              years={years}
              defaultYear={maxYear}
              onAxesChange={(x, y) => { setScatterXKey(x); setScatterYKey(y) }}
            />
            <InsightPanel
              icon={
                scatterXKey === 'inflation' && scatterYKey === 'growth' ? '🌡️' :
                scatterXKey === 'gdpCap' && scatterYKey === 'growth' ? '💰' :
                scatterXKey === 'currentAcc' && scatterYKey === 'growth' ? '⚖️' : '📊'
              }
              title={
                (scatterXKey === 'inflation' || scatterYKey === 'inflation') && (scatterXKey === 'growth' || scatterYKey === 'growth')
                  ? 'INFLATION VS CROISSANCE PIB'
                  : (scatterXKey === 'gdpCap' || scatterYKey === 'gdpCap') && (scatterXKey === 'growth' || scatterYKey === 'growth')
                  ? 'PIB/HAB VS CROISSANCE PIB'
                  : (scatterXKey === 'currentAcc' || scatterYKey === 'currentAcc') && (scatterXKey === 'growth' || scatterYKey === 'growth')
                  ? 'COMPTE COURANT VS CROISSANCE PIB'
                  : 'ANALYSE MULTI-AXES MACRO'
              }
              subtitle="Se recalcule automatiquement selon les axes sélectionnés"
              cards={scatterInsights}
            />
          </div>
        )}

        {/* ── Évolution PIB ─────────────────────────────────────────────── */}
        {activeTab === 'evolution' && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-sm font-bold text-gray-700">Évolution du PIB par région 2015–{maxYear}</h2>
            <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <ResponsiveContainer width="100%" height={380}>
                <ComposedChart data={evoData as any[]} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="left" tickFormatter={fmtBn} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0', fontSize: 12 }} formatter={(v: number) => fmtBn(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {ALL_REGIONS.map(reg => (
                    <Area key={reg} yAxisId="left" type="monotone" dataKey={reg} stackId="1"
                      stroke={REGION_COLORS[reg]} fill={REGION_COLORS[reg]} fillOpacity={0.7} />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <InsightPanel
              icon="📈"
              title="Dynamiques de croissance PIB régionales"
              subtitle="CAGR réels 2015–2024 — Afrique du Sud incluse dans Afrique Australe"
              cards={evolutionInsights}
            />

            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <h3 className="text-sm font-bold text-gray-700">PIB par région</h3>
              <AnimatedControls years={years} value={barYear} onChange={y => { setBarYear(y); setBarShowAvg(false) }} />
              <button
                onClick={() => setBarShowAvg(v => !v)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${barShowAvg ? 'bg-[#1B3F6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Moy. {years[0]}–{years[years.length - 1]}
              </button>
            </div>
            <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barRegional}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tickFormatter={fmtBn} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0' }} formatter={(v: number) => fmtBn(v)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barRegional.map((b, i) => <Cell key={i} fill={REGION_COLORS[b.region] ?? '#95a5a6'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <InsightPanel
              icon="📊"
              title="PIB PAR RÉGION — ANALYSE COMPARATIVE"
              subtitle={barShowAvg ? `Calculés sur la moyenne 2015–2024` : `Année ${barYear}`}
              cards={barRegionalInsights}
            />
          </div>
        )}

        {/* ── Distribution Inflation ────────────────────────────────────── */}
        {activeTab === 'inflation' && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-sm font-bold text-gray-700">Distribution de l'Inflation par pays et par région</h2>
            <HeatmapChart
              matrix={heatMatrix}
              years={years}
              countries={countries}
              regions={heatRegions}
              scale="inflation"
              format={fmtPct}
            />
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-sm font-bold text-gray-700">Distribution de l'inflation par région (boîte à moustaches)</h3>
            </div>
            <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={inflBoxByRegion(macroData)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tickFormatter={v => `${v.toFixed(1)}%`} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 'auto']} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="bg-white rounded-lg p-3 shadow-lg border border-gray-200 text-xs">
                          <p className="font-bold">{d.region}</p>
                          <p>Médiane : <b>{d.median.toFixed(1)}%</b></p>
                          <p>Q1–Q3 : {d.q1.toFixed(1)}% – {d.q3.toFixed(1)}%</p>
                          <p>Min–Max : {d.min.toFixed(1)}% – {d.max.toFixed(1)}%</p>
                        </div>
                      )
                    }}
                  />
                  <ReferenceLine y={5} stroke="#1E8449" strokeDasharray="4 4" label={{ value: 'Seuil 5% (stable)', fontSize: 10, fill: '#1E8449', position: 'right' }} />
                  <ReferenceLine y={10} stroke="#C0392B" strokeDasharray="4 4" label={{ value: 'Seuil 10% (risque)', fontSize: 10, fill: '#C0392B', position: 'right' }} />
                  <Bar dataKey="q3" fill="hsla(35,85%,55%,0.35)" />
                  <Bar dataKey="q1" fill="white" />
                  <Line type="monotone" dataKey="median" stroke="#1B3F6B" dot={{ r: 4, fill: '#1B3F6B' }} strokeWidth={0} />
                  <Line type="monotone" dataKey="max" stroke="#C0392B" dot={{ r: 2, fill: '#C0392B' }} strokeWidth={0} />
                  <Line type="monotone" dataKey="min" stroke="#94a3b8" dot={{ r: 2 }} strokeWidth={0} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <InsightPanel
              icon="🌡️"
              title="DISTRIBUTION DE L'INFLATION PAR RÉGION"
              subtitle="Analyse comparative des pressions inflationnistes par zone géographique 2015–2024"
              cards={inflationDistribInsights}
            />
          </div>
        )}

        {/* ── Intégration Régionale ─────────────────────────────────────── */}
        {activeTab === 'integration' && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-sm font-bold text-gray-700">Score d'intégration régionale — Classement</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar chart intégration */}
              <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <p className="text-xs font-semibold text-gray-500 mb-3">Classement des pays par score d'intégration</p>
                <ResponsiveContainer width="100%" height={Math.max(380, integrationRows.length * 25)}>
                  <BarChart data={integrationRows} layout="vertical" margin={{ top: 5, right: 40, left: 120, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tickFormatter={fmtScore} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 0.7]} />
                    <YAxis type="category" dataKey="pays" interval={0} tick={{ fontSize: 10, fill: '#374151' }} width={120} />
                    <Tooltip formatter={(v: number) => fmtScore(v)} contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0' }} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {integrationRows.map((t, i) => <Cell key={i} fill={REGION_COLORS[t.region] ?? '#95a5a6'} />)}
                    </Bar>
                    <ReferenceLine x={0.4} stroke="#1E8449" strokeDasharray="4 4" label={{ value: 'Seuil 0.4', fontSize: 9, fill: '#1E8449', position: 'insideTopRight' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Radar profil macro par région */}
              <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <p className="text-xs font-semibold text-gray-500 mb-3">Profil macro régional (score normalisé)</p>
                <ResponsiveContainer width="100%" height={380}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#f0f0f0" />
                    <PolarAngleAxis dataKey="region" tick={{ fontSize: 9, fill: '#374151' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    {radarData.map((d, i) => (
                      <Radar
                        key={d.region}
                        name={d.region}
                        dataKey={(_: any) => (Object.values(radarData[0]).filter(v => typeof v === 'number') as number[])[i % 4]}
                        stroke={REGION_COLORS[d.region] ?? '#95a5a6'}
                        fill={REGION_COLORS[d.region] ?? '#95a5a6'}
                        fillOpacity={0.2}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <InsightPanel
              icon="🤝"
              title="INTÉGRATION RÉGIONALE — ANALYSE"
              subtitle="Classement des pays par score d'intégration économique régionale"
              cards={integrationInsights}
            />
          </div>
        )}

        {/* ── Détail Pays ──────────────────────────────────────────────── */}
        {activeTab === 'detail' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-gray-700">Profil macroéconomique par pays</h2>
              <select
                aria-label="Pays"
                value={effectiveCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300"
              >
                {sortedCountries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <ResponsiveContainer width="100%" height={420}>
                <ComposedChart data={countryTimeseries as any[]} margin={{ top: 10, right: 50, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="left" tickFormatter={fmtBn} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v.toFixed(1)}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine yAxisId="right" y={0} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: '0%', fontSize: 9, fill: '#94a3b8' }} />
                  <Bar yAxisId="left" dataKey="gdp_mn" name="PIB" fill="#1B3F6B" fillOpacity={0.6} barSize={20} />
                  <Line yAxisId="right" type="monotone" dataKey="gdp_growth_pct" name="Croissance PIB" stroke="#1E8449" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="inflation_rate_pct" name="Inflation" stroke="#E8940C" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="current_account_mn" name="Compte courant (Mn)" stroke="#8E44AD" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <InsightPanel
              icon="🌍"
              title={`PROFIL MACRO — ${effectiveCountry.toUpperCase()}`}
              subtitle={`Région : ${countryRegion || '-'} — Analyse complète ${countryCoverage}`}
              cards={countryInsights}
            />
          </div>
        )}

        {/* ── Classement ───────────────────────────────────────────────── */}
        {activeTab === 'tableau' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-sm font-bold text-gray-700">Classement macroéconomique des pays</h2>
              <YearOrAvgNav years={years} value={tableYear} onChange={setTableYear} />
            </div>
            <CountryTable rows={tableRows} columns={tableCols} initialSort="gdp" showRank />
            <InsightPanel
              icon="🏆"
              title="CLASSEMENT MACRO — INDICATEURS CLÉS"
              subtitle="Top 5 par indicateur — sélection Atlantic Re"
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
            : { background: 'hsl(35,85%,55%)', color: 'white', cursor: 'pointer' }}
        >
          <span>{currentTabIdx < TABS.length - 1 ? TABS[currentTabIdx + 1].label : '—'}</span>
          <span>→</span>
        </button>
      </div>
    </CartographieLayout>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function median(arr: number[]): number {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
function avgArr(arr: number[]): number { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0 }

function buildMatrix(rows: MacroRow[], key: keyof MacroRow): Record<number, Record<string, number | null>> {
  const m: Record<number, Record<string, number | null>> = {}
  for (const r of rows) {
    if (!m[r.annee]) m[r.annee] = {}
    m[r.annee][r.pays] = (r[key] as number | null) ?? null
  }
  return m
}

function buildHeatMatrix(rows: MacroRow[], key: keyof MacroRow): Record<string, Record<number, number | null>> {
  const m: Record<string, Record<number, number | null>> = {}
  for (const r of rows) {
    if (!m[r.pays]) m[r.pays] = {}
    m[r.pays][r.annee] = (r[key] as number | null) ?? null
  }
  return m
}

function inflBoxByRegion(data: MacroRow[]) {
  const byReg: Record<string, number[]> = {}
  for (const r of data) {
    if (r.inflation_rate_pct == null) continue
    const reg = r.region ?? 'Autre'
    ;(byReg[reg] ??= []).push(r.inflation_rate_pct)
  }
  return Object.entries(byReg).map(([region, vals]) => {
    vals.sort((a, b) => a - b)
    const q = (p: number) => vals[Math.floor(p * (vals.length - 1))]
    return { region, min: vals[0], q1: q(0.25), median: q(0.5), q3: q(0.75), max: vals[vals.length - 1] }
  }).filter(r => r.region !== 'Autre')
}

function YearOrAvgNav({ years, value, onChange }: { years: number[]; value: YearSel; onChange: (v: YearSel) => void }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {years.map(y => (
        <button key={y} onClick={() => onChange(y)}
          className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${value === y ? 'bg-[#1B3F6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >{y}</button>
      ))}
      <button onClick={() => onChange('avg')}
        className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${value === 'avg' ? 'bg-[#1B3F6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
      >Moy. {years[0]}–{years[years.length - 1]}</button>
    </div>
  )
}
