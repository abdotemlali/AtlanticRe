import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, ComposedChart, Line, Legend,
} from 'recharts'
import {
  ArrowLeft, Briefcase, DollarSign, TrendingUp, Shield, Activity,
  Users, Globe, FileText, ChevronDown, ChevronUp, SlidersHorizontal, RotateCcw
} from 'lucide-react'
import Select from 'react-select'
import { useData } from '../context/DataContext'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { formatCompact, formatPercent } from '../utils/formatters'

const LIFE_BRANCH = 'VIE'
function toOptions(arr: string[]) { return arr.map(v => ({ value: v, label: v })) }
function toNumOptions(arr: number[]) { return arr.map(v => ({ value: v, label: String(v) })) }

const COLORS = [
  'hsl(209,28%,24%)', 'hsl(83,52%,36%)', 'hsl(12,76%,45%)', 'hsl(218,12%,68%)',
  'hsl(358,66%,54%)', 'hsl(30,88%,56%)', 'hsl(180,25%,35%)', 'hsl(43,96%,56%)',
  'hsl(280,30%,45%)', 'hsl(0,0%,40%)'
]

const labelStyle = "block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]"
const selectStyles = {
  menuPortalTarget: typeof document !== 'undefined' ? document.body : undefined,
  menuPosition: 'fixed' as const,
  styles: {
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
}


const C = {
  navy: 'hsl(209,35%,16%)', olive: 'hsl(83,52%,36%)', oliveLight: 'hsl(83,50%,55%)',
  orange: 'hsl(28,88%,55%)', red: 'hsl(358,66%,54%)', blue: 'hsl(209,60%,55%)',
  green: 'hsl(145,55%,42%)', gray: 'hsl(218,14%,65%)', grayLight: 'hsl(218,22%,92%)',
}
const CHART_PAL = ['#1E3A5F', '#4E6820', '#E67E22', '#3498DB', '#9B59B6', '#1ABC9C', '#E74C3C', '#2C3E50']

const fmtMAD = (v: number) => {
  if (Math.abs(v) >= 1e9) return `${(v/1e9).toFixed(1)} Md`
  if (Math.abs(v) >= 1e6) return `${(v/1e6).toFixed(1)} M`
  if (Math.abs(v) >= 1e3) return `${(v/1e3).toFixed(0)} K`
  return v.toLocaleString('fr-FR')
}
const ulrColor = (ulr: number | null) => {
  if (!ulr) return C.gray
  if (ulr <= 0.5) return C.green
  if (ulr <= 0.7) return C.olive
  if (ulr <= 0.9) return C.orange
  return C.red
}

const roleConfig = (role: string) => {
  if (role === 'double') return { bg: '#EEF3E6', color: C.olive, label: 'Double Rôle' }
  if (role === 'placeur') return { bg: '#FEF5EC', color: C.orange, label: 'Placeur' }
  return { bg: '#E8EDF1', color: C.navy, label: 'Apporteur' }
}

export default function BrokerDetail() {
  const { brokerName } = useParams<{ brokerName: string }>()
  const broker = decodeURIComponent(brokerName || '')
  const navigate = useNavigate()
  const { filterOptions } = useData()

  const [profile, setProfile] = useState<any>(null)
  const [byYear, setByYear] = useState<any[]>([])
  const [byBranch, setByBranch] = useState<any[]>([])
  const [byBranchAll, setByBranchAll] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'contracts'>('overview')
  const [contractSort, setContractSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'written_premium', dir: 'desc' })
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)

  // ── Filtres locaux ─────────────────────────────────────────────────────────
  const [localUwYear, setLocalUwYear] = useState<number[]>([])
  const [localUwYearMin, setLocalUwYearMin] = useState<number | null>(null)
  const [localUwYearMax, setLocalUwYearMax] = useState<number | null>(null)
  const [localBranche, setLocalBranche] = useState<string[]>([])
  const [localTypeSpc, setLocalTypeSpc] = useState<string[]>([])
  const [localTypeOfContract, setLocalTypeOfContract] = useState<string[]>([])
  const [brancheScope, setBrancheScope] = useState({ vie: true, nonVie: true })

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (localUwYear.length > 0 || localUwYearMin !== null || localUwYearMax !== null) n++
    if (localBranche.length > 0) n++
    if (localTypeSpc.length > 0) n++
    if (localTypeOfContract.length > 0) n++
    return n
  }, [localUwYear, localUwYearMin, localUwYearMax, localBranche, localTypeSpc, localTypeOfContract])

  const hasLocalFilters = activeFilterCount > 0 || !brancheScope.vie || !brancheScope.nonVie

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
    // Clear branch selection when scope changes — dropdown options will update automatically
    setLocalBranche([])
  }

  const brancheOptions = useMemo(() => {
    if (brancheScope.vie && !brancheScope.nonVie) return toOptions(allBrancheValues.filter((b: string) => b === LIFE_BRANCH))
    if (!brancheScope.vie && brancheScope.nonVie) return toOptions(allBrancheValues.filter((b: string) => b !== LIFE_BRANCH))
    return toOptions(allBrancheValues)
  }, [allBrancheValues, brancheScope])

  const buildLocalParams = useCallback(() => {
    const p: Record<string, string> = { broker }
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
  }, [broker, localUwYear, localUwYearMin, localUwYearMax, localBranche, localTypeSpc, localTypeOfContract, brancheScope])

  const loadData = useCallback(async () => {
    if (!broker) return
    setLoading(true)
    try {
      const p = buildLocalParams()
      // Params sans filtre branche — pour le pie chart (toutes branches visibles)
      const pNoBranche = { ...p }
      delete pNoBranche['branche']
      const [profRes, yearRes, branchRes, branchAllRes, contractRes] = await Promise.all([
        api.get(API_ROUTES.BROKER.PROFILE, { params: p }),
        api.get(API_ROUTES.BROKER.BY_YEAR, { params: p }),
        api.get(API_ROUTES.BROKER.BY_BRANCH, { params: p }),
        api.get(API_ROUTES.BROKER.BY_BRANCH, { params: pNoBranche }),
        api.get(API_ROUTES.BROKER.CONTRACTS, { params: p }),
      ])
      setProfile(profRes.data || null)
      setByYear(yearRes.data || [])
      setByBranch(branchRes.data || [])
      setByBranchAll(branchAllRes.data || [])
      setContracts(contractRes.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [broker, buildLocalParams])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${C.olive}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!profile || !profile.broker) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: C.gray }}>Aucun courtier trouvé : <strong>{broker}</strong></p>
      <button onClick={() => navigate('/analyse-courtiers')} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: `1px solid ${C.olive}`, color: C.olive, background: 'transparent', cursor: 'pointer', fontWeight: 700 }}>
        ← Retour
      </button>
    </div>
  )

  const role = roleConfig(profile.retro_role)

  const sortedContracts = [...contracts].sort((a, b) => {
    const va = a[contractSort.key] ?? 0
    const vb = b[contractSort.key] ?? 0
    return contractSort.dir === 'desc' ? vb - va : va - vb
  })

  const handleContractSort = (key: string) => {
    if (contractSort.key === key) setContractSort(p => ({ ...p, dir: p.dir === 'desc' ? 'asc' : 'desc' }))
    else setContractSort({ key, dir: 'desc' })
  }

  const CSortIcon = ({ col }: { col: string }) => {
    if (contractSort.key === col) return null
    return contractSort.dir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />
  }

  const uwYears = filterOptions?.underwriting_years ?? []
  const typeOfContractOpts = toOptions(filterOptions?.type_of_contract ?? [])
  const typeSpcOpts = toOptions(filterOptions?.type_contrat_spc ?? [])

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* ── Panneau de filtres local — collapsible ───────────────────── */}
      <div className="flex-shrink-0 z-40 bg-[var(--color-off-white)] pt-1 pb-4" style={{ marginTop: '-10px', paddingLeft: 32, paddingRight: 32 }}>
        <div className="bg-white rounded-xl border border-[var(--color-gray-100)] shadow-sm overflow-hidden">
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
                      {uwYears.map((y: number) => <option key={y} value={y}>{y}</option>)}
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
                      {[...uwYears].reverse().map((y: number) => <option key={y} value={y}>{y}</option>)}
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
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 32px 100px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>

      {/* Back + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button onClick={() => navigate('/analyse-courtiers')} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
          border: `1px solid ${C.grayLight}`, background: 'white', cursor: 'pointer',
          fontSize: '0.78rem', fontWeight: 600, color: C.navy,
        }}>
          <ArrowLeft size={14} /> Retour
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${role.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={22} color={role.color} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: C.navy, margin: 0 }}>{broker}</h1>
                <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700, background: role.bg, color: role.color }}>{role.label}</span>
              </div>
              <p style={{ fontSize: '0.76rem', color: C.gray, margin: 0 }}>
                {profile.cedantes?.length || 0} cédantes • {profile.branches?.length || 0} branches • {profile.pays?.length || 0} pays
              </p>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', background: C.grayLight, padding: 3, borderRadius: 10 }}>
          {(['overview', 'contracts'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 16px', borderRadius: 8, fontSize: '0.76rem', fontWeight: 700, border: 'none', cursor: 'pointer',
              background: tab === t ? 'white' : 'transparent', color: tab === t ? C.navy : C.gray,
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
            }}>
              {t === 'overview' ? 'Vue d\'ensemble' : `Contrats (${contracts.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Volume', value: `${fmtMAD(profile.total_written_premium || 0)} MAD`, icon: DollarSign, color: C.navy },
              { label: 'Résultat', value: `${fmtMAD(profile.total_resultat || 0)} MAD`, icon: TrendingUp, color: (profile.total_resultat || 0) >= 0 ? C.green : C.red },
              { label: 'ULR', value: formatPercent(profile.avg_ulr), icon: Activity, color: ulrColor(profile.avg_ulr) },
              { label: 'Contrats', value: String(profile.contract_count || 0), icon: FileText, color: C.blue },
              { label: 'PMD Rétro', value: `${fmtMAD(profile.retro_pmd_placee || 0)} MAD`, icon: Shield, color: C.orange },
              { label: 'Solde Net', value: `${profile.solde_net >= 0 ? '+' : ''}${fmtMAD(profile.solde_net || 0)} MAD`, icon: TrendingUp, color: (profile.solde_net || 0) >= 0 ? C.green : C.red },
            ].map(k => (
              <div key={k.label} style={{
                background: 'white', borderRadius: 14, padding: '16px 18px',
                border: `1px solid ${C.grayLight}`, boxShadow: '0 2px 12px hsla(209,28%,14%,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <k.icon size={14} color={k.color} />
                  <span style={{ fontSize: '0.68rem', color: C.gray, fontWeight: 600 }}>{k.label}</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: C.navy }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Charts: 1 colonne — Évolution d'abord, puis Branches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 }}>

            {/* Évolution Historique (Année de Souscription) */}
            <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.grayLight}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <TrendingUp size={16} color={C.navy} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, margin: 0 }}>
                  Évolution Historique (Année de Souscription)
                </h3>
              </div>
              {byYear.length > 0 ? (
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={byYear} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grayLight} />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: C.gray }} />
                      <YAxis yAxisId="left" tickFormatter={v => fmtMAD(v)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: C.gray }} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${(v*100).toFixed(0)}%`} domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: C.gray }} />
                      <Tooltip content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', color: C.navy, padding: '12px 14px', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: `1px solid ${C.grayLight}`, fontSize: '0.73rem' }}>
                            <div style={{ fontWeight: 800, marginBottom: 8 }}>Année {label}</div>
                            {payload.map((entry: any, i: number) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
                                <span style={{ opacity: 0.7 }}>{entry.name}</span>
                                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: entry.dataKey === 'avg_ulr' ? C.orange : entry.color }}>
                                  {entry.dataKey === 'avg_ulr' ? formatPercent(entry.value) : fmtMAD(entry.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                      <Bar yAxisId="left" dataKey="total_written_premium" name="Prime Écrite" fill={C.navy} radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="total_resultat" name="Résultat Net" radius={[4, 4, 0, 0]}>
                        {byYear.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.total_resultat >= 0 ? C.olive : C.red} />
                        ))}
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="avg_ulr" name="Loss Ratio" stroke={C.orange} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: C.gray }}>Pas de données</div>
              )}
            </div>

            {/* Répartition par Branche (Primes) */}
            <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.grayLight}` }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 16 }}>
                Répartition par Branche (Primes)
              </h3>
              {byBranchAll.length > 0 ? (() => {
                const pieData = byBranchAll.slice(0, 10).map(d => ({ name: d.branche, value: d.total_written_premium || 0 }))
                // Color logic: selected branches get palette colors, non-selected appear in solid black
                const hasFilter = localBranche.length > 0
                let colorIdx = 0
                const branchColorMap: Record<string, string> = {}
                pieData.forEach(d => {
                  if (!hasFilter || localBranche.includes(d.name)) {
                    branchColorMap[d.name] = COLORS[colorIdx % COLORS.length]
                    colorIdx++
                  } else {
                    branchColorMap[d.name] = '#111111'
                  }
                })
                const RADIAN = Math.PI / 180
                const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
                  if (percent < 0.04) return null
                  const radius = outerRadius + 28
                  const x = cx + radius * Math.cos(-midAngle * RADIAN)
                  const y = cy + radius * Math.sin(-midAngle * RADIAN)
                  const isHighlighted = !hasFilter || localBranche.includes(name)
                  return (
                    <text x={x} y={y} fill={isHighlighted ? C.navy : C.gray} textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central" fontSize={11} fontWeight={isHighlighted ? 700 : 500}
                      style={{ pointerEvents: 'none', opacity: isHighlighted ? 1 : 0.55 }}>
                      {`${name} (${(percent * 100).toFixed(1)}%)`}
                    </text>
                  )
                }
                return (
                  <div style={{ height: 440 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 20, right: 140, bottom: 20, left: 140 }}>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={90}
                          outerRadius={150}
                          paddingAngle={2}
                          dataKey="value"
                          labelLine={true}
                          label={renderCustomLabel}
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={branchColorMap[entry.name]}
                              opacity={1}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => `${fmtMAD(val)} MAD`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )
              })() : (
                <div style={{ padding: 40, textAlign: 'center', color: C.gray }}>Pas de données</div>
              )}
            </div>

          </div>

          {/* Info panels: Cedantes + Pays */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.grayLight}` }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 10 }}>
                <Users size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                Cédantes Servies ({profile.cedantes?.length || 0})
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(profile.cedantes || []).slice(0, 25).map((c: string) => (
                  <span key={c} style={{ padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, background: `${C.navy}0A`, color: C.navy, border: `1px solid ${C.grayLight}` }}>
                    {c}
                  </span>
                ))}
                {(profile.cedantes?.length || 0) > 25 && <span style={{ color: C.gray, fontSize: '0.7rem', fontWeight: 600, alignSelf: 'center' }}>+{profile.cedantes.length - 25} autres</span>}
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.grayLight}` }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 10 }}>
                <Globe size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                Pays d'Exposition ({profile.pays?.length || 0})
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(profile.pays || []).slice(0, 25).map((p: string) => (
                  <span key={p} style={{ padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, background: `${C.blue}0A`, color: C.blue, border: `1px solid ${C.grayLight}` }}>
                    {p}
                  </span>
                ))}
                {(profile.pays?.length || 0) > 25 && <span style={{ color: C.gray, fontSize: '0.7rem', fontWeight: 600, alignSelf: 'center' }}>+{profile.pays.length - 25} autres</span>}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'contracts' && (
        <div style={{ background: 'white', borderRadius: 14, border: `1px solid ${C.grayLight}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.grayLight}`, background: '#fafbfc' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, margin: 0 }}>
              <FileText size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
              Détail des Contrats ({contracts.length})
            </h3>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 600 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.grayLight}`, position: 'sticky', top: 0, background: '#fafbfc', zIndex: 2 }}>
                  {[
                    { key: 'policy_id', label: 'N° Police', align: 'left' },
                    { key: 'cedante', label: 'Cédante', align: 'left' },
                    { key: 'branche', label: 'Branche', align: 'left' },
                    { key: 'pays_risque', label: 'Pays', align: 'left' },
                    { key: 'uw_year', label: 'UY', align: 'center' },
                    { key: 'type_contrat', label: 'Type', align: 'center' },
                    { key: 'written_premium', label: 'Prime', align: 'right' },
                    { key: 'resultat', label: 'Résultat', align: 'right' },
                    { key: 'ulr', label: 'ULR', align: 'right' },
                    { key: 'share_signed', label: 'Part %', align: 'right' },
                    { key: 'commission', label: 'Commission', align: 'right' },
                    { key: 'status', label: 'Statut', align: 'center' },
                  ].map(h => (
                    <th key={h.key} onClick={() => handleContractSort(h.key)} style={{
                      padding: '10px 10px', textAlign: h.align as any, fontWeight: 700, color: C.gray,
                      cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.7rem',
                    }}>
                      {h.label} <CSortIcon col={h.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedContracts.map((c, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.grayLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafcff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: C.navy, fontWeight: 600 }}>{c.policy_id || '—'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: C.navy }}>{c.cedante || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{c.branche || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{c.pays_risque || '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace' }}>{c.uw_year || '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, background: `${C.blue}14`, color: C.blue }}>{c.type_contrat || '—'}</span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmtMAD(c.written_premium)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: c.resultat >= 0 ? C.green : C.red }}>{fmtMAD(c.resultat)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 700, color: 'white', background: ulrColor(c.ulr) }}>{formatPercent(c.ulr)}</span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{(c.share_signed || 0).toFixed(1)}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{(c.commission || 0).toFixed(1)}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 7px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 700,
                        background: c.status === 'Active' ? `${C.green}14` : `${C.gray}14`,
                        color: c.status === 'Active' ? C.green : C.gray,
                      }}>{c.status || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
