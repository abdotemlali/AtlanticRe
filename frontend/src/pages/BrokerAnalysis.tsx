import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts'
import {
  Briefcase, TrendingUp, DollarSign, Shield,
  ArrowRight, Users, Activity, ChevronUp, ChevronDown, SlidersHorizontal, RotateCcw, ChevronLeft,
} from 'lucide-react'
import Select from 'react-select'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { useData } from '../context/DataContext'
import { formatCompact, formatPercent } from '../utils/formatters'
import ActiveFiltersBar from '../components/ActiveFiltersBar'

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  navy: 'hsl(209,35%,16%)', olive: 'hsl(83,52%,36%)', oliveLight: 'hsl(83,50%,55%)',
  orange: 'hsl(28,88%,55%)', red: 'hsl(358,66%,54%)', blue: 'hsl(209,60%,55%)',
  green: 'hsl(145,55%,42%)', gray: 'hsl(218,14%,65%)', grayLight: 'hsl(218,22%,92%)',
  bg: '#f8fafc',
}
const CHART_PAL = ['#1E3A5F', '#4E6820', '#E67E22', '#3498DB', '#9B59B6', '#1ABC9C', '#E74C3C', '#2C3E50']

const ulrColor = (ulr: number | null) => {
  if (!ulr) return C.gray
  if (ulr <= 0.5) return C.green
  if (ulr <= 0.7) return C.olive
  if (ulr <= 0.9) return C.orange
  return C.red
}
const fmtMAD = (v: number) => {
  if (Math.abs(v) >= 1e9) return `${(v/1e9).toFixed(1)} Md`
  if (Math.abs(v) >= 1e6) return `${(v/1e6).toFixed(1)} M`
  if (Math.abs(v) >= 1e3) return `${(v/1e3).toFixed(0)} K`
  return v.toLocaleString('fr-FR')
}

type SortKey = 'total_written_premium' | 'total_resultat' | 'avg_ulr' | 'contract_count'

const LIFE_BRANCH = 'VIE'
function toOptions(arr: string[]) { return arr.map(v => ({ value: v, label: v })) }
function toNumOptions(arr: number[]) { return arr.map(v => ({ value: v, label: String(v) })) }

// ── Select styles ─────────────────────────────────────────────────────────────
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
      '&:hover': { borderColor: C.navy },
    }),
    option: (base: any, state: any) => ({
      ...base,
      fontSize: '0.78rem',
      backgroundColor: state.isSelected ? C.navy : state.isFocused ? '#f8fafc' : 'white',
      color: state.isSelected ? 'white' : C.navy,
    }),
    multiValue: (base: any) => ({ ...base, backgroundColor: 'hsla(209,28%,24%,0.10)' }),
    multiValueLabel: (base: any) => ({ ...base, color: C.navy, fontWeight: 700, fontSize: '0.72rem' }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    placeholder: (base: any) => ({ ...base, fontSize: '0.78rem' }),
  },
}

const labelStyle = 'block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]'

// ── Local filter builder ───────────────────────────────────────────────────────
function buildLocalParams(
  localUwYear: number[],
  localUwYearMin: number | null,
  localUwYearMax: number | null,
  localBranche: string[],
  localTypeSpc: string[],
  localTypeOfContract: string[],
  brancheScope: { vie: boolean; nonVie: boolean },
): Record<string, string> {
  const p: Record<string, string> = {}
  if (localUwYear.length > 0) {
    p['uw_years_raw'] = localUwYear.join(',')
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
}

export default function BrokerAnalysis() {
  const navigate = useNavigate()
  const { filterOptions } = useData()

  // ── Local filters (independent of global) ─────────────────────────────────
  const [localUwYear, setLocalUwYear] = useState<number[]>([])
  const [localUwYearMin, setLocalUwYearMin] = useState<number | null>(null)
  const [localUwYearMax, setLocalUwYearMax] = useState<number | null>(null)
  const [localBranche, setLocalBranche] = useState<string[]>([])
  const [localTypeSpc, setLocalTypeSpc] = useState<string[]>([])
  const [localTypeOfContract, setLocalTypeOfContract] = useState<string[]>([])
  const [brancheScope, setBrancheScope] = useState({ vie: true, nonVie: true })

  const hasLocalFilters = localUwYear.length > 0 || localUwYearMin !== null || localUwYearMax !== null
    || localBranche.length > 0 || localTypeSpc.length > 0 || localTypeOfContract.length > 0
    || !brancheScope.vie || !brancheScope.nonVie

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (localUwYear.length > 0 || localUwYearMin !== null || localUwYearMax !== null) n++
    if (localBranche.length > 0) n++
    if (localTypeSpc.length > 0) n++
    if (localTypeOfContract.length > 0) n++
    return n
  }, [localUwYear, localUwYearMin, localUwYearMax, localBranche, localTypeSpc, localTypeOfContract])

  const resetLocalFilters = () => {
    setLocalUwYear([])
    setLocalUwYearMin(null)
    setLocalUwYearMax(null)
    setLocalBranche([])
    setLocalTypeSpc([])
    setLocalTypeOfContract([])
    setBrancheScope({ vie: true, nonVie: true })
  }

  const allBrancheValues = filterOptions?.branc ?? []

  const applyBrancheScope = (vie: boolean, nonVie: boolean) => {
    setBrancheScope({ vie, nonVie })
    // Clear branch selection when scope changes — the dropdown options will update automatically
    setLocalBranche([])
  }

  // Branch options filtered dynamically based on Vie/Non-Vie scope
  const brancheOptions = useMemo(() => {
    if (brancheScope.vie && !brancheScope.nonVie) return toOptions(allBrancheValues.filter((b: string) => b === LIFE_BRANCH))
    if (!brancheScope.vie && brancheScope.nonVie) return toOptions(allBrancheValues.filter((b: string) => b !== LIFE_BRANCH))
    return toOptions(allBrancheValues)
  }, [allBrancheValues, brancheScope])

  // ── Sort & search ──────────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState<SortKey>('total_written_premium')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // ── Data ───────────────────────────────────────────────────────────────────
  const [brokers, setBrokers] = useState<any[]>([])
  const [retroCourtiers, setRetroCourtiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Build params from LOCAL filters only (not global)
  const localParams = useMemo(
    () => buildLocalParams(localUwYear, localUwYearMin, localUwYearMax, localBranche, localTypeSpc, localTypeOfContract, brancheScope),
    [localUwYear, localUwYearMin, localUwYearMax, localBranche, localTypeSpc, localTypeOfContract, brancheScope]
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const p = localParams
      const [brkRes, retRes] = await Promise.all([
        api.get(API_ROUTES.KPIS.TOP_BROKERS, { params: { ...p, limit: 500, sort_by: 'total_written_premium' } }),
        api.get(API_ROUTES.RETRO.BY_COURTIER, { params: { uw: p.uw_years_raw } }).catch(() => ({ data: [] })),
      ])
      setBrokers((brkRes.data || []).filter((d: any) => d.broker && d.broker !== 'nan'))
      setRetroCourtiers(retRes.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [localParams])

  useEffect(() => { loadData() }, [loadData])

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocus(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Merge retro data into broker rows ─────────────────────────────────────
  const merged = useMemo(() => {
    const retMap = new Map<string, any>()
    retroCourtiers.forEach((r: any) => retMap.set(r.courtier, r))

    return brokers.map(b => {
      const retro = retMap.get(b.broker)
      const pmd_placee = retro?.pmd_placee || 0
      const courtage_retro = retro?.courtage_percu || 0
      const retro_role = retro ? (b.contract_count > 0 ? 'double' : 'placeur') : 'apporteur'
      const solde_net = (b.total_written_premium || 0) - pmd_placee
      return { ...b, pmd_placee, courtage_retro, retro_role, solde_net }
    })
  }, [brokers, retroCourtiers])

  // ── Autocomplete suggestions ───────────────────────────────────────────────
  // Show full list on focus (even without input), filtered by search when typed
  const searchSuggestions = useMemo(() => {
    const sorted = [...merged].sort((a, b) => b.total_written_premium - a.total_written_premium)
    if (!search || search.length < 1) {
      // Show top 12 brokers when focused with no search
      return sorted.slice(0, 12)
    }
    const s = search.toLowerCase()
    return sorted
      .filter(b => b.broker.toLowerCase().includes(s))
      .slice(0, 12)
  }, [merged, search])

  // ── Filter + sort table ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = merged
    if (search) {
      const s = search.toLowerCase()
      data = data.filter(d => d.broker.toLowerCase().includes(s))
    }
    data = [...data].sort((a, b) => {
      const va = a[sortBy] ?? 0
      const vb = b[sortBy] ?? 0
      return sortDir === 'desc' ? vb - va : va - vb
    })
    return data
  }, [merged, search, sortBy, sortDir])

  // ── KPI aggregations ──────────────────────────────────────────────────────
  const agg = useMemo(() => {
    const total_wp = merged.reduce((s, b) => s + (b.total_written_premium || 0), 0)
    const total_res = merged.reduce((s, b) => s + (b.total_resultat || 0), 0)
    const total_pmd = merged.reduce((s, b) => s + (b.pmd_placee || 0), 0)
    const avgUlr = merged.length > 0
      ? merged.reduce((s, b) => s + (b.avg_ulr || 0), 0) / merged.filter(b => b.avg_ulr !== null).length
      : 0
    return { total_wp, total_res, total_pmd, avgUlr, count: merged.length }
  }, [merged])

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortBy !== col) return null
    return sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
  }

  const roleStyle = (role: string) => {
    if (role === 'double') return { bg: '#EEF3E6', color: C.olive, label: 'Double Rôle' }
    if (role === 'placeur') return { bg: '#FEF5EC', color: C.orange, label: 'Placeur' }
    return { bg: '#E8EDF1', color: C.navy, label: 'Apporteur' }
  }

  // Top 10 chart data
  const chartData = useMemo(() => filtered.slice(0, 10), [filtered])

  // Role distribution for pie
  const rolePie = useMemo(() => {
    const dbl = merged.filter(b => b.retro_role === 'double').length
    const plc = merged.filter(b => b.retro_role === 'placeur').length
    const app = merged.filter(b => b.retro_role === 'apporteur').length
    return [
      { name: 'Double Rôle', value: dbl, color: C.olive },
      { name: 'Placeur seul', value: plc, color: C.orange },
      { name: 'Apporteur seul', value: app, color: C.navy },
    ].filter(d => d.value > 0)
  }, [merged])

  const uwYears = filterOptions?.underwriting_years ?? []
  const typeOfContractOpts = toOptions(filterOptions?.type_of_contract ?? [])
  const typeSpcOpts = toOptions(filterOptions?.type_contrat_spc ?? [])

  const [filterPanelOpen, setFilterPanelOpen] = useState(false)

  return (
    <div className="flex flex-col h-full animate-fade-in">

      {/* ── Panneau de filtres local — collapsible ───────────────────── */}
      <div className="flex-shrink-0 z-40 bg-[var(--color-off-white)] pt-1 pb-2 px-2">
        <div className="bg-white rounded-xl border border-[var(--color-gray-100)] shadow-sm overflow-hidden">
          {/* Header — always visible, click to toggle */}
          <button
            onClick={() => setFilterPanelOpen(o => !o)}
            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[var(--color-gray-50)] transition-colors"
          >
            <SlidersHorizontal size={13} className="text-[var(--color-navy)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
              Filtres de la vue
            </span>
            {activeFilterCount > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                style={{ background: C.navy }}
              >
                {activeFilterCount}
              </span>
            )}
            {hasLocalFilters && (
              <span
                className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                style={{ background: 'hsla(358,66%,54%,0.08)', color: 'hsl(358,66%,54%)', border: '1px solid hsla(358,66%,54%,0.3)' }}
              >
                Filtres actifs
              </span>
            )}
            <span className="ml-auto text-[var(--color-gray-400)]">
              {filterPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>

          {/* Collapsible content */}
          {filterPanelOpen && (
          <div className="px-4 pb-4 border-t border-[var(--color-gray-100)]">
            <div className="flex items-center justify-end pt-2 pb-2">
              {hasLocalFilters && (
                <button
                  onClick={resetLocalFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'hsla(358,66%,54%,0.08)', color: 'hsl(358,66%,54%)', border: '1px solid hsla(358,66%,54%,0.3)' }}
                >
                  <RotateCcw size={11} />
                  Réinitialiser
                </button>
              )}
            </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Année de souscription */}
            <div>
              <label className={labelStyle}>Année de souscription</label>
              <div className="space-y-1.5">
                <Select
                  isMulti
                  options={toNumOptions(uwYears)}
                  value={toNumOptions(localUwYear)}
                  onChange={(v: any) => {
                    setLocalUwYear(v.map((x: any) => x.value))
                    setLocalUwYearMin(null)
                    setLocalUwYearMax(null)
                  }}
                  placeholder="Toutes les années..."
                  {...selectStyles}
                />
                {localUwYear.length === 0 && (
                  <div className="flex gap-1.5">
                    <select
                      title="Année min"
                      className="input-dark text-xs py-1 flex-1"
                      value={localUwYearMin ?? ''}
                      onChange={e => setLocalUwYearMin(Number(e.target.value) || null)}
                      style={{
                        border: '1px solid var(--color-gray-200)', borderRadius: '0.5rem',
                        background: 'white', color: C.navy, padding: '0.3rem',
                      }}
                    >
                      <option value="">Min</option>
                      {uwYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                      title="Année max"
                      className="input-dark text-xs py-1 flex-1"
                      value={localUwYearMax ?? ''}
                      onChange={e => setLocalUwYearMax(Number(e.target.value) || null)}
                      style={{
                        border: '1px solid var(--color-gray-200)', borderRadius: '0.5rem',
                        background: 'white', color: C.navy, padding: '0.3rem',
                      }}
                    >
                      <option value="">Max</option>
                      {[...uwYears].reverse().map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Branche */}
            <div>
              <label className={labelStyle}>Branche</label>
              <Select
                isMulti
                options={brancheOptions}
                {...selectStyles}
                placeholder="Toutes les branches..."
                value={toOptions(localBranche)}
                onChange={(v: any) => {
                  applyBrancheScope(false, false)
                  setLocalBranche(v.map((x: any) => x.value))
                }}
              />
              <div className="flex gap-3 mt-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brancheScope.vie}
                    onChange={e => applyBrancheScope(e.target.checked, brancheScope.nonVie)}
                  />
                  <span className="text-[0.78rem] font-medium text-gray-600">Vie</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brancheScope.nonVie}
                    onChange={e => applyBrancheScope(brancheScope.vie, e.target.checked)}
                  />
                  <span className="text-[0.78rem] font-medium text-gray-600">Non-vie</span>
                </label>
              </div>
            </div>

            {/* Type SPC */}
            <div>
              <label className={labelStyle}>Type SPC</label>
              <Select
                isMulti
                options={typeSpcOpts}
                {...selectStyles}
                placeholder="FAC / TTY / TTE..."
                value={toOptions(localTypeSpc)}
                onChange={(v: any) => setLocalTypeSpc(v.map((x: any) => x.value))}
              />
            </div>

            {/* Type de contrat */}
            <div>
              <label className={labelStyle}>Type de contrat</label>
              <Select
                isMulti
                options={typeOfContractOpts}
                {...selectStyles}
                placeholder="Tous les types..."
                value={toOptions(localTypeOfContract)}
                onChange={(v: any) => setLocalTypeOfContract(v.map((x: any) => x.value))}
              />
            </div>
          </div>
          </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 p-2 pb-12">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'white', padding: '16px 24px', borderRadius: 14,
        border: `1px solid ${C.grayLight}`, boxShadow: '0 2px 12px hsla(209,28%,14%,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.olive}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={22} color={C.olive} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: C.navy, margin: 0 }}>Analyse Courtiers</h1>
            <p style={{ fontSize: '0.78rem', color: C.gray, margin: 0 }}>Vue consolidée — Contrats & Rétrocession</p>
          </div>
        </div>

        {/* ── Champ recherche courtier avec react-select ─────────────── */}
        <div style={{ width: 300, zIndex: 10 }}>
          <Select 
            options={[...merged].sort((a,b) => b.total_written_premium - a.total_written_premium).map(b => ({ value: b.broker, label: b.broker }))}
            value={null}
            onChange={(v: any) => {
              if (v?.value) {
                navigate(`/analyse-courtiers/${encodeURIComponent(v.value)}`)
              }
            }}
            placeholder="Rechercher un courtier..."
            isClearable
            menuPortalTarget={document.body}
            styles={{
              menuPortal: base => ({ ...base, zIndex: 9999 }),
              control: base => ({
                ...base,
                minHeight: '40px',
                borderRadius: '0.75rem',
                borderColor: 'var(--color-gray-100)',
                fontSize: '0.78rem'
              }),
              option: base => ({
                ...base,
                fontSize: '0.78rem'
              })
            }}
          />
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {[
          { label: 'Courtiers', value: String(agg.count), icon: Users, color: C.blue },
          { label: 'Volume Total', value: `${fmtMAD(agg.total_wp)} MAD`, icon: DollarSign, color: C.navy },
          { label: 'Résultat Total', value: `${fmtMAD(agg.total_res)} MAD`, icon: TrendingUp, color: agg.total_res >= 0 ? C.green : C.red },
          { label: 'PMD Rétro', value: `${fmtMAD(agg.total_pmd)} MAD`, icon: Shield, color: C.orange },
          { label: 'ULR Moyen', value: formatPercent(agg.avgUlr), icon: Activity, color: ulrColor(agg.avgUlr) },
        ].map(k => (
          <div key={k.label} style={{
            background: 'white', borderRadius: 14, padding: '18px 20px',
            border: `1px solid ${C.grayLight}`, boxShadow: '0 2px 12px hsla(209,28%,14%,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${k.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={16} color={k.color} />
              </div>
              <span style={{ fontSize: '0.72rem', color: C.gray, fontWeight: 600 }}>{k.label}</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: C.navy }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row (Top 10 + Pie) ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Top 10 Bar */}
        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.grayLight}` }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 16 }}>
            <TrendingUp size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
            Top 10 Courtiers par {sortBy === 'avg_ulr' ? 'ULR' : sortBy === 'total_resultat' ? 'Résultat' : 'Volume'}
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 90 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
              <XAxis type="number" tickFormatter={v => sortBy === 'avg_ulr' ? `${(v*100).toFixed(0)}%` : fmtMAD(v)} tick={{ fontSize: 11 }} />
              <YAxis dataKey="broker" type="category" tick={{ fontSize: 10 }} width={85} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                const rs = roleStyle(d.retro_role)
                return (
                  <div style={{ background: 'white', borderRadius: 10, padding: '12px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: `2px solid ${rs.color}`, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, color: C.navy }}>{d.broker}</span>
                      <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 700, background: rs.bg, color: rs.color }}>{rs.label}</span>
                    </div>
                    <div style={{ fontSize: '0.73rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 10px' }}>
                      <span style={{ color: C.gray }}>Volume</span><span style={{ fontWeight: 600, textAlign: 'right' }}>{fmtMAD(d.total_written_premium)} MAD</span>
                      <span style={{ color: C.gray }}>Résultat</span><span style={{ fontWeight: 600, textAlign: 'right', color: d.total_resultat >= 0 ? C.green : C.red }}>{fmtMAD(d.total_resultat)} MAD</span>
                      <span style={{ color: C.gray }}>ULR</span><span style={{ fontWeight: 600, textAlign: 'right', color: ulrColor(d.avg_ulr) }}>{formatPercent(d.avg_ulr)}</span>
                      {d.pmd_placee > 0 && <><span style={{ color: C.gray }}>PMD Rétro</span><span style={{ fontWeight: 600, textAlign: 'right' }}>{fmtMAD(d.pmd_placee)} MAD</span></>}
                      <div style={{ gridColumn: '1/-1', borderTop: `1px solid ${C.grayLight}`, margin: '2px 0' }} />
                      <span style={{ fontWeight: 700 }}>Solde Net</span><span style={{ fontWeight: 800, textAlign: 'right', color: d.solde_net >= 0 ? C.green : C.red }}>{d.solde_net >= 0 ? '+' : ''}{fmtMAD(d.solde_net)} MAD</span>
                    </div>
                  </div>
                )
              }} />
              <Bar dataKey={sortBy} radius={[0, 6, 6, 0]} cursor="pointer"
                onClick={(d: any) => navigate(`/analyse-courtiers/${encodeURIComponent(d.broker)}`)}>
                {chartData.map((e, i) => (
                  <Cell key={i} fill={sortBy === 'avg_ulr' ? ulrColor(e.avg_ulr) : sortBy === 'total_resultat' ? (e.total_resultat >= 0 ? C.olive : C.red) : CHART_PAL[i % CHART_PAL.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Role Pie */}
        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.grayLight}` }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 16 }}>
            Répartition par Rôle
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={rolePie} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {rolePie.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `${v} courtiers`} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            {rolePie.map(r => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: C.gray }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, display: 'inline-block' }} />
                <span style={{ fontWeight: 600 }}>{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 14, border: `1px solid ${C.grayLight}`, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.grayLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, margin: 0 }}>
            Tous les Courtiers ({filtered.length})
          </h3>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['total_written_premium', 'total_resultat', 'avg_ulr'] as SortKey[]).map(k => (
              <button key={k} onClick={() => handleSort(k)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                border: `1px solid ${sortBy === k ? C.olive : C.grayLight}`,
                background: sortBy === k ? `${C.olive}14` : 'transparent',
                color: sortBy === k ? C.olive : C.gray, cursor: 'pointer',
              }}>
                {k === 'total_written_premium' ? 'Volume' : k === 'total_resultat' ? 'Résultat' : 'ULR'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 600 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.grayLight}`, position: 'sticky', top: 0, background: '#fafbfc', zIndex: 2 }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: C.gray, width: 40 }}>#</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: C.gray }}>Courtier</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: C.gray, width: 80 }}>Rôle</th>
                <th onClick={() => handleSort('total_written_premium')} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.gray, cursor: 'pointer', whiteSpace: 'nowrap' }}>Primes <SortIcon col="total_written_premium" /></th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.gray }}>PMD Rétro</th>
                <th onClick={() => handleSort('total_resultat')} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.gray, cursor: 'pointer', whiteSpace: 'nowrap' }}>Résultat <SortIcon col="total_resultat" /></th>
                <th onClick={() => handleSort('avg_ulr')} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.gray, cursor: 'pointer', whiteSpace: 'nowrap' }}>ULR <SortIcon col="avg_ulr" /></th>
                <th onClick={() => handleSort('contract_count')} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.gray, cursor: 'pointer' }}>Contrats <SortIcon col="contract_count" /></th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.gray }}>Solde Net</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 && (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: C.gray }}>Chargement...</td></tr>
              )}
              {filtered.map((d, i) => {
                const rs = roleStyle(d.retro_role)
                return (
                  <tr key={d.broker}
                    onClick={() => navigate(`/analyse-courtiers/${encodeURIComponent(d.broker)}`)}
                    style={{ borderBottom: `1px solid ${C.grayLight}`, cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '10px 16px', fontSize: '0.7rem', color: C.gray, fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: C.navy }}>{d.broker}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 700, background: rs.bg, color: rs.color }}>{rs.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmtMAD(d.total_written_premium)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, color: d.pmd_placee > 0 ? C.orange : C.gray }}>{d.pmd_placee > 0 ? fmtMAD(d.pmd_placee) : '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: d.total_resultat >= 0 ? C.green : C.red }}>{fmtMAD(d.total_resultat)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      {d.avg_ulr !== null && (
                        <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700, color: 'white', background: ulrColor(d.avg_ulr) }}>{formatPercent(d.avg_ulr)}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', color: C.gray, fontWeight: 600 }}>{d.contract_count}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: d.solde_net >= 0 ? C.green : C.red }}>
                      {d.solde_net >= 0 ? '+' : ''}{fmtMAD(d.solde_net)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}><ArrowRight size={13} color={C.gray} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  )
}
