import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import {
  ArrowLeft, Briefcase, DollarSign, TrendingUp, Shield, Activity,
  Users, Globe, FileText, ChevronDown, ChevronUp,
} from 'lucide-react'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { formatCompact, formatPercent } from '../utils/formatters'

const C = {
  navy: 'hsl(209,35%,16%)', olive: 'hsl(83,52%,36%)', oliveLight: 'hsl(83,50%,55%)',
  orange: 'hsl(28,88%,55%)', red: 'hsl(358,66%,54%)', blue: 'hsl(209,60%,55%)',
  green: 'hsl(145,55%,42%)', gray: 'hsl(218,14%,65%)', grayLight: 'hsl(218,22%,92%)',
}
const CHART_PAL = ['#1E3A5F', '#4E6820', '#E67E22', '#3498DB', '#9B59B6', '#1ABC9C', '#E74C3C', '#2C3E50']

const fmtMAD = (v: number) => {
  if (Math.abs(v) >= 1e9) return `${(v/1e9).toFixed(1)} Md`
  if (Math.abs(v) >= 1e6) return `${(v/1e6).toFixed(1)} M`
  if (Math.abs(v) >= 1e3) return `${(v/1e3).toFixed(0)} K`
  return v.toLocaleString('fr-FR')
}
const ulrColor = (ulr: number | null) => {
  if (!ulr) return C.gray
  if (ulr <= 0.5) return C.green
  if (ulr <= 0.7) return C.olive
  if (ulr <= 0.9) return C.orange
  return C.red
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

  const [profile, setProfile] = useState<any>(null)
  const [byYear, setByYear] = useState<any[]>([])
  const [byBranch, setByBranch] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'contracts'>('overview')
  const [contractSort, setContractSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'written_premium', dir: 'desc' })

  const loadData = useCallback(async () => {
    if (!broker) return
    setLoading(true)
    try {
      const [profRes, yearRes, branchRes, contractRes] = await Promise.all([
        api.get(API_ROUTES.BROKER.PROFILE, { params: { broker } }),
        api.get(API_ROUTES.BROKER.BY_YEAR, { params: { broker } }),
        api.get(API_ROUTES.BROKER.BY_BRANCH, { params: { broker } }),
        api.get(API_ROUTES.BROKER.CONTRACTS, { params: { broker } }),
      ])
      setProfile(profRes.data || null)
      setByYear(yearRes.data || [])
      setByBranch(branchRes.data || [])
      setContracts(contractRes.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [broker])

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
    if (contractSort.key !== col) return null
    return contractSort.dir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
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
              { label: 'ULR', value: formatPercent(profile.avg_ulr), icon: Activity, color: ulrColor(profile.avg_ulr) },
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

          {/* Charts: Evolution + Branches */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Evolution par année */}
            <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.grayLight}` }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 16 }}>
                Évolution Annuelle
              </h3>
              {byYear.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={byYear} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tickFormatter={v => fmtMAD(v)} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fontSize: 10 }} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div style={{ background: 'white', borderRadius: 10, padding: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: `1px solid ${C.grayLight}`, fontSize: '0.73rem' }}>
                          <div style={{ fontWeight: 800, color: C.navy, marginBottom: 6 }}>{label}</div>
                          {payload.map((p: any) => (
                            <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
                              <span style={{ color: C.gray }}>{p.name}</span>
                              <span style={{ fontWeight: 700, color: p.color }}>{p.name === 'ULR' ? formatPercent(p.value) : fmtMAD(p.value) + ' MAD'}</span>
                            </div>
                          ))}
                        </div>
                      )
                    }} />
                    <Line yAxisId="left" type="monotone" dataKey="total_written_premium" name="Primes" stroke={C.navy} strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line yAxisId="left" type="monotone" dataKey="total_resultat" name="Résultat" stroke={C.olive} strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="avg_ulr" name="ULR" stroke={C.orange} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: C.gray }}>Pas de données</div>
              )}
            </div>

            {/* Répartition par branche */}
            <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.grayLight}` }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 16 }}>
                Répartition par Branche
              </h3>
              {byBranch.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={byBranch} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3}
                        dataKey="total_written_premium" nameKey="branche"
                        label={({ branche, percent }) => percent > 0.05 ? `${branche} ${(percent * 100).toFixed(0)}%` : ''}>
                        {byBranch.map((_, i) => <Cell key={i} fill={CHART_PAL[i % CHART_PAL.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${fmtMAD(v)} MAD`} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Branch table */}
                  <div style={{ maxHeight: 140, overflowY: 'auto', marginTop: 10 }}>
                    {byBranch.map((b, i) => (
                      <div key={b.branche} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.grayLight}`, fontSize: '0.73rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_PAL[i % CHART_PAL.length], display: 'inline-block' }} />
                          <span style={{ fontWeight: 600, color: C.navy }}>{b.branche}</span>
                        </span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: C.gray }}>{fmtMAD(b.total_written_premium)} MAD</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
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
                {sortedContracts.map((c, i) => (
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
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 700, color: 'white', background: ulrColor(c.ulr) }}>{formatPercent(c.ulr)}</span>
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
  )
}
