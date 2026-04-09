import { useState, useEffect, useMemo } from "react"
import { useNavigate } from 'react-router-dom'
import { Building2, TrendingUp, AlertTriangle, CheckCircle, PieChart, BarChart2, Table, GitCompare, FileText, Settings, SlidersHorizontal, Trophy, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import Select from 'react-select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie, Cell as PieCell, Line, Legend, ComposedChart } from 'recharts'
import { API_ROUTES } from '../constants/api'
import { useData } from '../context/DataContext'
import { formatCompact, formatPercent } from '../utils/formatters'
import { ChartSkeleton } from '../components/ui/Skeleton'
import ActiveFiltersBar from '../components/ActiveFiltersBar'
import { useFetch } from '../hooks/useFetch'

interface CedanteProfile {
  cedante: string
  pays_cedante: string
  total_written_premium: number
  total_resultat: number
  avg_ulr: number
  contract_count: number
  avg_share_signed: number
  avg_commission: number
  avg_profit_comm_rate: number
  avg_brokerage_rate: number
  type_cedante?: string  // B1
  branches_actives?: number  // B2
  fac_saturation_alerts?: string[] // B3
  filtered_view?: boolean
}

const LIFE_BRANCH = 'VIE'

function toOptions(arr: string[]) { return arr.map(v => ({ value: v, label: v })) }
function toNumOptions(arr: number[]) { return arr.map(v => ({ value: v, label: String(v) })) }

const selectStyles = {
  menuPortalTarget: typeof document !== 'undefined' ? document.body : undefined,
  menuPosition: 'fixed' as const,
  styles: {
    control: (base: any) => ({
      ...base,
      minHeight: '36px',
      fontSize: '0.78rem',
      borderRadius: '0.5rem',
      borderColor: 'var(--color-gray-200)',
      boxShadow: 'none',
      '&:hover': { borderColor: 'var(--color-navy)' },
    }),
    option: (base: any, state: any) => ({
      ...base,
      fontSize: '0.78rem',
      backgroundColor: state.isSelected ? 'var(--color-navy)' : state.isFocused ? 'var(--color-off-white)' : 'white',
      color: state.isSelected ? 'white' : 'var(--color-navy)',
    }),
    multiValue: (base: any) => ({ ...base, backgroundColor: 'hsla(209,28%,24%,0.10)' }),
    multiValueLabel: (base: any) => ({ ...base, color: 'var(--color-navy)', fontWeight: 700, fontSize: '0.72rem' }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    placeholder: (base: any) => ({ ...base, fontSize: '0.78rem' }),
  },
}

const labelStyle = "block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]"

/* ─── Inline filter panel for /analyse-cedante — LOCAL state, independent of global ─── */
interface CedantePageFiltersProps {
  // Local filter state
  localUwYears: number[]
  localUwYearMin: number | null
  localUwYearMax: number | null
  localBranche: string[]
  localTypeSpc: string[]
  localTypeOfContract: string[]
  brancheScope: { vie: boolean; nonVie: boolean }
  // Setters
  onUwYearsChange: (years: number[]) => void
  onUwYearMinChange: (v: number | null) => void
  onUwYearMaxChange: (v: number | null) => void
  onBrancheChange: (branches: string[]) => void
  onTypeSpcChange: (types: string[]) => void
  onTypeOfContractChange: (types: string[]) => void
  onBrancheScopeChange: (vie: boolean, nonVie: boolean) => void
  onReset: () => void
  brancheOptions: { value: string; label: string }[]
}

function CedantePageFilters({
  localUwYears, localUwYearMin, localUwYearMax,
  localBranche, localTypeSpc, localTypeOfContract,
  brancheScope,
  onUwYearsChange, onUwYearMinChange, onUwYearMaxChange,
  onBrancheChange, onTypeSpcChange, onTypeOfContractChange,
  onBrancheScopeChange, onReset,
  brancheOptions,
}: CedantePageFiltersProps) {
  const { filterOptions } = useData()

  const uwYears = filterOptions?.underwriting_years ?? []
  const typeOfContractOpts = toOptions(filterOptions?.type_of_contract ?? [])
  const typeSpcOpts = toOptions(filterOptions?.type_contrat_spc ?? [])

  const [open, setOpen] = useState(false)

  const activeCount = useMemo(() => {
    let n = 0
    if (localUwYears.length > 0 || localUwYearMin !== null || localUwYearMax !== null) n++
    if (localBranche.length > 0) n++
    if (localTypeSpc.length > 0) n++
    if (localTypeOfContract.length > 0) n++
    return n
  }, [localUwYears, localUwYearMin, localUwYearMax, localBranche, localTypeSpc, localTypeOfContract])

  const hasFilters = activeCount > 0 || !brancheScope.vie || !brancheScope.nonVie

  return (
    <div className="bg-white rounded-xl border border-[var(--color-gray-100)] shadow-sm overflow-hidden">
      {/* Header — click to toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[var(--color-gray-50)] transition-colors"
      >
        <SlidersHorizontal size={13} className="text-[var(--color-navy)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">Filtres de la vue</span>
        {activeCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--color-navy)' }}>
            {activeCount}
          </span>
        )}
        {hasFilters && (
          <span
            className="ml-2 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
            style={{ background: 'hsla(358,66%,54%,0.08)', color: 'hsl(358,66%,54%)', border: '1px solid hsla(358,66%,54%,0.3)' }}
          >
            Filtres actifs
          </span>
        )}
        <span className="ml-auto text-[var(--color-gray-400)]">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="px-4 pb-4 border-t border-[var(--color-gray-100)]">
          <div className="flex items-center justify-end pt-2 pb-2">
            {hasFilters && (
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'hsla(358,66%,54%,0.08)', color: 'hsl(358,66%,54%)', border: '1px solid hsla(358,66%,54%,0.3)' }}
              >
                <RotateCcw size={11} />
                Réinitialiser
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div>
              <label className={labelStyle}>Année de souscription</label>
              <div className="space-y-1.5">
                <Select
                  isMulti
                  options={toNumOptions(uwYears)}
                  {...selectStyles}
                  placeholder="Toutes les années..."
                  value={toNumOptions(localUwYears)}
                  onChange={(v: any) => {
                    onUwYearsChange(v.map((x: any) => x.value))
                    onUwYearMinChange(null)
                    onUwYearMaxChange(null)
                  }}
                />
                {localUwYears.length === 0 && (
                  <div className="flex gap-1.5">
                    <select
                      title="Année min"
                      className="input-dark text-xs py-1 flex-1"
                      value={localUwYearMin ?? ''}
                      onChange={e => onUwYearMinChange(Number(e.target.value) || null)}
                    >
                      <option value="">Min</option>
                      {uwYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                      title="Année max"
                      className="input-dark text-xs py-1 flex-1"
                      value={localUwYearMax ?? ''}
                      onChange={e => onUwYearMaxChange(Number(e.target.value) || null)}
                    >
                      <option value="">Max</option>
                      {uwYears.slice().reverse().map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={labelStyle}>Branche</label>
              <Select
                isMulti
                options={brancheOptions}
                {...selectStyles}
                placeholder="Toutes les branches..."
                value={toOptions(localBranche)}
                onChange={(v: any) => onBrancheChange(v.map((x: any) => x.value))}
              />
              <div className="flex gap-3 mt-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brancheScope.vie}
                    onChange={e => onBrancheScopeChange(e.target.checked, brancheScope.nonVie)}
                  />
                  <span className="text-[0.78rem] font-medium text-gray-600">Vie</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brancheScope.nonVie}
                    onChange={e => onBrancheScopeChange(brancheScope.vie, e.target.checked)}
                  />
                  <span className="text-[0.78rem] font-medium text-gray-600">Non-vie</span>
                </label>
              </div>
            </div>

            <div>
              <label className={labelStyle}>Type SPC</label>
              <Select
                isMulti
                options={typeSpcOpts}
                {...selectStyles}
                placeholder="FAC / TTY / TTE..."
                value={toOptions(localTypeSpc)}
                onChange={(v: any) => onTypeSpcChange(v.map((x: any) => x.value))}
              />
            </div>

            <div>
              <label className={labelStyle}>Type de contrat</label>
              <Select
                isMulti
                options={typeOfContractOpts}
                {...selectStyles}
                placeholder="Tous les types..."
                value={toOptions(localTypeOfContract)}
                onChange={(v: any) => onTypeOfContractChange(v.map((x: any) => x.value))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const COLORS = [
  'hsl(209,28%,24%)', // Navy (dark)
  'hsl(83,52%,36%)', // Green (primary)
  'hsl(12,76%,45%)', // Rust (warm accent)
  'hsl(218,12%,68%)', // Gray-blue (neutral)
  'hsl(358,66%,54%)', // Red (alert)
  'hsl(30,88%,56%)', // Orange (secondary)
  'hsl(180,25%,35%)', // Teal (cool accent)
  'hsl(43,96%,56%)', // Yellow (warning)
  'hsl(280,30%,45%)', // Purple (special)
  'hsl(0,0%,40%)'    // Dark gray (other)
]

export default function CedanteAnalysis() {
  const { filterOptions, setFilters } = useData()
  const navigate = useNavigate()

  const [selectedCedante, setSelectedCedante] = useState<string | null>(null)

  const [profile, setProfile] = useState<CedanteProfile | null>(null)
  const [yearData, setYearData] = useState<any[]>([])
  const [branchData, setBranchData] = useState<any[]>([])
  const [branchDataAll, setBranchDataAll] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // ── Local filters (independent of global dashboard filters) ─────────────
  const [localUwYears, setLocalUwYears] = useState<number[]>([])
  const [localUwYearMin, setLocalUwYearMin] = useState<number | null>(null)
  const [localUwYearMax, setLocalUwYearMax] = useState<number | null>(null)
  const [localBranche, setLocalBranche] = useState<string[]>([])
  const [localTypeSpc, setLocalTypeSpc] = useState<string[]>([])
  const [localTypeOfContract, setLocalTypeOfContract] = useState<string[]>([])

  // Vie/Non-vie checkboxes (local to this page)
  const [brancheScope, setBrancheScope] = useState({ vie: true, nonVie: true })

  const resetLocalFilters = () => {
    setLocalUwYears([])
    setLocalUwYearMin(null)
    setLocalUwYearMax(null)
    setLocalBranche([])
    setLocalTypeSpc([])
    setLocalTypeOfContract([])
    setBrancheScope({ vie: true, nonVie: true })
  }

  // Build API params from local filters only (never touches global filters)
  const buildLocalParams = useMemo(() => {
    const p: Record<string, string> = {}
    if (localUwYears.length > 0) {
      p['uw_years_raw'] = localUwYears.join(',')
    } else {
      if (localUwYearMin !== null) p['uw_year_min'] = String(localUwYearMin)
      if (localUwYearMax !== null) p['uw_year_max'] = String(localUwYearMax)
    }
    if (localBranche.length > 0) p['branche'] = localBranche.join(',')
    if (localTypeSpc.length > 0) p['type_contrat_spc'] = localTypeSpc.join(',')
    if (localTypeOfContract.length > 0) p['type_of_contract'] = localTypeOfContract.join(',')
    if (brancheScope.vie && !brancheScope.nonVie) p['vie_non_vie_view'] = 'VIE'
    if (!brancheScope.vie && brancheScope.nonVie) p['vie_non_vie_view'] = 'NON_VIE'
    return p
  }, [localUwYears, localUwYearMin, localUwYearMax, localBranche, localTypeSpc, localTypeOfContract, brancheScope])

  // B2 — Diversification params (pure local state, never persisted)
  const [totalBranches, setTotalBranches] = useState(12)
  const [seuilVert, setSeuilVert] = useState(40)
  const [showDiversifParams, setShowDiversifParams] = useState(false)

  // Diversification data (immunized: no branche/vie filter)
  const [diversifProfile, setDiversifProfile] = useState<CedanteProfile | null>(null)
  const [diversifBranchData, setDiversifBranchData] = useState<any[]>([])

  // Sort State for Commissions Table
  const [sortCol, setSortCol] = useState<string>('total_written_premium')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const cedanteOptions = useMemo(() => {
    return (filterOptions?.cedantes || []).map(c => ({ value: c, label: c }))
  }, [filterOptions?.cedantes])

  const allBrancheValues = filterOptions?.branc || []

  const applyBrancheScope = (vie: boolean, nonVie: boolean) => {
    setBrancheScope({ vie, nonVie })
    // Clear branch selection — dropdown options update based on scope
    setLocalBranche([])
  }

  const brancheOptions = useMemo(() => {
    if (brancheScope.vie && !brancheScope.nonVie) return toOptions(allBrancheValues.filter((b: string) => b === LIFE_BRANCH))
    if (!brancheScope.vie && brancheScope.nonVie) return toOptions(allBrancheValues.filter((b: string) => b !== LIFE_BRANCH))
    return toOptions(allBrancheValues)
  }, [allBrancheValues, brancheScope])

  const vieNonVieLabel = useMemo(() => {
    if (brancheScope.vie && !brancheScope.nonVie) return 'Vie'
    if (!brancheScope.vie && brancheScope.nonVie) return 'Non-vie'
    return 'Vie, Non-vie'
  }, [brancheScope])
  const headerScopeLabel = useMemo(() => {
    if (localBranche.length === 1) return localBranche[0]
    if (localBranche.length > 1) return `${localBranche.length} branches`
    return vieNonVieLabel
  }, [localBranche, vieNonVieLabel])

  // Always show branch-mix charts (even when a single branch is selected)
  const showBranchCharts = true

  // Flag actif quand au moins une branche est sélectionnée
  const isBranchFilterActive = localBranche.length > 0

  // Params centralisés via useMemo (avec fallback vers undefined si pas de cédante pour bloquer `useFetch`)
  const params = useMemo(() => {
    if (!selectedCedante) return undefined
    return { ...buildLocalParams, cedante: selectedCedante }
  }, [selectedCedante, buildLocalParams])

  // Params immunisés contre le filtre branche (pour Mix Pie figé + Top Branches complément)
  const paramsNoBranch = useMemo(() => {
    if (!selectedCedante) return undefined
    const p = { ...buildLocalParams }
    delete p['branche']
    delete p['vie_non_vie_view']
    return { ...p, cedante: selectedCedante }
  }, [selectedCedante, buildLocalParams])

  // Params for diversification (no branche/vie filter — immunized)
  const diversifParams = useMemo(() => {
    if (!selectedCedante) return undefined
    const p: Record<string, string> = {}
    if (localUwYears.length > 0) {
      p['uw_years_raw'] = localUwYears.join(',')
    } else {
      if (localUwYearMin !== null) p['uw_year_min'] = String(localUwYearMin)
      if (localUwYearMax !== null) p['uw_year_max'] = String(localUwYearMax)
    }
    return { ...p, cedante: selectedCedante }
  }, [selectedCedante, localUwYears, localUwYearMin, localUwYearMax])

  // Décomposition des appels via useFetch
  const { data: profileRes, loading: l1 } = useFetch<any>(selectedCedante ? API_ROUTES.CEDANTE.PROFILE : null, params)
  const { data: yearRes, loading: l2 } = useFetch<any>(selectedCedante ? API_ROUTES.CEDANTE.BY_YEAR : null, params)
  const { data: branchRes, loading: l3 } = useFetch<any>(selectedCedante ? API_ROUTES.CEDANTE.BY_BRANCH : null, params)

  // Fetch toutes branches (immunisé contre filtre branche) — pour Pie figé + Top Branches
  const { data: branchAllRes } = useFetch<any>(selectedCedante ? API_ROUTES.CEDANTE.BY_BRANCH : null, paramsNoBranch)

  // Separate fetches for diversification (immunized)
  const { data: diversifProfileRes } = useFetch<any>(selectedCedante ? API_ROUTES.CEDANTE.PROFILE : null, diversifParams)
  const { data: diversifBranchRes } = useFetch<any>(selectedCedante ? API_ROUTES.CEDANTE.BY_BRANCH : null, diversifParams)

  useEffect(() => {
    if (profileRes) setProfile(profileRes)
    if (yearRes) setYearData(yearRes)
    if (branchRes) setBranchData(branchRes)
  }, [profileRes, yearRes, branchRes])

  useEffect(() => {
    if (branchAllRes) setBranchDataAll(branchAllRes)
  }, [branchAllRes])

  useEffect(() => {
    if (diversifProfileRes) setDiversifProfile(diversifProfileRes)
    if (diversifBranchRes) setDiversifBranchData(diversifBranchRes)
  }, [diversifProfileRes, diversifBranchRes])

  useEffect(() => {
    setLoading(l1 || l2 || l3)
  }, [l1, l2, l3])

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const sortedBranchData = useMemo(() => {
    const source = isBranchFilterActive ? branchDataAll : branchData
    return [...source].sort((a, b) => {
      const valA = a[sortCol] ?? 0
      const valB = b[sortCol] ?? 0
      if (typeof valA === 'string' && typeof valB === 'string') {
         return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      return sortDir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
    })
  }, [branchData, branchDataAll, isBranchFilterActive, sortCol, sortDir])

  // D — Top Branches : N sélectionnées + (8-N) complément depuis branchDataAll
  const topBranchesForBar = useMemo(() => {
    if (!isBranchFilterActive || branchDataAll.length === 0) {
      return branchData.slice(0, 8).map((b: any) => ({ ...b, is_selected: false }))
    }
    const selectedSet = new Set(localBranche)
    const selectedBranches = branchDataAll
      .filter((b: any) => selectedSet.has(b.branche))
      .map((b: any) => ({ ...b, is_selected: true }))
    const complementBranches = branchDataAll
      .filter((b: any) => !selectedSet.has(b.branche))
      .slice(0, Math.max(0, 8 - selectedBranches.length))
      .map((b: any) => ({ ...b, is_selected: false }))
    return [...selectedBranches, ...complementBranches]
      .sort((a: any, b: any) => b.total_written_premium - a.total_written_premium)
  }, [branchData, branchDataAll, localBranche, isBranchFilterActive])

  // ── Top 15 Cédantes globales (pour l'état vide) ────────────────────────────
  const topCedantesParams = useMemo(
    () => buildLocalParams,
    [buildLocalParams]
  )
  const { data: topCedantesGlobalRes } = useFetch<any[]>(
    !selectedCedante ? API_ROUTES.KPIS.BY_CEDANTE : null,
    topCedantesParams
  )
  const topCedantesGlobal = useMemo(() => {
    if (!topCedantesGlobalRes) return []
    return [...topCedantesGlobalRes]
      .filter((c: any) => c.total_written_premium > 0)
      .sort((a: any, b: any) => b.total_written_premium - a.total_written_premium)
      .slice(0, 15)
  }, [topCedantesGlobalRes])

  if (!selectedCedante) {
    return (
      <div className="space-y-6 animate-fade-in p-2">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 p-4 rounded-xl border border-[var(--color-gray-100)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[hsla(209,28%,24%,0.08)]">
              <Building2 size={20} className="text-[var(--color-navy)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-navy)]">Analyse Cédante</h1>
              <p className="text-sm text-[var(--color-gray-500)] mt-0.5">Explorez les performances par cédante</p>
            </div>
          </div>

          <div className="w-full md:w-80 z-50">
            <Select
              options={cedanteOptions}
              onChange={(v) => setSelectedCedante(v?.value || null)}
              placeholder="Rechercher une cédante..."
              isClearable
              menuPortalTarget={document.body}
              styles={{
                menuPortal: base => ({ ...base, zIndex: 9999 }),
                control: base => ({
                  ...base,
                  minHeight: '42px',
                  borderRadius: '0.75rem',
                  borderColor: 'var(--color-gray-100)',
                  boxShadow: 'none',
                  '&:hover': { borderColor: 'var(--color-gray-300)' }
                })
              }}
            />
          </div>
        </div>

        {/* Top 15 Cédantes */}
        {topCedantesGlobal.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={18} className="text-[var(--color-navy)]" />
              <h3 className="text-sm font-bold text-[var(--color-navy)]">Performance Globale — Top 15 Cédantes</h3>
              <span className="ml-auto px-2 py-1 rounded-lg text-[10px] font-bold text-[var(--color-gray-500)] bg-[var(--color-gray-100)]">
                Cliquez sur une barre pour analyser la cédante
              </span>
            </div>

            <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topCedantesGlobal}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-gray-100)" />
                  <XAxis type="number" tickFormatter={(val) => formatCompact(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                  <YAxis type="category" dataKey="cedante" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-gray-500)', width: 160 }} width={160} />
                  <RechartsTooltip
                    cursor={{ fill: 'hsla(209,28%,24%,0.04)' }}
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      const ulr = d.avg_ulr
                      const ulrCol = ulr === null ? 'var(--color-gray-400)' : ulr > 100 ? 'hsl(358,66%,54%)' : ulr > 70 ? 'hsl(30,88%,56%)' : 'hsl(83,52%,36%)'
                      return (
                        <div className="bg-white/95 backdrop-blur-md p-3 rounded-lg shadow-xl border border-[var(--color-gray-100)] text-xs">
                          <p className="font-bold mb-2 text-[var(--color-navy)]">{d.cedante}</p>
                          <div className="flex justify-between gap-4">
                            <span className="opacity-70">Prime Écrite:</span>
                            <span className="font-mono font-bold text-[var(--color-navy)]">{formatCompact(d.total_written_premium)}</span>
                          </div>
                          <div className="flex justify-between gap-4 mt-1">
                            <span className="opacity-70">ULR:</span>
                            <span className="font-mono font-bold" style={{ color: ulrCol }}>{formatPercent(ulr)}</span>
                          </div>
                          <p className="text-[10px] italic text-[var(--color-gray-400)] mt-3">Cliquez pour voir l'analyse complète</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="total_written_premium" radius={[0, 4, 4, 0]}>
                    {topCedantesGlobal.map((_: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill="var(--color-navy)"
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        onClick={() => {
                          setSelectedCedante(topCedantesGlobal[index].cedante)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-[var(--color-gray-500)]">Sélectionnez une cédante en haut pour afficher l'analyse détaillée.</p>
        </div>
      </div>
    )
  }

  // Derived Data for Pie Chart
  // C.2 — Source figée : toutes branches si filtre actif, sinon données filtrées
  // On affiche TOUTES les branches (jamais 'Autres') — top 10 max pour lisibilité
  const pieSourceData = isBranchFilterActive ? branchDataAll : branchData
  const pieData = pieSourceData.slice(0, 10).map(b => ({ name: b.branche, value: b.total_written_premium }))

  // C.1 — Labels noms + % en dehors du Pie Chart
  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
    if (percent < 0.04) return null
    const RADIAN = Math.PI / 180
    const radius = outerRadius + 28
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    const isRight = x > cx
    return (
      <text
        x={x} y={y}
        fill="var(--color-navy)"
        textAnchor={isRight ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={11} fontWeight={600}
        style={{ pointerEvents: 'none' }}
      >
        {`${name} (${(percent * 100).toFixed(1)}%)`}
      </text>
    )
  }

  const ulrColor = (ulr: number | null) => {
    if (ulr === null) return 'var(--color-gray-400)'
    if (ulr > 100) return 'hsl(358,66%,54%)'
    if (ulr > 70) return 'hsl(30,88%,56%)'
    return 'hsl(83,52%,36%)'
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Filtres de cette vue — always visible */}
      <div className="flex-shrink-0 z-40 bg-[var(--color-off-white)] pt-1 pb-2 px-2">
        <CedantePageFilters
          localUwYears={localUwYears}
          localUwYearMin={localUwYearMin}
          localUwYearMax={localUwYearMax}
          localBranche={localBranche}
          localTypeSpc={localTypeSpc}
          localTypeOfContract={localTypeOfContract}
          brancheScope={brancheScope}
          onUwYearsChange={setLocalUwYears}
          onUwYearMinChange={setLocalUwYearMin}
          onUwYearMaxChange={setLocalUwYearMax}
          onBrancheChange={setLocalBranche}
          onTypeSpcChange={setLocalTypeSpc}
          onTypeOfContractChange={setLocalTypeOfContract}
          onBrancheScopeChange={applyBrancheScope}
          onReset={resetLocalFilters}
          brancheOptions={brancheOptions}
        />
      </div>
      <div className="flex-1 overflow-y-auto space-y-6 p-2 pb-12">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 p-4 rounded-xl border border-[var(--color-gray-100)] backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[hsla(209,28%,24%,0.08)]">
            <Building2 size={20} className="text-[var(--color-navy)]" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--color-navy)] line-clamp-1" title={selectedCedante}>{selectedCedante}</h1>
              {/* B1 — Badge type cédante */}
              {profile?.type_cedante && (
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  ...(profile.type_cedante === 'REASSUREUR'
                    ? { background: 'hsla(160,84%,39%,0.15)', border: '1px solid hsla(160,84%,39%,0.4)', color: '#6bffb8' }
                    : { background: 'hsla(213,94%,68%,0.15)', border: '1px solid hsla(213,94%,68%,0.4)', color: '#4F8EF7' }
                  ),
                }}>
                  {profile.type_cedante === 'REASSUREUR' ? 'Réassureur' : 'Assureur direct'}
                </span>
              )}

              {/* A — Badges branches sélectionnées (style encadré, cohérent avec Vie/Non-Vie) */}
              {isBranchFilterActive && (
                <div className="flex flex-wrap gap-1.5">
                  {localBranche.map((b, i) => (
                    <span
                      key={b}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        background: `${COLORS[i % COLORS.length]}22`,
                        border: `1.5px solid ${COLORS[i % COLORS.length]}88`,
                        color: COLORS[i % COLORS.length],
                      }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}

              {/* Vie/Non-vie label */}
              {!isBranchFilterActive && (
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  background: 'hsla(209,28%,24%,0.10)',
                  border: '1.5px solid hsla(209,28%,24%,0.35)',
                  color: 'var(--color-navy)',
                }}>
                  {headerScopeLabel}
                </span>
              )}

              {/* Badges Type SPC sélectionnés */}
              {localTypeSpc.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {localTypeSpc.map((t: string) => (
                    <span
                      key={t}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        background: 'hsla(43,96%,56%,0.15)',
                        border: '1.5px solid hsla(43,96%,56%,0.55)',
                        color: 'hsl(43,80%,32%)',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Badges Type de Contrat sélectionnés */}
              {localTypeOfContract.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {localTypeOfContract.map((t: string) => (
                    <span
                      key={t}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        background: 'hsla(280,30%,45%,0.12)',
                        border: '1.5px solid hsla(280,30%,45%,0.45)',
                        color: 'hsl(280,30%,36%)',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* B3 — Alerte globale de saturation FAC */}
              {profile?.fac_saturation_alerts && profile.fac_saturation_alerts.length > 0 && (
                <div className="flex items-center gap-1.5 bg-[hsl(358,66%,54%,0.1)] border border-[hsl(358,66%,54%,0.3)] text-[hsl(358,66%,54%)] px-3 py-1 rounded-full text-[11px] font-bold animate-pulse">
                  <AlertTriangle size={12} />
                  <span>Saturation FAC ({profile.fac_saturation_alerts.length} Branche{profile.fac_saturation_alerts.length > 1 ? 's' : ''})</span>
                </div>
              )}
            </div>
            <p className="text-sm text-[var(--color-gray-500)] mt-0.5">{profile?.pays_cedante || 'Pays non spécifié'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-full md:w-64">
            <Select 
              options={cedanteOptions}
              value={cedanteOptions.find(o => o.value === selectedCedante) || null}
              onChange={(v) => setSelectedCedante(v?.value || null)}
              placeholder="Changer de cédante..."
              isClearable
              menuPortalTarget={document.body}
              styles={{
                menuPortal: base => ({ ...base, zIndex: 9999 }),
                control: base => ({
                  ...base,
                  minHeight: '40px',
                  borderRadius: '0.75rem',
                  borderColor: 'var(--color-gray-100)'
                })
              }}
            />
          </div>
          <button
            onClick={() => {
              setFilters((f: any) => ({ ...f, cedante: [selectedCedante] }))
              navigate('/', { state: { tab: 'contrats' } })
            }}
            className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap"
            style={{ background: 'var(--color-navy-muted, hsla(209,28%,24%,0.08))', color: 'var(--color-navy)', border: '1px solid var(--color-gray-200)' }}
          >
            <FileText size={14} />
            Voir les contrats
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem('compare_cedante_a', JSON.stringify({ cedante: selectedCedante }))
              navigate('/comparaison')
            }}
            className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all whitespace-nowrap shadow-sm"
            style={{ background: 'linear-gradient(135deg, hsl(209,32%,17%), hsl(209,28%,24%))', border: 'none' }}
          >
            <GitCompare size={14} />
            Comparer
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-6">
           <ChartSkeleton height={120} />
           <ChartSkeleton height={300} />
        </div>
      ) : profile && (
        <>
          {/* B — Indicateur vue filtrée */}
          {profile?.filtered_view && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-bold py-1">
              <span>🔍</span>
              <span>Vue filtrée — KPIs calculés sur la sélection actuelle</span>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-100)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2">Prime Écrite</span>
                <span className="text-2xl font-mono font-bold text-[var(--color-navy)]">{formatCompact(profile.total_written_premium)}</span>
             </div>
             <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-100)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2">Résultat Net</span>
                <span className="text-2xl font-mono font-bold" style={{ color: profile.total_resultat >= 0 ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)' }}>
                  {formatCompact(profile.total_resultat)}
                </span>
             </div>
             <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-100)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  Loss Ratio <span className="opacity-50">(Moyen)</span>
                </span>
                <div className="flex items-center gap-2">
                  {profile.avg_ulr > 100 ? <AlertTriangle size={18} color="hsl(358,66%,54%)" /> : <CheckCircle size={18} color="hsl(83,52%,36%)" />}
                  <span className="text-2xl font-mono font-bold" style={{ color: ulrColor(profile.avg_ulr) }}>
                    {formatPercent(profile.avg_ulr)}
                  </span>
                </div>
             </div>
             <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-100)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2">Nb Contrats</span>
                <span className="text-2xl font-mono font-bold text-[var(--color-navy)]">{profile.contract_count}</span>
             </div>
             <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-100)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2">Part Souscrite</span>
                <span className="text-2xl font-mono font-bold text-[var(--color-navy)]">{(profile.avg_share_signed || 0).toFixed(1)}%</span>
             </div>
             <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-100)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2">Commission (Moy.)</span>
                <span className="text-2xl font-mono font-bold text-[var(--color-navy)]">{(profile.avg_commission || 0).toFixed(1)}%</span>
             </div>
             {/* B2 — Carte Indicateur de diversification */}
             {(() => {
               const activeBranchesCount = profile?.branches_actives || 0;
               const rawPct = Math.round((activeBranchesCount / totalBranches) * 100);
               const pct = Math.min(rawPct, 100); // Plafonnier à 100%
               const good = pct >= seuilVert;
               const colorCode = good ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)';
               
               return (
                 <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-100)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-visible">
                   <div className="flex justify-between items-start mb-2">
                     <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider leading-tight">Diversification<br/>(Branches)</span>
                     <button onClick={() => setShowDiversifParams(!showDiversifParams)} className="p-1 text-gray-400 hover:text-[var(--color-navy)] transition-colors rounded hover:bg-gray-50">
                       <Settings size={14} />
                     </button>
                   </div>
                   
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                       <span className="text-2xl font-mono font-bold" style={{ color: colorCode }}>{rawPct}%</span>
                     </div>
                     <div className="h-1.5 w-full bg-[var(--color-gray-100)] rounded-full overflow-hidden mb-1">
                       <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: colorCode }} />
                     </div>
                     <div className="text-[10px] font-bold" style={{ color: colorCode }}>
                       {activeBranchesCount} / {totalBranches} actives
                     </div>
                   </div>

                   {/* UI Locale pour ajuster N et Seuil */}
                   {showDiversifParams && (
                     <div className="absolute top-10 right-0 z-50 bg-white border border-gray-100 shadow-xl rounded-lg w-48 p-3 text-xs">
                       <div className="mb-3">
                         <label className="flex justify-between text-gray-500 mb-1 font-bold">
                           <span>Réf. Branches (N)</span>
                           <span>{totalBranches}</span>
                         </label>
                         <input type="range" min="1" max="20" value={totalBranches} onChange={e => setTotalBranches(Number(e.target.value))} className="w-full accent-[var(--color-navy)]" />
                       </div>
                       <div>
                         <label className="flex justify-between text-gray-500 mb-1 font-bold">
                           <span>Seuil Vert (%)</span>
                           <span>{seuilVert}%</span>
                         </label>
                         <input type="range" min="10" max="100" step="5" value={seuilVert} onChange={e => setSeuilVert(Number(e.target.value))} className="w-full accent-[var(--color-navy)]" />
                       </div>
                     </div>
                   )}
                 </div>
               );
             })()}
          </div>

          {/* Evolution historique */}
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-[var(--color-navy)]" />
                <h3 className="text-sm font-bold text-[var(--color-navy)]">Évolution Historique (Année de Souscription)</h3>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={yearData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-100)" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                  <YAxis yAxisId="left" tickFormatter={(val) => formatCompact(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `${val}%`} domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                  
                  <RechartsTooltip 
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-md text-[var(--color-navy)] p-3 rounded-lg shadow-xl border border-[var(--color-gray-100)] text-xs">
                            <p className="font-bold mb-2">Année {label}</p>
                            {payload.map((entry: any, i: number) => (
                              <div key={i} className="flex justify-between gap-4 mt-1 font-mono">
                                <span className="opacity-70 font-sans">{entry.name}</span>
                                <span style={{ color: entry.dataKey === 'avg_ulr' ? 'hsl(30,88%,56%)' : entry.color }} className="font-bold">
                                  {entry.dataKey === 'avg_ulr' ? formatPercent(entry.value) : formatCompact(entry.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                  
                  <Bar yAxisId="left" dataKey="total_written_premium" name="Prime Écrite" fill="hsl(209,28%,24%)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="total_resultat" name="Résultat Net" radius={[4, 4, 0, 0]}>
                    {yearData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.total_resultat >= 0 ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)'} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="avg_ulr" name="Loss Ratio" stroke="hsl(30,88%,56%)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mix Portefeuille — masqué si une seule branche sélectionnée */}
          {showBranchCharts && <div className="flex flex-col gap-6">
             <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
               <div className="flex items-center gap-2 mb-4 flex-wrap">
                 <PieChart size={18} className="text-[var(--color-navy)]" />
                 <h3 className="text-sm font-bold text-[var(--color-navy)]">Répartition par Branche (Primes)</h3>
                 {isBranchFilterActive && (
                   <span style={{
                     fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
                     background: 'hsla(43,96%,56%,0.15)', color: 'hsl(43,96%,40%)',
                     border: '1px solid hsla(43,96%,56%,0.3)', borderRadius: 99,
                   }}>
                     🔒 Vue 100% · {localBranche.length} sélectionnée(s)
                   </span>
                 )}
               </div>
               <div className="h-[420px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <RechartsPieChart margin={{ top: 20, right: 120, bottom: 20, left: 120 }}>
                     <Pie
                       data={pieData}
                       cx="50%"
                       cy="50%"
                       innerRadius={80}
                       outerRadius={130}
                       paddingAngle={2}
                       dataKey="value"
                       labelLine={true}
                       label={renderCustomLabel}
                       stroke="none"
                     >
                       {pieData.map((entry, index) => {
                         const baseColor = COLORS[index % COLORS.length]
                         const isSelected = isBranchFilterActive && localBranche.includes(entry.name)
                         const fill = isBranchFilterActive
                           ? (isSelected ? baseColor : `${baseColor}33`)
                           : baseColor
                         return <PieCell key={`cell-${index}`} fill={fill} stroke={isSelected ? 'white' : 'none'} strokeWidth={isSelected ? 2 : 0} />
                       })}
                     </Pie>
                     <RechartsTooltip formatter={(val: number) => formatCompact(val)} />
                   </RechartsPieChart>
                 </ResponsiveContainer>
               </div>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
               <div className="flex items-center gap-2 mb-4 flex-wrap">
                 <BarChart2 size={18} className="text-[var(--color-navy)]" />
                 <h3 className="text-sm font-bold text-[var(--color-navy)]">Top Branches (Loss Ratio)</h3>
                 {isBranchFilterActive && (
                   <span style={{
                     fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
                     background: 'hsla(83,50%,45%,0.15)', color: 'hsl(83,50%,35%)',
                     border: '1px solid hsla(83,50%,45%,0.3)', borderRadius: 99,
                   }}>
                     {localBranche.length} mise(s) en avant
                   </span>
                 )}
               </div>
               <div className="h-80">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={topBranchesForBar} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-gray-100)" />
                     <XAxis type="number" tickFormatter={(val) => formatCompact(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                     <YAxis type="category" dataKey="branche" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)', width: 80 }} width={80} />
                     <RechartsTooltip
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                             const data = payload[0].payload
                             return (
                               <div className="bg-white/95 p-3 rounded-lg shadow-xl border border-[var(--color-gray-100)] text-xs">
                                 <p className="font-bold mb-2 text-[var(--color-navy)]">{data.branche}</p>
                                 <div className="flex justify-between gap-4">
                                   <span className="opacity-70">Prime:</span>
                                   <span className="font-mono font-bold">{formatCompact(data.total_written_premium)}</span>
                                 </div>
                                 <div className="flex justify-between gap-4 mt-1">
                                   <span className="opacity-70">ULR:</span>
                                   <span className="font-mono font-bold" style={{ color: ulrColor(data.avg_ulr) }}>{formatPercent(data.avg_ulr)}</span>
                                 </div>
                               </div>
                             )
                          }
                          return null
                        }}
                     />
                     <Bar dataKey="total_written_premium" radius={[0, 4, 4, 0]}>
                       {topBranchesForBar.map((entry, index) => (
                         <Cell
                           key={`cell-${index}`}
                           fill={ulrColor(entry.avg_ulr)}
                           stroke={entry.is_selected ? 'hsl(209,28%,24%)' : 'none'}
                           strokeWidth={entry.is_selected ? 2.5 : 0}
                         />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
             </div>
          </div>}

          {/* Rapport de Diversification — immunisé (données non filtrées par branche/vie) */}
          {(() => {
            const activeBranchesCount = diversifProfile?.branches_actives || 0;
              
            return (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-6 mb-6 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1.5 h-full" style={{ background: ((activeBranchesCount / totalBranches) * 100) >= seuilVert ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)' }} />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-navy)] flex items-center gap-2">
                    <PieChart size={20} />
                    Rapport de Diversification par Branche
                  </h3>
                  <p className="text-sm text-[var(--color-gray-500)] mt-1">
                    Analyse de la répartition de l'activité sur l'ensemble des branches du marché.
                  </p>
                </div>
                
                {/* Paramètres accessibles directement */}
                <div className="flex items-center gap-4 bg-[var(--color-off-white)] p-3 rounded-lg border border-[var(--color-gray-200)]">
                  <label className="flex items-center gap-2 text-xs font-bold text-[var(--color-gray-500)] uppercase">
                    Total branches (N):
                    <input type="number" min={1} max={30} value={totalBranches} onChange={e => setTotalBranches(Number(e.target.value))}
                      className="w-16 rounded border border-[var(--color-gray-200)] p-1.5 text-center text-[var(--color-navy)] font-mono" />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-[var(--color-gray-500)] uppercase">
                    Seuil Minimum:
                    <div className="relative">
                      <input type="number" min={1} max={100} value={seuilVert} onChange={e => setSeuilVert(Number(e.target.value))}
                        className="w-16 rounded border border-[var(--color-gray-200)] p-1.5 pr-4 text-center text-[var(--color-navy)] font-mono" />
                      <span className="absolute right-1.5 top-[7px] text-xs font-bold text-[var(--color-gray-400)]">%</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Score & Gauge */}
                <div className="flex flex-col justify-center">
                  {(() => {
                    const pct = Math.round((activeBranchesCount / totalBranches) * 100)
                    const good = pct >= seuilVert
                    const colorCode = good ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)'
                    
                    return (
                      <div className="bg-[var(--color-off-white)] rounded-xl p-6 border border-[var(--color-gray-100)] text-center">
                        <div className="mb-2 uppercase text-xs font-bold tracking-wider" style={{ color: colorCode }}>
                          {good ? '✓ Portefeuille Diversifié' : '⚠ Concentration de risque élevée'}
                        </div>
                        <div className="text-5xl font-mono font-bold mb-2" style={{ color: colorCode }}>
                          {pct}%
                        </div>
                        <div className="text-sm font-medium text-[var(--color-gray-500)] mb-4">
                          <span className="font-bold text-[var(--color-navy)]">{activeBranchesCount}</span> branches actives sur <span className="font-bold text-[var(--color-navy)]">{totalBranches}</span> existantes
                        </div>
                        
                        <div className="w-full bg-[var(--color-gray-200)] h-3 rounded-full overflow-hidden relative border border-[var(--color-gray-300)]">
                          {/* Jauge */}
                          <div className="h-full rounded-full transition-all duration-1000 ease-out" 
                               style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: colorCode }} />
                          {/* Indicateur de seuil visuel */}
                          <div className="absolute top-0 bottom-0 w-[2px] bg-[var(--color-navy)] opacity-50 z-10"
                               style={{ left: `${seuilVert}%` }} title={`Seuil: ${seuilVert}%`} />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-[var(--color-gray-400)] mt-1.5 px-1">
                          <span>0%</span>
                          <span className="relative" style={{ left: `calc(${seuilVert}% - 50%)`, color: 'var(--color-navy)' }}>{seuilVert}% (Seuil)</span>
                          <span>100%</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Détail (Liste des branches) */}
                <div>
                  <h4 className="text-sm font-bold text-[var(--color-navy)] mb-3">Détail des branches explorées</h4>
                  <div className="max-h-[220px] overflow-y-auto pr-2 custom-scroll">
                    <ul className="space-y-2">
                       {diversifBranchData.map((b, i) => (
                         <li key={i} className="flex justify-between items-center p-2 rounded bg-[hsla(83,52%,36%,0.05)] border border-[hsla(83,52%,36%,0.1)]">
                           <div className="flex items-center gap-2">
                             <CheckCircle size={14} color="hsl(83,52%,36%)" />
                             <span className="text-xs font-bold text-[var(--color-navy)]">{b.branche}</span>
                             {profile?.fac_saturation_alerts?.includes(b.branche) && (
                               <span title="Saturation FAC"><AlertTriangle size={12} color="hsl(358,66%,54%)" className="animate-pulse" /></span>
                             )}
                           </div>
                           <span className="text-[10px] font-mono font-bold text-[var(--color-gray-500)]">{formatCompact(b.total_written_premium)} prime</span>
                         </li>
                       ))}
                       
                       {/* Simulate inactive branches if N > active branches */}
                       {totalBranches > activeBranchesCount && [...Array(totalBranches - activeBranchesCount)].map((_, i) => (
                         <li key={`inactive-${i}`} className="flex justify-between items-center p-2 rounded bg-white border border-[var(--color-gray-200)] opacity-60">
                           <div className="flex items-center gap-2">
                             <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--color-gray-300)]" />
                             <span className="text-xs font-semibold text-[var(--color-gray-500)] italic">Branche non explorée</span>
                           </div>
                           <span className="text-[10px] font-mono text-[var(--color-gray-400)]">0 prime</span>
                         </li>
                       ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            )
          })()}

          {/* Commissions & Rates Table */}
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] overflow-hidden">
             <div className="p-4 border-b border-[var(--color-gray-100)] flex items-center gap-2 bg-[var(--color-off-white)]">
                <Table size={18} className="text-[var(--color-navy)]" />
                <h3 className="text-sm font-bold text-[var(--color-navy)]">Commissions et Taux par Branche</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-[var(--color-off-white)]">
                         <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase cursor-pointer" onClick={() => handleSort('branche')}>
                            Branche
                         </th>
                         <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase cursor-pointer text-right" onClick={() => handleSort('total_written_premium')}>
                            Prime Écrite
                         </th>
                         <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase cursor-pointer text-right" onClick={() => handleSort('avg_ulr')}>
                            ULR
                         </th>
                         <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase cursor-pointer text-right">
                            Commission
                         </th>
                         <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase cursor-pointer text-right">
                            Courtage
                         </th>
                         <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase cursor-pointer text-right">
                            Comm. Bénéfices
                         </th>
                      </tr>
                   </thead>
                   <tbody>
                      {sortedBranchData.map((b, i) => {
                         // Fallbacks if backend doesn't provide these averages at branch level in default summary
                         const comm = b.avg_commission ?? 0
                         const broka = b.avg_brokerage_rate ?? 0
                         const profita = b.avg_profit_comm_rate ?? 0
                         const isRowSelected = isBranchFilterActive && localBranche.includes(b.branche)

                         return (
                           <tr
                             key={i}
                             className="border-b border-[var(--color-gray-100)] last:border-0 hover:bg-[hsla(0,0%,0%,0.02)] transition-colors"
                             style={{ background: isRowSelected ? 'hsla(83,52%,36%,0.06)' : undefined }}
                           >
                              <td className="py-3 px-4 text-xs font-bold text-[var(--color-navy)]">
                                <div className="flex items-center gap-2">
                                  {isRowSelected && (
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'hsl(83,52%,36%)' }} />
                                  )}
                                  {b.branche}
                                  {profile?.fac_saturation_alerts?.includes(b.branche) && (
                                    <span title="Saturation FAC"><AlertTriangle size={14} color="hsl(358,66%,54%)" /></span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-xs font-mono text-right">{formatCompact(b.total_written_premium)}</td>
                              <td className="py-3 px-4 text-xs font-mono font-bold text-right">
                                 {b.avg_ulr !== null && (
                                   <span className="px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: ulrColor(b.avg_ulr) }}>
                                     {formatPercent(b.avg_ulr)}
                                   </span>
                                 )}
                              </td>
                              <td className="py-3 px-4 text-xs font-mono text-right text-[var(--color-gray-500)]">{comm.toFixed(1)}%</td>
                              <td className="py-3 px-4 text-xs font-mono text-right text-[var(--color-gray-500)]">{broka.toFixed(1)}%</td>
                              <td className="py-3 px-4 text-xs font-mono text-right text-[var(--color-gray-500)]">{profita.toFixed(1)}%</td>
                           </tr>
                         )
                      })}
                   </tbody>
                </table>
             </div>
          </div>
        </>
      )}
      </div>
    </div>
  )
}
