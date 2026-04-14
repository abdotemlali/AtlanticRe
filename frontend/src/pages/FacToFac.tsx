import React, { useState, useEffect, useCallback, useMemo } from 'react'
import * as XLSX from 'xlsx'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
  ScatterChart, Scatter, ZAxis, Cell, ReferenceLine,
} from 'recharts'
import {
  DollarSign, TrendingUp, Users, Percent, BarChart2, Shuffle,
  ArrowUp, ArrowDown, ArrowUpDown, Download,
} from 'lucide-react'

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  navy:        'hsl(209,35%,16%)',
  olive:       'hsl(83,52%,36%)',
  oliveLight:  'hsl(83,50%,55%)',
  orange:      'hsl(28,88%,55%)',
  red:         'hsl(358,66%,54%)',
  blue:        'hsl(209,60%,55%)',
  green:       'hsl(145,55%,42%)',
  amber:       'hsl(38,95%,54%)',
  gray:        'hsl(218,14%,65%)',
  border:      'hsl(218,22%,92%)',
}

const CHART_COLORS = [
  '#4E6820','#E67E22','#3498DB','#9B59B6','#1ABC9C',
  '#E74C3C','#F1C40F','#2C3E50','#16A085','#8E44AD',
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtMAD = (v: number) => {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} Md`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)} K`
  return v.toLocaleString('fr-FR')
}

const buildQuery = (f: FacFilters) => {
  const p: Record<string, string> = {}
  if (f.uy.length)       p.uy = f.uy.join(',')
  if (f.lob)             p.lob = f.lob
  if (f.branche)         p.branche = f.branche
  if (f.type_contrat)    p.type_contrat = f.type_contrat
  return p
}

// evolution-primes : ignore uy
const buildQueryNoUY = (f: FacFilters) => {
  const p: Record<string, string> = {}
  if (f.lob)          p.lob = f.lob
  if (f.branche)      p.branche = f.branche
  if (f.type_contrat) p.type_contrat = f.type_contrat
  return p
}

// primes-par-branche / detail-branches : ignore lob et branche
const buildQueryNoBrancheLob = (f: FacFilters) => {
  const p: Record<string, string> = {}
  if (f.uy.length)    p.uy = f.uy.join(',')
  if (f.type_contrat) p.type_contrat = f.type_contrat
  return p
}

// LOB → branches mapping pour la mise en évidence visuelle
const LOB_BRANCHES: Record<string, string[]> = {
  INCENDIE:  ['INCENDIE', 'PROPERTY', 'RESPONSABILITE CIVILE', 'AUTOMOBILE', 'RISQUES DIVERS', 'MULTI-BRANCHES', 'CREDIT CAUTION'],
  VIE:       ['VIE', 'MALADIE', 'ACCIDENTS CORPORELS'],
  TECHNIQUE: ['CONSTRUCTION', 'ENGINEERING', 'ENERGIE'],
  TRANSPORT: ['AVIATION', 'MARITIME-TRANSPORT'],
  MARITIME:  ['CORPS DE NAVIRE', 'MARITIME-TRANSPORT'],
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface FacFilters {
  uy: number[]
  lob: string | null
  branche: string | null
  type_contrat: string | null
}

interface FacOptions {
  uy_list: number[]
  lobs: string[]
  branches: string[]
  types_contrat: string[]
}

interface FacKpis {
  engagement_total: number
  prime_partenaire_total: number
  part_partenaire_moyen: number
  prime_atlantic_re_total: number
  nb_partenaires: number
}

interface EvolutionItem  { year: number; prime_partenaire: number; engagement_partenaire: number; nb_contrats: number }
interface BrancheItem    { branche: string; prime_partenaire: number; nb_contrats: number }
interface DetailBranche  { branche: string; nb_contrats: number; written_premium: number; prime_partenaire: number; engagement_partenaire: number; part_partenaire_moy: number }
interface TopPrime       { participant_name: string; prime_partenaire: number }
interface TopEngagement  { participant_name: string; engagement_partenaire: number }
interface TauxPartItem   { participant_name: string; part_moy: number; nb_contrats: number }
interface Partenaire     { security_name: string; nb_contrats: number; prime_partenaire: number; engagement_partenaire: number; part_partenaire_moy: number; role: string; role_donneur: boolean; prime_donnee: number | null; nb_contrats_donnes: number }
interface CrossingItem   { company_name: string; prime_donnee: number; prime_recue: number; nb_contrats_donnes: number; nb_contrats_recus: number; engagement_total: number }

// ── Sub-components ────────────────────────────────────────────────────────────
function Card({ style, children }: { style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'white', borderRadius: 14, padding: 20,
      border: `1px solid ${C.border}`,
      boxShadow: '0 2px 12px hsla(209,28%,14%,0.06)',
      ...style,
    }}>
      {children}
    </div>
  )
}

function KPICard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub?: string; color: string; icon: React.ElementType
}) {
  return (
    <Card style={{ flex: 1, minWidth: 170, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={color} />
        </div>
        <span style={{ fontSize: '0.75rem', color: C.gray, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: C.navy }}>{value}</div>
      {sub && <div style={{ fontSize: '0.71rem', color: C.gray, marginTop: 2 }}>{sub}</div>}
    </Card>
  )
}

// ── Tab button ────────────────────────────────────────────────────────────────
function TabBtn({ id, label, active, onClick }: { id: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 24px', borderRadius: '10px 10px 0 0', fontSize: '0.82rem', fontWeight: 700,
      background: active ? 'white' : 'transparent',
      color: active ? C.olive : C.gray,
      border: active ? `1px solid ${C.border}` : '1px solid transparent',
      borderBottom: active ? '2px solid white' : 'none',
      cursor: 'pointer', marginBottom: -1,
    }}>{label}</button>
  )
}

// ── Scatter tooltip ───────────────────────────────────────────────────────────
function CrossingTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as CrossingItem
  return (
    <div style={{
      background: 'white', borderRadius: 10, padding: '12px 16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: `2px solid ${C.olive}`,
      minWidth: 240,
    }}>
      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: C.navy, marginBottom: 8 }}>{d.company_name}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 16px', fontSize: '0.74rem' }}>
        <span style={{ color: C.gray }}>Prime Donnée à Atlantic Re</span>
        <span style={{ fontWeight: 700, color: C.blue, textAlign: 'right' }}>{fmtMAD(d.prime_donnee)} MAD</span>
        <span style={{ color: C.gray }}>Prime Reçue d'Atlantic Re</span>
        <span style={{ fontWeight: 700, color: C.olive, textAlign: 'right' }}>{fmtMAD(d.prime_recue)} MAD</span>
        <span style={{ color: C.gray }}>Engagement Total</span>
        <span style={{ fontWeight: 700, color: C.navy, textAlign: 'right' }}>{fmtMAD(d.engagement_total)} MAD</span>
        <div style={{ gridColumn: '1/-1', borderTop: `1px solid ${C.border}`, margin: '4px 0' }} />
        <span style={{ color: C.gray }}>Contrats donnés</span>
        <span style={{ fontWeight: 600, textAlign: 'right' }}>{d.nb_contrats_donnes}</span>
        <span style={{ color: C.gray }}>Contrats reçus</span>
        <span style={{ fontWeight: 600, textAlign: 'right' }}>{d.nb_contrats_recus}</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function FacToFac() {
  const [tab, setTab] = useState<'global' | 'partenaire'>('global')
  const [filters, setFilters] = useState<FacFilters>({ uy: [], lob: null, branche: null, type_contrat: null })
  const [options, setOptions] = useState<FacOptions | null>(null)
  const [kpis, setKpis] = useState<FacKpis | null>(null)
  const [evolution, setEvolution] = useState<EvolutionItem[]>([])
  const [branchesData, setBranchesData] = useState<BrancheItem[]>([])
  const [detailBranches, setDetailBranches] = useState<DetailBranche[]>([])
  const [topPrimes, setTopPrimes] = useState<TopPrime[]>([])
  const [topEngagement, setTopEngagement] = useState<TopEngagement[]>([])
  const [tauxPart, setTauxPart] = useState<TauxPartItem[]>([])
  const [partenaires, setPartenaires] = useState<Partenaire[]>([])
  const [crossing, setCrossing] = useState<CrossingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [crossingLoaded, setCrossingLoaded] = useState(false)

  // ── Sort state — Détail par Branche ──────────────────────────────────────
  type BrancheSortKey = keyof DetailBranche
  const [sortByBranche, setSortByBranche] = useState<BrancheSortKey>('prime_partenaire')
  const [sortDescBranche, setSortDescBranche] = useState(true)

  const handleSortBranche = (col: BrancheSortKey) => {
    if (sortByBranche === col) setSortDescBranche(d => !d)
    else { setSortByBranche(col); setSortDescBranche(true) }
  }

  const SortIconBranche = ({ col }: { col: BrancheSortKey }) => {
    if (sortByBranche !== col) return <ArrowUpDown size={10} style={{ opacity: 0.3, marginLeft: 3, flexShrink: 0 }} />
    return sortDescBranche
      ? <ArrowDown size={10} style={{ marginLeft: 3, flexShrink: 0, color: 'hsl(83,50%,55%)' }} />
      : <ArrowUp size={10} style={{ marginLeft: 3, flexShrink: 0, color: 'hsl(83,50%,55%)' }} />
  }

  const sortedDetailBranches = useMemo(() => {
    return [...detailBranches].sort((a, b) => {
      const va = a[sortByBranche] ?? ''
      const vb = b[sortByBranche] ?? ''
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'fr')
      return sortDescBranche ? -cmp : cmp
    })
  }, [detailBranches, sortByBranche, sortDescBranche])

  // ── Sort state — Tableau des Partenaires ─────────────────────────────────
  type PartSortKey = keyof Partenaire
  const [sortByPart, setSortByPart] = useState<PartSortKey>('prime_partenaire')
  const [sortDescPart, setSortDescPart] = useState(true)

  const handleSortPart = (col: PartSortKey) => {
    if (sortByPart === col) setSortDescPart(d => !d)
    else { setSortByPart(col); setSortDescPart(true) }
  }

  const SortIconPart = ({ col }: { col: PartSortKey }) => {
    if (sortByPart !== col) return <ArrowUpDown size={10} style={{ opacity: 0.3, marginLeft: 3, flexShrink: 0 }} />
    return sortDescPart
      ? <ArrowDown size={10} style={{ marginLeft: 3, flexShrink: 0, color: 'hsl(83,50%,55%)' }} />
      : <ArrowUp size={10} style={{ marginLeft: 3, flexShrink: 0, color: 'hsl(83,50%,55%)' }} />
  }

  const sortedPartenaires = useMemo(() => {
    return [...partenaires].sort((a, b) => {
      const va = a[sortByPart] ?? ''
      const vb = b[sortByPart] ?? ''
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : typeof va === 'boolean' && typeof vb === 'boolean'
          ? Number(va) - Number(vb)
          : String(va).localeCompare(String(vb), 'fr')
      return sortDescPart ? -cmp : cmp
    })
  }, [partenaires, sortByPart, sortDescPart])

  // ── Role filter — Tableau des Partenaires ─────────────────────────────────
  const [partRoleFilter, setPartRoleFilter] = useState<'all' | 'double' | 'donneur' | 'preneur'>('all')

  const filteredSortedPartenaires = useMemo(() => {
    if (partRoleFilter === 'all') return sortedPartenaires
    return sortedPartenaires.filter(p => p.role === partRoleFilter)
  }, [sortedPartenaires, partRoleFilter])

  // ── Branch highlight set (for bar chart + table) ─────────────────────────
  const highlightedBranches = useMemo((): Set<string> => {
    if (filters.branche) return new Set([filters.branche])
    if (filters.lob && LOB_BRANCHES[filters.lob]) return new Set(LOB_BRANCHES[filters.lob])
    return new Set()
  }, [filters.branche, filters.lob])

  // ── Excel exports ─────────────────────────────────────────────────────────
  const exportBranchesExcel = () => {
    const wsData = sortedDetailBranches.map(d => ({
      'INT_BRANCHE': d.branche,
      'Nb Contrats': d.nb_contrats,
      'WRITTEN_PREMIUM': d.written_premium,
      'Prime Partenaire': d.prime_partenaire,
      'Engagement Partenaire': d.engagement_partenaire,
      'Part Partenaire Moy (%)': +d.part_partenaire_moy.toFixed(2),
    }))
    const ws = XLSX.utils.json_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Détail Branches')
    XLSX.writeFile(wb, 'fac_to_fac_detail_branches.xlsx')
  }

  const exportPartenairesExcel = () => {
    const wsData = sortedPartenaires.map(p => ({
      'SECURITY_NAME': p.security_name,
      'Nb Contrats': p.nb_contrats,
      'Prime Partenaire': p.prime_partenaire,
      'Engagement Partenaire': p.engagement_partenaire,
      'Part Partenaire Moy (%)': +p.part_partenaire_moy.toFixed(2),
      'Rôle Donneur': p.role_donneur ? 'Oui' : 'Non',
      'Prime Donnée à Atlantic Re': p.role_donneur && p.prime_donnee != null ? p.prime_donnee : '',
    }))
    const ws = XLSX.utils.json_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Partenaires')
    XLSX.writeFile(wb, 'fac_to_fac_partenaires.xlsx')
  }

  // Load filter options once
  useEffect(() => {
    api.get(API_ROUTES.FAC_TO_FAC.OPTIONS).then(r => setOptions(r.data)).catch(console.error)
    // Crossing has no filter — load once
    api.get(API_ROUTES.FAC_TO_FAC.CROSSING).then(r => {
      setCrossing(r.data)
      setCrossingLoaded(true)
    }).catch(console.error)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const p        = buildQuery(filters)
      const pEvol    = buildQueryNoUY(filters)
      const pBranch  = buildQueryNoBrancheLob(filters)
      const [kR, evR, brR, dbR, tpR, teR, tmR, paR] = await Promise.all([
        api.get(API_ROUTES.FAC_TO_FAC.KPIS,                       { params: p       }),
        api.get(API_ROUTES.FAC_TO_FAC.EVOLUTION_PRIMES,           { params: pEvol   }),
        api.get(API_ROUTES.FAC_TO_FAC.PRIMES_PAR_BRANCHE,         { params: pBranch }),
        api.get(API_ROUTES.FAC_TO_FAC.DETAIL_BRANCHES,            { params: pBranch }),
        api.get(API_ROUTES.FAC_TO_FAC.TOP_PARTENAIRES_PRIMES,     { params: p       }),
        api.get(API_ROUTES.FAC_TO_FAC.TOP_PARTENAIRES_ENGAGEMENT, { params: p       }),
        api.get(API_ROUTES.FAC_TO_FAC.TAUX_PART_MOYEN,            { params: p       }),
        api.get(API_ROUTES.FAC_TO_FAC.TABLEAU_PARTENAIRES,        { params: p       }),
      ])
      setKpis(kR.data)
      setEvolution(evR.data)
      setBranchesData(brR.data)
      setDetailBranches(dbR.data)
      setTopPrimes(tpR.data)
      setTopEngagement(teR.data)
      setTauxPart(tmR.data)
      setPartenaires(paR.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { loadData() }, [loadData])

  // Normalize bubble size for scatter (8–40px radius → 64–1600 for ZAxis range)
  const maxEngagement = crossing.reduce((m, d) => Math.max(m, d.engagement_total), 0)
  const crossingWithSize = crossing.map(d => ({
    ...d,
    bubble_size: maxEngagement > 0 ? Math.max(64, (d.engagement_total / maxEngagement) * 1600) : 200,
  }))

  // ── Filter Panel ────────────────────────────────────────────────────────────
  const FilterPanel = () => (
    <div style={{
      display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      padding: '14px 20px', background: 'white', borderRadius: 12,
      border: `1px solid ${C.border}`, marginBottom: 20,
    }}>
      {/* UY multi-select */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: C.gray }}>Année :</span>
        {options && (() => {
          const allSelected = options.uy_list.length > 0 && options.uy_list.every(y => filters.uy.includes(y))
          return (
            <button onClick={() =>
              setFilters(f => ({ ...f, uy: allSelected ? [] : [...options.uy_list] }))
            } style={{
              padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${allSelected ? C.olive : C.border}`,
              background: allSelected ? `${C.olive}18` : 'transparent',
              color: allSelected ? C.olive : C.gray,
            }}>Toutes</button>
          )
        })()}
        {options?.uy_list.map(y => (
          <button key={y} onClick={() =>
            setFilters(f => ({ ...f, uy: f.uy.includes(y) ? f.uy.filter(v => v !== y) : [...f.uy, y] }))
          } style={{
            padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${filters.uy.includes(y) ? C.olive : C.border}`,
            background: filters.uy.includes(y) ? `${C.olive}18` : 'transparent',
            color: filters.uy.includes(y) ? C.olive : C.gray,
          }}>{y}</button>
        ))}
      </div>

      {/* LOB — reset branche quand un LOB est sélectionné */}
      <select value={filters.lob || ''} onChange={e => setFilters(f => ({ ...f, lob: e.target.value || null, branche: null }))}
        style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', border: `1px solid ${C.border}`, color: C.navy }}>
        <option value="">Tous les LOB</option>
        {options?.lobs.map(l => <option key={l} value={l}>{l}</option>)}
      </select>

      {/* Branche — reset LOB quand une branche est sélectionnée */}
      <select value={filters.branche || ''} onChange={e => setFilters(f => ({ ...f, branche: e.target.value || null, lob: null }))}
        style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', border: `1px solid ${C.border}`, color: C.navy }}>
        <option value="">Toutes branches</option>
        {options?.branches.map(b => <option key={b} value={b}>{b}</option>)}
      </select>

      {/* Type contrat */}
      <select value={filters.type_contrat || ''} onChange={e => setFilters(f => ({ ...f, type_contrat: e.target.value || null }))}
        style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', border: `1px solid ${C.border}`, color: C.navy }}>
        <option value="">Tous types</option>
        {options?.types_contrat.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      {/* Reset */}
      <button onClick={() => setFilters({ uy: [], lob: null, branche: null, type_contrat: null })}
        style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, background: '#f1f5f9', color: C.gray, border: 'none', cursor: 'pointer' }}>
        Réinitialiser
      </button>
    </div>
  )

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.olive}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shuffle size={18} color={C.olive} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: C.navy, margin: 0 }}>
            Rétrocession FAC-to-FAC
          </h1>
          <p style={{ fontSize: '0.82rem', color: C.gray, margin: 0 }}>
            Partenaires FAC : primes, engagements et croisement donneurs × preneurs
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginTop: 20, marginBottom: 0 }}>
        <TabBtn id="global"     label="Vue Globale"       active={tab === 'global'}     onClick={() => setTab('global')}     />
        <TabBtn id="partenaire" label="Vue Par Partenaire" active={tab === 'partenaire'} onClick={() => setTab('partenaire')} />
      </div>

      {/* Filter Panel */}
      <FilterPanel />

      {/* KPI Cards — same in both tabs */}
      {kpis && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <KPICard label="Engagement Partenaire Total" value={`${fmtMAD(kpis.engagement_total)} MAD`}         sub="Exposition maximale en capital"       color={C.red}    icon={TrendingUp}  />
          <KPICard label="Prime Partenaire Totale"     value={`${fmtMAD(kpis.prime_partenaire_total)} MAD`}   sub="Prime nette revenant aux partenaires" color={C.olive}  icon={DollarSign}  />
          <KPICard label="Moyenne Part Partenaire"     value={`${kpis.part_partenaire_moyen.toFixed(2)}%`} sub="Quote-part effective moyenne"    color={C.orange} icon={Percent}     />
          <KPICard label="Prime Atlantic Re Totale"    value={`${fmtMAD(kpis.prime_atlantic_re_total)} MAD`} sub="Prime brute souscrite"                color={C.blue}   icon={BarChart2}   />
          <KPICard label="Nombre de Partenaires"       value={`${kpis.nb_partenaires}`}                       sub="Partenaires preneurs distincts"       color={C.navy}   icon={Users}       />
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: C.gray }}>Chargement…</div>
      )}

      {/* ═══════════════ VUE GLOBALE ═══════════════ */}
      {!loading && tab === 'global' && (
        <>
          {/* Évolution des Primes Partenaire */}
          <Card style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 16 }}>
              Évolution des Primes Partenaire par Année
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={evolution} margin={{ top: 4, right: 20, bottom: 4, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={fmtMAD} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmtMAD(v) + ' MAD'} labelFormatter={y => `Année ${y}`} />
                <Line type="monotone" dataKey="prime_partenaire" name="Prime Partenaire" stroke={C.olive} strokeWidth={2.5} dot={{ r: 4, fill: C.olive }} />
                <Line type="monotone" dataKey="engagement_partenaire" name="Engagement Partenaire" stroke={C.red} strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: C.red }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Primes par Branche */}
          <Card style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 16 }}>
              Primes Partenaire par Branche
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(260, branchesData.length * 34)}>
              <BarChart data={branchesData} layout="vertical" margin={{ left: 160 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" tickFormatter={fmtMAD} tick={{ fontSize: 11 }} />
                <YAxis dataKey="branche" type="category" tick={{ fontSize: 11 }} width={150} />
                <Tooltip formatter={(v: number) => fmtMAD(v) + ' MAD'} />
                <Bar dataKey="prime_partenaire" name="Prime Partenaire" radius={[0, 6, 6, 0]}>
                  {branchesData.map((d, i) => {
                    const isHL = highlightedBranches.size === 0 || highlightedBranches.has(d.branche)
                    return (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                        fillOpacity={isHL ? 1 : 0.25}
                        stroke={isHL && highlightedBranches.size > 0 ? 'rgba(0,0,0,0.55)' : 'none'}
                        strokeWidth={2}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Tableau Détail Branches */}
          <Card style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, margin: 0 }}>Détail par Branche</h3>
              <button onClick={exportBranchesExcel} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                background: `${C.olive}14`, color: C.olive,
                border: `1px solid ${C.olive}40`,
              }}>
                <Download size={13} />
                Exporter Excel
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {([
                    ['branche',              'Branche',               'left'],
                    ['nb_contrats',          'Nb Contrats',           'center'],
                    ['written_premium',      'Prime Atlantic Re',     'left'],
                    ['prime_partenaire',     'Prime Partenaire',      'left'],
                    ['engagement_partenaire','Engagement Partenaire', 'left'],
                    ['part_partenaire_moy',  'Part Moy (%)',          'left'],
                  ] as [BrancheSortKey, string, string][]).map(([col, label, align]) => (
                    <th key={col} onClick={() => handleSortBranche(col)}
                      style={{ padding: '10px 8px', textAlign: align as any, fontWeight: 700, color: C.gray, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {label}<SortIconBranche col={col} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedDetailBranches.map((d, i) => {
                  const isHL = highlightedBranches.size > 0 && highlightedBranches.has(d.branche)
                  return (
                  <tr key={d.branche} style={{ borderBottom: `1px solid ${C.border}`, background: isHL ? 'hsla(38,95%,54%,0.14)' : (i % 2 === 0 ? 'transparent' : '#fafbfc') }}>
                    <td style={{ padding: '10px 8px', fontWeight: 600, color: C.navy }}>{d.branche}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{d.nb_contrats}</td>
                    <td style={{ padding: '10px 8px' }}>{fmtMAD(d.written_premium)}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>{fmtMAD(d.prime_partenaire)}</td>
                    <td style={{ padding: '10px 8px' }}>{fmtMAD(d.engagement_partenaire)}</td>
                    <td style={{ padding: '10px 8px' }}>{d.part_partenaire_moy.toFixed(2)}%</td>
                  </tr>
                  )
                })}
                {sortedDetailBranches.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: C.gray }}>Aucune donnée disponible</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* ═══════════════ VUE PAR PARTENAIRE ═══════════════ */}
      {!loading && tab === 'partenaire' && (
        <>
          {/* Scatter — Croisement Donneurs × Preneurs */}
          <Card style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 4 }}>
              Croisement : Donneurs × Preneurs (Dual-Rôle)
            </h3>
            <p style={{ fontSize: '0.74rem', color: C.gray, marginBottom: 16 }}>
              Entreprises présentes à la fois comme cédantes FAC à Atlantic Re et comme preneurs de la rétrocession FAC.
              La taille des bulles est proportionnelle à l'engagement total.
            </p>
            {!crossingLoaded ? (
              <div style={{ textAlign: 'center', padding: 40, color: C.gray }}>Chargement du croisement…</div>
            ) : crossing.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: C.gray }}>
                Aucune entreprise en dual-rôle détectée (aucune intersection entre les deux datasets).
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="prime_donnee"
                    name="Prime Donnée"
                    tickFormatter={fmtMAD}
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Prime Donnée à Atlantic Re (MAD)', position: 'bottom', offset: 20, fontSize: 11, fill: C.gray }}
                  />
                  <YAxis
                    dataKey="prime_recue"
                    name="Prime Reçue"
                    tickFormatter={fmtMAD}
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Prime Reçue d\'Atlantic Re (MAD)', angle: -90, position: 'insideLeft', offset: -10, fontSize: 11, fill: C.gray }}
                  />
                  <ZAxis dataKey="bubble_size" range={[64, 1600]} />
                  <Tooltip content={<CrossingTooltip />} />
                  <Scatter data={crossingWithSize} name="Entreprises dual-rôle">
                    {crossingWithSize.map((d, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.75} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
            {crossing.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {crossing.slice(0, 8).map((d, i) => (
                  <div key={d.company_name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length], display: 'inline-block' }} />
                    <span style={{ fontSize: '0.71rem', color: C.gray }}>{d.company_name}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Top charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Top Primes */}
            <Card>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 16 }}>Top 10 Partenaires — Prime Partenaire</h3>
              <ResponsiveContainer width="100%" height={Math.max(260, topPrimes.length * 36)}>
                <BarChart data={topPrimes} layout="vertical" margin={{ left: 160 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" tickFormatter={fmtMAD} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="participant_name" type="category" tick={{ fontSize: 10 }} width={150} />
                  <Tooltip formatter={(v: number) => fmtMAD(v) + ' MAD'} />
                  <Bar dataKey="prime_partenaire" name="Prime Partenaire" fill={C.olive} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Top Engagement */}
            <Card>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 16 }}>Top 10 Partenaires — Engagement Partenaire</h3>
              <ResponsiveContainer width="100%" height={Math.max(260, topEngagement.length * 36)}>
                <BarChart data={topEngagement} layout="vertical" margin={{ left: 160 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" tickFormatter={fmtMAD} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="participant_name" type="category" tick={{ fontSize: 10 }} width={150} />
                  <Tooltip formatter={(v: number) => fmtMAD(v) + ' MAD'} />
                  <Bar dataKey="engagement_partenaire" name="Engagement" fill={C.red} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Taux de Part Moyen */}
          <Card style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 16 }}>Taux de Part Moyen par Partenaire</h3>
            <ResponsiveContainer width="100%" height={Math.max(260, tauxPart.length * 34)}>
              <BarChart data={tauxPart.map(d => ({ ...d, part_pct: +d.part_moy.toFixed(2) }))} layout="vertical" margin={{ left: 180 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                <YAxis dataKey="participant_name" type="category" tick={{ fontSize: 10 }} width={170} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="part_pct" name="Part Moyenne %" fill={C.orange} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Tableau Partenaires */}
          <Card style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, margin: 0 }}>Tableau des Partenaires</h3>
              <button onClick={exportPartenairesExcel} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                background: `${C.olive}14`, color: C.olive,
                border: `1px solid ${C.olive}40`,
              }}>
                <Download size={13} />
                Exporter Excel
              </button>
            </div>
            {/* Role filter buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {([
                { key: 'all' as const, label: 'Tous', color: C.navy, bg: '#E8EDF1' },
                { key: 'double' as const, label: 'Double Rôle', color: C.olive, bg: `${C.olive}18` },
                { key: 'donneur' as const, label: 'Donneur', color: C.amber, bg: `${C.amber}18` },
                { key: 'preneur' as const, label: 'Preneur', color: C.blue, bg: `${C.blue}18` },
              ]).map(f => (
                <button key={f.key} onClick={() => setPartRoleFilter(f.key)} style={{
                  padding: '5px 14px', borderRadius: 8, fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
                  border: `1.5px solid ${partRoleFilter === f.key ? f.color : C.border}`,
                  background: partRoleFilter === f.key ? f.bg : 'transparent',
                  color: partRoleFilter === f.key ? f.color : C.gray,
                  transition: 'all 0.15s ease',
                }}>
                  {f.label}
                  <span style={{ marginLeft: 5, opacity: 0.7 }}>({f.key === 'all' ? sortedPartenaires.length : sortedPartenaires.filter(p => p.role === f.key).length})</span>
                </button>
              ))}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.77rem' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {([
                    ['security_name',        'Partenaire',                  'left'],
                    ['nb_contrats',          'Contrats',                    'center'],
                    ['prime_partenaire',     'Prime Partenaire',            'left'],
                    ['engagement_partenaire','Engagement Part.',            'left'],
                    ['part_partenaire_moy',  'Part Moy (%)',                'left'],
                    ['role',                 'Rôle',                        'left'],
                    ['prime_donnee',         'Prime Donnée à Atlantic Re',  'left'],
                  ] as [PartSortKey, string, string][]).map(([col, label, align]) => (
                    <th key={col} onClick={() => handleSortPart(col)}
                      style={{ padding: '10px 8px', textAlign: align as any, fontWeight: 700, color: C.gray, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {label}<SortIconPart col={col} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSortedPartenaires.map((p, i) => (
                  <tr key={p.security_name} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : '#fafbfc' }}>
                    <td style={{ padding: '9px 8px', fontWeight: 600, color: C.navy, maxWidth: 200 }}>{p.security_name}</td>
                    <td style={{ padding: '9px 8px', textAlign: 'center' }}>{p.nb_contrats}</td>
                    <td style={{ padding: '9px 8px', fontWeight: 600 }}>{fmtMAD(p.prime_partenaire)}</td>
                    <td style={{ padding: '9px 8px' }}>{fmtMAD(p.engagement_partenaire)}</td>
                    <td style={{ padding: '9px 8px' }}>{p.part_partenaire_moy.toFixed(2)}%</td>
                    <td style={{ padding: '9px 8px' }}>
                      {p.role === 'double' ? (
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: `${C.olive}18`, color: C.olive }}>Double Rôle</span>
                      ) : p.role === 'donneur' ? (
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: `${C.amber}22`, color: C.amber }}>Donneur</span>
                      ) : (
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, background: `${C.blue}18`, color: C.blue }}>Preneur</span>
                      )}
                    </td>
                    <td style={{ padding: '9px 8px' }}>
                      {p.role_donneur && p.prime_donnee != null
                        ? <span style={{ fontWeight: 600, color: C.blue }}>{fmtMAD(p.prime_donnee)} MAD</span>
                        : <span style={{ color: C.gray }}>—</span>
                      }
                    </td>
                  </tr>
                ))}
                {filteredSortedPartenaires.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: C.gray }}>Aucun partenaire trouvé</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
