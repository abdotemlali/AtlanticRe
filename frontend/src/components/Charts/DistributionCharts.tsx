// DistributionCharts — Phase 1 + Phase 2 complètes
// #2: suppression du regroupement "Autres"
// #3: logique graphe figé + ChartCard frozen
// #4: graphe Répartition par spécialité (FAC vs Traité)
// #5: suppression tabs Tous/FAC/Traité dans Top 10 cédantes
// #6: mise en avant des cédantes sélectionnées
// #7: mise en avant des courtiers sélectionnés
// B: fix graphe type contrat figé (type_of_contract, pas type_contrat_spc)
// C: top 10 pays avec N sélectionnés + (10-N) complément
import { useEffect, useState } from "react"
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { useData, filtersToParams, filtersToParamsExcluding } from '../../context/DataContext'
import api from '../../utils/api'
import { formatCompact, formatMAD, truncate } from '../../utils/formatters'
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
        {formatMAD(payload[0]?.value)}
      </p>
    </div>
  )
}

// 🎨 % labels inside PieChart slices
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

// 🎨 Glass ChartCard — supporte le badge "graphe figé" (#3)
const ChartCard = ({
  title, children,
  frozen = false,
  frozenLabel = '',
}: {
  title: string
  children: React.ReactNode
  frozen?: boolean
  frozenLabel?: string
}) => (
  <div className="glass-card p-5 relative overflow-hidden" style={{ height: '100%' }}>
    <div
      className="absolute -top-4 -right-4 w-16 h-16 rounded-full pointer-events-none opacity-30"
      style={{ background: 'hsl(83,52%,36%)', filter: 'blur(18px)' }}
      aria-hidden="true"
    />
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-sm font-bold text-navy relative z-10">{title}</h3>
      {frozen && (
        <span style={{
          fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
          background: 'hsla(43,96%,56%,0.15)', color: 'hsl(43,96%,56%)',
          border: '1px solid hsla(43,96%,56%,0.3)', borderRadius: 99,
          whiteSpace: 'nowrap',
        }}>
          🔒 Vue 100% · {frozenLabel}
        </span>
      )}
    </div>
    <div className="relative z-10">{children}</div>
  </div>
)

const COUNTRY_NAME_MAP: Record<string, string> = {
  'MAROC': 'Morocco', 'ALGERIE': 'Algeria', 'TUNISIE': 'Tunisia', 'LIBYE': 'Libya',
  'EGYPTE': 'Egypt', 'MAURITANIE': 'Mauritania', 'SENEGAL': 'Senegal', 'MALI': 'Mali',
  'BURKINA FASO': 'Burkina Faso', 'NIGER': 'Niger', 'TOGO': 'Togo', 'BENIN': 'Benin',
  'GHANA': 'Ghana', 'NIGERIA': 'Nigeria', 'CAMEROUN': 'Cameroon', 'GABON': 'Gabon',
  'CONGO': 'Republic of the Congo', 'ANGOLA': 'Angola', 'NAMIBIE': 'Namibia',
  'AFRIQUE DU SUD': 'South Africa', 'BOTSWANA': 'Botswana', 'ZIMBABWE': 'Zimbabwe',
  'ZAMBIE': 'Zambia', 'MOZAMBIQUE': 'Mozambique', 'TANZANIE': 'Tanzania', 'KENYA': 'Kenya',
  'OUGANDA': 'Uganda', 'RWANDA': 'Rwanda', 'SOMALIE': 'Somalia', 'ETHIOPIE': 'Ethiopia',
  'DJIBOUTI': 'Djibouti', 'SOUDAN': 'Sudan', 'COTE D IVOIRE': 'Ivory Coast',
  'ARABIE SAOUDITE': 'Saudi Arabia', 'EMIRATS ARABES UNIS': 'United Arab Emirates',
  'KOWEIT': 'Kuwait', 'QATAR': 'Qatar', 'BAHREIN': 'Bahrain', 'OMAN': 'Oman',
  'JORDANIE': 'Jordan', 'LIBAN': 'Lebanon', 'IRAK': 'Iraq', 'IRAN': 'Iran',
  'SYRIE': 'Syria', 'TURQUIE': 'Turkey', 'PAKISTAN': 'Pakistan', 'INDE': 'India',
  'SRI LANKA': 'Sri Lanka', 'BANGLADESH': 'Bangladesh', 'CHINE': 'China',
  'TAIWAN': 'Taiwan', 'COREE DU SUD': 'South Korea', 'JAPON': 'Japan',
  'SINGAPOUR': 'Singapore', 'MALAISIE': 'Malaysia', 'INDONESIE': 'Indonesia',
  'VIETNAM': 'Vietnam', 'ASIE PACIFIQUE': 'Australia', 'EUROPE': 'France',
  'MOYEN ORIENT': 'Saudi Arabia', 'MONDE ENTIER': 'Morocco', 'AFRIQUE': 'Nigeria',
}

export default function DistributionCharts() {
  const { filters } = useData()

  // données filtrées (vue courante)
  const [branchData, setBranchData] = useState<any[]>([])
  const [contractTypeData, setContractTypeData] = useState<any[]>([])
  const [specialiteData, setSpecialiteData] = useState<any[]>([])
  const [brokerData, setBrokerData] = useState<any[]>([])
  const [cedanteData, setCedanteData] = useState<any[]>([])
  const [countryData, setCountryData] = useState<any[]>([])

  // données complètes (sans le filtre de la même dimension — pour graphes figés)
  const [branchDataFull, setBranchDataFull] = useState<any[]>([])
  const [contractTypeDataFull, setContractTypeDataFull] = useState<any[]>([])  // B: exclut type_of_contract
  const [specialiteDataFull, setSpecialiteDataFull] = useState<any[]>([])      // exclut type_contrat_spc

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = filtersToParams(filters)

    // Graphes figés : params sans le filtre de la même dimension
    const paramsFullBranch = filtersToParamsExcluding(filters, 'branche')
    // B: le graphe type de contrat groupe par TYPE_OF_CONTRACT → exclure type_of_contract (pas type_contrat_spc)
    const paramsFullContractTypeOf = filtersToParamsExcluding(filters, 'type_of_contract')
    // Le graphe spécialité groupe par INT_SPC_TYPE → exclure type_contrat_spc
    const paramsFullSpecialite = filtersToParamsExcluding(filters, 'type_contrat_spc')

    // #6: cédantes sélectionnées — contourner apply_filters cedante
    const selectedCedantes = filters.cedante
    const cedanteParams = selectedCedantes.length > 0
      ? { ...filtersToParamsExcluding(filters, 'cedante'), top: 10, selected_cedantes: selectedCedantes.join(',') }
      : { ...params, top: 10 }

    // #7: courtiers sélectionnés
    const selectedCourtiers = filters.courtier
    const brokerParams = selectedCourtiers.length > 0
      ? { ...filtersToParamsExcluding(filters, 'courtier'), top: 10, selected_brokers: selectedCourtiers.join(',') }
      : { ...params, top: 10 }

    // C: pays sélectionnés
    const selectedPays = filters.pays_risque
    const countryParams = selectedPays.length > 0
      ? { ...filtersToParamsExcluding(filters, 'pays_risque'), top: 10, selected_countries: selectedPays.join(',') }
      : { ...params, top: 10 }

    setLoading(true)
    Promise.all([
      api.get('/kpis/by-branch', { params }),
      api.get('/kpis/by-branch', { params: paramsFullBranch }),
      api.get('/kpis/by-contract-type', { params }),
      api.get('/kpis/by-contract-type', { params: paramsFullContractTypeOf }),  // B: fix
      api.get('/kpis/by-specialite', { params }),
      api.get('/kpis/by-specialite', { params: paramsFullSpecialite }),
      api.get('/kpis/by-broker', { params: brokerParams }),
      api.get('/kpis/by-cedante', { params: cedanteParams }),
      api.get('/kpis/by-country', { params: countryParams }),  // C: selected_countries + top
    ]).then(([br, brFull, contType, contTypeFull, spec, specFull, bk, ced, co]) => {
      setBranchData(br.data)
      setBranchDataFull(brFull.data)
      setContractTypeData(contType.data)
      setContractTypeDataFull(contTypeFull.data)
      setSpecialiteData(spec.data)
      setSpecialiteDataFull(specFull.data)
      setBrokerData(bk.data)
      setCedanteData(ced.data)
      // C: mapping noms français → anglais, plus de .slice(0, 10) (géré backend)
      setCountryData(co.data.map((item: any) => ({
        ...item,
        pays: COUNTRY_NAME_MAP[item.pays?.toUpperCase() || ''] || item.pays
      })))
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

  // États "figé" par dimension
  const isBranchFrozen = filters.branche.length > 0
  // B: le graphe type de contrat est figé quand filters.type_of_contract est actif (pas type_contrat_spc)
  const isContractTypeFrozen = filters.type_of_contract.length > 0
  const isSpecialiteFrozen = filters.type_contrat_spc.length > 0

  // Données des graphes : version complète si figé, version filtrée sinon
  const branchPieData = (isBranchFrozen ? branchDataFull : branchData)
    .map((d: any) => ({ name: d.branche, value: d.total_written_premium }))

  const contractTypePieData = (isContractTypeFrozen ? contractTypeDataFull : contractTypeData)
    .map((d: any) => ({ name: d.type_contrat, value: d.total_written_premium }))

  const specialitePieData = (isSpecialiteFrozen ? specialiteDataFull : specialiteData)
    .map((d: any) => ({ name: d.specialite, value: d.total_written_premium, specialite: d.specialite }))

  // Couleurs conditionnelles
  const getBranchCellFill = (branchName: string, index: number): string => {
    const baseColor = CHART_COLORS[index % CHART_COLORS.length]
    if (!isBranchFrozen) return baseColor
    return filters.branche.includes(branchName) ? baseColor : `${baseColor}55`
  }

  // B.4: compare avec type_of_contract (PROPORT./XOL...) pas type_contrat_spc (FAC/TTY/TTE)
  const getContractTypeCellFill = (typeName: string, index: number): string => {
    const baseColor = CHART_COLORS[index % CHART_COLORS.length]
    if (!isContractTypeFrozen) return baseColor
    return filters.type_of_contract.includes(typeName) ? baseColor : `${baseColor}55`
  }

  return (
    <div className="flex flex-col gap-4">

      {/* DONUT — by contract type (B: fix frozen logic) */}
      <ChartCard
        title="Répartition par type de contrat"
        frozen={isContractTypeFrozen}
        frozenLabel={`Filtre actif (${filters.type_of_contract.join(', ')})`}
      >
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={contractTypePieData}
              cx="50%" cy="50%"
              innerRadius={80} outerRadius={120}
              dataKey="value" nameKey="name"
              paddingAngle={3}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
              stroke="none"
              labelLine={false}
              label={renderCustomLabel}
            >
              {contractTypePieData.map((entry: any, i: number) => (
                <Cell key={i} fill={getContractTypeCellFill(entry.name, i)} />
              ))}
            </Pie>
            <Tooltip content={<GlassTooltip />} cursor={{ fill: 'transparent' }} />
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
      <ChartCard
        title="Répartition par branche"
        frozen={isBranchFrozen}
        frozenLabel={`Filtre actif (${filters.branche.join(', ')})`}
      >
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
              {branchPieData.map((entry: any, i: number) => (
                <Cell key={i} fill={getBranchCellFill(entry.name, i)} />
              ))}
            </Pie>
            <Tooltip content={<GlassTooltip />} cursor={{ fill: 'transparent' }} />
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

      {/* DONUT — Répartition par spécialité FAC vs Traité */}
      <ChartCard
        title="Répartition par spécialité"
        frozen={isSpecialiteFrozen}
        frozenLabel={`Filtre actif (${filters.type_contrat_spc.join(', ')})`}
      >
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={specialitePieData}
              cx="50%" cy="50%"
              innerRadius={60} outerRadius={100}
              dataKey="value" nameKey="name"
              paddingAngle={4}
              isAnimationActive
              animationDuration={900}
              stroke="none"
              labelLine={false}
              label={renderCustomLabel}
            >
              {specialitePieData.map((entry: any, i: number) => {
                const baseColor = CHART_COLORS[i % CHART_COLORS.length]
                const isHighlighted = !isSpecialiteFrozen || filters.type_contrat_spc.some(f =>
                  (f === 'FAC' && entry.specialite === 'FAC') ||
                  (['TTY', 'TTE'].includes(f) && entry.specialite === 'Traité')
                )
                return <Cell key={i} fill={isHighlighted ? baseColor : `${baseColor}55`} />
              })}
            </Pie>
            <Tooltip content={<GlassTooltip />} cursor={{ fill: 'transparent' }} />
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

      {/* BAR (horizontal) — top 10 brokers (#7) */}
      <ChartCard
        title="Top 10 courtiers par prime écrite"
        frozen={filters.courtier.length > 0}
        frozenLabel={`${filters.courtier.length} sélectionné(s) mis en avant`}
      >
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
            <Tooltip content={<GlassTooltip isBar />} cursor={{ fill: 'hsla(83,52%,36%,0.06)' }} />
            <Bar
              dataKey="written_premium"
              name="Prime écrite"
              radius={[0, 4, 4, 0]}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            >
              {brokerData.map((entry: any, i: number) => (
                <Cell
                  key={i}
                  fill={entry.is_selected ? 'hsl(83,50%,45%)' : 'url(#barGradBroker)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* BAR (horizontal) — top 10 cedantes (#5 #6) */}
      <ChartCard
        title="Top 10 cédantes par prime écrite"
        frozen={filters.cedante.length > 0}
        frozenLabel={`${filters.cedante.length} sélectionnée(s) mise(s) en avant`}
      >
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
            <Tooltip content={<GlassTooltip isBar />} cursor={{ fill: 'hsla(83,52%,36%,0.06)' }} />
            <Bar
              dataKey="total_written_premium"
              name="Prime écrite"
              radius={[0, 4, 4, 0]}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            >
              {cedanteData.map((entry: any, i: number) => (
                <Cell
                  key={i}
                  fill={entry.is_selected ? 'hsl(83,50%,45%)' : 'url(#barGradCedante)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* BAR (vertical) — top 10 countries (C) */}
      <ChartCard
        title="Top 10 pays par prime écrite"
        frozen={filters.pays_risque.length > 0}
        frozenLabel={`${filters.pays_risque.length} sélectionné(s) mis en avant`}
      >
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
            <Tooltip content={<GlassTooltip isBar />} cursor={{ fill: 'hsla(83,52%,36%,0.06)' }} />
            <Bar
              dataKey="total_written_premium"
              name="Prime écrite"
              radius={[4, 4, 0, 0]}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            >
              {countryData.map((entry: any, i: number) => (
                <Cell
                  key={i}
                  fill={entry.is_selected ? 'hsl(83,50%,45%)' : 'url(#barGradCountry)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
