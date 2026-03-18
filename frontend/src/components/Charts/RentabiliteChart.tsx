import { useState, useEffect, useMemo } from "react"
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart, Cell } from 'recharts'
import { ArrowUp, ArrowDown, ArrowUpDown, BarChart2, Table } from 'lucide-react'
import api from '../../utils/api'
import { API_ROUTES } from '../../constants/api'
import { useData, filtersToParams } from '../../context/DataContext'
import { formatCompact, formatPercent } from '../../utils/formatters'
import { ChartSkeleton } from '../ui/Skeleton'

interface ContractTypeData {
  type_contrat: string
  total_written_premium: number
  contract_count: number
  avg_ulr: number | null
  avg_commission: number
  total_resultat: number
  ratio: number // Résultat / Prime
}

type SortCol = keyof ContractTypeData
type SortDir = 'asc' | 'desc' | null

export default function RentabiliteChart() {
  const { filters } = useData()
  const [data, setData] = useState<ContractTypeData[]>([])
  const [loading, setLoading] = useState(true)
  
  // Sorting state
  const [sortCol, setSortCol] = useState<SortCol>('total_written_premium')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    setLoading(true)
    api.get(API_ROUTES.KPIS.BY_CONTRACT_TYPE, { params: filtersToParams(filters) })
      .then(res => {
        const mapped = res.data.map((d: any) => ({
          ...d,
          avg_commission: d.avg_commission || 0,
          ratio: d.total_written_premium ? (d.total_resultat / d.total_written_premium) * 100 : 0
        }))
        setData(mapped)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filters])

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc')
      else if (sortDir === 'desc') setSortDir(null)
      else setSortDir('asc')
    } else {
      setSortCol(col)
      setSortDir('desc') // Default to desc when clicking a new col
    }
  }

  const sortedData = useMemo(() => {
    if (!sortDir) return data
    return [...data].sort((a, b) => {
      const valA = a[sortCol] ?? 0
      const valB = b[sortCol] ?? 0
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      
      const numA = Number(valA)
      const numB = Number(valB)
      return sortDir === 'asc' ? numA - numB : numB - numA
    })
  }, [data, sortCol, sortDir])

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col || !sortDir) return <ArrowUpDown size={12} className="opacity-30 inline-block ml-1" />
    return sortDir === 'asc' 
      ? <ArrowUp size={12} className="inline-block ml-1 text-[var(--color-navy)]" />
      : <ArrowDown size={12} className="inline-block ml-1 text-[var(--color-navy)]" />
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <ChartSkeleton height={400} />
        <ChartSkeleton height={400} />
      </div>
    )
  }

  if (data.length === 0) return null

  const CustomTooltipBar = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md text-[var(--color-navy)] p-3 rounded-lg shadow-xl border border-[var(--color-gray-100)] text-xs shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
          <p className="font-bold mb-2 opacity-90">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 mt-1">
              <span className="opacity-70 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-mono font-bold" style={{ color: entry.dataKey === 'avg_ulr' ? 'hsl(30,88%,56%)' : entry.color }}>
                {entry.dataKey === 'avg_ulr' ? formatPercent(entry.value) : formatCompact(entry.value)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  // Bar chart needs values adapted so they don't break the scale completely, 
  // but ComposedChart handles multiple axes better
  const chartData = data.map(d => ({
    ...d,
    // Add logic if needed specifically for drawing
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-6">
        
        {/* Table Comparatif */}
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[var(--color-gray-100)] bg-[var(--color-off-white)] flex items-center gap-2">
            <Table size={18} className="text-[var(--color-navy)]" />
            <h3 className="text-sm font-bold text-[var(--color-navy)]">Performance par Type de Contrat</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="data-table w-full">
              <thead className="bg-[var(--color-off-white)]">
                <tr>
                  <th className="py-3 px-4 text-left font-bold text-xs text-[var(--color-gray-500)] uppercase cursor-pointer hover:bg-[var(--color-gray-100)] transition-colors" onClick={() => handleSort('type_contrat')}>
                    Type {<SortIcon col="type_contrat" />}
                  </th>
                  <th className="py-3 px-4 text-right font-bold text-xs text-[var(--color-gray-500)] uppercase cursor-pointer hover:bg-[var(--color-gray-100)] transition-colors" onClick={() => handleSort('total_written_premium')}>
                    Prime {<SortIcon col="total_written_premium" />}
                  </th>
                  <th className="py-3 px-4 text-right font-bold text-xs text-[var(--color-gray-500)] uppercase">Contrats</th>
                  <th className="py-3 px-4 text-right font-bold text-xs text-[var(--color-gray-500)] uppercase cursor-pointer hover:bg-[var(--color-gray-100)] transition-colors" onClick={() => handleSort('avg_ulr')}>
                    ULR {<SortIcon col="avg_ulr" />}
                  </th>
                  <th className="py-3 px-4 text-right font-bold text-xs text-[var(--color-gray-500)] uppercase cursor-pointer hover:bg-[var(--color-gray-100)] transition-colors" onClick={() => handleSort('avg_commission')}>
                    Commi {<SortIcon col="avg_commission" />}
                  </th>
                  <th className="py-3 px-4 text-right font-bold text-xs text-[var(--color-gray-500)] uppercase cursor-pointer hover:bg-[var(--color-gray-100)] transition-colors" onClick={() => handleSort('total_resultat')}>
                    Résultat {<SortIcon col="total_resultat" />}
                  </th>
                  <th className="py-3 px-4 text-right font-bold text-xs text-[var(--color-gray-500)] uppercase cursor-pointer hover:bg-[var(--color-gray-100)] transition-colors" onClick={() => handleSort('ratio')}>
                    Marge {<SortIcon col="ratio" />}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((d, i) => (
                  <tr key={i} className="hover:bg-[var(--color-off-white)] transition-colors border-b border-[var(--color-gray-100)] last:border-0">
                    <td className="py-3 px-4 font-bold text-[var(--color-navy)] text-xs">{d.type_contrat}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs">{formatCompact(d.total_written_premium)}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-[var(--color-gray-500)]">{d.contract_count}</td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] font-bold">
                      {d.avg_ulr !== null && (
                        <span className="px-2 py-0.5 rounded" style={{
                          color: 'white',
                          backgroundColor: d.avg_ulr > 100 ? 'hsl(358,66%,54%)' : d.avg_ulr > 70 ? 'hsl(30,88%,56%)' : 'hsl(83,52%,36%)'
                        }}>
                          {formatPercent(d.avg_ulr)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-[var(--color-gray-500)]">{formatPercent(d.avg_commission)}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs font-bold" style={{ color: d.total_resultat >= 0 ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)' }}>
                      {formatCompact(d.total_resultat)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs font-bold" style={{ color: d.ratio > 20 ? 'hsl(83,52%,36%)' : d.ratio > 0 ? 'hsl(30,88%,56%)' : 'hsl(358,66%,54%)' }}>
                      {d.ratio.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grouped Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 size={18} className="text-[var(--color-navy)]" />
            <h3 className="text-sm font-bold text-[var(--color-navy)]">Comparatif Prime vs Résultat & ULR</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-100)" />
                <XAxis dataKey="type_contrat" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-gray-500)' }} />
                
                {/* Left Axis for Volume */}
                <YAxis yAxisId="left" tickFormatter={(val) => formatCompact(val)} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-gray-500)' }} />
                
                {/* Right Axis for ULR Percentage */}
                <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `${val}%`} domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-gray-500)' }} />
                
                <Tooltip content={<CustomTooltipBar />} cursor={{ fill: 'var(--color-off-white)' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                
                <Bar yAxisId="left" name="Prime Écrite" dataKey="total_written_premium" fill="hsl(209,28%,24%)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" name="Résultat" dataKey="total_resultat" fill="hsl(83,52%,36%)" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.total_resultat >= 0 ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)'} />
                  ))}
                </Bar>
                
                <Line yAxisId="right" type="monotone" name="ULR" dataKey="avg_ulr" stroke="hsl(30,88%,56%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
