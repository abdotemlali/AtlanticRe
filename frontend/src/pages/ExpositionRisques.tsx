import React from 'react';
import { useEffect, useState, useMemo } from "react"
import { useLocation } from 'react-router-dom'
import { ShieldAlert, ArrowUpDown, ChevronUp, ChevronDown, Download } from 'lucide-react'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { useData } from '../context/DataContext'
import { formatCompact, formatPercent, formatMAD } from '../utils/formatters'
import { getScopedParams } from '../utils/pageFilterScopes'
import ActiveFiltersBar from '../components/ActiveFiltersBar'
import PageFilterPanel from '../components/PageFilterPanel'
import { useFetch } from '../hooks/useFetch'
import WorldMap from '../components/Charts/WorldMap'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell} from 'recharts'

const SortIcon = ({ field, currentField, direction }: { field: keyof TopRisk; currentField: keyof TopRisk; direction: 'asc' | 'desc' }) => {
  if (currentField !== field) return <ArrowUpDown size={14} className="opacity-30" />
  return direction === 'asc' ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />
}
function useCountUp(endValue: number | undefined, duration = 1200) {
  const [count, setCount] = React.useState(0)
  React.useEffect(() => {
    if (endValue === undefined) return
    let startTimestamp: number | null = null
    let animationFrameId: number
    const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3)
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      setCount(easeOutCubic(progress) * endValue)
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step)
      } else {
        setCount(endValue)
      }
    }
    animationFrameId = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(animationFrameId)
  }, [endValue, duration])
  return count
}



interface CountryExposition {
  pays: string
  exposition: number
  sum_insured_100: number
  avg_share_signed: number
  contract_count: number
  is_selected: boolean
}

interface BranchExposition {
  branche: string
  exposition: number
  sum_insured_100: number
  avg_share_signed: number
  contract_count: number
  is_selected: boolean
}

interface TopRisk {
  policy_id: string
  cedante: string
  branche: string
  pays_risque: string
  sum_insured_100: number
  share_signed: number
  exposition: number
  written_premium: number
  ulr: number
}

const KPICard = ({ title, value, isPercentage = false }: { title: string, value: number, isPercentage?: boolean }) => {
  const animatedValue = useCountUp(value, 2000)
  return (
    <div className="glass-card p-6 flex-1 hover-lift">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-[var(--color-navy)]/10 p-2 rounded-lg">
          <ShieldAlert size={20} className="text-[var(--color-navy)]" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-gray-500)]">{title}</h3>
      </div>
      <p className="text-3xl font-extrabold text-[var(--color-navy)] font-outfit tracking-tight">
        {isPercentage 
          ? `${Number(animatedValue).toFixed(1)}%` 
          : formatCompact(animatedValue)}
      </p>
    </div>
  )
}

export default function ExpositionRisques() {
  const { filters } = useData()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [loadingRisks, setLoadingRisks] = useState(true)
  
  const [byCountry, setByCountry] = useState<CountryExposition[]>([])
  const [byBranch, setByBranch] = useState<BranchExposition[]>([])
  const [topRisks, setTopRisks] = useState<TopRisk[]>([])
  
  const [sortField, setSortField] = useState<keyof TopRisk>('exposition')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const params = useMemo(() => getScopedParams(location.pathname, filters), [filters, location.pathname])
  const topParams = useMemo(() => ({ ...params, top: 20 }), [params])

  const countryParams = useMemo(() => {
    const p: Record<string, string> = { ...params }
    if (filters.pays_risque?.length > 0) p.selected_pays = filters.pays_risque.join(',')
    return p
  }, [params, filters.pays_risque])

  const branchParams = useMemo(() => {
    const p: Record<string, string> = { ...params }
    if (filters.branche?.length > 0) p.selected_branche = filters.branche.join(',')
    return p
  }, [params, filters.branche])

  const { data: countryData, loading: l1 } = useFetch<any[]>(API_ROUTES.EXPOSITION.BY_COUNTRY, countryParams)
  const { data: branchFetch, loading: l2 } = useFetch<any[]>(API_ROUTES.EXPOSITION.BY_BRANCH, branchParams)
  const { data: risksData, loading: l3 } = useFetch<any[]>(API_ROUTES.EXPOSITION.TOP_RISKS, topParams)

  useEffect(() => {
    if (countryData) setByCountry(countryData)
    if (branchFetch) setByBranch(branchFetch)
    if (risksData) setTopRisks(risksData)
  }, [countryData, branchFetch, risksData])

  useEffect(() => {
    setLoading(l1 || l2)
  }, [l1, l2])

  useEffect(() => {
    setLoadingRisks(l3)
  }, [l3])

  const kpis = useMemo(() => {
    let exp = 0, sumInt = 0, shareSum = 0
    byCountry.forEach(c => {
      exp += c.exposition
      sumInt += c.sum_insured_100
      shareSum += c.avg_share_signed * c.contract_count
    })
    const totalCount = byCountry.reduce((a, b) => a + b.contract_count, 0)
    return {
      exposition: exp,
      sum_insured_100: sumInt,
      avg_share_signed: totalCount > 0 ? shareSum / totalCount : 0
    }
  }, [byCountry])

  // Chart display: selected items first (even if outside top 10), then top (10-n) non-selected
  const chartCountries = useMemo(() => {
    const selected = byCountry.filter(c => c.is_selected)
    const nonSelected = byCountry.filter(c => !c.is_selected)
    return [...selected, ...nonSelected.slice(0, Math.max(0, 10 - selected.length))]
  }, [byCountry])

  const chartBranches = useMemo(() => {
    const selected = byBranch.filter(b => b.is_selected)
    const nonSelected = byBranch.filter(b => !b.is_selected)
    return [...selected, ...nonSelected.slice(0, Math.max(0, 10 - selected.length))]
  }, [byBranch])

  const sortedRisks = useMemo(() => {
    return [...topRisks].sort((a, b) => {
      if (a[sortField] < b[sortField]) return sortDirection === 'asc' ? -1 : 1
      if (a[sortField] > b[sortField]) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [topRisks, sortField, sortDirection])

  const handleSort = (field: keyof TopRisk) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto animate-fade-in">
      <ActiveFiltersBar />
      <PageFilterPanel />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-1 flex items-center gap-2">
            <ShieldAlert size={28} className="text-red-500" />
            Exposition & Risques
          </h1>
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-gray-500)]">
            Analyse de l'exposition maximale et des concentrations de risque
          </p>
        </div>
      </div>

      {/* Bandeau contexte — visibilité accrue quand un filtre cedante/courtier est actif */}
      {(filters.cedante?.length > 0 || filters.courtier?.length > 0) && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-navy)]/20 bg-[var(--color-navy)]/6 backdrop-blur-md text-sm font-semibold text-[var(--color-navy)] shadow-sm">
          <ShieldAlert size={16} className="shrink-0 opacity-70" />
          <span>
            Exposition affichée pour
            {filters.cedante?.length > 0 && (
              <> : <span className="font-bold">{filters.cedante.join(', ')}</span>
              </>
            )}
            {filters.courtier?.length > 0 && (
              <> — Courtier : <span className="font-bold">{filters.courtier.join(', ')}</span>
              </>
            )}
          </span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <KPICard title="Exposition Totale" value={kpis.exposition} />
        <KPICard title="Somme assurée 100%" value={kpis.sum_insured_100} />
        <KPICard title="Part souscrite moy." value={kpis.avg_share_signed} isPercentage />
      </div>

      <div className="glass-card p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-[var(--color-navy)]">Exposition Géographique</h2>
            <p className="text-xs text-gray-400">Répartition mondiale de l'exposition maximale de réassurance</p>
          </div>
        </div>
        <WorldMap colorBy="exposition" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Countries */}
        <div className="glass-card p-6 border border-gray-100 h-96">
          <h3 className="text-sm font-bold text-[var(--color-navy)] mb-4">Top 10 Pays par Exposition</h3>
          {loading ? (
            <div className="skeleton w-full h-full rounded-md" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartCountries} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradPays" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(209,32%,17%)" />
                    <stop offset="100%" stopColor="hsl(209,24%,38%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-gray-100)" />
                <XAxis type="number" tickFormatter={formatCompact} tick={{ fill: 'var(--color-gray-500)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="pays" type="category" width={80} tick={{ fill: 'var(--color-navy)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'var(--color-gray-100)', opacity: 0.4 }}
                  contentStyle={{
                    background: 'hsla(209,28%,18%,0.92)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid hsla(0,0%,100%,0.12)',
                    borderRadius: 10,
                    color: '#FFF'
                  }}
                  formatter={(value: any) => [formatCompact(value), 'Exposition AR']}
                />
                <Bar dataKey="exposition" fill="url(#gradPays)" radius={[0, 4, 4, 0]} barSize={16}>
                  {chartCountries.map((d, i) => {
                    const hasSelection = chartCountries.some(c => c.is_selected)
                    if (!hasSelection) return <Cell key={i} fill="url(#gradPays)" />
                    return (
                      <Cell
                        key={i}
                        fill={d.is_selected ? 'hsl(38,95%,54%)' : 'url(#gradPays)'}
                        fillOpacity={d.is_selected ? 1 : 0.3}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Exposition by Branch */}
        <div className="glass-card p-6 border border-gray-100 h-96">
          <h3 className="text-sm font-bold text-[var(--color-navy)] mb-4">Exposition par Branche</h3>
          {loading ? (
            <div className="skeleton w-full h-full rounded-md" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartBranches} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradBranche" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(83,54%,27%)" />
                    <stop offset="100%" stopColor="hsl(83,50%,45%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-gray-100)" />
                <XAxis type="number" tickFormatter={formatCompact} tick={{ fill: 'var(--color-gray-500)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="branche" type="category" width={120} tick={{ fill: 'var(--color-navy)', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'var(--color-gray-100)', opacity: 0.4 }}
                  contentStyle={{
                    background: 'hsla(209,28%,18%,0.92)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid hsla(0,0%,100%,0.12)',
                    borderRadius: 10,
                    color: '#FFF'
                  }}
                  formatter={(value: any) => [formatCompact(value), 'Exposition AR']}
                />
                <Bar dataKey="exposition" fill="url(#gradBranche)" radius={[0, 4, 4, 0]} barSize={16}>
                  {chartBranches.map((d, i) => {
                    const hasSelection = chartBranches.some(b => b.is_selected)
                    if (!hasSelection) return <Cell key={i} fill="url(#gradBranche)" />
                    return (
                      <Cell
                        key={i}
                        fill={d.is_selected ? 'hsl(38,95%,54%)' : 'url(#gradBranche)'}
                        fillOpacity={d.is_selected ? 1 : 0.3}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="glass-card overflow-hidden border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-navy)] mb-1">Top Risques Individuels</h3>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Les 20 contrats avec la plus forte exposition</p>
          </div>
          <button
            onClick={() => {
              import('xlsx').then(XLSX => {
                const rows = sortedRisks.map((risk: any) => ({
                  'N° Police': risk.policy_id,
                  Cédante: risk.cedante,
                  Branche: risk.branche,
                  'Pays Risque': risk.pays_risque,
                  'Somme Assurée 100% (MAD)': risk.sum_insured_100 ?? 0,
                  'Part (%)': risk.share_signed ?? 0,
                  'Exposition AR (MAD)': risk.exposition ?? 0,
                  'Prime Écrite (MAD)': risk.written_premium ?? 0,
                  'ULR (%)': risk.ulr !== null && risk.ulr !== undefined ? Number(risk.ulr) : '',
                }))
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Top Risques')
                const date = new Date().toISOString().slice(0, 10)
                XLSX.writeFile(wb, `top_risques_individuels_${date}.xlsx`)
              })
            }}
            disabled={sortedRisks.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-[var(--color-navy)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Download size={13} />
            Exporter Excel
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-off-white)]/80 text-[10px] uppercase tracking-wider text-[var(--color-gray-500)] border-y border-[var(--color-gray-100)]">
                <th className="p-3 font-semibold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('policy_id')}>
                  <div className="flex items-center gap-1">N° Police <SortIcon field="policy_id" currentField={sortField} direction={sortDirection} /></div>
                </th>
                <th className="p-3 font-semibold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('cedante')}>
                  <div className="flex items-center gap-1">Cédante <SortIcon field="cedante" currentField={sortField} direction={sortDirection} /></div>
                </th>
                <th className="p-3 font-semibold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('branche')}>
                  <div className="flex items-center gap-1">Branche <SortIcon field="branche" currentField={sortField} direction={sortDirection} /></div>
                </th>
                <th className="p-3 font-semibold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('pays_risque')}>
                  <div className="flex items-center gap-1">Pays Risque <SortIcon field="pays_risque" currentField={sortField} direction={sortDirection} /></div>
                </th>
                <th className="p-3 font-semibold cursor-pointer hover:bg-gray-100 text-right transition-colors" onClick={() => handleSort('sum_insured_100')}>
                  <div className="flex items-center justify-end gap-1">Somme Assurée (100%) <SortIcon field="sum_insured_100" currentField={sortField} direction={sortDirection} /></div>
                </th>
                <th className="p-3 font-semibold cursor-pointer hover:bg-gray-100 text-center transition-colors" onClick={() => handleSort('share_signed')}>
                  <div className="flex items-center justify-center gap-1">Part (%) <SortIcon field="share_signed" currentField={sortField} direction={sortDirection} /></div>
                </th>
                <th className="p-3 font-semibold cursor-pointer hover:bg-gray-100 text-right transition-colors" onClick={() => handleSort('exposition')}>
                  <div className="flex items-center justify-end gap-1">Exposition AR <SortIcon field="exposition" currentField={sortField} direction={sortDirection} /></div>
                </th>
                <th className="p-3 font-semibold cursor-pointer hover:bg-gray-100 text-right transition-colors" onClick={() => handleSort('written_premium')}>
                  <div className="flex items-center justify-end gap-1">Prime Écrite <SortIcon field="written_premium" currentField={sortField} direction={sortDirection} /></div>
                </th>
                <th className="p-3 font-semibold cursor-pointer hover:bg-gray-100 text-center transition-colors" onClick={() => handleSort('ulr')}>
                  <div className="flex items-center justify-center gap-1">ULR <SortIcon field="ulr" currentField={sortField} direction={sortDirection} /></div>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loadingRisks ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td colSpan={9} className="p-3"><div className="skeleton h-8 w-full rounded" /></td>
                  </tr>
                ))
              ) : sortedRisks.map((risk, i) => {
                const isHighExposure = risk.exposition > 5000000; // Example threshold
                return (
                  <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[var(--color-off-white)]/30'}`}>
                    <td className="p-3 font-medium text-[var(--color-navy)]">{risk.policy_id}</td>
                    <td className="p-3 text-gray-600">{risk.cedante}</td>
                    <td className="p-3 text-gray-600">{risk.branche}</td>
                    <td className="p-3 text-gray-600">{risk.pays_risque}</td>
                    <td className="p-3 text-right font-medium">{formatMAD(risk.sum_insured_100)}</td>
                    <td className="p-3 text-center">{risk.share_signed}%</td>
                    <td className={`p-3 text-right font-bold ${isHighExposure ? 'text-red-500' : 'text-[var(--color-navy)]'}`}>
                      {formatMAD(risk.exposition)}
                    </td>
                    <td className="p-3 text-right font-medium">{formatMAD(risk.written_premium)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        risk.ulr > 100 ? 'bg-red-100 text-red-600' : 
                        risk.ulr > 60 ? 'bg-orange-100 text-orange-600' : 
                        'bg-green-100 text-green-600'
                      }`}>
                        {formatPercent(risk.ulr)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {sortedRisks.length === 0 && !loadingRisks && (
            <div className="text-center py-8 text-gray-400 font-medium">Aucun risque trouvé</div>
          )}
        </div>
      </div>
    </div>
  )
}
