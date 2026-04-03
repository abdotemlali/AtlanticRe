// 🎨 STYLE UPDATED — DistributionCharts : palette HSL riche, ChartCard glass, tooltips glass, gradients premium
// F4: Labels % sur PieCharts | F6: Toggle FAC/Traité sur Top cédantes
import { useEffect, useState } from "react"
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

// 🎨 Feature 4 — % labels inside PieChart slices
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.04) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={700} style={{ pointerEvents: 'none' }}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>
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

const COUNTRY_NAME_MAP: Record<string, string> = {
  'MAROC': 'Morocco',
  'ALGERIE': 'Algeria',
  'TUNISIE': 'Tunisia',
  'LIBYE': 'Libya',
  'EGYPTE': 'Egypt',
  'MAURITANIE': 'Mauritania',
  'SENEGAL': 'Senegal',
  'MALI': 'Mali',
  'BURKINA FASO': 'Burkina Faso',
  'NIGER': 'Niger',
  'TOGO': 'Togo',
  'BENIN': 'Benin',
  'GHANA': 'Ghana',
  'NIGERIA': 'Nigeria',
  'CAMEROUN': 'Cameroon',
  'GABON': 'Gabon',
  'CONGO': 'Republic of the Congo',
  'ANGOLA': 'Angola',
  'NAMIBIE': 'Namibia',
  'AFRIQUE DU SUD': 'South Africa',
  'BOTSWANA': 'Botswana',
  'ZIMBABWE': 'Zimbabwe',
  'ZAMBIE': 'Zambia',
  'MOZAMBIQUE': 'Mozambique',
  'TANZANIE': 'Tanzania',
  'KENYA': 'Kenya',
  'OUGANDA': 'Uganda',
  'RWANDA': 'Rwanda',
  'SOMALIE': 'Somalia',
  'ETHIOPIE': 'Ethiopia',
  'DJIBOUTI': 'Djibouti',
  'SOUDAN': 'Sudan',
  'COTE D IVOIRE': 'Ivory Coast',
  'ARABIE SAOUDITE': 'Saudi Arabia',
  'EMIRATS ARABES UNIS': 'United Arab Emirates',
  'KOWEIT': 'Kuwait',
  'QATAR': 'Qatar',
  'BAHREIN': 'Bahrain',
  'OMAN': 'Oman',
  'JORDANIE': 'Jordan',
  'LIBAN': 'Lebanon',
  'IRAK': 'Iraq',
  'IRAN': 'Iran',
  'SYRIE': 'Syria',
  'TURQUIE': 'Turkey',
  'PAKISTAN': 'Pakistan',
  'INDE': 'India',
  'SRI LANKA': 'Sri Lanka',
  'BANGLADESH': 'Bangladesh',
  'CHINE': 'China',
  'TAIWAN': 'Taiwan',
  'COREE DU SUD': 'South Korea',
  'JAPON': 'Japan',
  'SINGAPOUR': 'Singapore',
  'MALAISIE': 'Malaysia',
  'INDONESIE': 'Indonesia',
  'VIETNAM': 'Vietnam',
  'ASIE PACIFIQUE': 'Australia',
  'EUROPE': 'France',
  'MOYEN ORIENT': 'Saudi Arabia',
  'MONDE ENTIER': 'Morocco',
  'AFRIQUE': 'Nigeria',
}

export default function DistributionCharts() {
  const { filters } = useData()
  const [branchData, setBranchData] = useState<any[]>([])
  const [contractTypeData, setContractTypeData] = useState<any[]>([]) // NEW
  const [brokerData, setBrokerData] = useState<any[]>([])
  const [cedanteData, setCedanteData] = useState<any[]>([]) // NEW
  const [countryData, setCountryData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // Feature 6: FAC/Traité/Tous toggle for cedante chart
  type CedanteView = 'ALL' | 'FAC' | 'TREATY'
  const [cedanteView, setCedanteView] = useState<CedanteView>('ALL')

  useEffect(() => {
    const params = filtersToParams(filters)
    setLoading(true)
    Promise.all([
      api.get('/kpis/by-branch', { params }),
      api.get('/kpis/by-contract-type', { params }), // NEW
      api.get('/kpis/by-broker', { params: { ...params, top: 10 } }),
      api.get('/kpis/by-cedante', { params: { ...params, top: 10, type_contrat_view: cedanteView === 'ALL' ? undefined : cedanteView } }), // F6
      api.get('/kpis/by-country', { params }),
    ]).then(([br, contType, bk, ced, co]) => {
      setBranchData(br.data)
      setBrokerData(bk.data)
      
      // NEW
      setContractTypeData(contType.data)
      setCedanteData(ced.data)
      
      // Map names to english for consistency
      const mappedCountryData = co.data.map((item: any) => ({
        ...item,
        pays: COUNTRY_NAME_MAP[item.pays?.toUpperCase() || ''] || item.pays
      }))
      
      setCountryData(mappedCountryData.slice(0, 10))
    }).catch(console.error).finally(() => setLoading(false))
  }, [filters, cedanteView])

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

  // Donut data for Contract Types
  const topContractTypes = contractTypeData.slice(0, 8)
  const othersWPContract = contractTypeData.slice(8).reduce((s, d) => s + d.total_written_premium, 0)
  const contractTypePieData = [
    ...topContractTypes.map(d => ({ name: d.type_contrat, value: d.total_written_premium })),
    ...(othersWPContract > 0 ? [{ name: 'Autres', value: othersWPContract }] : []),
  ]

  return (
    <div className="flex flex-col gap-4">

      {/* DONUT — by contract type */}
      <ChartCard title="Répartition par type de contrat">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={contractTypePieData}
              cx="50%" cy="50%"
              innerRadius={80} outerRadius={120} // Donut shape
              dataKey="value" nameKey="name"
              paddingAngle={3}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
              stroke="none"
              labelLine={false}
              label={renderCustomLabel}
            >
              {contractTypePieData.map((entry, i) => (
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

      {/* PIE — by branch */}
      <ChartCard title="Répartition par branche">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={branchPieData}
              cx="50%" cy="50%"
              innerRadius={0} outerRadius={120}
              dataKey="value" nameKey="name"
              paddingAngle={3}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
              stroke="none"
              labelLine={false}
              label={renderCustomLabel}
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

      {/* BAR (horizontal) — top 10 brokers */}
      <ChartCard title="Top 10 courtiers par prime écrite">
        <ResponsiveContainer width="100%" height={300}>
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
              width={140}
              tickFormatter={v => truncate(v, 22)}
            />
            <Tooltip
              content={<GlassTooltip isBar />}
              cursor={{ fill: 'hsla(83,52%,36%,0.06)' }}
            />
            <Bar
              dataKey="written_premium"
              name="Prime écrite"
              radius={[0, 4, 4, 0]}
              fill="url(#barGradBroker)"
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
              activeBar={<rect fill="hsl(83,52%,36%)" rx={4} />}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* BAR (horizontal) — top 10 cedantes */}
      <ChartCard title="Top 10 cédantes par prime écrite">
        {/* Feature 6: FAC / Traité / Tous toggle */}
        <div className="flex gap-1 mb-3 p-0.5 rounded-lg w-fit" style={{ background: 'var(--color-gray-100)' }}>
          {(['ALL', 'FAC', 'TREATY'] as const).map(view => (
            <button
              key={view}
              onClick={() => setCedanteView(view)}
              className="text-[0.68rem] font-bold px-2.5 py-1 rounded-md transition-all duration-200"
              style={{
                background: cedanteView === view ? 'var(--color-navy)' : 'transparent',
                color: cedanteView === view ? '#fff' : 'var(--color-gray-500)',
              }}
            >
              {view === 'ALL' ? 'Tous' : view === 'FAC' ? 'Facultatif' : 'Traité'}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={cedanteData} layout="vertical" margin={{ left: 10, right: 24 }}>
            <defs>
              <linearGradient id="barGradCedante" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(152,56%,20%)" />
                <stop offset="100%" stopColor="hsl(152,56%,39%)" />
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
              dataKey="cedante"
              tick={{ fill: 'hsl(218,12%,42%)', fontSize: 10, fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              width={140}
              tickFormatter={v => truncate(v, 22)}
            />
            <Tooltip
              content={<GlassTooltip isBar />}
              cursor={{ fill: 'hsla(83,52%,36%,0.06)' }}
            />
            <Bar
              dataKey="total_written_premium"
              name="Prime écrite"
              radius={[0, 4, 4, 0]}
              fill="url(#barGradCedante)"
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
              activeBar={<rect fill="hsl(152,56%,39%)" rx={4} />}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* BAR (vertical) — top 10 countries */}
      <ChartCard title="Top 10 pays par prime écrite">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={countryData} margin={{ right: 20, top: 20 }}>
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
              radius={[4, 4, 0, 0]}
              fill="url(#barGradCountry)"
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
              activeBar={<rect fill="hsl(83,52%,36%)" rx={4} />}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
