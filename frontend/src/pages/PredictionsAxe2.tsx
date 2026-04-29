/**
 * PredictionsAxe2.tsx — Page Prédictions Marchés Africains 2030 (Axe 2)
 *
 * 6 onglets :
 *   1. Vue d'ensemble    🔮 — KPIs + barchart top 10 + tableau récapitulatif + Qualité du Modèle
 *   2. Trajectoires      📈 — Top N pays superposés + radar 2030
 *   3. Analyse par Pays  🌍 — Toutes variables d'un pays
 *   4. Par Variable      📊 — Classement et top 5 séries
 *   5. Comparaison       ⚖️ — Deux pays côte à côte
 *   6. Carte 2030        🗺️ — Choroplèthe Afrique
 *
 * Backend : /api/predictions/axe2/* (FE-OLS + Ridge + ARIMA + GP + XGBoost,
 *           Conformal Prediction IC, blending Axco optionnel)
 */
import { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, LineChart, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Area, Line, ReferenceLine,
  Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import Select from 'react-select'
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, Activity, Zap,
} from 'lucide-react'
import {
  ComposableMap, Geographies, Geography, ZoomableGroup,
} from 'react-simple-maps'
import api from '../utils/api'
import {
  NUMERIC_TO_ISO3, ISO3_NAMES,
  AFRICA_NUMERIC, interpolatePositioned, COLOR_SCALES_POSITIONED,
} from '../utils/cartographieConstants'

// ── Couleurs Axe 2 ────────────────────────────────────────────────────────────
const OLIVE = 'hsl(83,52%,36%)'
const NAVY = 'hsl(213,60%,27%)'
const GREEN = 'hsl(152,56%,39%)'
const RED = 'hsl(358,66%,54%)'
const ORANGE = 'hsl(30,88%,56%)'
const VIOLET = 'hsl(270,50%,45%)'
const BLUE = 'hsl(200,70%,40%)'
const GRAY = 'hsl(218,14%,55%)'
const OLIVE_15 = 'hsla(83,52%,36%,0.15)'
const OLIVE_8 = 'hsla(83,52%,36%,0.08)'

const TOP_COLORS = [OLIVE, NAVY, GREEN, ORANGE, VIOLET, RED, BLUE, '#8E44AD', '#D35400', '#16A085']

const REGION_COLORS: Record<string, string> = {
  'Afrique du Nord': NAVY,
  "Afrique de l'Ouest": ORANGE,
  'Afrique Centrale': BLUE,
  "Afrique de l'Est": GREEN,
  'Afrique Australe': VIOLET,
}

// Couleurs badge par famille de modèle
const MODEL_COLORS: Record<string, { bg: string; fg: string }> = {
  'FE-OLS+Ridge+ARIMA': { bg: 'hsla(213,60%,27%,0.10)', fg: NAVY },
  'AR2+Ridge+XGBoost': { bg: 'hsla(30,88%,56%,0.15)', fg: ORANGE },
  GaussianProcess: { bg: 'hsla(270,50%,45%,0.13)', fg: VIOLET },
  'AR1-MR': { bg: 'hsla(83,52%,36%,0.13)', fg: OLIVE },
  'Ridge-Hierarchique': { bg: 'hsla(200,70%,40%,0.13)', fg: BLUE },
  Derived: { bg: 'hsla(218,14%,55%,0.13)', fg: GRAY },
}

// FIX [D2] — variables qui héritent du blending Axco (alignées sur le backend _build_var_data)
const AXCO_BLENDED_VARS = new Set(['gdp_growth', 'gdpcap', 'gdp', 'nv_primes', 'vie_primes', 'nv_densite', 'vie_densite'])

const MODEL_LABEL: Record<string, string> = {
  'FE-OLS+Ridge+ARIMA': 'FE-OLS + Ridge',
  'AR2+Ridge+XGBoost': 'AR(2) + XGB',
  GaussianProcess: 'GP',
  'AR1-MR': 'AR(1) MR',
  'Ridge-Hierarchique': 'Ridge Hiérar.',
  Derived: 'Dérivée',
}

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// ── Types ─────────────────────────────────────────────────────────────────────
interface HistPoint { annee: number; valeur: number }
interface PredPoint { annee: number; valeur: number; ic_lower: number; ic_upper: number }

interface VarData {
  variable: string
  label: string
  unite: string
  sens_favorable: 'hausse' | 'baisse'
  dimension: string
  modele: string
  r2_walforward: number | null
  mape: number | null
  q80: number | null
  q95: number | null
  historique: HistPoint[]
  predictions: PredPoint[]
  axco_blended: boolean
}

interface OverviewRow {
  pays: string
  region: string
  nv_penetration_2024: number | null
  vie_penetration_2024: number | null
  nv_sp_2024: number | null
  gdpcap_2024: number | null
  gdp_2024: number | null
  gdp_growth_2024: number | null
  polstab_2024: number | null
  regqual_2024: number | null
  nv_primes_2024: number | null
  vie_primes_2024: number | null
  nv_penetration_2030: number | null
  vie_penetration_2030: number | null
  nv_sp_2030: number | null
  gdpcap_2030: number | null
  gdp_2030: number | null
  gdp_growth_2030: number | null
  polstab_2030: number | null
  regqual_2030: number | null
  nv_primes_2030: number | null
  vie_primes_2030: number | null
  nv_penetration_var_pct: number | null
  nv_primes_var_pct: number | null
  gdpcap_var_pct: number | null
  nv_penetration_ic_low: number | null
  nv_penetration_ic_up: number | null
  nv_primes_ic_low: number | null
  nv_primes_ic_up: number | null
  nv_sp_ic_low: number | null
  nv_sp_ic_up: number | null
  gdpcap_ic_low: number | null
  gdpcap_ic_up: number | null
}

interface VariableMeta {
  label: string
  unite: string
  sens_favorable: 'hausse' | 'baisse'
  dimension: string
  modele: string
}

interface Metadata {
  pays: string[]
  pays_with_region: { pays: string; region: string }[]
  regions: string[]
  regions_pays: Record<string, string[]>
  target_vars: string[]
  derived_vars: string[]
  all_vars: string[]
  variables: Record<string, VariableMeta>
  annees_historique: number[]
  annees_prediction: number[]
  axco_loaded: boolean
  axco_filename: string | null
}

interface ValidationMetrics {
  axco_loaded: boolean
  axco_filename: string | null
  elapsed_seconds: number
  variables: Record<string, {
    modele: string
    label: string
    dimension: string
    r2_mean: number | null
    mape_mean: number | null
    mae: number | null
    n_calibration: number | null
    q80: number | null
    q95: number | null
  }>
  coherence_tests: {
    bounds_ok: boolean
    ic_ok: boolean
    axco_alignment: { mae_gdp_growth: number | null; mae_gdpcap: number | null } | null
    alerts_count: number
    alerts_sample: string[]
  }
}

// ── Helpers de format ─────────────────────────────────────────────────────────
const fmtPct = (v: number | null | undefined, dec = 1) =>
  v == null || isNaN(v) ? '—' : `${v.toFixed(dec)} %`
const fmtPctSgn = (v: number | null | undefined, dec = 1) =>
  v == null || isNaN(v) ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(dec)} %`
const fmtMn = (v: number | null | undefined) =>
  v == null || isNaN(v) ? '—' : v >= 1000 ? `${(v / 1000).toFixed(1)} Mrd$` : `${v.toFixed(0)} Mn$`
const fmtUsd = (v: number | null | undefined) =>
  v == null || isNaN(v) ? '—' : `$${Math.round(v).toLocaleString()}`
const fmtUsdHab = (v: number | null | undefined) =>
  v == null || isNaN(v) ? '—' : `$${Math.round(v).toLocaleString()}/hab`
const fmtWgi = (v: number | null | undefined) =>
  v == null || isNaN(v) ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}`
const fmtR2 = (v: number | null | undefined) =>
  v == null || isNaN(v) ? '—' : v.toFixed(3)
const fmtNum = (v: number | null | undefined, dec = 2) =>
  v == null || isNaN(v) ? '—' : v.toFixed(dec)

function formatByUnite(v: number | null | undefined, unite: string): string {
  if (v == null || isNaN(v)) return '—'
  if (unite === 'Mn USD') return fmtMn(v)
  if (unite === 'USD/hab') return fmtUsdHab(v)
  if (unite === 'USD') return fmtUsd(v)
  if (unite === '%') return fmtPct(v)
  if (unite === 'indice') return fmtWgi(v)
  return fmtNum(v)
}

// ── Composants atomiques ──────────────────────────────────────────────────────
function ModelBadge({ modele, blended }: { modele: string; blended?: boolean }) {
  const c = MODEL_COLORS[modele] ?? MODEL_COLORS.Derived
  const label = MODEL_LABEL[modele] ?? modele
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
      style={{ background: c.bg, color: c.fg }}>
      {label}
      {blended && <span title="Axco blended" className="opacity-80">✓ Axco</span>}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 pb-2"
      style={{ borderBottom: '2px solid hsla(83,52%,42%,0.20)' }}>
      {children}
    </h2>
  )
}

function DeltaBadge({ v, sensFavorable }: { v: number | null; sensFavorable: 'hausse' | 'baisse' }) {
  if (v == null || isNaN(v)) return <span className="text-gray-400">—</span>
  const isFavorable = sensFavorable === 'hausse' ? v > 0 : v < 0
  const isFlat = Math.abs(v) < 0.5
  const Icon = isFlat ? Minus : (v > 0 ? TrendingUp : TrendingDown)
  const color = isFlat ? GRAY : (isFavorable ? GREEN : RED)
  return (
    <span className="inline-flex items-center gap-0.5 font-semibold text-[11px]"
      style={{ color }}>
      <Icon size={12} />
      {fmtPctSgn(v, 1)}
    </span>
  )
}

function SortableTh<K extends string>({
  children, sortKey, currentKey, dir, onSort, align = 'left', width,
}: {
  children: React.ReactNode
  sortKey: K
  currentKey: K
  dir: 'asc' | 'desc'
  onSort: (k: K) => void
  align?: 'left' | 'right'
  width?: string
}) {
  const active = sortKey === currentKey
  const arrow = active ? (dir === 'asc' ? '▲' : '▼') : '↕'
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`${align === 'right' ? 'text-right' : 'text-left'} py-2 px-2 cursor-pointer select-none hover:bg-gray-50 ${width ?? ''}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <span>{children}</span>
        <span className={`text-[9px] ${active ? 'text-gray-700' : 'text-gray-300'}`}>{arrow}</span>
      </span>
    </th>
  )
}

// ── Skeleton loaders ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return <div className="rounded-xl bg-gray-100 animate-pulse" style={{ height: 100 }} />
}
function SkeletonChart() {
  return <div className="rounded-xl bg-gray-100 animate-pulse" style={{ height: 320 }} />
}

// FIX [E2] — panneau d'erreur réutilisable pour les sous-tabs
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

function extractErrMsg(e: any): string {
  return e?.response?.data?.detail ?? e?.message ?? 'Erreur réseau ou serveur.'
}

// ── PredChart : un graphique historique + prédictions avec IC ────────────────
interface PredChartProps {
  variable: string
  label: string
  unite: string
  historique: HistPoint[]
  predictions: PredPoint[]
  modele: string
  r2: number | null
  mape: number | null
  height?: number
  axcoBlended?: boolean  // FIX [D2]
}

function PredChart({
  label, unite, historique, predictions, modele, r2, mape, height = 250, axcoBlended,
}: PredChartProps) {
  // FIX [D1] — `ic_band` est un tuple [lower, upper] : Recharts dessine alors une bande
  // entre les deux valeurs sans dépendre du baseline 0 (corrige le rendu pour gdp_growth, polstab, regqual).
  const data = useMemo(() => {
    const map: Record<number, any> = {}
    historique.forEach(h => { map[h.annee] = { annee: h.annee, hist: h.valeur } })
    predictions.forEach(p => {
      const existing = map[p.annee] ?? { annee: p.annee }
      map[p.annee] = {
        ...existing,
        pred: p.valeur,
        ic_lower: p.ic_lower,
        ic_upper: p.ic_upper,
        ic_band: [p.ic_lower, p.ic_upper],
      }
    })
    if (map[2024]) {
      map[2024].pred = map[2024].hist
      map[2024].ic_lower = map[2024].hist
      map[2024].ic_upper = map[2024].hist
      map[2024].ic_band = [map[2024].hist, map[2024].hist]
    }
    return Object.values(map).sort((a: any, b: any) => a.annee - b.annee)
  }, [historique, predictions])

  return (
    <div className="bg-white rounded-xl p-3" style={{ border: '1px solid hsl(0,0%,90%)' }}>
      <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-800">{label}</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">{unite}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ModelBadge modele={modele} blended={axcoBlended} />
          {r2 != null && (
            <span className="text-[10px] font-mono text-gray-600">R²={fmtR2(r2)}</span>
          )}
          {mape != null && (
            <span className="text-[10px] font-mono text-gray-600">MAPE={fmtPct(mape)}</span>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data as any[]} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,93%)" />
          <XAxis dataKey="annee" tick={{ fontSize: 10 }} stroke="hsl(0,0%,50%)" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(0,0%,50%)" />
          <Tooltip
            content={({ payload, label: lbl }) => {
              if (!payload || !payload.length) return null
              const d: any = payload[0].payload
              return (
                <div className="bg-white px-2.5 py-2 rounded shadow text-xs"
                  style={{ border: '1px solid hsl(0,0%,85%)' }}>
                  <div className="font-bold text-gray-800 mb-1">{lbl}</div>
                  {d.hist != null && <div>Historique : <strong>{formatByUnite(d.hist, unite)}</strong></div>}
                  {d.pred != null && d.annee > 2024 && (
                    <>
                      <div>Prédiction : <strong>{formatByUnite(d.pred, unite)}</strong></div>
                      <div className="text-gray-500">IC 95% : [{formatByUnite(d.ic_lower, unite)} ; {formatByUnite(d.ic_upper, unite)}]</div>
                    </>
                  )}
                </div>
              )
            }}
          />
          {/* FIX [D1+D3] — bande IC via tuple [lower, upper], opacité 0.12 conforme spec */}
          <Area type="monotone" dataKey="ic_band" stroke="none" fill={OLIVE} fillOpacity={0.12} />
          <ReferenceLine x={2024} stroke="hsl(0,0%,70%)" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="hist" stroke={NAVY} strokeWidth={2} dot={{ r: 2.5 }} />
          <Line type="monotone" dataKey="pred" stroke={OLIVE} strokeWidth={2}
            strokeDasharray="6 3" dot={{ r: 2.5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Onglets ───────────────────────────────────────────────────────────────────
type TabId = 'overview' | 'trajectoires' | 'pays' | 'variable' | 'comparaison' | 'carte'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: "Vue d'ensemble", icon: '🔮' },
  { id: 'trajectoires', label: 'Trajectoires', icon: '📈' },
  { id: 'pays', label: 'Analyse par Pays', icon: '🌍' },
  { id: 'variable', label: 'Par Variable', icon: '📊' },
  { id: 'comparaison', label: 'Comparaison', icon: '⚖️' },
  { id: 'carte', label: 'Carte 2030', icon: '🗺️' },
]

function TabNav({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden mb-1"
      style={{ border: '1px solid hsl(0,0%,90%)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div className="flex overflow-x-auto scrollbar-hide">
        {TABS.map(tab => {
          const isActive = active === tab.id
          return (
            <button key={tab.id} onClick={() => onChange(tab.id)}
              className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all relative flex-shrink-0"
              style={isActive
                ? { color: 'hsl(83,52%,30%)', background: OLIVE_8, borderBottom: `2px solid ${OLIVE}` }
                : { color: '#6b7280', borderBottom: '2px solid transparent' }
              }>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TabProgress({ active }: { active: TabId }) {
  const idx = TABS.findIndex(t => t.id === active)
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {TABS.map((_, i) => (
        <div key={i} className="h-1 rounded-full transition-all"
          style={{
            flex: 1,
            background: i === idx ? OLIVE : (i < idx ? OLIVE_15 : 'hsl(0,0%,90%)'),
          }} />
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export default function PredictionsAxe2() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [validation, setValidation] = useState<ValidationMetrics | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [metaError, setMetaError] = useState<string | null>(null)  // FIX [E2]
  const [metaRetryKey, setMetaRetryKey] = useState(0)
  const [activeRegion, setActiveRegion] = useState<string>('all')
  const [selectedPays, setSelectedPays] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [cacheVersion, setCacheVersion] = useState(0)

  function handleCountryClick(pays: string) {
    setSelectedPays(pays)
    setActiveTab('pays')
  }

  async function handleRefresh() {
    setIsRefreshing(true)
    setRefreshError(null)
    try {
      await api.get('/predictions/axe2/refresh')
      const v = await api.get<ValidationMetrics>('/predictions/axe2/validation')
      setValidation(v.data)
      setCacheVersion(n => n + 1)
    } catch {
      setRefreshError('Erreur lors du recalcul. Vérifier les logs serveur.')
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    document.getElementById('scar-main-scroll')?.scrollTo({ top: 0, behavior: 'instant' })
  }, [activeTab])

  useEffect(() => {
    setLoadingMeta(true)
    setMetaError(null)
    Promise.all([
      api.get<Metadata>('/predictions/axe2/metadata').then(r => setMetadata(r.data)),
      api.get<ValidationMetrics>('/predictions/axe2/validation').then(r => setValidation(r.data)),
    ])
      .catch(e => setMetaError(extractErrMsg(e)))  // FIX [E2]
      .finally(() => setLoadingMeta(false))
  }, [metaRetryKey])

  if (metaError && !metadata) {
    return (
      <div className="px-6 py-6">
        <ErrorPanel message={metaError} onRetry={() => setMetaRetryKey(k => k + 1)} />
      </div>
    )
  }
  if (loadingMeta || !metadata) {
    return (
      <div className="px-6 py-6 space-y-3">
        <SkeletonChart />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-5" style={{ background: 'hsl(210,20%,98%)', minHeight: '100%', cursor: isRefreshing ? 'wait' : undefined }}>
      {isRefreshing && (
        <div className="rounded-xl p-3 mb-3 flex items-center gap-2 text-sm font-semibold animate-fade-in"
          style={{ background: 'hsla(30,88%,56%,0.12)', border: `1px solid ${ORANGE}55`, color: ORANGE }}>
          <RefreshCw size={16} className="animate-spin" />
          ⏳ Recalcul du modèle en cours, les données affichées seront mises à jour automatiquement.
        </div>
      )}

      <Header metadata={metadata} validation={validation} />

      <div className={isRefreshing ? 'opacity-60' : ''} aria-busy={isRefreshing}
        style={isRefreshing ? { pointerEvents: 'none' } : undefined}>
        <div className="bg-white rounded-xl p-3 mb-4 flex items-center gap-3 flex-wrap"
          style={{ border: '1px solid hsl(0,0%,90%)' }}>
          <span className="text-xs font-semibold text-gray-600">Région :</span>
          <button onClick={() => setActiveRegion('all')} disabled={isRefreshing}
            className="px-3 py-1 rounded-full text-[11px] font-semibold transition-colors"
            style={activeRegion === 'all' ? { background: OLIVE, color: 'white' } : { background: 'hsl(0,0%,93%)', color: '#6b7280' }}>
            Toutes
          </button>
          {metadata.regions.map(r => (
            <button key={r} onClick={() => setActiveRegion(r)} disabled={isRefreshing}
              className="px-3 py-1 rounded-full text-[11px] font-semibold transition-colors"
              style={activeRegion === r
                ? { background: REGION_COLORS[r] ?? OLIVE, color: 'white' }
                : { background: 'hsl(0,0%,93%)', color: '#6b7280' }}>
              {r}
            </button>
          ))}
        </div>

        <TabNav active={activeTab} onChange={setActiveTab} />
        <TabProgress active={activeTab} />

        <div className="animate-fade-in">
          {activeTab === 'overview' && <OverviewTab activeRegion={activeRegion} onCountryClick={handleCountryClick} cacheVersion={cacheVersion} isRefreshing={isRefreshing} validation={validation} refreshError={refreshError} onRefresh={handleRefresh} />}
          {activeTab === 'trajectoires' && <TrajectoiresTab metadata={metadata} cacheVersion={cacheVersion} isRefreshing={isRefreshing} />}
          {activeTab === 'pays' && <PaysTab metadata={metadata} selectedPays={selectedPays} setSelectedPays={setSelectedPays} cacheVersion={cacheVersion} isRefreshing={isRefreshing} />}
          {activeTab === 'variable' && <VariableTab metadata={metadata} cacheVersion={cacheVersion} isRefreshing={isRefreshing} />}
          {activeTab === 'comparaison' && <ComparaisonTab metadata={metadata} cacheVersion={cacheVersion} isRefreshing={isRefreshing} />}
          {activeTab === 'carte' && <CarteTab metadata={metadata} cacheVersion={cacheVersion} isRefreshing={isRefreshing} />}
        </div>
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

// ════════════════════════════════════════════════════════════════════════════
// HEADER
// ════════════════════════════════════════════════════════════════════════════

function Header({ metadata, validation }: { metadata: Metadata; validation: ValidationMetrics | null }) {
  return (
    <div className="rounded-2xl p-5 mb-4"
      style={{
        background: `linear-gradient(135deg, ${OLIVE} 0%, hsl(83,52%,28%) 100%)`,
        boxShadow: '0 8px 32px hsla(83,40%,20%,0.18)',
      }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🔮 Prédictions Marchés Africains 2030
          </h1>
          <p className="text-white/85 text-sm mt-1">
            Modèle hybride · {metadata.pays.length} pays · {metadata.target_vars.length} variables ·
            Horizons {metadata.annees_prediction[0]}–{metadata.annees_prediction[metadata.annees_prediction.length - 1]}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          {metadata.axco_loaded ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: 'hsla(140,55%,40%,0.95)', color: 'white' }}
              title={metadata.axco_filename ?? ''}>
              <CheckCircle2 size={12} /> Axco Navigator
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: 'hsla(30,88%,56%,0.95)', color: 'white' }}>
              <Zap size={12} /> Modèle ML pur
            </span>
          )}
          {validation?.coherence_tests.bounds_ok && validation?.coherence_tests.ic_ok && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: 'hsla(213,60%,30%,0.85)', color: 'white' }}>
              <CheckCircle2 size={12} /> Cohérence validée
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {[
          'FE-OLS + Ridge',
          'Gaussian Process',
          'XGBoost résidus',
          'Conformal Prediction IC 95%',
        ].map((b, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold backdrop-blur"
            style={{ background: 'hsla(0,0%,100%,0.20)', color: 'white', border: '1px solid hsla(0,0%,100%,0.25)' }}>
            {b}
          </span>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW
// ════════════════════════════════════════════════════════════════════════════

function OverviewTab({ activeRegion, onCountryClick, cacheVersion = 0, isRefreshing = false, validation, refreshError, onRefresh }: { activeRegion: string; onCountryClick: (pays: string) => void; cacheVersion?: number; isRefreshing?: boolean; validation: ValidationMetrics | null; refreshError: string | null; onRefresh: () => void }) {
  const [rows, setRows] = useState<OverviewRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)  // FIX [E2]
  const [retryKey, setRetryKey] = useState(0)
  const [page, setPage] = useState(0)
  const [sortKey, setSortKey] = useState<keyof OverviewRow>('nv_primes_2030')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (rows == null) setLoading(true)
    setError(null)
    api.get<OverviewRow[]>('/predictions/axe2/overview')
      .then(r => setRows(r.data))
      .catch(e => setError(extractErrMsg(e)))  // FIX [E2]
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheVersion, retryKey])

  const filtered = useMemo(() => {
    if (!rows) return []
    if (activeRegion === 'all') return rows
    return rows.filter(r => r.region === activeRegion)
  }, [rows, activeRegion])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] as any
      const bv = b[sortKey] as any
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [filtered, sortKey, sortDir])

  const totalPrimes2030 = useMemo(() => filtered.reduce((s, r) => s + (r.nv_primes_2030 ?? 0), 0), [filtered])
  const medianGrowth = useMemo(() => {
    const vals = filtered.map(r => r.nv_primes_var_pct).filter((v): v is number => v != null).sort((a, b) => a - b)
    if (!vals.length) return null
    return vals[Math.floor(vals.length / 2)]
  }, [filtered])
  const bestPenetration = useMemo(() => {
    let best = { pays: '—', val: 0 }
    filtered.forEach(r => {
      if ((r.nv_penetration_2030 ?? 0) > best.val) best = { pays: r.pays, val: r.nv_penetration_2030 ?? 0 }
    })
    return best
  }, [filtered])
  const medianSP = useMemo(() => {
    const vals = filtered.map(r => r.nv_sp_2030).filter((v): v is number => v != null).sort((a, b) => a - b)
    if (!vals.length) return null
    return vals[Math.floor(vals.length / 2)]
  }, [filtered])

  const top10 = useMemo(() => {
    return [...filtered]
      .sort((a, b) => (b.nv_primes_2030 ?? 0) - (a.nv_primes_2030 ?? 0))
      .slice(0, 10)
      .map(r => ({
        pays: r.pays,
        nv: r.nv_primes_2030 ?? 0,
        vie: r.vie_primes_2030 ?? 0,
        region: r.region,
      }))
  }, [filtered])

  if (error && !rows) {
    return <ErrorPanel message={error} onRetry={() => setRetryKey(k => k + 1)} />
  }
  if (loading || !rows) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonChart />
      </div>
    )
  }

  const PAGE_SIZE = 15
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function changeSort(key: keyof OverviewRow) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sortIcon = (key: keyof OverviewRow) =>
    sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Primes Non-Vie 2030" value={fmtMn(totalPrimes2030)} subtitle={`${filtered.length} pays`} accent={NAVY} />
        <KpiCard label="Croissance médiane primes NV" value={fmtPctSgn(medianGrowth)} subtitle="2024 → 2030" accent={GREEN} />
        <KpiCard label="Meilleure pénétration NV 2030" value={fmtPct(bestPenetration.val, 2)} subtitle={bestPenetration.pays} accent={OLIVE} />
        <KpiCard label="Ratio S/P médian 2030" value={fmtPct(medianSP, 1)} subtitle={filtered.length > 0 ? 'Non-Vie' : '—'} accent={ORANGE} />
      </div>

      <div className="bg-white rounded-xl p-4" style={{ border: '1px solid hsl(0,0%,90%)' }}>
        <SectionTitle>Top 10 marchés africains 2030 (primes Non-Vie + Vie)</SectionTitle>
        <p className="text-[10px] text-gray-500 -mt-1 mb-2">Cliquez sur un pays pour ouvrir l'analyse détaillée</p>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={top10} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,93%)" />
            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => fmtMn(v)} />
            <YAxis
              type="category"
              dataKey="pays"
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={y}
                  dy={4}
                  textAnchor="end"
                  fontSize={11}
                  fill="hsl(0,0%,30%)"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onCountryClick(payload.value)}
                >
                  {payload.value}
                </text>
              )}
              width={75}
            />
            <Tooltip
              content={({ payload, label }) => {
                if (!payload || !payload.length) return null
                const d: any = payload[0].payload
                return (
                  <div className="bg-white px-3 py-2 rounded shadow text-xs"
                    style={{ border: '1px solid hsl(0,0%,85%)' }}>
                    <div className="font-bold text-gray-800 mb-1">{label}</div>
                    <div className="text-[10px] text-gray-500 mb-1">{d.region}</div>
                    <div>Non-Vie : <strong>{fmtMn(d.nv)}</strong></div>
                    <div>Vie : <strong>{fmtMn(d.vie)}</strong></div>
                    <div className="border-t mt-1 pt-1">Total : <strong>{fmtMn(d.nv + d.vie)}</strong></div>
                    <div className="text-[10px] text-gray-500 mt-1 italic">Cliquez pour voir l'analyse détaillée</div>
                  </div>
                )
              }}
            />
            <Legend verticalAlign="top" height={28} iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="nv"
              name="Non-Vie 2030"
              stackId="a"
              fill={OLIVE}
              cursor="pointer"
              onClick={(data: any) => onCountryClick(data.pays)}
            />
            <Bar
              dataKey="vie"
              name="Vie 2030"
              stackId="a"
              fill={NAVY}
              cursor="pointer"
              onClick={(data: any) => onCountryClick(data.pays)}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-4" style={{ border: '1px solid hsl(0,0%,90%)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <SectionTitle>Synthèse {filtered.length} pays — 2024 vs 2030</SectionTitle>
        </div>
        <p className="text-[10px] text-gray-500 mb-2">Cliquez sur une ligne pour ouvrir l'analyse détaillée du pays</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2" style={{ borderColor: OLIVE_15 }}>
                <th className="text-left py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => changeSort('pays')}>Pays {sortIcon('pays')}</th>
                <th className="text-left py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => changeSort('region')}>Région {sortIcon('region')}</th>
                <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => changeSort('gdp_2024')}>PIB 2024 {sortIcon('gdp_2024')}</th>
                <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => changeSort('gdp_2030')}>PIB 2030 {sortIcon('gdp_2030')}</th>
                <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => changeSort('nv_primes_2024')}>Primes NV 2024 {sortIcon('nv_primes_2024')}</th>
                <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => changeSort('nv_primes_2030')}>Primes NV 2030 {sortIcon('nv_primes_2030')}</th>
                <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => changeSort('vie_primes_2024')}>Primes Vie 2024 {sortIcon('vie_primes_2024')}</th>
                <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => changeSort('vie_primes_2030')}>Primes Vie 2030 {sortIcon('vie_primes_2030')}</th>
                <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => changeSort('nv_sp_2024')}>S/P 2024 {sortIcon('nv_sp_2024')}</th>
                <th className="text-right py-2 px-2 cursor-pointer hover:bg-gray-50" onClick={() => changeSort('nv_sp_2030')}>S/P 2030 {sortIcon('nv_sp_2030')}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr
                  key={r.pays}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  style={{ borderColor: 'hsl(0,0%,95%)' }}
                  onClick={() => onCountryClick(r.pays)}
                  title={`Voir l'analyse détaillée de ${r.pays}`}
                >
                  <td className="py-1.5 px-2 font-semibold text-gray-800">{r.pays}</td>
                  <td className="py-1.5 px-2">
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5"
                      style={{ background: REGION_COLORS[r.region] ?? GRAY }} />
                    <span className="text-[10px] text-gray-600">{r.region}</span>
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono">{fmtMn(r.gdp_2024)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{fmtMn(r.gdp_2030)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{fmtMn(r.nv_primes_2024)}</td>
                  <td className="py-1.5 px-2 text-right font-mono"
                    title={r.nv_primes_ic_low != null ? `IC 95%: [${fmtMn(r.nv_primes_ic_low)} ; ${fmtMn(r.nv_primes_ic_up)}]` : ''}>
                    {fmtMn(r.nv_primes_2030)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono">{fmtMn(r.vie_primes_2024)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{fmtMn(r.vie_primes_2030)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{fmtPct(r.nv_sp_2024, 1)}</td>
                  <td className="py-1.5 px-2 text-right font-mono"
                    title={r.nv_sp_ic_low != null ? `IC 95%: [${fmtPct(r.nv_sp_ic_low, 1)} ; ${fmtPct(r.nv_sp_ic_up, 1)}]` : ''}>
                    {fmtPct(r.nv_sp_2030, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
            <span>Page {page + 1} / {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="px-2 py-1 rounded border disabled:opacity-30">‹</button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                className="px-2 py-1 rounded border disabled:opacity-30">›</button>
            </div>
          </div>
        )}
      </div>

      {validation && (
        <ValidationPanel validation={validation} onRefresh={onRefresh} refreshing={isRefreshing} error={refreshError} />
      )}
    </div>
  )
}

function KpiCard({ label, value, subtitle, accent }: { label: string; value: string; subtitle: string; accent: string }) {
  return (
    <div className="bg-white rounded-xl p-3" style={{ border: '1px solid hsl(0,0%,90%)', borderLeft: `3px solid ${accent}` }}>
      <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wide">{label}</p>
      <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — TRAJECTOIRES
// ════════════════════════════════════════════════════════════════════════════

interface TrajectoiresPayload {
  variable: string
  meta: VariableMeta
  top_pays: string[]
  series: Record<string, { historique: HistPoint[]; predictions: PredPoint[]; region: string }>
  radar: any[]
}

function TrajectoiresTab({ metadata, cacheVersion = 0, isRefreshing: _isRefreshing = false }: { metadata: Metadata; cacheVersion?: number; isRefreshing?: boolean }) {
  const [variable, setVariable] = useState<string>('nv_primes')
  const [topN, setTopN] = useState<number>(5)
  const [data, setData] = useState<TrajectoiresPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)  // FIX [E2]
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.get<TrajectoiresPayload>('/predictions/axe2/trajectoires', {
      params: { variable, top_n: topN }
    })
      .then(r => setData(r.data))
      .catch(e => setError(extractErrMsg(e)))
      .finally(() => setLoading(false))
  }, [variable, topN, cacheVersion, retryKey])

  const chartData = useMemo(() => {
    if (!data) return []
    const map: Record<number, any> = {}
    data.top_pays.forEach((p) => {
      const s = data.series[p]
      if (!s) return
      s.historique.forEach(h => {
        if (!map[h.annee]) map[h.annee] = { annee: h.annee }
        map[h.annee][`${p}_hist`] = h.valeur
      })
      s.predictions.forEach(pp => {
        if (!map[pp.annee]) map[pp.annee] = { annee: pp.annee }
        map[pp.annee][`${p}_pred`] = pp.valeur
      })
      const h2024 = s.historique.find(h => h.annee === 2024)
      if (h2024 && map[2024]) map[2024][`${p}_pred`] = h2024.valeur
    })
    return Object.values(map).sort((a: any, b: any) => a.annee - b.annee)
  }, [data])

  if (error && !data) {
    return <ErrorPanel message={error} onRetry={() => setRetryKey(k => k + 1)} />
  }
  if (loading || !data) {
    return <div className="space-y-3"><SkeletonChart /><SkeletonChart /></div>
  }

  const meta = data.meta
  const varOptions = metadata.all_vars.map(v => ({ value: v, label: metadata.variables[v]?.label ?? v }))

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-3 flex items-center gap-3 flex-wrap"
        style={{ border: '1px solid hsl(0,0%,90%)' }}>
        <span className="text-xs font-semibold text-gray-600">Variable :</span>
        <div style={{ minWidth: 220 }}>
          <Select
            value={varOptions.find(o => o.value === variable)}
            onChange={(o: any) => setVariable(o.value)}
            options={varOptions}
            styles={selectStyles}
          />
        </div>
        <span className="text-xs font-semibold text-gray-600 ml-2">Top N :</span>
        {[3, 5, 7, 10].map(n => (
          <button key={n} onClick={() => setTopN(n)}
            className="px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
            style={topN === n ? { background: OLIVE, color: 'white' } : { background: 'hsl(0,0%,93%)', color: '#6b7280' }}>
            {n}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl p-4" style={{ border: '1px solid hsl(0,0%,90%)' }}>
        <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
          <SectionTitle>{meta.label} — Top {topN} pays · 2015–2030</SectionTitle>
          <ModelBadge modele={meta.modele} blended={metadata.axco_loaded && AXCO_BLENDED_VARS.has(variable)} />
        </div>
        <ResponsiveContainer width="100%" height={420}>
          <ComposedChart data={chartData as any[]} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,93%)" />
            <XAxis dataKey="annee" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatByUnite(v, meta.unite)} />
            <Tooltip
              content={({ payload, label }) => {
                if (!payload || !payload.length) return null
                return (
                  <div className="bg-white px-3 py-2 rounded shadow text-xs"
                    style={{ border: '1px solid hsl(0,0%,85%)' }}>
                    <div className="font-bold text-gray-800 mb-1">{label}</div>
                    {data.top_pays.map((p, i) => {
                      const d: any = payload[0].payload
                      const v = d[`${p}_pred`] ?? d[`${p}_hist`]
                      if (v == null) return null
                      return (
                        <div key={p} className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ background: TOP_COLORS[i] }} />
                          <span className="text-gray-700">{p} :</span>
                          <strong>{formatByUnite(v, meta.unite)}</strong>
                        </div>
                      )
                    })}
                  </div>
                )
              }}
            />
            <ReferenceLine x={2024} stroke="hsl(0,0%,60%)" strokeDasharray="4 3" label={{ value: '2024', fontSize: 10, fill: '#888' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {data.top_pays.map((p, i) => (
              <Line key={`${p}_hist`} type="monotone" dataKey={`${p}_hist`} stroke={TOP_COLORS[i]}
                strokeWidth={2} dot={{ r: 2 }} legendType="none" />
            ))}
            {data.top_pays.map((p, i) => (
              <Line key={`${p}_pred`} type="monotone" dataKey={`${p}_pred`} stroke={TOP_COLORS[i]}
                strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2 }} name={p} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-4" style={{ border: '1px solid hsl(0,0%,90%)' }}>
        <SectionTitle>Profil 2030 — 6 dimensions normalisées</SectionTitle>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={data.radar}>
            <PolarGrid stroke="hsl(0,0%,88%)" />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {data.top_pays.map((p, i) => (
              <Radar key={p} name={p} dataKey={p} stroke={TOP_COLORS[i]}
                fill={TOP_COLORS[i]} fillOpacity={0.10} strokeWidth={2} />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-4" style={{ border: '1px solid hsl(0,0%,90%)' }}>
        <SectionTitle>🎯 Insights {meta.label} 2030</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <InsightCard title="Leader 2030" value={data.top_pays[0] ?? '—'} accent={GREEN} />
          <InsightCard title={`Top ${topN}`} value={data.top_pays.join(' · ')} accent={NAVY} small />
          <InsightCard title="Modèle" value={MODEL_LABEL[meta.modele] ?? meta.modele} accent={OLIVE} small />
        </div>
      </div>
    </div>
  )
}

function InsightCard({ title, value, accent, small }: { title: string; value: string; accent: string; small?: boolean }) {
  return (
    <div className="rounded-lg p-3" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
      <p className="text-[10px] uppercase font-bold tracking-wide" style={{ color: accent }}>{title}</p>
      <p className={`font-bold text-gray-800 mt-1 ${small ? 'text-sm' : 'text-lg'}`}>{value}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — ANALYSE PAR PAYS
// ════════════════════════════════════════════════════════════════════════════

interface PaysData {
  pays: string
  region: string
  variables: Record<string, VarData>
  axco_loaded: boolean
}

function PaysTab({ metadata, selectedPays, setSelectedPays, cacheVersion, isRefreshing: _isRefreshing }: {
  metadata: Metadata;
  selectedPays: string | null;
  setSelectedPays: (p: string) => void;
  cacheVersion: number;
  isRefreshing: boolean;
}) {
  const pays = selectedPays ?? (metadata.pays.includes('Maroc') ? 'Maroc' : metadata.pays[0])
  const setPays = setSelectedPays
  const [dimension, setDimension] = useState<string>('all')
  const [data, setData] = useState<PaysData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)  // FIX [E2]
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (data == null) setLoading(true)
    setError(null)
    api.get<PaysData>(`/predictions/axe2/pays/${encodeURIComponent(pays)}`)
      .then(r => setData(r.data))
      .catch(e => setError(extractErrMsg(e)))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pays, cacheVersion, retryKey])

  const paysOptions = metadata.pays_with_region.map(p => ({
    value: p.pays,
    label: p.pays,
    region: p.region,
  }))

  const dims = [
    { id: 'all', label: 'Tout' },
    { id: 'non_vie', label: 'Non-Vie' },
    { id: 'vie', label: 'Vie' },
    { id: 'macro', label: 'Macro' },
    { id: 'gouvernance', label: 'Gouvernance' },
  ]

  const filteredVars = useMemo(() => {
    if (!data) return []
    return Object.values(data.variables).filter(v =>
      dimension === 'all' || v.dimension === dimension
    )
  }, [data, dimension])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-3 flex items-center gap-3 flex-wrap"
        style={{ border: '1px solid hsl(0,0%,90%)' }}>
        <span className="text-xs font-semibold text-gray-600">Pays :</span>
        <div style={{ minWidth: 240 }}>
          <Select
            value={paysOptions.find(o => o.value === pays)}
            onChange={(o: any) => setPays(o.value)}
            options={paysOptions}
            styles={selectStyles}
            formatOptionLabel={(o: any) => (
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full"
                  style={{ background: REGION_COLORS[o.region] ?? GRAY }} />
                <span>{o.label}</span>
              </div>
            )}
          />
        </div>
        <div className="ml-2 flex items-center gap-1 flex-wrap">
          {dims.map(d => (
            <button key={d.id} onClick={() => setDimension(d.id)}
              className="px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
              style={dimension === d.id ? { background: OLIVE, color: 'white' } : { background: 'hsl(0,0%,93%)', color: '#6b7280' }}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {error && !data ? (
        <ErrorPanel message={error} onRetry={() => setRetryKey(k => k + 1)} />
      ) : loading || !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <SkeletonChart key={i} />)}
        </div>
      ) : filteredVars.length === 0 || filteredVars.every(v => v.historique.length === 0 && v.predictions.length === 0) ? (
        // FIX [E3] — message explicite si aucune donnée pour le pays/dimension sélectionné
        <div className="rounded-xl p-6 text-center"
          style={{ background: 'hsl(0,0%,98%)', border: '1px dashed hsl(0,0%,80%)' }}>
          <p className="text-sm font-semibold text-gray-700">Aucune donnée disponible</p>
          <p className="text-[11px] text-gray-500 mt-1">
            Les variables {dimension === 'all' ? '' : `de la dimension "${dimension}" `}
            ne sont pas renseignées pour {pays}.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredVars.map(v => (
              <PredChart
                key={v.variable}
                variable={v.variable}
                label={v.label}
                unite={v.unite}
                historique={v.historique}
                predictions={v.predictions}
                modele={v.modele}
                r2={v.r2_walforward}
                mape={v.mape}
                height={220}
                axcoBlended={v.axco_blended}
              />
            ))}
          </div>

          <PaysIndicatorsTable variables={filteredVars} pays={pays} />
        </>
      )}

    </div>
  )
}

type IndicSortKey = 'annee' | string

function PaysIndicatorsTable({ variables, pays }: { variables: VarData[]; pays: string }) {
  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030]
  const [sortKey, setSortKey] = useState<IndicSortKey>('annee')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (k: IndicSortKey) => {
    if (k === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(k)
      setSortDir(k === 'annee' ? 'asc' : 'desc')
    }
  }

  const valuesByVar = useMemo(() => {
    const map: Record<string, { variable: VarData; valByYear: Record<number, number | null>; variation: number | null }> = {}
    variables.forEach(v => {
      const valByYear: Record<number, number | null> = {}
      years.forEach(y => { valByYear[y] = null })
      v.historique.forEach(h => {
        if (years.includes(h.annee)) valByYear[h.annee] = h.valeur
      })
      v.predictions.forEach(p => {
        if (years.includes(p.annee) && valByYear[p.annee] == null) valByYear[p.annee] = p.valeur
      })
      const v2024 = valByYear[2024]
      const v2030 = valByYear[2030]
      const variation = (v2024 != null && v2030 != null && v2024 !== 0)
        ? ((v2030 - v2024) / Math.abs(v2024)) * 100
        : null
      map[v.variable] = { variable: v, valByYear, variation }
    })
    return map
  }, [variables])

  const sortedYears = useMemo(() => {
    const copy = [...years]
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'annee') {
      copy.sort((a, b) => (a - b) * dir)
    } else {
      const entry = valuesByVar[sortKey]
      if (entry) {
        copy.sort((a, b) => {
          const av = entry.valByYear[a]
          const bv = entry.valByYear[b]
          if (av == null && bv == null) return 0
          if (av == null) return 1
          if (bv == null) return -1
          return (av - bv) * dir
        })
      }
    }
    return copy
  }, [valuesByVar, sortKey, sortDir])

  if (variables.length === 0) return null

  return (
    <div className="bg-white rounded-xl p-3" style={{ border: '1px solid hsl(0,0%,90%)' }}>
      <SectionTitle>Tableau récapitulatif — {pays}</SectionTitle>
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2" style={{ borderColor: OLIVE_15 }}>
              <SortableTh<IndicSortKey> sortKey="annee" currentKey={sortKey} dir={sortDir} onSort={handleSort}>
                Année
              </SortableTh>
              {variables.map(v => (
                <SortableTh<IndicSortKey>
                  key={v.variable}
                  sortKey={v.variable}
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  align="right"
                >
                  <span title={v.label}>{v.label}</span>
                </SortableTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedYears.map(y => (
              <tr key={y} className="border-b" style={{ borderColor: 'hsl(0,0%,95%)' }}>
                <td className="py-1.5 px-2 font-semibold text-gray-800">{y}</td>
                {variables.map(v => (
                  <td key={v.variable} className="py-1.5 px-2 text-right font-mono">
                    {formatByUnite(valuesByVar[v.variable]?.valByYear[y], v.unite)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t-2" style={{ borderColor: OLIVE_15, background: 'hsl(0,0%,98%)' }}>
              <td className="py-1.5 px-2 font-semibold text-gray-800">Variation 2024–2030</td>
              {variables.map(v => (
                <td key={v.variable} className="py-1.5 px-2 text-right">
                  <DeltaBadge
                    v={valuesByVar[v.variable]?.variation ?? null}
                    sensFavorable={v.sens_favorable}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ValidationPanel({ validation, onRefresh, refreshing, error }: {
  validation: ValidationMetrics; onRefresh: () => void; refreshing: boolean; error: string | null;
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-white rounded-xl" style={{ border: '1px solid hsl(0,0%,90%)' }}>
      <button onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50">
        <div className="flex items-center gap-2">
          <Activity size={16} style={{ color: OLIVE }} />
          <span className="font-bold text-sm text-gray-800">🔬 Qualité du Modèle</span>
          <span className="text-[10px] text-gray-500">
            ({validation.elapsed_seconds}s · {Object.keys(validation.variables).length} variables)
          </span>
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2" style={{ borderColor: OLIVE_15 }}>
                  <th className="text-left py-2 px-2">Variable</th>
                  <th className="text-left py-2 px-2">Modèle</th>
                  <th className="text-right py-2 px-2">R²</th>
                  <th className="text-right py-2 px-2">MAPE</th>
                  <th className="text-right py-2 px-2">MAE</th>
                  <th className="text-right py-2 px-2">q80</th>
                  <th className="text-right py-2 px-2">q95</th>
                  <th className="text-center py-2 px-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(validation.variables).map(([k, m]) => {
                  const isGdpGrowth = k === 'gdp_growth'
                  return (
                    <tr key={k} className="border-b" style={{ borderColor: 'hsl(0,0%,95%)' }}>
                      <td className="py-1.5 px-2 font-semibold">{m.label}</td>
                      <td className="py-1.5 px-2"><ModelBadge modele={m.modele} /></td>
                      <td className="py-1.5 px-2 text-right font-mono">{isGdpGrowth ? '—' : fmtR2(m.r2_mean)}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{isGdpGrowth ? '—' : (m.mape_mean != null ? fmtPct(m.mape_mean, 1) : '—')}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{isGdpGrowth ? '—' : fmtNum(m.mae, 3)}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{isGdpGrowth ? '—' : fmtNum(m.q80, 3)}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{isGdpGrowth ? '—' : fmtNum(m.q95, 3)}</td>
                      <td className="py-1.5 px-2 text-center text-[10px]">
                        {isGdpGrowth
                          ? <span style={{ color: GREEN }}>ML + Axco</span>
                          : <span className="text-gray-400">ML pur</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            <CoherenceCard
              ok={validation.coherence_tests.bounds_ok}
              label="Bornes absolues"
              desc={`${validation.coherence_tests.alerts_count} violation(s)`}
            />
            <CoherenceCard
              ok={validation.coherence_tests.ic_ok}
              label="Cohérence IC"
              desc="ic_lower ≤ valeur ≤ ic_upper"
            />
            <CoherenceCard
              ok={validation.coherence_tests.axco_alignment != null}
              label="Alignement Axco"
              desc={validation.coherence_tests.axco_alignment
                ? `MAE gdp=${fmtNum(validation.coherence_tests.axco_alignment.mae_gdp_growth, 2)} · gdpcap=${fmtNum(validation.coherence_tests.axco_alignment.mae_gdpcap, 0)}$`
                : 'Axco non disponible'}
              warning={!validation.axco_loaded}
            />
          </div>

          <div className="flex flex-col items-start gap-1">
            <button onClick={onRefresh} disabled={refreshing}
              className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
              style={{
                background: 'transparent',
                color: OLIVE,
                border: `1.5px solid ${OLIVE}`,
                opacity: refreshing ? 0.6 : 1,
                cursor: refreshing ? 'wait' : 'pointer',
              }}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Recalcul en cours… (30–60s)' : '🔄 Recalculer le modèle'}
            </button>
            {error && (
              <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: RED }}>
                <AlertTriangle size={12} /> {error}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CoherenceCard({ ok, label, desc, warning }: {
  ok: boolean; label: string; desc: string; warning?: boolean;
}) {
  const Icon = warning ? AlertTriangle : (ok ? CheckCircle2 : AlertTriangle)
  const color = warning ? ORANGE : (ok ? GREEN : RED)
  return (
    <div className="rounded-lg p-2.5" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
      <div className="flex items-center gap-1.5">
        <Icon size={14} style={{ color }} />
        <span className="text-xs font-bold" style={{ color }}>{label}</span>
      </div>
      <p className="text-[10px] text-gray-600 mt-1">{desc}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 4 — PAR VARIABLE
// ════════════════════════════════════════════════════════════════════════════

interface VariableData {
  variable: string
  horizon: number
  meta: VariableMeta & { r2_walforward: number | null; mape: number | null; q80: number | null; q95: number | null }
  classement: {
    pays: string
    region: string
    valeur_2024: number | null
    valeur_horizon: number | null
    ic_lower: number | null
    ic_upper: number | null
    variation_pct: number | null
    rang: number
  }[]
  top_series: Record<string, { historique: HistPoint[]; predictions: PredPoint[] }>
}

type ClassementSortKey = 'rang' | 'pays' | 'region' | 'valeur_2024' | 'valeur_horizon' | 'variation_pct' | 'ic_lower'

function VariableTab({ metadata, cacheVersion = 0, isRefreshing: _isRefreshing = false }: { metadata: Metadata; cacheVersion?: number; isRefreshing?: boolean }) {
  const [variable, setVariable] = useState<string>('nv_penetration')
  const [horizon, setHorizon] = useState<number>(2030)
  const [data, setData] = useState<VariableData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)  // FIX [E2]
  const [retryKey, setRetryKey] = useState(0)
  const [sortKey, setSortKey] = useState<ClassementSortKey>('rang')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: ClassementSortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'pays' || key === 'region' || key === 'rang' ? 'asc' : 'desc')
    }
  }

  const sortedClassement = useMemo(() => {
    if (!data) return []
    const rows = [...data.classement]
    const dir = sortDir === 'asc' ? 1 : -1
    rows.sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * dir
      return ((va as number) - (vb as number)) * dir
    })
    return rows
  }, [data, sortKey, sortDir])

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.get<VariableData>(`/predictions/axe2/variable/${variable}`, { params: { horizon } })
      .then(r => setData(r.data))
      .catch(e => setError(extractErrMsg(e)))
      .finally(() => setLoading(false))
  }, [variable, horizon, cacheVersion, retryKey])

  const varOptions = metadata.all_vars.map(v => ({ value: v, label: metadata.variables[v]?.label ?? v }))

  const chartData = useMemo(() => {
    if (!data) return []
    const top5 = data.classement.slice(0, 5).map(r => r.pays)
    const map: Record<number, any> = {}
    top5.forEach(p => {
      const s = data.top_series[p]
      if (!s) return
      s.historique.forEach(h => {
        if (!map[h.annee]) map[h.annee] = { annee: h.annee }
        map[h.annee][`${p}_hist`] = h.valeur
      })
      s.predictions.forEach(pp => {
        if (!map[pp.annee]) map[pp.annee] = { annee: pp.annee }
        map[pp.annee][`${p}_pred`] = pp.valeur
      })
      const h2024 = s.historique.find(h => h.annee === 2024)
      if (h2024 && map[2024]) map[2024][`${p}_pred`] = h2024.valeur
    })
    return Object.values(map).sort((a: any, b: any) => a.annee - b.annee)
  }, [data])

  const top5Pays = data?.classement.slice(0, 5).map(r => r.pays) ?? []

  if (error && !data) return <ErrorPanel message={error} onRetry={() => setRetryKey(k => k + 1)} />
  if (loading || !data) return <div className="space-y-3"><SkeletonChart /><SkeletonChart /></div>

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-3 flex items-center gap-3 flex-wrap"
        style={{ border: '1px solid hsl(0,0%,90%)' }}>
        <span className="text-xs font-semibold text-gray-600">Variable :</span>
        <div style={{ minWidth: 220 }}>
          <Select
            value={varOptions.find(o => o.value === variable)}
            onChange={(o: any) => setVariable(o.value)}
            options={varOptions}
            styles={selectStyles}
          />
        </div>
        <span className="text-xs font-semibold text-gray-600 ml-2">Horizon :</span>
        {[2025, 2027, 2030].map(h => (
          <button key={h} onClick={() => setHorizon(h)}
            className="px-3 py-1 rounded-full text-[11px] font-semibold transition-colors"
            style={horizon === h ? { background: OLIVE, color: 'white' } : { background: 'hsl(0,0%,93%)', color: '#6b7280' }}>
            {h}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl p-4" style={{ border: '1px solid hsl(0,0%,90%)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <SectionTitle>{data.meta.label} — Top 5 pays · {horizon}</SectionTitle>
          <div className="flex items-center gap-2">
            <ModelBadge modele={data.meta.modele} blended={metadata.axco_loaded && AXCO_BLENDED_VARS.has(variable)} />
            <span className="text-[10px] font-mono text-gray-600">R²={fmtR2(data.meta.r2_walforward)}</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData as any[]} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,93%)" />
            <XAxis dataKey="annee" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatByUnite(v, data.meta.unite)} />
            <Tooltip
              content={({ payload, label }) => {
                if (!payload || !payload.length) return null
                return (
                  <div className="bg-white px-3 py-2 rounded shadow text-xs"
                    style={{ border: '1px solid hsl(0,0%,85%)' }}>
                    <div className="font-bold text-gray-800 mb-1">{label}</div>
                    {top5Pays.map((p, i) => {
                      const d: any = payload[0].payload
                      const v = d[`${p}_pred`] ?? d[`${p}_hist`]
                      if (v == null) return null
                      return (
                        <div key={p} className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ background: TOP_COLORS[i] }} />
                          <span>{p} : <strong>{formatByUnite(v, data.meta.unite)}</strong></span>
                        </div>
                      )
                    })}
                  </div>
                )
              }}
            />
            <ReferenceLine x={2024} stroke="hsl(0,0%,60%)" strokeDasharray="4 3" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {top5Pays.map((p, i) => (
              <Line key={`${p}_hist`} type="monotone" dataKey={`${p}_hist`} stroke={TOP_COLORS[i]}
                strokeWidth={2} dot={{ r: 2 }} legendType="none" />
            ))}
            {top5Pays.map((p, i) => (
              <Line key={`${p}_pred`} type="monotone" dataKey={`${p}_pred`} stroke={TOP_COLORS[i]}
                strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2 }} name={p} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-4" style={{ border: '1px solid hsl(0,0%,90%)' }}>
        <SectionTitle>Classement {data.classement.length} pays — {data.meta.label} {horizon}</SectionTitle>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2" style={{ borderColor: OLIVE_15 }}>
                <SortableTh align="left" width="w-8" sortKey="rang" currentKey={sortKey} dir={sortDir} onSort={handleSort}>#</SortableTh>
                <SortableTh align="left" sortKey="pays" currentKey={sortKey} dir={sortDir} onSort={handleSort}>Pays</SortableTh>
                <SortableTh align="left" sortKey="region" currentKey={sortKey} dir={sortDir} onSort={handleSort}>Région</SortableTh>
                <SortableTh align="right" sortKey="valeur_2024" currentKey={sortKey} dir={sortDir} onSort={handleSort}>2024</SortableTh>
                <SortableTh align="right" sortKey="valeur_horizon" currentKey={sortKey} dir={sortDir} onSort={handleSort}>{horizon}</SortableTh>
                <SortableTh align="right" sortKey="variation_pct" currentKey={sortKey} dir={sortDir} onSort={handleSort}>Variation</SortableTh>
                <SortableTh align="right" sortKey="ic_lower" currentKey={sortKey} dir={sortDir} onSort={handleSort}>IC 95%</SortableTh>
              </tr>
            </thead>
            <tbody>
              {sortedClassement.map(r => (
                <tr key={r.pays} className="border-b hover:bg-gray-50" style={{ borderColor: 'hsl(0,0%,95%)' }}>
                  <td className="py-1.5 px-2 font-mono text-gray-500">{r.rang}</td>
                  <td className="py-1.5 px-2 font-semibold">{r.pays}</td>
                  <td className="py-1.5 px-2">
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5"
                      style={{ background: REGION_COLORS[r.region] ?? GRAY }} />
                    <span className="text-[10px] text-gray-600">{r.region}</span>
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatByUnite(r.valeur_2024, data.meta.unite)}</td>
                  <td className="py-1.5 px-2 text-right font-mono font-semibold">{formatByUnite(r.valeur_horizon, data.meta.unite)}</td>
                  <td className="py-1.5 px-2 text-right">
                    <DeltaBadge v={r.variation_pct} sensFavorable={data.meta.sens_favorable} />
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-[10px] text-gray-600">
                    [{formatByUnite(r.ic_lower, data.meta.unite)} ; {formatByUnite(r.ic_upper, data.meta.unite)}]
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 5 — COMPARAISON
// ════════════════════════════════════════════════════════════════════════════

interface ComparaisonData {
  variable: string
  meta: VariableMeta
  pays_a: { pays: string; region: string; data: VarData }
  pays_b: { pays: string; region: string; data: VarData }
  tableau: {
    variable: string
    label: string
    unite: string
    sens_favorable: 'hausse' | 'baisse'
    a_2024: number | null
    a_2030: number | null
    a_delta_pct: number | null
    b_2024: number | null
    b_2030: number | null
    b_delta_pct: number | null
    gagnant: string | null
  }[]
}

function ComparaisonTab({ metadata, cacheVersion = 0, isRefreshing: _isRefreshing = false }: { metadata: Metadata; cacheVersion?: number; isRefreshing?: boolean }) {
  const [paysA, setPaysA] = useState<string>(metadata.pays.includes('Maroc') ? 'Maroc' : metadata.pays[0])
  const [paysB, setPaysB] = useState<string>(metadata.pays.includes('Égypte') ? 'Égypte' : metadata.pays[1])
  const [variable, setVariable] = useState<string>('nv_primes')
  const [data, setData] = useState<ComparaisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)  // FIX [E2]
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (paysA === paysB) return
    setLoading(true)
    setError(null)
    api.get<ComparaisonData>('/predictions/axe2/comparaison', {
      params: { pays_a: paysA, pays_b: paysB, variable }
    })
      .then(r => setData(r.data))
      .catch(e => setError(extractErrMsg(e)))
      .finally(() => setLoading(false))
  }, [paysA, paysB, variable, cacheVersion, retryKey])

  const paysOptions = metadata.pays_with_region.map(p => ({ value: p.pays, label: p.pays, region: p.region }))
  const varOptions = metadata.all_vars.map(v => ({ value: v, label: metadata.variables[v]?.label ?? v }))

  const chartData = useMemo(() => {
    if (!data) return []
    const map: Record<number, any> = {}
    const sa = data.pays_a.data
    const sb = data.pays_b.data
    sa.historique.forEach(h => { map[h.annee] = { ...(map[h.annee] ?? { annee: h.annee }), a_hist: h.valeur } })
    sa.predictions.forEach(p => {
      map[p.annee] = {
        ...(map[p.annee] ?? { annee: p.annee }),
        a_pred: p.valeur, a_lo: p.ic_lower, a_hi: p.ic_upper,
        a_band: [p.ic_lower, p.ic_upper],  // FIX [D1]
      }
    })
    sb.historique.forEach(h => { map[h.annee] = { ...(map[h.annee] ?? { annee: h.annee }), b_hist: h.valeur } })
    sb.predictions.forEach(p => {
      map[p.annee] = {
        ...(map[p.annee] ?? { annee: p.annee }),
        b_pred: p.valeur, b_lo: p.ic_lower, b_hi: p.ic_upper,
        b_band: [p.ic_lower, p.ic_upper],  // FIX [D1]
      }
    })
    if (map[2024]) {
      map[2024].a_pred = map[2024].a_hist
      map[2024].b_pred = map[2024].b_hist
      map[2024].a_band = [map[2024].a_hist, map[2024].a_hist]
      map[2024].b_band = [map[2024].b_hist, map[2024].b_hist]
    }
    return Object.values(map).sort((a: any, b: any) => a.annee - b.annee)
  }, [data])

  if (error && !data) return <ErrorPanel message={error} onRetry={() => setRetryKey(k => k + 1)} />
  if (loading || !data) return <div className="space-y-3"><SkeletonChart /><SkeletonChart /></div>

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-3 flex items-center gap-3 flex-wrap"
        style={{ border: '1px solid hsl(0,0%,90%)' }}>
        <span className="text-xs font-semibold text-gray-600">Pays A :</span>
        <div style={{ minWidth: 200 }}>
          <Select
            value={paysOptions.find(o => o.value === paysA)}
            onChange={(o: any) => setPaysA(o.value)}
            options={paysOptions.filter(o => o.value !== paysB)}
            styles={selectStyles}
          />
        </div>
        <span className="text-xs font-semibold text-gray-600 ml-2">Pays B :</span>
        <div style={{ minWidth: 200 }}>
          <Select
            value={paysOptions.find(o => o.value === paysB)}
            onChange={(o: any) => setPaysB(o.value)}
            options={paysOptions.filter(o => o.value !== paysA)}
            styles={selectStyles}
          />
        </div>
        <span className="text-xs font-semibold text-gray-600 ml-2">Variable :</span>
        <div style={{ minWidth: 220 }}>
          <Select
            value={varOptions.find(o => o.value === variable)}
            onChange={(o: any) => setVariable(o.value)}
            options={varOptions}
            styles={selectStyles}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl p-4" style={{ border: '1px solid hsl(0,0%,90%)' }}>
        <SectionTitle>{data.meta.label} — {paysA} vs {paysB}</SectionTitle>
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={chartData as any[]} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,93%)" />
            <XAxis dataKey="annee" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatByUnite(v, data.meta.unite)} />
            <Tooltip
              content={({ payload, label }) => {
                if (!payload || !payload.length) return null
                const d: any = payload[0].payload
                return (
                  <div className="bg-white px-3 py-2 rounded shadow text-xs"
                    style={{ border: '1px solid hsl(0,0%,85%)' }}>
                    <div className="font-bold text-gray-800 mb-1">{label}</div>
                    <div style={{ color: OLIVE }}>{paysA} : <strong>{formatByUnite(d.a_pred ?? d.a_hist, data.meta.unite)}</strong></div>
                    <div style={{ color: NAVY }}>{paysB} : <strong>{formatByUnite(d.b_pred ?? d.b_hist, data.meta.unite)}</strong></div>
                  </div>
                )
              }}
            />
            {/* FIX [D1+D3] — bandes IC en tuple, opacité 0.12 */}
            <Area type="monotone" dataKey="a_band" stroke="none" fill={OLIVE} fillOpacity={0.12} />
            <Area type="monotone" dataKey="b_band" stroke="none" fill={NAVY} fillOpacity={0.12} />
            <ReferenceLine x={2024} stroke="hsl(0,0%,60%)" strokeDasharray="4 3" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="a_hist" stroke={OLIVE} strokeWidth={2} dot={{ r: 2 }} legendType="none" />
            <Line type="monotone" dataKey="a_pred" stroke={OLIVE} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2 }} name={paysA} />
            <Line type="monotone" dataKey="b_hist" stroke={NAVY} strokeWidth={2} dot={{ r: 2 }} legendType="none" />
            <Line type="monotone" dataKey="b_pred" stroke={NAVY} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2 }} name={paysB} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-4" style={{ border: '1px solid hsl(0,0%,90%)' }}>
        <SectionTitle>Tableau comparatif — Dimension {data.meta.dimension}</SectionTitle>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2" style={{ borderColor: OLIVE_15 }}>
                <th className="text-left py-2 px-2">Variable</th>
                <th className="text-right py-2 px-2" style={{ color: OLIVE }}>{paysA} 2024</th>
                <th className="text-right py-2 px-2" style={{ color: OLIVE }}>{paysA} 2030</th>
                <th className="text-right py-2 px-2">Δ A</th>
                <th className="text-right py-2 px-2" style={{ color: NAVY }}>{paysB} 2024</th>
                <th className="text-right py-2 px-2" style={{ color: NAVY }}>{paysB} 2030</th>
                <th className="text-right py-2 px-2">Δ B</th>
                <th className="text-center py-2 px-2">Gagnant ✓</th>
              </tr>
            </thead>
            <tbody>
              {data.tableau.map(r => (
                <tr key={r.variable} className="border-b" style={{ borderColor: 'hsl(0,0%,95%)' }}>
                  <td className="py-1.5 px-2 font-semibold">{r.label}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatByUnite(r.a_2024, r.unite)}</td>
                  <td className="py-1.5 px-2 text-right font-mono font-semibold">{formatByUnite(r.a_2030, r.unite)}</td>
                  <td className="py-1.5 px-2 text-right"><DeltaBadge v={r.a_delta_pct} sensFavorable={r.sens_favorable} /></td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatByUnite(r.b_2024, r.unite)}</td>
                  <td className="py-1.5 px-2 text-right font-mono font-semibold">{formatByUnite(r.b_2030, r.unite)}</td>
                  <td className="py-1.5 px-2 text-right"><DeltaBadge v={r.b_delta_pct} sensFavorable={r.sens_favorable} /></td>
                  <td className="py-1.5 px-2 text-center text-[10px] font-bold"
                    style={{ color: r.gagnant === paysA ? OLIVE : (r.gagnant === paysB ? NAVY : '#999') }}>
                    {r.gagnant ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 6 — CARTE 2030
// ════════════════════════════════════════════════════════════════════════════

function CarteTab({ metadata, cacheVersion = 0, isRefreshing: _isRefreshing = false }: { metadata: Metadata; cacheVersion?: number; isRefreshing?: boolean }) {
  const [variable, setVariable] = useState<string>('nv_primes')
  const [horizon, setHorizon] = useState<number>(2030)
  const [classement, setClassement] = useState<VariableData['classement']>([])
  const [meta, setMeta] = useState<VariableMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)  // FIX [E2]
  const [retryKey, setRetryKey] = useState(0)
  const [zoom, setZoom] = useState(1.2)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.get<VariableData>(`/predictions/axe2/variable/${variable}`, { params: { horizon } })
      .then(r => {
        setClassement(r.data.classement)
        setMeta(r.data.meta)
      })
      .catch(e => setError(extractErrMsg(e)))
      .finally(() => setLoading(false))
  }, [variable, horizon, cacheVersion, retryKey])

  const valueByPays = useMemo(() => {
    const m: Record<string, number | null> = {}
    classement.forEach(r => { m[r.pays] = r.valeur_horizon })
    return m
  }, [classement])

  const minMax = useMemo(() => {
    const vals = Object.values(valueByPays).filter((v): v is number => v != null && !isNaN(v))
    if (!vals.length) return { min: 0, max: 1 }
    return { min: Math.min(...vals), max: Math.max(...vals) }
  }, [valueByPays])

  const FR_TO_ISO3: Record<string, string> = useMemo(() => {
    const m: Record<string, string> = {}
    Object.entries(ISO3_NAMES).forEach(([iso, fr]) => { m[fr] = iso })
    m['Nigeria'] = 'NGA'
    m['RDC'] = 'COD'
    return m
  }, [])

  const ISO3_TO_VALUE = useMemo(() => {
    const m: Record<string, number | null> = {}
    Object.entries(valueByPays).forEach(([fr, v]) => {
      const iso = FR_TO_ISO3[fr]
      if (iso) m[iso] = v
    })
    return m
  }, [valueByPays, FR_TO_ISO3])

  const colorScale = useMemo(() => {
    if (variable === 'nv_primes' || variable === 'vie_primes' || variable === 'gdp') return COLOR_SCALES_POSITIONED.primes
    if (variable === 'nv_sp') return COLOR_SCALES_POSITIONED.sp
    if (variable === 'nv_penetration' || variable === 'vie_penetration') return COLOR_SCALES_POSITIONED.penetration
    if (variable === 'nv_densite' || variable === 'vie_densite') return COLOR_SCALES_POSITIONED.densite
    if (variable === 'gdpcap') return COLOR_SCALES_POSITIONED.gdpCap
    if (variable === 'gdp_growth') return COLOR_SCALES_POSITIONED.croissance
    if (variable === 'polstab' || variable === 'regqual') return COLOR_SCALES_POSITIONED.wgi
    return COLOR_SCALES_POSITIONED.primes
  }, [variable])

  const varOptions = metadata.all_vars.map(v => ({ value: v, label: metadata.variables[v]?.label ?? v }))

  function colorFor(iso: string): string {
    const v = ISO3_TO_VALUE[iso]
    if (v == null || isNaN(v)) return '#d0d0d0'
    const t = (v - minMax.min) / Math.max(minMax.max - minMax.min, 1e-9)
    return interpolatePositioned(t, colorScale)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-3 flex items-center gap-3 flex-wrap"
        style={{ border: '1px solid hsl(0,0%,90%)' }}>
        <span className="text-xs font-semibold text-gray-600">Variable :</span>
        <div style={{ minWidth: 220 }}>
          <Select
            value={varOptions.find(o => o.value === variable)}
            onChange={(o: any) => setVariable(o.value)}
            options={varOptions}
            styles={selectStyles}
          />
        </div>
        <span className="text-xs font-semibold text-gray-600 ml-2">Horizon :</span>
        {[2025, 2027, 2030].map(h => (
          <button key={h} onClick={() => setHorizon(h)}
            className="px-3 py-1 rounded-full text-[11px] font-semibold transition-colors"
            style={horizon === h ? { background: OLIVE, color: 'white' } : { background: 'hsl(0,0%,93%)', color: '#6b7280' }}>
            {h}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button onClick={() => setZoom(Math.max(0.6, zoom - 0.2))}
            className="w-8 h-8 rounded border text-sm font-bold">−</button>
          <button onClick={() => setZoom(Math.min(2.5, zoom + 0.2))}
            className="w-8 h-8 rounded border text-sm font-bold">+</button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-3" style={{ border: '1px solid hsl(0,0%,90%)' }}>
        {meta && (
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <SectionTitle>{meta.label} {horizon} — {classement.length} pays</SectionTitle>
            <ModelBadge modele={meta.modele} blended={metadata.axco_loaded && AXCO_BLENDED_VARS.has(variable)} />
          </div>
        )}
        {error ? <ErrorPanel message={error} onRetry={() => setRetryKey(k => k + 1)} /> :
         loading ? <SkeletonChart /> : (
          <div style={{ height: 560, position: 'relative' }}>
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 380 * zoom, center: [18, 4] }}
              style={{ width: '100%', height: '100%' }}
            >
              <ZoomableGroup zoom={1} center={[18, 4]} minZoom={0.8} maxZoom={4}>
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies
                      .filter((geo: any) => AFRICA_NUMERIC.has(Number(geo.id)))
                      .map((geo: any) => {
                        const iso = NUMERIC_TO_ISO3[Number(geo.id)]
                        const fill = iso ? colorFor(iso) : '#d0d0d0'
                        const name = iso ? ISO3_NAMES[iso] : 'Inconnu'
                        const v = iso ? ISO3_TO_VALUE[iso] : null
                        return (
                          <Geography key={geo.rsmKey} geography={geo}
                            fill={fill} stroke="#fff" strokeWidth={0.5}
                            style={{
                              default: { outline: 'none' },
                              hover: { outline: 'none', filter: 'brightness(1.1)', cursor: 'pointer' },
                              pressed: { outline: 'none' },
                            }}>
                            <title>{name}{v != null ? `: ${formatByUnite(v, meta?.unite ?? '')}` : ' (hors panel)'}</title>
                          </Geography>
                        )
                      })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>

            {meta && (
              <div className="absolute bottom-3 left-3 bg-white rounded-lg p-3 text-xs shadow"
                style={{ border: '1px solid hsl(0,0%,85%)' }}>
                <div className="font-bold text-gray-700 mb-1">{meta.label}</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px]">{formatByUnite(minMax.min, meta.unite)}</span>
                  <div className="h-3 w-32 rounded"
                    style={{
                      background: `linear-gradient(to right, ${colorScale.map(s => s[1]).join(',')})`,
                    }} />
                  <span className="font-mono text-[10px]">{formatByUnite(minMax.max, meta.unite)}</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-1">Hors Afrique du Sud (biais d'échelle)</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Styles react-select ──────────────────────────────────────────────────────
const selectStyles = {
  control: (b: any) => ({ ...b, minHeight: 32, fontSize: 12, borderColor: 'hsl(0,0%,85%)' }),
  menu: (b: any) => ({ ...b, fontSize: 12, zIndex: 100 }),
  option: (b: any, s: any) => ({
    ...b,
    background: s.isSelected ? OLIVE : (s.isFocused ? OLIVE_8 : 'white'),
    color: s.isSelected ? 'white' : '#374151',
  }),
}
