/**
 * Page pays — Analyse Synergique /:pays
 * Rapport détaillé de positionnement Atlantic Re dans un marché africain.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Banknote, ChevronDown, ChevronLeft, ChevronUp,
  FileText, Globe, Loader2, Percent, Target, TrendingUp,
} from 'lucide-react'
import api from '../utils/api'
import { formatMAD } from '../utils/formatters'

// ── Tab definitions ─────────────────────────────────────────────────────────
type PaysTabId = 'kpis' | 'evolution' | 'rapport' | 'cedantes'
const PAYS_TABS: { id: PaysTabId; label: string; icon: string }[] = [
  { id: 'kpis',      label: 'KPIs & Synthèse',           icon: '📊' },
  { id: 'evolution', label: 'Évolution',                  icon: '📈' },
  { id: 'rapport',   label: 'Rapport de Recommandation',  icon: '📋' },
  { id: 'cedantes',  label: 'Détail par Cédante',         icon: '📁' },
]

// ── Tab Navigation Bar ──────────────────────────────────────────────────────
function PaysTabNav({ activeTab, onTabChange }: { activeTab: PaysTabId; onTabChange: (t: PaysTabId) => void }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden mb-1"
      style={{ border: '1px solid hsl(0,0%,90%)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div className="flex overflow-x-auto scrollbar-hide">
        {PAYS_TABS.map((tab, i) => {
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
              id={`tab-pays-${tab.id}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {i < PAYS_TABS.length - 1 && !active && (
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
function PaysTabProgress({ activeTab }: { activeTab: PaysTabId }) {
  const currentIndex = PAYS_TABS.findIndex(t => t.id === activeTab)
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {PAYS_TABS.map((tab, i) => (
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


// ── Colors ────────────────────────────────────────────────────────────────────
const GOLD = 'hsl(43,96%,48%)'
const GOLD_DARK = 'hsl(35,88%,38%)'
const GOLD_LIGHT = 'hsl(48,96%,65%)'
const AMBER = 'hsl(35,88%,50%)'
const GOLD_FILL = 'hsla(43,96%,48%,0.15)'
const PENETRATION_TOOLTIP = '= Primes Totales Atlantic Re / Primes Totales du Marché × 100'
const PART_AFFAIRES_TOOLTIP = '= Primes Totales Atlantic Re / Primes des Affaires Souscrites × 100'

function ulrColor(v: number) {
  if (v < 70) return 'hsl(152,56%,39%)'
  if (v < 100) return 'hsl(30,88%,56%)'
  return 'hsl(358,66%,54%)'
}

function Spinner() {
  return <Loader2 size={20} className="animate-spin" style={{ color: GOLD }} />
}

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

function SortHeader({ label, col, sortCol, sortDir, onSort }: {
  label: string; col: string; sortCol: string; sortDir: 'asc' | 'desc'
  onSort: (c: string) => void
}) {
  const active = sortCol === col
  return (
    <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap cursor-pointer select-none"
      style={{ color: active ? GOLD : '#6b7280' }} onClick={() => onSort(col)}>
      <span className="flex items-center gap-1">
        {label}
        {active ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
      </span>
    </th>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PaysKPIs {
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
  ulr_moyen: number
  ulr_moyen_nonvie: number
  ulr_moyen_vie: number
  nb_affaires: number
  nb_affaires_nonvie: number
  nb_affaires_vie: number
  nb_cedantes: number
  nb_cedantes_nonvie: number
  nb_cedantes_vie: number
  annees_disponibles: number[]
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

interface CedanteDetail {
  cedante: string
  subject_premium: number
  subject_nonvie: number
  subject_vie: number
  written_premium: number
  written_nonvie: number
  written_vie: number
  share_written: number
  share_written_avg: number
  share_written_avg_nonvie: number
  share_written_avg_vie: number
  ulr: number
  ulr_moyen: number
  nb_affaires: number
  pct_written_vs_pays: number
}

interface Rapport {
  pays: string
  primes_marche_total_mad: number
  primes_nonvie_mad: number
  primes_vie_mad: number
  subject_premium: number
  written_premium: number
  share_written_avg: number
  penetration_marche_pct: number
  ulr_moyen: number
  nb_cedantes: number
  nb_affaires: number
  croissance_marche_cagr: number
  croissance_written_cagr: number
  cedantes_detail: CedanteDetail[]
  branches_presentes: string[]
  branches_absentes: string[]
  evolution_marche: { year: number; nonvie: number; vie: number; total: number }[]
  evolution_atlantic: { year: number; subject_premium: number; written_premium: number; share_written_avg: number; penetration_marche_pct: number }[]
  annees_disponibles: number[]
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
  pct_written_vs_pays: number
}

// ── Rapport params ────────────────────────────────────────────────────────────
interface RapportParams {
  seuil_part_elevee: number
  seuil_part_faible: number
  seuil_ulr_risque: number
  seuil_ulr_critique: number
  seuil_cedantes_min: number
  seuil_cedantes_max: number
  seuil_croissance_elevee: number
  seuil_penetration_faible: number
  seuil_cedante_dominante: number
}

const DEFAULT_PARAMS: RapportParams = {
  seuil_part_elevee: 30,
  seuil_part_faible: 5,
  seuil_ulr_risque: 80,
  seuil_ulr_critique: 100,
  seuil_cedantes_min: 2,
  seuil_cedantes_max: 10,
  seuil_croissance_elevee: 10,
  seuil_penetration_faible: 0.1,
  seuil_cedante_dominante: 40,
}

const PARAM_LABELS: Record<keyof RapportParams, string> = {
  seuil_part_elevee: 'Seuil Part Élevée (> %)',
  seuil_part_faible: 'Seuil Part Faible (< %)',
  seuil_ulr_risque: 'Seuil ULR Risque (> %)',
  seuil_ulr_critique: 'Seuil ULR Critique (> %)',
  seuil_cedantes_min: 'Seuil Nb Cédantes Min (<)',
  seuil_cedantes_max: 'Seuil Nb Cédantes Max (>)',
  seuil_croissance_elevee: 'Seuil Croissance Élevée (> %)',
  seuil_penetration_faible: 'Seuil Pénétration Faible (< %)',
  seuil_cedante_dominante: 'Seuil Cédante Dominante (> %)',
}

// ── Diagnostic builder ────────────────────────────────────────────────────────
function buildDiagnostics(rapport: Rapport, params: RapportParams) {
  if (!rapport) return []
  const {
    share_written_avg: sw_raw, penetration_marche_pct: pen_raw, ulr_moyen: ulr_raw,
    nb_cedantes: nb_cedantes_raw, croissance_marche_cagr: cagr_raw, croissance_written_cagr: wcagr,
    primes_marche_total_mad: mkt, primes_vie_mad: vie_raw,
    cedantes_detail, branches_absentes: branches_absentes_raw, branches_presentes: branches_presentes_raw,
  } = rapport
  // Defensive guards against undefined values
  const sw = sw_raw ?? 0
  const pen = pen_raw ?? 0
  const ulr = ulr_raw ?? 0
  const nb_cedantes = nb_cedantes_raw ?? 0
  const cagr = cagr_raw ?? 0
  const vie = vie_raw ?? 0
  const branches_absentes = branches_absentes_raw ?? []
  const branches_presentes = branches_presentes_raw ?? []

  const diags: { section: string; classe: string; text: string }[] = []
  const reco: { priority: string; text: string }[] = []

  // Section 1 — Positionnement
  let pos_classe = 'success'
  let pos_text = `✅ POSITIONNEMENT ÉQUILIBRÉ — Part ${sw.toFixed(1)}% sur les affaires, pénétration réelle ${pen.toFixed(3)}% du marché.`
  if (sw > params.seuil_part_elevee) {
    pos_classe = 'warning'
    pos_text = `⚠️ CONCENTRATION SUR LES AFFAIRES — La part moyenne souscrite (${sw.toFixed(1)}%) dépasse le seuil de ${params.seuil_part_elevee}%. Surveiller l'exposition.`
    reco.push({ priority: '🟡', text: `IMPORTANT — Surveiller la concentration : part ${sw.toFixed(1)}% > seuil ${params.seuil_part_elevee}%` })
  } else if (pen < params.seuil_penetration_faible) {
    pos_classe = 'info'
    pos_text = `🟡 SOUS-REPRÉSENTATION SUR LE MARCHÉ — Malgré ${sw.toFixed(1)}% sur les affaires participées, la pénétration réelle n'est que ${pen.toFixed(3)}% du marché total. Marge de progression significative.`
  }
  diags.push({ section: '1 — Positionnement Atlantic Re', classe: pos_classe, text: pos_text })

  // Section 2 — Sinistralité
  let ulr_classe = 'success'
  let ulr_text = `✅ SINISTRALITÉ SAINE — ULR de ${ulr.toFixed(1)}%, dans les normes.`
  if (ulr > params.seuil_ulr_critique) {
    ulr_classe = 'danger'
    ulr_text = `⛔ SINISTRALITÉ CRITIQUE — ULR de ${ulr.toFixed(1)}%, au-dessus de ${params.seuil_ulr_critique}%. Atlantic Re perd de l'argent sur ce marché. RECOMMANDATION URGENTE : réduire l'exposition, renégocier les conditions tarifaires, envisager la résiliation.`
    reco.push({ priority: '🔴', text: `URGENT — Réduire l'exposition : ULR critique ${ulr.toFixed(1)}%` })
  } else if (ulr > params.seuil_ulr_risque) {
    ulr_classe = 'warning'
    ulr_text = `⚠️ SINISTRALITÉ PRÉOCCUPANTE — ULR ${ulr.toFixed(1)}% (seuil : ${params.seuil_ulr_risque}%). Renforcer la sélection des risques.`
    reco.push({ priority: '🟡', text: `IMPORTANT — Sinistralité préoccupante : ULR ${ulr.toFixed(1)}%` })
  }
  diags.push({ section: '2 — Sinistralité', classe: ulr_classe, text: ulr_text })

  // Section 3 — Cédantes
  const top_ced = cedantes_detail[0]
  const pct_top = top_ced ? top_ced.pct_written_vs_pays : 0
  let ced_classe = 'success'
  let ced_text = `✅ DIVERSIFICATION ÉQUILIBRÉE — ${nb_cedantes} cédante${nb_cedantes > 1 ? 's' : ''} actives, répartition saine.`
  if (nb_cedantes < params.seuil_cedantes_min) {
    ced_classe = 'danger'
    ced_text = `🔴 MONO-CÉDANTE — ${nb_cedantes} cédante(s) seulement. SEUIL CRITIQUE : toute résiliation entraîne une sortie totale du marché. RECOMMANDATION URGENTE : prospecter au minimum une nouvelle cédante locale.`
    reco.push({ priority: '🔴', text: `URGENT — Prospecter une 2ème cédante : situation mono-cédante` })
  } else if (top_ced && pct_top > params.seuil_cedante_dominante) {
    ced_classe = 'warning'
    ced_text = `🔶 CONCENTRATION BILATÉRALE — ${top_ced.cedante} représente ${pct_top.toFixed(1)}% des primes. Rééquilibrer en développant les autres cédantes.`
    reco.push({ priority: '🟡', text: `IMPORTANT — Rééquilibrer : ${top_ced.cedante} = ${pct_top.toFixed(1)}% des primes` })
  } else if (nb_cedantes > params.seuil_cedantes_max) {
    ced_classe = 'info'
    ced_text = `ℹ️ PORTEFEUILLE ÉTENDU — ${nb_cedantes} cédantes actives. Analyser la performance individuelle et concentrer les capacités sur les plus rentables.`
  }
  diags.push({ section: '3 — Diversification des Cédantes', classe: ced_classe, text: ced_text })

  // Section 4 — Dynamique de marché
  let dyn_classe = 'info'
  let dyn_text = `📊 MARCHÉ STABLE — Croissance ${cagr.toFixed(1)}%/an. Maintenir la présence actuelle.`
  if (cagr > params.seuil_croissance_elevee && pen < params.seuil_penetration_faible) {
    dyn_classe = 'opportunity'
    dyn_text = `🚀 OPPORTUNITÉ DE CROISSANCE FORTE — Marché en croissance de ${cagr.toFixed(1)}%/an et pénétration réelle d'Atlantic Re seulement ${pen.toFixed(3)}%. RECOMMANDATION : augmenter activement la présence — prospecter de nouvelles cédantes, augmenter les parts souscrites.`
    reco.push({ priority: '🟢', text: `OPPORTUNITÉ — Augmenter la pénétration : marché +${cagr.toFixed(1)}%/an, sous-représentation confirmée` })
  } else if (cagr > params.seuil_croissance_elevee && sw > params.seuil_part_elevee) {
    dyn_classe = 'opportunity'
    dyn_text = `📈 MARCHÉ EN FORTE CROISSANCE — RENFORCER AVEC PRUDENCE — Croissance ${cagr.toFixed(1)}%/an. Part ${sw.toFixed(1)}% proche du seuil de concentration ${params.seuil_part_elevee}%. Accompagner la croissance sans dépasser le seuil.`
    reco.push({ priority: '🟢', text: `OPPORTUNITÉ — Accompagner la croissance ${cagr.toFixed(1)}%/an avec prudence` })
  } else if (cagr > params.seuil_croissance_elevee) {
    dyn_classe = 'success'
    dyn_text = `📈 MARCHÉ EN CROISSANCE — Atlantic Re bien positionnée. Maintenir la présence, suivre la pénétration réelle.`
  } else if (cagr < 2 && ulr > params.seuil_ulr_risque) {
    dyn_classe = 'danger'
    dyn_text = `📉 DOUBLE SIGNAL NÉGATIF — Stagnation (${cagr.toFixed(1)}%/an) + sinistralité élevée (ULR ${ulr.toFixed(1)}%). RECOMMANDATION : réduire progressivement l'exposition.`
    reco.push({ priority: '🔴', text: `URGENT — Réduire progressivement : stagnation + sinistralité élevée` })
  }
  diags.push({ section: '4 — Dynamique du Marché', classe: dyn_classe, text: dyn_text })

  // Section 5 — Branches
  const has_absentes = branches_absentes.length > 0
  const has_no_vie = !branches_presentes.includes('VIE') && vie > 0
  if (has_absentes || has_no_vie) {
    let txt = ''
    if (has_absentes) {
      txt += `🌱 BRANCHES NON EXPLOITÉES — Atlantic Re est absente de ${branches_absentes.length} branche(s) : ${branches_absentes.join(', ')}. Opportunités d'expansion à évaluer.`
      reco.push({ priority: '🔵', text: `À SURVEILLER — Branches non exploitées : ${branches_absentes.join(', ')}` })
    }
    if (has_no_vie) {
      txt += `${txt ? '\n\n' : ''}💡 Marché Vie ${formatMAD(vie)} sans présence Atlantic Re — opportunité à évaluer.`
      reco.push({ priority: '🟢', text: `OPPORTUNITÉ — Explorer la branche Vie : marché ${formatMAD(vie)}, aucune affaire` })
    }
    diags.push({ section: '5 — Opportunités par Branche', classe: 'info', text: txt })
  }

  // Section 6 — Recommandations
  const priorities = ['🔴', '🟡', '🟢', '🔵']
  const sorted_reco = [...reco].sort((a, b) => priorities.indexOf(a.priority) - priorities.indexOf(b.priority))
  const reco_text = sorted_reco.length > 0
    ? sorted_reco.map(r => `${r.priority} ${r.text}`).join('\n')
    : `✅ Aucune action urgente. Présence équilibrée dans ce marché.`
  diags.push({ section: '6 — Recommandations Stratégiques', classe: sorted_reco.some(r => r.priority === '🔴') ? 'danger' : sorted_reco.some(r => r.priority === '🟡') ? 'warning' : 'success', text: reco_text })

  return diags
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AnalyseSynergiePays() {
  const navigate = useNavigate()
  const { pays: paysParam } = useParams<{ pays: string }>()
  const pays = decodeURIComponent(paysParam || '')

  const [rate, setRate] = useState(9.5)
  const [selectedYear, setSelectedYear] = useState('2024')

  // ── Vie / Non-Vie filter ─────────────────────────────────────────────────────
  const [filterVie, setFilterVie] = useState(false)
  const [filterNonVie, setFilterNonVie] = useState(false)
  const activeFilter: 'all' | 'vie' | 'nonvie' =
    filterVie === filterNonVie ? 'all' : filterVie ? 'vie' : 'nonvie'

  const [kpis, setKpis] = useState<PaysKPIs | null>(null)
  const [evolution, setEvolution] = useState<EvolutionRow[]>([])
  const [rapport, setRapport] = useState<Rapport | null>(null)
  const [tableauCed, setTableauCed] = useState<TableauCedanteRow[]>([])

  const [loadingKpis, setLoadingKpis] = useState(true)
  const [loadingEvo, setLoadingEvo] = useState(false)
  const [loadingRapport, setLoadingRapport] = useState(true)
  const [loadingCed, setLoadingCed] = useState(false)
  // Track which deferred tabs have been loaded
  const [evoLoaded, setEvoLoaded] = useState(false)
  const [cedLoaded, setCedLoaded] = useState(false)

  const [paramsOpen, setParamsOpen] = useState(false)
  const [rapportParams, setRapportParams] = useState<RapportParams>({ ...DEFAULT_PARAMS })

  const [evoMetric, setEvoMetric] = useState('primes_marche')

  const [sortCed, setSortCed] = useState({ col: 'written_premium', dir: 'desc' as 'asc' | 'desc' })
  const [searchCed, setSearchCed] = useState('')
  const [pageCed, setPageCed] = useState(1)
  const PAGE_SIZE = 20

  // Scroll to top on mount
  useEffect(() => {
    document.getElementById('scar-main-scroll')?.scrollTo({ top: 0, behavior: 'instant' })
  }, [pays])

  // ── Tab navigation ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<PaysTabId>('kpis')
  const currentTabIdx = PAYS_TABS.findIndex(t => t.id === activeTab)
  const goPrev = () => { if (currentTabIdx > 0) setActiveTab(PAYS_TABS[currentTabIdx - 1].id) }
  const goNext = () => { if (currentTabIdx < PAYS_TABS.length - 1) setActiveTab(PAYS_TABS[currentTabIdx + 1].id) }



  // Load rate
  useEffect(() => {
    api.get('/synergie/settings').then(r => setRate(r.data.usd_to_mad)).catch(() => { })
  }, [])

  // Load primary data: KPIs + rapport in parallel (fast — single DB query each)
  const loadData = useCallback(() => {
    if (!pays) return
    const p = { year: selectedYear, usd_to_mad: rate }

    setLoadingKpis(true)
    setLoadingRapport(true)
    // Reset deferred states so they reload for new year/pays
    setEvoLoaded(false)
    setCedLoaded(false)
    setEvolution([])
    setTableauCed([])

    Promise.all([
      api.get(`/synergie/pays/${encodeURIComponent(pays)}/kpis`, { params: p }),
      api.get(`/synergie/pays/${encodeURIComponent(pays)}/rapport`, { params: p }),
    ]).then(([kpisRes, rapportRes]) => {
      setKpis(kpisRes.data)
      setRapport(rapportRes.data)
    }).finally(() => {
      setLoadingKpis(false)
      setLoadingRapport(false)
    })
  }, [pays, selectedYear, rate])

  useEffect(() => { loadData() }, [loadData])

  // Lazy-load evolution when evolution tab is first visited
  useEffect(() => {
    if (activeTab === 'evolution' && !evoLoaded && pays) {
      setLoadingEvo(true)
      api.get(`/synergie/pays/${encodeURIComponent(pays)}/evolution`, { params: { usd_to_mad: rate } })
        .then(r => { setEvolution(r.data); setEvoLoaded(true) })
        .finally(() => setLoadingEvo(false))
    }
  }, [activeTab, evoLoaded, pays, rate])

  // Lazy-load tableau-cedantes when cedantes tab is first visited
  useEffect(() => {
    if (activeTab === 'cedantes' && !cedLoaded && pays) {
      setLoadingCed(true)
      api.get(`/synergie/pays/${encodeURIComponent(pays)}/tableau-cedantes`, { params: { year: selectedYear, usd_to_mad: rate } })
        .then(r => { setTableauCed(r.data); setCedLoaded(true) })
        .finally(() => setLoadingCed(false))
    }
  }, [activeTab, cedLoaded, pays, selectedYear, rate])

  // Build a filtered version of rapport data for diagnostics
  const rapportFiltered = useMemo(() => {
    if (!rapport) return null
    if (activeFilter === 'all') return rapport
    // Override key fields with Vie/Non-Vie splits from kpis
    if (!kpis) return rapport
    if (activeFilter === 'nonvie') {
      return {
        ...rapport,
        share_written_avg: kpis.share_written_avg_nonvie,
        penetration_marche_pct: kpis.penetration_marche_pct_nonvie,
        subject_premium: kpis.subject_premium_nonvie_total,
        written_premium: kpis.written_premium_nonvie_total,
        primes_marche_total_mad: kpis.primes_marche_nonvie_mad,
        primes_nonvie_mad: kpis.primes_marche_nonvie_mad,
        primes_vie_mad: 0,
        // Filter cedantes_detail to only non-vie-having entries
        cedantes_detail: rapport.cedantes_detail.map(c => ({
          ...c,
          subject_premium: c.subject_nonvie ?? c.subject_premium,
          written_premium: c.written_nonvie ?? c.written_premium,
          share_written: c.share_written_avg_nonvie ?? c.share_written_avg,
          share_written_avg: c.share_written_avg_nonvie ?? c.share_written_avg,
          pct_written_vs_pays: 0, // recalculated below
        })),
      }
    }
    // vie
    return {
      ...rapport,
      share_written_avg: kpis.share_written_avg_vie,
      penetration_marche_pct: kpis.penetration_marche_pct_vie,
      subject_premium: kpis.subject_premium_vie_total,
      written_premium: kpis.written_premium_vie_total,
      primes_marche_total_mad: kpis.primes_marche_vie_mad,
      primes_nonvie_mad: 0,
      primes_vie_mad: kpis.primes_marche_vie_mad,
      cedantes_detail: rapport.cedantes_detail.map(c => ({
        ...c,
        subject_premium: c.subject_vie ?? c.subject_premium,
        written_premium: c.written_vie ?? c.written_premium,
        share_written: c.share_written_avg_vie ?? c.share_written_avg,
        share_written_avg: c.share_written_avg_vie ?? c.share_written_avg,
        pct_written_vs_pays: 0,
      })),
    }
  }, [rapport, activeFilter, kpis])

  const diagnostics = useMemo(
    () => rapportFiltered ? buildDiagnostics(rapportFiltered, rapportParams) : [],
    [rapportFiltered, rapportParams]
  )

  const evoChartData = useMemo(() => evolution.map(r => ({
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
  })), [evolution])

  const evoNavOptions = [
    { id: 'primes_marche', label: 'Primes de Marché', icon: '📈' },
    { id: 'subject_premium', label: 'Primes Affaires', icon: '📋' },
    { id: 'written_premium', label: 'Primes Atl. Re', icon: '💼' },
    { id: 'share_written', label: 'Part Affaires (%)', icon: '📊' },
    { id: 'penetration_marche', label: 'Pénétration ⭐', icon: '⭐' },
  ]

  // Map sort column to the correct filtered column
  const effectiveSortCol = useMemo(() => {
    if (activeFilter === 'nonvie') {
      if (sortCed.col === 'subject_premium') return 'subject_nonvie'
      if (sortCed.col === 'written_premium') return 'written_nonvie'
      if (sortCed.col === 'share_written_avg') return 'share_written_avg_nonvie'
      if (sortCed.col === 'penetration_marche_pct') return 'penetration_marche_pct_nonvie'
    } else if (activeFilter === 'vie') {
      if (sortCed.col === 'subject_premium') return 'subject_vie'
      if (sortCed.col === 'written_premium') return 'written_vie'
      if (sortCed.col === 'share_written_avg') return 'share_written_avg_vie'
      if (sortCed.col === 'penetration_marche_pct') return 'penetration_marche_pct_vie'
    }
    return sortCed.col
  }, [sortCed.col, activeFilter])

  const sortedCed = useMemo(() => {
    let rows = tableauCed.filter(r => {
      // Filter by search text
      if (searchCed && !r.cedante.toLowerCase().includes(searchCed.toLowerCase())) return false
      // Exclude rows with no activity in the selected segment
      if (activeFilter === 'vie') return (r.written_vie ?? 0) > 0 || (r.subject_vie ?? 0) > 0
      if (activeFilter === 'nonvie') return (r.written_nonvie ?? 0) > 0 || (r.subject_nonvie ?? 0) > 0
      // 'all': keep all rows that have any data
      return true
    })
    rows = [...rows].sort((a, b) => {
      const v = (a as any)[effectiveSortCol] ?? 0
      const w = (b as any)[effectiveSortCol] ?? 0
      return sortCed.dir === 'asc' ? v - w : w - v
    })
    return rows
  }, [tableauCed, sortCed, searchCed, effectiveSortCol, activeFilter])

  const paginatedCed = useMemo(
    () => sortedCed.slice((pageCed - 1) * PAGE_SIZE, pageCed * PAGE_SIZE),
    [sortedCed, pageCed]
  )
  const handleSortCed = (col: string) =>
    setSortCed(s => ({ col, dir: s.col === col && s.dir === 'desc' ? 'asc' : 'desc' }))

  const totalWpCed = useMemo(() =>
    tableauCed.reduce((s, r) =>
      s + (activeFilter === 'nonvie' ? r.written_nonvie : activeFilter === 'vie' ? r.written_vie : r.written_premium),
    0),
  [tableauCed, activeFilter])

  const totalSubjectCed = useMemo(() =>
    tableauCed.reduce((s, r) =>
      s + (activeFilter === 'nonvie' ? r.subject_nonvie : activeFilter === 'vie' ? r.subject_vie : r.subject_premium),
    0),
  [tableauCed, activeFilter])

  const kpiCards = kpis ? [
    {
      label: 'Primes Totales du Marché',
      value: activeFilter === 'vie' ? formatMAD(kpis.primes_marche_vie_mad) : activeFilter === 'nonvie' ? formatMAD(kpis.primes_marche_nonvie_mad) : formatMAD(kpis.primes_marche_total_mad),
      sub: activeFilter === 'vie' ? 'Segment Vie uniquement' : activeFilter === 'nonvie' ? 'Segment Non-Vie uniquement' : `Non-Vie ${formatMAD(kpis.primes_marche_nonvie_mad)} · Vie ${formatMAD(kpis.primes_marche_vie_mad)}`,
      icon: <TrendingUp size={18} style={{ color: GOLD }} />,
    },
    {
      label: 'Primes des Affaires Souscrites',
      value: activeFilter === 'vie' ? formatMAD(kpis.subject_premium_vie_total) : activeFilter === 'nonvie' ? formatMAD(kpis.subject_premium_nonvie_total) : formatMAD(kpis.subject_premium_total),
      sub: activeFilter === 'vie' ? 'Segment Vie uniquement' : activeFilter === 'nonvie' ? 'Segment Non-Vie uniquement' : `Non-Vie ${formatMAD(kpis.subject_premium_nonvie_total)} · Vie ${formatMAD(kpis.subject_premium_vie_total)}`,
      icon: <FileText size={18} style={{ color: GOLD }} />,
    },
    {
      label: 'Primes Totales Atlantic Re',
      value: activeFilter === 'vie' ? formatMAD(kpis.written_premium_vie_total) : activeFilter === 'nonvie' ? formatMAD(kpis.written_premium_nonvie_total) : formatMAD(kpis.written_premium_total),
      sub: activeFilter === 'vie' ? 'Segment Vie uniquement' : activeFilter === 'nonvie' ? 'Segment Non-Vie uniquement' : `Non-Vie ${formatMAD(kpis.written_premium_nonvie_total)} · Vie ${formatMAD(kpis.written_premium_vie_total)}`,
      icon: <Banknote size={18} style={{ color: GOLD }} />,
    },
    {
      label: 'Part sur les Affaires',
      value: `${(activeFilter === 'nonvie' ? (kpis.part_affaires_pct_nonvie ?? kpis.share_written_avg_nonvie) : activeFilter === 'vie' ? (kpis.part_affaires_pct_vie ?? kpis.share_written_avg_vie) : (kpis.part_affaires_pct ?? kpis.share_written_avg)).toFixed(1)}%`,
      sub: activeFilter === 'nonvie' ? 'Primes Atl. Re / Primes Affaires Souscrites (Non-Vie) × 100' : activeFilter === 'vie' ? 'Primes Atl. Re / Primes Affaires Souscrites (Vie) × 100' : 'Primes Atl. Re / Primes Affaires Souscrites × 100',
      icon: <Percent size={18} style={{ color: GOLD }} />,
    },
    {
      label: 'Marchés / Affaires / Cédantes',
      value: `${
        activeFilter === 'nonvie' ? kpis.nb_affaires_nonvie
        : activeFilter === 'vie' ? kpis.nb_affaires_vie
        : kpis.nb_affaires
      } aff. · ${
        activeFilter === 'nonvie' ? kpis.nb_cedantes_nonvie
        : activeFilter === 'vie' ? kpis.nb_cedantes_vie
        : kpis.nb_cedantes
      } céd.`,
      sub: `ULR moyen${activeFilter !== 'all' ? ` (${activeFilter === 'vie' ? 'Vie' : 'Non-Vie'})` : ''} : ${(
        activeFilter === 'nonvie' ? kpis.ulr_moyen_nonvie
        : activeFilter === 'vie' ? kpis.ulr_moyen_vie
        : kpis.ulr_moyen
      ).toFixed(1)}%`,
      icon: <Globe size={18} style={{ color: GOLD }} />,
    },
    {
      label: 'Pénétration Réelle sur le Marché',
      value: `${(activeFilter === 'nonvie' ? kpis.penetration_marche_pct_nonvie : activeFilter === 'vie' ? kpis.penetration_marche_pct_vie : kpis.penetration_marche_pct).toFixed(3)}%`,
      sub: activeFilter === 'nonvie' ? '= Primes Atl. Re (NV) / Primes Totales Marché (NV) × 100' : activeFilter === 'vie' ? '= Primes Atl. Re (Vie) / Primes Totales Marché (Vie) × 100' : PENETRATION_TOOLTIP,
      icon: <Target size={18} style={{ color: 'white' }} />,
      highlighted: true,
    },
  ] : []

  const sectionStyle = (classe: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      danger: { background: 'hsla(358,66%,54%,0.07)', borderLeft: '4px solid hsl(358,66%,54%)' },
      warning: { background: 'hsla(30,88%,56%,0.07)', borderLeft: '4px solid hsl(30,88%,56%)' },
      success: { background: 'hsla(152,56%,39%,0.07)', borderLeft: '4px solid hsl(152,56%,39%)' },
      opportunity: { background: 'hsla(43,96%,48%,0.07)', borderLeft: `4px solid ${GOLD}` },
      info: { background: 'hsla(209,35%,16%,0.05)', borderLeft: '4px solid hsl(209,35%,40%)' },
    }
    return map[classe] || map.info
  }

  if (!pays) return null

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220,20%,97%)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <section>
            <div
              className="bg-white rounded-xl px-7 py-5 flex items-start justify-between gap-4 flex-wrap"
              style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
            >
              <div className="space-y-1.5 w-full">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {pays}
                  </h1>
                  <button
                    onClick={() => navigate('/analyse-synergie')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 hover:shadow-sm"
                    style={{
                      background: 'hsl(0,0%,97%)',
                      color: '#374151',
                      border: '1px solid hsl(0,0%,86%)',
                    }}
                  >
                    <span style={{ fontSize: 14 }}>←</span>
                    <span className="hidden sm:inline">Analyse Synergique</span>
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {kpis && (
                      <>
                        <span className="badge-gold">
                          {activeFilter === 'nonvie' ? kpis.nb_affaires_nonvie
                            : activeFilter === 'vie' ? kpis.nb_affaires_vie
                            : kpis.nb_affaires} affaire{(
                            activeFilter === 'nonvie' ? kpis.nb_affaires_nonvie
                            : activeFilter === 'vie' ? kpis.nb_affaires_vie
                            : kpis.nb_affaires
                          ) > 1 ? 's' : ''}
                          {activeFilter !== 'all' && <em style={{ fontWeight: 400, marginLeft: 4 }}>({activeFilter === 'vie' ? 'Vie' : 'NV'})</em>}
                        </span>
                        <span className="badge-gold">
                          {activeFilter === 'nonvie' ? kpis.nb_cedantes_nonvie
                            : activeFilter === 'vie' ? kpis.nb_cedantes_vie
                            : kpis.nb_cedantes} cédante{(
                            activeFilter === 'nonvie' ? kpis.nb_cedantes_nonvie
                            : activeFilter === 'vie' ? kpis.nb_cedantes_vie
                            : kpis.nb_cedantes
                          ) > 1 ? 's' : ''}
                          {activeFilter !== 'all' && <em style={{ fontWeight: 400, marginLeft: 4 }}>({activeFilter === 'vie' ? 'Vie' : 'NV'})</em>}
                        </span>
                        <span style={{ background: ulrColor(
                          activeFilter === 'nonvie' ? kpis.ulr_moyen_nonvie
                          : activeFilter === 'vie' ? kpis.ulr_moyen_vie
                          : kpis.ulr_moyen
                        ), color: 'white', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
                          ULR: {(
                            activeFilter === 'nonvie' ? kpis.ulr_moyen_nonvie
                            : activeFilter === 'vie' ? kpis.ulr_moyen_vie
                            : kpis.ulr_moyen
                          ).toFixed(1)}%
                          {activeFilter !== 'all' && <em style={{ fontWeight: 400, marginLeft: 4 }}>({activeFilter === 'vie' ? 'Vie' : 'NV'})</em>}
                        </span>
                        <span className="badge-gold" title={PART_AFFAIRES_TOOLTIP}>
                          Part affaires: {(
                            activeFilter === 'nonvie' ? (kpis.part_affaires_pct_nonvie ?? kpis.share_written_avg_nonvie)
                            : activeFilter === 'vie' ? (kpis.part_affaires_pct_vie ?? kpis.share_written_avg_vie)
                            : (kpis.part_affaires_pct ?? kpis.share_written_avg)
                          ).toFixed(1)}%
                          {activeFilter !== 'all' && <em style={{ fontWeight: 400, marginLeft: 4 }}>({activeFilter === 'vie' ? 'Vie' : 'NV'})</em>}
                        </span>
                        <span style={{ background: GOLD, color: 'white', borderRadius: 6, padding: '4px 10px', fontWeight: 700, fontSize: 13 }} title={PENETRATION_TOOLTIP}>
                          ⭐ Pénétration réelle: {(
                            activeFilter === 'nonvie' ? kpis.penetration_marche_pct_nonvie
                            : activeFilter === 'vie' ? kpis.penetration_marche_pct_vie
                            : kpis.penetration_marche_pct
                          ).toFixed(3)}%
                          {activeFilter !== 'all' && <em style={{ fontWeight: 400, marginLeft: 4 }}>({activeFilter === 'vie' ? 'Vie' : 'NV'})</em>}
                        </span>
                      </>
                    )}
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
        </div>

        {/* ── Year Selector ─────────────────────────────────────────────── */}
        {kpis && kpis.annees_disponibles.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Année :</span>
            {kpis.annees_disponibles.map(y => (
              <button key={y} onClick={() => setSelectedYear(String(y))}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: selectedYear === String(y) ? `linear-gradient(135deg, ${GOLD}, ${AMBER})` : 'white',
                  color: selectedYear === String(y) ? 'white' : GOLD_DARK,
                  border: `1px solid ${selectedYear === String(y) ? 'transparent' : GOLD}`,
                }}>
                {y}
              </button>
            ))}
            <button onClick={() => setSelectedYear('moyenne')}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: selectedYear === 'moyenne' ? `linear-gradient(135deg, ${GOLD}, ${AMBER})` : 'white',
                color: selectedYear === 'moyenne' ? 'white' : GOLD_DARK,
                border: `1px solid ${selectedYear === 'moyenne' ? 'transparent' : GOLD}`,
              }}>
              Moyenne
            </button>
          </div>
        )}

        {/* ── Tab Navigation ───────────────────────────────────────────────── */}
        <PaysTabNav activeTab={activeTab} onTabChange={setActiveTab} />
        <PaysTabProgress activeTab={activeTab} />

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
                  <h2 className="text-lg font-bold text-gray-800 mb-5">Indicateurs Clés</h2>
                  {loadingKpis ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {kpiCards.map((card, i) => (
                        <div key={i} className={card.highlighted ? 'kpi-gold-highlighted' : 'kpi-gold'} style={{ position: 'relative' }}>
                          {card.highlighted && (
                            <span style={{ position: 'absolute', top: 10, right: 10, background: `linear-gradient(135deg, ${GOLD}, ${AMBER})`, color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>⭐ Clé</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: card.highlighted ? `linear-gradient(135deg, ${GOLD}, ${AMBER})` : `hsla(43,96%,48%,0.12)` }}>
                              {card.icon}
                            </div>
                            <div>
                              <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 3 }}>{card.label}</p>
                              <p style={{ fontSize: 18, fontWeight: 800, color: card.highlighted ? GOLD : GOLD_DARK, lineHeight: 1.1 }}>{card.value}</p>
                              <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 3, lineHeight: 1.4 }}>{card.sub}</p>
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

          {/* ── Évolution ────────────────────────────────────────────────── */}
          {activeTab === 'evolution' && (
            <div className="space-y-5 animate-fade-in">
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid hsl(0,0%,95%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937' }}>Évolution — {pays}</h2>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {evoNavOptions.map(opt => (
                      <button key={opt.id} onClick={() => setEvoMetric(opt.id)}
                        style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: evoMetric === opt.id ? `linear-gradient(135deg, ${GOLD}, ${AMBER})` : 'white', color: evoMetric === opt.id ? 'white' : GOLD_DARK, border: `1px solid ${evoMetric === opt.id ? 'transparent' : GOLD}` }}>
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ padding: 18, height: 340 }}>
                  {loadingEvo ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spinner /></div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {evoMetric === 'primes_marche' ? (
                        <ComposedChart data={evoChartData} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={v => formatMAD(v)} tick={{ fontSize: 11 }} width={90} />
                          <Tooltip content={<GoldTooltip formatter={formatMAD} />} />
                          {activeFilter !== 'vie' && <Bar dataKey="nonvie" stackId="a" fill={GOLD_DARK} name="Non-Vie" />}
                          {activeFilter !== 'nonvie' && <Bar dataKey="vie" stackId="a" fill={GOLD_LIGHT} name="Vie" />}
                          {activeFilter === 'all' && <Line dataKey="total" stroke={AMBER} strokeWidth={2} dot={{ r: 3 }} name="Total" />}
                        </ComposedChart>
                      ) : evoMetric === 'subject_premium' ? (
                        <ComposedChart data={evoChartData} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={v => formatMAD(v)} tick={{ fontSize: 11 }} width={90} />
                          <Tooltip content={<GoldTooltip formatter={formatMAD} />} />
                          {activeFilter !== 'vie' && <Bar dataKey="subject_nonvie" stackId="a" fill={GOLD_DARK} name="Non-Vie" />}
                          {activeFilter !== 'nonvie' && <Bar dataKey="subject_vie" stackId="a" fill={GOLD_LIGHT} name="Vie" />}
                          {activeFilter === 'all' && <Line dataKey="subject" stroke={AMBER} strokeWidth={2} dot={{ r: 3 }} name="Total" />}
                        </ComposedChart>
                      ) : evoMetric === 'written_premium' ? (
                        <ComposedChart data={evoChartData} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={v => formatMAD(v)} tick={{ fontSize: 11 }} width={90} />
                          <Tooltip content={<GoldTooltip formatter={formatMAD} />} />
                          {activeFilter !== 'vie' && <Bar dataKey="written_nonvie" stackId="a" fill={GOLD_DARK} name="Non-Vie" />}
                          {activeFilter !== 'nonvie' && <Bar dataKey="written_vie" stackId="a" fill={GOLD_LIGHT} name="Vie" />}
                          {activeFilter === 'all' && <Line dataKey="written" stroke={AMBER} strokeWidth={2} dot={{ r: 3 }} name="Total" />}
                        </ComposedChart>
                      ) : evoMetric === 'penetration_marche' ? (
                        <AreaChart data={evoChartData} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={(v: number) => `${v.toFixed(3)}%`} tick={{ fontSize: 11 }} width={55} />
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
                          <YAxis tickFormatter={(v: number) => `${v.toFixed(1)}%`} tick={{ fontSize: 11 }} width={55} />
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
                </div>
              </div>
            </div>
          )}

          {/* ── Rapport de Recommandation ────────────────────────────────── */}
          {activeTab === 'rapport' && (
            <div className="space-y-5 animate-fade-in">
              <div style={{ background: 'white', borderRadius: 16, border: `1px solid hsla(43,96%,48%,0.3)`, boxShadow: `0 4px 20px hsla(43,96%,48%,0.08)`, overflow: 'hidden' }}>
                {/* Header du rapport */}
                <div style={{ padding: '16px 20px', background: `linear-gradient(135deg, ${GOLD}, ${AMBER})`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>📋 Rapport de Recommandation</h2>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{pays} — Analyse synergique Axe 1 × Axe 2</p>
                  </div>
                  <button onClick={() => setParamsOpen(o => !o)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 8, padding: '6px 12px', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    ⚙ Paramètres {paramsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Panneau paramètres */}
                {paramsOpen && (
                  <div style={{ padding: '16px 20px', background: `hsla(43,96%,48%,0.04)`, borderBottom: `1px solid hsla(43,96%,48%,0.15)` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                      {Object.entries(rapportParams).map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {PARAM_LABELS[key as keyof RapportParams] || key.replace(/_/g, ' ')}
                          </label>
                          <input
                            type="number"
                            value={val}
                            onChange={e => setRapportParams(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                            style={{ padding: '5px 8px', border: `1px solid ${GOLD}`, borderRadius: 6, fontSize: 13, width: '100%', outline: 'none' }}
                          />
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setRapportParams({ ...DEFAULT_PARAMS })}
                      style={{ marginTop: 12, padding: '5px 14px', background: 'white', border: `1px solid ${GOLD}`, borderRadius: 6, color: GOLD_DARK, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Réinitialiser
                    </button>
                  </div>
                )}

                {/* Corps du rapport */}
                <div style={{ padding: 20 }}>
                  {loadingRapport ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
                  ) : rapport && diagnostics.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {diagnostics.map((d, i) => (
                        <div key={i} className={`rapport-section rapport-section-${d.classe}`}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                            Section {d.section}
                          </p>
                          {d.text.split('\n').map((line, j) => (
                            <p key={j} style={{ fontSize: 14, color: '#1f2937', lineHeight: 1.6, marginBottom: j < d.text.split('\n').length - 1 ? 6 : 0 }}>{line}</p>
                          ))}
                        </div>
                      ))}

                      {/* Données source du rapport */}
                      {rapport.cedantes_detail.length > 0 && (
                        <div style={{ marginTop: 8, padding: '14px 18px', borderRadius: 10, background: `hsla(43,96%,48%,0.04)`, border: `1px solid hsla(43,96%,48%,0.15)` }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: GOLD_DARK, marginBottom: 10 }}>
                            Données sources — CAGR marché: {rapport.croissance_marche_cagr.toFixed(1)}%/an · CAGR Atlantic Re: {rapport.croissance_written_cagr.toFixed(1)}%/an
                          </p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            {rapport.branches_presentes.map(b => (
                              <span key={b} style={{ background: `hsla(43,96%,48%,0.10)`, color: GOLD_DARK, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{b}</span>
                            ))}
                          </div>
                          {rapport.branches_absentes.length > 0 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Branches absentes :</span>
                              {rapport.branches_absentes.map(b => (
                                <span key={b} style={{ background: 'hsl(0,0%,95%)', color: '#6b7280', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>{b}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: '#9ca3af', textAlign: 'center', padding: 24 }}>Aucune donnée disponible pour ce pays/cette année.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Détail par Cédante ───────────────────────────────────────── */}
          {activeTab === 'cedantes' && (
            <div className="space-y-5 animate-fade-in">
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid hsl(0,0%,95%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937' }}>Détail par Cédante — {pays}</h2>
                  <input placeholder="Rechercher une cédante…" value={searchCed}
                    onChange={e => { setSearchCed(e.target.value); setPageCed(1) }}
                    style={{ padding: '6px 12px', border: `1px solid ${GOLD}`, borderRadius: 6, fontSize: 13, outline: 'none', width: 220 }} />
                </div>
                {loadingCed ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
                ) : sortedCed.length === 0 ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>
                      {activeFilter === 'vie' ? '🚫 Aucune affaire Vie pour ce pays.' :
                       activeFilter === 'nonvie' ? '🚫 Aucune affaire Non-Vie pour ce pays.' :
                       '🚫 Aucune affaire disponible pour ce pays.'}
                    </p>
                    <p style={{ fontSize: 13, color: '#d1d5db' }}>
                      {searchCed ? 'Essayez une autre recherche ou modifiez votre filtre.' : 'Aucune cédante active sur ce marché pour la période sélectionnée.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'hsl(0,0%,97%)', borderBottom: '2px solid hsl(0,0%,92%)' }}>
                            <SortHeader label="Cédante" col="cedante" sortCol={sortCed.col} sortDir={sortCed.dir} onSort={handleSortCed} />
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
                            <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap cursor-pointer select-none"
                              style={{ color: sortCed.col === 'penetration_marche_pct' ? GOLD : '#6b7280' }}
                              onClick={() => handleSortCed('penetration_marche_pct')} title={PENETRATION_TOOLTIP}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                ⭐ Pénétration Réelle %
                                {sortCed.col === 'penetration_marche_pct' && (sortCed.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                              </span>
                            </th>
                            <SortHeader label="ULR" col="ulr_moyen" sortCol={sortCed.col} sortDir={sortCed.dir} onSort={handleSortCed} />
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">% du Pays</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedCed.map((row, i) => (
                            <tr key={`${row.cedante}-${i}`} style={{ borderBottom: '1px solid hsl(0,0%,95%)', background: i % 2 === 0 ? 'white' : 'hsl(0,0%,98.5%)' }}>
                              <td className="px-3 py-2.5" style={{ fontWeight: 600, color: '#1f2937', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.cedante}</td>
                              <td className="px-3 py-2.5 text-gray-500">{row.nb_affaires}</td>
                              <td className="px-3 py-2.5">
                                {formatMAD(activeFilter === 'vie' ? row.subject_vie : activeFilter === 'nonvie' ? row.subject_nonvie : row.subject_premium)}
                              </td>
                              <td className="px-3 py-2.5" style={{ fontWeight: 600, color: GOLD_DARK }}>
                                {formatMAD(activeFilter === 'vie' ? row.written_vie : activeFilter === 'nonvie' ? row.written_nonvie : row.written_premium)}
                              </td>
                              <td className="px-3 py-2.5">
                                {(activeFilter === 'nonvie' ? row.part_affaires_pct_nonvie : activeFilter === 'vie' ? row.part_affaires_pct_vie : row.part_affaires_pct).toFixed(1)}%
                              </td>
                              <td className="px-3 py-2.5" style={{ fontWeight: 700, color: GOLD }} title={PENETRATION_TOOLTIP}>
                                {(activeFilter === 'nonvie' ? row.penetration_marche_pct_nonvie : activeFilter === 'vie' ? row.penetration_marche_pct_vie : row.penetration_marche_pct).toFixed(3)}%
                              </td>
                              <td className="px-3 py-2.5" style={{ fontWeight: 600, color: ulrColor(row.ulr_moyen) }}>{row.ulr_moyen.toFixed(1)}%</td>
                              <td className="px-3 py-2.5">
                                {(() => {
                                  const wpFiltered = activeFilter === 'nonvie' ? row.written_nonvie : activeFilter === 'vie' ? row.written_vie : row.written_premium
                                  const pct = totalWpCed > 0 ? (wpFiltered / totalWpCed) * 100 : 0
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div className="progress-gold" style={{ width: 80, flexShrink: 0 }}>
                                        <div className="progress-gold-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                                      </div>
                                      <span style={{ fontSize: 12, fontWeight: 600, color: GOLD_DARK }}>
                                        {pct.toFixed(1)}%
                                      </span>
                                    </div>
                                  )
                                })()}
                              </td>
                            </tr>
                          ))}
                          {/* Ligne total */}
                          {sortedCed.length > 0 && (
                            <tr style={{ background: `hsla(43,96%,48%,0.08)`, borderTop: `2px solid ${GOLD}` }}>
                              <td className="px-3 py-2.5" style={{ fontWeight: 700, color: GOLD_DARK }}>TOTAL</td>
                              <td className="px-3 py-2.5" style={{ fontWeight: 700, color: GOLD_DARK }}>{sortedCed.reduce((s, r) => s + r.nb_affaires, 0)}</td>
                              <td className="px-3 py-2.5" style={{ fontWeight: 700, color: GOLD_DARK }}>{formatMAD(totalSubjectCed)}</td>
                              <td className="px-3 py-2.5" style={{ fontWeight: 700, color: GOLD_DARK }}>{formatMAD(totalWpCed)}</td>
                              <td colSpan={4} />
                            </tr>
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
            <span>{currentTabIdx > 0 ? PAYS_TABS[currentTabIdx - 1].label : '—'}</span>
          </button>
          <span className="text-xs text-gray-400 font-medium">{currentTabIdx + 1} / {PAYS_TABS.length}</span>
          <button
            onClick={goNext}
            disabled={currentTabIdx === PAYS_TABS.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={currentTabIdx === PAYS_TABS.length - 1
              ? { background: 'hsl(0,0%,96%)', color: '#d1d5db', cursor: 'not-allowed' }
              : { background: 'hsl(35,88%,38%)', color: 'white', cursor: 'pointer' }}
          >
            <span>{currentTabIdx < PAYS_TABS.length - 1 ? PAYS_TABS[currentTabIdx + 1].label : '—'}</span>
            <span>→</span>
          </button>
        </div>

      </div>
    </div>
  )
}

