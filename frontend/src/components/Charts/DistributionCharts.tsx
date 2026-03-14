// 🎨 STYLE UPDATED — DistributionCharts : palette HSL riche, ChartCard glass, tooltips glass, gradients premium
import React, { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { useData, filtersToParams } from '../../context/DataContext'
import api from '../../utils/api'
import { formatCompact, truncate } from '../../utils/formatters'
import { ChartSkeleton } from '../ui/Skeleton'

// 🎨 Updated palette — HSL Premium aligned with Design System
const CHART_COLORS = [
  'hsl(209,28%,24%)',  // navy
  'hsl(83,52%,36%)',   // green
  'hsl(83,50%,45%)',   // green light
  'hsl(209,24%,32%)',  // navy light
  'hsl(83,54%,27%)',   // green dark
  'hsl(209,28%,40%)',  // navy mid
  'hsl(152,56%,39%)',  // emerald
  'hsl(43,96%,56%)',   // amber
  'hsl(218,12%,68%)',  // gray 400
]

// 🎨 Shared glass tooltip
const GlassTooltip = ({ active, payload, label, isBar = false }: any) => {
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
        {isBar ? label : payload[0]?.name}
      </p>
      <p style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isBar ? 'hsl(83,50%,55%)' : payload[0]?.payload?.fill || 'hsl(83,50%,55%)' }}>
        {formatCompact(payload[0]?.value)}
      </p>
    </div>
  )
}

// 🎨 Glass ChartCard
const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div
    className="glass-card p-5 relative overflow-hidden"
    style={{ height: '100%' }}
  >
    {/* Decorative top-right orb */}
    <div
      className="absolute -top-4 -right-4 w-16 h-16 rounded-full pointer-events-none opacity-30"
      style={{ background: 'hsl(83,52%,36%)', filter: 'blur(18px)' }}
      aria-hidden="true"
    />
    <h3 className="text-sm font-bold mb-4 text-navy relative z-10">
      {title}
    </h3>
    <div className="relative z-10">{children}</div>
  </div>
)

export default function DistributionCharts() {
  const { filters } = useData()
  const [branchData, setBranchData] = useState<any[]>([])
  const [brokerData, setBrokerData] = useState<any[]>([])
  const [countryData, setCountryData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = filtersToParams(filters)
    setLoading(true)
    Promise.all([
      api.get('/kpis/by-branch', { params }),
      api.get('/kpis/by-broker', { params: { ...params, top: 10 } }),
      api.get('/kpis/by-country', { params }),
    ]).then(([br, bk, co]) => {
      setBranchData(br.data)
      setBrokerData(bk.data)
      setCountryData(co.data.slice(0, 10))
    }).catch(console.error).finally(() => setLoading(false))
  }, [filters])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-5 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
            <ChartSkeleton height={220} />
          </div>
        ))}
      </div>
    )
  }

  // Pie data for branches
  const topBranches = branchData.slice(0, 8)
  const othersWP = branchData.slice(8).reduce((s, d) => s + d.total_written_premium, 0)
  const branchPieData = [
    ...topBranches.map(d => ({ name: d.branche, value: d.total_written_premium })),
    ...(othersWP > 0 ? [{ name: 'Autres', value: othersWP }] : []),
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">

        {/* PIE — by branch */}
        <div className="col-span-1">
          <ChartCard title="Répartition par branche">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={branchPieData}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={86}
                  dataKey="value" nameKey="name"
                  paddingAngle={3}
                  isAnimationActive
                  animationDuration={900}
                  animationEasing="ease-out"
                  stroke="none"
                >
                  {branchPieData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={<GlassTooltip />}
                  cursor={{ fill: 'transparent' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => (
                    <span style={{ fontSize: 11, color: 'hsl(218,12%,42%)', fontWeight: 500 }}>
                      {truncate(v, 20)}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* BAR (horizontal) — top 10 brokers */}
        <div className="col-span-2">
          <ChartCard title="Top 10 courtiers par prime écrite">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={brokerData} layout="vertical" margin={{ left: 10, right: 24 }}>
                <defs>
                  <linearGradient id="barGradBroker" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(209,32%,17%)" />
                    <stop offset="100%" stopColor="hsl(209,24%,38%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(218,22%,93%)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'hsl(218,10%,55%)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => formatCompact(v)}
                />
                <YAxis
                  type="category"
                  dataKey="courtier"
                  tick={{ fill: 'hsl(218,12%,42%)', fontSize: 10, fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  width={118}
                  tickFormatter={v => truncate(v, 18)}
                />
                <Tooltip
                  content={<GlassTooltip isBar />}
                  cursor={{ fill: 'hsla(83,52%,36%,0.06)' }}
                />
                <Bar
                  dataKey="written_premium"
                  name="Prime écrite"
                  radius={[0, 5, 5, 0]}
                  fill="url(#barGradBroker)"
                  isAnimationActive
                  animationDuration={900}
                  animationEasing="ease-out"
                  activeBar={<rect fill="hsl(83,52%,36%)" rx={5} />}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* BAR (vertical) — top 10 countries */}
      <ChartCard title="Top 10 pays par prime écrite">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={countryData} margin={{ right: 20, top: 4 }}>
            <defs>
              <linearGradient id="barGradCountry" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(209,24%,32%)" />
                <stop offset="100%" stopColor="hsl(209,32%,17%)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="hsl(218,22%,93%)" vertical={false} />
            <XAxis
              dataKey="pays"
              tick={{ fill: 'hsl(218,12%,42%)', fontSize: 10, fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(218,22%,93%)' }}
              tickFormatter={v => truncate(v, 12)}
            />
            <YAxis
              tick={{ fill: 'hsl(218,10%,55%)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => formatCompact(v)}
            />
            <Tooltip
              content={<GlassTooltip isBar />}
              cursor={{ fill: 'hsla(83,52%,36%,0.06)' }}
            />
            <Bar
              dataKey="total_written_premium"
              name="Prime écrite"
              radius={[5, 5, 0, 0]}
              fill="url(#barGradCountry)"
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
              activeBar={<rect fill="hsl(83,52%,36%)" rx={5} />}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
