import { useState, useEffect, useMemo } from "react"
import { useNavigate } from 'react-router-dom'
import { BarChart2, TrendingUp, AlertTriangle, CheckCircle, PieChart, Table, GitCompare, FileText, Globe, MapPin } from 'lucide-react'
import Select from 'react-select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie, Cell as PieCell, Line, Legend, ComposedChart } from 'recharts'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { useData, filtersToParams } from '../context/DataContext'
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

  const [mode, setMode] = useState<'market' | 'country' | 'cedante'>(() => {
    const stored = sessionStorage.getItem('analysis_mode')
    return (stored as any) || 'cedante'
  })
  const [selectedCedante, setSelectedCedante] = useState<string | null>(null)
  const [selectedPays, setSelectedPays] = useState<string | null>(null)
  const [selectedBranche, setSelectedBranche] = useState<string | null>(null)

  const [profile, setProfile] = useState<AnalysisProfile | null>(null)
  const [yearData, setYearData] = useState<any[]>([])
  const [branchData, setBranchData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [sortCol, setSortCol] = useState<string>('total_written_premium')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

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
      api.get(API_ROUTES.KPIS.BY_COUNTRY, { params: filtersToParams(filters) }).then(res => {
        if (res.data) {
          setCountryOptions(res.data.map((c: any) => ({ value: c.pays, label: c.pays })))
        }
      }).catch(console.error)
    }
  }, [mode, filters])

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

  const cedanteOptions = useMemo(() => {
    return (filterOptions?.cedantes || []).map(c => ({ value: c, label: c }))
  }, [filterOptions?.cedantes])

  // Fetch data based on mode
  useEffect(() => {
    if (mode === 'cedante' && selectedCedante) {
      setLoading(true)
      const params = { ...filtersToParams(filters), cedante: selectedCedante }
      Promise.all([
        api.get(API_ROUTES.CEDANTE.PROFILE, { params }),
        api.get(API_ROUTES.CEDANTE.BY_YEAR, { params }),
        api.get(API_ROUTES.CEDANTE.BY_BRANCH, { params })
      ]).then(([p, y, b]) => {
        setProfile(p.data)
        setYearData(y.data)
        setBranchData(b.data)
      }).catch(console.error)
        .finally(() => setLoading(false))
    } else if (mode === 'country' && selectedPays) {
      setLoading(true)
      const params = { ...filtersToParams(filters), pays: selectedPays }
      Promise.all([
        api.get(API_ROUTES.COUNTRY.PROFILE, { params }),
        api.get(API_ROUTES.COUNTRY.BY_YEAR, { params }),
        api.get(API_ROUTES.COUNTRY.BY_BRANCH, { params })
      ]).then(([p, y, b]) => {
        setProfile({ ...p.data, cedante: p.data.pays, pays_cedante: '' })
        setYearData(y.data)
        setBranchData(b.data)
      }).catch(console.error)
        .finally(() => setLoading(false))
    } else if (mode === 'market' && selectedPays && selectedBranche) {
      setLoading(true)
      const params = { ...filtersToParams(filters), pays: selectedPays, branche: selectedBranche }
      Promise.all([
        api.get(API_ROUTES.MARKET.PROFILE, { params }),
        api.get(API_ROUTES.MARKET.BY_YEAR, { params }),
      ]).then(([p, y]) => {
        setProfile({ ...p.data, cedante: `${p.data.pays} — ${p.data.branche}`, pays_cedante: '' })
        setYearData(y.data)
        setBranchData([])
      }).catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [mode, selectedCedante, selectedPays, selectedBranche, filters])

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
    if (mode === 'cedante' && selectedCedante) {
      setFilters((f: any) => ({ ...f, cedante: [selectedCedante] }))
    } else if (mode === 'country' && selectedPays) {
      setFilters((f: any) => ({ ...f, pays_risque: [selectedPays] }))
    } else if (mode === 'market' && selectedPays && selectedBranche) {
      setFilters((f: any) => ({ ...f, pays_risque: [selectedPays], branche: [selectedBranche] }))
    }
    sessionStorage.setItem('dashboard_tab', 'contrats')
    navigate('/')
  }

  const handleComparer = () => {
    if (mode === 'cedante' && selectedCedante) {
      sessionStorage.setItem('compare_cedante_a', JSON.stringify({ cedante: selectedCedante }))
      navigate('/comparaison')
    } else if (mode === 'country' && selectedPays) {
      sessionStorage.setItem('compare_country_a', JSON.stringify({ pays: selectedPays }))
      navigate('/comparaison')
    } else if (mode === 'market' && selectedPays && selectedBranche) {
      sessionStorage.setItem('compare_market_a', JSON.stringify({ pays: selectedPays, branche: selectedBranche }))
      navigate('/comparaison')
    }
  }

  // Determine current selection state
  const hasSelection = (mode === 'cedante' && selectedCedante) ||
    (mode === 'country' && selectedPays) ||
    (mode === 'market' && selectedPays && selectedBranche)

  // Title & subtitle based on mode
  const getTitle = () => {
    if (mode === 'cedante') return selectedCedante || ''
    if (mode === 'country') return selectedPays || ''
    if (mode === 'market') return selectedPays && selectedBranche ? `${selectedPays} — ${selectedBranche}` : ''
    return ''
  }

  const getSubtitle = () => {
    if (mode === 'cedante') return profile?.pays_cedante || 'Pays non spécifié'
    if (mode === 'country') return 'Analyse globale du pays'
    if (mode === 'market') return 'Analyse du marché'
    return ''
  }

  const getEmptyMessage = () => {
    if (mode === 'cedante') return 'Sélectionnez une cédante pour afficher son analyse'
    if (mode === 'country') return 'Sélectionnez un pays pour afficher son analyse'
    if (mode === 'market') return 'Sélectionnez un pays puis une branche pour afficher l\'analyse du marché'
    return ''
  }

  const getEmptyIcon = () => {
    if (mode === 'cedante') return <BarChart2 size={64} className="mb-4 text-[var(--color-gray-400)]" />
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
    if (mode === 'cedante') {
      return (
        <div className="w-full md:w-80 z-50">
          <Select
            options={cedanteOptions}
            value={cedanteOptions.find(o => o.value === selectedCedante) || null}
            onChange={(v) => setSelectedCedante(v?.value || null)}
            placeholder="Rechercher une cédante..."
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
              <p className="text-sm text-[var(--color-gray-500)] mt-0.5">Explorez les performances par cédante, pays ou marché</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 items-end">
            {/* Mode toggle */}
            <div className="inline-flex bg-white rounded-lg p-1 border shadow-sm flex-wrap gap-1" style={{ borderColor: 'var(--color-gray-200)' }}>
              <button onClick={() => { setMode('cedante'); setSelectedCedante(null); setSelectedPays(null); setSelectedBranche(null) }}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'cedante' ? 'bg-[var(--color-navy)] text-white shadow-md' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}>
                Par cédante
              </button>
              <button onClick={() => { setMode('country'); setSelectedCedante(null); setSelectedPays(null); setSelectedBranche(null) }}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'country' ? 'bg-[var(--color-navy)] text-white shadow-md' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}>
                Par pays global
              </button>
              <button onClick={() => { setMode('market'); setSelectedCedante(null); setSelectedPays(null); setSelectedBranche(null) }}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'market' ? 'bg-[var(--color-navy)] text-white shadow-md' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}>
                Par marché (Pays + Branche)
              </button>
            </div>

            {renderSelectors()}
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center h-[50vh] text-center opacity-60">
          {getEmptyIcon()}
          <h2 className="text-lg font-bold text-[var(--color-navy)]">{getEmptyMessage()}</h2>
          <p className="text-sm mt-1">Choisissez dans le menu déroulant pour afficher l'analyse détaillée.</p>
        </div>
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
            <button onClick={() => { setMode('cedante'); setSelectedCedante(null); setSelectedPays(null); setSelectedBranche(null); setProfile(null); setYearData([]); setBranchData([]) }}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'cedante' ? 'bg-[var(--color-navy)] text-white shadow-md' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}>
              Par cédante
            </button>
            <button onClick={() => { setMode('country'); setSelectedCedante(null); setSelectedPays(null); setSelectedBranche(null); setProfile(null); setYearData([]); setBranchData([]) }}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'country' ? 'bg-[var(--color-navy)] text-white shadow-md' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}>
              Par pays global
            </button>
            <button onClick={() => { setMode('market'); setSelectedCedante(null); setSelectedPays(null); setSelectedBranche(null); setProfile(null); setYearData([]); setBranchData([]) }}
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
