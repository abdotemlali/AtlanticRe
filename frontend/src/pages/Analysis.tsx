import { useState, useEffect, useMemo } from "react"
import { useNavigate } from 'react-router-dom'
import { BarChart2, TrendingUp, AlertTriangle, CheckCircle, PieChart, Table, GitCompare, FileText, Globe, RotateCcw, SlidersHorizontal, Users, Trophy } from 'lucide-react'
import Select from 'react-select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie, Cell as PieCell, Line, Legend, ComposedChart } from 'recharts'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { useData, filtersToParams } from '../context/DataContext'
import { useFetch } from '../hooks/useFetch'
import { formatCompact, formatPercent } from '../utils/formatters'
import { ChartSkeleton } from '../components/ui/Skeleton'
import WorldMap from '../components/Charts/WorldMap'

// ─── Palette dynamique branche (couleur vive par index) ──────────────────────
const BRANCH_PALETTE = [
  'hsl(358,66%,54%)',   // Rouge
  'hsl(83,52%,36%)',    // Vert
  'hsl(218,70%,55%)',   // Bleu
  'hsl(30,88%,56%)',    // Orange
  'hsl(280,40%,50%)',   // Violet
  '#94A3B8',            // Gris (fallback)
]
const GRAY_BAR = '#94A3B8'

const SELECTED_ROW_BG = 'hsla(83, 52%, 36%, 0.06)'

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180)
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180)
  if (percent < 0.05) return null // Ne pas afficher si < 5%
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '10px', fontWeight: 'bold' }}>
      {(percent * 100).toFixed(0)}%
    </text>
  )
}

export default function Analysis() {
  const { filters, filterOptions, setFilters } = useData()
  const navigate = useNavigate()

  // ── Sélection pays (mode unifié "Par pays") ───────────────────────────────
  const [selectedPays, setSelectedPays] = useState<string | null>(() => {
    try {
      const stored = sessionStorage.getItem('analysis_country')
      if (stored) { const { pays } = JSON.parse(stored); return pays || null }
    } catch {}
    return null
  })

  // ── Filtres locaux ─────────────────────────────────────────────────────────
  const [localUwYear, setLocalUwYear] = useState<number[]>([])              // Multi-select année
  const [localUwYearMin, setLocalUwYearMin] = useState<number | null>(null) // Min année
  const [localUwYearMax, setLocalUwYearMax] = useState<number | null>(null) // Max année
  const [localBranches, setLocalBranches] = useState<string[]>([])          // Multi-select branche
  const [localBrancheScope, setLocalBrancheScope] = useState({ vie: true, nonVie: true }) // Checkboxes Vie/Non-vie
  const [localContractTypeSpc, setLocalContractTypeSpc] = useState<string[]>([])  // FAC / TTY / TTE
  const [localTypeOfContract, setLocalTypeOfContract] = useState<string[]>([])  // Type de contrat

  // ── État UI ────────────────────────────────────────────────────────────────
  const [countryOptions, setCountryOptions] = useState<{ value: string; label: string }[]>([])
  const [sortCol, setSortCol] = useState<string>('total_written_premium')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // ── Lecture sessionStorage au montage ────────────────────────────────────
  useEffect(() => {
    const storedCountry = sessionStorage.getItem('analysis_country')
    const storedMarket = sessionStorage.getItem('analysis_market')
    if (storedCountry) {
      try { const { pays } = JSON.parse(storedCountry); setSelectedPays(pays) } catch {}
      sessionStorage.removeItem('analysis_country')
    }
    if (storedMarket) {
      try { const { pays } = JSON.parse(storedMarket); setSelectedPays(pays) } catch {}
      sessionStorage.removeItem('analysis_market')
    }
    const storedMode = sessionStorage.getItem('analysis_mode')
    if (storedMode) sessionStorage.removeItem('analysis_mode')
  }, [])

  // ── Réinitialiser filtres locaux ──────────────────────────────────────────
  const resetLocalFilters = () => {
    setLocalUwYear([])
    setLocalUwYearMin(null)
    setLocalUwYearMax(null)
    setLocalBranches([])
    setLocalBrancheScope({ vie: true, nonVie: true })
    setLocalContractTypeSpc([])
    setLocalTypeOfContract([])
  }

  const hasLocalFilters = localUwYear.length > 0 || localUwYearMin !== null || localUwYearMax !== null || localBranches.length > 0 || localContractTypeSpc.length > 0 || localTypeOfContract.length > 0 || !localBrancheScope.vie || !localBrancheScope.nonVie

  const activeCount = useMemo(() => {
    let n = 0
    if (localUwYear.length > 0 || localUwYearMin || localUwYearMax) n++
    if (localBranches.length > 0) n++
    if (localContractTypeSpc.length > 0) n++
    if (localTypeOfContract.length > 0) n++
    if (!localBrancheScope.vie || !localBrancheScope.nonVie) n++
    return n
  }, [localUwYear, localUwYearMin, localUwYearMax, localBranches, localContractTypeSpc, localTypeOfContract, localBrancheScope])

  // ── Helper pour nettoyer les filtres globaux remplacés par l'UI locale ───
  const stripLocalFilters = (p: Record<string, string>) => {
    delete p['pays_risque']
    delete p['pays_cedante']
    delete p['pays']
    delete p['branche']
    delete p['sous_branche']
    delete p['type_contrat_spc']
    delete p['type_of_contract']
    delete p['uw_years_raw']
    delete p['uw_year_min']
    delete p['uw_year_max']
    return p
  }

  // ── Options branche pour le filtre local (Branches du pays) ────────────────
  const branchAllData: any[] = useFetch<any[]>(selectedPays ? API_ROUTES.COUNTRY.BY_BRANCH : null, useMemo(() => {
    const p = stripLocalFilters(filtersToParams(filters))
    
    if (selectedPays) p['pays'] = selectedPays
    if (localContractTypeSpc.length > 0) p['type_contrat_spc'] = localContractTypeSpc.join(',')
    if (localTypeOfContract.length > 0) p['type_of_contract'] = localTypeOfContract.join(',')
    if (localBrancheScope.vie && !localBrancheScope.nonVie) p['vie_non_vie_view'] = 'VIE'
    if (!localBrancheScope.vie && localBrancheScope.nonVie) p['vie_non_vie_view'] = 'NON_VIE'
    
    if (localUwYear.length > 0) {
      p['uw_years_raw'] = localUwYear.join(',')
    } else {
      if (localUwYearMin) p['uw_year_min'] = String(localUwYearMin)
      if (localUwYearMax) p['uw_year_max'] = String(localUwYearMax)
    }
    return p
  }, [filters, selectedPays, localContractTypeSpc, localTypeOfContract, localBrancheScope, localUwYear, localUwYearMin, localUwYearMax])).data ?? []

  const brancheOptions = useMemo(() => {
    const branches = Array.from(new Set(branchAllData.map(b => String(b.branche))))
    return branches.map(b => ({ value: b, label: b }))
  }, [branchAllData])

  // ── Params de base (depuis filtres globaux + sélection pays) ─────────────
  const baseParams = useMemo(() => {
    const p = stripLocalFilters(filtersToParams(filters))

    if (selectedPays) p['pays'] = selectedPays
    if (localContractTypeSpc.length > 0) p['type_contrat_spc'] = localContractTypeSpc.join(',')
    if (localTypeOfContract.length > 0) p['type_of_contract'] = localTypeOfContract.join(',')
    if (localBrancheScope.vie && !localBrancheScope.nonVie) p['vie_non_vie_view'] = 'VIE'
    if (!localBrancheScope.vie && localBrancheScope.nonVie) p['vie_non_vie_view'] = 'NON_VIE'
    
    if (localUwYear.length > 0) {
      p['uw_years_raw'] = localUwYear.join(',')
    } else {
      if (localUwYearMin) p['uw_year_min'] = String(localUwYearMin)
      if (localUwYearMax) p['uw_year_max'] = String(localUwYearMax)
    }

    return p
  }, [filters, selectedPays, localContractTypeSpc, localTypeOfContract, localBrancheScope, localUwYear, localUwYearMin, localUwYearMax])

  // ── params : KPIs, Table, Top Branches (avec filtre branche local) ────────
  const params = useMemo(() => {
    const p = { ...baseParams }
    if (localBranches.length > 0) p['branche'] = localBranches.join(',')
    return p
  }, [baseParams, localBranches])

  // ── paramsNoBranch : Pie Chart (immunisé contre filtre branche ET vie/non-vie)
  const paramsNoBranch = useMemo(() => {
    const p = { ...baseParams }
    delete p['branche']
    delete p['vie_non_vie_view']
    return p
  }, [baseParams])

  // ── paramsNoCountry : WorldMap (immunisé contre pays) ────────────────────
  const paramsNoCountry = useMemo(() => {
    const p = stripLocalFilters(filtersToParams(filters))

    if (localContractTypeSpc.length > 0) p['type_contrat_spc'] = localContractTypeSpc.join(',')
    if (localTypeOfContract.length > 0) p['type_of_contract'] = localTypeOfContract.join(',')
    if (localBrancheScope.vie && !localBrancheScope.nonVie) p['vie_non_vie_view'] = 'VIE'
    if (!localBrancheScope.vie && localBrancheScope.nonVie) p['vie_non_vie_view'] = 'NON_VIE'
    if (localBranches.length > 0) p['branche'] = localBranches.join(',')
    
    if (localUwYear.length > 0) {
      p['uw_years_raw'] = localUwYear.join(',')
    } else {
      if (localUwYearMin) p['uw_year_min'] = String(localUwYearMin)
      if (localUwYearMax) p['uw_year_max'] = String(localUwYearMax)
    }

    return p
  }, [filters, localContractTypeSpc, localTypeOfContract, localBrancheScope, localBranches, localUwYear, localUwYearMin, localUwYearMax])

  // ── paramsNoYear : Evolution Historique ───────────────────────────────────
  const paramsNoYear = useMemo(() => {
    const p = { ...params }
    delete p['uw_year_min']
    delete p['uw_year_max']
    delete p['uw_years_raw']
    return p
  }, [params])

  // ── Fetch liste pays ──────────────────────────────────────────────────────
  const { data: countriesRes, loading: loadingCountries } = useFetch<any[]>(API_ROUTES.KPIS.BY_COUNTRY, { ...paramsNoCountry, top: 1000 })
  useEffect(() => {
    if (countriesRes) setCountryOptions(countriesRes.map((c: any) => ({ value: c.pays, label: c.pays })))
  }, [countriesRes])

  // ── Fetch profil pays (KPIs) ──────────────────────────────────────────────
  const profileUrl = selectedPays ? API_ROUTES.COUNTRY.PROFILE : null
  const { data: profRes, loading: l1 } = useFetch<any>(profileUrl, params)

  // ── Fetch évolution historique (paramsNoYear) ─────────────────────────────
  const yearUrl = selectedPays ? API_ROUTES.COUNTRY.BY_YEAR : null
  const { data: yearRes, loading: l2 } = useFetch<any>(yearUrl, paramsNoYear)

  // ── Fetch Mix Branches (Base 100% complète pour le Pie Chart, immunisée vs branche/vie) ─
  const { data: branchPieData, loading: l3 } = useFetch<any[]>(selectedPays ? API_ROUTES.COUNTRY.BY_BRANCH : null, paramsNoBranch)

  // ── Fetch branches filtrées (pour KPIs + Top Bar sélection + état actif Pie) ─
  const branchUrl = selectedPays ? API_ROUTES.COUNTRY.BY_BRANCH : null
  const { data: branchFilteredRes, loading: l4 } = useFetch<any[]>(branchUrl, params)

  // ── Fetch Top Cédantes du Pays ─────────────────────────────────────────────
  const paramsCedante = useMemo(() => {
    const p = { ...params }
    if (selectedPays) p['pays_risque'] = selectedPays
    delete p['pays']
    return p
  }, [params, selectedPays])
  const cedantesUrl = selectedPays ? API_ROUTES.KPIS.BY_CEDANTE : null
  const { data: cedantesRes, loading: l5 } = useFetch<any[]>(cedantesUrl, paramsCedante)

  const loading = loadingCountries || l1 || l2 || l3 || l4 || l5

  // ── Données dérivées ───────────────────────────────────────────────────────
  const profile = useMemo(() => {
    if (!profRes) return null
    return { ...profRes, cedante: profRes.pays ?? selectedPays, pays_cedante: '' }
  }, [profRes, selectedPays])

  const yearData: any[] = yearRes ?? []

  // ── Helpers couleur unifiés (Branche -> Couleur absolue) ─────────────────
  const branchColorMap = useMemo(() => {
    const map = new Map<string, string>()
    if (branchPieData) {
      const sorted = [...branchPieData].sort((a, b) => b.total_written_premium - a.total_written_premium)
      sorted.forEach((b, i) => {
        map.set(String(b.branche), BRANCH_PALETTE[i % BRANCH_PALETTE.length])
      })
    }
    return map
  }, [branchPieData])

  const getBranchColor = (name: string) => branchColorMap.get(name) || 'hsl(209,28%,24%)'

  // ── Top 10 Bar Chart — logique hybride ────────────────────────────────────
  // 1. Branches sélectionnées (is_selected = true, couleur palette)
  // 2. Compléter jusqu'à 10 avec non-sélectionnées (couleur grise)
  const topBarData = useMemo(() => {
    const hasBranchRestriction = localBranches.length > 0 || !localBrancheScope.vie || !localBrancheScope.nonVie

    if (!hasBranchRestriction) {
      return (branchFilteredRes ?? []).slice(0, 10).map((b, i) => ({
        ...b,
        is_selected: false,
        barColor: GRAY_BAR,
        colorIndex: -1,
      }))
    }

    const selectedBranches = (branchFilteredRes ?? [])
      .map((b, i) => ({ ...b, is_selected: true, barColor: getBranchColor(String(b.branche)), colorIndex: i }))

    // branchPieData contient l'ensemble absolu pour le pays (immunisé)
    const selectedNames = new Set(selectedBranches.map(b => String(b.branche)))
    
    // Pour compléter, on prend dans l'ensemble absolu
    const nonSelectedBranches = (branchPieData ?? [])
      .filter(b => !selectedNames.has(String(b.branche)))
      .map(b => ({ ...b, is_selected: false, barColor: 'hsla(209,28%,24%,0.15)', colorIndex: -1 }))

    const combined = [...selectedBranches, ...nonSelectedBranches]
    return combined.slice(0, 10).sort((a, b) => b.total_written_premium - a.total_written_premium)
  }, [branchFilteredRes, branchPieData, localBranches, localBrancheScope])

  // ── Top Cédantes (bar chart) ──────────────────────────────────────────────
  const topCedantesData = useMemo(() => {
    if (!cedantesRes) return []
    return cedantesRes
      .filter((c: any) => c.total_written_premium > 0)
      .sort((c1: any, c2: any) => c2.total_written_premium - c1.total_written_premium)
      .slice(0, 10)
      .map((c: any, i: number) => ({
        ...c,
        barColor: BRANCH_PALETTE[i % BRANCH_PALETTE.length]
      }))
  }, [cedantesRes])

  // ── Top 15 Pays Globaux (pour le dashboard vide par défaut) ───────────────
  const topPaysData = useMemo(() => {
    if (!countriesRes) return []
    return [...countriesRes]
      .filter((c: any) => c.total_written_premium > 0)
      .sort((c1: any, c2: any) => c2.total_written_premium - c1.total_written_premium)
      .slice(0, 15)
  }, [countriesRes])

  // ── Pie Chart (données de paramsNoBranch) ─────────────────────────────────
  const pieData = useMemo(() => {
    if (!branchPieData || !branchFilteredRes) return []
    const activeBranchesSet = new Set(branchFilteredRes.map(b => String(b.branche)))
    
    return branchPieData
      .map(b => ({
        name: String(b.branche),
        value: b.total_written_premium,
        selected: activeBranchesSet.has(String(b.branche))
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [branchPieData, branchFilteredRes])

  // Ensemble des noms de branches sélectionnées (pour le Pie)
  const selectedBranchSet = useMemo(() => new Set(localBranches), [localBranches])

  // ── Tableau — données + tri ───────────────────────────────────────────────
  // Affiche TOUTES les branches (branchPieData), et surligne celles existant
  // dans le jeu filtré (branchFilteredRes).
  const sortedBranchData = useMemo(() => {
    const base = [...(branchPieData ?? [])]
    base.sort((a, b) => {
      const valA = a[sortCol] ?? 0
      const valB = b[sortCol] ?? 0
      if (sortCol === 'branche') return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA))
      return sortDir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
    })
    return base
  }, [branchPieData, sortCol, sortDir])

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('desc') }
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleVoirContrats = () => {
    if (selectedPays) {
      setFilters((f: any) => ({ ...f, pays_risque: [selectedPays] }))
    }
    sessionStorage.setItem('dashboard_tab', 'contrats')
    navigate('/')
  }

  const handleComparer = () => {
    if (selectedPays) {
      sessionStorage.setItem('compare_country_a', JSON.stringify({ pays: selectedPays }))
      navigate('/comparaison')
    }
  }

  // ── Helpers couleur ────────────────────────────────────────────────────────
  const ulrColor = (ulr: number | null) => {
    if (ulr === null) return 'var(--color-gray-400)'
    if (ulr > 100) return 'hsl(358,66%,54%)'
    if (ulr > 70) return 'hsl(30,88%,56%)'
    return 'hsl(83,52%,36%)'
  }

  // ─── Styles Select ────────────────────────────────────────────────────────
  const selectStyle = {
    menuPortalTarget: document.body,
    menuPosition: 'fixed' as const,
    styles: {
      menuPortal: (b: any) => ({ ...b, zIndex: 9999 }),
      control: (b: any) => ({
        ...b, minHeight: '42px', borderRadius: '0.75rem',
        borderColor: 'var(--color-gray-100)', boxShadow: 'none',
        '&:hover': { borderColor: 'var(--color-gray-300)' }
      }),
      multiValue: (b: any, { data }: any) => {
        const color = getBranchColor(data.value)
        return { ...b, backgroundColor: color + '22' }
      },
      multiValueLabel: (b: any, { data }: any) => {
        const color = getBranchColor(data.value)
        return { ...b, color: color, fontWeight: 700, fontSize: '0.72rem' }
      },
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EMPTY STATE — aucun pays sélectionné
  // ─────────────────────────────────────────────────────────────────────────
  if (!selectedPays) {
    return (
      <div className="space-y-6 animate-fade-in p-2">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 p-4 rounded-xl border border-[var(--color-gray-100)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[hsla(209,28%,24%,0.08)]">
              <BarChart2 size={20} className="text-[var(--color-navy)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-navy)]">Analyse Globale</h1>
              <p className="text-sm text-[var(--color-gray-500)] mt-0.5">Explorez les performances par pays</p>
            </div>
          </div>
          <div className="w-full md:w-80 z-50">
            <Select
              options={countryOptions}
              value={null}
              onChange={(v) => setSelectedPays(v?.value || null)}
              placeholder="Rechercher un pays..."
              isClearable
              {...selectStyle}
            />
          </div>
        </div>

        {/* ── Top Pays en mode global ──────────────────────────────────────── */}
        {topPaysData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={18} className="text-[var(--color-navy)]" />
              <h3 className="text-sm font-bold text-[var(--color-navy)]">Performance Globale — Top 15 Pays</h3>
              <span className="ml-auto px-2 py-1 rounded-lg text-[10px] font-bold text-[var(--color-gray-500)] bg-[var(--color-gray-100)]">
                Cliquez sur une barre pour analyser le pays
              </span>
            </div>
            
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={topPaysData} 
                  layout="vertical" 
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-gray-100)" />
                  <XAxis type="number" tickFormatter={(val) => formatCompact(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                  <YAxis type="category" dataKey="pays" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)', width: 140 }} width={140} />
                  <RechartsTooltip
                    cursor={{ fill: 'hsla(209,28%,24%,0.04)' }}
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="bg-white/95 backdrop-blur-md p-3 rounded-lg shadow-xl border border-[var(--color-gray-100)] text-xs">
                          <p className="font-bold mb-2 text-[var(--color-navy)]">{d.pays}</p>
                          <div className="flex justify-between gap-4">
                            <span className="opacity-70">Prime Écrite:</span>
                            <span className="font-mono font-bold text-[var(--color-navy)]">{formatCompact(d.total_written_premium)}</span>
                          </div>
                          <div className="flex justify-between gap-4 mt-1">
                            <span className="opacity-70">ULR:</span>
                            <span className="font-mono font-bold" style={{ color: ulrColor(d.avg_ulr) }}>{formatPercent(d.avg_ulr)}</span>
                          </div>
                          <p className="text-[10px] italic text-[var(--color-gray-400)] mt-3">Cliquez pour voir l'analyse complète</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="total_written_premium" radius={[0, 4, 4, 0]}>
                    {topPaysData.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="var(--color-navy)"
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        onClick={() => {
                          setSelectedPays(entry.pays)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-[var(--color-gray-500)]">Sélectionnez un pays en haut pour afficher l'analyse détaillée.</p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VUE PRINCIPALE — pays sélectionné
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in p-2 pb-12">

      {/* ── Panneau de filtres locaux (calqué sur CedanteAnalysis) ───────── */}
      <div className="sticky top-0 z-40 bg-[var(--color-off-white)] pt-1 pb-4">
        <div className="bg-white rounded-xl border border-[var(--color-gray-100)] shadow-sm px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal size={13} className="text-[var(--color-navy)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">Filtres de la vue</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--color-navy)' }}>
                {activeCount}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            
            {/* Année de Souscription (calqué sur CedanteAnalysis) */}
            <div>
              <label className="block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]">
                Année de souscription
              </label>
              <div className="space-y-1.5 z-50">
                <Select
                  isMulti
                  options={filterOptions?.underwriting_years?.map((y: any) => ({ value: y, label: String(y) })) || []}
                  value={localUwYear.map((y: any) => ({ value: y, label: String(y) }))}
                  onChange={(v: any) => {
                    setLocalUwYear(v.map((x: any) => x.value))
                    setLocalUwYearMin(null)
                    setLocalUwYearMax(null)
                  }}
                  placeholder="Toutes les années..."
                  {...selectStyle}
                />
                {localUwYear.length === 0 && (
                  <div className="flex gap-1.5">
                    <select
                      title="Année min"
                      className="input-dark text-xs py-1 flex-1"
                      value={localUwYearMin ?? ''}
                      onChange={e => setLocalUwYearMin(Number(e.target.value) || null)}
                      style={{
                        border: '1px solid var(--color-gray-200)', borderRadius: '0.5rem',
                        background: 'white', color: 'var(--color-navy)', padding: '0.3rem'
                      }}
                    >
                      <option value="">Min</option>
                      {(filterOptions?.underwriting_years || []).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                      title="Année max"
                      className="input-dark text-xs py-1 flex-1"
                      value={localUwYearMax ?? ''}
                      onChange={e => setLocalUwYearMax(Number(e.target.value) || null)}
                      style={{
                        border: '1px solid var(--color-gray-200)', borderRadius: '0.5rem',
                        background: 'white', color: 'var(--color-navy)', padding: '0.3rem'
                      }}
                    >
                      <option value="">Max</option>
                      {[...(filterOptions?.underwriting_years || [])].reverse().map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Branche multi-select et Vie/Non-vie */}
            <div>
              <label className="block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]">
                Branche
              </label>
              <Select
                isMulti
                options={brancheOptions}
                value={brancheOptions.filter(o => localBranches.includes(o.value))}
                onChange={v => setLocalBranches(v.map((x: any) => x.value))}
                placeholder="Toutes les branches…"
                {...selectStyle}
              />
              <div className="flex gap-3 mt-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localBrancheScope.vie}
                    onChange={e => {
                      setLocalBrancheScope(prev => ({ vie: e.target.checked, nonVie: prev.nonVie }))
                      setLocalBranches([])
                    }}
                  />
                  <span className="text-[0.78rem] font-medium text-gray-600">Vie</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localBrancheScope.nonVie}
                    onChange={e => {
                      setLocalBrancheScope(prev => ({ vie: prev.vie, nonVie: e.target.checked }))
                      setLocalBranches([])
                    }}
                  />
                  <span className="text-[0.78rem] font-medium text-gray-600">Non-vie</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 col-span-1 sm:col-span-2 xl:col-span-2">
              {/* Type SPC */}
              <div>
                <label className="block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]">
                  Type SPC
                </label>
                <Select
                  isMulti
                  options={(filterOptions?.type_contrat_spc ?? []).map((v: any) => ({ value: v, label: v }))}
                  value={localContractTypeSpc.map(v => ({ value: v, label: v }))}
                  onChange={v => setLocalContractTypeSpc(v.map((x: any) => x.value))}
                  placeholder="FAC / TTY / TTE…"
                  {...selectStyle}
                />
              </div>

              {/* Type de contrat */}
              <div>
                <label className="block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]">
                  Type de contrat
                </label>
                <Select
                  isMulti
                  options={(filterOptions?.type_of_contract ?? []).map((v: any) => ({ value: v, label: v }))}
                  value={localTypeOfContract.map(v => ({ value: v, label: v }))}
                  onChange={v => setLocalTypeOfContract(v.map((x: any) => x.value))}
                  placeholder="Tous les types…"
                  {...selectStyle}
                />
              </div>
            </div>

            {/* Bouton Réinitialiser */}
            <div className="flex items-end justify-end">
              {hasLocalFilters && (
                <button
                  onClick={resetLocalFilters}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: 'hsla(358,66%,54%,0.08)', color: 'hsl(358,66%,54%)', border: '1px solid hsla(358,66%,54%,0.3)' }}
                >
                  <RotateCcw size={13} />
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 p-4 rounded-xl border border-[var(--color-gray-100)] backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[hsla(209,28%,24%,0.08)]">
            <BarChart2 size={20} className="text-[var(--color-navy)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-navy)]">{selectedPays}</h1>
            <p className="text-sm text-[var(--color-gray-500)] mt-0.5">Analyse globale du pays</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="w-full md:w-72 z-50">
            <Select
              options={countryOptions}
              value={countryOptions.find(o => o.value === selectedPays) || null}
              onChange={(v) => { setSelectedPays(v?.value || null); resetLocalFilters() }}
              placeholder="Changer de pays..."
              isClearable
              {...selectStyle}
            />
          </div>
          <button
            onClick={handleVoirContrats}
            className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap"
            style={{ background: 'hsla(209,28%,24%,0.08)', color: 'var(--color-navy)', border: '1px solid var(--color-gray-200)' }}
          >
            <FileText size={14} />Voir les contrats
          </button>
          <button
            onClick={handleComparer}
            className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all whitespace-nowrap shadow-sm"
            style={{ background: 'linear-gradient(135deg, hsl(209,32%,17%), hsl(209,28%,24%))' }}
          >
            <GitCompare size={14} />Comparer
          </button>
        </div>
      </div>



      {/* ── Skeleton ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col gap-6">
          <ChartSkeleton height={120} />
          <ChartSkeleton height={300} />
        </div>
      )}

      {!loading && profile && (
        <>
          {/* ── KPI Cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-100)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2">Prime Écrite</span>
              <span className="text-2xl font-mono font-bold text-[var(--color-navy)]">{formatCompact(profile.total_written_premium)}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-100)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2">Résultat Net</span>
              <span className="text-2xl font-mono font-bold" style={{ color: profile.total_resultat >= 0 ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)' }}>
                {formatCompact(profile.total_resultat)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-100)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                Loss Ratio <span className="opacity-50">(Moyen)</span>
              </span>
              <div className="flex items-center gap-2">
                {profile.avg_ulr > 100 ? <AlertTriangle size={18} color="hsl(358,66%,54%)" /> : <CheckCircle size={18} color="hsl(83,52%,36%)" />}
                <span className="text-2xl font-mono font-bold" style={{ color: ulrColor(profile.avg_ulr) }}>
                  {formatPercent(profile.avg_ulr)}
                </span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-100)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2">Nb Contrats</span>
              <span className="text-2xl font-mono font-bold text-[var(--color-navy)]">{profile.contract_count}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-100)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2">Part Souscrite</span>
              <span className="text-2xl font-mono font-bold text-[var(--color-navy)]">{(profile.avg_share_signed || 0).toFixed(1)}%</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-100)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <span className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2">Commission (Moy.)</span>
              <span className="text-2xl font-mono font-bold text-[var(--color-navy)]">{(profile.avg_commission || 0).toFixed(1)}%</span>
            </div>
          </div>

          {/* ── Évolution Historique (paramsNoYear) ───────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={18} className="text-[var(--color-navy)]" />
              <h3 className="text-sm font-bold text-[var(--color-navy)]">Évolution Historique (Année de Souscription)</h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={yearData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-100)" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                  <YAxis yAxisId="left" tickFormatter={(val) => formatCompact(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `${val}%`} domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                  <RechartsTooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-white/95 backdrop-blur-md text-[var(--color-navy)] p-3 rounded-lg shadow-xl border border-[var(--color-gray-100)] text-xs">
                          <p className="font-bold mb-2">Année {label}</p>
                          {payload.map((entry: any, i: number) => (
                            <div key={i} className="flex justify-between gap-4 mt-1 font-mono">
                              <span className="opacity-70 font-sans">{entry.name}</span>
                              <span style={{ color: entry.dataKey === 'avg_ulr' ? 'hsl(30,88%,56%)' : entry.color }} className="font-bold">
                                {entry.dataKey === 'avg_ulr' ? formatPercent(entry.value) : formatCompact(entry.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                  <Bar yAxisId="left" dataKey="total_written_premium" name="Prime Écrite" fill="hsl(209,28%,24%)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="total_resultat" name="Résultat Net" radius={[4, 4, 0, 0]}>
                    {yearData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.total_resultat >= 0 ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)'} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="avg_ulr" name="Loss Ratio" stroke="hsl(30,88%,56%)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Charts Branches (Pie + Top Bar) ───────────────────────────── */}
          {branchAllData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ── Pie Chart (Mix branche) — données paramsNoBranch ──────── */}
              <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart size={18} className="text-[var(--color-navy)]" />
                  <h3 className="text-sm font-bold text-[var(--color-navy)]">Mix par Branche (Primes)</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        labelLine={false}
                        label={renderCustomLabel}
                        stroke="none"
                      >
                        {pieData.map((entry, index) => {
                          const baseColor = getBranchColor(entry.name)
                          return (
                            <PieCell
                              key={`cell-${index}`}
                              fill={entry.selected ? baseColor : baseColor + '44'}
                              stroke={entry.selected ? baseColor : 'transparent'}
                              strokeWidth={entry.selected ? 2 : 0}
                            />
                          )
                        })}
                      </Pie>
                      <RechartsTooltip formatter={(val: number) => formatCompact(val)} />
                      <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{ fontSize: '11px', maxHeight: '200px', overflowY: 'auto' }}
                        iconType="circle"
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ── Top Bar Chart Branches — logique hybride ─────────────── */}
              <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 size={18} className="text-[var(--color-navy)]" />
                  <h3 className="text-sm font-bold text-[var(--color-navy)]">Top Branches</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topBarData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-gray-100)" />
                      <XAxis type="number" tickFormatter={(val) => formatCompact(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                      <YAxis type="category" dataKey="branche" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)', width: 80 }} width={80} />
                      <RechartsTooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload?.length) return null
                          const d = payload[0].payload
                          return (
                            <div className="bg-white/95 p-3 rounded-lg shadow-xl border border-[var(--color-gray-100)] text-xs">
                              <p className="font-bold mb-2 text-[var(--color-navy)]">
                                {d.branche}
                                {d.is_selected && <span className="ml-2 px-1.5 py-0.5 rounded text-white text-[10px]" style={{ background: d.barColor }}>Sélectionnée</span>}
                              </p>
                              <div className="flex justify-between gap-4">
                                <span className="opacity-70">Prime:</span>
                                <span className="font-mono font-bold">{formatCompact(d.total_written_premium)}</span>
                              </div>
                              <div className="flex justify-between gap-4 mt-1">
                                <span className="opacity-70">ULR:</span>
                                <span className="font-mono font-bold" style={{ color: ulrColor(d.avg_ulr) }}>{formatPercent(d.avg_ulr)}</span>
                              </div>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="total_written_premium" radius={[0, 4, 4, 0]}>
                        {topBarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.barColor} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ── Top Cédantes du Pays ──────────────────────────────────────── */}
          {topCedantesData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} className="text-[var(--color-navy)]" />
                <h3 className="text-sm font-bold text-[var(--color-navy)]">Top Cédantes du Pays</h3>
                {selectedPays && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ background: 'var(--color-navy)' }}>
                    {selectedPays}
                  </span>
                )}
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCedantesData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-gray-100)" />
                    <XAxis type="number" tickFormatter={(val) => formatCompact(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                    <YAxis type="category" dataKey="cedante" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-gray-500)', width: 160 }} width={160} />
                    <RechartsTooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload
                        return (
                          <div className="bg-white/95 p-3 rounded-lg shadow-xl border border-[var(--color-gray-100)] text-xs">
                            <p className="font-bold mb-2 text-[var(--color-navy)]">{d.cedante}</p>
                            <div className="flex justify-between gap-4">
                              <span className="opacity-70">Prime:</span>
                              <span className="font-mono font-bold">{formatCompact(d.total_written_premium)}</span>
                            </div>
                            <div className="flex justify-between gap-4 mt-1">
                              <span className="opacity-70">ULR:</span>
                              <span className="font-mono font-bold" style={{ color: ulrColor(d.avg_ulr) }}>{formatPercent(d.avg_ulr)}</span>
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="total_written_premium" radius={[0, 4, 4, 0]}>
                      {topCedantesData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.barColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Tableau Branches ───────────────────────────────────────────── */}
          {branchAllData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] overflow-hidden">
              <div className="p-4 border-b border-[var(--color-gray-100)] flex items-center gap-2 bg-[var(--color-off-white)]">
                <Table size={18} className="text-[var(--color-navy)]" />
                <h3 className="text-sm font-bold text-[var(--color-navy)]">Commissions et Taux par Branche</h3>
                {localBranches.length > 0 && (
                  <span className="ml-auto text-[11px] font-bold text-[var(--color-gray-500)]">
                    Lignes surlignées = branches sélectionnées
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-off-white)]">
                      <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase cursor-pointer" onClick={() => handleSort('branche')}>Branche</th>
                      <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase cursor-pointer text-right" onClick={() => handleSort('total_written_premium')}>Prime Écrite</th>
                      <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase cursor-pointer text-right" onClick={() => handleSort('avg_ulr')}>ULR</th>
                      <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right">Commission</th>
                      <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right">Courtage</th>
                      <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right">Comm. Bénéfices</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBranchData.map((b, i) => {
                      const isSelected = localBranches.length > 0 && selectedBranchSet.has(b.branche)
                      const branchColorIndex = localBranches.indexOf(b.branche)
                      const rowColor = isSelected ? BRANCH_PALETTE[branchColorIndex % BRANCH_PALETTE.length] : undefined
                      return (
                        <tr
                          key={i}
                          className="border-b border-[var(--color-gray-100)] last:border-0 transition-colors"
                          style={{ background: isSelected ? SELECTED_ROW_BG : 'transparent' }}
                        >
                          <td className="py-3 px-4 text-xs font-bold" style={{ color: rowColor ?? 'var(--color-navy)' }}>
                            {isSelected && (
                              <span
                                className="inline-block w-2 h-2 rounded-full mr-2"
                                style={{ background: rowColor }}
                              />
                            )}
                            {b.branche}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-right">{formatCompact(b.total_written_premium)}</td>
                          <td className="py-3 px-4 text-xs font-mono font-bold text-right">
                            {b.avg_ulr !== null && (
                              <span className="px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: ulrColor(b.avg_ulr) }}>
                                {formatPercent(b.avg_ulr)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-right text-[var(--color-gray-500)]">{(b.avg_commission ?? 0).toFixed(1)}%</td>
                          <td className="py-3 px-4 text-xs font-mono text-right text-[var(--color-gray-500)]">{(b.avg_brokerage_rate ?? 0).toFixed(1)}%</td>
                          <td className="py-3 px-4 text-xs font-mono text-right text-[var(--color-gray-500)]">{(b.avg_profit_comm_rate ?? 0).toFixed(1)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
