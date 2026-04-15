import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  Line, Legend, ComposedChart, ReferenceLine, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { useCartographieData } from '../hooks/useCartographieData'
import type { GouvRow } from '../types/cartographie'
import CartographieLayout from '../components/cartographie/CartographieLayout'
import CartographieKPIGrid from '../components/cartographie/CartographieKPIGrid'
import RegionLegend from '../components/cartographie/RegionLegend'
import AfricaMap from '../components/cartographie/AfricaMap'
import ScatterBubble, { ScatterPoint } from '../components/cartographie/ScatterBubble'
import HeatmapChart from '../components/cartographie/HeatmapChart'
import CountryTable, { TableColumn } from '../components/cartographie/CountryTable'
import InsightPanel from '../components/cartographie/InsightPanel'
import { REGION_COLORS, ALL_REGIONS } from '../utils/cartographieConstants'
import {
  useGouvChoroplethInsights,
  useGouvScatterStabRegInsights,
  useGouvScatterKaopenFdiInsights,
  useGouvEvolutionInsights,
  useGouvCountryInsights,
  useGouvKaopenDistribInsights,
  useGouvRankingInsights,
  useGouvHeatmapRegInsights,
} from '../hooks/useGouvInsights'

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtPct    = (v: number) => `${v.toFixed(1)}%`
const fmtWgi    = (v: number) => v.toFixed(2)
const fmtWgiSgn = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`

// ─── Helpers ─────────────────────────────────────────────────────────────────
const avgArr = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
const median = (arr: number[]) => {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function buildMatrix(rows: GouvRow[], key: keyof GouvRow): Record<number, Record<string, number | null>> {
  const m: Record<number, Record<string, number | null>> = {}
  for (const r of rows) {
    if (!m[r.annee]) m[r.annee] = {}
    m[r.annee][r.pays] = (r[key] as number | null) ?? null
  }
  return m
}
function buildHeatMatrix(rows: GouvRow[], key: keyof GouvRow): Record<string, Record<number, number | null>> {
  const m: Record<string, Record<number, number | null>> = {}
  for (const r of rows) {
    if (!m[r.pays]) m[r.pays] = {}
    m[r.pays][r.annee] = (r[key] as number | null) ?? null
  }
  return m
}
function buildScatter(
  rows: GouvRow[],
  extractor: (r: GouvRow) => { x: number | null; y: number | null; z: number | null }
): Record<number | string, ScatterPoint[]> {
  const out: Record<number | string, ScatterPoint[]> = {}
  const byPays: Record<string, { region: string, xs: number[], ys: number[], zs: number[] }> = {}
  for (const r of rows) {
    const { x, y, z } = extractor(r)
    if (x == null || y == null || z == null) continue
    ;(out[r.annee] ??= []).push({ pays: r.pays, region: r.region ?? 'Autre', x, y, z })

    ;(byPays[r.pays] ??= { region: r.region ?? 'Autre', xs: [], ys: [], zs: [] })
    byPays[r.pays].xs.push(x)
    byPays[r.pays].ys.push(y)
    byPays[r.pays].zs.push(z)
  }
  
  out['avg'] = []
  for (const [pays, d] of Object.entries(byPays)) {
    if (d.xs.length > 0) {
      out['avg'].push({ pays, region: d.region, x: avgArr(d.xs), y: avgArr(d.ys), z: avgArr(d.zs) })
    }
  }

  return out
}

// ─── Navigation ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'kpis',       label: 'KPIs' },
  { id: 'carte',      label: 'Carte' },
  { id: 'scatter1',   label: 'Stab / Régl.' },
  { id: 'scatter2',   label: 'KAOPEN / IDE' },
  { id: 'evolution',  label: 'Évolution' },
  { id: 'pays',       label: 'Détail pays' },
  { id: 'kaopen',     label: 'KAOPEN' },
  { id: 'classement', label: 'Classement' },
]

type YearSel = number | 'avg'

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

// ─── Badge KAOPEN ─────────────────────────────────────────────────────────────
function KaopenBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-gray-400 text-xs">—</span>
  const color = value > 1 ? '#1E8449' : value > -0.5 ? '#E8940C' : '#C0392B'
  const label = value > 1 ? 'Ouvert' : value > -0.5 ? 'Partiel' : 'Fermé'
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: color }}>
      {label}
    </span>
  )
}

function KpiRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold text-gray-800 tabular-nums">{value}</span>
    </div>
  )
}

// ─── Box plot KAOPEN par région ───────────────────────────────────────────────
function kaopenBoxByRegion(data: GouvRow[]) {
  const byReg: Record<string, number[]> = {}
  for (const r of data) {
    if (r.kaopen == null) continue
    ;(byReg[r.region ?? 'Autre'] ??= []).push(r.kaopen)
  }
  return Object.entries(byReg).map(([region, vals]) => {
    const s = [...vals].sort((a, b) => a - b)
    const q1 = s[Math.floor(s.length * 0.25)]
    const q3 = s[Math.floor(s.length * 0.75)]
    return { region, min: s[0], q1, median: median(s), q3, max: s[s.length - 1] }
  }).sort((a, b) => b.median - a.median)
}

// ══════════════════════════════════════════════════════════════════════════════
// Page principale
// ══════════════════════════════════════════════════════════════════════════════
export default function CartographieGouvernance() {
  const { data, years, countries, loading, error } = useCartographieData('gouvernance')
  const maxYear = years.length ? years[years.length - 1] : 2024

  // SA → Afrique Australe (pays normal en gouvernance)
  const gouvData = useMemo(
    () => data.map(r =>
      r.pays === 'Afrique du Sud' && (r.region === 'Afrique du Sud' || r.region == null)
        ? { ...r, region: 'Afrique Australe' }
        : r
    ),
    [data]
  )

  const latestRows = useMemo(() => gouvData.filter(r => r.annee === maxYear), [gouvData, maxYear])

  // ── KPIs — basés sur les indicateurs bruts uniquement ─────────────────────
  const kpis = useMemo(() => {
    if (!latestRows.length) return []
    const stabVals = latestRows.map(r => r.political_stability).filter((v): v is number => v != null)
    const regVals  = latestRows.map(r => r.regulatory_quality).filter((v): v is number => v != null)
    const fdiVals  = latestRows.map(r => r.fdi_inflows_pct_gdp).filter((v): v is number => v != null)
    const kaVals   = latestRows.map(r => r.kaopen).filter((v): v is number => v != null)

    const bestStab = [...latestRows].filter(r => r.political_stability != null).sort((a, b) => (b.political_stability ?? 0) - (a.political_stability ?? 0))[0]
    const openMkts = kaVals.filter(v => v > 1).length

    return [
      { label: 'Stabilité politique moyenne', value: fmtWgi(avgArr(stabVals)), sublabel: `Médiane : ${fmtWgi(median(stabVals))} · ${stabVals.length} pays · ${maxYear}`, accent: 'navy'  as const },
      { label: 'Meilleur environnement politique', value: bestStab?.pays ?? '—', sublabel: `Stabilité ${fmtWgi(bestStab?.political_stability ?? 0)} · ${bestStab?.region ?? '—'}`, accent: 'green' as const },
      { label: 'IDE moyen (% PIB)', value: fmtPct(avgArr(fdiVals)), sublabel: `Sur ${fdiVals.length} pays · ${maxYear} · Régl. moy. ${fmtWgi(avgArr(regVals))}`, accent: 'amber' as const },
      { label: 'Marchés financièrement ouverts', value: `${openMkts} pays`, sublabel: `KAOPEN > 1 en ${maxYear} · Moy. ${fmtWgi(avgArr(kaVals))}`, accent: 'olive' as const },
    ]
  }, [latestRows, maxYear])

  // ── Carte ──────────────────────────────────────────────────────────────────
  const allMapMatrices = useMemo(() => ({
    stab: buildMatrix(gouvData, 'political_stability'),
    reg:  buildMatrix(gouvData, 'regulatory_quality'),
    fdi:  buildMatrix(gouvData, 'fdi_inflows_pct_gdp'),
    ka:   buildMatrix(gouvData, 'kaopen'),
  }), [gouvData])

  const mapIndicators = [
    { key: 'stab', label: 'Stabilité politique (WGI)',   scale: 'wgi'         as const, format: fmtWgi },
    { key: 'reg',  label: 'Qualité réglementaire (WGI)', scale: 'wgi'         as const, format: fmtWgi },
    { key: 'fdi',  label: 'IDE (% PIB)',                  scale: 'penetration' as const, format: fmtPct },
    { key: 'ka',   label: 'Ouverture financière KAOPEN',  scale: 'wgi'         as const, format: fmtWgi },
  ]

  const choroplethInsights = useGouvChoroplethInsights(gouvData)

  // ── Scatter 1 : Stabilité vs Réglementation ────────────────────────────────
  const scatter1 = useMemo(() => buildScatter(gouvData, r => ({
    x: r.political_stability,
    y: r.regulatory_quality,
    z: r.fdi_inflows_pct_gdp,
  })), [gouvData])
  const scatter1Insights = useGouvScatterStabRegInsights(gouvData)

  // ── Scatter 2 : KAOPEN vs FDI ──────────────────────────────────────────────
  const scatter2 = useMemo(() => buildScatter(gouvData, r => ({
    x: r.kaopen,
    y: r.fdi_inflows_pct_gdp,
    z: r.political_stability != null && r.regulatory_quality != null
      ? (r.political_stability + r.regulatory_quality + 5) / 2
      : null,
  })), [gouvData])
  const scatter2Insights = useGouvScatterKaopenFdiInsights(gouvData)

  // ── Évolution régionale : Stabilité politique moyenne par région ───────────
  const evoData = useMemo(() => {
    const byYearReg: Record<number, Record<string, number[]>> = {}
    for (const r of gouvData) {
      if (r.political_stability == null) continue
      ;(byYearReg[r.annee] ??= {})
      ;(byYearReg[r.annee][r.region ?? 'Autre'] ??= []).push(r.political_stability)
    }
    return Object.entries(byYearReg)
      .map(([annee, regMap]) => {
        const row: Record<string, number | string> = { annee: parseInt(annee) }
        for (const [reg, vals] of Object.entries(regMap)) row[reg] = avgArr(vals)
        return row
      })
      .sort((a: any, b: any) => a.annee - b.annee)
  }, [gouvData])

  const evolutionInsights = useGouvEvolutionInsights(gouvData)

  // ── Profil pays ──────────────────────────────────────────────────────────
  const sortedCountries = useMemo(() => [...countries].sort(), [countries])
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const effectiveCountry = selectedCountry || sortedCountries[0] || ''

  const countryTimeseries = useMemo(
    () => gouvData.filter(r => r.pays === effectiveCountry).sort((a, b) => a.annee - b.annee),
    [gouvData, effectiveCountry]
  )
  const countryLastRow = countryTimeseries[countryTimeseries.length - 1]

  const radarData = useMemo(() => {
    if (!countryLastRow) return []
    return [
      { axis: 'Stabilité pol.',     value: countryLastRow.political_stability  != null ? ((countryLastRow.political_stability + 2.5) / 5)  * 100 : 0 },
      { axis: 'Qualité régl.',       value: countryLastRow.regulatory_quality   != null ? ((countryLastRow.regulatory_quality + 2.5) / 5)   * 100 : 0 },
      { axis: 'Ouverture KAOPEN',    value: countryLastRow.kaopen               != null ? ((countryLastRow.kaopen + 2.5) / 5)               * 100 : 0 },
      { axis: 'IDE (% PIB)',          value: countryLastRow.fdi_inflows_pct_gdp  != null ? Math.min(100, countryLastRow.fdi_inflows_pct_gdp * 6.67) : 0 },
    ]
  }, [countryLastRow])

  const countryInsights = useGouvCountryInsights(gouvData, effectiveCountry)
  const countryRegion   = countryLastRow?.region ?? '—'
  const countryCoverage = `${years[0]}–${maxYear}`

  // ── Distribution KAOPEN par région ────────────────────────────────────────
  const kaopenBox  = useMemo(() => kaopenBoxByRegion(gouvData), [gouvData])
  const heatRegions = useMemo(() => {
    const m: Record<string, string> = {}
    for (const r of gouvData) m[r.pays] = r.region ?? 'Autre'
    return m
  }, [gouvData])

  const kaopenInsights        = useGouvKaopenDistribInsights(gouvData)
  const heatmapRegInsights    = useGouvHeatmapRegInsights(gouvData)

  // ── Tableau classement — indicateurs bruts (comme CartographieMacro) ───────
  const [tableYear, setTableYear] = useState<YearSel>(maxYear)

  const tableRows = useMemo(() => {
    if (tableYear === 'avg') {
      const acc: Record<string, { region: string; stab: number[]; reg: number[]; ka: number[]; fdi: number[] }> = {}
      for (const r of gouvData) {
        if (!acc[r.pays]) acc[r.pays] = { region: r.region ?? 'Autre', stab: [], reg: [], ka: [], fdi: [] }
        if (r.political_stability   != null) acc[r.pays].stab.push(r.political_stability)
        if (r.regulatory_quality    != null) acc[r.pays].reg.push(r.regulatory_quality)
        if (r.kaopen                != null) acc[r.pays].ka.push(r.kaopen)
        if (r.fdi_inflows_pct_gdp   != null) acc[r.pays].fdi.push(r.fdi_inflows_pct_gdp)
      }
      return Object.entries(acc).map(([pays, e]) => ({
        pays, region: e.region,
        stab: e.stab.length ? avgArr(e.stab) : null,
        reg:  e.reg.length  ? avgArr(e.reg)  : null,
        ka:   e.ka.length   ? avgArr(e.ka)   : null,
        fdi:  e.fdi.length  ? avgArr(e.fdi)  : null,
      }))
    }
    return gouvData.filter(r => r.annee === tableYear).map(r => ({
      pays:   r.pays,
      region: r.region ?? 'Autre',
      stab:   r.political_stability,
      reg:    r.regulatory_quality,
      ka:     r.kaopen,
      fdi:    r.fdi_inflows_pct_gdp,
    }))
  }, [tableYear, gouvData])

  const tableCols: TableColumn<typeof tableRows[number]>[] = [
    { key: 'pays',   label: 'Pays' },
    { key: 'region', label: 'Région' },
    {
      key: 'stab', label: 'Stabilité pol.', numeric: true,
      format: v => v != null ? fmtWgiSgn(v) : '—',
      badge: v => {
        if (v == null) return null
        if (v >= 0.5)  return { color: '#1E8449', bg: 'hsla(140,50%,40%,0.12)' }
        if (v >= -0.5) return { color: '#E8940C', bg: 'hsla(35,85%,55%,0.12)' }
        return { color: '#C0392B', bg: 'hsla(0,60%,50%,0.12)' }
      },
    },
    {
      key: 'reg', label: 'Qualité régl.', numeric: true,
      format: v => v != null ? fmtWgiSgn(v) : '—',
      badge: v => {
        if (v == null) return null
        if (v >= 0)    return { color: '#1E8449', bg: 'hsla(140,50%,40%,0.12)' }
        if (v >= -0.5) return { color: '#E8940C', bg: 'hsla(35,85%,55%,0.12)' }
        return { color: '#C0392B', bg: 'hsla(0,60%,50%,0.12)' }
      },
    },
    {
      key: 'ka', label: 'KAOPEN', numeric: true,
      format: v => v != null ? fmtWgi(v) : '—',
      badge: v => {
        if (v == null) return null
        if (v > 1)     return { color: '#1E8449', bg: 'hsla(140,50%,40%,0.12)' }
        if (v > -0.5)  return { color: '#E8940C', bg: 'hsla(35,85%,55%,0.12)' }
        return { color: '#C0392B', bg: 'hsla(0,60%,50%,0.12)' }
      },
    },
    {
      key: 'fdi', label: 'IDE (% PIB)', numeric: true,
      format: v => v != null ? fmtPct(v) : '—',
      badge: v => {
        if (v == null) return null
        if (v >= 5)    return { color: '#1E8449', bg: 'hsla(140,50%,40%,0.12)' }
        if (v >= 1)    return { color: '#E8940C', bg: 'hsla(35,85%,55%,0.12)' }
        return { color: '#C0392B', bg: 'hsla(0,60%,50%,0.12)' }
      },
    },
  ]

  const rankingInsights = useGouvRankingInsights(gouvData)

  if (loading) return <div className="p-10 text-center text-gray-500 animate-pulse text-sm">Chargement…</div>
  if (error)   return <div className="p-10 text-center text-red-500">Erreur : {error}</div>

  return (
    <CartographieLayout
      title="Cartographie — Gouvernance & Risque Politique"
      subtitle="Stabilité politique (WGI), qualité réglementaire (WGI), ouverture financière (KAOPEN Chinn-Ito) et flux IDE sur 34 pays africains (2015–2024)."
      dataSource="World Bank WGI · Chinn-Ito Index · UNCTAD FDI"
      navItems={NAV_ITEMS}
    >
      <RegionLegend />

      {/* ── Section 0 : KPIs ─────────────────────────────────────────────── */}
      <section id="kpis" className="scroll-mt-20">
        <CartographieKPIGrid kpis={kpis} />
      </section>

      {/* ── Section 1 : Carte choroplèthe ────────────────────────────────── */}
      <section id="carte" className="scroll-mt-20 space-y-4">
        <h2 className="text-sm font-bold text-gray-700">Carte choroplèthe — Afrique Gouvernance</h2>
        <AfricaMap
          indicators={mapIndicators}
          rowsByCountryYear={allMapMatrices}
          years={years}
          defaultYear={maxYear}
          showZafBorder={false}
        />
        <InsightPanel
          icon="🗺️"
          title="Lecture de la carte gouvernance"
          subtitle="Stabilité politique · Qualité réglementaire · KAOPEN · IDE — Afrique du Sud incluse dans Afrique Australe"
          cards={choroplethInsights}
        />
      </section>

      {/* ── Section 2 : Scatter Stabilité vs Réglementation ─────────────── */}
      <section id="scatter1" className="scroll-mt-20 space-y-4">
        <ScatterBubble
          title="Stabilité politique vs Qualité réglementaire — Positionnement WGI"
          xLabel="Stabilité politique (WGI)" yLabel="Qualité réglementaire (WGI)" zLabel="IDE (% PIB)"
          xFormat={fmtWgi} yFormat={fmtWgi} zFormat={fmtPct}
          pointsByYear={scatter1} years={years} defaultYear={maxYear}
          xRef={0} yRef={0}
          showAvgButton
          quadrantLabels={{
            tl: 'Instable mais bien régulé',
            tr: '✓ Leaders : stable + régulé',
            bl: '⚠ Double risque institutionnel',
            br: 'Stable mais sous-régulé',
          }}
        />
        <InsightPanel
          icon="🏛️"
          title="Stabilité politique & Qualité réglementaire — Analyse"
          subtitle="4 quadrants — axe X: Stabilité WGI · axe Y: Qualité réglementaire WGI · Taille bulle: IDE % PIB"
          cards={scatter1Insights}
        />
      </section>

      {/* ── Section 3 : Scatter KAOPEN vs FDI ───────────────────────────── */}
      <section id="scatter2" className="scroll-mt-20 space-y-4">
        <ScatterBubble
          title="Ouverture financière (KAOPEN) vs IDE — Attractivité des capitaux"
          xLabel="KAOPEN (index Chinn-Ito)" yLabel="IDE (% PIB)" zLabel="Score Stabilité+Réglementation"
          xFormat={fmtWgi} yFormat={fmtPct} zFormat={fmtWgi}
          pointsByYear={scatter2} years={years} defaultYear={maxYear}
          xRef={0} yRef={3}
          showAvgButton
          quadrantLabels={{
            tl: 'Fermé mais attractif (ressources)',
            tr: '✓ Ouvert + attractif',
            bl: '⚠ Fermé & peu attractif',
            br: 'Ouvert mais peu de capitaux',
          }}
        />
        <InsightPanel
          icon="🌐"
          title="Ouverture financière & Attractivité IDE — Analyse"
          subtitle="KAOPEN : index Chinn-Ito [-2.5, +2.5] · Valeurs positives = liberté du compte de capital"
          cards={scatter2Insights}
        />
      </section>

      {/* ── Section 4 : Évolution régionale Stabilité politique ─────────── */}
      <section id="evolution" className="scroll-mt-20 space-y-4">
        <h2 className="text-sm font-bold text-gray-700">Évolution de la stabilité politique par région — {years[0]}–{maxYear}</h2>
        <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={evoData as any[]} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis domain={[-2.5, 1.5]} tickFormatter={fmtWgi} tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ value: 'WGI Stabilité', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0', fontSize: 12 }} formatter={(v: number) => fmtWgi(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Neutre (0)', fontSize: 9, fill: '#64748b', position: 'right' }} />
              {ALL_REGIONS.map(reg => (
                <Line key={reg} type="monotone" dataKey={reg}
                  stroke={REGION_COLORS[reg]} strokeWidth={2}
                  dot={{ r: 3, fill: REGION_COLORS[reg] }} connectNulls />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <InsightPanel
          icon="📈"
          title="Dynamiques de stabilité politique par région"
          subtitle="Stabilité politique WGI moyenne par région 2015–2024 — Afrique du Sud incluse dans Afrique Australe"
          cards={evolutionInsights}
        />

        {/* Heatmap Stabilité politique */}
        <h3 className="text-sm font-bold text-gray-700 mt-4">Heatmap — Stabilité politique par pays & année</h3>
        <HeatmapChart
          matrix={buildHeatMatrix(gouvData, 'political_stability')}
          years={years} countries={countries} regions={heatRegions}
          scale="wgi" format={fmtWgi}
        />
      </section>

      {/* ── Section 5 : Profil pays ──────────────────────────────────────── */}
      <section id="pays" className="scroll-mt-20 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-sm font-bold text-gray-700">Profil gouvernance par pays</h2>
          <select
            aria-label="Sélection du pays"
            value={effectiveCountry}
            onChange={e => setSelectedCountry(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300"
          >
            {sortedCountries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Radar + Scorecard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <p className="text-[11px] text-gray-500 mb-3 uppercase tracking-wide">Profil radar WGI — {effectiveCountry} ({maxYear})</p>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: '#374151' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#9ca3af' }} />
                <Radar dataKey="value"
                  stroke={REGION_COLORS[countryLastRow?.region ?? 'Autre'] ?? '#1B3F6B'}
                  fill={REGION_COLORS[countryLastRow?.region ?? 'Autre'] ?? '#1B3F6B'}
                  fillOpacity={0.28} strokeWidth={2} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}/100`, 'Score normalisé']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl p-5 flex flex-col justify-between" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-0.5">{effectiveCountry}</h4>
              <p className="text-[11px] text-gray-500 mb-4">{countryRegion} · {maxYear}</p>
              <div className="space-y-2.5">
                <KpiRow label="Stabilité pol. (WGI)" value={countryLastRow?.political_stability != null ? fmtWgiSgn(countryLastRow.political_stability) : '—'} />
                <KpiRow label="Qualité régl. (WGI)"  value={countryLastRow?.regulatory_quality  != null ? fmtWgiSgn(countryLastRow.regulatory_quality)  : '—'} />
                <KpiRow label="KAOPEN"                value={countryLastRow?.kaopen              != null ? fmtWgi(countryLastRow.kaopen)                 : '—'} />
                <KpiRow label="IDE % PIB"             value={countryLastRow?.fdi_inflows_pct_gdp != null ? fmtPct(countryLastRow.fdi_inflows_pct_gdp)    : '—'} />
              </div>
            </div>
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid hsl(0,0%,92%)' }}>
              <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Ouverture financière</p>
              <KaopenBadge value={countryLastRow?.kaopen ?? null} />
            </div>
          </div>
        </div>

        {/* Timeline individuelle */}
        <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <p className="text-[11px] text-gray-500 mb-3 uppercase tracking-wide">Évolution indicateurs — {effectiveCountry} ({years[0]}–{maxYear})</p>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={countryTimeseries as any[]} margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="annee" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis yAxisId="wgi" domain={[-2.5, 2.5]} tick={{ fontSize: 10, fill: '#64748b' }} label={{ value: 'WGI', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#94a3b8' }} />
              <YAxis yAxisId="fdi" orientation="right" tick={{ fontSize: 10, fill: '#64748b' }} label={{ value: 'IDE %', angle: 90, position: 'insideRight', fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine yAxisId="wgi" y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <Line yAxisId="wgi" type="monotone" dataKey="political_stability" name="Stabilité pol."  stroke="#1B3F6B" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line yAxisId="wgi" type="monotone" dataKey="regulatory_quality"  name="Qualité régl."  stroke="#1E8449" strokeWidth={2}   dot={{ r: 3 }} />
              <Line yAxisId="wgi" type="monotone" dataKey="kaopen"              name="KAOPEN"          stroke="#9B59B6" strokeWidth={2}   dot={{ r: 3 }} strokeDasharray="6 2" />
              <Line yAxisId="fdi" type="monotone" dataKey="fdi_inflows_pct_gdp" name="IDE % PIB"      stroke="#E8940C" strokeWidth={2}   dot={{ r: 3 }} strokeDasharray="4 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <InsightPanel
          icon="🔍"
          title={`PROFIL GOUVERNANCE — ${effectiveCountry.toUpperCase()}`}
          subtitle={`Région : ${countryRegion} — Analyse complète ${countryCoverage}`}
          cards={countryInsights}
        />
      </section>

      {/* ── Section 6 : KAOPEN distribution + Heatmap Réglementation ─────── */}
      <section id="kaopen" className="scroll-mt-20 space-y-4">
        <h2 className="text-sm font-bold text-gray-700">Distribution KAOPEN par région (boîte à moustaches)</h2>
        <div className="bg-white rounded-xl p-5" style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={kaopenBox} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="region" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tickFormatter={fmtWgi} tick={{ fontSize: 11, fill: '#64748b' }} domain={[-2.5, 2.5]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-white rounded-lg p-3 shadow-lg border border-gray-200 text-xs">
                      <p className="font-bold mb-1">{d.region}</p>
                      <p>Médiane : <b>{fmtWgi(d.median)}</b></p>
                      <p>Q1–Q3 : {fmtWgi(d.q1)} – {fmtWgi(d.q3)}</p>
                      <p>Min–Max : {fmtWgi(d.min)} – {fmtWgi(d.max)}</p>
                    </div>
                  )
                }}
              />
              <ReferenceLine y={0}  stroke="#1B3F6B" strokeDasharray="4 4" label={{ value: 'KAOPEN = 0', fontSize: 10, fill: '#1B3F6B', position: 'right' }} />
              <ReferenceLine y={1}  stroke="#1E8449" strokeDasharray="4 4" label={{ value: 'Ouverture', fontSize: 9, fill: '#1E8449', position: 'right' }} />
              <ReferenceLine y={-1} stroke="#C0392B" strokeDasharray="4 4" label={{ value: 'Fermeture', fontSize: 9, fill: '#C0392B', position: 'right' }} />
              <Bar dataKey="q3"    fill="hsla(215,40%,60%,0.20)" />
              <Bar dataKey="q1"    fill="white" />
              <Line type="monotone" dataKey="median" stroke="#1B3F6B" dot={{ r: 5, fill: '#1B3F6B' }} strokeWidth={0} name="Médiane" />
              <Line type="monotone" dataKey="max"    stroke="#1E8449" dot={{ r: 3, fill: '#1E8449' }} strokeWidth={0} name="Max" />
              <Line type="monotone" dataKey="min"    stroke="#C0392B" dot={{ r: 3, fill: '#C0392B' }} strokeWidth={0} name="Min" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <InsightPanel icon="🌐" title="Ouverture financière (KAOPEN) — Analyse régionale" cards={kaopenInsights} />

        {/* Heatmap Qualité Réglementaire */}
        <h3 className="text-sm font-bold text-gray-700 mt-4">Heatmap — Qualité réglementaire par pays & année</h3>
        <HeatmapChart
          matrix={buildHeatMatrix(gouvData, 'regulatory_quality')}
          years={years} countries={countries} regions={heatRegions}
          scale="wgi" format={fmtWgi}
        />
        <InsightPanel
          icon="📋"
          title="Qualité réglementaire — Analyse approfondie"
          subtitle="Trajectoire réformiste · Prévisibilité (σ) · Convergence intra-régionale"
          cards={heatmapRegInsights}
        />
      </section>

      {/* ── Section 7 : Classement gouvernemental des pays ──────────────── */}
      <section id="classement" className="scroll-mt-20 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-sm font-bold text-gray-700">Classement gouvernemental des pays</h2>
          <YearOrAvgNav years={years} value={tableYear} onChange={setTableYear} />
        </div>
        <CountryTable rows={tableRows} columns={tableCols} initialSort="stab" showRank />
        <InsightPanel
          icon="🏆"
          title="CLASSEMENT GOUVERNANCE — INDICATEURS CLÉS"
          subtitle="Top pays par indicateur — Stabilité · Réglementation · KAOPEN · IDE"
          cards={rankingInsights}
        />
      </section>
    </CartographieLayout>
  )
}
