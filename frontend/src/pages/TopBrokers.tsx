import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Trophy, TrendingUp, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { useData } from '../context/DataContext'
import { formatCompact, formatPercent } from '../utils/formatters'
import { getScopedParams } from '../utils/pageFilterScopes'
import ActiveFiltersBar from '../components/ActiveFiltersBar'
import PageFilterPanel from '../components/PageFilterPanel'
import { EmptyState } from '../components/ui/EmptyState'
import { useFetch } from '../hooks/useFetch'

const ulrColor = (ulr: number | null): string => {
  if (ulr === null || ulr === undefined) return 'hsl(218,12%,68%)'
  if (ulr <= 0.5) return 'hsl(83,52%,36%)'
  if (ulr <= 0.7) return 'hsl(43,96%,46%)'
  if (ulr <= 0.9) return 'hsl(30,88%,56%)'
  return 'hsl(358,66%,54%)'
}

export default function TopBrokers() {
  const { filters } = useData()
  const location = useLocation()
  const [sortBy, setSortBy] = useState<'total_written_premium' | 'total_resultat' | 'avg_ulr'>('total_written_premium')
  const [limit, setLimit] = useState(20)

  const params = useMemo(() => ({
    ...getScopedParams(location.pathname, filters),
    sort_by: sortBy,
    limit
  }), [filters, sortBy, limit, location.pathname])

  const { data: feData, loading } = useFetch<any[]>(API_ROUTES.KPIS.TOP_BROKERS, params)

  const data = useMemo(() => {
    if (!feData) return []
    return feData.filter((d: any) => d.broker && d.broker !== 'nan')
  }, [feData])

  const handleSortChange = (newSort: 'total_written_premium' | 'total_resultat' | 'avg_ulr') => {
    setSortBy(newSort)
  }

  // Pre-calculate max for bar charts width in table
  const maxPremium = useMemo(() => Math.max(...data.map(d => Number(d.total_written_premium) || 0), 1), [data])

  return (
    <div className="space-y-4 animate-fade-in p-2 pb-12">
      <ActiveFiltersBar />
      <PageFilterPanel />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 p-4 rounded-xl border border-[var(--color-gray-100)] backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[hsla(43,96%,56%,0.15)]">
            <Trophy size={20} className="text-[hsl(43,96%,46%)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-navy)] line-clamp-1">Classement Courtiers</h1>
            <p className="text-sm text-[var(--color-gray-500)] mt-0.5">
              {filters.cedante?.length > 0
                ? <> Pour la cédante : <span className="font-bold text-[var(--color-navy)]">{filters.cedante.join(', ')}</span></>
                : 'Tous marchés confondus'}
            </p>
          </div>
        </div>

        <div className="flex bg-[var(--color-off-white)] p-1 rounded-lg border border-[var(--color-gray-200)]">
          <button 
            onClick={() => handleSortChange('total_written_premium')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${sortBy === 'total_written_premium' ? 'bg-white shadow-sm text-[var(--color-navy)]' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}
          >
            Par Volume
          </button>
          <button 
            onClick={() => handleSortChange('total_resultat')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${sortBy === 'total_resultat' ? 'bg-white shadow-sm text-[var(--color-navy)]' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}
          >
            Par Résultat
          </button>
          <button 
            onClick={() => handleSortChange('avg_ulr')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${sortBy === 'avg_ulr' ? 'bg-white shadow-sm text-[var(--color-navy)]' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}
          >
            Par ULR
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top 10 Chart */}
        <div className="xl:col-span-1 bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
           <h3 className="text-sm font-bold text-[var(--color-navy)] mb-4 flex items-center gap-2">
             <TrendingUp size={16} /> Top {Math.min(10, data.length)} Courtiers ({sortBy === 'avg_ulr' ? 'ULR' : sortBy === 'total_resultat' ? 'Résultat' : 'Volume'})
           </h3>
           <div className="h-[400px]">
             {loading && data.length === 0 ? (
                <div className="w-full h-full animate-pulse bg-[var(--color-off-white)] rounded-lg"></div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-gray-100)" />
                    <XAxis type="number" tickFormatter={(val) => formatCompact(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                    <YAxis type="category" dataKey="broker" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-gray-500)', width: 80 }} width={80} />
                    <Tooltip 
                       content={({ active, payload }: any) => {
                         if (active && payload && payload.length) {
                            const d = payload[0].payload
                            return (
                              <div className="bg-white/95 p-3 rounded-lg shadow-xl border border-[var(--color-gray-100)] text-xs min-w-[150px]">
                                <p className="font-bold mb-2 text-[var(--color-navy)] border-b pb-1">{d.broker}</p>
                                <div className="flex justify-between gap-4">
                                  <span className="opacity-70">Volume:</span>
                                  <span className="font-mono font-bold">{formatCompact(d.total_written_premium)}</span>
                                </div>
                                <div className="flex justify-between gap-4 mt-1">
                                  <span className="opacity-70">Résultat:</span>
                                  <span className="font-mono font-bold" style={{ color: d.total_resultat >= 0 ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)' }}>{formatCompact(d.total_resultat)}</span>
                                </div>
                                <div className="flex justify-between gap-4 mt-1">
                                  <span className="opacity-70">ULR:</span>
                                  <span className="font-mono font-bold" style={{ color: ulrColor(d.avg_ulr) }}>{formatPercent(d.avg_ulr)}</span>
                                </div>
                              </div>
                            )
                         }
                         return null
                       }}
                    />
                    <Bar dataKey={sortBy} radius={[0, 4, 4, 0]}>
                      {data.slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={sortBy === 'avg_ulr' ? ulrColor(entry.avg_ulr) : sortBy === 'total_resultat' ? (entry.total_resultat >= 0 ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)') : 'hsl(209,28%,24%)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             )}
           </div>
        </div>

        {/* Detailed Table */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] overflow-hidden">
           <div className="p-4 border-b border-[var(--color-gray-100)] flex items-center justify-between bg-[var(--color-off-white)]">
              <h3 className="text-sm font-bold text-[var(--color-navy)] flex items-center gap-2">
                <BarChart2 size={16} /> Détails des performances ({data.length} courtiers)
              </h3>
              <select 
                title="Top limit selection"
                value={limit} 
                onChange={(e) => setLimit(Number(e.target.value))}
                className="text-xs bg-white border border-[var(--color-gray-200)] rounded px-2 py-1 outline-none text-[var(--color-navy)] font-bold"
              >
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
              </select>
           </div>
           
           <div className="overflow-x-auto relative min-h-[300px]">
              {loading && data.length > 0 && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-10">
                  <div className="w-8 h-8 border-2 border-[var(--color-navy)] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-[var(--color-off-white)]">
                       <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase w-12 text-center">#</th>
                       <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase">Courtier</th>
                       <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right w-32">Volume (Prime)</th>
                       <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right w-32">Résultat Net</th>
                       <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right w-24">ULR</th>
                       <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right w-24">Affaires</th>
                    </tr>
                 </thead>
                 <tbody>
                    {data.length === 0 && !loading && (
                      <tr>
                        <td colSpan={6} className="p-8">
                          <EmptyState 
                             title="Aucun courtier" 
                             message="Aucun courtier trouvé sur cette sélection de filtres." 
                          />
                        </td>
                      </tr>
                    )}
                    {data.map((d, i) => (
                      <tr key={i} className="border-b border-[var(--color-gray-100)] last:border-0 hover:bg-[hsla(0,0%,0%,0.02)] transition-colors group">
                        <td className="py-3 px-4 text-[11px] font-bold text-[var(--color-gray-400)] text-center">{i + 1}</td>
                        <td className="py-3 px-4 text-sm font-bold text-[var(--color-navy)]">{d.broker}</td>
                        <td className="py-3 px-4">
                           <div className="flex flex-col items-end gap-1">
                             <span className="text-sm font-mono font-bold text-[var(--color-navy)]">{formatCompact(d.total_written_premium)}</span>
                             {/* Mini bar for proportion */}
                             <div className="w-full h-1 bg-[var(--color-off-white)] rounded-full overflow-hidden flex justify-end">
                               <div className="h-full bg-[var(--color-navy)] transition-all duration-500" style={{ width: `${Math.max(0, (d.total_written_premium / maxPremium) * 100)}%` }} />
                             </div>
                           </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-mono font-bold text-right" style={{ color: d.total_resultat >= 0 ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)' }}>
                          {formatCompact(d.total_resultat)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {d.avg_ulr !== null && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold text-white shadow-sm" style={{ backgroundColor: ulrColor(d.avg_ulr) }}>
                              {formatPercent(d.avg_ulr)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm font-mono text-[var(--color-gray-500)] font-bold text-right">{d.contract_count}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  )
}
