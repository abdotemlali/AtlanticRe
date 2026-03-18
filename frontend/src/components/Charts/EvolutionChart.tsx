// 🎨 STYLE UPDATED — EvolutionChart : palette HSL Premium, tooltips glassmorphism navy, grid subtil, toggles pill modernes
import { useEffect, useState } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useData, filtersToParams } from '../../context/DataContext'
import api from '../../utils/api'
import { formatCompact } from '../../utils/formatters'
import { ChartSkeleton } from '../ui/Skeleton'

interface YearData {
  year: number
  total_written_premium: number
  total_resultat: number
  avg_ulr: number
  contract_count: number
}

// 🎨 Updated palette — HSL Premium aligned with Design System
const SERIES = [
  { key: 'total_written_premium', label: 'Prime écrite', color: 'hsl(209,28%,24%)', dot: 'hsl(209,24%,32%)', yAxisId: 'left' },
  { key: 'total_resultat', label: 'Résultat net', color: 'hsl(152,56%,39%)', dot: 'hsl(152,56%,39%)', yAxisId: 'left' },
  { key: 'avg_ulr', label: 'Loss Ratio (%)', color: 'hsl(83,52%,36%)', dot: 'hsl(83,50%,45%)', yAxisId: 'right' },
]

// 🎨 Glass tooltip — navy glassmorphism
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'hsla(209,28%,18%,0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid hsla(0,0%,100%,0.12)',
      borderRadius: 12,
      color: '#FFFFFF',
      fontSize: '0.8rem',
      boxShadow: '0 16px 48px hsla(209,28%,14%,0.30)',
      padding: '10px 14px',
      minWidth: 160,
    }}>
      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(83,50%,55%)', letterSpacing: '0.06em', marginBottom: 6, textTransform: 'uppercase' }}>
        Année {label}
      </p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4" style={{ marginBottom: 3 }}>
          <span style={{ color: 'hsla(0,0%,100%,0.65)', fontSize: '0.75rem' }}>{p.name}</span>
          <span style={{ color: p.stroke, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {p.dataKey === 'avg_ulr' ? `${p.value?.toFixed(1)}%` : formatCompact(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function EvolutionChart() {
  const { filters } = useData()
  const [data, setData] = useState<YearData[]>([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState<Record<string, boolean>>({
    total_written_premium: true,
    total_resultat: true,
    avg_ulr: true,
  })

  useEffect(() => {
    setLoading(true)
    api.get('/kpis/by-year', { params: filtersToParams(filters) })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filters])

  if (loading) return <ChartSkeleton height={340} />

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p className="text-sm font-medium">Aucune donnée temporelle disponible</p>
      </div>
    )
  }

  return (
    <div>
      {/* Toggle series pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {SERIES.map(s => (
          <button
            key={s.key}
            onClick={() => setVisible(v => ({ ...v, [s.key]: !v[s.key] }))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-250 ease-out-expo"
            style={{
              background: visible[s.key] ? `${s.color}1A` : 'transparent',
              color: visible[s.key] ? s.color : 'var(--color-gray-400)',
              border: `1.5px solid ${visible[s.key] ? s.color : 'var(--color-gray-200)'}`,
              transform: visible[s.key] ? 'translateY(-1px)' : 'none',
              boxShadow: visible[s.key] ? `0 2px 8px ${s.color}30` : 'none',
            }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: visible[s.key] ? s.color : 'var(--color-gray-300)' }}
            />
            {s.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 5, right: 32, left: 8, bottom: 5 }}>
          {/* Subtle grid */}
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="hsl(218,22%,93%)"
            vertical={false}
          />
          <XAxis
            dataKey="year"
            tick={{ fill: 'hsl(218,10%,55%)', fontSize: 11, fontWeight: 600 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(218,22%,93%)', strokeWidth: 1 }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: 'hsl(218,10%,55%)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => formatCompact(v)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: 'hsl(218,10%,55%)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'hsla(209,28%,24%,0.15)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          {/* 100% LR reference line */}
          <ReferenceLine
            yAxisId="right"
            y={100}
            stroke="hsl(358,66%,54%)"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: '100%', fill: 'hsl(358,66%,54%)', fontSize: 10, fontWeight: 700, position: 'right' }}
          />
          {SERIES.map(s => visible[s.key] && (
            <Line
              key={s.key}
              yAxisId={s.yAxisId as 'left' | 'right'}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2.5}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
              dot={{ fill: '#FFFFFF', stroke: s.color, strokeWidth: 2.5, r: 4 }}
              activeDot={{ r: 6, fill: s.color, stroke: '#FFFFFF', strokeWidth: 2.5, style: { filter: `drop-shadow(0 0 4px ${s.color})` } }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
