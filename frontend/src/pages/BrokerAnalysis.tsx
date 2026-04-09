import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts'
import {
  Briefcase, TrendingUp, DollarSign, Shield, Search,
  ArrowRight, Users, Activity, ChevronUp, ChevronDown, X,
} from 'lucide-react'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { useData } from '../context/DataContext'
import { formatCompact, formatPercent } from '../utils/formatters'
import { getScopedParams } from '../utils/pageFilterScopes'
import ActiveFiltersBar from '../components/ActiveFiltersBar'
import PageFilterPanel from '../components/PageFilterPanel'

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  navy: 'hsl(209,35%,16%)', olive: 'hsl(83,52%,36%)', oliveLight: 'hsl(83,50%,55%)',
  orange: 'hsl(28,88%,55%)', red: 'hsl(358,66%,54%)', blue: 'hsl(209,60%,55%)',
  green: 'hsl(145,55%,42%)', gray: 'hsl(218,14%,65%)', grayLight: 'hsl(218,22%,92%)',
  bg: '#f8fafc',
}
const CHART_PAL = ['#1E3A5F', '#4E6820', '#E67E22', '#3498DB', '#9B59B6', '#1ABC9C', '#E74C3C', '#2C3E50']

const ulrColor = (ulr: number | null) => {
  if (!ulr) return C.gray
  if (ulr <= 0.5) return C.green
  if (ulr <= 0.7) return C.olive
  if (ulr <= 0.9) return C.orange
  return C.red
}
const fmtMAD = (v: number) => {
  if (Math.abs(v) >= 1e9) return `${(v/1e9).toFixed(1)} Md`
  if (Math.abs(v) >= 1e6) return `${(v/1e6).toFixed(1)} M`
  if (Math.abs(v) >= 1e3) return `${(v/1e3).toFixed(0)} K`
  return v.toLocaleString('fr-FR')
}

type SortKey = 'total_written_premium' | 'total_resultat' | 'avg_ulr' | 'contract_count'

export default function BrokerAnalysis() {
  const navigate = useNavigate()
  const { filters } = useData()
  const location = useLocation()
  const [sortBy, setSortBy] = useState<SortKey>('total_written_premium')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')
  const [searchFocus, setSearchFocus] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [brokers, setBrokers] = useState<any[]>([])
  const [retroCourtiers, setRetroCourtiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const p = getScopedParams(location.pathname, filters)
      const [brkRes, retRes] = await Promise.all([
        api.get(API_ROUTES.KPIS.TOP_BROKERS, { params: { ...p, limit: 500, sort_by: 'total_written_premium' } }),
        api.get(API_ROUTES.RETRO.BY_COURTIER, { params: { uy: p.uw_years_raw } }).catch(() => ({ data: [] })),
      ])
      setBrokers((brkRes.data || []).filter((d: any) => d.broker && d.broker !== 'nan'))
      setRetroCourtiers(retRes.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filters, location.pathname])

  useEffect(() => { loadData() }, [loadData])

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocus(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Merge retro data into broker rows
  const merged = useMemo(() => {
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

  // Autocomplete suggestions (must be after merged)
  const searchSuggestions = useMemo(() => {
    if (!search || search.length < 1) return []
    const s = search.toLowerCase()
    return merged
      .filter(b => b.broker.toLowerCase().includes(s))
      .sort((a, b) => a.broker.localeCompare(b.broker))
      .slice(0, 12)
  }, [merged, search])

  // Filter + sort
  const filtered = useMemo(() => {
    let data = merged
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

  // KPI aggregations
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

  const roleStyle = (role: string) => {
    if (role === 'double') return { bg: '#EEF3E6', color: C.olive, label: 'Double Rôle' }
    if (role === 'placeur') return { bg: '#FEF5EC', color: C.orange, label: 'Placeur' }
    return { bg: '#E8EDF1', color: C.navy, label: 'Apporteur' }
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

  return (
    <div className="space-y-4 animate-fade-in p-2 pb-12">
      <ActiveFiltersBar />
      <PageFilterPanel />

      {/* Header */}
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
        <div ref={searchRef} style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: C.gray, zIndex: 3 }} />
          <input
            type="text" value={search}
            onChange={e => { setSearch(e.target.value); setSearchFocus(true) }}
            onFocus={() => setSearchFocus(true)}
            placeholder="Rechercher un courtier..."
            style={{
              padding: '8px 32px 8px 32px', borderRadius: 10,
              border: `1px solid ${searchFocus && search ? C.olive : C.grayLight}`,
              fontSize: '0.78rem', width: 280, outline: 'none', color: C.navy,
              transition: 'border-color 0.2s',
            }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setSearchFocus(false) }}
              style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <X size={14} color={C.gray} />
            </button>
          )}
          {/* Dropdown */}
          {searchFocus && searchSuggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
              background: 'white', borderRadius: 12, border: `1px solid ${C.grayLight}`,
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: 360, overflowY: 'auto',
            }}>
              <div style={{ padding: '8px 12px', fontSize: '0.68rem', color: C.gray, fontWeight: 600, borderBottom: `1px solid ${C.grayLight}` }}>
                {searchSuggestions.length} courtier{searchSuggestions.length > 1 ? 's' : ''} trouvé{searchSuggestions.length > 1 ? 's' : ''}
              </div>
              {searchSuggestions.map(b => {
                const rs = roleStyle(b.retro_role)
                return (
                  <div key={b.broker}
                    onClick={() => { navigate(`/analyse-courtiers/${encodeURIComponent(b.broker)}`); setSearchFocus(false) }}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', transition: 'background 0.12s',
                      borderBottom: `1px solid ${C.grayLight}`,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Briefcase size={13} color={rs.color} />
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', color: C.navy }}>{b.broker}</span>
                      <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700, background: rs.bg, color: rs.color }}>{rs.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.72rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: C.navy }}>{fmtMAD(b.total_written_premium)}</span>
                      <span style={{ padding: '1px 5px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, color: 'white', background: ulrColor(b.avg_ulr) }}>{formatPercent(b.avg_ulr)}</span>
                      <ArrowRight size={12} color={C.gray} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {searchFocus && search && searchSuggestions.length === 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
              background: 'white', borderRadius: 12, border: `1px solid ${C.grayLight}`,
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 50, padding: '16px 14px',
              textAlign: 'center', fontSize: '0.76rem', color: C.gray,
            }}>
              Aucun courtier trouvé pour « {search} »
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {[
          { label: 'Courtiers', value: String(agg.count), icon: Users, color: C.blue },
          { label: 'Volume Total', value: `${fmtMAD(agg.total_wp)} MAD`, icon: DollarSign, color: C.navy },
          { label: 'Résultat Total', value: `${fmtMAD(agg.total_res)} MAD`, icon: TrendingUp, color: agg.total_res >= 0 ? C.green : C.red },
          { label: 'PMD Rétro', value: `${fmtMAD(agg.total_pmd)} MAD`, icon: Shield, color: C.orange },
          { label: 'ULR Moyen', value: formatPercent(agg.avgUlr), icon: Activity, color: ulrColor(agg.avgUlr) },
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

      {/* Charts Row */}
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
                      <span style={{ color: C.gray }}>ULR</span><span style={{ fontWeight: 600, textAlign: 'right', color: ulrColor(d.avg_ulr) }}>{formatPercent(d.avg_ulr)}</span>
                      {d.pmd_placee > 0 && <><span style={{ color: C.gray }}>PMD Rétro</span><span style={{ fontWeight: 600, textAlign: 'right' }}>{fmtMAD(d.pmd_placee)} MAD</span></>}
                      <div style={{ gridColumn: '1/-1', borderTop: `1px solid ${C.grayLight}`, margin: '2px 0' }} />
                      <span style={{ fontWeight: 700 }}>Solde Net</span><span style={{ fontWeight: 800, textAlign: 'right', color: d.solde_net >= 0 ? C.green : C.red }}>{d.solde_net >= 0 ? '+' : ''}{fmtMAD(d.solde_net)} MAD</span>
                    </div>
                  </div>
                )
              }} />
              <Bar dataKey={sortBy} radius={[0, 6, 6, 0]} cursor="pointer"
                onClick={(d: any) => navigate(`/analyse-courtiers/${encodeURIComponent(d.broker)}`)}>
                {chartData.map((e, i) => (
                  <Cell key={i} fill={sortBy === 'avg_ulr' ? ulrColor(e.avg_ulr) : sortBy === 'total_resultat' ? (e.total_resultat >= 0 ? C.olive : C.red) : CHART_PAL[i % CHART_PAL.length]} />
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

      {/* Table */}
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
              {filtered.map((d, i) => {
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
                        <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700, color: 'white', background: ulrColor(d.avg_ulr) }}>{formatPercent(d.avg_ulr)}</span>
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
  )
}
