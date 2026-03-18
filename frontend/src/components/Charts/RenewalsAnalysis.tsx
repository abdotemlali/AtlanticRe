import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Loader2, TrendingUp, AlertTriangle } from 'lucide-react'
import api from '../../utils/api'
import { formatCompact } from '../../utils/formatters'

interface RenewalYear {
  year: number
  total: number
  renewals: number
  new_business: number
  retention_rate: number
}

interface RenewalCedante {
  cedante: string
  total: number
  renewals: number
  new_business: number
  retention_rate: number
}

export default function RenewalsAnalysis() {
  const [data, setData] = useState<{ by_year: RenewalYear[]; by_cedante: RenewalCedante[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/clients/renewals')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const getRateColor = (rate: number) => {
    if (rate >= 80) return 'hsl(83,52%,36%)'
    if (rate >= 50) return 'hsl(30,88%,56%)'
    return 'var(--color-red)'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-16 text-gray-400">
        <Loader2 size={32} className="animate-spin" />
      </div>
    )
  }

  if (!data || data.by_year.length === 0) {
    return (
      <div className="glass-card p-14 flex flex-col items-center gap-4 animate-fade-in text-center">
        <AlertTriangle size={32} className="text-gray-300 mb-2" />
        <p className="text-sm font-medium text-[var(--color-gray-500)]">
          Aucune donnée de renouvellement trouvée. (Colonne RENEWALE_CONTRACT absente ou vide)
        </p>
      </div>
    )
  }

  const latestRate = data.by_year[data.by_year.length - 1]?.retention_rate ?? 0
  const totalRenewals = data.by_year.reduce((s, y) => s + y.renewals, 0)
  const totalNew = data.by_year.reduce((s, y) => s + y.new_business, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            label: 'Taux de rétention (dernière année)',
            value: `${latestRate.toFixed(1)}%`,
            color: getRateColor(latestRate),
            icon: <TrendingUp size={18} style={{ color: getRateColor(latestRate) }} />,
          },
          {
            label: 'Contrats renouvelés (total)',
            value: formatCompact(totalRenewals),
            color: 'hsl(83,52%,36%)',
            icon: null,
          },
          {
            label: 'Nouvelles affaires (total)',
            value: formatCompact(totalNew),
            color: 'var(--color-gray-400)',
            icon: null,
          },
        ].map((card, i) => (
          <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-[var(--color-gray-100)] flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gray-500)]">{card.label}</span>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold" style={{ color: card.color }}>{card.value}</span>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stacked BarChart by Year */}
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
          <h3 className="text-sm font-bold text-[var(--color-navy)] mb-5">Évolution des Renouvellements par Année</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.by_year} margin={{ left: -10, right: 10, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" vertical={false} />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} tickFormatter={formatCompact} />
                <Tooltip
                  cursor={{ fill: 'var(--color-off-white)' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid var(--color-gray-200)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="renewals" name="Renouvellements" stackId="a" fill="hsl(83,52%,36%)" radius={[0, 0, 4, 4]} />
                <Bar dataKey="new_business" name="Nouvelles affaires" stackId="a" fill="var(--color-gray-200)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top cedantes table */}
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[var(--color-gray-100)] bg-[var(--color-off-white)] flex justify-between items-center">
            <h3 className="text-sm font-bold text-[var(--color-navy)]">Fidélité par Cédante — Top 15 volume</h3>
          </div>
          <div className="overflow-auto flex-1" style={{ maxHeight: 310 }}>
            <table className="data-table w-full">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="py-2 text-left">Cédante</th>
                  <th className="text-right py-2">Renouvelés</th>
                  <th className="text-right py-2">Nouveaux</th>
                  <th className="text-right py-2">Taux Rét.</th>
                </tr>
              </thead>
              <tbody>
                {data.by_cedante.map((c, i) => (
                  <tr key={i}>
                    <td className="font-semibold text-xs text-[var(--color-navy)]" style={{ maxWidth: 160 }}>
                      <span className="block truncate" title={c.cedante}>{c.cedante}</span>
                    </td>
                    <td className="text-right font-mono text-xs">{c.renewals}</td>
                    <td className="text-right font-mono text-xs text-gray-400">{c.new_business}</td>
                    <td className="text-right">
                      <span
                        className="inline-block px-2.5 py-1 rounded text-[10px] font-bold"
                        style={{
                          background: c.retention_rate >= 80 ? 'hsla(83,52%,36%,0.1)' : c.retention_rate >= 50 ? 'hsla(30,88%,56%,0.1)' : 'hsla(358,66%,54%,0.1)',
                          color: getRateColor(c.retention_rate),
                        }}
                      >
                        {c.retention_rate.toFixed(1)}%
                      </span>
                    </td>
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
