import React, { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { formatCompact } from '../utils/formatters'
import type {
  RetroFilters, RetroOptions, RetroSummary, RetroTraite,
  RetroByYear, RetroByNature, RetroCourtier, RetroCourtierCroise,
  RetroPlacementStatus,
} from '../types/retro'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, CartesianGrid,
  ScatterChart, Scatter, ZAxis,
} from 'recharts'
import {
  TrendingUp, Shield, Users, DollarSign, AlertTriangle,
  ChevronDown, ChevronRight, Percent, Download,
} from 'lucide-react'

// ── Colors ───────────────────────────────────────────────────────────────────
const COLORS = {
  navy: 'hsl(209,35%,16%)',
  olive: 'hsl(83,52%,36%)',
  oliveLight: 'hsl(83,50%,55%)',
  orange: 'hsl(28,88%,55%)',
  red: 'hsl(358,66%,54%)',
  blue: 'hsl(209,60%,55%)',
  green: 'hsl(145,55%,42%)',
  gray: 'hsl(218,14%,65%)',
  bgCard: 'hsla(209,35%,16%,0.04)',
  borderCard: 'hsl(218,22%,92%)',
}

const CHART_COLORS = ['#4E6820', '#E67E22', '#3498DB', '#9B59B6', '#1ABC9C', '#E74C3C', '#F1C40F', '#2C3E50']
const ROLE_CONFIG = {
  double:    { label: 'Double Rôle', color: '#4E6820', bg: '#EEF3E6' },
  apporteur: { label: 'Apporteur',   color: '#2D3E50', bg: '#E8EDF1' },
  placeur:   { label: 'Placeur',     color: '#E67E22', bg: '#FEF5EC' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtMAD = (v: number) => {
  if (v >= 1e9) return `${(v/1e9).toFixed(1)} Md`
  if (v >= 1e6) return `${(v/1e6).toFixed(1)} M`
  if (v >= 1e3) return `${(v/1e3).toFixed(0)} K`
  return v.toLocaleString('fr-FR')
}

const buildQuery = (filters: RetroFilters) => {
  const p: Record<string, string> = {}
  if (filters.uy.length) p.uy = filters.uy.join(',')
  if (filters.nature) p.nature = filters.nature
  if (filters.traite) p.traite = filters.traite
  if (filters.courtier) p.courtier = filters.courtier
  return p
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub?: string; color: string; icon: any
}) {
  return (
    <div style={{
      background: 'white', borderRadius: 14, padding: '20px 22px',
      border: `1px solid ${COLORS.borderCard}`,
      boxShadow: '0 2px 12px hsla(209,28%,14%,0.06)',
      flex: 1, minWidth: 180,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color} />
        </div>
        <span style={{ fontSize: '0.77rem', color: COLORS.gray, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: COLORS.navy }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: COLORS.gray, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AffairesTraites() {
  const [tab, setTab] = useState<'global' | 'courtier'>('global')
  const [filters, setFilters] = useState<RetroFilters>({
    uy: [], nature: null, traite: null, courtier: null, securite: null, rating_a_only: false,
  })
  const [options, setOptions] = useState<RetroOptions | null>(null)
  const [summary, setSummary] = useState<RetroSummary | null>(null)
  const [traites, setTraites] = useState<RetroTraite[]>([])
  const [byYear, setByYear] = useState<RetroByYear[]>([])
  const [byNature, setByNature] = useState<RetroByNature | null>(null)
  const [courtiers, setCourtiers] = useState<RetroCourtier[]>([])
  const [courtiersCroise, setCourtiersCroise] = useState<RetroCourtierCroise[]>([])
  const [placement, setPlacement] = useState<RetroPlacementStatus[]>([])
  const [expandedTraite, setExpandedTraite] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pursApporteurOpen, setPursApporteurOpen] = useState(false)
  const [pursPlaceurOpen, setPursPlaceurOpen] = useState(false)

  // Load options on mount
  useEffect(() => {
    api.get(API_ROUTES.RETRO.OPTIONS).then(r => setOptions(r.data)).catch(console.error)
  }, [])

  // Load data whenever filters change
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const p = buildQuery(filters)
      const [sumR, trR, yrR, natR, crtR, crxR, plR] = await Promise.all([
        api.get(API_ROUTES.RETRO.SUMMARY, { params: p }),
        api.get(API_ROUTES.RETRO.BY_TRAITE, { params: p }),
        api.get(API_ROUTES.RETRO.BY_YEAR, { params: { traite: p.traite, nature: p.nature } }),
        api.get(API_ROUTES.RETRO.BY_NATURE, { params: { uy: p.uy } }),
        api.get(API_ROUTES.RETRO.BY_COURTIER, { params: p }),
        api.get(API_ROUTES.RETRO.COURTIER_CROISE, { params: { uy: p.uy } }),
        api.get(API_ROUTES.RETRO.PLACEMENT_STATUS, { params: { uy: p.uy } }),
      ])
      setSummary(sumR.data)
      setTraites(trR.data)
      setByYear(yrR.data)
      setByNature(natR.data)
      setCourtiers(crtR.data)
      setCourtiersCroise(crxR.data)
      setPlacement(plR.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { loadData() }, [loadData])

  // ── Filter UI ──────────────────────────────────────────────────────────────
  const FilterPanel = () => (
    <div style={{
      display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      padding: '14px 20px', background: 'white', borderRadius: 12,
      border: `1px solid ${COLORS.borderCard}`, marginBottom: 20,
    }}>
      {/* UY Multi-select */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: COLORS.gray }}>Année :</span>
        {options?.uy_list.map(y => (
          <button key={y} onClick={() => {
            setFilters(f => ({
              ...f,
              uy: f.uy.includes(y) ? f.uy.filter(v => v !== y) : [...f.uy, y]
            }))
          }} style={{
            padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
            border: `1px solid ${filters.uy.includes(y) ? COLORS.olive : COLORS.borderCard}`,
            background: filters.uy.includes(y) ? `${COLORS.olive}18` : 'transparent',
            color: filters.uy.includes(y) ? COLORS.olive : COLORS.gray,
            cursor: 'pointer',
          }}>{y}</button>
        ))}
      </div>
      {/* Nature Select */}
      <select value={filters.nature || ''} onChange={e => setFilters(f => ({ ...f, nature: e.target.value || null }))}
        style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', border: `1px solid ${COLORS.borderCard}`, color: COLORS.navy }}>
        <option value="">Toutes natures</option>
        {options?.natures.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      {/* Traité Select */}
      <select value={filters.traite || ''} onChange={e => setFilters(f => ({ ...f, traite: e.target.value || null }))}
        style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', border: `1px solid ${COLORS.borderCard}`, color: COLORS.navy }}>
        <option value="">Tous les traités</option>
        {options?.traites.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      {/* Reset */}
      <button onClick={() => setFilters({ uy: [], nature: null, traite: null, courtier: null, securite: null, rating_a_only: false })}
        style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, background: '#f1f5f9', color: COLORS.gray, border: 'none', cursor: 'pointer' }}>
        Réinitialiser
      </button>
    </div>
  )

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const TabBtn = ({ id, label }: { id: 'global' | 'courtier'; label: string }) => (
    <button onClick={() => setTab(id)} style={{
      padding: '10px 24px', borderRadius: '10px 10px 0 0', fontSize: '0.82rem', fontWeight: 700,
      background: tab === id ? 'white' : 'transparent',
      color: tab === id ? COLORS.olive : COLORS.gray,
      border: tab === id ? `1px solid ${COLORS.borderCard}` : '1px solid transparent',
      borderBottom: tab === id ? '2px solid white' : 'none',
      cursor: 'pointer', marginBottom: -1,
    }}>{label}</button>
  )

  // ── Placement status color ─────────────────────────────────────────────────
  const placementColor = (pct: number) => pct >= 95 ? COLORS.green : pct >= 85 ? COLORS.orange : COLORS.red

  // ── Pie data ─────────────────────────────────────────────────────────────
  const pieData = byNature ? [
    { name: 'Proportionnel', value: byNature.proportionnel.epi },
    { name: 'Non Proportionnel', value: byNature.non_proportionnel.epi },
  ] : []

  // ── Multi-year: composite labels for bar charts ──────────────────────────
  const multiYear = useMemo(() => {
    const uySet = new Set(traites.map(t => t.uy))
    return uySet.size > 1
  }, [traites])

  const traitesChart = useMemo(() =>
    traites.map(t => ({ ...t, label: multiYear ? `${t.traite} (${t.uy})` : t.traite }))
  , [traites, multiYear])

  const placementChart = useMemo(() =>
    placement.map(p => ({ ...p, label: multiYear ? `${p.traite} (${p.uy})` : p.traite }))
  , [placement, multiYear])

  function exportCourtiers() {
    import('xlsx').then(XLSX => {
      const rows = courtiers.map(c => {
        const croise = courtiersCroise.find(x => x.courtier === c.courtier)
        const role = croise?.role_double ? ROLE_CONFIG.double.label
          : croise?.role_placeur ? ROLE_CONFIG.placeur.label
          : croise?.role_apporteur ? ROLE_CONFIG.apporteur.label
          : c.est_direct ? 'Direct' : 'Placeur'
        return {
          Courtier: c.courtier,
          Rôle: role,
          Traités: c.nb_traites_places,
          'EPI Géré (MAD)': c.epi_gere,
          'PMD Placée (MAD)': c.pmd_placee,
          'Courtage (MAD)': c.courtage_percu,
          'Taux Moy. (%)': c.taux_courtage_moyen,
          Sécurités: c.securites_utilisees.join(', '),
          'Rating>A (%)': c.rating_a_plus_moyen,
        }
      })
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Courtiers')
      const date = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `courtiers_retrocession_${date}.xlsx`)
    })
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Title */}
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: COLORS.navy, marginBottom: 4 }}>
        Rétrocession — Affaires Traités
      </h1>
      <p style={{ fontSize: '0.82rem', color: COLORS.gray, marginBottom: 20 }}>
        Vue d'ensemble des traités de rétrocession et performance des courtiers
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
        <TabBtn id="global" label="Vue Globale" />
        <TabBtn id="courtier" label="Vue par Courtier" />
      </div>

      {/* Filter Panel */}
      <FilterPanel />

      {/* KPI Cards */}
      {summary && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <KPICard label="EPI Total" value={`${fmtMAD(summary.epi_total)} MAD`} sub="Volume de prime protégé" color={COLORS.blue} icon={DollarSign} />
          <KPICard label="PMD Totale" value={`${fmtMAD(summary.pmd_totale)} MAD`} sub="Coût de protection payé" color={COLORS.orange} icon={TrendingUp} />
          <KPICard label="Courtage Total" value={`${fmtMAD(summary.courtage_total)} MAD`} sub="Coût d'intermédiation" color={COLORS.red} icon={DollarSign} />
          <KPICard label="Taux Placement" value={`${summary.taux_placement_moyen}%`} sub="Ratio PMD / EPI" color={COLORS.olive} icon={Percent} />
          <KPICard label="Rating > A" value={`${summary.rating_a_plus_moyen}%`} sub="Part chez sécurités solides" color={summary.rating_a_plus_moyen >= 70 ? COLORS.green : COLORS.orange} icon={Shield} />
        </div>
      )}

      {/* ═════════ TAB: VUE GLOBALE ═════════ */}
      {tab === 'global' && (
        <>
          {/* Charts Row 1 */}
          <div style={{ marginBottom: 24 }}>
            {/* Donut Prop vs Non-Prop */}
            <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${COLORS.borderCard}` }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.navy, marginBottom: 16 }}>
                Répartition Proportionnel / Non Prop.
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtMAD(v) + ' MAD'} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2: PMD by Traité + Placement */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* PMD par Traité */}
            <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${COLORS.borderCard}` }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.navy, marginBottom: 16 }}>
                PMD par Traité{multiYear ? ' (par année)' : ''}
              </h3>
              <ResponsiveContainer width="100%" height={Math.max(260, traitesChart.length * 32)}>
                <BarChart data={traitesChart} layout="vertical" margin={{ left: multiYear ? 150 : 120 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" tickFormatter={fmtMAD} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 10 }} width={multiYear ? 140 : 110} />
                  <Tooltip formatter={(v: number) => fmtMAD(v) + ' MAD'} />
                  <Bar dataKey="pmd_totale" name="PMD Totale" radius={[0, 6, 6, 0]}>
                    {traitesChart.map((t, i) => <Cell key={i} fill={t.nature === 'Proportionnel' ? COLORS.blue : COLORS.orange} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Taux de Placement */}
            <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${COLORS.borderCard}` }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.navy, marginBottom: 16 }}>
                Taux de Placement{multiYear ? ' (par année)' : ''}
              </h3>
              <ResponsiveContainer width="100%" height={Math.max(260, placementChart.length * 32)}>
                <BarChart data={placementChart} layout="vertical" margin={{ left: multiYear ? 150 : 120 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 10 }} width={multiYear ? 140 : 110} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="taux_placement" name="Placement %" radius={[0, 6, 6, 0]} fill={COLORS.blue} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Traité Table */}
          <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${COLORS.borderCard}`, overflowX: 'auto' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.navy, marginBottom: 16 }}>Détail par Traité</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.borderCard}` }}>
                  {['', 'Traité', 'Nature', 'UY', 'EPI', 'PMD 100%', 'PMD Totale', 'Courtage', 'Taux de Plac.%', 'Séc.', 'Rating>A'].map(h => (
                    <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700, color: COLORS.gray, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {traites.map(t => (
                  <React.Fragment key={`${t.traite}-${t.uy}`}>
                    <tr onClick={() => setExpandedTraite(expandedTraite === `${t.traite}-${t.uy}` ? null : `${t.traite}-${t.uy}`)}
                      style={{ borderBottom: `1px solid ${COLORS.borderCard}`, cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 8px' }}>
                        {expandedTraite === `${t.traite}-${t.uy}` ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: COLORS.navy }}>{t.traite}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
                          background: t.nature === 'Proportionnel' ? '#EBF5FB' : '#FEF5EC',
                          color: t.nature === 'Proportionnel' ? COLORS.blue : COLORS.orange,
                        }}>{t.nature === 'Proportionnel' ? 'Prop.' : 'Non Prop.'}</span>
                      </td>
                      <td style={{ padding: '10px 8px' }}>{t.uy}</td>
                      <td style={{ padding: '10px 8px' }}>{fmtMAD(t.epi)}</td>
                      <td style={{ padding: '10px 8px' }}>{fmtMAD(t.pmd_100)}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{fmtMAD(t.pmd_totale)}</td>
                      <td style={{ padding: '10px 8px' }}>{fmtMAD(t.courtage_total)}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{ fontWeight: 700 }}>{t.taux_placement}%</span>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>{t.nb_securites}</td>
                      <td style={{ padding: '10px 8px' }}>{t.rating_a_plus_pct}%</td>
                    </tr>
                    {expandedTraite === `${t.traite}-${t.uy}` && t.securites?.map(s => (
                      <tr key={s.securite} style={{ background: '#f8fafc', borderBottom: `1px solid ${COLORS.borderCard}` }}>
                        <td />
                        <td colSpan={2} style={{ padding: '8px 8px 8px 32px', fontSize: '0.74rem', color: COLORS.navy }}>↳ {s.securite}</td>
                        <td />
                        <td />
                        <td />
                        <td style={{ padding: '8px', fontSize: '0.74rem' }}>{fmtMAD(s.pmd_par_securite)}</td>
                        <td style={{ padding: '8px', fontSize: '0.74rem' }}>{fmtMAD(s.commission_courtage)}</td>
                        <td style={{ padding: '8px', fontSize: '0.74rem', textAlign: 'center' }}>{s.part_pct}%</td>
                        <td colSpan={2} />
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

        </>
      )}

      {/* ═════════ TAB: VUE PAR COURTIER ═════════ */}
      {tab === 'courtier' && (
        <>
          {/* Croisement Chart */}
          {(() => {
            const doubles    = courtiersCroise.filter(c => c.role_double)
            const apporteurs = courtiersCroise.filter(c => !c.role_double && !c.role_placeur)
            const placeurs   = courtiersCroise.filter(c => c.role_placeur && !c.role_double)
            const scatterTooltip = ({ active, payload }: any) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as RetroCourtierCroise
              const role = d.role_double ? ROLE_CONFIG.double : d.role_placeur ? ROLE_CONFIG.placeur : ROLE_CONFIG.apporteur
              const soldeNet = d.primes_apportees - d.pmd_placee
              return (
                <div style={{ background: 'white', borderRadius: 10, padding: '12px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: `2px solid ${role.color}`, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: COLORS.navy }}>{d.courtier}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, background: role.bg, color: role.color }}>{role.label}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', fontSize: '0.75rem' }}>
                    <span style={{ color: COLORS.gray }}>Primes apportées</span>
                    <span style={{ fontWeight: 600, color: COLORS.navy, textAlign: 'right' }}>{fmtMAD(d.primes_apportees)} MAD</span>
                    <span style={{ color: COLORS.gray }}>PMD placée</span>
                    <span style={{ fontWeight: 600, color: COLORS.navy, textAlign: 'right' }}>{fmtMAD(d.pmd_placee)} MAD</span>
                    <span style={{ color: COLORS.gray }}>Courtage rétro</span>
                    <span style={{ fontWeight: 600, color: COLORS.navy, textAlign: 'right' }}>{fmtMAD(d.courtage_retro)} MAD</span>
                    <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${COLORS.borderCard}`, margin: '4px 0' }} />
                    <span style={{ color: COLORS.navy, fontWeight: 700 }}>Volume total</span>
                    <span style={{ fontWeight: 800, color: role.color, textAlign: 'right' }}>{fmtMAD(d.volume_total)} MAD</span>
                    <span style={{ color: COLORS.navy, fontWeight: 700 }}>Solde Net</span>
                    <span style={{ fontWeight: 800, color: soldeNet >= 0 ? COLORS.green : COLORS.red, textAlign: 'right' }}>
                      {soldeNet >= 0 ? '+' : ''}{fmtMAD(soldeNet)} MAD
                    </span>
                  </div>
                </div>
              )
            }
            const pureTableStyle: React.CSSProperties = {
              width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem',
            }
            const thStyle: React.CSSProperties = {
              padding: '5px 8px', textAlign: 'left', color: COLORS.gray,
              fontWeight: 600, borderBottom: `1px solid ${COLORS.borderCard}`,
            }
            const tdStyle: React.CSSProperties = {
              padding: '5px 8px', color: COLORS.navy,
            }
            return (
              <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${COLORS.borderCard}`, marginBottom: 24 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.navy, marginBottom: 4 }}>
                  Croisement : Courtiers Apporteurs × Courtiers Placeurs
                </h3>
                <p style={{ fontSize: '0.72rem', color: COLORS.gray, marginBottom: 16 }}>
                  Scatter : Double Rôle uniquement — Apporteurs &amp; Placeurs purs listés ci-dessous
                </p>

                {/* ── Scatter principal : Double Rôle ── */}
                {doubles.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <ScatterChart margin={{ left: 20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis
                        dataKey="primes_apportees"
                        name="Primes apportées"
                        tickFormatter={fmtMAD}
                        tick={{ fontSize: 10 }}
                        angle={-30}
                        textAnchor="end"
                        interval="preserveStartEnd"
                        label={{ value: 'Primes apportées (contrats)', position: 'insideBottom', offset: -30, fontSize: 11 }}
                      />
                      <YAxis
                        dataKey="pmd_placee"
                        name="PMD placée"
                        tickFormatter={fmtMAD}
                        tick={{ fontSize: 11 }}
                        label={{ value: 'PMD placée (rétro)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
                      />
                      <ZAxis dataKey="volume_total" range={[60, 500]} />
                      <Tooltip content={scatterTooltip} />
                      <Scatter data={doubles} name={ROLE_CONFIG.double.label} fill={ROLE_CONFIG.double.color} />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.gray, fontSize: '0.78rem' }}>
                    Aucun courtier Double Rôle
                  </div>
                )}

                {/* ── Accordions purs ── */}
                {(apporteurs.length > 0 || placeurs.length > 0) && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${COLORS.borderCard}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: apporteurs.length > 0 && placeurs.length > 0 ? '1fr 1fr' : '1fr', gap: 12 }}>
                      {/* Apporteurs purs */}
                      {apporteurs.length > 0 && (
                        <div style={{ border: `1px solid ${COLORS.borderCard}`, borderRadius: 10, overflow: 'hidden' }}>
                          <button
                            onClick={() => setPursApporteurOpen(o => !o)}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '9px 14px', background: ROLE_CONFIG.apporteur.bg,
                              border: 'none', cursor: 'pointer', textAlign: 'left',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: ROLE_CONFIG.apporteur.color, display: 'inline-block', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: ROLE_CONFIG.apporteur.color }}>
                                Apporteurs purs ({apporteurs.length})
                              </span>
                            </div>
                            <ChevronDown
                              size={13}
                              style={{ color: ROLE_CONFIG.apporteur.color, transition: 'transform 0.25s ease', transform: pursApporteurOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
                            />
                          </button>
                          <div style={{ maxHeight: pursApporteurOpen ? `${apporteurs.length * 36 + 48}px` : '0px', overflow: 'hidden', transition: 'max-height 0.3s ease-in-out', opacity: pursApporteurOpen ? 1 : 0 }}>
                            <table style={{ ...pureTableStyle, margin: 0 }}>
                              <thead>
                                <tr>
                                  <th style={thStyle}>Courtier</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Prime apportée</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Volume total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {apporteurs.map((c, i) => (
                                  <tr key={i} style={{ borderBottom: `1px solid ${COLORS.borderCard}` }}>
                                    <td style={tdStyle}>{c.courtier}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtMAD(c.primes_apportees)}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtMAD(c.volume_total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Placeurs purs */}
                      {placeurs.length > 0 && (
                        <div style={{ border: `1px solid ${COLORS.borderCard}`, borderRadius: 10, overflow: 'hidden' }}>
                          <button
                            onClick={() => setPursPlaceurOpen(o => !o)}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '9px 14px', background: ROLE_CONFIG.placeur.bg,
                              border: 'none', cursor: 'pointer', textAlign: 'left',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: ROLE_CONFIG.placeur.color, display: 'inline-block', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: ROLE_CONFIG.placeur.color }}>
                                Placeurs purs ({placeurs.length})
                              </span>
                            </div>
                            <ChevronDown
                              size={13}
                              style={{ color: ROLE_CONFIG.placeur.color, transition: 'transform 0.25s ease', transform: pursPlaceurOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
                            />
                          </button>
                          <div style={{ maxHeight: pursPlaceurOpen ? `${placeurs.length * 36 + 48}px` : '0px', overflow: 'hidden', transition: 'max-height 0.3s ease-in-out', opacity: pursPlaceurOpen ? 1 : 0 }}>
                            <table style={{ ...pureTableStyle, margin: 0 }}>
                              <thead>
                                <tr>
                                  <th style={thStyle}>Courtier</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>PMD placée</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Volume total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {placeurs.map((c, i) => (
                                  <tr key={i} style={{ borderBottom: `1px solid ${COLORS.borderCard}` }}>
                                    <td style={tdStyle}>{c.courtier}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtMAD(c.pmd_placee)}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtMAD(c.volume_total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Légende partagée ── */}
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
                  {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
                      <span style={{ fontSize: '0.72rem', color: COLORS.gray, fontWeight: 600 }}>{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Courtier Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${COLORS.borderCard}` }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.navy, marginBottom: 16 }}>Top Courtiers par PMD Placée</h3>
              <ResponsiveContainer width="100%" height={Math.max(260, courtiers.filter(c => !c.est_direct).length * 36)}>
                <BarChart data={courtiers.filter(c => !c.est_direct).slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" tickFormatter={fmtMAD} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="courtier" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(v: number) => fmtMAD(v) + ' MAD'} />
                  <Bar dataKey="pmd_placee" name="PMD Placée" fill={COLORS.olive} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${COLORS.borderCard}` }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.navy, marginBottom: 16 }}>Taux de Courtage Moyen</h3>
              <ResponsiveContainer width="100%" height={Math.max(260, courtiers.filter(c => !c.est_direct).length * 36)}>
                <BarChart data={courtiers.filter(c => !c.est_direct).slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                  <YAxis dataKey="courtier" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="taux_courtage_moyen" name="Taux Moy." fill={COLORS.orange} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Courtier Table */}
          <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${COLORS.borderCard}`, overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.navy, margin: 0 }}>Tableau des Courtiers</h3>
              <button
                onClick={exportCourtiers}
                disabled={courtiers.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-[var(--color-navy)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download size={14} />
                Exporter Excel
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.borderCard}` }}>
                  {['Courtier', 'Rôle', 'Traités', 'EPI Géré', 'PMD Placée', 'Courtage', 'Taux Moy.', 'Sécurités', 'Rating>A'].map(h => (
                    <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700, color: COLORS.gray, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courtiers.map(c => {
                  const croise = courtiersCroise.find(x => x.courtier === c.courtier)
                  const role = croise?.role_double ? ROLE_CONFIG.double
                    : croise?.role_placeur ? ROLE_CONFIG.placeur
                    : croise?.role_apporteur ? ROLE_CONFIG.apporteur
                    : { label: c.est_direct ? 'Direct' : 'Placeur', color: COLORS.gray, bg: '#f4f6f7' }
                  return (
                    <tr key={c.courtier} style={{ borderBottom: `1px solid ${COLORS.borderCard}` }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: COLORS.navy }}>{c.courtier}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, background: role.bg, color: role.color }}>{role.label}</span>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>{c.nb_traites_places}</td>
                      <td style={{ padding: '10px 8px' }}>{fmtMAD(c.epi_gere)}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{fmtMAD(c.pmd_placee)}</td>
                      <td style={{ padding: '10px 8px' }}>{fmtMAD(c.courtage_percu)}</td>
                      <td style={{ padding: '10px 8px' }}>{c.taux_courtage_moyen}%</td>
                      <td style={{ padding: '10px 8px', fontSize: '0.72rem' }}>{c.securites_utilisees.slice(0, 3).join(', ')}{c.securites_utilisees.length > 3 ? '...' : ''}</td>
                      <td style={{ padding: '10px 8px' }}>{c.rating_a_plus_moyen}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
