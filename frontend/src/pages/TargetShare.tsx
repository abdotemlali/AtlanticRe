/**
 * Cibles TTY — Page de calcul des parts cibles sur les traités TTY.
 *
 * Affiche pour chaque contrat TTY filtré :
 *  - la part actuelle vs la part cible calculée (règles d'ajustement),
 *  - le potentiel additionnel (prime cible − prime actuelle),
 *  - les KPIs agrégés, un top 15 et un scatter part actuelle vs cible.
 */
import React, { useMemo, useState, useEffect, Fragment } from 'react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import {
  Crosshair, TrendingUp, Target as TargetIcon, Lock,
  ArrowUp, ArrowDown, ArrowUpDown, Search, ChevronDown, ChevronRight, ChevronUp,
  Download, Settings2, RotateCcw
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'

import { API_ROUTES } from '../constants/api'
import api from '../utils/api'
import { useData } from '../context/DataContext'
import { useFetch } from '../hooks/useFetch'
import { useLocalFilters } from '../hooks/useLocalFilters'
import LocalFilterPanel from '../components/LocalFilterPanel'
import { formatCompact, formatNumber, formatPercent } from '../utils/formatters'
import { ChartSkeleton } from '../components/ui/Skeleton'

// ─── Types ──────────────────────────────────────────────────────────────────
interface TargetShareRow {
  policy_sequence_number: string
  contract_number: string
  cedante: string
  cedant_code: string
  pays: string
  branche: string
  ulr: number | null
  lob_count: number
  share_signed: number
  written_premium: number
  written_premium_whole: number
  underwriting_year: number | null
  vie_non_vie: string
  type_of_contract: string
  adjustments_detail: {
    ulr_bonus: number
    lob_bonus: number
    low_share_bonus: number
    ulr_malus: number
  }
  raw_adjustment: number
  capped_adjustment: number
  part_cible: number
  prime_cible: number
  potentiel_additionnel: number
  cap_applied: boolean
  triple_cap_applied: boolean
  badge: 'HAUSSE' | 'BAISSE' | 'STABLE'
}

interface TargetShareSummary {
  total_tty_contracts: number
  total_potentiel_additionnel: number
  count_hausse: number
  count_baisse: number
  count_stable: number
  count_cap_applied: number
}

interface TargetShareResponse {
  data: TargetShareRow[]
  summary: TargetShareSummary
  scatter: any[]
  top15: any[]
  total_items: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const COLOR_HAUSSE = '#4ade80'
const COLOR_BAISSE = '#f87171'
const COLOR_STABLE = 'hsl(218,14%,70%)'

function badgeColor(b: TargetShareRow['badge']) {
  if (b === 'HAUSSE') return COLOR_HAUSSE
  if (b === 'BAISSE') return COLOR_BAISSE
  return COLOR_STABLE
}

function adjustmentBadgeStyle(v: number) {
  if (v > 0) return { bg: 'hsla(142,71%,45%,0.12)', fg: 'hsl(142,71%,35%)', border: 'hsla(142,71%,45%,0.40)' }
  if (v < 0) return { bg: 'hsla(358,66%,54%,0.12)', fg: 'hsl(358,66%,54%)', border: 'hsla(358,66%,54%,0.40)' }
  return { bg: 'hsla(218,14%,50%,0.10)', fg: 'hsl(218,14%,40%)', border: 'hsla(218,14%,50%,0.30)' }
}

function adjTooltip(r: TargetShareRow, p: AdjustmentParams) {
  const d = r.adjustments_detail
  const fmt = (v: number) => (v >= 0 ? `+${v}` : `${v}`)
  return (
    `ULR < ${p.ulr_low_threshold}% : ${fmt(d.ulr_bonus)} | ` +
    `LOB ≥ ${p.lob_threshold} : ${fmt(d.lob_bonus)} | ` +
    `Part < ${p.low_share_threshold}% : ${fmt(d.low_share_bonus)} | ` +
    `ULR > ${p.ulr_high_threshold}% : ${fmt(d.ulr_malus)} → ` +
    `brut : ${fmt(r.raw_adjustment)} → net : ${fmt(r.capped_adjustment)}`
  )
}

// ─── Ajustements ────────────────────────────────────────────────────────────
interface AdjustmentParams {
  ulr_low_threshold: number
  ulr_low_bonus: number
  lob_threshold: number
  lob_bonus: number
  low_share_threshold: number
  low_share_bonus: number
  ulr_high_threshold: number
  ulr_high_malus: number
  max_increase_per_renewal: number
  max_multiple: number
  cap_mdh: number   // en MDH dans le formulaire (ex: 10 = 10 MDH)
}

const DEFAULT_ADJUSTMENTS: AdjustmentParams = {
  ulr_low_threshold: 60,
  ulr_low_bonus: 1,
  lob_threshold: 4,
  lob_bonus: 1,
  low_share_threshold: 5,
  low_share_bonus: 1,
  ulr_high_threshold: 80,
  ulr_high_malus: -1,
  max_increase_per_renewal: 2,
  max_multiple: 3,
  cap_mdh: 10,
}

type PillKey = 'stable' | 'baisse' | 'hausse' | 'all'
type SortKey =
  | 'cedante' | 'pays' | 'branche' | 'share_signed' | 'ulr' | 'lob_count'
  | 'capped_adjustment' | 'part_cible' | 'written_premium' | 'prime_cible'
  | 'potentiel_additionnel'

// ─── Page ───────────────────────────────────────────────────────────────────
export default function TargetShare() {
  const { filterOptions } = useData()
  const lf = useLocalFilters()

  const [adjustmentParams, setAdjustmentParams] = useState<AdjustmentParams>(DEFAULT_ADJUSTMENTS)
  const [pendingAdjustments, setPendingAdjustments] = useState<AdjustmentParams>(DEFAULT_ADJUSTMENTS)
  const [showAdjustments, setShowAdjustments] = useState(false)

  const [pill, setPill] = useState<PillKey>('hausse')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('potentiel_additionnel')
  const [sortDesc, setSortDesc] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 25
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(handler)
  }, [search])

  // Reset page when filters/search/pill change
  useEffect(() => { setPage(1) }, [debouncedSearch, pill, sortBy, sortDesc])

  // Build params with server-side pagination and filters
  const availableCountries = filterOptions?.pays_risque ?? []
  const params = useMemo(() => ({
    ...lf.buildParams(availableCountries),
    page: String(page),
    page_size: String(pageSize),
    pill,
    search: debouncedSearch,
    sort_by: sortBy,
    sort_desc: sortDesc ? 'true' : 'false',
    ulr_low_threshold: String(adjustmentParams.ulr_low_threshold),
    ulr_low_bonus: String(adjustmentParams.ulr_low_bonus),
    lob_threshold: String(adjustmentParams.lob_threshold),
    lob_bonus: String(adjustmentParams.lob_bonus),
    low_share_threshold: String(adjustmentParams.low_share_threshold),
    low_share_bonus: String(adjustmentParams.low_share_bonus),
    ulr_high_threshold: String(adjustmentParams.ulr_high_threshold),
    ulr_high_malus: String(adjustmentParams.ulr_high_malus),
    max_increase_per_renewal: String(adjustmentParams.max_increase_per_renewal),
    max_multiple: String(adjustmentParams.max_multiple),
    cap_mdh: String(adjustmentParams.cap_mdh * 1_000_000),
  }), [lf.buildParams, availableCountries, page, pageSize, pill, debouncedSearch, sortBy, sortDesc, adjustmentParams])

  const { data: res, loading } = useFetch<TargetShareResponse>(
    API_ROUTES.TARGET_SHARE.LIST,
    params,
  )

  const pagedRows: TargetShareRow[] = res?.data ?? []
  const summary = res?.summary
  const top15 = res?.top15 ?? []
  const totalItems = res?.total_items ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // ── Export to Excel ────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    setExporting(true)
    try {
      // Use the backend's `export=true` flag which bypasses pagination entirely
      const exportParams = {
        ...lf.buildParams(availableCountries),
        pill,
        search: debouncedSearch,
        sort_by: sortBy,
        sort_desc: sortDesc ? 'true' : 'false',
        export: 'true',
      }
      const resp = await api.get<TargetShareResponse>(API_ROUTES.TARGET_SHARE.LIST, { params: exportParams })
      const rows = resp.data.data ?? []

      const wsData = rows.map(r => ({
        'Cédante': r.cedante,
        'Pays': r.pays,
        'Branche': r.branche,
        'Tendance': r.badge,
        'Part Actuelle (%)': Number((r.share_signed * 100).toFixed(2)),
        'ULR (%)': r.ulr !== null ? Number((r.ulr * 100).toFixed(2)) : null,
        'LOB': r.lob_count,
        'Ajustement': r.capped_adjustment,
        'Part Cible (%)': Number((r.part_cible * 100).toFixed(2)),
        'Prime Actuelle (MAD)': r.written_premium,
        'Prime Cible (MAD)': r.prime_cible,
        'Potentiel Additionnel (MAD)': r.potentiel_additionnel,
      }))

      const ws = XLSX.utils.json_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Cibles TTY')
      const pillLabel = pill === 'all' ? 'tous' : pill
      XLSX.writeFile(wb, `cibles_tty_${pillLabel}.xlsx`)
    } catch (err) {
      console.error('Export Excel failed', err)
    } finally {
      setExporting(false)
    }
  }

  // ── Sort header helper ────────────────────────────────────────────────────
  const handleSort = (col: SortKey) => {
    if (sortBy === col) setSortDesc(d => !d)
    else { setSortBy(col); setSortDesc(true) }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortBy !== col) return <ArrowUpDown size={10} className="opacity-30 ml-1 flex-shrink-0" />
    return sortDesc
      ? <ArrowDown size={10} className="ml-1 flex-shrink-0" style={{ color: 'hsl(83,50%,55%)' }} />
      : <ArrowUp size={10} className="ml-1 flex-shrink-0" style={{ color: 'hsl(83,50%,55%)' }} />
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full animate-fade-in">

      {/* Filtres de la vue — même composant que AnalyseCedante */}
      <div className="flex-shrink-0 z-40 bg-[var(--color-off-white)] pt-1 pb-2 px-2">
        <LocalFilterPanel
          filters={lf}
          allBranches={filterOptions?.branc ?? []}
          uwYears={filterOptions?.underwriting_years ?? []}
          typeSpcOptions={filterOptions?.type_contrat_spc ?? []}
          typeOfContractOptions={filterOptions?.type_of_contract ?? []}
          cedanteOptions={filterOptions?.cedantes ?? []}
          brokerOptions={filterOptions?.courtiers ?? []}
          countryOptions={filterOptions?.pays_risque ?? []}
          availableCountries={filterOptions?.pays_risque ?? []}
          features={['marketType', 'africanMarkets', 'year', 'branch', 'typeContract', 'lifeScope', 'cedante', 'broker', 'country']}
        />
      </div>

      {/* Ajustements — barre collapsible */}
      <div className="flex-shrink-0 z-30 px-2 pb-2">
        <div className="bg-white rounded-xl border border-[var(--color-gray-100)] shadow-sm overflow-hidden">
          <button
            onClick={() => setShowAdjustments(o => !o)}
            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[var(--color-gray-50)] transition-colors"
          >
            <Settings2 size={13} className="text-[var(--color-navy)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
              Ajustements
            </span>
            {JSON.stringify(adjustmentParams) !== JSON.stringify(DEFAULT_ADJUSTMENTS) && (
              <span
                className="px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                style={{
                  background: 'hsla(83,52%,36%,0.10)',
                  color: 'hsl(83,52%,36%)',
                  border: '1px solid hsla(83,52%,36%,0.30)',
                }}
              >
                Personnalisés
              </span>
            )}
            <span className="ml-auto text-[var(--color-gray-400)]">
              {showAdjustments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>

          {showAdjustments && (
            <div className="px-4 pb-4 border-t border-[var(--color-gray-100)]">
              {/* Règles d'ajustement */}
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-3 mb-2">
                Règles d'ajustement
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-gray-400">
                      <th className="text-left pb-1 font-semibold pr-4">Règle</th>
                      <th className="text-center pb-1 font-semibold px-4">Seuil</th>
                      <th className="text-center pb-1 font-semibold pl-4">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {/* ULR bas → bonus */}
                    <tr className="py-1.5">
                      <td className="py-2 pr-4 text-gray-700 font-medium whitespace-nowrap">ULR inférieur à</td>
                      <td className="py-2 px-4 text-center">
                        <span className="inline-flex items-center gap-1">
                          <input
                            type="number" min={0} max={200}
                            value={pendingAdjustments.ulr_low_threshold}
                            onChange={e => setPendingAdjustments(p => ({ ...p, ulr_low_threshold: Number(e.target.value) }))}
                            className="input-dark w-16 text-center text-xs py-1"
                          />
                          <span className="text-gray-500">%</span>
                        </span>
                      </td>
                      <td className="py-2 pl-4 text-center">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-gray-400">+</span>
                          <input
                            type="number" min={0} max={5}
                            value={pendingAdjustments.ulr_low_bonus}
                            onChange={e => setPendingAdjustments(p => ({ ...p, ulr_low_bonus: Number(e.target.value) }))}
                            className="input-dark w-16 text-center text-xs py-1"
                          />
                          <span className="text-gray-500">pt</span>
                        </span>
                      </td>
                    </tr>
                    {/* LOB → bonus */}
                    <tr>
                      <td className="py-2 pr-4 text-gray-700 font-medium whitespace-nowrap">LOB couverts ≥</td>
                      <td className="py-2 px-4 text-center">
                        <input
                          type="number" min={1} max={20}
                          value={pendingAdjustments.lob_threshold}
                          onChange={e => setPendingAdjustments(p => ({ ...p, lob_threshold: Number(e.target.value) }))}
                          className="input-dark w-16 text-center text-xs py-1"
                        />
                      </td>
                      <td className="py-2 pl-4 text-center">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-gray-400">+</span>
                          <input
                            type="number" min={0} max={5}
                            value={pendingAdjustments.lob_bonus}
                            onChange={e => setPendingAdjustments(p => ({ ...p, lob_bonus: Number(e.target.value) }))}
                            className="input-dark w-16 text-center text-xs py-1"
                          />
                          <span className="text-gray-500">pt</span>
                        </span>
                      </td>
                    </tr>
                    {/* Part faible → bonus */}
                    <tr>
                      <td className="py-2 pr-4 text-gray-700 font-medium whitespace-nowrap">Part actuelle &lt;</td>
                      <td className="py-2 px-4 text-center">
                        <span className="inline-flex items-center gap-1">
                          <input
                            type="number" min={0} max={100}
                            value={pendingAdjustments.low_share_threshold}
                            onChange={e => setPendingAdjustments(p => ({ ...p, low_share_threshold: Number(e.target.value) }))}
                            className="input-dark w-16 text-center text-xs py-1"
                          />
                          <span className="text-gray-500">%</span>
                        </span>
                      </td>
                      <td className="py-2 pl-4 text-center">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-gray-400">+</span>
                          <input
                            type="number" min={0} max={5}
                            value={pendingAdjustments.low_share_bonus}
                            onChange={e => setPendingAdjustments(p => ({ ...p, low_share_bonus: Number(e.target.value) }))}
                            className="input-dark w-16 text-center text-xs py-1"
                          />
                          <span className="text-gray-500">pt</span>
                        </span>
                      </td>
                    </tr>
                    {/* ULR élevé → malus */}
                    <tr>
                      <td className="py-2 pr-4 text-gray-700 font-medium whitespace-nowrap">ULR supérieur à</td>
                      <td className="py-2 px-4 text-center">
                        <span className="inline-flex items-center gap-1">
                          <input
                            type="number" min={0} max={200}
                            value={pendingAdjustments.ulr_high_threshold}
                            onChange={e => setPendingAdjustments(p => ({ ...p, ulr_high_threshold: Number(e.target.value) }))}
                            className="input-dark w-16 text-center text-xs py-1"
                          />
                          <span className="text-gray-500">%</span>
                        </span>
                      </td>
                      <td className="py-2 pl-4 text-center">
                        <input
                          type="number" min={-5} max={0}
                          value={pendingAdjustments.ulr_high_malus}
                          onChange={e => setPendingAdjustments(p => ({ ...p, ulr_high_malus: Number(e.target.value) }))}
                          className="input-dark w-16 text-center text-xs py-1"
                        />
                        <span className="text-gray-500 ml-1">pt</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Contraintes */}
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-4 mb-2">
                Contraintes
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs text-gray-700">
                  <span className="font-medium w-56 flex-shrink-0">Hausse max par renouvellement</span>
                  <span className="text-gray-400">+</span>
                  <input
                    type="number" min={0} max={10}
                    value={pendingAdjustments.max_increase_per_renewal}
                    onChange={e => setPendingAdjustments(p => ({ ...p, max_increase_per_renewal: Number(e.target.value) }))}
                    className="input-dark w-16 text-center text-xs py-1"
                  />
                  <span className="text-gray-500">pts max</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-700">
                  <span className="font-medium w-56 flex-shrink-0">Plafond multiplicateur</span>
                  <input
                    type="number" min={1} max={10}
                    value={pendingAdjustments.max_multiple}
                    onChange={e => setPendingAdjustments(p => ({ ...p, max_multiple: Number(e.target.value) }))}
                    className="input-dark w-16 text-center text-xs py-1"
                  />
                  <span className="text-gray-500">× part actuelle</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-700">
                  <span className="font-medium w-56 flex-shrink-0">Cap prime cible</span>
                  <input
                    type="number" min={1} max={1000}
                    value={pendingAdjustments.cap_mdh}
                    onChange={e => setPendingAdjustments(p => ({ ...p, cap_mdh: Number(e.target.value) }))}
                    className="input-dark w-16 text-center text-xs py-1"
                  />
                  <span className="text-gray-500">MDH</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  onClick={() => setPendingAdjustments(DEFAULT_ADJUSTMENTS)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    border: '1px solid var(--color-gray-200)',
                    color: 'var(--color-gray-500)',
                  }}
                >
                  <RotateCcw size={11} />
                  Réinitialiser
                </button>
                <button
                  onClick={() => {
                    setAdjustmentParams(pendingAdjustments)
                    setShowAdjustments(false)
                    toast.success('Ajustements appliqués')
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, hsl(209,28%,20%), hsl(209,28%,30%))',
                    color: 'white',
                    border: '1px solid hsla(209,28%,24%,0.5)',
                    boxShadow: '0 2px 8px hsla(209,28%,24%,0.25)',
                  }}
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 p-2 pb-12">

        {/* ─── Header ─── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="animate-slide-up">
            <h1 className="text-lg font-bold text-[var(--color-navy)] flex items-center gap-2">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'hsla(83,52%,36%,0.12)', border: '1px solid hsla(83,52%,36%,0.25)' }}
              >
                <Crosshair size={15} style={{ color: 'hsl(83,52%,36%)' }} />
              </span>
              Cibles TTY
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Parts cibles et potentiel additionnel sur les traités TTY (règles d'ajustement appliquées)
            </p>
          </div>
        </div>

        {/* ─── KPI Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Traités TTY"
            value={formatNumber(summary?.total_tty_contracts ?? 0)}
            sub="Contrats analysés"
            icon={<Crosshair size={18} />}
            accent="hsl(209,28%,24%)"
            glow="hsla(209,28%,24%,0.10)"
            loading={loading}
            index={0}
          />
          <KpiCard
            label="Potentiel Additionnel"
            value={formatCompact(summary?.total_potentiel_additionnel ?? 0)}
            sub="Gain potentiel en MAD"
            icon={<TrendingUp size={18} />}
            accent="hsl(152,56%,39%)"
            glow="hsla(152,56%,39%,0.12)"
            loading={loading}
            index={1}
          />
          <KpiCard
            label="Traités en Hausse"
            value={formatNumber(summary?.count_hausse ?? 0)}
            sub={`Stable : ${summary?.count_stable ?? 0} · Baisse : ${summary?.count_baisse ?? 0}`}
            icon={<TargetIcon size={18} />}
            accent="hsl(83,52%,36%)"
            glow="hsla(83,52%,36%,0.12)"
            loading={loading}
            index={2}
          />
          <KpiCard
            label="Au Cap 10 MDH"
            value={formatNumber(summary?.count_cap_applied ?? 0)}
            sub="Plafonds atteints"
            icon={<Lock size={18} />}
            accent="hsl(30,88%,45%)"
            glow="hsla(30,88%,45%,0.12)"
            loading={loading}
            index={3}
          />
        </div>

        {/* ─── Pills ─── */}
        <div className="flex flex-wrap gap-2">
          <PillButton
            active={pill === 'stable'}
            onClick={() => setPill('stable')}
            color="hsl(218,14%,55%)"
          >
            ⏸ Stable
          </PillButton>
          <PillButton
            active={pill === 'baisse'}
            onClick={() => setPill('baisse')}
            color="hsl(358,66%,54%)"
          >
            📉 Baisse
          </PillButton>
          <PillButton
            active={pill === 'hausse'}
            onClick={() => setPill('hausse')}
            color="hsl(142,56%,40%)"
          >
            📈 Hausse
          </PillButton>
          <PillButton
            active={pill === 'all'}
            onClick={() => setPill('all')}
          >
            📋 Tous
          </PillButton>
        </div>

        {/* ─── Table ─── */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <h3 className="text-sm font-bold text-[var(--color-navy)]">
              Détail des traités TTY
            </h3>
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une cédante, branche, pays…"
                className="input-dark pl-8 text-xs py-2 w-full"
              />
            </div>
            <span
              className="text-xs font-semibold rounded-full px-3 py-1 tabular-nums"
              style={{ background: 'var(--color-navy-muted)', color: 'var(--color-navy)' }}
            >
              {totalItems.toLocaleString('fr-FR')} contrat{totalItems > 1 ? 's' : ''}
            </span>
            <button
              onClick={handleExportExcel}
              disabled={exporting || loading || totalItems === 0}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: exporting ? 'hsla(142,56%,39%,0.15)' : 'linear-gradient(135deg, hsl(142,56%,32%), hsl(142,56%,44%))',
                color: exporting ? 'hsl(142,56%,39%)' : 'white',
                border: '1px solid hsla(142,56%,39%,0.4)',
                boxShadow: exporting ? 'none' : '0 2px 8px hsla(142,56%,39%,0.25)',
              }}
              title="Exporter toutes les lignes filtrées en Excel"
            >
              <Download size={13} className={exporting ? 'animate-bounce' : ''} />
              {exporting ? 'Export…' : 'Exporter Excel'}
            </button>
          </div>

          <div className="overflow-auto rounded-xl" style={{
            border: '1px solid var(--color-gray-100)',
            boxShadow: 'var(--shadow-sm)',
            maxHeight: 560,
            background: 'var(--color-white)',
          }}>
            <table className="data-table">
              <thead>
                <tr>
                  <Th col="cedante" label="Cédante" sortBy={sortBy} sortDesc={sortDesc} onSort={handleSort} SortIcon={SortIcon} />
                  <Th col="pays" label="Pays" sortBy={sortBy} sortDesc={sortDesc} onSort={handleSort} SortIcon={SortIcon} />
                  <Th col="branche" label="Branche" sortBy={sortBy} sortDesc={sortDesc} onSort={handleSort} SortIcon={SortIcon} />
                  <Th col="share_signed" label="Part actuelle" align="right" sortBy={sortBy} sortDesc={sortDesc} onSort={handleSort} SortIcon={SortIcon} />
                  <Th col="ulr" label="ULR" align="right" sortBy={sortBy} sortDesc={sortDesc} onSort={handleSort} SortIcon={SortIcon} />
                  <Th col="lob_count" label="LOB" align="center" sortBy={sortBy} sortDesc={sortDesc} onSort={handleSort} SortIcon={SortIcon} />
                  <Th col="capped_adjustment" label="Ajust." align="center" sortBy={sortBy} sortDesc={sortDesc} onSort={handleSort} SortIcon={SortIcon} />
                  <th aria-label="expand"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">Chargement…</td></tr>
                ) : pagedRows.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">Aucun traité TTY trouvé</td></tr>
                ) : pagedRows.map((r, i) => {
                  const adj = adjustmentBadgeStyle(r.capped_adjustment)
                  const capLocked = r.cap_applied || r.triple_cap_applied
                  const capTitle = r.cap_applied ? 'Cap 10 MDH appliqué' : r.triple_cap_applied ? 'Règle triple appliquée' : ''
                  const rowId = `${r.policy_sequence_number}-${i}`
                  const isExpanded = expandedRow === rowId
                  return (
                    <Fragment key={rowId}>
                      <tr 
                        onClick={() => setExpandedRow(isExpanded ? null : rowId)}
                        style={{ cursor: 'pointer', animationDelay: `${Math.min(i * 15, 300)}ms`, background: isExpanded ? '#f9fafb' : undefined }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td>
                          <div className="flex items-center gap-2">
                            <span
                              style={{
                                display: 'inline-block',
                                width: 8, height: 8, borderRadius: '50%',
                                background: badgeColor(r.badge),
                                flexShrink: 0,
                              }}
                              title={r.badge}
                            />
                            <span className="font-semibold text-[var(--color-navy)] truncate max-w-[200px]" title={r.cedante}>
                              {r.cedante}
                            </span>
                          </div>
                        </td>
                        <td className="text-xs text-gray-600">{r.pays}</td>
                        <td className="text-xs text-gray-600">{r.branche}</td>
                        <td className="text-right font-mono text-xs">{formatPercent(r.share_signed)}</td>
                        <td className="text-right font-mono text-xs">
                          {r.ulr !== null ? formatPercent(r.ulr) : '—'}
                        </td>
                        <td className="text-center font-mono text-xs">{r.lob_count}</td>
                        <td className="text-center">
                          <span
                            title={adjTooltip(r, adjustmentParams)}
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 700,
                              background: adj.bg,
                              color: adj.fg,
                              border: `1px solid ${adj.border}`,
                              cursor: 'help',
                            }}
                          >
                            {r.capped_adjustment > 0 ? `+${r.capped_adjustment}` : r.capped_adjustment}
                          </span>
                        </td>
                        <td className="text-center text-gray-400">
                          {isExpanded ? <ChevronDown size={14} className="inline-block" /> : <ChevronRight size={14} className="inline-block" />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <td colSpan={8} className="p-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm animate-fade-in">
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">Part Cible</p>
                                <p className="text-sm font-mono font-bold text-[var(--color-navy)] flex items-center gap-1">
                                  {formatPercent(r.part_cible)}
                                  {capLocked && (
                                    <span title={capTitle} style={{ display: 'inline-flex' }}>
                                      <Lock size={12} style={{ color: 'hsl(30,88%,45%)' }} />
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">Prime Actuelle</p>
                                <p className="text-sm font-mono font-bold text-[var(--color-navy)]">
                                  {formatCompact(r.written_premium)} MAD
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">Prime Cible</p>
                                <p className="text-sm font-mono font-bold text-[var(--color-navy)]">
                                  {formatCompact(r.prime_cible)} MAD
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold">Potentiel Additionnel</p>
                                <p 
                                  className="text-sm font-mono font-bold"
                                  style={{ color: r.potentiel_additionnel >= 0 ? 'var(--color-emerald)' : 'var(--color-red)' }}
                                >
                                  {r.potentiel_additionnel > 0 ? '+' : ''}{formatCompact(r.potentiel_additionnel)} MAD
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between flex-wrap gap-2 mt-3">
              <p className="text-xs text-gray-400 tabular-nums">
                Page <span className="font-semibold text-navy">{page}</span> / {totalPages}
                <span className="mx-1">·</span>
                {totalItems.toLocaleString('fr-FR')} contrats
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ border: '1px solid var(--color-gray-200)', color: 'var(--color-navy)' }}
                >
                  Précédent
                </button>
                <span className="px-3 text-xs text-gray-500">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ border: '1px solid var(--color-gray-200)', color: 'var(--color-navy)' }}
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Charts ─── */}
        <div className="grid grid-cols-1 gap-4">
          {/* Top 15 */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold text-[var(--color-navy)] mb-3">
              Top 15 —{' '}
              {pill === 'baisse' ? 'Plus grande diminution' : 'Plus grand potentiel additionnel'}
            </h3>
            {loading ? (
              <ChartSkeleton height={420} />
            ) : top15.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={420}>
                <BarChart data={top15} layout="vertical" margin={{ top: 8, right: 28, left: 12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(218,22%,90%)" />
                  <XAxis
                    type="number"
                    domain={pill === 'baisse' ? ['dataMin', 0] : [0, 'dataMax']}
                    tickFormatter={(v) => formatCompact(Number(v))}
                    tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }}
                    allowDataOverflow={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={220}
                    tick={{ fontSize: 10, fill: 'var(--color-gray-600)' }}
                    interval={0}
                  />
                  <RechartsTooltip
                    formatter={(v: any) => [formatCompact(Number(v)) + ' MAD', pill === 'baisse' ? 'Diminution' : 'Potentiel']}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <Bar dataKey="potentiel" radius={[0, 4, 4, 0]}>
                    {top15.map((_e, i) => (
                      <Cell
                        key={i}
                        fill={pill === 'baisse' ? COLOR_BAISSE : pill === 'stable' ? COLOR_STABLE : COLOR_HAUSSE}
                      />
                    ))}
                    <LabelList
                      dataKey="potentiel"
                      position={pill === 'baisse' ? 'left' : 'right'}
                      formatter={(v: any) => formatCompact(Number(v))}
                      style={{ fontSize: 10, fill: 'var(--color-gray-600)' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, accent, glow, loading, index,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  accent: string
  glow: string
  loading?: boolean
  index: number
}) {
  if (loading) {
    return (
      <div className="glass-card p-5 min-h-[110px] animate-pulse" style={{ animationDelay: `${index * 80}ms` }}>
        <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
        <div className="h-6 w-20 bg-gray-300 rounded mb-2" />
        <div className="h-2 w-32 bg-gray-100 rounded" />
      </div>
    )
  }
  return (
    <div
      className="float-element glass-card p-5 relative overflow-hidden group"
      style={{
        animation: `slideUpFade 400ms cubic-bezier(0.22,1,0.36,1) ${index * 80}ms both`,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: glow, filter: 'blur(18px)' }}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between mb-3">
        <p
          className="text-[0.71rem] font-bold uppercase tracking-[0.07em] pr-2 leading-tight"
          style={{ color: 'var(--color-gray-500)' }}
        >
          {label}
        </p>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-250 group-hover:scale-110"
          style={{ background: glow, boxShadow: `0 2px 10px ${glow}`, color: accent }}
        >
          {icon}
        </div>
      </div>
      <p
        className="font-bold text-navy tabular-nums truncate leading-none mb-1.5 font-mono"
        style={{ fontSize: 'clamp(1.4rem, 2vw, 1.8rem)', letterSpacing: '-0.01em' }}
      >
        {value}
      </p>
      <p className="text-xs text-gray-400 truncate">{sub}</p>
    </div>
  )
}

function PillButton({
  active, onClick, children, color,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  color?: string
}) {
  const activeColor = color ?? 'hsl(83,52%,36%)'
  const activeColorDark = color ?? 'hsl(83,54%,27%)'
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-xs font-semibold transition-all duration-250"
      style={active
        ? {
            background: `linear-gradient(135deg, ${activeColorDark}, ${activeColor})`,
            color: 'white',
            boxShadow: `0 2px 10px ${activeColor}55`,
            border: `1px solid ${activeColor}66`,
          }
        : {
            background: 'var(--color-white)',
            color: color ?? 'var(--color-navy)',
            border: `1px solid ${color ? color + '44' : 'var(--color-gray-200)'}`,
          }
      }
    >
      {children}
    </button>
  )
}

function Th({
  col, label, align = 'left', sortBy, sortDesc, onSort, SortIcon,
}: {
  col: SortKey
  label: string
  align?: 'left' | 'right' | 'center'
  sortBy: SortKey
  sortDesc: boolean
  onSort: (c: SortKey) => void
  SortIcon: React.ComponentType<{ col: SortKey }>
}) {
  // sortDesc/sortBy are captured via closure when the component re-renders
  void sortBy; void sortDesc
  return (
    <th onClick={() => onSort(col)} style={{ textAlign: align, cursor: 'pointer' }}>
      <span className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        {label}
        <SortIcon col={col} />
      </span>
    </th>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[420px] text-sm text-gray-400">
      Aucune donnée à afficher
    </div>
  )
}