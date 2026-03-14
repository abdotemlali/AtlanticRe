// 🎨 STYLE UPDATED — RadarChart : palette HSL Premium, tooltip glassmorphism, fill rgba plus visible
import React from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend, ResponsiveContainer, Tooltip,
} from 'recharts'

interface RadarData {
  metric: string
  marketA: number
  marketB: number
}

interface RadarChartProps {
  data: RadarData[]
  labelA?: string
  labelB?: string
}

// 🎨 Glass tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'hsla(209,28%,18%,0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid hsla(0,0%,100%,0.12)',
      borderRadius: 10,
      color: '#FFFFFF',
      fontSize: '0.78rem',
      boxShadow: '0 16px 48px hsla(209,28%,14%,0.30)',
      padding: '9px 13px',
    }}>
      <p style={{ color: 'hsl(83,50%,55%)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.06em', marginBottom: 5, textTransform: 'uppercase' }}>
        {label}
      </p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4" style={{ marginBottom: 2 }}>
          <span style={{ color: 'hsla(0,0%,100%,0.65)', fontSize: '0.72rem' }}>{p.name}</span>
          <span style={{ color: p.stroke, fontWeight: 700 }}>{p.value?.toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

export default function RadarChartComponent({ data, labelA = 'Marché A', labelB = 'Marché B' }: RadarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 flex-col gap-3">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'hsla(209,28%,24%,0.08)' }}
        >
          <span style={{ fontSize: 28 }}>📡</span>
        </div>
        <p className="text-sm font-medium text-gray-400">
          Sélectionnez 2 marchés pour afficher le radar
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} margin={{ top: 20, right: 24, bottom: 20, left: 24 }}>
        {/* Grid lines — subtle */}
        <PolarGrid
          stroke="hsl(218,22%,88%)"
          gridType="polygon"
        />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: 'hsl(218,12%,42%)', fontSize: 11, fontWeight: 600 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: 'hsl(218,10%,55%)', fontSize: 9 }}
          tickCount={5}
          axisLine={false}
          style={{ display: 'none' }}
        />

        {/* Radar A — Navy */}
        <Radar
          name={labelA}
          dataKey="marketA"
          stroke="hsl(209,28%,24%)"
          fill="hsla(209,28%,24%,0.22)"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#FFFFFF', stroke: 'hsl(209,28%,24%)', strokeWidth: 2.5 }}
          isAnimationActive
          animationDuration={900}
        />

        {/* Radar B — Green */}
        <Radar
          name={labelB}
          dataKey="marketB"
          stroke="hsl(83,52%,36%)"
          fill="hsla(83,52%,36%,0.20)"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#FFFFFF', stroke: 'hsl(83,52%,36%)', strokeWidth: 2.5 }}
          isAnimationActive
          animationDuration={900}
        />

        <Legend
          iconType="circle"
          iconSize={9}
          formatter={v => (
            <span style={{ fontSize: 12, color: 'hsl(218,12%,42%)', fontWeight: 600 }}>
              {v}
            </span>
          )}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
