import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { DollarSign, BarChart2 } from 'lucide-react'
import api from '../../utils/api'
import { API_ROUTES } from '../../constants/api'
import { useData, filtersToParams } from '../../context/DataContext'
import { formatCompact } from '../../utils/formatters'
import { ChartSkeleton } from '../ui/Skeleton'

interface FinancialBreakdown {
  written_premium: number
  commission: number
  brokerage: number
  profit_commission: number
  tax: number
  resultat: number
  commission_pct: number
  brokerage_pct: number
  profit_commission_pct: number
  tax_pct: number
  resultat_pct: number
}

interface ProfitCommByBranch {
  branche: string
  profit_commission: number
  profit_comm_rate: number
  contract_count: number
  wp: number
}

export default function FinancesChart() {
  const { filters } = useData()
  const [breakdown, setBreakdown] = useState<FinancialBreakdown | null>(null)
  const [branchData, setBranchData] = useState<ProfitCommByBranch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = filtersToParams(filters)

    Promise.all([
      api.get(API_ROUTES.KPIS.FINANCIAL_BREAKDOWN, { params }),
      api.get(API_ROUTES.KPIS.PROFIT_COMMISSION_BY_BRANCH, { params })
    ]).then(([breakdownRes, branchRes]) => {
      console.log('breakdown:', breakdownRes.data)
      setBreakdown(breakdownRes.data)

      const branches = branchRes.data
        .filter((b: any) => b.avg_profit_comm_rate > 0)
        .sort((a: any, b: any) => a.avg_profit_comm_rate - b.avg_profit_comm_rate)

      setBranchData(branches.map((b: any) => ({
        branche: b.branche,
        profit_commission: b.profit_commission,
        profit_comm_rate: b.avg_profit_comm_rate,
        contract_count: b.contract_count_with_pc,
        wp: b.written_premium,
      })))
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [filters])

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <ChartSkeleton height={400} />
        <ChartSkeleton height={400} />
      </div>
    )
  }

  if (!breakdown) return null

  // Waterfall Chart Data
  const waterfallData = [
    { name: 'Prime Écrite', value: breakdown.written_premium, pct: 100, color: 'hsl(209,28%,24%)' },
    { name: 'Commission', value: -Math.abs(breakdown.commission), pct: breakdown.commission_pct, color: 'hsl(358,66%,54%)' },
    { name: 'Courtage', value: -Math.abs(breakdown.brokerage), pct: breakdown.brokerage_pct, color: 'hsl(30,88%,56%)' },
    { name: 'Comm. Bénéfices', value: -Math.abs(breakdown.profit_commission || 0), pct: breakdown.profit_commission_pct || 0, color: 'hsl(43,96%,56%)' },
    { name: 'Taxes', value: -Math.abs(breakdown.tax), pct: breakdown.tax_pct, color: 'hsl(218,12%,68%)' },
    { name: 'Résultat Net', value: breakdown.resultat, pct: breakdown.resultat_pct, color: breakdown.resultat >= 0 ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)' },
  ]

  const CustomTooltipWaterfall = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white/95 backdrop-blur-md text-[var(--color-navy)] p-3 rounded-lg shadow-xl border border-[var(--color-gray-100)] text-xs shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
          <p className="font-bold mb-1 opacity-90">{data.name}</p>
          <div className="flex items-center justify-between gap-4 mt-2">
            <span className="opacity-70">Montant:</span>
            <span className="font-mono font-bold" style={{ color: data.color }}>{formatCompact(Math.abs(data.value))}</span>
          </div>
          <div className="flex items-center justify-between gap-4 mt-1">
            <span className="opacity-70">% Prime:</span>
            <span className="font-mono font-bold">{data.pct}%</span>
          </div>
        </div>
      )
    }
    return null
  }

  const CustomTooltipBranch = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white/95 backdrop-blur-md text-[var(--color-navy)] p-3 rounded-lg shadow-xl border border-[var(--color-gray-100)] text-xs shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
          <p className="font-bold mb-1 opacity-90">{data.branche}</p>
          <div className="flex items-center justify-between gap-4 mt-2">
            <span className="opacity-70">Taux Moyen:</span>
            <span className="font-mono font-bold text-[hsl(43,96%,56%)]">{data.profit_comm_rate.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between gap-4 mt-1">
            <span className="opacity-70">Montant:</span>
            <span className="font-mono font-bold">{formatCompact(data.profit_commission)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 mt-1">
            <span className="opacity-70">Contrats:</span>
            <span className="font-mono font-bold">{data.contract_count}</span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-6">
        {/* Waterfall Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign size={18} className="text-[var(--color-navy)]" />
            <h3 className="text-sm font-bold text-[var(--color-navy)]">Décomposition de la Prime (Waterfall)</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-100)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                <YAxis tickFormatter={(val) => formatCompact(Math.abs(val))} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                <Tooltip content={<CustomTooltipWaterfall />} cursor={{ fill: 'var(--color-off-white)' }} />
                <Bar dataKey="value" radius={[4, 4, 4, 4]} minPointSize={4}>
                  {waterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Commission by Branch */}
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 size={18} className="text-[var(--color-navy)]" />
            <h3 className="text-sm font-bold text-[var(--color-navy)]">Commission de Bénéfices par Branche</h3>
          </div>
          <div className="h-72">
            {branchData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[var(--color-gray-400)] text-sm">
                Aucune donnée de commission de bénéfices
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-gray-100)" />
                  <XAxis type="number" tickFormatter={(val) => `${val}%`} domain={[0, 30]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                  <YAxis type="category" dataKey="branche" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)', width: 80 }} width={80} />
                  <Tooltip content={<CustomTooltipBranch />} cursor={{ fill: 'var(--color-off-white)' }} />
                  <Bar dataKey="profit_comm_rate" radius={[0, 4, 4, 0]}>
                    {branchData.map((entry, index) => {
                      // Gradient color from yellow to orange based on rate
                      const intensity = Math.min(1, entry.profit_comm_rate / 20)
                      const hue = 43 - (13 * intensity) // 43 to 30
                      return <Cell key={`cell-${index}`} fill={`hsl(${hue}, 96%, 56%)`} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
