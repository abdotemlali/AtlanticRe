import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, ComposedChart, Line, Legend,
} from 'recharts'
import {
  ArrowLeft, Briefcase, DollarSign, TrendingUp, Shield, Activity,
  Users, Globe, FileText, ChevronDown, ChevronUp,
} from 'lucide-react'
import Select from 'react-select'
import { useData } from '../context/DataContext'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { formatCompact, formatPercent, toOptions, ulrColorDecimal } from '../utils/formatters'
import { useLocalFilters } from '../hooks/useLocalFilters'
import LocalFilterPanel from '../components/LocalFilterPanel'
import { C, BRANCH_COLORS } from '../constants/styles'

const fmtMAD = (v: number) => {
  if (Math.abs(v) >= 1e9) return `${(v/1e9).toFixed(1)} Md`
  if (Math.abs(v) >= 1e6) return `${(v/1e6).toFixed(1)} M`
  if (Math.abs(v) >= 1e3) return `${(v/1e3).toFixed(0)} K`
  return v.toLocaleString('fr-FR')
}

const roleConfig = (role: string) => {
  if (role === 'double') return { bg: '#EEF3E6', color: C.olive, label: 'Double Rôle' }
  if (role === 'placeur') return { bg: '#FEF5EC', color: C.orange, label: 'Placeur' }
  return { bg: '#E8EDF1', color: C.navy, label: 'Apporteur' }
}

export default function BrokerDetail() {
  const { brokerName } = useParams<{ brokerName: string }>()
  const broker = decodeURIComponent(brokerName || '')
  const navigate = useNavigate()
  const { filterOptions } = useData()

  const [profile, setProfile] = useState<any>(null)
  const [byYear, setByYear] = useState<any[]>([])
  const [byBranch, setByBranch] = useState<any[]>([])
  const [byBranchAll, setByBranchAll] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'contracts'>('overview')
  const [contractSort, setContractSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'written_premium', dir: 'desc' })

  // ── Shared local filters (replaces ~100 lines of state + logic) ──────────
  const lf = useLocalFilters()

  const loadData = useCallback(async () => {
    if (!broker) return
    setLoading(true)
    try {
      const p = { ...lf.buildParams, broker }
      // Params sans filtre branche — pour le pie chart (toutes branches visibles)
      const pNoBranche = { ...lf.buildParamsNoBranch, broker }
      const [profRes, yearRes, branchRes, branchAllRes, contractRes] = await Promise.all([
        api.get(API_ROUTES.BROKER.PROFILE, { params: p }),
        api.get(API_ROUTES.BROKER.BY_YEAR, { params: p }),
        api.get(API_ROUTES.BROKER.BY_BRANCH, { params: p }),
        api.get(API_ROUTES.BROKER.BY_BRANCH, { params: pNoBranche }),
        api.get(API_ROUTES.BROKER.CONTRACTS, { params: p }),
      ])
      setProfile(profRes.data || null)
      setByYear(yearRes.data || [])
      setByBranch(branchRes.data || [])
      setByBranchAll(branchAllRes.data || [])
      setContracts(contractRes.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [broker, lf.buildParams, lf.buildParamsNoBranch])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${C.olive}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!profile || !profile.broker) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: C.gray }}>Aucun courtier trouvé : <strong>{broker}</strong></p>
      <button onClick={() => navigate('/analyse-courtiers')} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: `1px solid ${C.olive}`, color: C.olive, background: 'transparent', cursor: 'pointer', fontWeight: 700 }}>
        ← Retour
      </button>
    </div>
  )

  const role = roleConfig(profile.retro_role)

  const sortedContracts = [...contracts].sort((a, b) => {
    const va = a[contractSort.key] ?? 0
    const vb = b[contractSort.key] ?? 0
    return contractSort.dir === 'desc' ? vb - va : va - vb
  })

  const handleContractSort = (key: string) => {
    if (contractSort.key === key) setContractSort(p => ({ ...p, dir: p.dir === 'desc' ? 'asc' : 'desc' }))
    else setContractSort({ key, dir: 'desc' })
  }

  const CSortIcon = ({ col }: { col: string }) => {
    if (contractSort.key === col) return null
    return contractSort.dir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* ── Panneau de filtres local — uses shared component ───────────── */}
      <div className="flex-shrink-0 z-40 bg-[var(--color-off-white)] pt-1 pb-4" style={{ marginTop: '-10px', paddingLeft: 32, paddingRight: 32 }}>
        <LocalFilterPanel
          filters={lf}
          allBranches={filterOptions?.branc ?? []}
          uwYears={filterOptions?.underwriting_years ?? []}
          typeSpcOptions={filterOptions?.type_contrat_spc ?? []}
          typeOfContractOptions={filterOptions?.type_of_contract ?? []}
        />
      </div>
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 32px 100px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>

      {/* Back + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button onClick={() => navigate('/analyse-courtiers')} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
          border: `1px solid ${C.grayLight}`, background: 'white', cursor: 'pointer',
          fontSize: '0.78rem', fontWeight: 600, color: C.navy,
        }}>
          <ArrowLeft size={14} /> Retour
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${role.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={22} color={role.color} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: C.navy, margin: 0 }}>{broker}</h1>
                <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700, background: role.bg, color: role.color }}>{role.label}</span>
              </div>
              <p style={{ fontSize: '0.76rem', color: C.gray, margin: 0 }}>
                {profile.cedantes?.length || 0} cédantes • {profile.branches?.length || 0} branches • {profile.pays?.length || 0} pays
              </p>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', background: C.grayLight, padding: 3, borderRadius: 10 }}>
          {(['overview', 'contracts'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 16px', borderRadius: 8, fontSize: '0.76rem', fontWeight: 700, border: 'none', cursor: 'pointer',
              background: tab === t ? 'white' : 'transparent', color: tab === t ? C.navy : C.gray,
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
            }}>
              {t === 'overview' ? 'Vue d\'ensemble' : `Contrats (${contracts.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Volume', value: `${fmtMAD(profile.total_written_premium || 0)} MAD`, icon: DollarSign, color: C.navy },
              { label: 'Résultat', value: `${fmtMAD(profile.total_resultat || 0)} MAD`, icon: TrendingUp, color: (profile.total_resultat || 0) >= 0 ? C.green : C.red },
              { label: 'ULR', value: formatPercent(profile.avg_ulr), icon: Activity, color: ulrColorDecimal(profile.avg_ulr) },
              { label: 'Contrats', value: String(profile.contract_count || 0), icon: FileText, color: C.blue },
              { label: 'PMD Rétro', value: `${fmtMAD(profile.retro_pmd_placee || 0)} MAD`, icon: Shield, color: C.orange },
              { label: 'Solde Net', value: `${profile.solde_net >= 0 ? '+' : ''}${fmtMAD(profile.solde_net || 0)} MAD`, icon: TrendingUp, color: (profile.solde_net || 0) >= 0 ? C.green : C.red },
            ].map(k => (
              <div key={k.label} style={{
                background: 'white', borderRadius: 14, padding: '16px 18px',
                border: `1px solid ${C.grayLight}`, boxShadow: '0 2px 12px hsla(209,28%,14%,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <k.icon size={14} color={k.color} />
                  <span style={{ fontSize: '0.68rem', color: C.gray, fontWeight: 600 }}>{k.label}</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: C.navy }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Charts: 1 colonne — Évolution d'abord, puis Branches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 }}>

            {/* Évolution Historique (Année de Souscription) */}
            <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.grayLight}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <TrendingUp size={16} color={C.navy} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, margin: 0 }}>
                  Évolution Historique (Année de Souscription)
                </h3>
              </div>
              {byYear.length > 0 ? (
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={byYear} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grayLight} />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: C.gray }} />
                      <YAxis yAxisId="left" tickFormatter={v => fmtMAD(v)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: C.gray }} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${(v*100).toFixed(0)}%`} domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: C.gray }} />
                      <Tooltip content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', color: C.navy, padding: '12px 14px', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: `1px solid ${C.grayLight}`, fontSize: '0.73rem' }}>
                            <div style={{ fontWeight: 800, marginBottom: 8 }}>Année {label}</div>
                            {payload.map((entry: any, i: number) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
                                <span style={{ opacity: 0.7 }}>{entry.name}</span>
                                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: entry.dataKey === 'avg_ulr' ? C.orange : entry.color }}>
                                  {entry.dataKey === 'avg_ulr' ? formatPercent(entry.value) : fmtMAD(entry.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      }} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                      <Bar yAxisId="left" dataKey="total_written_premium" name="Prime Écrite" fill={C.navy} radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="total_resultat" name="Résultat Net" radius={[4, 4, 0, 0]}>
                        {byYear.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.total_resultat >= 0 ? C.olive : C.red} />
                        ))}
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="avg_ulr" name="Loss Ratio" stroke={C.orange} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: C.gray }}>Pas de données</div>
              )}
            </div>

            {/* Répartition par Branche (Primes) */}
            <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.grayLight}` }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 16 }}>
                Répartition par Branche (Primes)
              </h3>
              {byBranchAll.length > 0 ? (() => {
                const pieData = byBranchAll.slice(0, 10).map((d: any) => ({ name: d.branche, value: d.total_written_premium || 0 }))
                const hasFilter = lf.state.branches.length > 0
                let colorIdx = 0
                const branchColorMap: Record<string, string> = {}
                pieData.forEach(d => {
                  if (!hasFilter || lf.state.branches.includes(d.name)) {
                    branchColorMap[d.name] = BRANCH_COLORS[colorIdx % BRANCH_COLORS.length]
                    colorIdx++
                  } else {
                    branchColorMap[d.name] = '#111111'
                  }
                })
                const RADIAN = Math.PI / 180
                const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
                  if (percent < 0.04) return null
                  const radius = outerRadius + 28
                  const x = cx + radius * Math.cos(-midAngle * RADIAN)
                  const y = cy + radius * Math.sin(-midAngle * RADIAN)
                  const isHighlighted = !hasFilter || lf.state.branches.includes(name)
                  return (
                    <text x={x} y={y} fill={isHighlighted ? C.navy : C.gray} textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central" fontSize={11} fontWeight={isHighlighted ? 700 : 500}
                      style={{ pointerEvents: 'none', opacity: isHighlighted ? 1 : 0.55 }}>
                      {`${name} (${(percent * 100).toFixed(1)}%)`}
                    </text>
                  )
                }
                return (
                  <div style={{ height: 440 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 20, right: 140, bottom: 20, left: 140 }}>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={90}
                          outerRadius={150}
                          paddingAngle={2}
                          dataKey="value"
                          labelLine={true}
                          label={renderCustomLabel}
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={branchColorMap[entry.name]}
                              opacity={1}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => `${fmtMAD(val)} MAD`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )
              })() : (
                <div style={{ padding: 40, textAlign: 'center', color: C.gray }}>Pas de données</div>
              )}
            </div>

          </div>

          {/* Info panels: Cedantes + Pays */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.grayLight}` }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 10 }}>
                <Users size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                Cédantes Servies ({profile.cedantes?.length || 0})
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(profile.cedantes || []).slice(0, 25).map((c: string) => (
                  <span key={c} style={{ padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, background: `${C.navy}0A`, color: C.navy, border: `1px solid ${C.grayLight}` }}>
                    {c}
                  </span>
                ))}
                {(profile.cedantes?.length || 0) > 25 && <span style={{ color: C.gray, fontSize: '0.7rem', fontWeight: 600, alignSelf: 'center' }}>+{profile.cedantes.length - 25} autres</span>}
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.grayLight}` }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 10 }}>
                <Globe size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                Pays d'Exposition ({profile.pays?.length || 0})
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(profile.pays || []).slice(0, 25).map((p: string) => (
                  <span key={p} style={{ padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, background: `${C.blue}0A`, color: C.blue, border: `1px solid ${C.grayLight}` }}>
                    {p}
                  </span>
                ))}
                {(profile.pays?.length || 0) > 25 && <span style={{ color: C.gray, fontSize: '0.7rem', fontWeight: 600, alignSelf: 'center' }}>+{profile.pays.length - 25} autres</span>}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'contracts' && (
        <div style={{ background: 'white', borderRadius: 14, border: `1px solid ${C.grayLight}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.grayLight}`, background: '#fafbfc' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, margin: 0 }}>
              <FileText size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
              Détail des Contrats ({contracts.length})
            </h3>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 600 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.grayLight}`, position: 'sticky', top: 0, background: '#fafbfc', zIndex: 2 }}>
                  {[
                    { key: 'policy_id', label: 'N° Police', align: 'left' },
                    { key: 'cedante', label: 'Cédante', align: 'left' },
                    { key: 'branche', label: 'Branche', align: 'left' },
                    { key: 'pays_risque', label: 'Pays', align: 'left' },
                    { key: 'uw_year', label: 'UY', align: 'center' },
                    { key: 'type_contrat', label: 'Type', align: 'center' },
                    { key: 'written_premium', label: 'Prime', align: 'right' },
                    { key: 'resultat', label: 'Résultat', align: 'right' },
                    { key: 'ulr', label: 'ULR', align: 'right' },
                    { key: 'share_signed', label: 'Part %', align: 'right' },
                    { key: 'commission', label: 'Commission', align: 'right' },
                    { key: 'status', label: 'Statut', align: 'center' },
                  ].map(h => (
                    <th key={h.key} onClick={() => handleContractSort(h.key)} style={{
                      padding: '10px 10px', textAlign: h.align as any, fontWeight: 700, color: C.gray,
                      cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.7rem',
                    }}>
                      {h.label} <CSortIcon col={h.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedContracts.map((c: any, i: number) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.grayLight}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafcff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: C.navy, fontWeight: 600 }}>{c.policy_id || '—'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: C.navy }}>{c.cedante || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{c.branche || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{c.pays_risque || '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace' }}>{c.uw_year || '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, background: `${C.blue}14`, color: C.blue }}>{c.type_contrat || '—'}</span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmtMAD(c.written_premium)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: c.resultat >= 0 ? C.green : C.red }}>{fmtMAD(c.resultat)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 700, color: 'white', background: ulrColorDecimal(c.ulr) }}>{formatPercent(c.ulr)}</span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{(c.share_signed || 0).toFixed(1)}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{(c.commission || 0).toFixed(1)}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 7px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 700,
                        background: c.status === 'Active' ? `${C.green}14` : `${C.gray}14`,
                        color: c.status === 'Active' ? C.green : C.gray,
                      }}>{c.status || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
