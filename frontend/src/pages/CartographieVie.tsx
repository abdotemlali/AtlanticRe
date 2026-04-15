import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  Area, Legend, ComposedChart, ReferenceLine, Line,
} from 'recharts'
import { useCartographieData } from '../hooks/useCartographieData'
import type { VieRow } from '../types/cartographie'
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
  useVieChoroplethInsights,
  computeVieScatterInsights,
  useVieStructureInsights,
  useVieTop10Insights,
  useVieEvolutionInsights,
  useViePenetrationDistributionInsights,
  useVieCountryInsights,
  useVieRankingInsights,
  useVieBarRegionalInsights,
} from '../hooks/useVieInsights'
import { REGION_COLORS, ALL_REGIONS } from '../utils/cartographieConstants'

// ── Formatters ──────────────────────────────────────────────────────────────
const fmtMn = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)} Md$` : `${v.toFixed(0)} Mn$`
const fmtPct = (v: number) => `${v.toFixed(1)}%`
const fmtUsd = (v: number) => `${v.toFixed(1)}$`

type YearSel = number | 'avg'

const NAV_ITEMS = [
  { id: 'kpis', label: 'KPIs' },
  { id: 'carte', label: 'Carte' },
  { id: 'scatter', label: 'Scatter multi-axes' },
  { id: 'evolution', label: 'Évolution régionale' },
  { id: 'structure', label: 'Structure' },
  { id: 'distribution', label: 'Distribution Pénétration' },
  { id: 'detail', label: 'Détail Pays' },
  { id: 'tableau', label: 'Classement' },
]

export default function CartographieVie() {
  const { data, years, countries, loading, error } = useCartographieData('vie')
  const maxYear = years.length ? years[years.length - 1] : 2024

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
    const dens = latestRows.map(r => r.densite_assurance_usd).filter((v): v is number => v != null)
    const densAvg = avg(dens)
    return [
      { label: 'Primes Vie totales', value: fmtMn(primesAll), sublabel: `${maxYear} · 34 pays`, accent: 'navy' as const },
      { label: 'Croissance médiane', value: fmtPct(growthMed), sublabel: `${maxYear}`, accent: 'green' as const },
      { label: 'Pénétration moyenne', value: `${penAvg.toFixed(2)}%`, sublabel: 'Primes Vie / PIB', accent: 'olive' as const },
      { label: 'Densité moyenne', value: fmtUsd(densAvg), sublabel: 'USD par habitant', accent: 'amber' as const },
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

  // ── Insights Top 10 (dynamiques) ──
  const top10Insights = useVieTop10Insights(data, top10Year)

  // ── Map matrices ──
  const mapMatrix = useMemo(() => buildMatrix(data, 'primes_emises_mn_usd'), [data])
  const mapMatrixPen = useMemo(() => buildMatrix(data, 'taux_penetration_pct'), [data])
  const mapMatrixDens = useMemo(() => buildMatrix(data, 'densite_assurance_usd'), [data])
  const mapMatrixGrowth = useMemo(() => buildMatrix(data, 'croissance_primes_pct'), [data])

  const mapIndicators = [
    { key: 'primes', label: 'Primes Vie (Mn USD)', scale: 'primes' as const, format: fmtMn },
    { key: 'pen', label: 'Pénétration (%)', scale: 'penetration' as const, format: (v: number) => v.toFixed(2) + '%' },
    { key: 'dens', label: 'Densité (USD/hab)', scale: 'densite' as const, format: fmtUsd },
    { key: 'growth', label: 'Croissance (%)', scale: 'croissance' as const, format: fmtPct },
  ]

  const allMapMatrices: Record<string, Record<number, Record<string, number | null>>> = useMemo(() => ({
    primes: mapMatrix,
    pen: mapMatrixPen,
    dens: mapMatrixDens,
    growth: mapMatrixGrowth,
  }), [mapMatrix, mapMatrixPen, mapMatrixDens, mapMatrixGrowth])

  // ── Insights Choroplèthe ──
  const choroplethInsights = useVieChoroplethInsights(data)

  // ── Scatter multi-axes ──
  const scatterMetrics: MetricDef[] = useMemo(() => [
    { key: 'penetration', label: 'Pénétration (%)', format: (v: number) => `${v.toFixed(2)}%` },
    { key: 'densite', label: 'Densité (USD/hab)', format: fmtUsd },
    { key: 'croissance', label: 'Croissance Primes (%)', format: fmtPct, ref: 0 },
  ], [])

  const scatterAllByYear = useMemo(() => {
    const out: Record<number, ConfigurableScatterPoint[]> = {}
    for (const r of data) {
      if (r.primes_emises_mn_usd == null || r.primes_emises_mn_usd <= 0) continue
      ;(out[r.annee] ??= []).push({
        pays: r.pays,
        region: r.region ?? 'Autre',
        primes: r.primes_emises_mn_usd,
        penetration: r.taux_penetration_pct,
        densite: r.densite_assurance_usd,
        croissance: r.croissance_primes_pct,
      })
    }
    return out
  }, [data])

  const [scatterXKey, setScatterXKey] = useState('penetration')
  const [scatterYKey, setScatterYKey] = useState('croissance')
  const scatterInsights = useMemo(
    () => computeVieScatterInsights(scatterXKey, scatterYKey, data),
    [scatterXKey, scatterYKey, data]
  )

  // ── Insights Évolution régionale ──
  const evolutionInsights = useVieEvolutionInsights(data)

  // ── Évolution par région (stacked area) ──
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

  // ── Insights Primes par région ──
  const barRegionalInsights = useVieBarRegionalInsights(data, barYear, barShowAvg, years)

  // ── Structure (donut Plotly) ──
  const [pieYear, setPieYear] = useState(maxYear)
  const [pieShowAvg, setPieShowAvg] = useState(false)

  const structureInsights = useVieStructureInsights(data, pieShowAvg ? 'avg' : pieYear)

  // ── Distribution Pénétration par région ──
  const [boxYear, setBoxYear] = useState<YearSel>(maxYear)
  const boxByRegion = useMemo(() => {
    const source = boxYear === 'avg' ? data : data.filter(r => r.annee === boxYear)
    const byReg: Record<string, number[]> = {}
    for (const r of source) {
      const reg = r.region ?? 'Autre'
      if (r.taux_penetration_pct != null) {
        byReg[reg] = byReg[reg] ?? []
        byReg[reg].push(r.taux_penetration_pct)
      }
    }
    return Object.entries(byReg).map(([region, vals]) => {
      vals.sort((a, b) => a - b)
      const q = (p: number) => vals[Math.floor(p * (vals.length - 1))]
      return { region, min: vals[0], q1: q(0.25), median: q(0.5), q3: q(0.75), max: vals[vals.length - 1] }
    }).sort((a, b) => ALL_REGIONS.indexOf(a.region) - ALL_REGIONS.indexOf(b.region))
  }, [boxYear, data])

  // ── Insights Distribution Pénétration ──
  const penetrationDistributionInsights = useViePenetrationDistributionInsights(data)

  // ── Détail pays ──
  const sortedCountries = useMemo(() => [...countries].sort(), [countries])
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const effectiveCountry = selectedCountry || sortedCountries[0] || ''
  const countryTimeseries = useMemo(() => {
    return data.filter(r => r.pays === effectiveCountry).sort((a, b) => a.annee - b.annee)
  }, [data, effectiveCountry])

  // ── Insights Profil Pays ──
  const { cards: countryInsights, region: countryRegion, coverage: countryCoverage } = useVieCountryInsights(data, effectiveCountry)

  // ── Insights Classement pays ──
  const rankingInsights = useVieRankingInsights(data)

  // ── Tableau ──
  const [tableYear, setTableYear] = useState<YearSel>(maxYear)
  const tableRows = useMemo(() => {
    if (tableYear === 'avg') {
      const acc: Record<string, { region: string; primes: number[]; croissance: number[]; penetration: number[]; densite: number[] }> = {}
      for (const r of data) {
        if (!acc[r.pays]) acc[r.pays] = { region: r.region ?? 'Autre', primes: [], croissance: [], penetration: [], densite: [] }
        if (r.primes_emises_mn_usd != null) acc[r.pays].primes.push(r.primes_emises_mn_usd)
        if (r.croissance_primes_pct != null) acc[r.pays].croissance.push(r.croissance_primes_pct)
        if (r.taux_penetration_pct != null) acc[r.pays].penetration.push(r.taux_penetration_pct)
        if (r.densite_assurance_usd != null) acc[r.pays].densite.push(r.densite_assurance_usd)
      }
      return Object.entries(acc).map(([pays, v]) => ({
        pays,
        region: v.region,
        primes: v.primes.length ? avg(v.primes) : null,
        croissance: v.croissance.length ? avg(v.croissance) : null,
        penetration: v.penetration.length ? avg(v.penetration) : null,
        densite: v.densite.length ? avg(v.densite) : null,
      }))
    }
    return data.filter(r => r.annee === tableYear).map(r => ({
      pays: r.pays,
      region: r.region ?? 'Autre',
      primes: r.primes_emises_mn_usd,
      croissance: r.croissance_primes_pct,
      penetration: r.taux_penetration_pct,
      densite: r.densite_assurance_usd,
    }))
  }, [tableYear, data])

  const tableCols: TableColumn<typeof tableRows[number]>[] = [
    { key: 'pays', label: 'Pays' },
    { key: 'region', label: 'Région' },
    { key: 'primes', label: 'Primes (Mn USD)', numeric: true, format: v => v != null ? fmtMn(v) : '—' },
    { key: 'croissance', label: 'Croissance', numeric: true, format: v => v != null ? fmtPct(v) : '—' },
    {
      key: 'penetration', label: 'Pénétration', numeric: true,
      format: v => v != null ? `${v.toFixed(2)}%` : '—',
      badge: v => {
        if (v == null) return null
        if (v >= 2) return { color: '#1B3F6B', bg: 'hsla(213,60%,27%,0.12)' }
        if (v >= 0.5) return { color: '#E8940C', bg: 'hsla(35,85%,55%,0.12)' }
        return { color: '#1E8449', bg: 'hsla(140,50%,40%,0.12)' }
      },
    },
    { key: 'densite', label: 'Densité (USD/hab)', numeric: true, format: v => v != null ? fmtUsd(v) : '—' },
  ]

  if (loading) return <LoadingState />
  if (error) return <ErrorState msg={error} />

  return (
    <CartographieLayout
      title="Cartographie — Assurance Vie"
      subtitle="Analyse du marché vie sur 34 pays africains (2015–2024) : primes, pénétration et densité. L'Afrique du Sud concentre ~85 % du marché continental."
      dataSource="Axco Navigator · Backcasting"
      navItems={NAV_ITEMS}
    >
      <RegionLegend />

      {/* Section 0 — KPIs */}
      <section id="kpis" className="scroll-mt-20">
        <CartographieKPIGrid kpis={kpis} />
      </section>

      {/* Top 10 Vie */}
      <section>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <h2 className="text-sm font-bold text-gray-700">Top 10 pays par primes vie émises</h2>
          <YearOrAvgNav years={years} value={top10Year} onChange={setTop10Year} />
        </div>
        <div className="bg-white rounded-xl p-5"
          style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 40, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtMn} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis type="category" dataKey="pays" tick={{ fontSize: 11, fill: '#374151' }} width={100} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0' }}
                formatter={(v: number) => fmtMn(v)}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {top10.map((t, i) => <Cell key={i} fill={REGION_COLORS[t.region] ?? REGION_COLORS.Autre} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Insights Top 10 — dynamiques */}
        <InsightPanel
          icon="🏆"
          title="Analyse du classement vie"
          cards={top10Insights}
        />
      </section>

      {/* Section 1 — Carte */}
      <section id="carte" className="scroll-mt-20 space-y-4">
        <h2 className="text-sm font-bold text-gray-700">Carte choroplèthe — Afrique Vie</h2>
        <AfricaMap
          indicators={mapIndicators}
          rowsByCountryYear={allMapMatrices}
          years={years}
          defaultYear={maxYear}
        />
        {/* Insights Choroplèthe — dynamiques */}
        <InsightPanel
          icon="🗺️"
          title="Lecture de la carte vie"
          subtitle="Calculés sur la moyenne 2015–2024"
          cards={choroplethInsights}
        />
      </section>

      {/* Section 2 — Scatter multi-axes */}
      <section id="scatter" className="scroll-mt-20 space-y-4">
        <h2 className="text-sm font-bold text-gray-700">Scatter multi-axes — composez votre vue</h2>
        <ConfigurableScatterBubble
          title="Scatter multi-axes Vie"
          metrics={scatterMetrics}
          defaultX="penetration"
          defaultY="croissance"
          sizeLabel="Primes Vie (Mn USD)"
          sizeFormat={fmtMn}
          pointsByYear={scatterAllByYear}
          years={years}
          defaultYear={maxYear}
          onAxesChange={(x, y) => { setScatterXKey(x); setScatterYKey(y) }}
        />
        {/* Insights Scatter — recalculés à chaque changement d'axes */}
        <InsightPanel
          icon={
            scatterXKey === 'penetration' && scatterYKey === 'densite' ? '📈' :
            scatterXKey === 'croissance' && scatterYKey === 'densite' ? '📉' :
            scatterXKey === 'penetration' && scatterYKey === 'croissance' ? '🌎' : '📊'
          }
          title={
            (scatterXKey === 'penetration' && scatterYKey === 'densite') ||
            (scatterXKey === 'densite' && scatterYKey === 'penetration')
              ? 'PÉNÉTRATION VS DENSITÉ VIE'
              : (scatterXKey === 'croissance' && scatterYKey === 'densite') ||
                (scatterXKey === 'densite' && scatterYKey === 'croissance')
              ? 'DENSITÉ VS CROISSANCE VIE'
              : (scatterXKey === 'penetration' && scatterYKey === 'croissance') ||
                (scatterXKey === 'croissance' && scatterYKey === 'penetration')
              ? 'PÉNÉTRATION VS CROISSANCE VIE'
              : 'ANALYSE MULTI-AXES VIE'
          }
          subtitle="Se recalcule automatiquement selon les axes sélectionnés"
          cards={scatterInsights}
        />
      </section>

      {/* Section 3 — Évolution */}
      <section id="evolution" className="scroll-mt-20 space-y-4">
        <h2 className="text-sm font-bold text-gray-700">Évolution des primes vie par région 2015–2024</h2>
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

        {/* Insights Évolution — dynamiques (CAGR + accélération post-2020) */}
        <InsightPanel
          icon="📈"
          title="Dynamiques de croissance régionale vie"
          subtitle="Calculés sur les CAGR réels 2015–2024 et l'accélération post-2020 (hors Afrique du Sud)"
          cards={evolutionInsights}
        />

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <h3 className="text-sm font-bold text-gray-700">Primes vie par région</h3>
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
        {/* Insights Primes par région — dynamiques */}
        <InsightPanel
          icon="📊"
          title="PRIMES VIE PAR RÉGION — ANALYSE COMPARATIVE"
          subtitle={barShowAvg ? 'Calculés sur la moyenne 2015–2024' : `Calculés sur l'année ${barYear} · CAGR sur toute la série`}
          cards={barRegionalInsights}
        />
      </section>

      {/* Section 4 — Structure (Donut Plotly) */}
      <section id="structure" className="scroll-mt-20 space-y-4">
        <RegionalDonutChart
          data={data as any}
          years={years}
          year={pieYear}
          showAvg={pieShowAvg}
          onYearChange={y => { setPieYear(y); setPieShowAvg(false) }}
          onToggleAvg={() => setPieShowAvg(v => !v)}
        />
        {/* Insights Structure — dynamiques */}
        <InsightPanel
          icon="🥧"
          title="STRUCTURE RÉGIONALE DU MARCHÉ VIE"
          subtitle="Répartition des primes vie par zone géographique (hors Afrique du Sud)"
          cards={structureInsights}
        />
      </section>

      {/* Section 5 — Distribution Pénétration */}
      <section id="distribution" className="scroll-mt-20 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-sm font-bold text-gray-700">Distribution du Taux de Pénétration Vie par région</h2>
          <YearOrAvgNav years={years} value={boxYear} onChange={setBoxYear} />
        </div>
        <div className="bg-white rounded-xl p-5"
          style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={boxByRegion}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tickFormatter={v => `${v.toFixed(2)}%`} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0', fontSize: 12 }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-white rounded-lg p-3 shadow-lg border border-gray-200 text-xs">
                      <p className="font-bold">{d.region}</p>
                      <p>Médiane : <b>{d.median.toFixed(2)}%</b></p>
                      <p>Q1–Q3 : {d.q1.toFixed(2)}% – {d.q3.toFixed(2)}%</p>
                      <p>Min–Max : {d.min.toFixed(2)}% – {d.max.toFixed(2)}%</p>
                    </div>
                  )
                }}
              />
              <ReferenceLine y={1} stroke="#1E8449" strokeDasharray="4 4" label={{ value: 'Seuil 1% (marché développé)', fontSize: 10, fill: '#1E8449', position: 'right' }} />
              <ReferenceLine y={0.5} stroke="#E8940C" strokeDasharray="4 4" label={{ value: 'Seuil 0,5%', fontSize: 10, fill: '#E8940C', position: 'right' }} />
              <Bar dataKey="q3" fill="hsla(140,50%,45%,0.40)" />
              <Bar dataKey="q1" fill="white" />
              <Line type="monotone" dataKey="median" stroke="#1B3F6B" dot={{ r: 4, fill: '#1B3F6B' }} strokeWidth={0} />
              <Line type="monotone" dataKey="max" stroke="#94a3b8" dot={{ r: 2 }} strokeWidth={0} />
              <Line type="monotone" dataKey="min" stroke="#94a3b8" dot={{ r: 2 }} strokeWidth={0} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Insights Distribution Pénétration — dynamiques */}
        <InsightPanel
          icon="📊"
          title="DISTRIBUTION PÉNÉTRATION VIE PAR RÉGION"
          subtitle="Comparaison de la pénétration vie entre régions africaines 2015–2024"
          cards={penetrationDistributionInsights}
        />
      </section>

      {/* Section 6 — Détail pays */}
      <section id="detail" className="scroll-mt-20 space-y-4">
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
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v.toFixed(2)}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="right" type="monotone" dataKey="taux_penetration_pct" name="Pénétration" stroke="#E8940C" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="densite_assurance_usd" name="Densité (USD/hab)" stroke="#1E8449" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="croissance_primes_pct" name="Croissance" stroke="#8E44AD" strokeDasharray="4 4" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Insights Profil Pays Vie */}
        <InsightPanel
          icon="🌍"
          title={`PROFIL VIE - ${effectiveCountry.toUpperCase()}`}
          subtitle={`Région : ${countryRegion || '-'} — Analyse complète ${countryCoverage}`}
          cards={countryInsights}
        />
      </section>

      {/* Section 7 — Tableau */}
      <section id="tableau" className="scroll-mt-20 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-sm font-bold text-gray-700">Classement des pays</h2>
          <YearOrAvgNav years={years} value={tableYear} onChange={setTableYear} />
        </div>
        <CountryTable rows={tableRows} columns={tableCols} initialSort="primes" showRank />

        {/* Insights Classement — dynamiques */}
        <InsightPanel
          icon="🏆"
          title="CLASSEMENT VIE — INDICATEURS CLÉS"
          subtitle="Top 5 par critère — sélection Atlantic Re"
          cards={rankingInsights}
        />
      </section>
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

function buildMatrix(rows: VieRow[], key: keyof VieRow): Record<number, Record<string, number | null>> {
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
      <div className="animate-pulse text-sm">Chargement des données vie…</div>
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
