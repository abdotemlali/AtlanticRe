import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts'
import {
  Briefcase, TrendingUp, DollarSign, Shield,
  ArrowRight, Users, Activity, ChevronUp, ChevronDown,
} from 'lucide-react'
import Select from 'react-select'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { useData } from '../context/DataContext'
import { formatCompact, formatPercent, ulrColorDecimal } from '../utils/formatters'
import { useLocalFilters } from '../hooks/useLocalFilters'
import LocalFilterPanel from '../components/LocalFilterPanel'
import { C, CHART_PALETTE } from '../constants/styles'
import type { BrokerRow } from '../types/kpis.types'

type SortKey = 'total_written_premium' | 'total_resultat' | 'avg_ulr' | 'contract_count'

const fmtMAD = (v: number) => {
  if (Math.abs(v) >= 1e9) return `${(v/1e9).toFixed(1)} Md`
  if (Math.abs(v) >= 1e6) return `${(v/1e6).toFixed(1)} M`
  if (Math.abs(v) >= 1e3) return `${(v/1e3).toFixed(0)} K`
  return v.toLocaleString('fr-FR')
}

const roleStyle = (role: string) => {
  if (role === 'double') return { bg: '#EEF3E6', color: C.olive, label: 'Double Rôle' }
  if (role === 'placeur') return { bg: '#FEF5EC', color: C.orange, label: 'Placeur' }
  return { bg: '#E8EDF1', color: C.navy, label: 'Apporteur' }
}

export default function BrokerAnalysis() {
  const navigate = useNavigate()
  const { filterOptions } = useData()

  // ── Shared local filters (replaces ~80 lines of state + logic) ──────────
  const lf = useLocalFilters()

  // ── Sort & search ──────────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState<SortKey>('total_written_premium')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

  // ── Data ───────────────────────────────────────────────────────────────────
  const [brokers, setBrokers] = useState<any[]>([])
  const [retroCourtiers, setRetroCourtiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const p = lf.buildParams
      const [brkRes, retRes] = await Promise.all([
        api.get(API_ROUTES.KPIS.TOP_BROKERS, { params: { ...p, limit: 500, sort_by: 'total_written_premium' } }),
        api.get(API_ROUTES.RETRO.BY_COURTIER, { params: { uw: p.uw_years_raw } }).catch(() => ({ data: [] })),
      ])
      setBrokers((brkRes.data || []).filter((d: any) => d.broker && d.broker !== 'nan'))
      setRetroCourtiers(retRes.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [lf.buildParams])

  useEffect(() => { loadData() }, [loadData])

  // ── Merge retro data into broker rows ─────────────────────────────────────
  const merged: BrokerRow[] = useMemo(() => {
    const retMap = new Map<string, any>()
    retroCourtiers.forEach((r: any) => retMap.set(r.courtier, r))

    return brokers.map(b => {
      const retro = retMap.get(b.broker)
      const pmd_placee = retro?.pmd_placee || 0
      const courtage_retro = retro?.courtage_percu || 0
      const retro_role = retro ? (b.contract_count > 0 ? 'double' : 'placeur') : 'apporteur'
      const solde_net = (b.total_written_premium || 0) - pmd_placee
      return { ...b, pmd_placee, courtage_retro, retro_role, solde_net }
    })
  }, [brokers, retroCourtiers])

  // ── Filter + sort table ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = merged as any[]
    if (search) {
      const s = search.toLowerCase()
      data = data.filter(d => d.broker.toLowerCase().includes(s))
    }
    data = [...data].sort((a, b) => {
      const va = a[sortBy] ?? 0
      const vb = b[sortBy] ?? 0
      return sortDir === 'desc' ? vb - va : va - vb
    })
    return data
  }, [merged, search, sortBy, sortDir])

  // ── KPI aggregations ──────────────────────────────────────────────────────
  const agg = useMemo(() => {
    const total_wp = merged.reduce((s, b) => s + (b.total_written_premium || 0), 0)
    const total_res = merged.reduce((s, b) => s + (b.total_resultat || 0), 0)
    const total_pmd = merged.reduce((s, b) => s + (b.pmd_placee || 0), 0)
    const avgUlr = merged.length > 0
      ? merged.reduce((s, b) => s + (b.avg_ulr || 0), 0) / merged.filter(b => b.avg_ulr !== null).length
      : 0
    return { total_wp, total_res, total_pmd, avgUlr, count: merged.length }
  }, [merged])

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortBy !== col) return null
    return sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
  }

  // Top 10 chart data
  const chartData = useMemo(() => filtered.slice(0, 10), [filtered])

  // Role distribution for pie
  const rolePie = useMemo(() => {
    const dbl = merged.filter(b => b.retro_role === 'double').length
    const plc = merged.filter(b => b.retro_role === 'placeur').length
    const app = merged.filter(b => b.retro_role === 'apporteur').length
    return [
      { name: 'Double Rôle', value: dbl, color: C.olive },
      { name: 'Placeur seul', value: plc, color: C.orange },
      { name: 'Apporteur seul', value: app, color: C.navy },
    ].filter(d => d.value > 0)
  }, [merged])

  const [filterPanelOpen, setFilterPanelOpen] = useState(false)

  return (
    <div className="flex flex-col h-full animate-fade-in">

      {/* ── Panneau de filtres local — uses shared component ───────────── */}
      <div className="flex-shrink-0 z-40 bg-[var(--color-off-white)] pt-1 pb-2 px-2">
        <LocalFilterPanel
          filters={lf}
          allBranches={filterOptions?.branc ?? []}
          uwYears={filterOptions?.underwriting_years ?? []}
          typeSpcOptions={filterOptions?.type_contrat_spc ?? []}
          typeOfContractOptions={filterOptions?.type_of_contract ?? []}
        />
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 p-2 pb-12">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'white', padding: '16px 24px', borderRadius: 14,
        border: `1px solid ${C.grayLight}`, boxShadow: '0 2px 12px hsla(209,28%,14%,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.olive}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={22} color={C.olive} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: C.navy, margin: 0 }}>Analyse Courtiers</h1>
            <p style={{ fontSize: '0.78rem', color: C.gray, margin: 0 }}>Vue consolidée — Contrats & Rétrocession</p>
          </div>
        </div>

        {/* ── Champ recherche courtier avec react-select ─────────────── */}
        <div style={{ width: 300, zIndex: 10 }}>
          <Select 
            options={[...merged].sort((a,b) => b.total_written_premium - a.total_written_premium).map(b => ({ value: b.broker, label: b.broker }))}
            value={null}
            onChange={(v: any) => {
              if (v?.value) {
                navigate(`/analyse-courtiers/${encodeURIComponent(v.value)}`)
              }
            }}
            placeholder="Rechercher un courtier..."
            isClearable
            menuPortalTarget={document.body}
            styles={{
              menuPortal: base => ({ ...base, zIndex: 9999 }),
              control: base => ({
                ...base,
                minHeight: '40px',
                borderRadius: '0.75rem',
                borderColor: 'var(--color-gray-100)',
                fontSize: '0.78rem'
              }),
              option: base => ({
                ...base,
                fontSize: '0.78rem'
              })
            }}
          />
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {[
          { label: 'Courtiers', value: String(agg.count), icon: Users, color: C.blue },
          { label: 'Volume Total', value: `${fmtMAD(agg.total_wp)} MAD`, icon: DollarSign, color: C.navy },
          { label: 'Résultat Total', value: `${fmtMAD(agg.total_res)} MAD`, icon: TrendingUp, color: agg.total_res >= 0 ? C.green : C.red },
          { label: 'PMD Rétro', value: `${fmtMAD(agg.total_pmd)} MAD`, icon: Shield, color: C.orange },
          { label: 'ULR Moyen', value: formatPercent(agg.avgUlr), icon: Activity, color: ulrColorDecimal(agg.avgUlr) },
        ].map(k => (
          <div key={k.label} style={{
            background: 'white', borderRadius: 14, padding: '18px 20px',
            border: `1px solid ${C.grayLight}`, boxShadow: '0 2px 12px hsla(209,28%,14%,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${k.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={16} color={k.color} />
              </div>
              <span style={{ fontSize: '0.72rem', color: C.gray, fontWeight: 600 }}>{k.label}</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: C.navy }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row (Top 10 + Pie) ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Top 10 Bar */}
        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.grayLight}` }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 16 }}>
            <TrendingUp size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
            Top 10 Courtiers par {sortBy === 'avg_ulr' ? 'ULR' : sortBy === 'total_resultat' ? 'Résultat' : 'Volume'}
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 90 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
              <XAxis type="number" tickFormatter={v => sortBy === 'avg_ulr' ? `${(v*100).toFixed(0)}%` : fmtMAD(v)} tick={{ fontSize: 11 }} />
              <YAxis dataKey="broker" type="category" tick={{ fontSize: 10 }} width={85} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                const rs = roleStyle(d.retro_role)
                return (
                  <div style={{ background: 'white', borderRadius: 10, padding: '12px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: `2px solid ${rs.color}`, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, color: C.navy }}>{d.broker}</span>
                      <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 700, background: rs.bg, color: rs.color }}>{rs.label}</span>
                    </div>
                    <div style={{ fontSize: '0.73rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 10px' }}>
                      <span style={{ color: C.gray }}>Volume</span><span style={{ fontWeight: 600, textAlign: 'right' }}>{fmtMAD(d.total_written_premium)} MAD</span>
                      <span style={{ color: C.gray }}>Résultat</span><span style={{ fontWeight: 600, textAlign: 'right', color: d.total_resultat >= 0 ? C.green : C.red }}>{fmtMAD(d.total_resultat)} MAD</span>
                      <span style={{ color: C.gray }}>ULR</span><span style={{ fontWeight: 600, textAlign: 'right', color: ulrColorDecimal(d.avg_ulr) }}>{formatPercent(d.avg_ulr)}</span>
                      {d.pmd_placee > 0 && <><span style={{ color: C.gray }}>PMD Rétro</span><span style={{ fontWeight: 600, textAlign: 'right' }}>{fmtMAD(d.pmd_placee)} MAD</span></>}
                      <div style={{ gridColumn: '1/-1', borderTop: `1px solid ${C.grayLight}`, margin: '2px 0' }} />
                      <span style={{ fontWeight: 700 }}>Solde Net</span><span style={{ fontWeight: 800, textAlign: 'right', color: d.solde_net >= 0 ? C.green : C.red }}>{d.solde_net >= 0 ? '+' : ''}{fmtMAD(d.solde_net)} MAD</span>
                    </div>
                  </div>
                )
              }} />
              <Bar dataKey={sortBy} radius={[0, 6, 6, 0]} cursor="pointer"
                onClick={(d: any) => navigate(`/analyse-courtiers/${encodeURIComponent(d.broker)}`)}>
                {chartData.map((e: any, i: number) => (
                  <Cell key={i} fill={sortBy === 'avg_ulr' ? ulrColorDecimal(e.avg_ulr) : sortBy === 'total_resultat' ? (e.total_resultat >= 0 ? C.olive : C.red) : CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Role Pie */}
        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.grayLight}` }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 16 }}>
            Répartition par Rôle
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={rolePie} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {rolePie.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `${v} courtiers`} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            {rolePie.map(r => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: C.gray }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, display: 'inline-block' }} />
                <span style={{ fontWeight: 600 }}>{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 14, border: `1px solid ${C.grayLight}`, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.grayLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, margin: 0 }}>
            Tous les Courtiers ({filtered.length})
          </h3>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['total_written_premium', 'total_resultat', 'avg_ulr'] as SortKey[]).map(k => (
              <button key={k} onClick={() => handleSort(k)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                border: `1px solid ${sortBy === k ? C.olive : C.grayLight}`,
                background: sortBy === k ? `${C.olive}14` : 'transparent',
                color: sortBy === k ? C.olive : C.gray, cursor: 'pointer',
              }}>
                {k === 'total_written_premium' ? 'Volume' : k === 'total_resultat' ? 'Résultat' : 'ULR'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 600 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.grayLight}`, position: 'sticky', top: 0, background: '#fafbfc', zIndex: 2 }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: C.gray, width: 40 }}>#</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: C.gray }}>Courtier</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: C.gray, width: 80 }}>Rôle</th>
                <th onClick={() => handleSort('total_written_premium')} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.gray, cursor: 'pointer', whiteSpace: 'nowrap' }}>Primes <SortIcon col="total_written_premium" /></th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.gray }}>PMD Rétro</th>
                <th onClick={() => handleSort('total_resultat')} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.gray, cursor: 'pointer', whiteSpace: 'nowrap' }}>Résultat <SortIcon col="total_resultat" /></th>
                <th onClick={() => handleSort('avg_ulr')} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.gray, cursor: 'pointer', whiteSpace: 'nowrap' }}>ULR <SortIcon col="avg_ulr" /></th>
                <th onClick={() => handleSort('contract_count')} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.gray, cursor: 'pointer' }}>Contrats <SortIcon col="contract_count" /></th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: C.gray }}>Solde Net</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 && (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: C.gray }}>Chargement...</td></tr>
              )}
              {filtered.map((d: any, i: number) => {
                const rs = roleStyle(d.retro_role)
                return (
                  <tr key={d.broker}
                    onClick={() => navigate(`/analyse-courtiers/${encodeURIComponent(d.broker)}`)}
                    style={{ borderBottom: `1px solid ${C.grayLight}`, cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '10px 16px', fontSize: '0.7rem', color: C.gray, fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: C.navy }}>{d.broker}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 700, background: rs.bg, color: rs.color }}>{rs.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmtMAD(d.total_written_premium)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, color: d.pmd_placee > 0 ? C.orange : C.gray }}>{d.pmd_placee > 0 ? fmtMAD(d.pmd_placee) : '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: d.total_resultat >= 0 ? C.green : C.red }}>{fmtMAD(d.total_resultat)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      {d.avg_ulr !== null && (
                        <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700, color: 'white', background: ulrColorDecimal(d.avg_ulr) }}>{formatPercent(d.avg_ulr)}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', color: C.gray, fontWeight: 600 }}>{d.contract_count}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: d.solde_net >= 0 ? C.green : C.red }}>
                      {d.solde_net >= 0 ? '+' : ''}{fmtMAD(d.solde_net)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}><ArrowRight size={13} color={C.gray} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  )
}
