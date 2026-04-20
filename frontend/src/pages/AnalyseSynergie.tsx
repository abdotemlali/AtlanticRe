/**
 * Page principale — Analyse Synergique
 * Vue croisée Portefeuille Interne (Axe 1) × Marchés Africains (Axe 2)
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Area, AreaChart, Cell
} from 'recharts'
import {
  Banknote, ChevronDown, ChevronUp, Combine, FileText, Globe,
  Loader2, Percent, Target, TrendingUp,
} from 'lucide-react'
import api from '../utils/api'
import { formatPrime } from '../utils/formatters'

// ── Tab definitions ─────────────────────────────────────────────────────────
type SynTabId = 'kpis' | 'classement' | 'evolution' | 'synthese' | 'cedantes'
const SYN_TABS: { id: SynTabId; label: string; icon: string }[] = [
  { id: 'kpis',       label: 'KPIs & Synthèse',      icon: '📊' },
  { id: 'classement', label: 'Classement Pays',       icon: '🌍' },
  { id: 'evolution',  label: 'Évolution',             icon: '📈' },
  { id: 'synthese',   label: 'Synthèse par Pays',     icon: '🗂️' },
  { id: 'cedantes',   label: 'Détail par Cédante',    icon: '🏢' },
]

// ── Tab Navigation Bar ──────────────────────────────────────────────────────
function SynTabNav({ activeTab, onTabChange }: { activeTab: SynTabId; onTabChange: (t: SynTabId) => void }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden mb-1"
      style={{ border: '1px solid hsl(0,0%,90%)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div className="flex overflow-x-auto scrollbar-hide">
        {SYN_TABS.map((tab, i) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all relative flex-shrink-0"
              style={active ? {
                color: 'hsl(35,88%,38%)',
                background: 'hsla(43,96%,48%,0.10)',
                borderBottom: '2px solid hsl(35,88%,38%)',
              } : {
                color: '#6b7280',
                borderBottom: '2px solid transparent',
              }}
              id={`tab-syn-${tab.id}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {i < SYN_TABS.length - 1 && !active && (
                <span className="absolute right-0 top-1/4 bottom-1/4 w-px" style={{ background: 'hsl(0,0%,90%)' }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab Progress ─────────────────────────────────────────────────────────────
function SynTabProgress({ activeTab }: { activeTab: SynTabId }) {
  const currentIndex = SYN_TABS.findIndex(t => t.id === activeTab)
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {SYN_TABS.map((tab, i) => (
        <div key={tab.id} className="h-1 rounded-full transition-all" style={{
          flex: 1,
          background: i === currentIndex
            ? 'hsl(35,88%,38%)'
            : i < currentIndex
            ? 'hsla(35,88%,38%,0.35)'
            : 'hsl(0,0%,90%)',
        }} />
      ))}
    </div>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface PaysCroise {
  pays_interne: string
  pays_externe: string
  annees_disponibles: number[]
}

interface GlobalKPIs {
  nb_pays_croises: number
  nb_pays_croises_nonvie: number
  nb_pays_croises_vie: number
  primes_marche_total_mad: number
  primes_marche_nonvie_mad: number
  primes_marche_vie_mad: number
  subject_premium_total: number
  subject_premium_nonvie_total: number
  subject_premium_vie_total: number
  written_premium_total: number
  written_premium_nonvie_total: number
  written_premium_vie_total: number
  share_written_avg: number
  share_written_avg_nonvie: number
  share_written_avg_vie: number
  part_affaires_pct: number
  part_affaires_pct_nonvie: number
  part_affaires_pct_vie: number
  penetration_marche_pct: number
  penetration_marche_pct_nonvie: number
  penetration_marche_pct_vie: number
  annees_disponibles: number[]
}

interface ClassementItem { pays: string;[key: string]: any }
interface Classements {
  kpis?: GlobalKPIs
  evolution?: EvolutionRow[]
  par_primes_marche: ClassementItem[]
  par_subject_premium: ClassementItem[]
  par_written_premium: ClassementItem[]
  par_share_written: ClassementItem[]
  par_penetration_marche: ClassementItem[]
  par_rentabilite: ClassementItem[]
  tableau_pays: TableauPaysRow[]
  tableau_cedantes: TableauCedanteRow[]
}

interface EvolutionRow {
  year: number
  primes_marche_nonvie_mad: number
  primes_marche_vie_mad: number
  primes_marche_total_mad: number
  subject_premium: number
  subject_nonvie: number
  subject_vie: number
  written_premium: number
  written_nonvie: number
  written_vie: number
  share_written_avg: number
  share_written_avg_nonvie: number
  share_written_avg_vie: number
  penetration_marche_pct: number
  penetration_marche_pct_nonvie: number
  penetration_marche_pct_vie: number
}

interface TableauPaysRow {
  pays: string
  primes_marche_total_mad: number
  primes_nonvie_mad: number
  primes_vie_mad: number
  subject_premium: number
  subject_nonvie: number
  subject_vie: number
  written_premium: number
  written_nonvie: number
  written_vie: number
  share_written_avg: number
  share_written_avg_nonvie: number
  share_written_avg_vie: number
  part_affaires_pct: number
  part_affaires_pct_nonvie: number
  part_affaires_pct_vie: number
  penetration_marche_pct: number
  penetration_marche_pct_nonvie: number
  penetration_marche_pct_vie: number
  nb_affaires: number
  nb_cedantes: number
  ulr_moyen: number
}

interface TableauCedanteRow {
  cedante: string
  pays_risque: string
  nb_affaires: number
  subject_premium: number
  subject_nonvie: number
  subject_vie: number
  written_premium: number
  written_nonvie: number
  written_vie: number
  share_written_avg: number
  share_written_avg_nonvie: number
  share_written_avg_vie: number
  part_affaires_pct: number
  part_affaires_pct_nonvie: number
  part_affaires_pct_vie: number
  penetration_marche_pct: number
  penetration_marche_pct_nonvie: number
  penetration_marche_pct_vie: number
  ulr_moyen: number
  branches: string[]
}

// ── Recharts colors ────────────────────────────────────────────────────────────
const GOLD = 'hsl(43,96%,48%)'
const GOLD_DARK = 'hsl(35,88%,38%)'
const GOLD_LIGHT = 'hsl(48,96%,65%)'
const AMBER = 'hsl(35,88%,50%)'
const GOLD_FILL = 'hsla(43,96%,48%,0.15)'

// ── ULR color ─────────────────────────────────────────────────────────────────
function ulrColor(v: number) {
  if (v < 70) return 'hsl(152,56%,39%)'
  if (v < 100) return 'hsl(30,88%,56%)'
  return 'hsl(358,66%,54%)'
}

// ── Tooltip pénétration ───────────────────────────────────────────────────────
const PENETRATION_TOOLTIP = '= Primes Totales Atlantic Re / Primes Totales du Marché × 100'
const PART_AFFAIRES_TOOLTIP = '= Primes Totales Atlantic Re / Primes des Affaires Souscrites × 100'

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return <Loader2 size={20} className="animate-spin" style={{ color: GOLD }} />
}

// ── SortHeader ────────────────────────────────────────────────────────────────
function SortHeader({
  label, col, sortCol, sortDir, onSort, gold,
}: {
  label: string; col: string; sortCol: string; sortDir: 'asc' | 'desc'
  onSort: (c: string) => void; gold?: boolean
}) {
  const active = sortCol === col
  return (
    <th
      className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap cursor-pointer select-none"
      style={{ color: active ? (gold ? GOLD : '#374151') : '#6b7280' }}
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
      </span>
    </th>
  )
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function GoldTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: `1px solid ${GOLD}`, borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
      <p style={{ fontWeight: 700, marginBottom: 6, color: '#1f2937' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || GOLD, fontSize: 13, fontWeight: 600 }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AnalyseSynergie() {
  const navigate = useNavigate()

  // ── Settings (taux de change) ───────────────────────────────────────────────
  const [rate, setRate] = useState(9.5)
  const rateRef = useRef(9.5)  // ref pour eviter re-render dans loadYearData
  const [rateInput, setRateInput] = useState('9.5')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [rateSaved, setRateSaved] = useState(false)

  // ── Vie / Non-Vie filter ─────────────────────────────────────────────────────
  const [filterVie, setFilterVie] = useState(false)
  const [filterNonVie, setFilterNonVie] = useState(false)
  const activeFilter: 'all' | 'vie' | 'nonvie' =
    filterVie === filterNonVie ? 'all' : filterVie ? 'vie' : 'nonvie'

  // ── Exclure le Maroc ────────────────────────────────────────────────────────
  const [excludeMaroc, setExcludeMaroc] = useState(true)
  const isMaroc = (pays: string) =>
    pays?.trim().toUpperCase() === 'MAROC' ||
    pays?.trim().toLowerCase() === 'maroc' ||
    pays?.trim().toLowerCase() === 'morocco'

  // ── Tab navigation ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<SynTabId>('kpis')
  const currentTabIdx = SYN_TABS.findIndex(t => t.id === activeTab)
  // goPrev/goNext : définis après handleTabChange (voir plus bas)


  // ── Data ────────────────────────────────────────────────────────────────────
  const [paysCroises, setPaysCroises] = useState<PaysCroise[]>([])
  const [kpis, setKpis] = useState<GlobalKPIs | null>(null)
  const [classements, setClassements] = useState<Classements | null>(null)
  const [evolutionRaw, setEvolutionRaw] = useState<EvolutionRow[]>([])
  const [tableauPays, setTableauPays] = useState<TableauPaysRow[]>([])
  const [tableauCedantes, setTableauCedantes] = useState<TableauCedanteRow[]>([])
  // ── Lazy loading état cédantes ──────────────────────────────────────────────
  const [loadingCedantes, setLoadingCedantes] = useState(false)
  const [cedantesLoaded, setCedantesLoaded] = useState(false)


  // handleTabChange : utilise des refs pour eviter la TDZ avec selectedYear
  const cedantesLoadedRef = useRef(false)
  const loadingCedantesRef = useRef(false)
  const handleTabChange = (tab: SynTabId) => {
    setActiveTab(tab)
    if (tab === 'cedantes' && !cedantesLoadedRef.current && !loadingCedantesRef.current) {
      loadingCedantesRef.current = true
      setLoadingCedantes(true)
      api.get('/synergie/classements/cedantes', { params: { year: selectedYear, usd_to_mad: rateRef.current } })
        .then(res => {
          setTableauCedantes(res.data.tableau_cedantes ?? [])
          setCedantesLoaded(true)
          cedantesLoadedRef.current = true
        })
        .catch(() => {})
        .finally(() => {
          setLoadingCedantes(false)
          loadingCedantesRef.current = false
        })
    }
  }
  const goPrev = () => { if (currentTabIdx > 0) handleTabChange(SYN_TABS[currentTabIdx - 1].id) }
  const goNext = () => { if (currentTabIdx < SYN_TABS.length - 1) handleTabChange(SYN_TABS[currentTabIdx + 1].id) }

  // ── Loading ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  // Convenience aliases for loading indicators used in JSX
  const loadingKpis = loading
  const loadingClass = loading
  const loadingEvo = loading

  // ── Year ────────────────────────────────────────────────────────────────────
  const [selectedYear, setSelectedYear] = useState<string>('2024')
  const allYears = useMemo(() => {
    const s = new Set<number>()
    paysCroises.forEach(p => p.annees_disponibles.forEach(y => s.add(y)))
    return Array.from(s).sort()
  }, [paysCroises])

  // ── Table state ─────────────────────────────────────────────────────────────
  const [sortPays, setSortPays] = useState({ col: 'written_premium', dir: 'desc' as 'asc' | 'desc' })
  const [sortCed, setSortCed] = useState({ col: 'written_premium', dir: 'desc' as 'asc' | 'desc' })
  const [searchPays, setSearchPays] = useState('')
  const [searchCed, setSearchCed] = useState('')
  const [pagePays, setPagePays] = useState(1)
  const [pageCed, setPageCed] = useState(1)
  const PAGE_SIZE = 20

  // ── Evolution metric ─────────────────────────────────────────────────────────
  const [evoMetric, setEvoMetric] = useState<string>('primes_marche')

  const evoNavOptions = [
    { id: 'primes_marche', label: 'Primes de Marché', icon: '📈' },
    { id: 'subject_premium', label: 'Primes Affaires Souscrites', icon: '📋' },
    { id: 'written_premium', label: 'Primes Atlantic Re', icon: '💼' },
    { id: 'share_written', label: 'Part sur les Affaires (%)', icon: '📊' },
    { id: 'penetration_marche', label: 'Pénétration Réelle ⭐', icon: '⭐' },
  ]

  // ── Load settings ────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/synergie/settings').then(r => {
      const fetchedRate = r.data.usd_to_mad
      rateRef.current = fetchedRate
      setRate(fetchedRate)
      setRateInput(String(fetchedRate))
    }).catch(() => { })

    // pays_croises est desormais embarque dans la reponse /classements
  }, [])

  // ── Load everything in one single API call ────────────────────────────────
  const loadYearData = useCallback(() => {
    const p = { year: selectedYear, usd_to_mad: rateRef.current }
    setLoading(true)
    // Reset cedantes state + refs pour forcer un re-fetch sur le prochain acces
    setCedantesLoaded(false)
    cedantesLoadedRef.current = false
    setTableauCedantes([])
    loadingCedantesRef.current = false
    setLoadingCedantes(false)
    api.get('/synergie/classements', { params: p })
      .then(res => {
        const data = res.data
        // Extract pays_croises (embarqués - supprime l'appel séparé /pays-croises)
        if (data.pays_croises) setPaysCroises(data.pays_croises)
        // Extract KPIs
        setKpis(data.kpis ?? null)
        // Extract evolution
        setEvolutionRaw(data.evolution ?? [])
        // Extract classements (keep existing fields expected by the UI)
        setClassements(data)
        setTableauPays(data.tableau_pays ?? [])
        // Tableau cédantes : lazy-loaded via /classements/cedantes (non inclus ici)
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear])  // rateRef est un ref stable, pas besoin dans les deps

  useEffect(() => { loadYearData() }, [loadYearData])

  // ── Save rate ────────────────────────────────────────────────────────────────
  const saveRate = () => {
    const v = parseFloat(rateInput)
    if (!isNaN(v) && v > 0) {
      api.put('/synergie/settings', { usd_to_mad: v }).then(() => {
        rateRef.current = v
        setRate(v)
        setRateSaved(true)
        setTimeout(() => setRateSaved(false), 2500)
      }).catch(() => { })
    }
  }

  // ── Evolution filtrée côté client (Maroc exclusion) ─────────────────────────
  const evolution = useMemo(() => {
    if (!excludeMaroc) return evolutionRaw
    // Soustraire la contribution Maroc de chaque ligne d'évolution
    return evolutionRaw.map(row => {
      const r = row as any
      // Primes internes sans Maroc
      const wp    = (r.written_premium  ?? 0) - (r.maroc_written_premium  ?? 0)
      const wp_nv = (r.written_nonvie   ?? 0) - (r.maroc_written_nonvie   ?? 0)
      const wp_v  = (r.written_vie      ?? 0) - (r.maroc_written_vie      ?? 0)
      const sp    = (r.subject_premium  ?? 0) - (r.maroc_subject_premium  ?? 0)
      const sp_nv = (r.subject_nonvie   ?? 0) - (r.maroc_subject_nonvie   ?? 0)
      const sp_v  = (r.subject_vie      ?? 0) - (r.maroc_subject_vie      ?? 0)
      // Primes marché sans Maroc
      const pm    = (r.primes_marche_total_mad  ?? 0) - (r.maroc_primes_marche_total_mad  ?? 0)
      const pm_nv = (r.primes_marche_nonvie_mad ?? 0) - (r.maroc_primes_marche_nonvie_mad ?? 0)
      const pm_v  = (r.primes_marche_vie_mad    ?? 0) - (r.maroc_primes_marche_vie_mad    ?? 0)
      // Recalcul des ratios
      const partAff   = sp    > 0 ? (wp    / sp   ) * 100 : 0
      const partAffNv = sp_nv > 0 ? (wp_nv / sp_nv) * 100 : 0
      const partAffV  = sp_v  > 0 ? (wp_v  / sp_v ) * 100 : 0
      const pen    = pm    > 0 ? (wp    / pm   ) * 100 : 0
      const pen_nv = pm_nv > 0 ? (wp_nv / pm_nv) * 100 : 0
      const pen_v  = pm_v  > 0 ? (wp_v  / pm_v ) * 100 : 0
      return {
        ...row,
        written_premium:  wp,
        written_nonvie:   wp_nv,
        written_vie:      wp_v,
        subject_premium:  sp,
        subject_nonvie:   sp_nv,
        subject_vie:      sp_v,
        primes_marche_total_mad:  pm,
        primes_marche_nonvie_mad: pm_nv,
        primes_marche_vie_mad:    pm_v,
        part_affaires_pct:        partAff,
        part_affaires_pct_nonvie: partAffNv,
        part_affaires_pct_vie:    partAffV,
        penetration_marche_pct:        pen,
        penetration_marche_pct_nonvie: pen_nv,
        penetration_marche_pct_vie:    pen_v,
      }
    })
  }, [evolutionRaw, excludeMaroc])

  // ── Maroc-excluded derived data ───────────────────────────────────────────────
  const filteredTableauPays = useMemo(() =>
    excludeMaroc ? tableauPays.filter(r => !isMaroc(r.pays)) : tableauPays
  , [tableauPays, excludeMaroc])

  const filteredTableauCedantes = useMemo(() =>
    excludeMaroc ? tableauCedantes.filter(r => !isMaroc(r.pays_risque)) : tableauCedantes
  , [tableauCedantes, excludeMaroc])

  // Recompute KPIs client-side when excluding Maroc (sum from tableauPays)
  const effectiveKpis = useMemo(() => {
    if (!kpis) return null
    if (!excludeMaroc) return kpis
    // Sum all rows except Maroc
    const rows = filteredTableauPays
    if (!rows.length) return kpis
    const wp = rows.reduce((s, r) => s + (r.written_premium ?? 0), 0)
    const wpNv = rows.reduce((s, r) => s + (r.written_nonvie ?? 0), 0)
    const wpVie = rows.reduce((s, r) => s + (r.written_vie ?? 0), 0)
    const sp = rows.reduce((s, r) => s + (r.subject_premium ?? 0), 0)
    const spNv = rows.reduce((s, r) => s + (r.subject_nonvie ?? 0), 0)
    const spVie = rows.reduce((s, r) => s + (r.subject_vie ?? 0), 0)
    const pm = rows.reduce((s, r) => s + (r.primes_marche_total_mad ?? 0), 0)
    const pmNv = rows.reduce((s, r) => s + (r.primes_nonvie_mad ?? 0), 0)
    const pmVie = rows.reduce((s, r) => s + (r.primes_vie_mad ?? 0), 0)
    const partAff = sp > 0 ? (wp / sp) * 100 : 0
    const partAffNv = spNv > 0 ? (wpNv / spNv) * 100 : 0
    const partAffVie = spVie > 0 ? (wpVie / spVie) * 100 : 0
    const pen = pm > 0 ? (wp / pm) * 100 : 0
    const penNv = pmNv > 0 ? (wpNv / pmNv) * 100 : 0
    const penVie = pmVie > 0 ? (wpVie / pmVie) * 100 : 0
    const nbNv = rows.filter(r => (r.subject_nonvie ?? 0) > 0 && (r.primes_nonvie_mad ?? 0) > 0).length
    const nbVie = rows.filter(r => (r.subject_vie ?? 0) > 0 && (r.primes_vie_mad ?? 0) > 0).length
    return {
      ...kpis,
      nb_pays_croises: rows.length,
      nb_pays_croises_nonvie: nbNv,
      nb_pays_croises_vie: nbVie,
      primes_marche_total_mad: pm,
      primes_marche_nonvie_mad: pmNv,
      primes_marche_vie_mad: pmVie,
      subject_premium_total: sp,
      subject_premium_nonvie_total: spNv,
      subject_premium_vie_total: spVie,
      written_premium_total: wp,
      written_premium_nonvie_total: wpNv,
      written_premium_vie_total: wpVie,
      part_affaires_pct: partAff,
      part_affaires_pct_nonvie: partAffNv,
      part_affaires_pct_vie: partAffVie,
      penetration_marche_pct: pen,
      penetration_marche_pct_nonvie: penNv,
      penetration_marche_pct_vie: penVie,
    }
  }, [kpis, filteredTableauPays, excludeMaroc])

  // Filter classements client-side when excluding Maroc
  const filteredClassements = useMemo(() => {
    if (!classements || !excludeMaroc) return classements
    const excl = (arr: any[]) => arr.filter(r => !isMaroc(r.pays))
    return {
      ...classements,
      par_primes_marche: excl(classements.par_primes_marche),
      par_subject_premium: excl(classements.par_subject_premium),
      par_written_premium: excl(classements.par_written_premium),
      par_share_written: excl(classements.par_share_written),
      par_penetration_marche: excl(classements.par_penetration_marche),
      par_rentabilite: excl(classements.par_rentabilite),
      tableau_pays: excl(classements.tableau_pays),
      tableau_cedantes: classements.tableau_cedantes.filter(r => !isMaroc(r.pays_risque)),
    }
  }, [classements, excludeMaroc])

  // ── Sort helpers ─────────────────────────────────────────────────────────────
  const sortedPays = useMemo(() => {
    let rows = filteredTableauPays.filter(r =>
      !searchPays || r.pays.toLowerCase().includes(searchPays.toLowerCase())
    )
    rows = [...rows].sort((a, b) => {
      const v = (a as any)[sortPays.col] ?? 0
      const w = (b as any)[sortPays.col] ?? 0
      return sortPays.dir === 'asc' ? v - w : w - v
    })
    return rows
  }, [filteredTableauPays, sortPays, searchPays])

  const paginatedPays = useMemo(
    () => sortedPays.slice((pagePays - 1) * PAGE_SIZE, pagePays * PAGE_SIZE),
    [sortedPays, pagePays]
  )

  const sortedCed = useMemo(() => {
    let rows = filteredTableauCedantes.filter(r =>
      !searchCed || r.cedante.toLowerCase().includes(searchCed.toLowerCase()) ||
      r.pays_risque.toLowerCase().includes(searchCed.toLowerCase())
    )
    rows = [...rows].sort((a, b) => {
      const v = (a as any)[sortCed.col] ?? 0
      const w = (b as any)[sortCed.col] ?? 0
      return sortCed.dir === 'asc' ? v - w : w - v
    })
    return rows
  }, [filteredTableauCedantes, sortCed, searchCed])

  const paginatedCed = useMemo(
    () => sortedCed.slice((pageCed - 1) * PAGE_SIZE, pageCed * PAGE_SIZE),
    [sortedCed, pageCed]
  )

  const handleSortPays = (col: string) =>
    setSortPays(s => ({ col, dir: s.col === col && s.dir === 'desc' ? 'asc' : 'desc' }))
  const handleSortCed = (col: string) =>
    setSortCed(s => ({ col, dir: s.col === col && s.dir === 'desc' ? 'asc' : 'desc' }))

  // ── Evolution chart data ───────────────────────────────────────────────────
  const evoChartData = useMemo(() => {
    if (!evolution.length) return []
    return evolution.map(r => ({
      year: r.year,
      nonvie: r.primes_marche_nonvie_mad,
      vie: r.primes_marche_vie_mad,
      total: r.primes_marche_total_mad,
      subject: r.subject_premium,
      subject_nonvie: r.subject_nonvie,
      subject_vie: r.subject_vie,
      written: r.written_premium,
      written_nonvie: r.written_nonvie,
      written_vie: r.written_vie,
      share: r.share_written_avg,
      share_nonvie: r.share_written_avg_nonvie,
      share_vie: r.share_written_avg_vie,
      part_affaires: (r as any).part_affaires_pct ?? 0,
      part_affaires_nonvie: (r as any).part_affaires_pct_nonvie ?? 0,
      part_affaires_vie: (r as any).part_affaires_pct_vie ?? 0,
      penetration: r.penetration_marche_pct,
      penetration_nonvie: r.penetration_marche_pct_nonvie,
      penetration_vie: r.penetration_marche_pct_vie,
    }))
  }, [evolution])

  // ── KPI cards data ────────────────────────────────────────────────────────
  const kpiCards = effectiveKpis ? [
    {
      label: 'Marchés Africains Communs',
      value: (activeFilter === 'nonvie'
        ? effectiveKpis.nb_pays_croises_nonvie
        : activeFilter === 'vie'
          ? effectiveKpis.nb_pays_croises_vie
          : effectiveKpis.nb_pays_croises
      ).toString(),
      sub: activeFilter === 'nonvie'
        ? 'pays avec activité Non-Vie en intersection'
        : activeFilter === 'vie'
          ? 'pays avec activité Vie en intersection'
          : 'pays en intersection portefeuille × données de marché',
      icon: <Globe size={20} style={{ color: GOLD }} />,
    },
    {
      label: 'Primes Totales du Marché',
      value: activeFilter === 'vie'
        ? formatPrime(effectiveKpis.primes_marche_vie_mad)
        : activeFilter === 'nonvie'
          ? formatPrime(effectiveKpis.primes_marche_nonvie_mad)
          : formatPrime(effectiveKpis.primes_marche_total_mad),
      sub: activeFilter === 'vie'
        ? 'Segment Vie uniquement'
        : activeFilter === 'nonvie'
          ? 'Segment Non-Vie uniquement'
          : `dont Non-Vie ${formatPrime(effectiveKpis.primes_marche_nonvie_mad)} · Vie ${formatPrime(effectiveKpis.primes_marche_vie_mad)}`,
      icon: <TrendingUp size={20} style={{ color: GOLD }} />,
    },
    {
      label: 'Primes des Affaires Souscrites',
      value: activeFilter === 'vie'
        ? formatPrime(effectiveKpis.subject_premium_vie_total)
        : activeFilter === 'nonvie'
          ? formatPrime(effectiveKpis.subject_premium_nonvie_total)
          : formatPrime(effectiveKpis.subject_premium_total),
      sub: activeFilter === 'vie'
        ? 'Segment Vie uniquement'
        : activeFilter === 'nonvie'
          ? 'Segment Non-Vie uniquement'
          : `Non-Vie ${formatPrime(effectiveKpis.subject_premium_nonvie_total)} · Vie ${formatPrime(effectiveKpis.subject_premium_vie_total)}`,
      icon: <FileText size={20} style={{ color: GOLD }} />,
    },
    {
      label: 'Primes Totales Atlantic Re',
      value: activeFilter === 'vie'
        ? formatPrime(effectiveKpis.written_premium_vie_total)
        : activeFilter === 'nonvie'
          ? formatPrime(effectiveKpis.written_premium_nonvie_total)
          : formatPrime(effectiveKpis.written_premium_total),
      sub: activeFilter === 'vie'
        ? 'Segment Vie uniquement'
        : activeFilter === 'nonvie'
          ? 'Segment Non-Vie uniquement'
          : `Non-Vie ${formatPrime(effectiveKpis.written_premium_nonvie_total)} · Vie ${formatPrime(effectiveKpis.written_premium_vie_total)}`,
      icon: <Banknote size={20} style={{ color: GOLD }} />,
    },
    {
      label: 'Part sur les Affaires',
      value: `${(activeFilter === 'nonvie'
        ? (effectiveKpis.part_affaires_pct_nonvie ?? effectiveKpis.share_written_avg_nonvie)
        : activeFilter === 'vie'
          ? (effectiveKpis.part_affaires_pct_vie ?? effectiveKpis.share_written_avg_vie)
          : (effectiveKpis.part_affaires_pct ?? effectiveKpis.share_written_avg)
      ).toFixed(1)}%`,
      sub: activeFilter === 'nonvie'
        ? 'Primes Atl. Re / Primes Affaires Souscrites (Non-Vie) × 100'
        : activeFilter === 'vie'
          ? 'Primes Atl. Re / Primes Affaires Souscrites (Vie) × 100'
          : 'Primes Atl. Re / Primes Affaires Souscrites × 100',
      icon: <Percent size={20} style={{ color: GOLD }} />,
    },
    {
      label: 'Pénétration Réelle sur le Marché',
      value: `${(activeFilter === 'nonvie'
        ? effectiveKpis.penetration_marche_pct_nonvie
        : activeFilter === 'vie'
          ? effectiveKpis.penetration_marche_pct_vie
          : effectiveKpis.penetration_marche_pct
      ).toFixed(3)}%`,
      sub: activeFilter === 'nonvie'
        ? '= Primes Atl. Re (NV) / Primes Totales Marché (NV) × 100'
        : activeFilter === 'vie'
          ? '= Primes Atl. Re (Vie) / Primes Totales Marché (Vie) × 100'
          : '= Primes Totales Atl. Re / Primes Totales du Marché × 100',
      icon: <Target size={20} style={{ color: 'white' }} />,
      highlighted: true,
    },
  ] : []

  // ── Classements config ────────────────────────────────────────────────────
  const classConfig = filteredClassements ? [
    {
      titre: '🏆 Primes de Marché',
      desc: 'Total Vie + Non-Vie par pays (données externes converties MAD)',
      data: filteredClassements.par_primes_marche.map(r => ({ pays: r.pays, value: r.primes_marche_total_mad, nonvie: r.primes_nonvie_mad, vie: r.primes_vie_mad })),
      stacked: true,
      fmt: formatPrime,
    },
    {
      titre: '📋 Primes des Affaires Souscrites',
      desc: 'SUBJECT_PREMIUM — Non-Vie (toutes branches sauf Vie) + Vie',
      data: filteredClassements.par_subject_premium.map(r => ({ pays: r.pays, value: r.subject_premium, nonvie: r.subject_nonvie, vie: r.subject_vie })),
      stacked: true,
      fmt: formatPrime,
    },
    {
      titre: '💼 Primes Atlantic Re',
      desc: 'WRITTEN_PREMIUM — Non-Vie (toutes branches sauf Vie) + Vie',
      data: filteredClassements.par_written_premium.map(r => ({ pays: r.pays, value: r.written_premium, nonvie: r.written_nonvie, vie: r.written_vie })),
      stacked: true,
      fmt: formatPrime,
    },
    {
      titre: '📊 Part sur les Affaires',
      desc: activeFilter === 'nonvie'
        ? 'Primes Atl. Re / Primes Affaires Souscrites × 100 — segment Non-Vie'
        : activeFilter === 'vie'
          ? 'Primes Atl. Re / Primes Affaires Souscrites × 100 — segment Vie'
          : 'Primes Atl. Re / Primes Affaires Souscrites × 100 (%)',
      data: filteredClassements.par_share_written.map(r => ({
        pays: r.pays,
        value: activeFilter === 'nonvie'
          ? (r.part_affaires_nonvie || 0)
          : activeFilter === 'vie'
            ? (r.part_affaires_vie || 0)
            : (r.part_affaires_pct || r.share_written_avg || 0),
      })),
      color: 'hsl(43,80%,55%)',
      fmt: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      titre: '⭐ Pénétration Réelle sur le Marché',
      desc: activeFilter === 'nonvie'
        ? 'Pénétration Non-Vie = Primes Atl. Re (NV) / Primes Totales Marché (NV) × 100'
        : activeFilter === 'vie'
          ? 'Pénétration Vie = Primes Atl. Re (Vie) / Primes Totales Marché (Vie) × 100'
          : 'Part d\'Atlantic Re dans le marché = Primes Atl. Re / Primes Totales du Marché × 100',
      data: filteredClassements.par_penetration_marche.map(r => ({
        pays: r.pays,
        value: activeFilter === 'nonvie'
          ? (r.penetration_nonvie || 0)
          : activeFilter === 'vie'
            ? (r.penetration_vie || 0)
            : r.penetration_marche_pct,
      })),
      color: GOLD,
      fmt: (v: number) => `${v.toFixed(3)}%`,
      highlighted: true,
    },
    {
      titre: '📉 Sinistralité (ULR)',
      desc: 'ULR moyen par pays — vert < 70% · orange 70-100% · rouge > 100%',
      data: filteredClassements.par_rentabilite.map(r => ({ pays: r.pays, value: r.ulr_moyen })),
      dynamicColor: true,
      fmt: (v: number) => `${v.toFixed(1)}%`,
    },
  ] : []

  // ── Country selector options ───────────────────────────────────────────────
  const countryOptions = paysCroises.map(p => ({ value: p.pays_interne, label: p.pays_interne }))

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220,20%,97%)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <section className="mb-8">
          <div
            className="bg-white rounded-xl px-7 py-5 flex items-start justify-between gap-4 flex-wrap"
            style={{
              border: '1px solid hsl(0,0%,92%)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            }}
          >
            <div className="space-y-1.5 w-full">
              <div className="flex items-center gap-3 flex-wrap" style={{ justifyContent: 'space-between' }}>
                <h1 className="text-2xl font-bold text-gray-800">
                  Analyse Synergique
                </h1>
              </div>
              <p className="text-sm text-gray-500 max-w-3xl leading-relaxed">
                Vue croisée Portefeuille Interne × Marchés Africains
                {effectiveKpis && ` — ${effectiveKpis.nb_pays_croises} marchés en commun`}
                {excludeMaroc && <span style={{ marginLeft: 6, color: 'hsl(358,66%,54%)', fontSize: 11, fontWeight: 600 }}>· Maroc exclu</span>}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ background: 'hsla(209,35%,16%,0.10)', color: 'hsl(209,35%,30%)', border: '1px solid hsla(209,35%,16%,0.20)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                    ⚙ Axe 1 — Portefeuille
                  </span>
                  <span style={{ fontSize: 13, color: '#9ca3af', alignSelf: 'center' }}>×</span>
                  <span style={{ background: 'hsla(83,52%,36%,0.10)', color: 'hsl(83,52%,28%)', border: '1px solid hsla(83,52%,36%,0.25)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                    🌍 Axe 2 — Afrique
                  </span>
                  <span style={{ fontSize: 13, color: '#9ca3af', alignSelf: 'center' }}>→</span>
                  <span style={{ background: `hsla(43,96%,48%,0.15)`, color: GOLD_DARK, border: `1px solid hsla(43,96%,48%,0.35)`, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                    ⚡ Analyse Synergique
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setFilterNonVie(!filterNonVie)}
                    style={{
                      padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: filterNonVie ? `linear-gradient(135deg, ${GOLD}, ${AMBER})` : 'white',
                      color: filterNonVie ? 'white' : GOLD_DARK,
                      border: `1px solid ${filterNonVie ? 'transparent' : GOLD}`,
                      transition: 'all 0.15s',
                    }}
                  >Non-Vie</button>
                  <button
                    onClick={() => setFilterVie(!filterVie)}
                    style={{
                      padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: filterVie ? `linear-gradient(135deg, ${GOLD}, ${AMBER})` : 'white',
                      color: filterVie ? 'white' : GOLD_DARK,
                      border: `1px solid ${filterVie ? 'transparent' : GOLD}`,
                      transition: 'all 0.15s',
                    }}
                  >Vie</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Conversion Bar ──────────────────────────────────────────────── */}
        <div style={{ background: 'white', border: `1px solid hsla(43,96%,48%,0.3)`, borderRadius: 10, marginBottom: 24, overflow: 'hidden' }}>
          <button
            onClick={() => setSettingsOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: 'hsla(43,96%,48%,0.04)', border: 'none', cursor: 'pointer' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: GOLD_DARK }}>
              <Combine size={15} style={{ color: GOLD }} />
              Taux de conversion USD → MAD
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {!settingsOpen && <span style={{ fontSize: 13, color: '#6b7280' }}>1 USD = {rate} MAD</span>}
              {settingsOpen ? <ChevronUp size={16} style={{ color: GOLD }} /> : <ChevronDown size={16} style={{ color: GOLD }} />}
            </span>
          </button>
          {settingsOpen && (
            <div style={{ padding: '16px 18px', borderTop: `1px solid hsla(43,96%,48%,0.15)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>1 USD =</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={rateInput}
                  onChange={e => setRateInput(e.target.value)}
                  style={{ width: 90, padding: '6px 10px', border: `1px solid ${GOLD}`, borderRadius: 6, fontSize: 14, outline: 'none' }}
                />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>MAD</span>
                <button className="btn-gold" onClick={saveRate} style={{ padding: '6px 16px', fontSize: 13 }}>
                  Sauvegarder
                </button>
                {rateSaved && <span style={{ color: 'hsl(152,56%,39%)', fontWeight: 600, fontSize: 13 }}>✓ Sauvegardé</span>}
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                Ce taux s'applique à toutes les données externes (primes de marché) pour la conversion USD → MAD.
              </p>
            </div>
          )}
        </div>

        {/* ── Year Selector + Exclure Maroc ───────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Année :</span>
            {allYears.map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(String(y))}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: selectedYear === String(y) ? `linear-gradient(135deg, ${GOLD}, ${AMBER})` : 'white',
                  color: selectedYear === String(y) ? 'white' : GOLD_DARK,
                  border: `1px solid ${selectedYear === String(y) ? 'transparent' : GOLD}`,
                  transition: 'all 0.15s',
                }}
              >{y}</button>
            ))}
            <button
              onClick={() => setSelectedYear('moyenne')}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: selectedYear === 'moyenne' ? `linear-gradient(135deg, ${GOLD}, ${AMBER})` : 'white',
                color: selectedYear === 'moyenne' ? 'white' : GOLD_DARK,
                border: `1px solid ${selectedYear === 'moyenne' ? 'transparent' : GOLD}`,
              }}
            >Moyenne</button>
          </div>
          {/* ── Exclure le Maroc ────── */}
          <label
            id="toggle-exclure-maroc"
            style={{
              display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
              padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: excludeMaroc ? 'hsla(358,66%,54%,0.10)' : 'white',
              color: excludeMaroc ? 'hsl(358,66%,44%)' : '#6b7280',
              border: `1px solid ${excludeMaroc ? 'hsla(358,66%,54%,0.45)' : 'hsl(0,0%,85%)'}`,
              transition: 'all 0.15s',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={excludeMaroc}
              onChange={e => setExcludeMaroc(e.target.checked)}
              style={{ accentColor: 'hsl(358,66%,54%)', width: 14, height: 14, cursor: 'pointer' }}
            />
            🇲🇦 Exclure le Maroc
          </label>
        </div>

        {/* ── Country Selector ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <Select
            options={countryOptions}
            placeholder={`Rechercher parmi les ${paysCroises.length} marchés croisés…`}
            onChange={opt => opt && navigate(`/analyse-synergie/${encodeURIComponent(opt.value)}`)}
            value={null}
            isClearable={false}
            styles={{
              control: base => ({ ...base, borderColor: GOLD, boxShadow: 'none', '&:hover': { borderColor: GOLD_DARK } }),
              option: (base, { isFocused }) => ({ ...base, background: isFocused ? `hsla(43,96%,48%,0.10)` : 'white', color: '#1f2937' }),
              singleValue: base => ({ ...base, color: GOLD_DARK }),
            }}
          />
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
            {paysCroises.length} marchés africains en commun entre votre portefeuille et les données de marché
          </p>
        </div>

        {/* ── Tab Navigation ───────────────────────────────────────────────── */}
        <SynTabNav activeTab={activeTab} onTabChange={handleTabChange} />
        <SynTabProgress activeTab={activeTab} />

        {/* ── Tab Content ─────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* ── KPIs & Synthèse ──────────────────────────────────────────── */}
          {activeTab === 'kpis' && (
            <div className="space-y-5 animate-fade-in">
              <section className="mb-8">
                <div
                  className="bg-white rounded-xl px-7 py-6"
                  style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
                >
                  <h2 className="text-lg font-bold text-gray-800 mb-5">
                    Indicateurs Clés
                  </h2>
                  {loadingKpis ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {kpiCards.map((card, i) => (
                        <div
                          key={i}
                          className={card.highlighted ? 'kpi-gold-highlighted' : 'kpi-gold'}
                          style={{ position: 'relative' }}
                        >
                          {card.highlighted && (
                            <span style={{
                              position: 'absolute', top: 10, right: 10,
                              background: `linear-gradient(135deg, ${GOLD}, ${AMBER})`,
                              color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                            }}>⭐ Indicateur Clé</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{
                              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: card.highlighted
                                ? `linear-gradient(135deg, ${GOLD}, ${AMBER})`
                                : `hsla(43,96%,48%,0.12)`,
                            }}>
                              {card.icon}
                            </div>
                            <div style={{ flex: 1, minWidth: 0, paddingRight: card.highlighted ? 90 : 0 }}>
                              <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>{card.label}</p>
                              <p style={{
                                fontSize: card.highlighted ? 22 : 20, fontWeight: 800,
                                color: card.highlighted ? GOLD : GOLD_DARK, lineHeight: 1.1,
                              }}>{card.value}</p>
                              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, lineHeight: 1.4 }}>{card.sub}</p>
                              {card.highlighted && (
                                <p style={{ fontSize: 11, color: GOLD, marginTop: 4, fontStyle: 'italic' }}>
                                  {PENETRATION_TOOLTIP}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ── Classement Pays ──────────────────────────────────────────── */}
          {activeTab === 'classement' && (
            <div className="space-y-5 animate-fade-in">
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
                Classements — Top 15 pays
              </h2>
              {loadingClass ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 20 }}>
                  {classConfig.map((cfg, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'white', borderRadius: 12,
                        border: cfg.highlighted ? `2px solid ${GOLD}` : '1px solid hsl(0,0%,92%)',
                        boxShadow: cfg.highlighted ? `0 4px 20px hsla(43,96%,48%,0.12)` : '0 2px 8px rgba(0,0,0,0.05)',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid hsl(0,0%,95%)',
                        background: cfg.highlighted ? `hsla(43,96%,48%,0.05)` : undefined,
                      }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: cfg.highlighted ? GOLD_DARK : '#1f2937' }}>
                          {cfg.titre}
                          {cfg.highlighted && (
                            <span style={{ marginLeft: 8, fontSize: 10, background: `hsla(43,96%,48%,0.15)`, color: GOLD_DARK, padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>CLÉ</span>
                          )}
                        </p>
                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{cfg.desc}</p>
                        {cfg.highlighted && (
                          <p style={{ fontSize: 11, color: GOLD, marginTop: 2, fontStyle: 'italic' }}>{PENETRATION_TOOLTIP}</p>
                        )}
                      </div>
                      <div style={{ padding: '12px 16px', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          {cfg.stacked ? (
                            <BarChart 
                              data={cfg.data} 
                              layout="vertical" 
                              margin={{ top: 0, right: 40, bottom: 0, left: 60 }}
                              onClick={(state: any) => {
                                if (state && state.activeLabel) {
                                  navigate(`/analyse-synergie/${encodeURIComponent(state.activeLabel)}`);
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tickFormatter={v => formatPrime(v)} tick={{ fontSize: 10 }} />
                              <YAxis dataKey="pays" type="category" tick={{ fontSize: 10 }} width={65} interval={0} />
                              <Tooltip content={<GoldTooltip formatter={formatPrime} />} />
                              {activeFilter !== 'vie' && <Bar dataKey="nonvie" stackId="a" fill={GOLD_DARK} name="Non-Vie" radius={activeFilter === 'nonvie' ? [0, 3, 3, 0] : [0, 0, 0, 0]} />}
                              {activeFilter !== 'nonvie' && <Bar dataKey="vie" stackId="a" fill={GOLD_LIGHT} name="Vie" radius={[0, 2, 2, 0]} />}
                            </BarChart>
                          ) : (
                            <BarChart 
                              data={cfg.data} 
                              layout="vertical" 
                              margin={{ top: 0, right: 40, bottom: 0, left: 60 }}
                              onClick={(state: any) => {
                                if (state && state.activeLabel) {
                                  navigate(`/analyse-synergie/${encodeURIComponent(state.activeLabel)}`);
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tickFormatter={cfg.fmt} tick={{ fontSize: 10 }} />
                              <YAxis dataKey="pays" type="category" tick={{ fontSize: 10 }} width={65} interval={0} />
                              <Tooltip content={<GoldTooltip formatter={cfg.fmt} />} />
                              <Bar dataKey="value" name={cfg.titre} radius={[0, 3, 3, 0]} fill={cfg.color || GOLD} label={false}>
                                {cfg.dynamicColor && cfg.data.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={ulrColor(entry.value)} />
                                ))}
                              </Bar>
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Évolution ────────────────────────────────────────────────── */}
          {activeTab === 'evolution' && (
            <div className="space-y-5 animate-fade-in">
              <div style={{
                background: 'white', borderRadius: 12, border: '1px solid hsl(0,0%,92%)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden',
              }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(0,0%,95%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>Évolution Temporelle</h2>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                      Tous les pays croisés — 2015–2024
                      {excludeMaroc && <span style={{ marginLeft: 6, color: 'hsl(358,66%,54%)', fontWeight: 600 }}>· Maroc exclu</span>}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {evoNavOptions.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setEvoMetric(opt.id)}
                        style={{
                          padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          background: evoMetric === opt.id ? `linear-gradient(135deg, ${GOLD}, ${AMBER})` : 'white',
                          color: evoMetric === opt.id ? 'white' : GOLD_DARK,
                          border: `1px solid ${evoMetric === opt.id ? 'transparent' : GOLD}`,
                        }}
                      >{opt.icon} {opt.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ padding: '20px', height: 400 }}>
                  {loadingEvo ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spinner /></div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {evoMetric === 'primes_marche' ? (
                        <ComposedChart data={evoChartData} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={v => formatPrime(v)} tick={{ fontSize: 11 }} width={90} />
                          <Tooltip content={<GoldTooltip formatter={formatPrime} />} />
                          {activeFilter !== 'vie' && <Bar dataKey="nonvie" stackId="a" fill={GOLD_DARK} name="Non-Vie" />}
                          {activeFilter !== 'nonvie' && <Bar dataKey="vie" stackId="a" fill={GOLD_LIGHT} name="Vie" />}
                          {activeFilter === 'all' && <Line dataKey="total" stroke={AMBER} strokeWidth={2} dot={{ r: 3 }} name="Total" />}
                        </ComposedChart>
                      ) : evoMetric === 'subject_premium' ? (
                        <ComposedChart data={evoChartData} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={v => formatPrime(v)} tick={{ fontSize: 11 }} width={90} />
                          <Tooltip content={<GoldTooltip formatter={formatPrime} />} />
                          {activeFilter !== 'vie' && <Bar dataKey="subject_nonvie" stackId="a" fill={GOLD_DARK} name="Non-Vie" />}
                          {activeFilter !== 'nonvie' && <Bar dataKey="subject_vie" stackId="a" fill={GOLD_LIGHT} name="Vie" />}
                          {activeFilter === 'all' && <Line dataKey="subject" stroke={AMBER} strokeWidth={2} dot={{ r: 3 }} name="Total" />}
                        </ComposedChart>
                      ) : evoMetric === 'written_premium' ? (
                        <ComposedChart data={evoChartData} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={v => formatPrime(v)} tick={{ fontSize: 11 }} width={90} />
                          <Tooltip content={<GoldTooltip formatter={formatPrime} />} />
                          {activeFilter !== 'vie' && <Bar dataKey="written_nonvie" stackId="a" fill={GOLD_DARK} name="Non-Vie" />}
                          {activeFilter !== 'nonvie' && <Bar dataKey="written_vie" stackId="a" fill={GOLD_LIGHT} name="Vie" />}
                          {activeFilter === 'all' && <Line dataKey="written" stroke={AMBER} strokeWidth={2} dot={{ r: 3 }} name="Total" />}
                        </ComposedChart>
                      ) : evoMetric === 'penetration_marche' ? (
                        <AreaChart data={evoChartData} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={v => `${v.toFixed(3)}%`} tick={{ fontSize: 11 }} width={55} />
                          <Tooltip content={<GoldTooltip formatter={(v: number) => `${v.toFixed(3)}%`} />} />
                          <Area
                            dataKey={activeFilter === 'nonvie' ? 'penetration_nonvie' : activeFilter === 'vie' ? 'penetration_vie' : 'penetration'}
                            stroke={GOLD} strokeWidth={2.5} fill={GOLD_FILL}
                            name={activeFilter === 'nonvie' ? '⭐ Pénétration Non-Vie' : activeFilter === 'vie' ? '⭐ Pénétration Vie' : '⭐ Pénétration Réelle'}
                          />
                        </AreaChart>
                      ) : (
                        <ComposedChart data={evoChartData} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                          <YAxis
                            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                            tick={{ fontSize: 11 }}
                            width={55}
                          />
                          <Tooltip content={<GoldTooltip formatter={(v: number) => `${v.toFixed(1)}%`} />} />
                          <Bar
                            dataKey={activeFilter === 'nonvie' ? 'part_affaires_nonvie' : activeFilter === 'vie' ? 'part_affaires_vie' : 'part_affaires'}
                            fill={GOLD}
                            name={activeFilter === 'nonvie' ? 'Part Affaires Non-Vie (%)' : activeFilter === 'vie' ? 'Part Affaires Vie (%)' : 'Part sur les Affaires (%)'}
                          />
                        </ComposedChart>
                      )}
                    </ResponsiveContainer>
                  )}
                  {evoMetric === 'penetration_marche' && (
                    <p style={{ fontSize: 11, color: GOLD, textAlign: 'center', marginTop: 4, fontStyle: 'italic' }}>
                      {PENETRATION_TOOLTIP}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Synthèse par Pays ────────────────────────────────────────── */}
          {activeTab === 'synthese' && (
            <div className="space-y-5 animate-fade-in">
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(0,0%,95%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>Synthèse par Pays</h2>
                  <input
                    placeholder="Rechercher un pays…"
                    value={searchPays}
                    onChange={e => { setSearchPays(e.target.value); setPagePays(1) }}
                    style={{ padding: '6px 12px', border: `1px solid ${GOLD}`, borderRadius: 6, fontSize: 13, outline: 'none', width: 200 }}
                  />
                </div>
                {loadingClass ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
                ) : (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'hsl(0,0%,97%)', borderBottom: '2px solid hsl(0,0%,92%)' }}>
                            <SortHeader label="Pays" col="pays" sortCol={sortPays.col} sortDir={sortPays.dir} onSort={handleSortPays} />
                            <SortHeader
                              label={activeFilter === 'vie' ? 'Primes Marché (Vie)' : activeFilter === 'nonvie' ? 'Primes Marché (Non-Vie)' : 'Primes Marché'}
                              col="primes_marche_total_mad" sortCol={sortPays.col} sortDir={sortPays.dir} onSort={handleSortPays}
                            />
                            {activeFilter !== 'vie' && <SortHeader label="Non-Vie" col="primes_nonvie_mad" sortCol={sortPays.col} sortDir={sortPays.dir} onSort={handleSortPays} />}
                            {activeFilter !== 'nonvie' && <SortHeader label="Vie" col="primes_vie_mad" sortCol={sortPays.col} sortDir={sortPays.dir} onSort={handleSortPays} />}
                            <SortHeader
                              label={activeFilter === 'vie' ? 'Subject (Vie)' : activeFilter === 'nonvie' ? 'Subject (Non-Vie)' : 'Subject Premium'}
                              col="subject_premium" sortCol={sortPays.col} sortDir={sortPays.dir} onSort={handleSortPays}
                            />
                            <SortHeader
                              label={activeFilter === 'vie' ? 'Atl. Re (Vie)' : activeFilter === 'nonvie' ? 'Atl. Re (Non-Vie)' : 'Primes Atl. Re'}
                              col="written_premium" sortCol={sortPays.col} sortDir={sortPays.dir} onSort={handleSortPays}
                            />
                            <SortHeader label="Part Affaires %" col="share_written_avg" sortCol={sortPays.col} sortDir={sortPays.dir} onSort={handleSortPays} />
                            <th
                              className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap cursor-pointer select-none"
                              style={{ color: sortPays.col === 'penetration_marche_pct' ? GOLD : '#6b7280' }}
                              onClick={() => handleSortPays('penetration_marche_pct')}
                              title={PENETRATION_TOOLTIP}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                ⭐ Pénétration Réelle %
                                {sortPays.col === 'penetration_marche_pct' && (sortPays.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                              </span>
                            </th>
                            <SortHeader label="Affaires" col="nb_affaires" sortCol={sortPays.col} sortDir={sortPays.dir} onSort={handleSortPays} />
                            <SortHeader label="Cédantes" col="nb_cedantes" sortCol={sortPays.col} sortDir={sortPays.dir} onSort={handleSortPays} />
                            <SortHeader label="ULR moy." col="ulr_moyen" sortCol={sortPays.col} sortDir={sortPays.dir} onSort={handleSortPays} />
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPays.map((row, i) => (
                            <tr
                              key={row.pays}
                              onClick={() => navigate(`/analyse-synergie/${encodeURIComponent(row.pays)}`)}
                              style={{ borderBottom: '1px solid hsl(0,0%,95%)', cursor: 'pointer', background: i % 2 === 0 ? 'white' : 'hsl(0,0%,98.5%)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `hsla(43,96%,48%,0.06)` }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'white' : 'hsl(0,0%,98.5%)' }}
                            >
                              <td className="px-3 py-2.5" style={{ fontWeight: 600, color: '#1f2937' }}>{row.pays}</td>
                              <td className="px-3 py-2.5" style={{ color: '#374151' }}>
                                {formatPrime(activeFilter === 'vie' ? row.primes_vie_mad : activeFilter === 'nonvie' ? row.primes_nonvie_mad : row.primes_marche_total_mad)}
                              </td>
                              {activeFilter !== 'vie' && <td className="px-3 py-2.5 text-gray-500">{formatPrime(row.primes_nonvie_mad)}</td>}
                              {activeFilter !== 'nonvie' && <td className="px-3 py-2.5 text-gray-500">{formatPrime(row.primes_vie_mad)}</td>}
                              <td className="px-3 py-2.5" style={{ color: '#374151' }}>
                                {formatPrime(activeFilter === 'vie' ? row.subject_vie : activeFilter === 'nonvie' ? row.subject_nonvie : row.subject_premium)}
                              </td>
                              <td className="px-3 py-2.5" style={{ fontWeight: 600, color: GOLD_DARK }}>
                                {formatPrime(activeFilter === 'vie' ? row.written_vie : activeFilter === 'nonvie' ? row.written_nonvie : row.written_premium)}
                              </td>
                              <td className="px-3 py-2.5">
                                {(activeFilter === 'nonvie' ? row.part_affaires_pct_nonvie : activeFilter === 'vie' ? row.part_affaires_pct_vie : row.part_affaires_pct).toFixed(1)}%
                              </td>
                              <td className="px-3 py-2.5" style={{ fontWeight: 700, color: GOLD }} title={PENETRATION_TOOLTIP}>
                                {(activeFilter === 'nonvie' ? row.penetration_marche_pct_nonvie : activeFilter === 'vie' ? row.penetration_marche_pct_vie : row.penetration_marche_pct).toFixed(3)}%
                              </td>
                              <td className="px-3 py-2.5 text-gray-500">{row.nb_affaires}</td>
                              <td className="px-3 py-2.5 text-gray-500">{row.nb_cedantes}</td>
                              <td className="px-3 py-2.5" style={{ fontWeight: 600, color: ulrColor(row.ulr_moyen) }}>
                                {row.ulr_moyen.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                          {paginatedPays.length === 0 && (
                            <tr><td colSpan={activeFilter === 'all' ? 11 : 10} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Aucun résultat</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {sortedPays.length > PAGE_SIZE && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 16px' }}>
                        {Array.from({ length: Math.ceil(sortedPays.length / PAGE_SIZE) }, (_, i) => i + 1).map(p => (
                          <button key={p} onClick={() => setPagePays(p)}
                            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: p === pagePays ? GOLD : 'white', color: p === pagePays ? 'white' : GOLD_DARK, border: `1px solid ${GOLD}` }}>
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Détail par Cédante ───────────────────────────────────────── */}
          {activeTab === 'cedantes' && (
            <div className="space-y-5 animate-fade-in">
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(0,0%,95%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>Détail par Cédante</h2>
                  <input
                    placeholder="Rechercher une cédante ou un pays…"
                    value={searchCed}
                    onChange={e => { setSearchCed(e.target.value); setPageCed(1) }}
                    style={{ padding: '6px 12px', border: `1px solid ${GOLD}`, borderRadius: 6, fontSize: 13, outline: 'none', width: 260 }}
                  />
                </div>
                {loadingCedantes ? (
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 60, gap: 16 }}>
                    <Spinner />
                    <p style={{ fontSize: 13, color: '#9ca3af' }}>Chargement du détail par cédante…</p>
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'hsl(0,0%,97%)', borderBottom: '2px solid hsl(0,0%,92%)' }}>
                            <SortHeader label="Cédante" col="cedante" sortCol={sortCed.col} sortDir={sortCed.dir} onSort={handleSortCed} />
                            <SortHeader label="Pays" col="pays_risque" sortCol={sortCed.col} sortDir={sortCed.dir} onSort={handleSortCed} />
                            <SortHeader label="Affaires" col="nb_affaires" sortCol={sortCed.col} sortDir={sortCed.dir} onSort={handleSortCed} />
                            <SortHeader
                              label={activeFilter === 'vie' ? 'Subject (Vie)' : activeFilter === 'nonvie' ? 'Subject (Non-Vie)' : 'Subject Premium'}
                              col="subject_premium" sortCol={sortCed.col} sortDir={sortCed.dir} onSort={handleSortCed}
                            />
                            <SortHeader
                              label={activeFilter === 'vie' ? 'Atl. Re (Vie)' : activeFilter === 'nonvie' ? 'Atl. Re (Non-Vie)' : 'Primes Atl. Re'}
                              col="written_premium" sortCol={sortCed.col} sortDir={sortCed.dir} onSort={handleSortCed}
                            />
                            <SortHeader label="Part Affaires %" col="share_written_avg" sortCol={sortCed.col} sortDir={sortCed.dir} onSort={handleSortCed} />
                            <th
                              className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap cursor-pointer select-none"
                              style={{ color: sortCed.col === 'penetration_marche_pct' ? GOLD : '#6b7280' }}
                              onClick={() => handleSortCed('penetration_marche_pct')}
                              title={PENETRATION_TOOLTIP}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                ⭐ Pénétration Réelle %
                                {sortCed.col === 'penetration_marche_pct' && (sortCed.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                              </span>
                            </th>
                            <SortHeader label="ULR moy." col="ulr_moyen" sortCol={sortCed.col} sortDir={sortCed.dir} onSort={handleSortCed} />
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Branches</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedCed.map((row, i) => (
                            <tr key={`${row.cedante}-${row.pays_risque}-${i}`}
                              style={{ borderBottom: '1px solid hsl(0,0%,95%)', background: i % 2 === 0 ? 'white' : 'hsl(0,0%,98.5%)' }}>
                              <td className="px-3 py-2.5" style={{ fontWeight: 600, color: '#1f2937', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.cedante}</td>
                              <td className="px-3 py-2.5">
                                <button onClick={() => navigate(`/analyse-synergie/${encodeURIComponent(row.pays_risque)}`)}
                                  style={{ color: GOLD_DARK, fontWeight: 600, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                                  {row.pays_risque}
                                </button>
                              </td>
                              <td className="px-3 py-2.5 text-gray-500">{row.nb_affaires}</td>
                              <td className="px-3 py-2.5">
                                {formatPrime(activeFilter === 'vie' ? row.subject_vie : activeFilter === 'nonvie' ? row.subject_nonvie : row.subject_premium)}
                              </td>
                              <td className="px-3 py-2.5" style={{ fontWeight: 600, color: GOLD_DARK }}>
                                {formatPrime(activeFilter === 'vie' ? row.written_vie : activeFilter === 'nonvie' ? row.written_nonvie : row.written_premium)}
                              </td>
                              <td className="px-3 py-2.5">
                                {(activeFilter === 'nonvie' ? row.part_affaires_pct_nonvie : activeFilter === 'vie' ? row.part_affaires_pct_vie : row.part_affaires_pct).toFixed(1)}%
                              </td>
                              <td className="px-3 py-2.5" style={{ fontWeight: 700, color: GOLD }} title={PENETRATION_TOOLTIP}>
                                {(activeFilter === 'nonvie' ? row.penetration_marche_pct_nonvie : activeFilter === 'vie' ? row.penetration_marche_pct_vie : row.penetration_marche_pct).toFixed(3)}%
                              </td>
                              <td className="px-3 py-2.5" style={{ fontWeight: 600, color: ulrColor(row.ulr_moyen) }}>{row.ulr_moyen.toFixed(1)}%</td>
                              <td className="px-3 py-2.5">
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                  {row.branches.slice(0, 3).map(b => (
                                    <span key={b} style={{ background: `hsla(43,96%,48%,0.10)`, color: GOLD_DARK, borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 600 }}>{b}</span>
                                  ))}
                                  {row.branches.length > 3 && <span style={{ color: '#9ca3af', fontSize: 10 }}>+{row.branches.length - 3}</span>}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {paginatedCed.length === 0 && (
                            <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Aucun résultat</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {sortedCed.length > PAGE_SIZE && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 16px' }}>
                        {Array.from({ length: Math.ceil(sortedCed.length / PAGE_SIZE) }, (_, i) => i + 1).map(p => (
                          <button key={p} onClick={() => setPageCed(p)}
                            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: p === pageCed ? GOLD : 'white', color: p === pageCed ? 'white' : GOLD_DARK, border: `1px solid ${GOLD}` }}>
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ── Prev / Next navigation ─────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: '1px solid hsl(0,0%,93%)' }}>
          <button
            onClick={goPrev}
            disabled={currentTabIdx === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={currentTabIdx === 0
              ? { background: 'hsl(0,0%,96%)', color: '#d1d5db', cursor: 'not-allowed' }
              : { background: 'hsl(0,0%,97%)', color: '#374151', border: '1px solid hsl(0,0%,88%)', cursor: 'pointer' }}
          >
            <span>←</span>
            <span>{currentTabIdx > 0 ? SYN_TABS[currentTabIdx - 1].label : '—'}</span>
          </button>
          <span className="text-xs text-gray-400 font-medium">{currentTabIdx + 1} / {SYN_TABS.length}</span>
          <button
            onClick={goNext}
            disabled={currentTabIdx === SYN_TABS.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={currentTabIdx === SYN_TABS.length - 1
              ? { background: 'hsl(0,0%,96%)', color: '#d1d5db', cursor: 'not-allowed' }
              : { background: 'hsl(35,88%,38%)', color: 'white', cursor: 'pointer' }}
          >
            <span>{currentTabIdx < SYN_TABS.length - 1 ? SYN_TABS[currentTabIdx + 1].label : '—'}</span>
            <span>→</span>
          </button>
        </div>

      </div>
    </div>
  )
}