/**
 * AnalyseCompagnieDetail — Axe 2 / Fiche détaillée d'une compagnie.
 * Route : /modelisation/analyse-compagnie/:company
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
  ReferenceLine,
} from 'recharts'
import CartographieKPIGrid from '../components/cartographie/CartographieKPIGrid'

// ── Constantes ─────────────────────────────────────────────────────────────────
const OLIVE  = 'hsl(83,52%,36%)'
const NAVY   = 'hsl(213,60%,27%)'
const LOB_COLORS = ['hsl(83,52%,42%)', 'hsl(213,60%,35%)']
const TYPE_COLORS: Record<string, string> = {
  Insurance:   OLIVE,
  Reinsurance: NAVY,
}

type TabId = 'kpis' | 'evolution' | 'geo' | 'structure' | 'raw'
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'kpis',      label: 'KPIs & Synthèse',       icon: '📊' },
  { id: 'evolution', label: 'Évolution',              icon: '📈' },
  { id: 'geo',       label: 'Présence Géographique', icon: '🌍' },
  { id: 'structure', label: 'Structure',              icon: '🥧' },
  { id: 'raw',       label: 'Données Brutes',         icon: '📋' },
]

// ── Formatters ─────────────────────────────────────────────────────────────────
function fmtUSD(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} Md USD`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)} Md USD`
  return `${v.toFixed(0)} mn USD`
}
function fmtPct(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return '—'
  return `${v.toFixed(1)}%`
}
function fmtPctSgn(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}
function fmtDensite(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return '—'
  return `$${v.toFixed(1)}/hab`
}

// ── API types ──────────────────────────────────────────────────────────────────
interface CompanyDetail {
  company: string
  type: string
  lob: string[]
  pays: string[]
  evolution: { annee: number; primes_mn_usd: number | null; croissance_pct: number | null; part_marche_pct: number | null }[]
  by_lob: { lob: string; total_primes: number; avg_croissance: number | null }[]
  by_pays: { pays: string; total_primes: number; avg_part_marche: number | null; avg_penetration: number | null; avg_densite: number | null }[]
  kpis: {
    total_primes_mn_usd: number
    avg_croissance_pct: number | null
    avg_penetration_pct: number | null
    avg_densite_usd: number | null
    avg_part_marche_pct: number | null
    nb_pays: number
    nb_annees: number
    derniere_annee: number | null
    primes_derniere_annee: number | null
    meilleure_croissance_pays: string | null
    max_croissance_pct: number | null
  }
  raw_rows: {
    company: string; pays: string; annee: number | null; primes_mn_usd: number | null;
    croissance_pct: number | null; penetration_pct: number | null; densite_usd: number | null;
    part_marche_pct: number | null; lob: string; type: string
  }[]
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TabNav({ activeTab, onTabChange, hiddenTabs = [] }: { activeTab: TabId; onTabChange: (t: TabId) => void; hiddenTabs?: TabId[] }) {
  const visibleTabs = TABS.filter(t => !hiddenTabs.includes(t.id))
  return (
    <div className="bg-white rounded-xl overflow-hidden mb-1"
      style={{ border: '1px solid hsl(0,0%,90%)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div className="flex overflow-x-auto scrollbar-hide">
        {visibleTabs.map((tab, i) => {
          const active = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)}
              className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all relative flex-shrink-0"
              style={active
                ? { color: OLIVE, background: 'hsla(83,52%,42%,0.08)', borderBottom: `2px solid ${OLIVE}` }
                : { color: '#6b7280', borderBottom: '2px solid transparent' }
              }
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {i < visibleTabs.length - 1 && !active && (
                <span className="absolute right-0 top-1/4 bottom-1/4 w-px" style={{ background: 'hsl(0,0%,90%)' }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TabProgress({ activeTab, hiddenTabs = [] }: { activeTab: TabId; hiddenTabs?: TabId[] }) {
  const visibleTabs = TABS.filter(t => !hiddenTabs.includes(t.id))
  const idx = visibleTabs.findIndex(t => t.id === activeTab)
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {visibleTabs.map((_, i) => (
        <div key={i} className="h-1 rounded-full transition-all" style={{
          flex: 1,
          background: i === idx ? OLIVE : i < idx ? `${OLIVE}50` : 'hsl(0,0%,90%)',
        }} />
      ))}
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const isIns = type === 'Insurance'
  return (
    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{
        background: isIns ? 'hsla(83,52%,42%,0.12)' : 'hsla(213,60%,27%,0.12)',
        color: isIns ? OLIVE : NAVY,
        border: `1px solid ${isIns ? 'hsla(83,52%,42%,0.30)' : 'hsla(213,60%,27%,0.30)'}`,
      }}>
      {isIns ? 'Insurance' : 'Reinsurance'}
    </span>
  )
}

function LobBadge({ lob }: { lob: string }) {
  return (
    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
      style={{ background: 'hsla(83,52%,42%,0.08)', color: 'hsl(83,52%,30%)', border: '1px solid hsla(83,52%,42%,0.20)' }}>
      {lob}
    </span>
  )
}

function SortHeader<T extends Record<string, unknown>>({
  col, label, sortKey, sortDir, onSort,
}: {
  col: keyof T; label: string
  sortKey: keyof T | null; sortDir: 'asc' | 'desc'
  onSort: (k: keyof T) => void
}) {
  const active = sortKey === col
  return (
    <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
      style={{ color: active ? OLIVE : '#6b7280' }}
      onClick={() => onSort(col)}>
      {label}<span className="ml-1 text-[10px]">{active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
    </th>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-lg px-3 py-2 text-xs shadow-lg" style={{ border: '1px solid hsl(0,0%,88%)', minWidth: 130 }}>
      {label && <p className="font-bold text-gray-700 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? OLIVE }}>
          {p.name} : <strong>{typeof p.value === 'number' && p.name?.includes('%')
            ? fmtPctSgn(p.value) : typeof p.value === 'number' ? fmtUSD(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Insights auto ──────────────────────────────────────────────────────────────
function buildInsights(data: CompanyDetail): string[] {
  const insights: string[] = []
  const { kpis, by_pays, lob } = data

  if (kpis.avg_croissance_pct != null) {
    const trend = kpis.avg_croissance_pct >= 10
      ? `Forte croissance soutenue de ${fmtPctSgn(kpis.avg_croissance_pct)} en moyenne.`
      : kpis.avg_croissance_pct >= 0
      ? `Croissance positive de ${fmtPctSgn(kpis.avg_croissance_pct)} en moyenne.`
      : `Contraction de ${fmtPctSgn(kpis.avg_croissance_pct)} en moyenne sur la période.`
    insights.push(trend)
  }

  if (by_pays.length > 0) {
    const top = by_pays[0]
    insights.push(`Première présence sur ${top.pays} avec ${fmtUSD(top.total_primes)} de primes cumulées${top.avg_part_marche != null ? ` (${fmtPct(top.avg_part_marche)} du marché local)` : ''}.`)
  }

  if (lob.length === 1) {
    insights.push(`Compagnie spécialisée en ${lob[0]} — activité mono-branche.`)
  } else if (lob.length > 1) {
    insights.push(`Diversifiée sur ${lob.length} branches : ${lob.join(' & ')}.`)
  }

  if (kpis.meilleure_croissance_pays && kpis.max_croissance_pct != null) {
    insights.push(`Meilleure performance de croissance sur ${kpis.meilleure_croissance_pays} (${fmtPctSgn(kpis.max_croissance_pct)}).`)
  }

  return insights.slice(0, 3)
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AnalyseCompagnieDetail() {
  const { company } = useParams<{ company: string }>()
  const navigate = useNavigate()

  const companyName = company ? decodeURIComponent(company) : ''

  const [data, setData]     = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(false)

  const [activeTab, setActiveTab] = useState<TabId>('kpis')

  // Raw table sort
  const [sortKey, setSortKey] = useState<string>('annee')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage]       = useState(1)
  const PAGE_SIZE = 20

  // ── Fetch company data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!companyName) return
    setLoading(true)
    setError(false)
    setActiveTab('kpis')

    fetch(`/api/companies/${encodeURIComponent(companyName)}`)
      .then(r => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [companyName])

  // ── Scroll to top on tab or company change ─────────────────────────────────
  useEffect(() => {
    document.getElementById('scar-main-scroll')?.scrollTo({ top: 0, behavior: 'instant' })
  }, [company, activeTab])

  const handleTabChange = useCallback((t: TabId) => {
    setActiveTab(t)
    document.getElementById('scar-main-scroll')?.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  // ── Raw sort & paginate ────────────────────────────────────────────────────
  const sortedRaw = useMemo(() => {
    if (!data) return []
    return [...data.raw_rows].sort((a, b) => {
      const va = (a as any)[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity)
      const vb = (b as any)[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity)
      if (typeof va === 'number' && typeof vb === 'number')
        return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
  }, [data, sortKey, sortDir])

  const rawTotalPages = Math.ceil(sortedRaw.length / PAGE_SIZE)
  const pagedRaw = sortedRaw.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleRawSort = (k: string) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
    setPage(1)
  }

  // ── Insights ───────────────────────────────────────────────────────────────
  const insights = useMemo(() => data ? buildInsights(data) : [], [data])

  // ── KPI cards ──────────────────────────────────────────────────────────────
  const kpiCards = useMemo(() => {
    if (!data) return []
    const { kpis } = data
    return [
      { label: 'Total Primes', value: fmtUSD(kpis.total_primes_mn_usd), sublabel: 'Toutes années · tous pays', accent: 'navy' as const },
      { label: 'Croissance Moy.', value: fmtPctSgn(kpis.avg_croissance_pct), sublabel: 'Croissance des primes', accent: (kpis.avg_croissance_pct ?? 0) >= 0 ? 'green' as const : 'red' as const },
      { label: 'Part de Marché Moy.', value: fmtPct(kpis.avg_part_marche_pct), sublabel: 'Part sur les marchés locaux', accent: 'navy' as const },
      { label: 'Pays Couverts', value: String(kpis.nb_pays), sublabel: `${kpis.nb_annees} années · Dernière : ${kpis.derniere_annee ?? '—'}`, accent: 'olive' as const },
    ]
  }, [data])

  // ── Loading / Error / Not found ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div style={{
          width: 36, height: 36, border: `3px solid ${OLIVE}`,
          borderTopColor: 'transparent', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="px-8 py-16 text-center">
        <p className="text-lg font-bold text-gray-700 mb-2">Compagnie introuvable</p>
        <p className="text-sm text-gray-500 mb-6">« {companyName} » ne figure pas dans nos données.</p>
        <button onClick={() => navigate('/modelisation/analyse-compagnie')}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: OLIVE }}>
          ← Retour à l'analyse compagnies
        </button>
      </div>
    )
  }

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl px-7 py-5"
        style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        <button
          onClick={() => navigate('/modelisation/analyse-compagnie')}
          className="flex items-center gap-1.5 text-xs font-semibold mb-4 transition-colors"
          style={{ color: OLIVE }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          ← Analyse Compagnies
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-800">{data.company}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <TypeBadge type={data.type} />
              {data.lob.map(l => <LobBadge key={l} lob={l} />)}
              {data.pays.slice(0, 5).map(p => (
                <span key={p} className="px-2 py-0.5 rounded-full text-[10px] font-medium text-gray-500"
                  style={{ background: 'hsl(0,0%,95%)', border: '1px solid hsl(0,0%,88%)' }}>{p}</span>
              ))}
              {data.pays.length > 5 && (
                <span className="text-[10px] text-gray-400">+{data.pays.length - 5} pays</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-2xl font-bold" style={{ color: OLIVE }}>{fmtUSD(data.kpis.total_primes_mn_usd)}</span>
            <span className="text-[11px] text-gray-400">Total primes cumulées</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <TabNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hiddenTabs={data.kpis.nb_annees <= 1 ? ['evolution'] : []}
      />
      <TabProgress activeTab={activeTab} hiddenTabs={data.kpis.nb_annees <= 1 ? ['evolution'] : []} />

      {/* ═══════════════ TAB 1 — KPIs & Synthèse ═══════════════ */}
      {activeTab === 'kpis' && (
        <div className="space-y-5 animate-fade-in">
          <CartographieKPIGrid kpis={kpiCards} />

          {/* Insights */}
          {insights.length > 0 && (
            <div className="bg-white rounded-xl p-5"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 className="text-xs font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span style={{
                  width: 28, height: 28, borderRadius: 8, background: 'hsla(83,52%,42%,0.10)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>💡</span>
                Insights analytiques
              </h3>
              <div className="space-y-2.5">
                {insights.map((text, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ background: 'hsla(83,52%,42%,0.05)', border: '1px solid hsla(83,52%,42%,0.12)' }}>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                      style={{ background: OLIVE, color: 'white' }}>{i + 1}</span>
                    <p className="text-xs text-gray-700 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ TAB 2 — Évolution ═══════════════ */}
      {activeTab === 'evolution' && (
        <div className="space-y-5 animate-fade-in">
          {/* Primes par année */}
          <div className="bg-white rounded-xl p-5"
            style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 className="text-xs font-bold text-gray-700 mb-4">Évolution des primes (mn USD) par année</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.evolution} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,94%)" />
                <XAxis dataKey="annee" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmtUSD(v)} width={75} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="primes_mn_usd" name="Primes (mn USD)" stroke={OLIVE} strokeWidth={2.5} dot={{ r: 4, fill: OLIVE }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Croissance par année */}
          <div className="bg-white rounded-xl p-5"
            style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 className="text-xs font-bold text-gray-700 mb-4">Croissance (%) par année</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.evolution.filter(r => r.croissance_pct != null)} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,94%)" />
                <XAxis dataKey="annee" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={0} stroke="hsl(0,0%,80%)" strokeDasharray="4 2" />
                <Bar dataKey="croissance_pct" name="Croissance (%)" radius={[4,4,0,0]}>
                  {data.evolution.map((entry, i) => (
                    <Cell key={i} fill={(entry.croissance_pct ?? 0) >= 0 ? '#1E8449' : '#922B21'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Part de marché par année */}
          <div className="bg-white rounded-xl p-5"
            style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 className="text-xs font-bold text-gray-700 mb-4">Part de marché (%) par année</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.evolution.filter(r => r.part_marche_pct != null)} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,94%)" />
                <XAxis dataKey="annee" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v.toFixed(1)}%`} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="part_marche_pct" name="Part marché (%)" stroke={NAVY} strokeWidth={2.5} dot={{ r: 4, fill: NAVY }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 3 — Présence Géographique ═══════════════ */}
      {activeTab === 'geo' && (
        <div className="space-y-5 animate-fade-in">
          {/* Tableau pays */}
          <div className="bg-white rounded-xl overflow-hidden"
            style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'hsl(0,0%,97%)', borderBottom: '1px solid hsl(0,0%,91%)' }}>
                  <th className="text-left px-4 py-3 font-bold text-gray-600">Pays</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600">Total Primes (mn USD)</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600">Part Marché Moy.</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600">Pénétration Moy.</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600">Densité Moy.</th>
                </tr>
              </thead>
              <tbody>
                {data.by_pays.map((row, i) => (
                  <tr key={row.pays} style={{ borderBottom: '1px solid hsl(0,0%,95%)', background: i % 2 === 0 ? 'white' : 'hsl(0,0%,99%)' }}>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{row.pays}</td>
                    <td className="px-4 py-2.5 text-right font-mono" style={{ color: OLIVE }}>{fmtUSD(row.total_primes)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{fmtPct(row.avg_part_marche)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{fmtPct(row.avg_penetration)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{fmtDensite(row.avg_densite)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* BarChart horizontal pays */}
          {data.by_pays.length > 1 && (
            <div className="bg-white rounded-xl p-5"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 className="text-xs font-bold text-gray-700 mb-4">Primes par pays (mn USD)</h3>
              <ResponsiveContainer width="100%" height={Math.max(180, data.by_pays.length * 36)}>
                <BarChart
                  data={data.by_pays}
                  layout="vertical"
                  margin={{ top: 0, right: 70, left: 110, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,94%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => fmtUSD(v)} />
                  <YAxis type="category" dataKey="pays" tick={{ fontSize: 10 }} width={105} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total_primes" name="Primes (mn USD)" fill={OLIVE} radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ TAB 4 — Structure ═══════════════ */}
      {activeTab === 'structure' && (
        <div className="space-y-5 animate-fade-in">
          {data.by_lob.length > 1 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Pie LOB */}
                <div className="bg-white rounded-xl p-5"
                  style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <h3 className="text-xs font-bold text-gray-700 mb-4">Répartition par LOB (primes)</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie data={data.by_lob} dataKey="total_primes" nameKey="lob"
                        cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                        {data.by_lob.map((_, i) => (
                          <Cell key={i} fill={LOB_COLORS[i % LOB_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtUSD(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Table LOB */}
                <div className="bg-white rounded-xl p-5"
                  style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <h3 className="text-xs font-bold text-gray-700 mb-4">Détail par LOB</h3>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '2px solid hsl(0,0%,92%)' }}>
                        <th className="text-left py-2 font-bold text-gray-600">LOB</th>
                        <th className="text-right py-2 font-bold text-gray-600">Total Primes</th>
                        <th className="text-right py-2 font-bold text-gray-600">Croiss. Moy.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_lob.map((row, i) => (
                        <tr key={row.lob} style={{ borderBottom: '1px solid hsl(0,0%,95%)' }}>
                          <td className="py-2.5">
                            <span className="w-2.5 h-2.5 rounded-full inline-block mr-2"
                              style={{ background: LOB_COLORS[i % LOB_COLORS.length] }} />
                            {row.lob}
                          </td>
                          <td className="py-2.5 text-right font-mono" style={{ color: OLIVE }}>{fmtUSD(row.total_primes)}</td>
                          <td className="py-2.5 text-right" style={{ color: (row.avg_croissance ?? 0) >= 0 ? '#1E8449' : '#922B21' }}>
                            {fmtPctSgn(row.avg_croissance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl p-8 text-center"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-base font-bold text-gray-700 mb-2">
                Compagnie spécialisée en {data.lob[0] ?? '—'}
              </h3>
              <p className="text-sm text-gray-500 mb-5">Activité mono-branche — pas de répartition LOB à afficher.</p>
              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                <div className="p-3 rounded-lg" style={{ background: 'hsla(83,52%,42%,0.06)', border: '1px solid hsla(83,52%,42%,0.15)' }}>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Primes</p>
                  <p className="text-sm font-bold" style={{ color: OLIVE }}>{fmtUSD(data.kpis.total_primes_mn_usd)}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'hsla(83,52%,42%,0.06)', border: '1px solid hsla(83,52%,42%,0.15)' }}>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Croiss. Moy.</p>
                  <p className="text-sm font-bold" style={{ color: (data.kpis.avg_croissance_pct ?? 0) >= 0 ? '#1E8449' : '#922B21' }}>
                    {fmtPctSgn(data.kpis.avg_croissance_pct)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ TAB 5 — Données Brutes ═══════════════ */}
      {activeTab === 'raw' && (
        <div className="space-y-3 animate-fade-in">
          <div className="bg-white rounded-xl overflow-hidden"
            style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'hsl(0,0%,97%)', borderBottom: '1px solid hsl(0,0%,91%)' }}>
                  {[
                    { k: 'company',       l: 'Compagnie' },
                    { k: 'pays',          l: 'Pays' },
                    { k: 'annee',         l: 'Année' },
                    { k: 'primes_mn_usd', l: 'Primes (mn USD)' },
                    { k: 'croissance_pct',l: 'Croissance (%)' },
                    { k: 'penetration_pct',l: 'Pénétration (%)' },
                    { k: 'densite_usd',   l: 'Densité (USD/hab)' },
                    { k: 'part_marche_pct',l: 'Part Marché (%)' },
                    { k: 'lob',           l: 'LOB' },
                    { k: 'type',          l: 'Type' },
                  ].map(({ k, l }) => (
                    <th key={k}
                      className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
                      style={{ color: sortKey === k ? OLIVE : '#6b7280' }}
                      onClick={() => handleRawSort(k)}>
                      {l}<span className="ml-1 text-[10px]">{sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRaw.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid hsl(0,0%,95%)', background: i % 2 === 0 ? 'white' : 'hsl(0,0%,99%)' }}>
                    <td className="px-3 py-2 font-medium text-gray-700 truncate max-w-[150px]">{row.company}</td>
                    <td className="px-3 py-2 text-gray-600">{row.pays}</td>
                    <td className="px-3 py-2 text-gray-600">{row.annee ?? '—'}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: OLIVE }}>{fmtUSD(row.primes_mn_usd)}</td>
                    <td className="px-3 py-2" style={{ color: (row.croissance_pct ?? 0) >= 0 ? '#1E8449' : '#922B21' }}>
                      {fmtPctSgn(row.croissance_pct)}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{fmtPct(row.penetration_pct)}</td>
                    <td className="px-3 py-2 text-gray-600">{fmtDensite(row.densite_usd)}</td>
                    <td className="px-3 py-2 text-gray-600">{fmtPct(row.part_marche_pct)}</td>
                    <td className="px-3 py-2 text-gray-500">{row.lob}</td>
                    <td className="px-3 py-2"><TypeBadge type={row.type} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rawTotalPages > 1 && (
            <div className="flex items-center justify-between px-1 pt-1">
              <span className="text-xs text-gray-500">
                {sortedRaw.length} lignes · page {page}/{rawTotalPages}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-40"
                  style={{ background: 'hsl(0,0%,94%)', color: '#374151' }}>‹ Préc.</button>
                {Array.from({ length: Math.min(5, rawTotalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, rawTotalPages - 4))
                  const p = start + i
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className="w-7 h-7 rounded-lg text-xs font-semibold"
                      style={p === page ? { background: OLIVE, color: 'white' } : { background: 'hsl(0,0%,94%)', color: '#374151' }}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(rawTotalPages, p + 1))} disabled={page === rawTotalPages}
                  className="px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-40"
                  style={{ background: 'hsl(0,0%,94%)', color: '#374151' }}>Suiv. ›</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
