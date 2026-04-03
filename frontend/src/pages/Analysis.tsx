import { useState, useEffect, useMemo } from "react"
import { useNavigate } from 'react-router-dom'
import { BarChart2, TrendingUp, AlertTriangle, CheckCircle, PieChart, Table, GitCompare, FileText, Globe, MapPin } from 'lucide-react'
import Select, { components } from 'react-select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie, Cell as PieCell, Line, Legend, ComposedChart } from 'recharts'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { useData, filtersToParams } from '../context/DataContext'
import { useFetch } from '../hooks/useFetch'
import { formatCompact, formatPercent } from '../utils/formatters'
import { ChartSkeleton } from '../components/ui/Skeleton'

interface AnalysisProfile {
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
}

type ContractTypeView = 'ALL' | 'FAC' | 'TREATY'  // A1
type VieNonVieViewA = 'ALL' | 'VIE' | 'NON_VIE'   // A2

function CrossMarketWidget({ filters }: { filters: any }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [vieView, setVieView] = useState<VieNonVieViewA>('ALL')

  useEffect(() => {
    setLoading(true)
    const params: any = { ...filtersToParams(filters) }
    if (vieView !== 'ALL') params.vie_non_vie_view = vieView
    
    api.get(API_ROUTES.COUNTRY.BY_CONTRACT_TYPE, { params })
      .then(res => {
        setData(res.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filters, vieView])

  if (!data?.length) return null

  // Format data for Grouped Bar Chart
  const chartData = data.slice(0, 10).map(d => ({
    name: d.pays,
    'Facultatif': d.fac_written_premium,
    'Traité': d.treaty_written_premium,
  }))

  return (
    <div className="space-y-6 mt-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-navy)] flex items-center gap-2">
          Vue Croisée : Marché × Type de Contrat
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase">Filtre Vie :</span>
          {(['ALL', 'VIE', 'NON_VIE'] as VieNonVieViewA[]).map(v => (
            <button key={v} onClick={() => setVieView(v)}
              style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                border: vieView === v ? '1px solid var(--color-navy)' : '1px solid var(--color-gray-200)',
                background: vieView === v ? 'var(--color-navy)' : 'white',
                color: vieView === v ? 'white' : 'var(--color-gray-500)',
              }}>{v === 'ALL' ? 'Tous' : v === 'VIE' ? 'Vie' : 'Non-vie'}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5 relative">
          {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10" />}
          <h3 className="text-sm font-bold text-[var(--color-navy)] mb-4">Primes Écrites : FAC vs Traité (Top 10 Pays)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-100)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                <YAxis tickFormatter={(val) => formatCompact(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                <RechartsTooltip formatter={(val: number) => formatCompact(val)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Facultatif" fill="hsl(180,25%,35%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Traité" fill="hsl(209,28%,24%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] overflow-hidden relative">
          {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10" />}
          <div className="p-4 border-b border-[var(--color-gray-100)] bg-[var(--color-off-white)]">
            <h3 className="text-sm font-bold text-[var(--color-navy)]">Détails Statistiques</h3>
          </div>
          <div className="overflow-x-auto max-h-[320px]">
            <table className="w-full text-left border-collapse caption-bottom">
              <thead className="sticky top-0 bg-[var(--color-off-white)] z-10 shadow-sm border-b border-[var(--color-gray-100)]">
                <tr>
                  <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase">Pays</th>
                  <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right">Contrats</th>
                  <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right">Primes FAC</th>
                  <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right">Primes Traité</th>
                  <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right">Prime Totale</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => {
                   const facPct = d.total_written_premium > 0 ? (d.fac_written_premium / d.total_written_premium) * 100 : 0
                   return (
                    <tr key={i} className="border-b border-[var(--color-gray-100)] last:border-0 hover:bg-[hsla(0,0%,0%,0.02)] transition-colors">
                      <td className="py-3 px-4 text-xs font-bold text-[var(--color-navy)]">{d.pays}</td>
                      <td className="py-3 px-4 text-xs text-right">
                        <div className="flex flex-col items-end">
                           <span className="font-bold text-[var(--color-navy)]">{d.total_contract_count}</span>
                           <span className="text-[10px] text-[var(--color-gray-500)]">{d.fac_contract_count} fac / {d.treaty_contract_count} traité</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-right text-[hsl(180,25%,35%)] font-bold">
                        {formatCompact(d.fac_written_premium)} <span className="text-[10px] opacity-70 ml-1">({facPct.toFixed(0)}%)</span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-right text-[hsl(209,28%,24%)] font-bold">
                        {formatCompact(d.treaty_written_premium)}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono font-bold text-right text-[var(--color-navy)]">
                        {formatCompact(d.total_written_premium)}
                      </td>
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

const COLORS = [
  'hsl(209,28%,24%)',
  'hsl(83,52%,36%)',
  'hsl(12,76%,45%)',
  'hsl(218,12%,68%)',
  'hsl(358,66%,54%)',
  'hsl(30,88%,56%)',
  'hsl(180,25%,35%)',
  'hsl(43,96%,56%)',
  'hsl(280,30%,45%)',
  'hsl(0,0%,40%)'
]

export default function Analysis() {
  const { filters, filterOptions, setFilters } = useData()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'market' | 'country'>(() => {
    const stored = sessionStorage.getItem('analysis_mode')
    if (!stored || stored === 'cedante') return 'country'
    return (stored as any)
  })
  const [selectedPays, setSelectedPays] = useState<string | null>(null)
  const [selectedBranche, setSelectedBranche] = useState<string | null>(null)

  const [profile, setProfile] = useState<AnalysisProfile | null>(null)
  const [yearData, setYearData] = useState<any[]>([])
  const [branchData, setBranchData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [sortCol, setSortCol] = useState<string>('total_written_premium')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // A1 — FAC/Traité toggle (local to Analysis, independent of global filters)
  const [contractTypeView, setContractTypeView] = useState<ContractTypeView>('ALL')
  // A2 — Vie/Non-vie toggle (local to Analysis)
  const [vieView, setVieView] = useState<VieNonVieViewA>('ALL')

  // Country & branch options for selectors
  const [countryOptions, setCountryOptions] = useState<{ value: string; label: string }[]>([])
  const [marketOptions, setMarketOptions] = useState<{ value: string; label: string; pays: string; branche: string }[]>([])

  // Read sessionStorage on mount (for navigation from alerts)
  useEffect(() => {
    const storedMode = sessionStorage.getItem('analysis_mode')
    const storedMarket = sessionStorage.getItem('analysis_market')
    const storedCountry = sessionStorage.getItem('analysis_country')

    if (storedMode) {
      setMode(storedMode as any)
      sessionStorage.removeItem('analysis_mode')
    }
    if (storedMarket) {
      try {
        const { pays, branche } = JSON.parse(storedMarket)
        setSelectedPays(pays)
        setSelectedBranche(branche)
        sessionStorage.removeItem('analysis_market')
      } catch (e) {}
    }
    if (storedCountry) {
      try {
        const { pays } = JSON.parse(storedCountry)
        setSelectedPays(pays)
        sessionStorage.removeItem('analysis_country')
      } catch (e) {}
    }
  }, [])

  // Load country options for country mode
  useEffect(() => {
    if (mode === 'country' || mode === 'market') {
      const extraParams: Record<string, string> = {}
      if (contractTypeView !== 'ALL') extraParams.contract_type_view = contractTypeView
      if (vieView !== 'ALL') extraParams.vie_non_vie_view = vieView
      api.get(API_ROUTES.KPIS.BY_COUNTRY, { params: { ...filtersToParams(filters), ...extraParams } }).then(res => {
        if (res.data) {
          setCountryOptions(res.data.map((c: any) => ({ value: c.pays, label: c.pays })))
        }
      }).catch(console.error)
    }
  }, [mode, filters, contractTypeView, vieView])

  // Load market (branch) options for market mode when pays is selected
  useEffect(() => {
    if (mode === 'market' && selectedPays) {
      api.get(API_ROUTES.COMPARISON.MARKETS, { params: filtersToParams(filters) }).then(res => {
        if (res.data) {
          const filtered = res.data.filter((m: any) => m.pays === selectedPays)
          setMarketOptions(filtered.map((m: any) => ({
            value: m.branche,
            label: m.branche,
            pays: m.pays,
            branche: m.branche,
          })))
        }
      }).catch(console.error)
    }
  }, [mode, selectedPays, filters])


  // ==========================================
  // FETCH PIPELINE AVEC USEFETCH
  // ==========================================
  const fetchUrl = useMemo(() => {
    if (mode === 'country' && selectedPays) return {
      p: API_ROUTES.COUNTRY.PROFILE, y: API_ROUTES.COUNTRY.BY_YEAR, b: API_ROUTES.COUNTRY.BY_BRANCH
    }
    if (mode === 'market' && selectedPays && selectedBranche) return {
      p: API_ROUTES.MARKET.PROFILE, y: API_ROUTES.MARKET.BY_YEAR, b: null
    }
    return { p: null, y: null, b: null }
  }, [mode, selectedPays, selectedBranche])

  const fetchParams = useMemo(() => {
    const p = filtersToParams(filters)
    const extra: Record<string, string> = {}
    if (contractTypeView !== 'ALL') extra.contract_type_view = contractTypeView
    if (vieView !== 'ALL') extra.vie_non_vie_view = vieView

    if (mode === 'country') return { ...p, pays: selectedPays, ...extra }
    if (mode === 'market') return { ...p, pays: selectedPays, branche: selectedBranche, ...extra }
    return undefined
  }, [mode, filters, selectedPays, selectedBranche, contractTypeView, vieView])

  const { data: profRes, loading: l1 } = useFetch<any>(fetchUrl.p, fetchParams)
  const { data: yearRes, loading: l2 } = useFetch<any>(fetchUrl.y, fetchParams)
  const { data: branchRes, loading: l3 } = useFetch<any>(fetchUrl.b, fetchParams)

  useEffect(() => {
    if (!profRes) return
    if (mode === 'country') setProfile({ ...profRes, cedante: profRes.pays, pays_cedante: '' })
    else if (mode === 'market') setProfile({ ...profRes, cedante: `${profRes.pays} — ${profRes.branche}`, pays_cedante: '' })
    else setProfile(profRes)

    if (yearRes) setYearData(yearRes)
    if (fetchUrl.b ? branchRes : true) setBranchData(branchRes || [])
  }, [profRes, yearRes, branchRes, mode, fetchUrl.b])

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
    return [...branchData].sort((a, b) => {
      const valA = a[sortCol] ?? 0
      const valB = b[sortCol] ?? 0
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      return sortDir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
    })
  }, [branchData, sortCol, sortDir])

  const handleVoirContrats = () => {
    if (mode === 'country' && selectedPays) {
      setFilters((f: any) => ({ ...f, pays_risque: [selectedPays] }))
    } else if (mode === 'market' && selectedPays && selectedBranche) {
      setFilters((f: any) => ({ ...f, pays_risque: [selectedPays], branche: [selectedBranche] }))
    }
    sessionStorage.setItem('dashboard_tab', 'contrats')
    navigate('/')
  }

  const handleComparer = () => {
    if (mode === 'country' && selectedPays) {
      sessionStorage.setItem('compare_country_a', JSON.stringify({ pays: selectedPays }))
      navigate('/comparaison')
    } else if (mode === 'market' && selectedPays && selectedBranche) {
      sessionStorage.setItem('compare_market_a', JSON.stringify({ pays: selectedPays, branche: selectedBranche }))
      navigate('/comparaison')
    }
  }

  // Determine current selection state
  const hasSelection = (mode === 'country' && selectedPays) ||
    (mode === 'market' && selectedPays && selectedBranche)

  // Title & subtitle based on mode
  const getTitle = () => {
    if (mode === 'country') return selectedPays || ''
    if (mode === 'market') return selectedPays && selectedBranche ? `${selectedPays} — ${selectedBranche}` : ''
    return ''
  }

  const getSubtitle = () => {
    if (mode === 'country') return 'Analyse globale du pays'
    if (mode === 'market') return 'Analyse du marché'
    return ''
  }

  const getEmptyMessage = () => {
    if (mode === 'country') return 'Sélectionnez un pays pour afficher son analyse'
    if (mode === 'market') return 'Sélectionnez un pays puis une branche pour afficher l\'analyse du marché'
    return ''
  }

  const getEmptyIcon = () => {
    if (mode === 'country') return <Globe size={64} className="mb-4 text-[var(--color-gray-400)]" />
    return <MapPin size={64} className="mb-4 text-[var(--color-gray-400)]" />
  }

  const ulrColor = (ulr: number | null) => {
    if (ulr === null) return 'var(--color-gray-400)'
    if (ulr > 100) return 'hsl(358,66%,54%)'
    if (ulr > 70) return 'hsl(30,88%,56%)'
    return 'hsl(83,52%,36%)'
  }

  // Render selectors based on mode
  const renderSelectors = () => {
    if (mode === 'country') {
      return (
        <div className="w-full md:w-80 z-50">
          <Select
            options={countryOptions}
            value={countryOptions.find(o => o.value === selectedPays) || null}
            onChange={(v) => setSelectedPays(v?.value || null)}
            placeholder="Rechercher un pays..."
            isClearable
            menuPortalTarget={document.body}
            menuPosition="fixed"
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
      )
    }
    // market mode — 2 selects
    return (
      <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
        <div className="w-full md:w-56 z-50">
          <Select
            options={countryOptions}
            value={countryOptions.find(o => o.value === selectedPays) || null}
            onChange={(v) => { setSelectedPays(v?.value || null); setSelectedBranche(null) }}
            placeholder="Pays..."
            isClearable
            menuPortalTarget={document.body}
            menuPosition="fixed"
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
        <div className="w-full md:w-56 z-50">
          <Select
            options={marketOptions}
            value={marketOptions.find(o => o.value === selectedBranche) || null}
            onChange={(v) => setSelectedBranche(v?.value || null)}
            placeholder="Branche..."
            isClearable
            isDisabled={!selectedPays}
            menuPortalTarget={document.body}
            menuPosition="fixed"
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
    )
  }

  // Empty state
  if (!hasSelection) {
    return (
      <div className="space-y-6 animate-fade-in p-2">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 p-4 rounded-xl border border-[var(--color-gray-100)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[hsla(209,28%,24%,0.08)]">
              <BarChart2 size={20} className="text-[var(--color-navy)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-navy)]">Analyse</h1>
              <p className="text-sm text-[var(--color-gray-500)] mt-0.5">Explorez les performances par pays ou marché</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 items-end">
            {/* Mode toggle */}
            <div className="inline-flex bg-white rounded-lg p-1 border shadow-sm flex-wrap gap-1" style={{ borderColor: 'var(--color-gray-200)' }}>
              <button onClick={() => { setMode('country'); setSelectedPays(null); setSelectedBranche(null) }}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'country' ? 'bg-[var(--color-navy)] text-white shadow-md' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}>
                Par pays global
              </button>
              <button onClick={() => { setMode('market'); setSelectedPays(null); setSelectedBranche(null) }}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'market' ? 'bg-[var(--color-navy)] text-white shadow-md' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}>
                Par marché (Pays + Branche)
              </button>
            </div>

            {renderSelectors()}
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="text-sm text-[var(--color-gray-500)]">Choisissez un pays ou un marché en haut pour voir le détail.</p>
        </div>

        <CrossMarketWidget filters={filters} />
      </div>
    )
  }

  // Derived Data for Pie Chart & Top Branches
  const topBranches = branchData.slice(0, 8)
  const otherBranches = branchData.slice(8)
  const otherPremium = otherBranches.reduce((sum, b) => sum + (b.total_written_premium || 0), 0)

  const pieData = [
    ...topBranches.map(b => ({ name: b.branche, value: b.total_written_premium })),
    ...(otherPremium > 0 ? [{ name: 'Autres', value: otherPremium }] : [])
  ]

  return (
    <div className="space-y-6 animate-fade-in p-2 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 p-4 rounded-xl border border-[var(--color-gray-100)] backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[hsla(209,28%,24%,0.08)]">
            <BarChart2 size={20} className="text-[var(--color-navy)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-navy)] line-clamp-1" title={getTitle()}>{getTitle()}</h1>
            <p className="text-sm text-[var(--color-gray-500)] mt-0.5">{getSubtitle()}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 items-end">
          {/* Mode toggle */}
          <div className="inline-flex bg-white rounded-lg p-1 border shadow-sm flex-wrap gap-1" style={{ borderColor: 'var(--color-gray-200)' }}>
            <button key="country" onClick={() => { setMode('country'); setSelectedPays(null); setSelectedBranche(null); setProfile(null); setYearData([]); setBranchData([]) }}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'country' ? 'bg-[var(--color-navy)] text-white shadow-md' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}>
              Par pays global
            </button>
            <button key="market" onClick={() => { setMode('market'); setSelectedPays(null); setSelectedBranche(null); setProfile(null); setYearData([]); setBranchData([]) }}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'market' ? 'bg-[var(--color-navy)] text-white shadow-md' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}>
              Par marché (Pays + Branche)
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {renderSelectors()}
            <button
              onClick={handleVoirContrats}
              className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap"
              style={{ background: 'var(--color-navy-muted, hsla(209,28%,24%,0.08))', color: 'var(--color-navy)', border: '1px solid var(--color-gray-200)' }}
            >
              <FileText size={14} />
              Voir les contrats
            </button>
            <button
              onClick={handleComparer}
              className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all whitespace-nowrap shadow-sm"
              style={{ background: 'linear-gradient(135deg, hsl(209,32%,17%), hsl(209,28%,24%))', border: 'none' }}
            >
              <GitCompare size={14} />
              Comparer
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-6">
          <ChartSkeleton height={120} />
          <ChartSkeleton height={300} />
        </div>
      ) : profile && (
        <>
          {/* A1+A2 toggles — only in country/market mode */}
          {(mode === 'country' || mode === 'market') && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase">Type :</span>
                {(['ALL', 'FAC', 'TREATY'] as ContractTypeView[]).map(v => (
                  <button key={v} onClick={() => setContractTypeView(v)}
                    style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      border: contractTypeView === v ? '1px solid var(--color-navy)' : '1px solid var(--color-gray-200)',
                      background: contractTypeView === v ? 'var(--color-navy)' : 'white',
                      color: contractTypeView === v ? 'white' : 'var(--color-gray-500)',
                    }}>{v === 'ALL' ? 'Tous' : v === 'FAC' ? 'Facultatif' : 'Traité'}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase">Vie :</span>
                {(['ALL', 'VIE', 'NON_VIE'] as VieNonVieViewA[]).map(v => (
                  <button key={v} onClick={() => setVieView(v)}
                    style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      border: vieView === v ? '1px solid var(--color-navy)' : '1px solid var(--color-gray-200)',
                      background: vieView === v ? 'var(--color-navy)' : 'white',
                      color: vieView === v ? 'white' : 'var(--color-gray-500)',
                    }}>{v === 'ALL' ? 'Tous' : v === 'VIE' ? 'Vie' : 'Non-vie'}</button>
                ))}
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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

          {/* Mix Portefeuille — hidden in market mode */}
          {mode !== 'market' && branchData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart size={18} className="text-[var(--color-navy)]" />
                  <h3 className="text-sm font-bold text-[var(--color-navy)]">Mix par Branche (Primes)</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <PieCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: number) => formatCompact(val)} />
                      <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{ fontSize: '11px', maxHeight: '200px', overflowY: 'auto' }}
                        iconType="circle"
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 size={18} className="text-[var(--color-navy)]" />
                  <h3 className="text-sm font-bold text-[var(--color-navy)]">Top Branches (Loss Ratio)</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topBranches} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
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
                        {topBranches.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={ulrColor(entry.avg_ulr)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Commissions & Rates Table — hidden in market mode */}
          {mode !== 'market' && branchData.length > 0 && (
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
                      const comm = b.avg_commission ?? 0
                      const broka = b.avg_brokerage_rate ?? 0
                      const profita = b.avg_profit_comm_rate ?? 0

                      return (
                        <tr key={i} className="border-b border-[var(--color-gray-100)] last:border-0 hover:bg-[hsla(0,0%,0%,0.02)] transition-colors">
                          <td className="py-3 px-4 text-xs font-bold text-[var(--color-navy)]">{b.branche}</td>
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
          )}
        </>
      )}
    </div>
  )
}
