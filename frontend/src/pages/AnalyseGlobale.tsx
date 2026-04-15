import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import { useCartographieData } from '../hooks/useCartographieData'
import CartographieLayout from '../components/cartographie/CartographieLayout'
import CartographieKPIGrid from '../components/cartographie/CartographieKPIGrid'
import CountryTable, { TableColumn } from '../components/cartographie/CountryTable'
import InsightPanel from '../components/cartographie/InsightPanel'
import { REGION_COLORS } from '../utils/cartographieConstants'
import { useAnalyseGlobaleInsights } from '../hooks/useAnalyseInsights'

// ── Types ──────────────────────────────────────────────────────────────────────
type YearSel = number | 'avg'

// ── Helpers ────────────────────────────────────────────────────────────────────
function avg(a: number[]) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0 }
function median(a: number[]) {
  if (!a.length) return 0
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const fmtMn = (v: number | null) => {
  if (v == null) return '—'
  return v >= 1000 ? `${(v / 1000).toFixed(1)} Mrd$` : `${v.toFixed(0)} Mn$`
}
const fmtPct = (v: number | null) => v == null ? '—' : `${v.toFixed(1)}%`
const fmtPctSgn = (v: number | null) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
const fmtUsd = (v: number | null) => v == null ? '—' : `$${Math.round(v).toLocaleString()}`
const fmtWgi = (v: number | null) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}`

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

// ── Ranking computation ────────────────────────────────────────────────────────
function computeRanking<T extends { pays: string; region?: string | null; annee: number }>(
  data: T[],
  field: keyof T,
  year: YearSel,
  descending = true
): { pays: string; region: string; value: number }[] {
  const byPays: Record<string, { region: string; vals: number[] }> = {}
  const source = year === 'avg' ? data : data.filter(r => r.annee === year)
  for (const r of source) {
    const v = r[field] as unknown as number | null
    if (v == null) continue
    if (!byPays[r.pays]) byPays[r.pays] = { region: r.region ?? 'Autre', vals: [] }
    byPays[r.pays].vals.push(v)
  }
  return Object.entries(byPays)
    .map(([pays, { region, vals }]) => ({ pays, region, value: avg(vals) }))
    .sort((a, b) => descending ? b.value - a.value : a.value - b.value)
}

// ── Nav ────────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'recherche',   label: 'Recherche' },
  { id: 'classements', label: 'Classements' },
  { id: 'tableau',     label: 'Tableau' },
  { id: 'insights',    label: 'Insights' },
]

// ── Consolidated row type ──────────────────────────────────────────────────────
interface ConsoRow {
  pays: string
  region: string
  primesNV: number | null
  penetNV: number | null
  primesVie: number | null
  gdpCap: number | null
  gdpGrowth: number | null
  inflation: number | null
  politStab: number | null
  fdi: number | null
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AnalyseGlobale() {
  const navigate = useNavigate()
  const { data: nvData, years } = useCartographieData('non-vie')
  const { data: vieData }       = useCartographieData('vie')
  const { data: macroData }     = useCartographieData('macroeconomie')
  const { data: gouvData }      = useCartographieData('gouvernance')

  const [selectedYear, setSelectedYear] = useState<YearSel>('avg')

  // ── All countries from combined datasets ──────────────────────────────────
  const allCountries = useMemo(() => {
    const s = new Set<string>()
    nvData.forEach(r => s.add(r.pays))
    macroData.forEach(r => s.add(r.pays))
    return [...s].sort()
  }, [nvData, macroData])

  const countryOptions = useMemo(() =>
    allCountries.map(c => ({ value: c, label: c })), [allCountries])

  // ── Helper: average over all years per country ────────────────────────────
  const getCountryAvg = useMemo(() => {
    return <T extends { pays: string; annee: number }>(
      data: T[],
      pays: string,
      field: keyof T
    ): number | null => {
      const year = selectedYear
      if (year === 'avg') {
        const vals = data.filter(r => r.pays === pays)
          .map(r => r[field] as unknown as number | null)
          .filter((v): v is number => v != null)
        return vals.length ? avg(vals) : null
      }
      const row = data.find(r => r.pays === pays && r.annee === year)
      return row ? (row[field] as unknown as number | null) : null
    }
  }, [selectedYear])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const penetVals = allCountries
      .map(pays => getCountryAvg(nvData, pays, 'taux_penetration_pct'))
      .filter((v): v is number => v != null)
    const gdpCapVals = allCountries
      .map(pays => getCountryAvg(macroData, pays, 'gdp_per_capita'))
      .filter((v): v is number => v != null)
    const stabVals = allCountries
      .map(pays => getCountryAvg(gouvData, pays, 'political_stability'))
      .filter((v): v is number => v != null)

    const medPenet = penetVals.length ? median(penetVals) : 0
    const medGdpCap = gdpCapVals.length ? median(gdpCapVals) : 0
    const avgStab = stabVals.length ? avg(stabVals) : 0

    return [
      { label: 'Pays couverts', value: '34 pays · 4 dimensions', sublabel: 'Non-Vie · Vie · Macro · Gouvernance', accent: 'navy' as const },
      { label: 'Pénétration NV médiane', value: fmtPct(medPenet), sublabel: 'Primes / PIB', accent: 'olive' as const },
      { label: 'PIB médian / habitant', value: fmtUsd(medGdpCap), sublabel: 'USD par habitant', accent: 'amber' as const },
      {
        label: 'Stabilité politique moy.',
        value: fmtWgi(avgStab),
        sublabel: 'Indicateur WGI [-2.5, +2.5]',
        accent: avgStab >= 0 ? 'green' as const : 'navy' as const,
      },
    ]
  }, [nvData, macroData, gouvData, allCountries, getCountryAvg])

  // ── Rankings ───────────────────────────────────────────────────────────────
  const rankings = useMemo(() => ({
    nvRank:      computeRanking(nvData,    'primes_emises_mn_usd',  selectedYear).slice(0, 8),
    nvPenRank:   computeRanking(nvData,    'taux_penetration_pct',  selectedYear).slice(0, 8),
    vieRank:     computeRanking(vieData,   'primes_emises_mn_usd',  selectedYear).slice(0, 8),
    gdpCapRank:  computeRanking(macroData, 'gdp_per_capita',        selectedYear).slice(0, 8),
    stabRank:    computeRanking(gouvData,  'political_stability',   selectedYear).slice(0, 8),
    fdiRank:     computeRanking(gouvData,  'fdi_inflows_pct_gdp',   selectedYear).slice(0, 8),
  }), [nvData, vieData, macroData, gouvData, selectedYear])

  // ── Consolidated table rows ────────────────────────────────────────────────
  const tableRows = useMemo((): ConsoRow[] => {
    return allCountries.map(pays => {
      const region =
        nvData.find(r => r.pays === pays)?.region ??
        macroData.find(r => r.pays === pays)?.region ??
        'Autre'
      return {
        pays,
        region: region ?? 'Autre',
        primesNV:  getCountryAvg(nvData,    pays, 'primes_emises_mn_usd'),
        penetNV:   getCountryAvg(nvData,    pays, 'taux_penetration_pct'),
        primesVie: getCountryAvg(vieData,   pays, 'primes_emises_mn_usd'),
        gdpCap:    getCountryAvg(macroData, pays, 'gdp_per_capita'),
        gdpGrowth: getCountryAvg(macroData, pays, 'gdp_growth_pct'),
        inflation: getCountryAvg(macroData, pays, 'inflation_rate_pct'),
        politStab: getCountryAvg(gouvData,  pays, 'political_stability'),
        fdi:       getCountryAvg(gouvData,  pays, 'fdi_inflows_pct_gdp'),
      }
    })
  }, [nvData, vieData, macroData, gouvData, allCountries, getCountryAvg])

  // ── Insights ──────────────────────────────────────────────────────────────
  const insights = useAnalyseGlobaleInsights(nvData, vieData, macroData, gouvData)

  // ── Table columns ──────────────────────────────────────────────────────────
  const tableCols: TableColumn<ConsoRow>[] = [
    { key: 'pays',     label: 'Pays' },
    { key: 'region',   label: 'Région' },
    { key: 'primesNV', label: 'Primes NV',       numeric: true, format: fmtMn },
    { key: 'penetNV',  label: 'Pénétration NV',  numeric: true, format: fmtPct },
    { key: 'primesVie',label: 'Primes Vie',       numeric: true, format: fmtMn },
    { key: 'gdpCap',   label: 'PIB/hab',          numeric: true, format: fmtUsd },
    {
      key: 'gdpGrowth', label: 'Croiss. PIB', numeric: true,
      format: fmtPctSgn,
      badge: v => {
        if (v == null) return null
        if (v >= 5)  return { color: '#1E8449', bg: 'hsla(140,50%,40%,0.12)' }
        if (v >= 0)  return { color: '#B9770E', bg: 'hsla(35,85%,55%,0.12)' }
        return              { color: '#922B21', bg: 'hsla(0,60%,50%,0.12)' }
      },
    },
    {
      key: 'inflation', label: 'Inflation', numeric: true,
      format: fmtPct,
      badge: v => {
        if (v == null) return null
        if (v <= 5)  return { color: '#1E8449', bg: 'hsla(140,50%,40%,0.12)' }
        if (v <= 10) return { color: '#B9770E', bg: 'hsla(35,85%,55%,0.12)' }
        return              { color: '#922B21', bg: 'hsla(0,60%,50%,0.12)' }
      },
    },
    {
      key: 'politStab', label: 'Stab. pol.', numeric: true,
      format: fmtWgi,
      badge: v => {
        if (v == null) return null
        if (v >= 0.5)  return { color: '#1E8449', bg: 'hsla(140,50%,40%,0.12)' }
        if (v >= -0.5) return { color: '#B9770E', bg: 'hsla(35,85%,55%,0.12)' }
        return                { color: '#922B21', bg: 'hsla(0,60%,50%,0.12)' }
      },
    },
    {
      key: 'fdi', label: 'IDE (% PIB)', numeric: true,
      format: fmtPct,
      badge: v => {
        if (v == null) return null
        if (v >= 5) return { color: '#1E8449', bg: 'hsla(140,50%,40%,0.12)' }
        if (v >= 1) return { color: '#B9770E', bg: 'hsla(35,85%,55%,0.12)' }
        return             { color: '#922B21', bg: 'hsla(0,60%,50%,0.12)' }
      },
    },
  ]

  const yearLabel = selectedYear === 'avg' ? 'Moy. 2015–2024' : String(selectedYear)

  return (
    <CartographieLayout
      title="Analyse par Pays"
      subtitle="Vue consolidée des 34 pays africains sur les 4 dimensions : Non-Vie, Vie, Macroéconomie et Gouvernance"
      dataSource="Axco Navigator · World Bank · IMF · WGI · Chinn-Ito"
      navItems={NAV_ITEMS}
    >
      {/* Section 0 — Sélecteur de pays */}
      <section id="recherche" className="scroll-mt-20">
        <div
          className="bg-white rounded-xl p-6"
          style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: 'hsla(83,52%,42%,0.10)' }}
            >🔍</div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Accéder à la fiche pays</h2>
              <p className="text-xs text-gray-400 mt-0.5">Sélectionnez un pays pour voir son analyse détaillée sur les 4 dimensions</p>
            </div>
          </div>
          <div className="max-w-lg">
            <Select
              options={countryOptions}
              value={null}
              onChange={v => v && navigate(`/modelisation/analyse/${encodeURIComponent(v.value)}`)}
              placeholder="Rechercher un pays parmi les 34 marchés africains…"
              isClearable={false}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              styles={{
                control: (b: any) => ({
                  ...b, borderRadius: 10, minHeight: 44,
                  borderColor: 'hsl(0,0%,88%)', boxShadow: 'none',
                  '&:hover': { borderColor: 'hsl(83,52%,42%)' },
                }),
                option: (b: any, s: any) => ({
                  ...b,
                  background: s.isFocused ? 'hsla(83,52%,42%,0.10)' : 'white',
                  color: '#374151', fontSize: 13,
                }),
                placeholder: (b: any) => ({ ...b, color: '#9ca3af', fontSize: 13 }),
              }}
            />
          </div>
        </div>
      </section>

      {/* Section 1 — Sélecteur d'année global */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Période :</span>
        <YearOrAvgNav years={years} value={selectedYear} onChange={setSelectedYear} />
      </div>

      {/* Section 2 — KPIs */}
      <CartographieKPIGrid kpis={kpis} />

      {/* Section 3 — Classements */}
      <section id="classements" className="scroll-mt-20 space-y-4">
        <h2 className="text-sm font-bold text-gray-700">Classements par indicateur — {yearLabel}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <RankingCard
            title="🏆 Top Primes Non-Vie"
            data={rankings.nvRank}
            format={v => fmtMn(v)}
            onNavigate={p => navigate(`/modelisation/analyse/${encodeURIComponent(p)}`)}
          />
          <RankingCard
            title="🌱 Top Pénétration Non-Vie"
            data={rankings.nvPenRank}
            format={v => `${v.toFixed(2)}%`}
            onNavigate={p => navigate(`/modelisation/analyse/${encodeURIComponent(p)}`)}
          />
          <RankingCard
            title="💼 Top Primes Vie"
            data={rankings.vieRank}
            format={v => fmtMn(v)}
            onNavigate={p => navigate(`/modelisation/analyse/${encodeURIComponent(p)}`)}
          />
          <RankingCard
            title="💰 Top PIB par habitant"
            data={rankings.gdpCapRank}
            format={v => `$${Math.round(v).toLocaleString()}`}
            onNavigate={p => navigate(`/modelisation/analyse/${encodeURIComponent(p)}`)}
          />
          <RankingCard
            title="🏛 Top Stabilité Politique"
            data={rankings.stabRank}
            format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`}
            onNavigate={p => navigate(`/modelisation/analyse/${encodeURIComponent(p)}`)}
          />
          <RankingCard
            title="🌍 Top Attractivité IDE"
            data={rankings.fdiRank}
            format={v => `${v.toFixed(1)}% PIB`}
            onNavigate={p => navigate(`/modelisation/analyse/${encodeURIComponent(p)}`)}
          />
        </div>
      </section>

      {/* Section 4 — Tableau de synthèse */}
      <section id="tableau" className="scroll-mt-20 space-y-3">
        <h2 className="text-sm font-bold text-gray-700">Tableau de synthèse — {yearLabel}</h2>
        <CountryTable
          rows={tableRows}
          columns={tableCols}
          initialSort="primesNV"
          showRank
          onRowClick={r => navigate(`/modelisation/analyse/${encodeURIComponent(r.pays)}`)}
        />
      </section>

      {/* Section 5 — Insights globaux */}
      <section id="insights" className="scroll-mt-20">
        <InsightPanel
          icon="💡"
          title="Insights globaux — Afrique de l'assurance"
          cards={insights}
        />
      </section>
    </CartographieLayout>
  )
}

// ── RankingCard ────────────────────────────────────────────────────────────────
function RankingCard({
  title,
  data,
  format,
  onNavigate,
}: {
  title: string
  data: { pays: string; region: string; value: number }[]
  format: (v: number) => string
  onNavigate: (pays: string) => void
}) {
  return (
    <div
      className="bg-white rounded-xl p-5"
      style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
    >
      <h3 className="text-xs font-bold text-gray-700 mb-3">{title}</h3>
      <ol className="space-y-1.5">
        {data.map((item, idx) => (
          <li
            key={item.pays}
            className="flex items-center gap-2 rounded-lg px-2 py-1 cursor-pointer transition-colors"
            onClick={() => onNavigate(item.pays)}
            onMouseEnter={e => { (e.currentTarget as HTMLLIElement).style.background = 'hsla(83,52%,42%,0.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLLIElement).style.background = '' }}
          >
            <span className="text-[11px] font-bold text-gray-400 w-4 text-center flex-shrink-0">
              {idx + 1}
            </span>
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: REGION_COLORS[item.region] ?? REGION_COLORS.Autre }}
            />
            <span className="text-xs font-medium text-gray-800 flex-1 truncate">{item.pays}</span>
            <span
              className="text-xs font-bold font-mono flex-shrink-0"
              style={{ color: 'hsl(83,52%,36%)' }}
            >{format(item.value)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
