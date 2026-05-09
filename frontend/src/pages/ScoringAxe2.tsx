/**
 * ScoringAxe2.tsx — Scoring Intelligent des Marchés Africains 2030 (Axe 2)
 * 5 onglets :
 *   1. 🏆 Classement Final    — vue principale multi-méthodes
 *   2. 🎯 TOPSIS & PCA        — scoring objectif + poids
 *   3. 🗂️ Clusters Stratégiques — segmentation K-Means
 *   4. 🎲 Monte Carlo Scores  — incertitude sur les scores
 *   5. 🌍 Carte & Comparaison — choroplèthe + concordance
 *
 * Backend : /api/scoring-axe2/*
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ErrorBar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, Legend, ReferenceLine,
} from 'recharts'
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps'
import {
  Trophy, Target, Globe, AlertTriangle, Info,
  Download, Search, TrendingUp,
} from 'lucide-react'
import api from '../utils/api'
import {
  NUMERIC_TO_ISO3, ISO3_NAMES, AFRICA_NUMERIC, interpolatePositioned,
} from '../utils/cartographieConstants'

// Score TOPSIS: 0=rouge, 0.5=amber, 1=vert
const SCORE_COLOR_STOPS: [number, string][] = [
  [0,    '#d32f2f'],
  [0.35, '#ef6c00'],
  [0.5,  '#fbc02d'],
  [0.65, '#558b2f'],
  [1,    '#1b5e20'],
]

// Canonical name aliases (ISO3_NAMES → pays_33)
const ISO3_TO_PAYS33: Record<string, string> = {
  ...ISO3_NAMES,
  NGA: 'Nigeria',   // ISO3_NAMES has 'Nigéria' but predictions have 'Nigeria'
  COD: 'RDC',       // ISO3_NAMES has 'RD Congo' but predictions have 'RDC'
}

// ── Design tokens ──────────────────────────────────────────────────────────────
const OLIVE = 'hsl(83,52%,36%)'
const NAVY  = 'hsl(213,60%,27%)'
const GREEN = 'hsl(152,56%,39%)'
const RED   = 'hsl(358,66%,54%)'
const AMBER = 'hsl(30,88%,56%)'
const VIOLET = 'hsl(270,50%,45%)'
const OLIVE_L = 'hsl(83,50%,55%)'

const CLUSTER_COLORS = [NAVY, OLIVE, GREEN, AMBER]
const REGION_COLORS: Record<string, string> = {
  'Afrique du Nord': NAVY,
  "Afrique de l'Ouest": AMBER,
  'Afrique Centrale': VIOLET,
  "Afrique de l'Est": GREEN,
  'Afrique Australe': OLIVE,
}
const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  'ATTRACTIF': { bg: `hsla(152,56%,39%,0.12)`, text: GREEN },
  'NEUTRE':    { bg: `hsla(83,52%,36%,0.12)`,  text: OLIVE },
  'À ÉVITER':  { bg: `hsla(358,66%,54%,0.12)`, text: RED },
}

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// ── Types ─────────────────────────────────────────────────────────────────────
type TabId = 'classement' | 'topsis' | 'clustering' | 'montecarlo' | 'carte'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'classement',  label: 'Classement Final',      icon: '🏆' },
  { id: 'topsis',      label: 'TOPSIS & PCA',          icon: '🎯' },
  { id: 'clustering',  label: 'Clusters Stratégiques', icon: '🗂️' },
  { id: 'montecarlo',  label: 'Monte Carlo Scores',    icon: '🎲' },
  { id: 'carte',       label: 'Carte & Comparaison',   icon: '🌍' },
]

interface TopsisRow {
  pays: string; region: string; rang: number; score_topsis: number
  rang_equi: number; score_equi: number
  d_plus: number; d_minus: number
  rang_q10_sens: number; rang_q90_sens: number; badge: string
  [key: string]: any
}
interface PcaWeight { variable: string; label: string; weight: number }
interface TopsisData { classement: TopsisRow[]; pca_weights: PcaWeight[] }

interface BiplotCountry { pays: string; region: string; f1: number; f2: number }
interface BiplotLoading { variable: string; label: string; f1: number; f2: number }
interface PcaBiplotData {
  countries: BiplotCountry[]
  loadings: BiplotLoading[]
  variance_f1: number; variance_f2: number
  factor_name_f1: string; factor_name_f2: string
}

interface ClusterCountry {
  pays: string; region: string; cluster: number; cluster_label: string
  tsne_x: number; tsne_y: number; score_topsis: number
}
interface ClusterCard { cluster: number; label: string; pays: string[]; n_pays: number; score_topsis_moyen: number }
interface CentroidEntry { cluster: number; cluster_label: string; variable: string; label: string; value_norm: number; value_raw: number }
interface ClusteringData {
  countries: ClusterCountry[]; centroids: CentroidEntry[]
  cluster_labels: Record<string, string>; cluster_cards: ClusterCard[]
}

interface MCRow {
  pays: string; region: string
  rang_p50: number; rang_p10: number; rang_p90: number
  score_p50: number; score_p10: number; score_p90: number
  prob_top5: number; prob_top10: number; prob_top15: number; amplitude: number
}
interface MCStability { pays_a: string; pays_b: string; prob: number }
interface MCData { classement: MCRow[]; stability_matrix: MCStability[] }

interface ConcordanceRow {
  pays: string; region: string; rang_topsis: number; rang_mc_p50: number
  delta: number; robust: boolean; score_topsis: number; score_mc_p50: number
}
interface KPIs { n_marches: number; methode_principale: string; consensus_pct: number; marche_top1: string }
interface OverviewData {
  topsis: TopsisData; clustering: ClusteringData; mc_scores: MCData
  concordance: ConcordanceRow[]; kpis: KPIs; pca_weights: PcaWeight[]
}

// ── Formatters ─────────────────────────────────────────────────────────────────
const fmtPct = (v: number | null | undefined, dec = 1) => v == null ? '—' : `${(v * 100).toFixed(dec)}%`
const extractErrMsg = (e: any): string =>
  e?.response?.data?.detail ?? e?.message ?? 'Erreur réseau ou serveur.'

// ── Atomic components ─────────────────────────────────────────────────────────

function CardShell({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={`bg-white rounded-xl p-5 ${className ?? ''}`}
      style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 pb-2"
        style={{ borderBottom: `2px solid hsla(83,52%,42%,0.20)` }}>{children}</h2>
      {sub && <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{sub}</p>}
    </div>
  )
}

function KpiCard({ icon, value, label, sub, color = NAVY }: {
  icon: React.ReactNode; value: string; label: string; sub?: string; color?: string
}) {
  return (
    <CardShell>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <div className="text-xl font-bold text-gray-800 mt-0.5" style={{ color }}>{value}</div>
          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wide mt-0.5">{label}</div>
          {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
        </div>
      </div>
    </CardShell>
  )
}

function MethodNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg text-xs"
      style={{ background: 'hsla(83,52%,36%,0.06)', border: '1px solid hsla(83,52%,36%,0.15)', color: '#6b7280' }}>
      <Info size={12} className="flex-shrink-0 mt-0.5" style={{ color: OLIVE }} />
      <span>{text}</span>
    </div>
  )
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl p-4 flex items-start gap-3"
      style={{ background: 'hsla(358,66%,54%,0.06)', border: `1px solid ${RED}40` }}>
      <AlertTriangle size={18} style={{ color: RED, flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1">
        <p className="text-sm font-bold" style={{ color: RED }}>Impossible de charger les données</p>
        <p className="text-xs text-gray-600 mt-0.5">{message}</p>
        {onRetry && (
          <button onClick={onRetry}
            className="mt-2 px-3 py-1 rounded text-[11px] font-semibold"
            style={{ background: 'transparent', color: RED, border: `1px solid ${RED}` }}>
            Réessayer
          </button>
        )}
      </div>
    </div>
  )
}

function Skeleton({ h = 20, w = '80%' }: { h?: number; w?: string }) {
  return <div className="animate-pulse rounded" style={{ height: h, width: w, background: 'hsl(83,10%,88%)' }} />
}
function SkeletonChart({ h = 300 }: { h?: number }) {
  return <div className="animate-pulse rounded-xl" style={{ height: h, background: 'hsl(83,10%,88%)' }} />
}

function AttractiviteBadge({ badge }: { badge: string }) {
  const style = BADGE_STYLES[badge] ?? { bg: 'hsla(0,0%,80%,0.3)', text: '#6b7280' }
  const emoji = badge === 'ATTRACTIF' ? '🟢' : badge === 'NEUTRE' ? '🟡' : '🔴'
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
      style={{ background: style.bg, color: style.text }}>
      {emoji} {badge}
    </span>
  )
}

function RegionPill({ region, active, onClick }: { region: string; active: boolean; onClick: () => void }) {
  const color = REGION_COLORS[region] ?? NAVY
  return (
    <button onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
      style={active
        ? { background: color, color: 'white', border: `1.5px solid ${color}` }
        : { background: 'white', color: color, border: `1.5px solid ${color}` }}>
      {region}
    </button>
  )
}

// ── TabNav / TabProgress ───────────────────────────────────────────────────────

function TabNav({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (t: TabId) => void }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden mb-1"
      style={{ border: '1px solid hsl(0,0%,90%)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div className="flex overflow-x-auto scrollbar-hide">
        {TABS.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                onTabChange(tab.id)
                document.getElementById('scar-main-scroll')?.scrollTo({ top: 0, behavior: 'instant' })
              }}
              className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all relative flex-shrink-0"
              style={active
                ? { color: 'hsl(83,52%,30%)', background: 'hsla(83,52%,36%,0.08)', borderBottom: `2px solid ${OLIVE}` }
                : { color: '#6b7280', borderBottom: '2px solid transparent' }}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TabProgress({ activeTab }: { activeTab: TabId }) {
  const idx = TABS.findIndex(t => t.id === activeTab)
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {TABS.map((tab, i) => (
        <div key={tab.id} className="h-1 rounded-full transition-all" style={{
          flex: 1,
          background: i === idx ? NAVY : i < idx ? 'hsla(213,60%,27%,0.35)' : 'hsl(0,0%,90%)',
        }} />
      ))}
    </div>
  )
}

// ── CSV Export ─────────────────────────────────────────────────────────────────
function exportCsv(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = filename
  a.click()
}

// ── Onglet 1 : Classement Final ───────────────────────────────────────────────

function ClassementTab({ overview }: { overview: OverviewData }) {
  const [regionFilter, setRegionFilter] = useState<string>('Tous')
  const [search, setSearch] = useState('')

  const topsisRows = overview.topsis.classement
  const mcLookup = useMemo(() => {
    const m: Record<string, MCRow> = {}
    overview.mc_scores.classement.forEach(r => { m[r.pays] = r })
    return m
  }, [overview.mc_scores.classement])

  const clusterLookup = useMemo(() => {
    const m: Record<string, ClusterCountry> = {}
    overview.clustering.countries.forEach(c => { m[c.pays] = c })
    return m
  }, [overview.clustering.countries])

  const allRegions = useMemo(() =>
    ['Tous', ...Array.from(new Set(topsisRows.map(r => r.region)))],
    [topsisRows])

  const filtered = useMemo(() => topsisRows.filter(r => {
    const regOk = regionFilter === 'Tous' || r.region === regionFilter
    const searchOk = !search || r.pays.toLowerCase().includes(search.toLowerCase())
    return regOk && searchOk
  }), [topsisRows, regionFilter, search])

  const top10Chart = useMemo(() =>
    topsisRows.slice(0, 10).map(r => ({
      pays: r.pays.length > 14 ? r.pays.slice(0, 13) + '…' : r.pays,
      score: r.score_topsis,
      errorY: [r.score_topsis - Math.max(0, r.score_topsis - 0.05), Math.min(1, r.score_topsis + 0.05)],
    })),
    [topsisRows])

  const { kpis } = overview

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Globe size={18} />} value={String(kpis.n_marches)} label="Marchés analysés" sub="Afrique 2030" color={NAVY} />
        <KpiCard icon={<Target size={18} />} value={kpis.methode_principale} label="Méthode principale" color={OLIVE} />
        <KpiCard icon={<TrendingUp size={18} />} value={`${kpis.consensus_pct}%`} label="Consensus inter-méthodes" sub="Δ rang ≤ 3" color={GREEN} />
        <KpiCard icon={<Trophy size={18} />} value={kpis.marche_top1} label="Marché #1 recommandé" color={AMBER} />
      </div>

      {/* Top 10 Barplot */}
      <CardShell>
        <SectionTitle>Top 10 — Score TOPSIS 2030</SectionTitle>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={top10Chart} layout="vertical" margin={{ left: 80, right: 40, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,93%)" horizontal={false} />
            <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="pays" tick={{ fontSize: 11, fill: NAVY }} width={80} />
            <Tooltip formatter={(v: number) => [v.toFixed(4), 'Score TOPSIS']} />
            <Bar dataKey="score" fill={OLIVE} radius={[0, 4, 4, 0]} maxBarSize={18}>
              <ErrorBar dataKey="errorY" width={4} strokeWidth={2} stroke={NAVY} direction="x" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <MethodNote text="Ce classement combine TOPSIS (poids PCA), Monte Carlo conformal et clustering stratégique. Les barres d'erreur représentent la variabilité sous perturbation ±5%." />
      </CardShell>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'hsl(0,0%,96%)' }}>
          <Search size={12} style={{ color: '#9ca3af' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un pays…"
            className="bg-transparent outline-none text-gray-700 w-32" style={{ fontSize: 12 }} />
        </div>
        {allRegions.map(r => (
          <RegionPill key={r} region={r === 'Tous' ? 'Tous' : r}
            active={regionFilter === r}
            onClick={() => setRegionFilter(r)} />
        ))}
        <button
          onClick={() => exportCsv(filtered.map(r => ({
            Rang: r.rang, Pays: r.pays, Région: r.region,
            'Score TOPSIS': r.score_topsis, 'Rang MC P50': mcLookup[r.pays]?.rang_p50 ?? '—',
            Cluster: clusterLookup[r.pays]?.cluster_label ?? '—', Badge: r.badge,
          })), 'scoring_afrique_2030.csv')}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: `${NAVY}12`, color: NAVY }}>
          <Download size={12} /> Export CSV
        </button>
      </div>

      {/* Tableau classement */}
      <CardShell style={{ padding: 0, overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'hsl(0,0%,97%)' }}>
                <th className="text-left py-3 px-3 font-bold text-gray-600 w-10">#</th>
                <th className="text-left py-3 px-3 font-bold text-gray-600">Pays</th>
                <th className="text-left py-3 px-3 font-bold text-gray-600 hidden md:table-cell">Région</th>
                <th className="text-right py-3 px-3 font-bold text-gray-600">Score TOPSIS</th>
                <th className="text-right py-3 px-3 font-bold text-gray-600 hidden sm:table-cell">Cluster</th>
                <th className="text-right py-3 px-3 font-bold text-gray-600 hidden md:table-cell">Rang MC P50</th>
                <th className="text-right py-3 px-3 font-bold text-gray-600 hidden lg:table-cell">Prob. Top 5</th>
                <th className="text-left py-3 px-3 font-bold text-gray-600">Attractivité</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const mc = mcLookup[row.pays]
                const cl = clusterLookup[row.pays]
                return (
                  <tr key={row.pays} className="border-t hover:bg-gray-50 transition-colors"
                    style={{ borderColor: 'hsl(0,0%,94%)' }}>
                    <td className="py-2.5 px-3 font-bold" style={{ color: row.rang <= 5 ? OLIVE : '#9ca3af' }}>
                      {row.rang <= 3 ? ['🥇', '🥈', '🥉'][row.rang - 1] : row.rang}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-gray-800">{row.pays}</td>
                    <td className="py-2.5 px-3 text-gray-500 hidden md:table-cell">
                      <span className="px-2 py-0.5 rounded-full text-[10px]"
                        style={{ background: `${REGION_COLORS[row.region] ?? NAVY}12`, color: REGION_COLORS[row.region] ?? NAVY }}>
                        {row.region}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold" style={{ color: NAVY }}>
                      {row.score_topsis.toFixed(4)}
                    </td>
                    <td className="py-2.5 px-3 text-right hidden sm:table-cell">
                      {cl && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
                          style={{ background: `${CLUSTER_COLORS[cl.cluster]}15`, color: CLUSTER_COLORS[cl.cluster] }}>
                          {cl.cluster_label}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono hidden md:table-cell" style={{ color: '#6b7280' }}>
                      {mc?.rang_p50 ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono hidden lg:table-cell" style={{ color: GREEN }}>
                      {mc ? fmtPct(mc.prob_top5) : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <AttractiviteBadge badge={row.badge} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardShell>
    </div>
  )
}

// ── PCA Biplot ────────────────────────────────────────────────────────────────

const BIPLOT_REGION_COLORS: Record<string, string> = {
  'Afrique du Nord':    '#e63946',
  "Afrique de l'Ouest": '#2a9d8f',
  'Afrique Centrale':   '#e9c46a',
  "Afrique de l'Est":   '#457b9d',
  'Afrique Australe':   '#8338ec',
}

function PcaBiplotChart({ data }: { data: PcaBiplotData }) {
  const [tooltip, setTooltip] = useState<(BiplotCountry & { px: number; py: number }) | null>(null)
  const { countries, loadings, variance_f1, variance_f2, factor_name_f1, factor_name_f2 } = data

  const ARROW_SCALE = 2.5
  const W = 900, H = 580
  const PAD = { top: 24, right: 180, bottom: 52, left: 48 }
  const PW = W - PAD.left - PAD.right
  const PH = H - PAD.top - PAD.bottom

  // Axis bounds — encompass scores + scaled loadings
  const xs = [...countries.map(c => c.f1), ...loadings.map(l => l.f1 * ARROW_SCALE * 1.22), 0]
  const ys = [...countries.map(c => c.f2), ...loadings.map(l => l.f2 * ARROW_SCALE * 1.22), 0]
  const xSpan = Math.max(...xs) - Math.min(...xs)
  const ySpan = Math.max(...ys) - Math.min(...ys)
  const xMin = Math.min(...xs) - xSpan * 0.06
  const xMax = Math.max(...xs) + xSpan * 0.06
  const yMin = Math.min(...ys) - ySpan * 0.06
  const yMax = Math.max(...ys) + ySpan * 0.06

  const toX = (v: number) => PAD.left + (v - xMin) / (xMax - xMin) * PW
  const toY = (v: number) => H - PAD.bottom - (v - yMin) / (yMax - yMin) * PH
  const ox = toX(0), oy = toY(0)

  // Grid ticks (integer values inside bounds)
  const xTicks = Array.from({ length: 9 }, (_, i) => i - 4).filter(v => v > xMin && v < xMax)
  const yTicks = Array.from({ length: 9 }, (_, i) => i - 4).filter(v => v > yMin && v < yMax)

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Plot background */}
        <rect x={PAD.left} y={PAD.top} width={PW} height={PH}
          fill="hsl(210,20%,99%)" rx={4} />

        {/* Grid */}
        {xTicks.map(v => <line key={`gx${v}`} x1={toX(v)} y1={PAD.top} x2={toX(v)} y2={H - PAD.bottom}
          stroke="hsl(0,0%,91%)" strokeWidth={0.6} />)}
        {yTicks.map(v => <line key={`gy${v}`} x1={PAD.left} y1={toY(v)} x2={PAD.left + PW} y2={toY(v)}
          stroke="hsl(0,0%,91%)" strokeWidth={0.6} />)}

        {/* Origin axes */}
        <line x1={PAD.left} y1={oy} x2={PAD.left + PW} y2={oy}
          stroke="hsl(0,0%,72%)" strokeWidth={0.9} />
        <line x1={ox} y1={PAD.top} x2={ox} y2={H - PAD.bottom}
          stroke="hsl(0,0%,72%)" strokeWidth={0.9} />

        {/* Variable arrows */}
        {loadings.map(l => {
          const tx = toX(l.f1 * ARROW_SCALE)
          const ty = toY(l.f2 * ARROW_SCALE)
          const lx = toX(l.f1 * ARROW_SCALE * 1.14)
          const ly = toY(l.f2 * ARROW_SCALE * 1.14)
          const ang = Math.atan2(ty - oy, tx - ox)
          const hs = 6
          const pts = `${tx - hs * Math.cos(ang - 0.42)},${ty - hs * Math.sin(ang - 0.42)} ${tx},${ty} ${tx - hs * Math.cos(ang + 0.42)},${ty - hs * Math.sin(ang + 0.42)}`
          return (
            <g key={l.variable}>
              <line x1={ox} y1={oy} x2={tx} y2={ty} stroke="#c0392b" strokeWidth={1.4} />
              <polygon points={pts} fill="#c0392b" />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                fontSize={8} fontWeight="700" fill="#c0392b">
                {l.label}
              </text>
            </g>
          )
        })}

        {/* Country dots + labels */}
        {countries.map(c => {
          const cx = toX(c.f1), cy = toY(c.f2)
          const col = BIPLOT_REGION_COLORS[c.region] ?? '#888'
          const hov = tooltip?.pays === c.pays
          return (
            <g key={c.pays} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setTooltip({ ...c, px: cx, py: cy })}
              onMouseLeave={() => setTooltip(null)}>
              <circle cx={cx} cy={cy} r={hov ? 6.5 : 4.5} fill={col}
                stroke="white" strokeWidth={1} opacity={hov ? 1 : 0.82} />
              <text x={cx + 5} y={cy - 4} fontSize={7} fill="#333">
                {c.pays}
              </text>
            </g>
          )
        })}

        {/* Hover tooltip */}
        {tooltip && (() => {
          const tx = Math.min(tooltip.px + 10, W - PAD.right - 5)
          const ty = Math.max(tooltip.py - 44, PAD.top + 2)
          const col = BIPLOT_REGION_COLORS[tooltip.region] ?? '#888'
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect x={tx} y={ty} width={138} height={40} rx={4}
                fill="white" stroke="hsl(0,0%,82%)" strokeWidth={0.8}
                style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.10))' }} />
              <text x={tx + 8} y={ty + 14} fontSize={10} fontWeight="700" fill={col}>
                {tooltip.pays}
              </text>
              <text x={tx + 8} y={ty + 29} fontSize={8.5} fill="#6b7280">
                {tooltip.region}
              </text>
              <text x={tx + 8} y={ty + 29} fontSize={8.5} fill="#9ca3af"
                dx={`${tooltip.region.length * 5.2}px`}>
                {'  ·  '}F1 {tooltip.f1.toFixed(2)}  F2 {tooltip.f2.toFixed(2)}
              </text>
            </g>
          )
        })()}

        {/* Axis labels */}
        <text x={PAD.left + PW / 2} y={H - 6} textAnchor="middle" fontSize={10}
          fontWeight="600" fill={NAVY}>
          F1 — {factor_name_f1} ({variance_f1}% variance)
        </text>
        <text x={13} y={PAD.top + PH / 2} textAnchor="middle" fontSize={10}
          fontWeight="600" fill={NAVY}
          transform={`rotate(-90, 13, ${PAD.top + PH / 2})`}>
          F2 — {factor_name_f2} ({variance_f2}% variance)
        </text>

        {/* Legend */}
        <g transform={`translate(${PAD.left + PW + 10}, ${PAD.top + 8})`}>
          <text fontSize={9} fontWeight="700" fill={NAVY} dy={8}>Région</text>
          {Object.entries(BIPLOT_REGION_COLORS).map(([region, col], i) => (
            <g key={region} transform={`translate(0, ${20 + i * 20})`}>
              <circle cx={5} cy={6} r={5} fill={col} opacity={0.85} />
              <text x={14} y={10} fontSize={8.5} fill="#444">{region}</text>
            </g>
          ))}
          <g transform={`translate(0, ${130})`}>
            <line x1={0} y1={8} x2={16} y2={8} stroke="#c0392b" strokeWidth={1.5} />
            <polygon points="16,4 20,8 16,12" fill="#c0392b" />
            <text x={24} y={11} fontSize={8.5} fill="#444">Critère PCA</text>
          </g>
        </g>
      </svg>
    </div>
  )
}

// ── Onglet 2 : TOPSIS & PCA ───────────────────────────────────────────────────

function TopsisTab({ topsis, biplot, loading, error, onRetry }: {
  topsis: TopsisData | null; biplot: PcaBiplotData | null
  loading: boolean; error: string | null; onRetry: () => void
}) {
  if (loading) return <div className="space-y-4"><SkeletonChart /><SkeletonChart /></div>
  if (error) return <ErrorPanel message={error} onRetry={onRetry} />
  if (!topsis) return null

  const { classement, pca_weights } = topsis

  const radarData = pca_weights.map(w => ({
    variable: w.label.split('(')[0].trim(),
    weight: w.weight,
    fullMark: 1,
  }))

  const top15bar = classement.slice(0, 15).map(r => ({
    pays: r.pays.length > 14 ? r.pays.slice(0, 13) + '…' : r.pays,
    score: r.score_topsis,
    score_equi: r.score_equi,
    rangQ10: r.rang_q10_sens,
    rangQ90: r.rang_q90_sens,
  }))

  const top20 = classement

  return (
    <div className="space-y-5">
      <CardShell>
        <SectionTitle
          sub="TOPSIS classe les pays selon leur proximité à la solution idéale sur 8 critères pondérés automatiquement par PCA.">
          🎯 Principe de la méthode
        </SectionTitle>
        <div className="flex flex-wrap gap-2 mt-2">
          {pca_weights.map(w => (
            <span key={w.variable} className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: `${OLIVE}${Math.round(20 + w.weight * 200).toString(16)}`, color: NAVY }}>
              {w.label.split('(')[0].trim()} · {(w.weight * 100).toFixed(1)}%
            </span>
          ))}
        </div>
      </CardShell>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Radar poids PCA */}
        <CardShell>
          <SectionTitle>Poids PCA des 8 critères</SectionTitle>
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(0,0%,88%)" />
              <PolarAngleAxis dataKey="variable" tick={{ fontSize: 9, fill: NAVY }} />
              <PolarRadiusAxis domain={[0, 0.25]} tick={{ fontSize: 8 }} />
              <Radar name="Poids PCA" dataKey="weight" stroke={OLIVE} fill={OLIVE} fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <MethodNote text="Poids = |loading PC1| normalisé. Une valeur élevée indique un critère très discriminant pour le classement." />
        </CardShell>

        {/* Barplot TOPSIS scores top 15 */}
        <CardShell>
          <SectionTitle>Scores TOPSIS Top 15</SectionTitle>
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={top15bar} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,93%)" horizontal={false} />
              <XAxis type="number" domain={[0, (dataMax: number) => Math.min(1, parseFloat((dataMax + 0.05).toFixed(2)))]} tick={{ fontSize: 9 }} />
              <YAxis type="category" dataKey="pays" tick={{ fontSize: 10, fill: NAVY }} width={90} interval={0} />
              <Tooltip
                formatter={(v: number, name: string) => [v.toFixed(4), name === 'score' ? 'TOPSIS Poids PCA' : 'TOPSIS Équipondéré']}
              />
              <Bar dataKey="score" name="score" fill={OLIVE} radius={[0, 3, 3, 0]} maxBarSize={14} />
              <Bar dataKey="score_equi" name="score_equi" fill={NAVY} fillOpacity={0.4} radius={[0, 3, 3, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </CardShell>
      </div>

      {/* PCA Biplot */}
      <CardShell>
        <SectionTitle sub="Projection des 33 pays et des 8 variables dans l'espace factoriel F1×F2 (rotation Varimax)">
          Biplot PCA — Pays + Variables dans l'espace F1×F2
        </SectionTitle>
        {biplot
          ? <PcaBiplotChart data={biplot} />
          : <SkeletonChart h={400} />}
        <MethodNote text="Les flèches = 8 critères PCA. Un pays proche d'une flèche performe bien sur ce critère. Survolez un pays pour ses coordonnées factorielles." />
      </CardShell>

      {/* Sensibilité */}
      <CardShell>
        <SectionTitle sub="Rang Q10–Q90 sous variation de ±20% des poids (500 tirages Dirichlet)">
          Analyse de Sensibilité — Intervalle de confiance du rang
        </SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'hsl(0,0%,97%)' }}>
                <th className="text-left py-2 px-3 font-bold text-gray-600">Rang</th>
                <th className="text-left py-2 px-3 font-bold text-gray-600">Pays</th>
                <th className="text-right py-2 px-3 font-bold text-gray-600">Score PCA</th>
                <th className="text-right py-2 px-3 font-bold text-gray-600">Score Équi</th>
                <th className="text-right py-2 px-3 font-bold text-gray-600">IC Rang [Q10–Q90]</th>
                <th className="text-left py-2 px-3 font-bold text-gray-600">Stabilité</th>
              </tr>
            </thead>
            <tbody>
              {top20.map(row => {
                const span = row.rang_q90_sens - row.rang_q10_sens
                const stable = span <= 5
                return (
                  <tr key={row.pays} className="border-t hover:bg-gray-50" style={{ borderColor: 'hsl(0,0%,94%)' }}>
                    <td className="py-2 px-3 font-bold" style={{ color: OLIVE }}>{row.rang}</td>
                    <td className="py-2 px-3 font-semibold text-gray-800">{row.pays}</td>
                    <td className="py-2 px-3 text-right font-mono" style={{ color: NAVY }}>{row.score_topsis.toFixed(4)}</td>
                    <td className="py-2 px-3 text-right font-mono text-gray-500">{row.score_equi.toFixed(4)}</td>
                    <td className="py-2 px-3 text-right font-mono"
                      style={{ color: stable ? GREEN : RED }}>
                      [{row.rang_q10_sens}–{row.rang_q90_sens}]
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{ background: stable ? `${GREEN}15` : `${AMBER}15`, color: stable ? GREEN : AMBER }}>
                        {stable ? '✓ Stable' : `±${Math.round(span / 2)}`}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardShell>
    </div>
  )
}

// ── t-SNE Custom SVG ──────────────────────────────────────────────────────────

function TsneChartSvg({ countries, cluster_cards }: {
  countries: ClusterCountry[]
  cluster_cards: ClusterCard[]
}) {
  const [hovered, setHovered] = useState<ClusterCountry | null>(null)

  const W = 720, H = 360
  const PAD = { top: 28, right: 150, bottom: 40, left: 40 }
  const PW = W - PAD.left - PAD.right
  const PH = H - PAD.top - PAD.bottom

  const allX = countries.map(c => c.tsne_x)
  const allY = countries.map(c => c.tsne_y)
  const xSpan = Math.max(...allX) - Math.min(...allX)
  const ySpan = Math.max(...allY) - Math.min(...allY)
  const xMin = Math.min(...allX) - xSpan * 0.10
  const xMax = Math.max(...allX) + xSpan * 0.10
  const yMin = Math.min(...allY) - ySpan * 0.10
  const yMax = Math.max(...allY) + ySpan * 0.10

  const toX = (v: number) => PAD.left + (v - xMin) / (xMax - xMin) * PW
  const toY = (v: number) => H - PAD.bottom - (v - yMin) / (yMax - yMin) * PH
  const scaleX = (d: number) => Math.abs(d) * PW / (xMax - xMin)
  const scaleY = (d: number) => Math.abs(d) * PH / (yMax - yMin)

  const clusterLabelMap: Record<number, string> = {}
  cluster_cards.forEach(c => { clusterLabelMap[c.cluster] = c.label })

  // Ellipses: center ± 2.5 × std per cluster (like notebook)
  const ellipses = [0, 1, 2, 3].map(cId => {
    const members = countries.filter(m => m.cluster === cId)
    if (members.length < 2) return null
    const xs = members.map(m => m.tsne_x)
    const ys = members.map(m => m.tsne_y)
    const cx = xs.reduce((a, b) => a + b, 0) / xs.length
    const cy = ys.reduce((a, b) => a + b, 0) / ys.length
    const sdx = Math.sqrt(xs.reduce((a, b) => a + (b - cx) ** 2, 0) / xs.length)
    const sdy = Math.sqrt(ys.reduce((a, b) => a + (b - cy) ** 2, 0) / ys.length)
    return {
      cluster: cId,
      cx: toX(cx), cy: toY(cy),
      rx: scaleX(sdx * 2.5 + 1),
      ry: scaleY(sdy * 2.5 + 1),
    }
  }).filter(Boolean) as { cluster: number; cx: number; cy: number; rx: number; ry: number }[]

  // Axis ticks
  const xTicks = Array.from({ length: 5 }, (_, i) => xMin + (xMax - xMin) / 6 * (i + 1))
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (yMax - yMin) / 6 * (i + 1))

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Background */}
        <rect x={PAD.left} y={PAD.top} width={PW} height={PH} fill="hsl(210,20%,99%)" rx={4} />

        {/* Grid */}
        {xTicks.map((v, i) => (
          <g key={`gx${i}`}>
            <line x1={toX(v)} y1={PAD.top} x2={toX(v)} y2={H - PAD.bottom} stroke="hsl(0,0%,91%)" strokeWidth={0.6} />
            <text x={toX(v)} y={H - PAD.bottom + 13} textAnchor="middle" fontSize={8} fill="#bbb">{Math.round(v)}</text>
          </g>
        ))}
        {yTicks.map((v, i) => (
          <g key={`gy${i}`}>
            <line x1={PAD.left} y1={toY(v)} x2={PAD.left + PW} y2={toY(v)} stroke="hsl(0,0%,91%)" strokeWidth={0.6} />
            <text x={PAD.left - 5} y={toY(v) + 3} textAnchor="end" fontSize={8} fill="#bbb">{Math.round(v)}</text>
          </g>
        ))}

        {/* Cluster ellipses (dashed) */}
        {ellipses.map(e => (
          <g key={`e${e.cluster}`}>
            <ellipse
              cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry}
              fill="none" stroke={CLUSTER_COLORS[e.cluster]}
              strokeWidth={1.8} strokeDasharray="7 4" opacity={0.65}
            />
            <text
              x={e.cx - e.rx * 0.65} y={e.cy - e.ry - 6}
              fontSize={12} fontWeight="700" fill={CLUSTER_COLORS[e.cluster]}
              style={{ pointerEvents: 'none' }}
            >
              C{e.cluster}
            </text>
          </g>
        ))}

        {/* Country dots + labels */}
        {countries.map(c => {
          const cx = toX(c.tsne_x), cy = toY(c.tsne_y)
          const col = REGION_COLORS[c.region] ?? '#888'
          const hov = hovered?.pays === c.pays
          return (
            <g key={c.pays} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(c)}
              onMouseLeave={() => setHovered(null)}>
              <circle cx={cx} cy={cy} r={hov ? 7 : 5.5}
                fill={col} stroke="white" strokeWidth={1.2} opacity={hov ? 1 : 0.85} />
              <text x={cx + 6} y={cy - 3} fontSize={7.5} fill="#222"
                style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {c.pays}
              </text>
            </g>
          )
        })}

        {/* Hover tooltip */}
        {hovered && (() => {
          const hx = toX(hovered.tsne_x), hy = toY(hovered.tsne_y)
          const tx = Math.min(hx + 12, W - PAD.right - 4)
          const ty = Math.max(hy - 54, PAD.top + 2)
          const col = REGION_COLORS[hovered.region] ?? '#888'
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect x={tx} y={ty} width={152} height={52} rx={4}
                fill="white" stroke="hsl(0,0%,82%)" strokeWidth={0.8}
                style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.10))' }} />
              <text x={tx + 8} y={ty + 17} fontSize={10.5} fontWeight="700" fill={col}>{hovered.pays}</text>
              <text x={tx + 8} y={ty + 31} fontSize={9} fill="#6b7280">{hovered.region}</text>
              <text x={tx + 8} y={ty + 45} fontSize={9} fill={CLUSTER_COLORS[hovered.cluster]}>
                {clusterLabelMap[hovered.cluster] ?? `C${hovered.cluster}`}
              </text>
            </g>
          )
        })()}

        {/* Axis labels */}
        <text x={PAD.left + PW / 2} y={H - 5} textAnchor="middle" fontSize={10} fontWeight="600" fill={NAVY}>
          t-SNE dim 1
        </text>
        <text x={13} y={PAD.top + PH / 2} textAnchor="middle" fontSize={10} fontWeight="600" fill={NAVY}
          transform={`rotate(-90, 13, ${PAD.top + PH / 2})`}>
          t-SNE dim 2
        </text>

        {/* Region legend */}
        <g transform={`translate(${PAD.left + PW + 12}, ${PAD.top + 8})`}>
          <text fontSize={9} fontWeight="700" fill={NAVY} dy={8}>Région</text>
          {Object.entries(REGION_COLORS).map(([region, col], i) => (
            <g key={region} transform={`translate(0, ${20 + i * 20})`}>
              <circle cx={5} cy={6} r={5} fill={col} opacity={0.85} />
              <text x={14} y={10} fontSize={8.5} fill="#444">{region}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

// ── Onglet 3 : Clusters Stratégiques ──────────────────────────────────────────

function ClusteringTab({ clustering, loading, error, onRetry }: {
  clustering: ClusteringData | null; loading: boolean; error: string | null; onRetry: () => void
}) {
  if (loading) return <div className="space-y-4"><SkeletonChart /><SkeletonChart /></div>
  if (error) return <ErrorPanel message={error} onRetry={onRetry} />
  if (!clustering) return null

  const { countries, cluster_cards } = clustering

  return (
    <div className="space-y-5">
      {/* Cluster cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cluster_cards.map(card => (
          <CardShell key={card.cluster} style={{ borderLeft: `4px solid ${CLUSTER_COLORS[card.cluster]}` }}>
            <div className="font-bold text-sm mb-1" style={{ color: CLUSTER_COLORS[card.cluster] }}>
              {card.label}
            </div>
            <div className="text-xs text-gray-500 mb-2">{card.n_pays} marchés · Score moy. {card.score_topsis_moyen.toFixed(3)}</div>
            <div className="flex flex-wrap gap-1">
              {card.pays.map(p => (
                <span key={p} className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                  style={{ background: `${CLUSTER_COLORS[card.cluster]}12`, color: CLUSTER_COLORS[card.cluster] }}>
                  {p}
                </span>
              ))}
            </div>
          </CardShell>
        ))}
      </div>

      {/* t-SNE pleine largeur */}
      <CardShell>
        <SectionTitle sub="Points colorés par région — ellipses en pointillés = frontières K-Means, survolez un pays pour son détail">
          Projection t-SNE — 33 marchés africains 2030
        </SectionTitle>
        <TsneChartSvg countries={countries} cluster_cards={cluster_cards} />
        <MethodNote text="Projection t-SNE 2D à partir des 7 critères standardisés. Les ellipses délimitent les 4 clusters K-Means (centre ± 2,5 × écart-type)." />
      </CardShell>

      {/* Tableau intra-cluster */}
      <CardShell style={{ padding: 0, overflow: 'hidden' }}>
        <div className="px-5 pt-4 pb-2">
          <SectionTitle>Classement intra-cluster par score TOPSIS</SectionTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'hsl(0,0%,97%)' }}>
                <th className="text-left py-2 px-4 font-bold text-gray-600">Cluster</th>
                <th className="text-left py-2 px-3 font-bold text-gray-600">Rang local</th>
                <th className="text-left py-2 px-3 font-bold text-gray-600">Pays</th>
                <th className="text-left py-2 px-3 font-bold text-gray-600">Région</th>
                <th className="text-right py-2 px-3 font-bold text-gray-600">Score TOPSIS</th>
              </tr>
            </thead>
            <tbody>
              {cluster_cards.map(card => {
                const members = countries
                  .filter(c => c.cluster === card.cluster)
                  .sort((a, b) => b.score_topsis - a.score_topsis)
                return members.map((m, localRank) => (
                  <tr key={m.pays} className="border-t hover:bg-gray-50" style={{ borderColor: 'hsl(0,0%,94%)' }}>
                    {localRank === 0 && (
                      <td className="py-2 px-4 font-bold" rowSpan={members.length}
                        style={{ color: CLUSTER_COLORS[card.cluster], borderRight: `3px solid ${CLUSTER_COLORS[card.cluster]}` }}>
                        {card.label}
                      </td>
                    )}
                    <td className="py-2 px-3 font-mono text-gray-500">{localRank + 1}</td>
                    <td className="py-2 px-3 font-semibold text-gray-800">{m.pays}</td>
                    <td className="py-2 px-3 text-gray-500">{m.region}</td>
                    <td className="py-2 px-3 text-right font-mono" style={{ color: NAVY }}>{m.score_topsis.toFixed(4)}</td>
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      </CardShell>
    </div>
  )
}

// ── Onglet 4 : Monte Carlo Scores ─────────────────────────────────────────────

function MonteCarloTab({ mc, loading, error, onRetry }: {
  mc: MCData | null; loading: boolean; error: string | null; onRetry: () => void
}) {
  if (loading) return <div className="space-y-4"><SkeletonChart /><SkeletonChart /></div>
  if (error) return <ErrorPanel message={error} onRetry={onRetry} />
  if (!mc) return null

  const { classement } = mc

  // Opportunité vs Stabilité (business-oriented)
  // X = score attractivité normalisé 0-100 (distribution continue)
  // Y = stabilité classement 0-100 (inverse amplitude normalisée)
  // Z = prob_top10 comme taille de bulle
  const amps = classement.map(r => r.amplitude)
  const minAmp = Math.min(...amps), maxAmp = Math.max(...amps)
  const scores = classement.map(r => r.score_p50)
  const minScore = Math.min(...scores), maxScore = Math.max(...scores)

  const N = classement.length

  const bizData = classement.map(r => ({
    x: maxScore === minScore ? 50 : ((r.score_p50 - minScore) / (maxScore - minScore)) * 100,
    y: maxAmp === minAmp ? 50 : (1 - (r.amplitude - minAmp) / (maxAmp - minAmp)) * 100,
    // taille = rang inversé : rang 1 → bulle max, dernier rang → bulle min
    z: ((N - r.rang_p50 + 1) / N) * 100,
    pays: r.pays,
    rang: r.rang_p50,
    prob_top10: r.prob_top10,
    stabilite: maxAmp === minAmp ? 50 : (1 - (r.amplitude - minAmp) / (maxAmp - minAmp)) * 100,
    score: r.score_p50,
  }))

  // Seuils = médiane réelle pour répartition équilibrée
  const sortedX = [...bizData.map(d => d.x)].sort((a, b) => a - b)
  const sortedY = [...bizData.map(d => d.y)].sort((a, b) => a - b)
  const MID_X = sortedX[Math.floor(sortedX.length / 2)]
  const MID_Y = sortedY[Math.floor(sortedY.length / 2)]

  return (
    <div className="space-y-5">
      <MethodNote text="Score d'attractivité normalisé vs Stabilité du classement sur 10 000 simulations. La taille des bulles reflète le rang médian (plus la bulle est grande, meilleur est le classement)." />

      {/* Matrice Opportunité / Stabilité */}
      <CardShell>
        <SectionTitle sub="Score attractivité (axe x) · Stabilité classement (axe y) · Taille = rang médian">
          Matrice de Priorisation Marchés
        </SectionTitle>
        <ResponsiveContainer width="100%" height={540}>
          <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,93%)" />
            <XAxis
              type="number" dataKey="x" name="Score attractivité"
              domain={[0, 100]} tick={{ fontSize: 10 }}
              tickFormatter={v => `${v}%`}
              label={{ value: 'Score attractivité →', position: 'insideBottom', fontSize: 10, offset: -20 }}
            />
            <YAxis
              type="number" dataKey="y" name="Stabilité"
              domain={[0, 100]} tick={{ fontSize: 10 }}
              tickFormatter={v => `${v}%`}
              label={{ value: 'Stabilité du classement ↑', angle: -90, position: 'insideLeft', fontSize: 10, offset: -10 }}
            />
            <ZAxis type="number" dataKey="z" range={[40, 500]} name="Rang médian" />
            <ReferenceLine x={MID_X} stroke="hsl(0,0%,60%)" strokeDasharray="6 4" label={{ value: 'médiane', position: 'top', fontSize: 9, fill: 'hsl(0,0%,50%)' }} />
            <ReferenceLine y={MID_Y} stroke="hsl(0,0%,60%)" strokeDasharray="6 4" label={{ value: 'médiane', position: 'right', fontSize: 9, fill: 'hsl(0,0%,50%)' }} />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="bg-white px-3 py-2.5 rounded shadow-md text-xs" style={{ border: '1px solid hsl(0,0%,82%)' }}>
                    <div className="font-bold text-sm mb-1" style={{ color: NAVY }}>{d.pays}</div>
                    <div className="text-gray-500">Rang médian : <span className="font-semibold text-gray-700">#{d.rang}</span></div>
                    <div className="text-gray-500">Prob. Top 10 : <span className="font-semibold" style={{ color: GREEN }}>{(d.prob_top10 * 100).toFixed(1)}%</span></div>
                    <div className="text-gray-500">Stabilité : <span className="font-semibold" style={{ color: OLIVE }}>{(d.stabilite as number).toFixed(1)}%</span></div>
                    <div className="text-gray-500">Score attractivité : <span className="font-semibold" style={{ color: NAVY }}>{(d.score as number).toFixed(4)}</span></div>
                  </div>
                )
              }}
            />
            <Scatter data={bizData.filter(d => d.x >= MID_X && d.y >= MID_Y)} name="Marchés prioritaires" fill={GREEN} fillOpacity={0.85} />
            <Scatter data={bizData.filter(d => d.x >= MID_X && d.y < MID_Y)} name="Marchés prometteurs" fill={AMBER} fillOpacity={0.85} />
            <Scatter data={bizData.filter(d => d.x < MID_X && d.y >= MID_Y)} name="Marchés secondaires" fill={NAVY} fillOpacity={0.65} />
            <Scatter data={bizData.filter(d => d.x < MID_X && d.y < MID_Y)} name="À éviter" fill={RED} fillOpacity={0.75} />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-3 pb-1 flex-wrap">
          {[
            { color: GREEN,  label: 'Marchés prioritaires' },
            { color: AMBER,  label: 'Marchés prometteurs' },
            { color: NAVY,   label: 'Marchés secondaires' },
            { color: RED,    label: 'À éviter' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color }} />
              {label}
            </div>
          ))}
        </div>
      </CardShell>

      {/* Tableau détaillé */}
      <CardShell style={{ padding: 0, overflow: 'hidden' }}>
        <div className="px-5 pt-4 pb-2">
          <SectionTitle>Classement complet MC Scores</SectionTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'hsl(0,0%,97%)' }}>
                <th className="text-left py-2 px-3 font-bold text-gray-600">Rang P50</th>
                <th className="text-left py-2 px-3 font-bold text-gray-600">Pays</th>
                <th className="text-right py-2 px-3 font-bold text-gray-600">Score P50</th>
                <th className="text-right py-2 px-3 font-bold text-gray-600">IC Rang [P10–P90]</th>
                <th className="text-right py-2 px-3 font-bold text-gray-600">Prob. Top 5</th>
                <th className="text-right py-2 px-3 font-bold text-gray-600">Prob. Top 10</th>
                <th className="text-right py-2 px-3 font-bold text-gray-600">Amplitude</th>
              </tr>
            </thead>
            <tbody>
              {classement.map(r => (
                <tr key={r.pays} className="border-t hover:bg-gray-50" style={{ borderColor: 'hsl(0,0%,94%)' }}>
                  <td className="py-2 px-3 font-bold" style={{ color: r.rang_p50 <= 5 ? OLIVE : '#9ca3af' }}>{r.rang_p50}</td>
                  <td className="py-2 px-3 font-semibold text-gray-800">{r.pays}</td>
                  <td className="py-2 px-3 text-right font-mono" style={{ color: NAVY }}>{r.score_p50.toFixed(4)}</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-500">[{r.rang_p10}–{r.rang_p90}]</td>
                  <td className="py-2 px-3 text-right font-mono" style={{ color: GREEN }}>{fmtPct(r.prob_top5)}</td>
                  <td className="py-2 px-3 text-right font-mono" style={{ color: OLIVE }}>{fmtPct(r.prob_top10)}</td>
                  <td className="py-2 px-3 text-right font-mono" style={{ color: r.amplitude > 0.1 ? RED : '#6b7280' }}>
                    {r.amplitude.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardShell>
    </div>
  )
}

// ── Onglet 5 : Carte & Comparaison ────────────────────────────────────────────

type CarteVariable = 'topsis' | 'monte_carlo'

const CARTE_VARIABLES: { id: CarteVariable; label: string }[] = [
  { id: 'topsis',       label: 'Score TOPSIS' },
  { id: 'monte_carlo',  label: 'Score Monte Carlo' },
]

function CarteTab({ overview }: { overview: OverviewData }) {
  const { concordance, topsis } = overview
  const [zoom, setZoom] = useState(1)
  const [hovered, setHovered] = useState<{ pays: string; score: number; rang: number } | null>(null)
  const [variable, setVariable] = useState<CarteVariable>('topsis')

  const scoreByPays = useMemo(() => {
    const m: Record<string, number> = {}
    if (variable === 'topsis') {
      topsis.classement.forEach(r => { m[r.pays] = r.score_topsis })
    } else {
      overview.mc_scores.classement.forEach(r => { m[r.pays] = r.score_p50 })
    }
    return m
  }, [variable, topsis.classement, overview.mc_scores.classement])

  const rangByPays = useMemo(() => {
    const m: Record<string, number> = {}
    if (variable === 'topsis') {
      topsis.classement.forEach(r => { m[r.pays] = r.rang })
    } else {
      overview.mc_scores.classement.forEach(r => { m[r.pays] = r.rang_p50 })
    }
    return m
  }, [variable, topsis.classement, overview.mc_scores.classement])

  // Normalize scores to [0,1] relative to actual data range for full palette use
  const { scoreMin, scoreMax } = useMemo(() => {
    const scores = Object.values(scoreByPays)
    return { scoreMin: Math.min(...scores), scoreMax: Math.max(...scores) }
  }, [scoreByPays])

  const normalizedColor = useCallback((score: number) => {
    const t = (score - scoreMin) / Math.max(scoreMax - scoreMin, 1e-9)
    return interpolatePositioned(t, SCORE_COLOR_STOPS)
  }, [scoreMin, scoreMax])

  return (
    <div className="space-y-5">
      {/* Choroplèthe */}
      <CardShell>
        <div className="mb-3">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-1"
            style={{ borderBottom: `2px solid hsla(83,52%,42%,0.20)` }}>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: NAVY }}>
              Carte Choroplèthe Afrique —{' '}
              {variable === 'topsis' ? 'Score TOPSIS 2030' : 'Score Monte Carlo 2030'}
            </h2>
            {/* Variable selector */}
            <div className="flex gap-1">
              {CARTE_VARIABLES.map(v => (
                <button
                  key={v.id}
                  onClick={() => { setVariable(v.id); setHovered(null) }}
                  className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                  style={variable === v.id
                    ? { background: NAVY, color: 'white', border: `1.5px solid ${NAVY}` }
                    : { background: 'white', color: NAVY, border: `1.5px solid ${NAVY}` }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          {/* Color palette */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-semibold text-gray-500">À surveiller</span>
            <div className="h-3 flex-1 max-w-48 rounded"
              style={{ background: `linear-gradient(to right, ${SCORE_COLOR_STOPS.map(s => s[1]).join(',')})` }} />
            <span className="text-[10px] font-semibold text-gray-500">Très attractif</span>
            <span className="text-[10px] text-gray-400 font-mono ml-1">
              ({scoreMin.toFixed(3)} → {scoreMax.toFixed(3)})
            </span>
          </div>
        </div>

        {/* Info bar + zoom controls */}
        <div className="flex items-center justify-between mb-2 gap-2 min-h-[32px]">
          {hovered ? (
            <div className="text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: `${NAVY}10`, color: NAVY }}>
              <span className="font-bold">{hovered.pays}</span>
              <span className="mx-2 text-gray-400">·</span>
              {variable === 'topsis' ? 'TOPSIS' : 'MC P50'} : <span className="font-mono">{hovered.score.toFixed(4)}</span>
              <span className="mx-2 text-gray-400">·</span>
              Rang : <span className="font-bold">#{hovered.rang}</span>
            </div>
          ) : (
            <p className="text-[11px] italic text-gray-400">Survolez un pays pour voir son score et classement</p>
          )}
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => setZoom(z => Math.max(0.5, parseFloat((z - 0.2).toFixed(1))))}
              className="w-8 h-8 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              style={{ border: '1px solid hsl(0,0%,82%)' }}>−</button>
            <button
              onClick={() => setZoom(z => Math.min(3, parseFloat((z + 0.2).toFixed(1))))}
              className="w-8 h-8 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              style={{ border: '1px solid hsl(0,0%,82%)' }}>+</button>
          </div>
        </div>

        <div style={{ height: 420, background: 'hsl(210,40%,98%)', borderRadius: 8, overflow: 'hidden' }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ center: [20, 0], scale: 400 * zoom }}
            style={{ width: '100%', height: '100%' }}>
            <ZoomableGroup>
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies
                    .filter(geo => AFRICA_NUMERIC.has(Number(geo.id)))
                    .map(geo => {
                      const iso3 = NUMERIC_TO_ISO3[Number(geo.id)]
                      const paysName = iso3 ? ISO3_TO_PAYS33[iso3] : undefined
                      const score = paysName != null ? scoreByPays[paysName] : undefined
                      const rang = paysName != null ? rangByPays[paysName] : undefined
                      const fill = score != null
                        ? normalizedColor(score)
                        : 'hsl(0,0%,88%)'
                      return (
                        <Geography key={geo.rsmKey} geography={geo}
                          fill={fill} stroke="white" strokeWidth={0.5}
                          onMouseEnter={() => {
                            if (paysName && score != null && rang != null) {
                              setHovered({ pays: paysName, score, rang })
                            }
                          }}
                          onMouseLeave={() => setHovered(null)}
                          style={{ default: { outline: 'none' }, hover: { outline: 'none', opacity: 0.82, cursor: 'pointer' }, pressed: { outline: 'none' } }}
                        />
                      )
                    })
                }
              </Geographies>
              {/* Mauritius — trop petite pour apparaître dans le fond de carte 110m */}
              {(() => {
                const score = scoreByPays['Maurice']
                const rang  = rangByPays['Maurice']
                if (score == null) return null
                const fill = normalizedColor(score)
                return (
                  <Marker coordinates={[57.55, -20.29]}>
                    <circle r={7} fill={fill} stroke="white" strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHovered({ pays: 'Maurice', score, rang })}
                      onMouseLeave={() => setHovered(null)} />
                    <text y={-10} textAnchor="middle" fontSize={7} fill="#333" style={{ pointerEvents: 'none' }}>
                      Maurice
                    </text>
                  </Marker>
                )
              })()}
            </ZoomableGroup>
          </ComposableMap>
        </div>
        <MethodNote text={variable === 'topsis'
          ? "La colorisation utilise les scores TOPSIS 2030 calculés par la méthode PCA. Les pays non colorés manquent de données suffisantes."
          : "La colorisation utilise les scores Monte Carlo P50 2030 (médiane sur 10 000 simulations). Les pays non colorés manquent de données suffisantes."
        } />
      </CardShell>


      {/* Tableau concordance */}
      <CardShell style={{ padding: 0, overflow: 'hidden' }}>
        <div className="px-5 pt-4 pb-2">
          <SectionTitle>Tableau Multi-méthodes</SectionTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'hsl(0,0%,97%)' }}>
                <th className="text-left py-2 px-3 font-bold text-gray-600">Pays</th>
                <th className="text-left py-2 px-3 font-bold text-gray-600 hidden md:table-cell">Région</th>
                <th className="text-right py-2 px-3 font-bold text-gray-600">Rang TOPSIS</th>
                <th className="text-right py-2 px-3 font-bold text-gray-600">Rang MC P50</th>
                <th className="text-right py-2 px-3 font-bold text-gray-600">Δ max</th>
                <th className="text-left py-2 px-3 font-bold text-gray-600">Robustesse</th>
              </tr>
            </thead>
            <tbody>
              {concordance.map(r => (
                <tr key={r.pays} className="border-t hover:bg-gray-50" style={{ borderColor: 'hsl(0,0%,94%)' }}>
                  <td className="py-2 px-3 font-semibold text-gray-800">{r.pays}</td>
                  <td className="py-2 px-3 text-gray-500 hidden md:table-cell">
                    <span className="px-1.5 py-0.5 rounded-full text-[10px]"
                      style={{ background: `${REGION_COLORS[r.region] ?? NAVY}12`, color: REGION_COLORS[r.region] ?? NAVY }}>
                      {r.region}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono" style={{ color: NAVY }}>{r.rang_topsis}</td>
                  <td className="py-2 px-3 text-right font-mono text-gray-600">{r.rang_mc_p50}</td>
                  <td className="py-2 px-3 text-right font-mono" style={{ color: r.delta > 5 ? RED : r.delta > 3 ? AMBER : GREEN }}>
                    {r.delta}
                  </td>
                  <td className="py-2 px-3">
                    {r.robust
                      ? <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${GREEN}12`, color: GREEN }}>✓ Robuste</span>
                      : <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${AMBER}12`, color: AMBER }}>Divergent</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardShell>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

export default function ScoringAxe2() {
  const [activeTab, setActiveTab] = useState<TabId>('classement')

  // Overview (shared across tabs 1, 5)
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState<string | null>(null)

  // Per-tab lazy data (tabs 2, 3, 4 can use overview data directly)
  const [topsisData, setTopsisData] = useState<TopsisData | null>(null)
  const [topsisLoading, setTopsisLoading] = useState(false)
  const [topsisError, setTopsisError] = useState<string | null>(null)

  const [biplotData, setBiplotData] = useState<PcaBiplotData | null>(null)

  const [clusteringData, setClusteringData] = useState<ClusteringData | null>(null)
  const [clusteringLoading, setClusteringLoading] = useState(false)
  const [clusteringError, setClusteringError] = useState<string | null>(null)

  const [mcData, setMcData] = useState<MCData | null>(null)
  const [mcLoading, setMcLoading] = useState(false)
  const [mcError, setMcError] = useState<string | null>(null)

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true)
    setOverviewError(null)
    try {
      const res = await api.get('/scoring-axe2/overview')
      setOverview(res.data)
      // Pre-populate per-tab data from overview response
      setTopsisData(res.data.topsis)
      setBiplotData(res.data.pca_biplot)
      setClusteringData(res.data.clustering)
      setMcData(res.data.mc_scores)
    } catch (e: any) {
      setOverviewError(extractErrMsg(e))
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  const fetchTopsis = useCallback(async () => {
    if (topsisData) return
    setTopsisLoading(true)
    setTopsisError(null)
    try {
      const res = await api.get('/scoring-axe2/topsis')
      setTopsisData(res.data)
    } catch (e: any) {
      setTopsisError(extractErrMsg(e))
    } finally {
      setTopsisLoading(false)
    }
  }, [topsisData])

  const fetchBiplot = useCallback(async () => {
    if (biplotData) return
    try {
      const res = await api.get('/scoring-axe2/pca-biplot-data')
      setBiplotData(res.data)
    } catch {
      // biplot non critique — le reste du tab reste fonctionnel
    }
  }, [biplotData])

  const fetchClustering = useCallback(async () => {
    if (clusteringData) return
    setClusteringLoading(true)
    setClusteringError(null)
    try {
      const res = await api.get('/scoring-axe2/clustering')
      setClusteringData(res.data)
    } catch (e: any) {
      setClusteringError(extractErrMsg(e))
    } finally {
      setClusteringLoading(false)
    }
  }, [clusteringData])

  const fetchMc = useCallback(async () => {
    if (mcData) return
    setMcLoading(true)
    setMcError(null)
    try {
      const res = await api.get('/scoring-axe2/monte-carlo-scores')
      setMcData(res.data)
    } catch (e: any) {
      setMcError(extractErrMsg(e))
    } finally {
      setMcLoading(false)
    }
  }, [mcData])

  // Initial load
  useEffect(() => { fetchOverview() }, [fetchOverview])

  // Tab-triggered lazy loads
  useEffect(() => {
    if (activeTab === 'topsis' && !topsisData && !topsisLoading) fetchTopsis()
    if (activeTab === 'topsis' && !biplotData) fetchBiplot()
    if (activeTab === 'clustering' && !clusteringData && !clusteringLoading) fetchClustering()
    if (activeTab === 'montecarlo' && !mcData && !mcLoading) fetchMc()
  }, [activeTab, topsisData, topsisLoading, biplotData, clusteringData, clusteringLoading, mcData, mcLoading, fetchTopsis, fetchBiplot, fetchClustering, fetchMc])

  return (
    <div className="px-6 py-5" style={{ background: 'hsl(210,20%,98%)', minHeight: '100%' }}>
      {/* Hero Header */}
      <div className="rounded-2xl p-5 mb-4"
        style={{
          background: `linear-gradient(135deg, ${OLIVE} 0%, hsl(83,52%,28%) 100%)`,
          boxShadow: '0 8px 32px hsla(83,40%,20%,0.18)',
        }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
              🎯 Scoring Intelligent des Marchés Africains 2030
            </h1>
            <p className="text-white/85 text-sm mt-1">
              4 méthodes complémentaires · 33 marchés · Horizon 2030
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {[
            'TOPSIS + PCA',
            'K-Means Clustering',
            'Monte Carlo Scores',
            'Analyse Conforme',
          ].map((b, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold backdrop-blur"
              style={{ background: 'hsla(0,0%,100%,0.20)', color: 'white', border: '1px solid hsla(0,0%,100%,0.25)' }}>
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
        <TabProgress activeTab={activeTab} />

        {/* Initial loading */}
        {overviewLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <SkeletonChart key={i} h={90} />)}
            </div>
            <SkeletonChart h={280} />
            <SkeletonChart h={400} />
          </div>
        )}

        {overviewError && !overviewLoading && (
          <ErrorPanel message={overviewError} onRetry={fetchOverview} />
        )}

        {overview && !overviewLoading && (
          <>
            {activeTab === 'classement' && <ClassementTab overview={overview} />}

            {activeTab === 'topsis' && (
              <TopsisTab
                topsis={topsisData}
                biplot={biplotData}
                loading={topsisLoading}
                error={topsisError}
                onRetry={() => { setTopsisData(null); setBiplotData(null); fetchTopsis(); fetchBiplot() }}
              />
            )}

            {activeTab === 'clustering' && (
              <ClusteringTab
                clustering={clusteringData}
                loading={clusteringLoading}
                error={clusteringError}
                onRetry={() => { setClusteringData(null); fetchClustering() }}
              />
            )}

            {activeTab === 'montecarlo' && (
              <MonteCarloTab
                mc={mcData}
                loading={mcLoading}
                error={mcError}
                onRetry={() => { setMcData(null); fetchMc() }}
              />
            )}

            {activeTab === 'carte' && <CarteTab overview={overview} />}
          </>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.25s ease-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
