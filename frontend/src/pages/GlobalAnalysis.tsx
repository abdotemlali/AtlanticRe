// AJOUTÉ — Page Analyse Globale (/analyse-globale)
// Modifications implémentées :
// 1 : Onglet unique "Par pays" (fusion "Par pays global" + "Par marché")
// 2 : Filtre local (Année, Branche multi, FAC/TTY/TTE, Vie/Non-vie)
// 3 : 3 jeux de params immunisés (paramsNoBranch, paramsNoCountry, paramsNoYear)
// 4 : Pie Chart figé — branche immunisée, segments non sélectionnés atténués
// 5 : Top Bar Chart hybride — S sélectionnées + (10-S) meilleures restantes
// 6 : Tableaux — lignes sélectionnées surlignées
// 7 : WorldMap — pays sélectionnés en couleur vive, reste atténué

import React, { useState, useEffect, useMemo } from 'react'
import { Globe, SlidersHorizontal, TrendingUp, PieChart, BarChart2, X } from 'lucide-react'
import Select from 'react-select'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart as RechartsPieChart, Pie,
  Line, Legend, ComposedChart,
} from 'recharts'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { useData, DEFAULT_FILTERS, filtersToParams, FilterState } from '../context/DataContext'
import { formatCompact, formatPercent } from '../utils/formatters'
import { ChartSkeleton } from '../components/ui/Skeleton'
import WorldMap from '../components/Charts/WorldMap'

// ─── AJOUTÉ — Palette couleurs dynamiques par ordre de sélection ───────────
const BRANCH_PALETTE = ['#EF4444', '#22C55E', '#3B82F6', '#F97316', '#A855F7']
const NEUTRAL_BAR = '#94A3B8'

function getBranchColor(index: number): string {
  return index < BRANCH_PALETTE.length ? BRANCH_PALETTE[index] : NEUTRAL_BAR
}

// ─── Palette pie chart (mêmes que DistributionCharts) ──────────────────────
const PIE_COLORS = [
  'hsl(209,28%,24%)', 'hsl(83,52%,36%)', 'hsl(83,50%,45%)',
  'hsl(209,24%,32%)', 'hsl(83,54%,27%)', 'hsl(209,28%,40%)',
  'hsl(152,56%,39%)', 'hsl(43,96%,56%)', 'hsl(218,12%,68%)',
]

// ─── Types ─────────────────────────────────────────────────────────────────
type VieView = 'ALL' | 'VIE' | 'NON_VIE'

// AJOUTÉ — État des filtres locaux à cette page
interface LocalFilters {
  uw_years: number[]
  uw_year_min: number | null
  uw_year_max: number | null
  branche: string[]
  type_contrat_spc: string[]
  vie_non_vie: VieView
}

const DEFAULT_LOCAL: LocalFilters = {
  uw_years: [],
  uw_year_min: null,
  uw_year_max: null,
  branche: [],
  type_contrat_spc: [],
  vie_non_vie: 'ALL',
}

// ─── Styles react-select ────────────────────────────────────────────────────
const rsStyles = {
  control: (base: any) => ({
    ...base, minHeight: '36px', fontSize: '0.78rem', borderRadius: '0.5rem',
    borderColor: 'var(--color-gray-200)', boxShadow: 'none',
    '&:hover': { borderColor: 'var(--color-navy)' },
  }),
  option: (base: any, state: any) => ({
    ...base, fontSize: '0.78rem',
    backgroundColor: state.isSelected ? 'var(--color-navy)' : state.isFocused ? 'var(--color-off-white)' : 'white',
    color: state.isSelected ? 'white' : 'var(--color-navy)',
  }),
  multiValue: (base: any) => ({ ...base, backgroundColor: 'hsla(209,28%,24%,0.10)' }),
  multiValueLabel: (base: any) => ({ ...base, color: 'var(--color-navy)', fontWeight: 700, fontSize: '0.72rem' }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  placeholder: (base: any) => ({ ...base, fontSize: '0.78rem' }),
}
const rsProps = { styles: rsStyles, menuPortalTarget: document.body, menuPosition: 'fixed' as const }

const labelStyle = 'block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]'

// ─── Helpers ────────────────────────────────────────────────────────────────
const ulrColor = (ulr: number | null) => {
  if (ulr === null) return 'var(--color-gray-400)'
  if (ulr > 100) return 'hsl(358,66%,54%)'
  if (ulr > 70) return 'hsl(30,88%,56%)'
  return 'hsl(83,52%,36%)'
}

// ─── Composant principal ────────────────────────────────────────────────────
export default function GlobalAnalysis() {
  const { filters, filterOptions } = useData()

  // AJOUTÉ — Filtre local, indépendant du filtre global
  // L'année est initialisée et synchronisée avec le filtre global
  const [lf, setLf] = useState<LocalFilters>(() => ({
    ...DEFAULT_LOCAL,
    uw_years: filters.uw_years,
    uw_year_min: filters.uw_year_min,
    uw_year_max: filters.uw_year_max,
  }))

  // AJOUTÉ — Synchronisation de l'année avec le filtre global
  const lfYearsKey = filters.uw_years.join(',')
  useEffect(() => {
    setLf(prev => ({
      ...prev,
      uw_years: filters.uw_years,
      uw_year_min: filters.uw_year_min,
      uw_year_max: filters.uw_year_max,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.uw_year_min, filters.uw_year_max, lfYearsKey])

  // AJOUTÉ — Reset local uniquement, ne touche pas au filtre global
  const handleReset = () => {
    setLf({
      ...DEFAULT_LOCAL,
      uw_years: filters.uw_years,
      uw_year_min: filters.uw_year_min,
      uw_year_max: filters.uw_year_max,
    })
  }

  // AJOUTÉ — Construction du FilterState depuis les filtres locaux
  // pays_cedante est lu depuis le filtre GLOBAL (géré par le FilterPanel global)
  const buildFS = (overrides: Partial<FilterState> = {}): FilterState => ({
    ...DEFAULT_FILTERS,
    uw_years: lf.uw_years,
    uw_year_min: lf.uw_year_min,
    uw_year_max: lf.uw_year_max,
    branche: lf.branche,
    type_contrat_spc: lf.type_contrat_spc,
    pays_cedante: filters.pays_cedante,   // passthrough global
    ...overrides,
  })

  // AJOUTÉ — Modification 3 : 4 jeux de paramètres distincts
  // params : normaux pour KPIs et Top branches
  const params = useMemo(() => {
    const p = filtersToParams(buildFS())
    if (lf.vie_non_vie !== 'ALL') p.vie_non_vie_view = lf.vie_non_vie
    return p
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lf, filters.pays_cedante])

  // paramsNoBranch : immunisé contre branche pour Pie Chart Mix par branche
  const paramsNoBranch = useMemo(() => {
    return filtersToParams(buildFS({ branche: [] }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lf, filters.pays_cedante])

  // paramsNoCountry : immunisé contre pays pour garder la vue globale de la carte
  const paramsNoCountry = useMemo(() => {
    const p = filtersToParams(buildFS({ pays_cedante: [] }))
    if (lf.vie_non_vie !== 'ALL') p.vie_non_vie_view = lf.vie_non_vie
    return p
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lf])

  // paramsNoYear : sans année pour Évolution historique
  const paramsNoYear = useMemo(() => {
    return filtersToParams(buildFS({ uw_years: [], uw_year_min: null, uw_year_max: null }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lf, filters.pays_cedante])

  // ─── État API ─────────────────────────────────────────────────────────────
  const [kpiData, setKpiData] = useState<any>(null)
  const [countryData, setCountryData] = useState<any[]>([])
  const [yearData, setYearData] = useState<any[]>([])
  const [branchMixData, setBranchMixData] = useState<any[]>([])
  const [branchAllData, setBranchAllData] = useState<any[]>([])
  const [loadingPays, setLoadingPays] = useState(false)
  const [loadingYear, setLoadingYear] = useState(false)
  const [loadingBranch, setLoadingBranch] = useState(false)

  // AJOUTÉ — Section "Par pays" (Modification 1) : utilise params
  useEffect(() => {
    setLoadingPays(true)
    Promise.all([
      api.get(API_ROUTES.KPIS.SUMMARY, { params }),
      api.get(API_ROUTES.KPIS.BY_COUNTRY, { params }),
    ])
      .then(([kpi, countries]) => {
        setKpiData(kpi.data)
        setCountryData(countries.data)
      })
      .catch(console.error)
      .finally(() => setLoadingPays(false))
  }, [params])  // eslint-disable-line react-hooks/exhaustive-deps

  // AJOUTÉ — Évolution historique : utilise paramsNoYear (Modification 3)
  useEffect(() => {
    setLoadingYear(true)
    api.get(API_ROUTES.KPIS.BY_YEAR, { params: paramsNoYear })
      .then(r => setYearData(r.data))
      .catch(console.error)
      .finally(() => setLoadingYear(false))
  }, [paramsNoYear])  // eslint-disable-line react-hooks/exhaustive-deps

  // AJOUTÉ — Mix par branche (paramsNoBranch) + Top branches (params)
  useEffect(() => {
    setLoadingBranch(true)
    Promise.all([
      api.get(API_ROUTES.KPIS.BY_BRANCH, { params: paramsNoBranch }),
      api.get(API_ROUTES.KPIS.BY_BRANCH, { params }),
    ])
      .then(([mix, top]) => {
        setBranchMixData(mix.data || [])
        setBranchAllData(top.data || [])
      })
      .catch(console.error)
      .finally(() => setLoadingBranch(false))
  }, [paramsNoBranch, params])  // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Logique filtre branche actif ──────────────────────────────────────────
  const isBranchFilterActive = lf.branche.length > 0

  // AJOUTÉ — Modification 5 : Top Bar Chart hybride
  // S sélectionnées (couleur dynamique) + (10-S) meilleures restantes (gris)
  const topBranchChartData = useMemo(() => {
    if (!isBranchFilterActive) {
      return branchAllData.slice(0, 10).map(i => ({ ...i, is_selected: false }))
    }
    const selected = branchAllData
      .filter(item => lf.branche.includes(item.branche))
      .map(i => ({ ...i, is_selected: true }))
    const unselected = branchAllData
      .filter(item => !lf.branche.includes(item.branche))
      .slice(0, Math.max(0, 10 - selected.length))
      .map(i => ({ ...i, is_selected: false }))
    // Trier par valeur KPI (position réelle dans le classement)
    return [...selected, ...unselected]
      .sort((a, b) => (b.total_written_premium || 0) - (a.total_written_premium || 0))
  }, [branchAllData, lf.branche, isBranchFilterActive])

  // AJOUTÉ — Couleur barre selon sélection et ordre
  const getBranchBarColor = (branchName: string): string => {
    const idx = lf.branche.indexOf(branchName)
    return idx >= 0 ? getBranchColor(idx) : NEUTRAL_BAR
  }

  // AJOUTÉ — Modification 4 : Pie Chart figé
  // Segments sélectionnés en couleur dynamique, non-sélectionnés atténués
  const getPieCellFill = (branchName: string, index: number): string => {
    const baseColor = PIE_COLORS[index % PIE_COLORS.length]
    if (!isBranchFilterActive) return baseColor
    const selIdx = lf.branche.indexOf(branchName)
    if (selIdx >= 0) return getBranchColor(selIdx)
    return `${baseColor}44`  // opacité réduite (~27%)
  }

  // ─── Options pour les selects ──────────────────────────────────────────────
  const brancheOptions = useMemo(
    () => (filterOptions?.branc || []).map(b => ({ value: b, label: b })),
    [filterOptions?.branc],
  )
  const uwYears = filterOptions?.underwriting_years ?? []

  // Compteur de filtres locaux actifs
  const activeFilterCount = useMemo(() => {
    let n = 0
    if (lf.uw_years.length > 0 || lf.uw_year_min || lf.uw_year_max) n++
    if (lf.branche.length > 0) n++
    if (lf.type_contrat_spc.length > 0) n++
    if (lf.vie_non_vie !== 'ALL') n++
    return n
  }, [lf])

  // ─── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in p-2 pb-12">

      {/* ── En-tête page ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 p-4 rounded-xl border border-[var(--color-gray-100)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[hsla(209,28%,24%,0.08)]">
            <Globe size={20} className="text-[var(--color-navy)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-navy)]">Analyse Globale</h1>
            <p className="text-sm text-[var(--color-gray-500)] mt-0.5">
              Vue d'ensemble des performances par pays et branche
            </p>
          </div>
        </div>
      </div>

      {/* ── AJOUTÉ — Modification 2 : Filtre local "Par pays" ───────────── */}
      <div className="bg-white rounded-xl border border-[var(--color-gray-100)] shadow-sm px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={13} className="text-[var(--color-navy)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
              Filtres — Par pays &amp; Top branches
            </span>
            {activeFilterCount > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                style={{ background: 'var(--color-navy)' }}
              >
                {activeFilterCount}
              </span>
            )}
          </div>
          {/* AJOUTÉ — Bouton reset aligné à droite, ne touche pas le filtre global */}
          <button
            onClick={handleReset}
            className="text-xs font-semibold px-3 py-1 rounded-lg border transition-colors hover:bg-[var(--color-off-white)]"
            style={{ borderColor: 'var(--color-gray-200)', color: 'var(--color-gray-500)', background: 'white' }}
          >
            Réinitialiser
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Année de souscription — synchronisée avec global, modifiable localement */}
          <div>
            <label className={labelStyle}>Année de souscription</label>
            <div className="space-y-1.5">
              <Select
                isMulti
                options={uwYears.map(y => ({ value: y, label: String(y) }))}
                {...rsProps}
                placeholder="Toutes les années..."
                value={lf.uw_years.map(y => ({ value: y, label: String(y) }))}
                onChange={(v: any) => setLf(f => ({
                  ...f,
                  uw_years: v.map((x: any) => x.value),
                  uw_year_min: null,
                  uw_year_max: null,
                }))}
              />
              {lf.uw_years.length === 0 && (
                <div className="flex gap-1.5">
                  <select
                    title="Année min"
                    className="input-dark text-xs py-1 flex-1"
                    value={lf.uw_year_min ?? ''}
                    onChange={e => setLf(f => ({ ...f, uw_year_min: Number(e.target.value) || null }))}
                  >
                    <option value="">Min</option>
                    {uwYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select
                    title="Année max"
                    className="input-dark text-xs py-1 flex-1"
                    value={lf.uw_year_max ?? ''}
                    onChange={e => setLf(f => ({ ...f, uw_year_max: Number(e.target.value) || null }))}
                  >
                    <option value="">Max</option>
                    {uwYears.slice().reverse().map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* AJOUTÉ — Branche multi-select avec palette couleurs dynamiques */}
          <div>
            <label className={labelStyle}>Branche</label>
            <Select
              isMulti
              options={brancheOptions}
              {...rsProps}
              placeholder="Toutes les branches..."
              value={lf.branche.map(b => ({ value: b, label: b }))}
              onChange={(v: any) => setLf(f => ({ ...f, branche: v.map((x: any) => x.value) }))}
              formatOptionLabel={(opt: any) => {
                const idx = lf.branche.indexOf(opt.value)
                return (
                  <div className="flex items-center gap-2">
                    {idx >= 0 && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: getBranchColor(idx) }}
                      />
                    )}
                    <span>{opt.label}</span>
                  </div>
                )
              }}
            />
          </div>

          {/* AJOUTÉ — FAC / TTY / TTE (colonne INT_SPC_TYPE) */}
          <div>
            <label className={labelStyle}>FAC / TTY / TTE</label>
            <Select
              isMulti
              options={[
                { value: 'FAC', label: 'FAC' },
                { value: 'TTY', label: 'TTY' },
                { value: 'TTE', label: 'TTE' },
              ]}
              {...rsProps}
              placeholder="Tous..."
              value={lf.type_contrat_spc.map(t => ({ value: t, label: t }))}
              onChange={(v: any) => setLf(f => ({ ...f, type_contrat_spc: v.map((x: any) => x.value) }))}
            />
          </div>

          {/* AJOUTÉ — Vie / Non-vie toggle */}
          <div>
            <label className={labelStyle}>Vie / Non-vie</label>
            <div
              className="inline-flex rounded-lg p-0.5 border w-full"
              style={{ background: 'var(--color-off-white)', borderColor: 'var(--color-gray-200)' }}
            >
              {(['ALL', 'VIE', 'NON_VIE'] as VieView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setLf(f => ({ ...f, vie_non_vie: v }))}
                  className="flex-1 py-1.5 text-xs font-bold rounded-md transition-all"
                  style={{
                    background: lf.vie_non_vie === v ? 'var(--color-navy)' : 'transparent',
                    color: lf.vie_non_vie === v ? 'white' : 'var(--color-gray-500)',
                  }}
                >
                  {v === 'ALL' ? 'Tous' : v === 'VIE' ? 'Vie' : 'Non-vie'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODIFIÉ — Section "Par pays" (Modification 1 : onglet fusionné) */}
      <div className="space-y-4">

        {/* En-tête section avec badges branches */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-[var(--color-navy)]" />
            <h2 className="text-base font-bold text-[var(--color-navy)]">Par pays</h2>
            {/* AJOUTÉ — Badge "Vue filtrée" quand une branche est sélectionnée */}
            {isBranchFilterActive && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: 'hsla(43,96%,56%,0.12)',
                  color: 'hsl(43,96%,56%)',
                  border: '1px solid hsla(43,96%,56%,0.3)',
                }}
              >
                Vue filtrée
              </span>
            )}
          </div>

          {/* AJOUTÉ — Badges par branche sélectionnée avec couleur dynamique */}
          {isBranchFilterActive && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {lf.branche.map((b, i) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ background: getBranchColor(i) }}
                >
                  {b}
                  <button
                    onClick={() => setLf(f => ({ ...f, branche: f.branche.filter(x => x !== b) }))}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* KPI Summary cards — recalculés sur la sélection */}
        {loadingPays ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <ChartSkeleton key={i} height={88} />)}
          </div>
        ) : kpiData && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Prime Écrite', value: formatCompact(kpiData.total_written_premium) },
              {
                label: 'Résultat Net',
                value: formatCompact(kpiData.total_resultat),
                color: kpiData.total_resultat >= 0 ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)',
              },
              {
                label: 'Loss Ratio (Moy.)',
                value: formatPercent(kpiData.avg_ulr),
                color: ulrColor(kpiData.avg_ulr),
              },
              { label: 'Nb Contrats', value: String(kpiData.contract_count) },
              {
                label: 'Ratio Résultat/Prime',
                value: `${((kpiData.ratio_resultat_prime || 0)).toFixed(1)}%`,
              },
            ].map((kpi, i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-xl border border-[var(--color-gray-100)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between"
              >
                <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2">
                  {kpi.label}
                </span>
                <span
                  className="text-xl font-mono font-bold"
                  style={{ color: (kpi as any).color || 'var(--color-navy)' }}
                >
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* MODIFIÉ — Carte monde : utilise paramsNoCountry + pays_cedante pour le highlight */}
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
          {/* AJOUTÉ — Badges pays sélectionnés dans l'en-tête de la carte */}
          {filters.pays_cedante.length > 0 && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase">
                Pays sélectionnés :
              </span>
              {filters.pays_cedante.map((p, i) => (
                <span
                  key={p}
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ background: getBranchColor(i) }}
                >
                  {p}
                </span>
              ))}
            </div>
          )}
          {/* MODIFIÉ — WorldMap avec params immunisés et pays sélectionnés */}
          <WorldMap
            params={paramsNoCountry}
            selectedCountries={filters.pays_cedante}
            colorBy="premium"
          />
        </div>

        {/* MODIFIÉ — Tableau pays : lignes sélectionnées surlignées (Modification 6) */}
        {!loadingPays && countryData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] overflow-hidden">
            <div className="p-4 border-b border-[var(--color-gray-100)] bg-[var(--color-off-white)]">
              <h3 className="text-sm font-bold text-[var(--color-navy)]">Données par pays</h3>
            </div>
            <div className="overflow-x-auto max-h-[340px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[var(--color-off-white)] z-10 shadow-sm border-b border-[var(--color-gray-100)]">
                  <tr>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase">Pays</th>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right">Prime Écrite</th>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right">Loss Ratio</th>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right">Résultat</th>
                    <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right">Contrats</th>
                  </tr>
                </thead>
                <tbody>
                  {countryData.map((d: any, i: number) => {
                    // AJOUTÉ — Modification 6 : fond coloré pour les lignes sélectionnées
                    const isSelected = filters.pays_cedante.includes(d.pays)
                    return (
                      <tr
                        key={i}
                        className="border-b border-[var(--color-gray-100)] last:border-0 transition-colors"
                        style={{
                          background: isSelected
                            ? 'hsla(83,52%,36%,0.06)'
                            : 'transparent',
                        }}
                      >
                        <td className="py-3 px-4 text-xs font-bold text-[var(--color-navy)] flex items-center gap-1.5">
                          {isSelected && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: getBranchColor(filters.pays_cedante.indexOf(d.pays)) }}
                            />
                          )}
                          {d.pays}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-right">
                          {formatCompact(d.total_written_premium)}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono font-bold text-right">
                          <span
                            className="px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: ulrColor(d.avg_ulr) }}
                          >
                            {formatPercent(d.avg_ulr)}
                          </span>
                        </td>
                        <td
                          className="py-3 px-4 text-xs font-mono font-bold text-right"
                          style={{ color: d.total_resultat >= 0 ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)' }}
                        >
                          {formatCompact(d.total_resultat)}
                        </td>
                        <td className="py-3 px-4 text-xs text-right">{d.contract_count}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── AJOUTÉ — Section Évolution historique (paramsNoYear, Modification 3) */}
      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-[var(--color-navy)]" />
          <h2 className="text-base font-bold text-[var(--color-navy)]">Évolution Historique</h2>
        </div>

        {loadingYear ? (
          <ChartSkeleton height={300} />
        ) : (
          <>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={yearData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-100)" />
                  <XAxis
                    dataKey="year"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }}
                  />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={v => formatCompact(v)}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={v => `${v}%`}
                    domain={[0, 'auto']}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-white/95 backdrop-blur-md text-[var(--color-navy)] p-3 rounded-lg shadow-xl border border-[var(--color-gray-100)] text-xs">
                          <p className="font-bold mb-2">Année {label}</p>
                          {payload.map((e: any, i: number) => (
                            <div key={i} className="flex justify-between gap-4 mt-1 font-mono">
                              <span className="opacity-70 font-sans">{e.name}</span>
                              <span
                                className="font-bold"
                                style={{ color: e.dataKey === 'avg_ulr' ? 'hsl(30,88%,56%)' : e.color }}
                              >
                                {e.dataKey === 'avg_ulr' ? formatPercent(e.value) : formatCompact(e.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                  <Bar
                    yAxisId="left"
                    dataKey="total_written_premium"
                    name="Prime Écrite"
                    fill="hsl(209,28%,24%)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar yAxisId="left" dataKey="total_resultat" name="Résultat Net" radius={[4, 4, 0, 0]}>
                    {yearData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.total_resultat >= 0 ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)'}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avg_ulr"
                    name="Loss Ratio"
                    stroke="hsl(30,88%,56%)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {/* AJOUTÉ — Note visuelle immunisation année */}
            <p className="text-[11px] text-[var(--color-gray-400)] mt-2 italic">
              ℹ Ce graphique affiche toutes les années disponibles, indépendamment du filtre année sélectionné.
            </p>
          </>
        )}
      </div>

      {/* ── AJOUTÉ — Section Mix par branche (Modification 4 : Pie Chart figé) */}
      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <PieChart size={18} className="text-[var(--color-navy)]" />
          <h2 className="text-base font-bold text-[var(--color-navy)]">Mix par branche</h2>
          {/* AJOUTÉ — Tag "Vue 100%" quand filtre branche actif */}
          {isBranchFilterActive && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
              background: 'hsla(43,96%,56%,0.15)', color: 'hsl(43,96%,56%)',
              border: '1px solid hsla(43,96%,56%,0.3)', borderRadius: 99,
              whiteSpace: 'nowrap',
            }}>
              🔒 Vue 100% · {lf.branche.join(', ')}
            </span>
          )}
        </div>

        {loadingBranch ? (
          <ChartSkeleton height={280} />
        ) : (
          <>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={branchMixData.map((d: any) => ({ name: d.branche, value: d.total_written_premium }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    isAnimationActive
                    animationDuration={900}
                    animationEasing="ease-out"
                    stroke="none"
                  >
                    {branchMixData.map((entry: any, index: number) => (
                      // AJOUTÉ — Modification 4 : fill conditionnel par sélection
                      <Cell
                        key={`cell-${index}`}
                        fill={getPieCellFill(entry.branche, index)}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val: number) => formatCompact(val)} />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', maxHeight: '220px', overflowY: 'auto' }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            {/* AJOUTÉ — Note visuelle immunisation */}
            <p className="text-[11px] text-[var(--color-gray-400)] mt-2 italic">
              ℹ Ce graphique affiche toutes les années disponibles, indépendamment du filtre année sélectionné.
            </p>
          </>
        )}
      </div>

      {/* ── AJOUTÉ — Section Top branches (Modification 5 : Bar Chart hybride) */}
      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={18} className="text-[var(--color-navy)]" />
          <h2 className="text-base font-bold text-[var(--color-navy)]">Top 10 branches</h2>
          {isBranchFilterActive && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
              background: 'hsla(83,52%,36%,0.12)', color: 'hsl(83,52%,36%)',
              border: '1px solid hsla(83,52%,36%,0.3)', borderRadius: 99,
            }}>
              {lf.branche.length} sélectionnée(s) mise(s) en avant
            </span>
          )}
        </div>

        {loadingBranch ? (
          <ChartSkeleton height={320} />
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topBranchChartData}
                layout="vertical"
                margin={{ left: 10, right: 60 }}
              >
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(218,22%,93%)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'hsl(218,10%,55%)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => formatCompact(v)}
                />
                <YAxis
                  type="category"
                  dataKey="branche"
                  tick={{ fill: 'hsl(218,12%,42%)', fontSize: 10, fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  width={140}
                  tickFormatter={v => v.length > 22 ? `${v.slice(0, 21)}…` : v}
                />
                <RechartsTooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-white/95 p-3 rounded-lg shadow-xl border border-[var(--color-gray-100)] text-xs">
                        <p className="font-bold mb-2 text-[var(--color-navy)]">{d.branche}</p>
                        <div className="flex justify-between gap-4">
                          <span className="opacity-70">Prime :</span>
                          <span className="font-mono font-bold">{formatCompact(d.total_written_premium)}</span>
                        </div>
                        <div className="flex justify-between gap-4 mt-1">
                          <span className="opacity-70">ULR :</span>
                          <span className="font-mono font-bold" style={{ color: ulrColor(d.avg_ulr) }}>
                            {formatPercent(d.avg_ulr)}
                          </span>
                        </div>
                        {/* AJOUTÉ — Badge "Hors Top 10" si branche sélectionnée hors classement */}
                        {d.is_selected && branchAllData.findIndex(b => b.branche === d.branche) >= 10 && (
                          <div className="mt-1 text-[10px] text-amber-600 font-bold">⚠ Hors Top 10 naturel</div>
                        )}
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="total_written_premium"
                  name="Prime écrite"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  {topBranchChartData.map((entry: any, i: number) => (
                    // AJOUTÉ — Modification 5 : couleur dynamique si sélectionné, gris sinon
                    <Cell
                      key={i}
                      fill={entry.is_selected ? getBranchBarColor(entry.branche) : NEUTRAL_BAR}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  )
}
