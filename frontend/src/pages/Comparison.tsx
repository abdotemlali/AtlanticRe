import React, { useState, useEffect } from 'react'
import Select from 'react-select'
import api from '../utils/api'
import { useData, filtersToParams } from '../context/DataContext'
import { formatCompact, formatPercent } from '../utils/formatters'
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

export default function Comparison() {
  const { filterOptions, filters } = useData()
  const [mode, setMode] = useState<'market' | 'country'>('market')
  const [marketOptions, setMarketOptions] = useState<MarketOption[]>([])
  const [marketA, setMarketA] = useState<MarketOption | null>(null)
  const [marketB, setMarketB] = useState<MarketOption | null>(null)
  const [result, setResult] = useState<{ market_a: MarketKPIs; market_b: MarketKPIs } | null>(null)
  const [loading, setLoading] = useState(false)

  // Build market options from filter options
  useEffect(() => {
    if (!filterOptions) return
    api.get('/kpis/by-country', { params: filtersToParams(filters) }).then(res => {
      const opts: MarketOption[] = []
      if (mode === 'market') {
        if (filterOptions.branc && res.data) {
          res.data.forEach((country: any) => {
            filterOptions.branc.forEach((branche: string) => {
              opts.push({
                value: `${country.pays}||${branche}`,
                label: `${country.pays} — ${branche}`,
                pays: country.pays,
                branche,
              })
            })
          })
        }
      } else {
        if (res.data) {
          res.data.forEach((country: any) => {
            opts.push({
              value: country.pays,
              label: country.pays,
              pays: country.pays,
              branche: 'Toutes branches',
            })
          })
        }
      }
      setMarketOptions(opts.slice(0, 500))
    }).catch(console.error)
  }, [filterOptions, filters, mode])

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
          ...filtersToParams(filters),
        }
        const res = await api.get('/comparison', { params })
        setResult(res.data)
      } else {
        const params = {
          market_a_pays: marketA.pays,
          market_b_pays: marketB.pays,
          ...filtersToParams(filters),
        }
        const res = await api.get('/comparison/by-country', { params })
        setResult(res.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const KPICol = ({ kpis, color, headerBg, badgeColor, label }: { kpis: MarketKPIs; color: string; headerBg: string; badgeColor: string; label: string }) => (
    <div className="flex-1 bg-white" style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(45,62,80,0.08)', border: '1px solid #EEF0F3', overflow: 'hidden' }}>
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
      <div className="p-5 space-y-0 text-sm">
        {[
          ['Prime écrite', formatCompact(kpis.written_premium)],
          ['Résultat net', formatCompact(kpis.resultat)],
          ['Loss Ratio', formatPercent(kpis.avg_ulr)],
          ['Somme assurée', formatCompact(kpis.sum_insured)],
          ['Contrats', kpis.contract_count.toLocaleString('fr-FR')],
          ['Commission moy.', formatPercent(kpis.avg_commission)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between py-2.5 border-b last:border-0 hover:bg-[#F5F6F8] px-2 -mx-2 rounded transition-colors" style={{ borderColor: '#EEF0F3' }}>
            <span className="font-semibold text-[#7A8A99]">{k}</span>
            <span className="font-bold text-[#2D3E50]">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const radarData = result ? Object.keys(result.market_a.radar).map(metric => ({
    metric,
    marketA: result.market_a.radar[metric],
    marketB: result.market_b.radar[metric],
  })) : []

  const evolutionData = result ? (() => {
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
  })() : []

  return (
    <div className="p-6 space-y-6 min-h-[100vh] bg-[var(--color-off-white)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#2D3E50] mb-1">Comparaison de portefeuilles</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7A8A99]">
            {mode === 'market' 
              ? 'Analyse côte à côte de deux marchés (Pays + Branche)' 
              : 'Analyse côte à côte de la performance globale de deux pays'}
          </p>
        </div>
        <div className="inline-flex bg-white rounded-lg p-1 border shadow-sm" style={{ borderColor: '#CBD2DA' }}>
          <button 
            onClick={() => { setMode('market'); setMarketA(null); setMarketB(null); setResult(null); }}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'market' ? 'bg-[#2D3E50] text-white shadow-md' : 'text-[#7A8A99] hover:text-[#2D3E50]'}`}>
            Par marché (Pays + Branche)
          </button>
          <button 
            onClick={() => { setMode('country'); setMarketA(null); setMarketB(null); setResult(null); }}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'country' ? 'bg-[#2D3E50] text-white shadow-md' : 'text-[#7A8A99] hover:text-[#2D3E50]'}`}>
            Par pays global
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="bg-white p-5 rounded-xl border border-[#EEF0F3] shadow-sm">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-64">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#2D3E50' }}>Marché A (Référence)</p>
            <Select classNamePrefix="rs" options={marketOptions} value={marketA}
              onChange={v => setMarketA(v as MarketOption | null)} placeholder="Sélectionner un marché..." isClearable />
          </div>
          <div className="flex-shrink-0 flex items-center justify-center pb-2 px-2">
            <div className="w-8 h-8 rounded-full bg-[#F5F6F8] flex items-center justify-center border border-[#CBD2DA]">
              <span className="text-[10px] font-bold text-[#7A8A99]">VS</span>
            </div>
          </div>
          <div className="flex-1 min-w-64">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#6B8C2A' }}>Marché B (Comparaison)</p>
            <Select classNamePrefix="rs" options={marketOptions.filter(o => o.value !== marketA?.value)}
              value={marketB} onChange={v => setMarketB(v as MarketOption | null)} placeholder="Sélectionner un marché..." isClearable />
          </div>
          <div className="flex-none">
            <button onClick={compare} disabled={!marketA || !marketB || loading} className="btn-primary w-full py-2.5 px-6">
              {loading ? 'Analyse...' : '⚡ Comparer'}
            </button>
          </div>
        </div>
      </div>

      {!result && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-[#7A8A99]">
          <GitCompare size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Sélectionnez 2 marchés et cliquez sur Comparer pour analyser les données de manière visuelle</p>
        </div>
      )}

      {loading && <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />}

      {result && !loading && (
        <div className="space-y-6 animate-fade-in">
          {/* KPIs */}
          <div className="flex gap-6 relative">
            <KPICol kpis={result.market_a} color="#2D3E50" headerBg="linear-gradient(135deg, #1E2D3D, #2D3E50)" badgeColor="#2D3E50" label="Marché A" />
            
            {/* VS Separator centered absolutely between the two columns */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center z-10" style={{ border: '2px dashed #CBD2DA', boxShadow: '0 4px 12px rgba(45,62,80,0.1)' }}>
              <span className="text-xs font-bold text-[#7A8A99] tracking-wider">VS</span>
            </div>

            <KPICol kpis={result.market_b} color="#6B8C2A" headerBg="linear-gradient(135deg, #4E6820, #6B8C2A)" badgeColor="#6B8C2A" label="Marché B" />
          </div>

          {/* Radar + Evolution */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-[#EEF0F3] shadow-sm">
              <h3 className="text-sm font-bold text-[#2D3E50] mb-4">Radar de performances comparé</h3>
              <RadarChartComponent
                data={radarData}
                labelA={`${result.market_a.pays} — ${result.market_a.branche}`}
                labelB={`${result.market_b.pays} — ${result.market_b.branche}`}
              />
            </div>
            <div className="bg-white p-5 rounded-xl border border-[#EEF0F3] shadow-sm">
              <h3 className="text-sm font-bold text-[#2D3E50] mb-4">Évolution Prime & LR</h3>
              {evolutionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={evolutionData} margin={{ right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F3" />
                    <XAxis dataKey="year" tick={{ fill: '#7A8A99', fontSize: 10, fontWeight: 500 }} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fill: '#7A8A99', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
                    <Tooltip 
                      formatter={(v: any, name: string) => [formatCompact(v), name]} 
                      contentStyle={{ background: '#2D3E50', border: '1px solid #6B8C2A', borderRadius: 10, color: '#FFF' }}
                    />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-[#4A5568] text-xs font-semibold">{v}</span>} />
                    
                    {/* Market A Lines */}
                    <Line yAxisId="left" type="monotone" dataKey="premA" name={`Prime A`} stroke="#2D3E50" strokeWidth={2.5} dot={{ r: 4, fill: '#FFFFFF', stroke: '#2D3E50', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    
                    {/* Market B Lines */}
                    <Line yAxisId="left" type="monotone" dataKey="premB" name={`Prime B`} stroke="#6B8C2A" strokeWidth={2.5} dot={{ r: 4, fill: '#FFFFFF', stroke: '#6B8C2A', strokeWidth: 2 }} strokeDasharray="6 4" activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-center py-8 font-medium text-[#7A8A99]">Données insuffisantes</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
