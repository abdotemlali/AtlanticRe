import React from 'react';
import { useState, useEffect, useRef } from "react"
import { useLocation } from 'react-router-dom'
import Select from 'react-select'
import api from '../utils/api'
import { useData } from '../context/DataContext'
import { formatCompact, formatPercent } from '../utils/formatters'
import { getScopedParams } from '../utils/pageFilterScopes'
import ActiveFiltersBar from '../components/ActiveFiltersBar'
import PageFilterPanel from '../components/PageFilterPanel'
import RadarChartComponent from '../components/Charts/RadarChartComponent'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { GitCompare } from 'lucide-react'

interface MarketOption { value: string; label: string; pays: string; branche: string }
interface MarketKPIs {
  pays: string; branche: string; written_premium: number; resultat: number
  avg_ulr: number; sum_insured: number; contract_count: number
  avg_commission: number; by_year: any[]; radar: Record<string, number>
}

import { FixedSizeList } from 'react-window'

const OPTION_HEIGHT = 35

const VirtualMenuList = (props: any) => {
  const { options, children, maxHeight, getValue } = props
  const [value] = getValue()
  const items = React.Children.toArray(children)
  const initialOffset = options.indexOf(value) * OPTION_HEIGHT
  const listHeight = Math.min(maxHeight, items.length * OPTION_HEIGHT)

  return (
    <FixedSizeList
      height={listHeight}
      itemCount={items.length}
      itemSize={OPTION_HEIGHT}
      initialScrollOffset={initialOffset > 0 ? initialOffset : 0}
      width="100%"
    >
      {({ index, style }) => <div style={style}>{items[index]}</div>}
    </FixedSizeList>
  )
}

const DeltaBadge = ({ valA, valB, inverse = false }: { valA: number, valB: number, inverse?: boolean }) => {
  if (!valA || !valB) return <div className="w-16 flex justify-center">-</div>
  const diff = ((valA - valB) / Math.abs(valB)) * 100
  if (Math.abs(diff) < 0.1) return <div className="w-16 flex justify-center text-[var(--color-gray-500)] text-xs font-bold">=</div>
  
  // Flèche "haut" = vert, "bas" = rouge (pour que ça saute aux yeux visuellement)
  const isPositiveDelta = diff > 0
  const color = isPositiveDelta ? 'hsl(83,52%,36%)' : 'var(--color-red)'
  
  return (
    <div className="w-16 flex items-center justify-center gap-1 font-bold text-[10px]" style={{ color }}>
      {isPositiveDelta ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}%
    </div>
  )
}

const KPICol = ({ kpis, headerBg, label }: { kpis: MarketKPIs; headerBg: string; label: string }) => (
  <div className="flex-1 bg-white" style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(45,62,80,0.08)', border: '1px solid var(--color-gray-100)', overflow: 'hidden' }}>
    <div className="p-4" style={{ background: headerBg }}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)' }}>
          {label}
        </span>
      </div>
      <div className="mt-4 text-white">
        <h2 className="text-xl font-bold">{kpis.pays}</h2>
        <p className="text-sm font-medium opacity-90">{kpis.branche}</p>
      </div>
    </div>
  </div>
)

const KPIRow = ({ label, valA, valB, formatFn, inverse = false }: { label: string, valA: number, valB: number, formatFn: (v: number) => string, inverse?: boolean }) => (
  <div className="flex justify-between items-center py-2.5 border-b last:border-0 hover:bg-[var(--color-off-white)] px-4 transition-colors" style={{ borderColor: 'var(--color-gray-100)' }}>
    <div className="flex-1 font-bold text-[var(--color-navy)] text-sm">{formatFn(valA)}</div>
    <div className="w-1/3 flex justify-center items-center flex-col gap-1">
      <span className="font-semibold text-[var(--color-gray-500)] text-xs uppercase tracking-wider">{label}</span>
      <DeltaBadge valA={valA} valB={valB} inverse={inverse} />
    </div>
    <div className="flex-1 font-bold text-[var(--color-navy)] text-sm text-right">{formatFn(valB)}</div>
  </div>
)

export default function Comparison() {
  const { filterOptions, filters } = useData()
  const location = useLocation()
  const [mode, setMode] = useState<'market' | 'country' | 'cedante'>(() => {
    if (sessionStorage.getItem('compare_cedante_a')) return 'cedante'
    if (sessionStorage.getItem('compare_country_a')) return 'country'
    return 'market'
  })
  const [marketOptions, setMarketOptions] = useState<MarketOption[]>([])
  const [marketA, setMarketA] = useState<MarketOption | null>(null)
  const [marketB, setMarketB] = useState<MarketOption | null>(null)
  const [result, setResult] = useState<{ market_a: MarketKPIs; market_b: MarketKPIs } | null>(null)
  const [loading, setLoading] = useState(false)

  // Refs to hold pending sessionStorage data across re-renders
  const pendingA = useRef<string | null>(sessionStorage.getItem('compare_market_a'))
  const pendingB = useRef<string | null>(sessionStorage.getItem('compare_market_b'))
  const pendingCedanteA = useRef<string | null>(sessionStorage.getItem('compare_cedante_a'))
  const pendingCountryA = useRef<string | null>(sessionStorage.getItem('compare_country_a'))

  // Clear sessionStorage immediately so it doesn't persist on manual navigation
  // Refs are already initialized with the values from sessionStorage
  useEffect(() => {
    sessionStorage.removeItem('compare_market_a')
    sessionStorage.removeItem('compare_market_b')
    sessionStorage.removeItem('compare_cedante_a')
    if (sessionStorage.getItem('compare_country_a')) {
      pendingCountryA.current = sessionStorage.getItem('compare_country_a')
      sessionStorage.removeItem('compare_country_a')
    }
  }, [])

  // Build market options
  useEffect(() => {
    if (mode === 'market') {
      api.get('/comparison/markets', { params: getScopedParams(location.pathname, filters) }).then(res => {
        if (res.data) {
          setMarketOptions(res.data.map((m: any) => ({
            value: `${m.pays}||${m.branche}`,
            label: `${m.pays} — ${m.branche}`,
            pays: m.pays,
            branche: m.branche,
          })))
        }
      }).catch(console.error)
    } else if (mode === 'country') {
      api.get('/kpis/by-country', { params: getScopedParams(location.pathname, filters) }).then(res => {
        if (res.data) {
          setMarketOptions(res.data.map((c: any) => ({
            value: c.pays,
            label: c.pays,
            pays: c.pays,
            branche: 'Toutes branches',
          })))
        }
      }).catch(console.error)
    } else if (mode === 'cedante') {
      api.get('/kpis/by-cedante', { params: { ...getScopedParams(location.pathname, filters), top: 1000 } }).then(res => {
        if (res.data) {
          setMarketOptions(res.data.map((c: any) => ({
            value: c.cedante,
            label: c.cedante,
            pays: c.cedante,
            branche: '',
          })))
        }
      }).catch(console.error)
    }
  }, [filters, mode, location.pathname])

  // Process pending pre-fills once market options are available
  useEffect(() => {
    if (marketOptions.length === 0) return

    if (pendingA.current) {
      try {
        const { pays, branche } = JSON.parse(pendingA.current)
        const match = marketOptions.find(o => String(o.pays).trim() === String(pays).trim() && (mode === 'country' ? true : String(o.branche).trim() === String(branche).trim()))
        if (match) {
          setMarketA(match)
          pendingA.current = null
        }
      } catch (e) { console.error('Error parsing compare_market_a', e); pendingA.current = null }
    }

    if (pendingB.current) {
      try {
        const { pays, branche } = JSON.parse(pendingB.current)
        const match = marketOptions.find(o => String(o.pays).trim() === String(pays).trim() && (mode === 'country' ? true : String(o.branche).trim() === String(branche).trim()))
        if (match) {
          setMarketB(match)
          pendingB.current = null
        }
      } catch (e) { console.error('Error parsing compare_market_b', e); pendingB.current = null }
    }

    if (pendingCedanteA.current) {
      try {
        const { cedante } = JSON.parse(pendingCedanteA.current)
        const match = marketOptions.find(o => o.pays === cedante)
        if (match) {
          setMarketA(match)
          pendingCedanteA.current = null
        }
      } catch (e) { console.error('Error parsing compare_cedante_a', e); pendingCedanteA.current = null }
    }

    if (pendingCountryA.current) {
      try {
        const { pays } = JSON.parse(pendingCountryA.current)
        const match = marketOptions.find(o => o.pays === pays)
        if (match) {
          setMarketA(match)
          pendingCountryA.current = null
        }
      } catch (e) { pendingCountryA.current = null }
    }
  }, [marketOptions, mode])

  const compare = async () => {
    if (!marketA || !marketB) return
    setLoading(true)
    try {
      if (mode === 'market') {
        const params = {
          market_a_pays: marketA.pays,
          market_a_branche: marketA.branche,
          market_b_pays: marketB.pays,
          market_b_branche: marketB.branche,
          ...getScopedParams(location.pathname, filters),
        }
        const res = await api.get('/comparison', { params })
        setResult(res.data)
      } else if (mode === 'country') {
        const params = {
          market_a_pays: marketA.pays,
          market_b_pays: marketB.pays,
          ...getScopedParams(location.pathname, filters),
        }
        const res = await api.get('/comparison/by-country', { params })
        setResult(res.data)
      } else if (mode === 'cedante') {
        const params = {
          cedante_a: marketA.pays,
          cedante_b: marketB.pays,
          ...getScopedParams(location.pathname, filters),
        }
        const res = await api.get('/comparison/by-cedante', { params })
        const mapCedante = (c: any) => ({
          pays: c.cedante,
          branche: c.pays_cedante || '',
          written_premium: c.written_premium ?? 0,
          resultat: c.resultat ?? 0,
          avg_ulr: c.avg_ulr ?? 0,
          sum_insured: c.sum_insured ?? 0,
          contract_count: c.contract_count ?? 0,
          avg_commission: c.avg_commission ?? 0,
          by_year: (c.by_year || []).map((y: any) => ({
            year: y.year,
            total_written_premium: y.total_written_premium ?? y.written_premium ?? 0,
            avg_ulr: y.avg_ulr ?? 0,
            total_resultat: y.total_resultat ?? y.resultat ?? 0,
          })),
          radar: c.radar ?? {},
        })
        setResult({
          market_a: mapCedante(res.data.cedante_a),
          market_b: mapCedante(res.data.cedante_b),
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const optionsA = React.useMemo(() => marketOptions.filter(o => o.value !== marketB?.value), [marketOptions, marketB?.value])
  const optionsB = React.useMemo(() => marketOptions.filter(o => o.value !== marketA?.value), [marketOptions, marketA?.value])

  const radarData = React.useMemo(() => 
    result ? Object.keys(result.market_a.radar).map(metric => ({
      metric,
      marketA: result.market_a.radar[metric],
      marketB: result.market_b.radar[metric],
    })) : []
  , [result])

  const evolutionData = React.useMemo(() => {
    if (!result) return []
    const yearMap: Record<number, any> = {}
    result.market_a.by_year.forEach(d => {
      yearMap[d.year] = { year: d.year, premA: d.total_written_premium, lrA: d.avg_ulr }
    })
    result.market_b.by_year.forEach(d => {
      if (!yearMap[d.year]) yearMap[d.year] = { year: d.year }
      yearMap[d.year].premB = d.total_written_premium
      yearMap[d.year].lrB = d.avg_ulr
    })
    return Object.values(yearMap).sort((a, b) => a.year - b.year)
  }, [result])

  const resultView = React.useMemo(() => {
    if (!result || loading) return null
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header Blocks A and B */}
        <div className="flex gap-6 relative">
          <KPICol kpis={result.market_a} headerBg="linear-gradient(135deg, #1E2D3D, var(--color-navy))" label="Marché A" />
          <KPICol kpis={result.market_b} headerBg="linear-gradient(135deg, #4E6820, hsl(83,52%,36%))" label="Marché B" />
        </div>

        {/* Metric Rows */}
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] overflow-hidden">
          <KPIRow label="Prime écrite" valA={result.market_a.written_premium} valB={result.market_b.written_premium} formatFn={v => formatCompact(v)} />
          <KPIRow label="Résultat net" valA={result.market_a.resultat} valB={result.market_b.resultat} formatFn={v => formatCompact(v)} />
          <KPIRow label="Loss Ratio" valA={result.market_a.avg_ulr} valB={result.market_b.avg_ulr} formatFn={v => formatPercent(v)} inverse={true} />
          <KPIRow label="Somme assurée" valA={result.market_a.sum_insured} valB={result.market_b.sum_insured} formatFn={v => formatCompact(v)} />
          <KPIRow label="Contrats" valA={result.market_a.contract_count} valB={result.market_b.contract_count} formatFn={v => v.toLocaleString('fr-FR')} />
          <KPIRow label="Commission moy." valA={result.market_a.avg_commission} valB={result.market_b.avg_commission} formatFn={v => formatPercent(v)} inverse={true} />
        </div>

        {/* Radar + Evolution */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-[var(--color-gray-100)] shadow-sm">
            <h3 className="text-sm font-bold text-[var(--color-navy)] mb-4">Radar de performances comparé</h3>
            <RadarChartComponent
              data={radarData}
              labelA={`${result.market_a.pays} — ${result.market_a.branche}`}
              labelB={`${result.market_b.pays} — ${result.market_b.branche}`}
            />
          </div>
          <div className="bg-white p-5 rounded-xl border border-[var(--color-gray-100)] shadow-sm">
            <h3 className="text-sm font-bold text-[var(--color-navy)] mb-4">Évolution Prime & LR</h3>
            {evolutionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={evolutionData} margin={{ right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--color-gray-500)', fontSize: 10, fontWeight: 500 }} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: 'var(--color-gray-500)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--color-gray-500)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip 
                    formatter={(v: any, name: string) => [name.includes('LR%') ? formatPercent(v) : formatCompact(v), name]} 
                    contentStyle={{ background: 'hsla(209,28%,18%,0.92)', backdropFilter: 'blur(16px)', border: '1px solid hsl(83,52%,36%)', borderRadius: 10, color: '#FFF' }}
                  />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-[var(--color-gray-500)] text-xs font-semibold">{v}</span>} />
                  
                  {/* Market A Lines */}
                  <Line connectNulls yAxisId="left" type="monotone" dataKey="premA" name={`Prime A`} stroke="var(--color-navy)" strokeWidth={2.5} dot={{ r: 4, fill: '#FFFFFF', stroke: 'var(--color-navy)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line connectNulls yAxisId="right" type="monotone" dataKey="lrA" name="LR% A" stroke="var(--color-navy)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                  
                  {/* Market B Lines */}
                  <Line connectNulls yAxisId="left" type="monotone" dataKey="premB" name={`Prime B`} stroke="hsl(83,52%,36%)" strokeWidth={2.5} dot={{ r: 4, fill: '#FFFFFF', stroke: 'hsl(83,52%,36%)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line connectNulls yAxisId="right" type="monotone" dataKey="lrB" name="LR% B" stroke="hsl(83,52%,36%)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-center py-8 font-medium text-[var(--color-gray-500)]">Données insuffisantes</p>
            )}
          </div>
        </div>
      </div>
    )
  }, [result, loading, radarData, evolutionData])

  const componentsWithVirtual = React.useMemo(() => ({ MenuList: VirtualMenuList }), [])

  const componentsA = React.useMemo(() => 
    mode === 'market' && optionsA.length > 200 ? componentsWithVirtual : {}
  , [mode, optionsA.length, componentsWithVirtual])

  const componentsB = React.useMemo(() => 
    mode === 'market' && optionsB.length > 200 ? componentsWithVirtual : {}
  , [mode, optionsB.length, componentsWithVirtual])

  return (
    <div className="p-6 space-y-4 min-h-[100vh] bg-[var(--color-off-white)]">
      <ActiveFiltersBar />
      <PageFilterPanel />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-navy)] mb-1">Comparaison de portefeuilles</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-gray-500)]">
            {mode === 'cedante' 
              ? 'Analyse côte à côte de deux cédantes' 
              : mode === 'market' 
              ? 'Analyse côte à côte de deux marchés (Pays + Branche)' 
              : 'Analyse côte à côte de la performance globale de deux pays'}
          </p>
        </div>
        <div className="inline-flex bg-white rounded-lg p-1 border shadow-sm flex-wrap gap-1" style={{ borderColor: 'var(--color-gray-200)' }}>
          <button 
            onClick={() => { setMode('market'); setMarketA(null); setMarketB(null); setResult(null); }}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'market' ? 'bg-[var(--color-navy)] text-white shadow-md' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}>
            Par marché (Pays + Branche)
          </button>
          <button 
            onClick={() => { setMode('country'); setMarketA(null); setMarketB(null); setResult(null); }}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'country' ? 'bg-[var(--color-navy)] text-white shadow-md' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}>
            Par pays global
          </button>
          <button 
            onClick={() => { setMode('cedante'); setMarketA(null); setMarketB(null); setResult(null); }}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'cedante' ? 'bg-[var(--color-navy)] text-white shadow-md' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}>
            Par cédante
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="bg-white p-5 rounded-xl border border-[var(--color-gray-100)] shadow-sm">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-64">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-navy)' }}>{mode === 'cedante' ? 'Cédante A (Référence)' : 'Marché A (Référence)'}</p>
            <Select
              classNamePrefix="rs"
              components={componentsA}
              options={optionsA}
              value={marketA}
              onChange={v => {
                setMarketA(v as MarketOption | null)
                setMarketB(null)
              }}
              placeholder="Tapez pour rechercher..."
              noOptionsMessage={() => 'Aucun résultat'}
              isClearable
              isSearchable
              closeMenuOnSelect
              menuPortalTarget={document.body}
              menuPosition="fixed"
              menuShouldScrollIntoView={false}
            />
          </div>
          <div className="flex-shrink-0 flex items-center justify-center pb-2 px-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-off-white)] flex items-center justify-center border border-[var(--color-gray-200)]">
              <span className="text-[10px] font-bold text-[var(--color-gray-500)]">VS</span>
            </div>
          </div>
          <div className="flex-1 min-w-64">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'hsl(83,52%,36%)' }}>{mode === 'cedante' ? 'Cédante B (Comparaison)' : 'Marché B (Comparaison)'}</p>
            <Select
              classNamePrefix="rs"
              components={componentsB}
              options={optionsB}
              value={marketB}
              onChange={v => setMarketB(v as MarketOption | null)}
              placeholder="Tapez pour rechercher..."
              noOptionsMessage={() => 'Aucun résultat'}
              isClearable
              isSearchable
              closeMenuOnSelect
              menuPortalTarget={document.body}
              menuPosition="fixed"
              menuShouldScrollIntoView={false}
            />
          </div>
          <div className="flex-none">
            <button onClick={compare} disabled={!marketA || !marketB || loading} className="btn-primary w-full py-2.5 px-6">
              {loading ? 'Analyse...' : '⚡ Comparer'}
            </button>
          </div>
        </div>
      </div>

      {!result && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--color-gray-500)]">
          <GitCompare size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Sélectionnez 2 marchés et cliquez sur Comparer pour analyser les données de manière visuelle</p>
        </div>
      )}

      {loading && <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />}

      {resultView}
    </div>
  )
}
