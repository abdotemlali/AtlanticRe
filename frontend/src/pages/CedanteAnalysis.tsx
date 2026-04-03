import { useState, useEffect, useMemo } from "react"
import { useNavigate, useLocation } from 'react-router-dom'
import { Building2, TrendingUp, AlertTriangle, CheckCircle, PieChart, BarChart2, Table, GitCompare, FileText, Settings } from 'lucide-react'
import Select from 'react-select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie, Cell as PieCell, Line, Legend, ComposedChart } from 'recharts'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { useData } from '../context/DataContext'
import { formatCompact, formatPercent } from '../utils/formatters'
import { ChartSkeleton } from '../components/ui/Skeleton'
import { getScopedParams } from '../utils/pageFilterScopes'
import ActiveFiltersBar from '../components/ActiveFiltersBar'
import PageFilterPanel from '../components/PageFilterPanel'
import { EmptyState } from '../components/ui/EmptyState'
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
}

type VieNonVieView = 'ALL' | 'VIE' | 'NON_VIE'  // A3

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
  const { filters, filterOptions, setFilters } = useData()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [selectedCedante, setSelectedCedante] = useState<string | null>(null)
  
  const [profile, setProfile] = useState<CedanteProfile | null>(null)
  const [yearData, setYearData] = useState<any[]>([])
  const [branchData, setBranchData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // A3 — Vie/Non-vie toggle (local to this page)
  const [vieView, setVieView] = useState<VieNonVieView>('ALL')

  // B2 — Diversification params (pure local state, never persisted)
  const [totalBranches, setTotalBranches] = useState(12)
  const [seuilVert, setSeuilVert] = useState(40)
  const [showDiversifParams, setShowDiversifParams] = useState(false)

  // Sort State for Commissions Table
  const [sortCol, setSortCol] = useState<string>('total_written_premium')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const cedanteOptions = useMemo(() => {
    return (filterOptions?.cedantes || []).map(c => ({ value: c, label: c }))
  }, [filterOptions?.cedantes])

  // Params centralisés via useMemo (avec fallback vers undefined si pass de cédante pour bloquer `useFetch`)
  const params = useMemo(() => {
    if (!selectedCedante) return undefined
    const vieParam = vieView !== 'ALL' ? { vie_non_vie_view: vieView } : {}
    return { ...getScopedParams(location.pathname, filters), cedante: selectedCedante, ...vieParam }
  }, [selectedCedante, vieView, filters, location.pathname])

  // Décomposition des 3 appels via useFetch
  const { data: profileRes, loading: l1 } = useFetch<any>(selectedCedante ? API_ROUTES.CEDANTE.PROFILE : null, params)
  const { data: yearRes, loading: l2 } = useFetch<any>(selectedCedante ? API_ROUTES.CEDANTE.BY_YEAR : null, params)
  const { data: branchRes, loading: l3 } = useFetch<any>(selectedCedante ? API_ROUTES.CEDANTE.BY_BRANCH : null, params)

  useEffect(() => {
    if (profileRes) setProfile(profileRes)
    if (yearRes) setYearData(yearRes)
    if (branchRes) setBranchData(branchRes)
  }, [profileRes, yearRes, branchRes])

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

  if (!selectedCedante) {
    return (
      <div className="space-y-4 animate-fade-in p-2">
        <ActiveFiltersBar />
        <PageFilterPanel />
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

        {/* Empty State */}
        <div className="h-[50vh] flex items-center justify-center p-4">
          <EmptyState 
            title="Sélectionnez une cédante" 
            message="Choisissez une cédante dans le menu déroulant pour afficher son analyse détaillée." 
            icon={<Building2 size={48} className="mb-4 text-[var(--color-gray-400)]" />} 
          />
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

  const ulrColor = (ulr: number | null) => {
    if (ulr === null) return 'var(--color-gray-400)'
    if (ulr > 100) return 'hsl(358,66%,54%)'
    if (ulr > 70) return 'hsl(30,88%,56%)'
    return 'hsl(83,52%,36%)'
  }

  return (
    <div className="space-y-6 animate-fade-in p-2 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 p-4 rounded-xl border border-[var(--color-gray-100)] backdrop-blur-md sticky top-0 z-40 shadow-sm">
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
          {/* A3 — Vie/Non-vie toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase">Vue :</span>
            {(['ALL', 'VIE', 'NON_VIE'] as VieNonVieView[]).map(v => (
              <button
                key={v}
                onClick={() => setVieView(v)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: vieView === v ? '1px solid var(--color-navy)' : '1px solid var(--color-gray-200)',
                  background: vieView === v ? 'var(--color-navy)' : 'white',
                  color: vieView === v ? 'white' : 'var(--color-gray-500)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {v === 'ALL' ? 'Tous' : v === 'VIE' ? 'Vie' : 'Non-vie'}
              </button>
            ))}
          </div>

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

          {/* Mix Portefeuille */}
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

          {/* Rapport de Diversification */}
          {(() => {
            // Calcul strict en Backend
            const activeBranchesCount = profile?.branches_actives || 0;
              
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
                       {sortedBranchData.map((b, i) => (
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
                         
                         return (
                           <tr key={i} className="border-b border-[var(--color-gray-100)] last:border-0 hover:bg-[hsla(0,0%,0%,0.02)] transition-colors">
                              <td className="py-3 px-4 text-xs font-bold text-[var(--color-navy)]">
                                <div className="flex items-center gap-2">
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
  )
}
