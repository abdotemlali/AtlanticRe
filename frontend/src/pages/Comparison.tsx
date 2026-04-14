// MODIFIÉ — Refonte complète de la page Comparaison
// Modifications 1 & 2 : filtre local simplifié (Année / Type contrat / Type SPC)
// + mode "Par pays" avec sélection de branches indépendante par pays (AbortController)
import React from 'react';
import { useState, useEffect, useRef, useCallback } from "react"
import { useLocation } from 'react-router-dom'
import Select from 'react-select'
import api from '../utils/api'
import { useData } from '../context/DataContext'
import { filtersToParams } from '../context/DataContext'
import { formatCompact, formatPercent, toOptions, toNumOptions } from '../utils/formatters'
import ActiveFiltersBar from '../components/ActiveFiltersBar'
import RadarChartComponent from '../components/Charts/RadarChartComponent'
import { SHARED_SELECT_STYLES } from '../constants/styles'
import type { MarketKPIs, ActiveBranch } from '../types/kpis.types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { GitCompare, AlertTriangle, CheckCircle, SlidersHorizontal } from 'lucide-react'

// ── Styles pour react-select (extends shared) ─────────────────────────────────
const rsStyles = {
  ...SHARED_SELECT_STYLES,
  control: (base: any) => ({
    ...base, minHeight: '34px', fontSize: '0.78rem', borderRadius: '0.5rem',
    borderColor: 'var(--color-gray-200)', boxShadow: 'none',
    '&:hover': { borderColor: 'var(--color-navy)' },
  }),
}
const rsProps = { styles: rsStyles, menuPortalTarget: document.body, menuPosition: 'fixed' as const }

// ── Sub-components ─────────────────────────────────────────────────────────────
const DeltaBadge = ({ valA, valB }: { valA: number, valB: number }) => {
  if (!valA || !valB) return <div className="w-16 flex justify-center">-</div>
  const diff = ((valA - valB) / Math.abs(valB)) * 100
  if (Math.abs(diff) < 0.1) return <div className="w-16 flex justify-center text-[var(--color-gray-500)] text-xs font-bold">=</div>
  const isPositive = diff > 0
  const color = isPositive ? 'hsl(83,52%,36%)' : 'var(--color-red)'
  return (
    <div className="w-16 flex items-center justify-center gap-1 font-bold text-[10px]" style={{ color }}>
      {isPositive ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}%
    </div>
  )
}

const KPIColHeader = ({ kpis, headerBg, label }: { kpis: MarketKPIs; headerBg: string; label: string }) => (
  <div className="flex-1 bg-white" style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(45,62,80,0.08)', border: '1px solid var(--color-gray-100)', overflow: 'hidden' }}>
    <div className="p-4" style={{ background: headerBg }}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)' }}>
          {label}
        </span>
      </div>
      <div className="mt-4 text-white">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-bold">{kpis.pays}</h2>
          {kpis.type_cedante && (
            <span style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em',
              ...(kpis.type_cedante === 'REASSUREUR'
                ? { background: 'hsla(160,84%,39%,0.15)', border: '1px solid hsla(160,84%,39%,0.4)', color: '#6bffb8' }
                : { background: 'hsla(213,94%,68%,0.15)', border: '1px solid hsla(213,94%,68%,0.4)', color: '#4F8EF7' }
              ),
            }}>
              {kpis.type_cedante === 'REASSUREUR' ? 'RÉASSUREUR' : 'ASSUREUR DIRECT'}
            </span>
          )}
        </div>
        {kpis.fac_saturation_alerts && kpis.fac_saturation_alerts.length > 0 && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold animate-pulse"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#FFFFFF' }}>
            <AlertTriangle size={12} color="#FCD34D" />
            <span>Saturation FAC ({kpis.fac_saturation_alerts.length} Branche{kpis.fac_saturation_alerts.length > 1 ? 's' : ''})</span>
          </div>
        )}
        <p className="text-sm font-medium opacity-90 mt-1">{kpis.branche}</p>
      </div>
    </div>
  </div>
)

const KPIRow = ({ label, valA, valB, formatFn }: { label: string, valA: number, valB: number, formatFn: (v: number) => string }) => (
  <div className="flex justify-between items-center py-2.5 border-b last:border-0 hover:bg-[var(--color-off-white)] px-4 transition-colors" style={{ borderColor: 'var(--color-gray-100)' }}>
    <div className="flex-1 font-bold text-[var(--color-navy)] text-sm">{formatFn(valA)}</div>
    <div className="w-1/3 flex justify-center items-center flex-col gap-1">
      <span className="font-semibold text-[var(--color-gray-500)] text-xs uppercase tracking-wider">{label}</span>
      <DeltaBadge valA={valA} valB={valB} />
    </div>
    <div className="flex-1 font-bold text-[var(--color-navy)] text-sm text-right">{formatFn(valB)}</div>
  </div>
)

// ── Bloc de sélection pays + branches pour le mode "Par pays" ──────────
interface CountryBlockProps {
  label: string
  color: string
  countryOptions: string[]
  selectedCountry: string | null
  onCountryChange: (c: string | null) => void
  availBranches: string[]
  selectedBranches: string[]
  onBranchesChange: (b: string[]) => void
  loadingBranches: boolean
  noData: boolean
}

const CountryBlock = ({
  label, color, countryOptions, selectedCountry, onCountryChange,
  availBranches, selectedBranches, onBranchesChange, loadingBranches, noData,
}: CountryBlockProps) => {
  const isVieChecked = selectedBranches.includes('VIE')
  const nonVieBranches = availBranches.filter(b => b !== 'VIE')
  const isNonVieChecked = nonVieBranches.length > 0 && nonVieBranches.every(b => selectedBranches.includes(b))

  const handleVieChange = (checked: boolean) => {
    if (checked) {
      if (!selectedBranches.includes('VIE')) onBranchesChange([...selectedBranches, 'VIE'])
    } else {
      onBranchesChange(selectedBranches.filter(b => b !== 'VIE'))
    }
  }

  const handleNonVieChange = (checked: boolean) => {
    if (checked) {
      const next = new Set(selectedBranches)
      nonVieBranches.forEach(b => next.add(b))
      onBranchesChange(Array.from(next))
    } else {
      onBranchesChange(selectedBranches.filter(b => b === 'VIE'))
    }
  }

  return (
    <div className="flex-1 min-w-0 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
      {/* Dropdown pays */}
      <Select
        {...rsProps}
        options={toOptions(countryOptions)}
        value={selectedCountry ? { value: selectedCountry, label: selectedCountry } : null}
        onChange={v => onCountryChange(v ? v.value : null)}
        placeholder="Sélectionner un pays…"
        noOptionsMessage={() => 'Aucun résultat'}
        isClearable
        isSearchable
        classNamePrefix="rs"
      />
      {/* Dropdown branches (dynamique) */}
      {selectedCountry && (
        <Select
          {...rsProps}
          isMulti
          options={toOptions(availBranches)}
          value={toOptions(selectedBranches)}
          onChange={v => onBranchesChange(v.map((x: any) => x.value))}
          placeholder={loadingBranches ? 'Chargement…' : 'Toutes les branches'}
          noOptionsMessage={() => noData ? 'Aucune donnée pour ce pays' : 'Aucune branche'}
          isDisabled={loadingBranches || noData}
          classNamePrefix="rs"
        />
      )}
      {/* Checkboxes Vie / Non-Vie — sous le sélecteur de branches */}
      {selectedCountry && availBranches.length > 0 && (
        <div className="flex gap-3 mt-1">
          {availBranches.includes('VIE') && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isVieChecked}
                onChange={e => handleVieChange(e.target.checked)}
              />
              <span className="text-[0.78rem] font-medium text-gray-600">Vie</span>
            </label>
          )}
          {nonVieBranches.length > 0 && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isNonVieChecked}
                onChange={e => handleNonVieChange(e.target.checked)}
              />
              <span className="text-[0.78rem] font-medium text-gray-600">Non-vie</span>
            </label>
          )}
        </div>
      )}
      {/* Message si pays sans données */}
      {selectedCountry && noData && !loadingBranches && (
        <p className="text-xs font-medium text-[var(--color-gray-500)] italic px-1">
          ⚠ Aucune donnée disponible pour ce pays
        </p>
      )}
    </div>
  )
}

// ── Bloc de sélection cédante + branches + scope pour le mode "Par cédante" ────
interface CedanteOption { value: string; label: string; pays: string; branche: string }
interface CedanteBlockProps {
  label: string
  color: string
  cedanteOptions: CedanteOption[]
  selectedCedante: CedanteOption | null
  onCedanteChange: (c: CedanteOption | null) => void
  availBranches: string[]
  selectedBranches: string[]
  onBranchesChange: (b: string[]) => void
  loadingBranches: boolean
}

const CedanteBlock = ({
  label, color, cedanteOptions, selectedCedante, onCedanteChange,
  availBranches, selectedBranches, onBranchesChange, loadingBranches,
}: CedanteBlockProps) => {
  const isVieChecked = selectedBranches.includes('VIE')
  const nonVieBranches = availBranches.filter(b => b !== 'VIE')
  const isNonVieChecked = nonVieBranches.length > 0 && nonVieBranches.every(b => selectedBranches.includes(b))

  const handleVieChange = (checked: boolean) => {
    if (checked) {
      if (!selectedBranches.includes('VIE')) onBranchesChange([...selectedBranches, 'VIE'])
    } else {
      onBranchesChange(selectedBranches.filter(b => b !== 'VIE'))
    }
  }

  const handleNonVieChange = (checked: boolean) => {
    if (checked) {
      const next = new Set(selectedBranches)
      nonVieBranches.forEach(b => next.add(b))
      onBranchesChange(Array.from(next))
    } else {
      onBranchesChange(selectedBranches.filter(b => b === 'VIE'))
    }
  }

  return (
    <div className="flex-1 min-w-0 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
      {/* Dropdown cédante */}
      <Select
        {...rsProps}
        options={cedanteOptions}
        value={selectedCedante}
        onChange={v => { onCedanteChange(v as CedanteOption | null); onBranchesChange([]) }}
        placeholder="Tapez pour rechercher..."
        noOptionsMessage={() => 'Aucun résultat'}
        isClearable
        isSearchable
        classNamePrefix="rs"
      />
      {/* Dropdown branches */}
      {selectedCedante && (
        <Select
          {...rsProps}
          isMulti
          options={toOptions(availBranches)}
          value={toOptions(selectedBranches)}
          onChange={v => onBranchesChange(v.map((x: any) => x.value))}
          placeholder={loadingBranches ? 'Chargement…' : 'Toutes les branches'}
          noOptionsMessage={() => 'Aucune branche'}
          isDisabled={loadingBranches}
          classNamePrefix="rs"
        />
      )}
      {/* Checkboxes Vie / Non-Vie — sous le sélecteur de branches */}
      {selectedCedante && availBranches.length > 0 && (
        <div className="flex gap-3 mt-1">
          {availBranches.includes('VIE') && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isVieChecked}
                onChange={e => handleVieChange(e.target.checked)}
              />
              <span className="text-[0.78rem] font-medium text-gray-600">Vie</span>
            </label>
          )}
          {nonVieBranches.length > 0 && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isNonVieChecked}
                onChange={e => handleNonVieChange(e.target.checked)}
              />
              <span className="text-[0.78rem] font-medium text-gray-600">Non-vie</span>
            </label>
          )}
        </div>
      )}
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function Comparison() {
  const { filters, filterOptions } = useData()  // MODIFIÉ — ajout filterOptions
  const location = useLocation()

  // Mode de comparaison
  const [mode, setMode] = useState<'country' | 'cedante'>(() => {
    if (sessionStorage.getItem('compare_cedante_a')) return 'cedante'
    return 'country'
  })

  // Filtres LOCAUX (ignorent le filtre branche global)
  const [localYears, setLocalYears] = useState<number[]>([])
  const [localContractType, setLocalContractType] = useState<string[]>([])
  const [localSpcType, setLocalSpcType] = useState<string[]>([])

  // Helper : construire les params de base sans branche (filtres locaux + filtres globaux sans branche)
  const buildBaseParams = useCallback(() => {
    const { branche: _ignoreBranche, sous_branche: _ignoreSousBranche, ...filtersWithoutBranch } = filters
    const baseParams = filtersToParams(filtersWithoutBranch as any)
    if (localYears.length > 0) {
      baseParams['year'] = localYears.join(',')
      delete baseParams['uw_year_min']
      delete baseParams['uw_year_max']
      delete baseParams['uw_years_raw']
    }
    if (localContractType.length > 0) {
      baseParams['contract_type'] = localContractType.join(',')
      delete baseParams['type_of_contract']
    }
    if (localSpcType.length > 0) {
      baseParams['spc_type'] = localSpcType.join(',')
      delete baseParams['type_contrat_spc']
    }
    return baseParams
  }, [filters, localYears, localContractType, localSpcType])

  // ── État mode "Par pays" ────────────────────────────────────────────────────
  const [countryOptions, setCountryOptions] = useState<string[]>([])
  const [country1, setCountry1] = useState<string | null>(null)
  const [branches1, setBranches1] = useState<string[]>([])
  const [availBranches1, setAvailBranches1] = useState<string[]>([])
  const [loadingBranches1, setLoadingBranches1] = useState(false)
  const [noData1, setNoData1] = useState(false)

  const [country2, setCountry2] = useState<string | null>(null)
  const [branches2, setBranches2] = useState<string[]>([])
  const [availBranches2, setAvailBranches2] = useState<string[]>([])
  const [loadingBranches2, setLoadingBranches2] = useState(false)
  const [noData2, setNoData2] = useState(false)

  // ── État mode "Par cédante" ─────────────────────────────────────────────────
  const [cedanteOptions, setCedanteOptions] = useState<CedanteOption[]>([])
  const [cedanteA, setCedanteA] = useState<CedanteOption | null>(null)
  const [branchesA, setBranchesA] = useState<string[]>([])
  const [availBranchesA, setAvailBranchesA] = useState<string[]>([])
  const [loadingBranchesA, setLoadingBranchesA] = useState(false)

  const [cedanteB, setCedanteB] = useState<CedanteOption | null>(null)
  const [branchesB, setBranchesB] = useState<string[]>([])
  const [availBranchesB, setAvailBranchesB] = useState<string[]>([])
  const [loadingBranchesB, setLoadingBranchesB] = useState(false)

  // ── État résultat commun ────────────────────────────────────────────────────
  const [result, setResult] = useState<{ market_a: MarketKPIs; market_b: MarketKPIs } | null>(null)
  const [loading, setLoading] = useState(false)
  const [diversifN, setDiversifN] = useState(12)

  // Refs sessionStorage (pré-remplissage depuis d'autres pages)
  const pendingCedanteA = useRef<string | null>(sessionStorage.getItem('compare_cedante_a'))
  const pendingCountryA = useRef<string | null>(sessionStorage.getItem('compare_country_a'))

  useEffect(() => {
    sessionStorage.removeItem('compare_market_a')
    sessionStorage.removeItem('compare_market_b')
    sessionStorage.removeItem('compare_cedante_a')
    if (sessionStorage.getItem('compare_country_a')) {
      pendingCountryA.current = sessionStorage.getItem('compare_country_a')
      sessionStorage.removeItem('compare_country_a')
    }
  }, [])

  // AJOUTÉ — Charger la liste des pays (mode country)
  useEffect(() => {
    if (mode !== 'country') return
    const params = buildBaseParams()
    // Exclure pays_risque (circulaire) et passer top=1000 pour avoir tous les pays disponibles
    delete params['pays_risque']
    params['top'] = '1000'
    api.get('/kpis/by-country', { params }).then(res => {
      if (res.data) {
        const pays = res.data.map((c: any) => c.pays as string).filter(Boolean)
        
        // pré-remplissage sessionStorage
        if (pendingCountryA.current) {
          try {
            const { pays: p } = JSON.parse(pendingCountryA.current)
            if (p) {
              setCountry1(p)
              if (!pays.includes(p)) pays.unshift(p) // S'assurer que le pays est dans la dropdown
            }
          } catch {
             // erreur JSON silencieuse
          } finally {
            pendingCountryA.current = null // Toujours consommer le flag
          }
        }

        setCountryOptions(pays)
      }
    }).catch(console.error)
  }, [mode, buildBaseParams])

  // Charger options cédantes (mode cedante)
  useEffect(() => {
    if (mode !== 'cedante') return
    // Ignorer branche pour les cédantes aussi
    const { branche: _, sous_branche: __, ...filtersNoBranch } = filters
    const params = filtersToParams(filtersNoBranch as any)
    api.get('/kpis/by-cedante', { params: { ...params, top: 1000 } }).then(res => {
      if (res.data) {
        const opts = res.data.map((c: any) => ({
          value: c.cedante, label: c.cedante, pays: c.cedante, branche: '',
        }))
        setCedanteOptions(opts)
        if (pendingCedanteA.current) {
          try {
            const { cedante } = JSON.parse(pendingCedanteA.current)
            const match = opts.find((o: CedanteOption) => o.pays === cedante)
            if (match) { setCedanteA(match); pendingCedanteA.current = null }
          } catch { pendingCedanteA.current = null }
        }
      }
    }).catch(console.error)
  }, [mode, filters])

  // Charger branches pour le pays 1 (filtrage scope client-side dans CountryBlock)
  useEffect(() => {
    if (!country1) { setAvailBranches1([]); setBranches1([]); setNoData1(false); return }
    const ctrl = new AbortController()
    setLoadingBranches1(true)
    setNoData1(false)
    const params: Record<string, string> = { country: country1 }
    if (localYears.length > 0) params['year'] = localYears.join(',')
    if (localContractType.length > 0) params['contract_type'] = localContractType.join(',')
    if (localSpcType.length > 0) params['spc_type'] = localSpcType.join(',')
    api.get('/comparison/branches-by-country', { params, signal: ctrl.signal })
      .then(res => {
        const bs: string[] = res.data ?? []
        setAvailBranches1(bs)
        setNoData1(bs.length === 0)
        setBranches1(prev => prev.filter(b => bs.includes(b)))
      })
      .catch(e => { if (e.name !== 'CanceledError' && e.name !== 'AbortError') console.error(e) })
      .finally(() => setLoadingBranches1(false))
    return () => ctrl.abort()
  }, [country1, localYears, localContractType, localSpcType])

  // Charger branches pour le pays 2
  useEffect(() => {
    if (!country2) { setAvailBranches2([]); setBranches2([]); setNoData2(false); return }
    const ctrl = new AbortController()
    setLoadingBranches2(true)
    setNoData2(false)
    const params: Record<string, string> = { country: country2 }
    if (localYears.length > 0) params['year'] = localYears.join(',')
    if (localContractType.length > 0) params['contract_type'] = localContractType.join(',')
    if (localSpcType.length > 0) params['spc_type'] = localSpcType.join(',')
    api.get('/comparison/branches-by-country', { params, signal: ctrl.signal })
      .then(res => {
        const bs: string[] = res.data ?? []
        setAvailBranches2(bs)
        setNoData2(bs.length === 0)
        setBranches2(prev => prev.filter(b => bs.includes(b)))
      })
      .catch(e => { if (e.name !== 'CanceledError' && e.name !== 'AbortError') console.error(e) })
      .finally(() => setLoadingBranches2(false))
    return () => ctrl.abort()
  }, [country2, localYears, localContractType, localSpcType])

  // Fetch comparaison détaillée pays (auto, avec AbortController)
  const fetchCountryDetail = useCallback(() => {
    if (!country1 || !country2) return
    const ctrl = new AbortController()
    setLoading(true)
    setResult(null)
    const params: Record<string, string> = { country_1: country1, country_2: country2 }
    if (branches1.length > 0) params['branches_1'] = branches1.join(',')
    if (branches2.length > 0) params['branches_2'] = branches2.join(',')
    if (localYears.length > 0) params['year'] = localYears.join(',')
    if (localContractType.length > 0) params['contract_type'] = localContractType.join(',')
    if (localSpcType.length > 0) params['spc_type'] = localSpcType.join(',')
    api.get('/comparison/by-country-detail', { params, signal: ctrl.signal })
      .then(res => setResult(res.data))
      .catch(e => { if (e.name !== 'CanceledError' && e.name !== 'AbortError') console.error(e) })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [country1, country2, branches1, branches2, localYears, localContractType, localSpcType])

  // AJOUTÉ — Déclenchement automatique mode pays
  useEffect(() => {
    if (mode === 'country' && country1 && country2) {
      const cleanup = fetchCountryDetail()
      return cleanup
    }
  }, [mode, fetchCountryDetail, country1, country2])

  // Charger branches pour la cédante A
  useEffect(() => {
    if (!cedanteA) { setAvailBranchesA([]); setBranchesA([]); return }
    const ctrl = new AbortController()
    setLoadingBranchesA(true)
    const params: Record<string, string> = { cedante: cedanteA.pays }
    if (localYears.length > 0) params['year'] = localYears.join(',')
    if (localContractType.length > 0) params['contract_type'] = localContractType.join(',')
    if (localSpcType.length > 0) params['spc_type'] = localSpcType.join(',')
    api.get('/comparison/branches-by-cedante', { params, signal: ctrl.signal })
      .then(res => {
        const bs: string[] = res.data ?? []
        setAvailBranchesA(bs)
        setBranchesA(prev => prev.filter(b => bs.includes(b)))
      })
      .catch(e => { if (e.name !== 'CanceledError' && e.name !== 'AbortError') console.error(e) })
      .finally(() => setLoadingBranchesA(false))
    return () => ctrl.abort()
  }, [cedanteA, localYears, localContractType, localSpcType])

  // Charger branches pour la cédante B
  useEffect(() => {
    if (!cedanteB) { setAvailBranchesB([]); setBranchesB([]); return }
    const ctrl = new AbortController()
    setLoadingBranchesB(true)
    const params: Record<string, string> = { cedante: cedanteB.pays }
    if (localYears.length > 0) params['year'] = localYears.join(',')
    if (localContractType.length > 0) params['contract_type'] = localContractType.join(',')
    if (localSpcType.length > 0) params['spc_type'] = localSpcType.join(',')
    api.get('/comparison/branches-by-cedante', { params, signal: ctrl.signal })
      .then(res => {
        const bs: string[] = res.data ?? []
        setAvailBranchesB(bs)
        setBranchesB(prev => prev.filter(b => bs.includes(b)))
      })
      .catch(e => { if (e.name !== 'CanceledError' && e.name !== 'AbortError') console.error(e) })
      .finally(() => setLoadingBranchesB(false))
    return () => ctrl.abort()
  }, [cedanteB, localYears, localContractType, localSpcType])

  // Fetch comparaison cédante (auto)
  const fetchCedante = useCallback(async () => {
    if (!cedanteA || !cedanteB) return
    setLoading(true)
    try {
      const baseParams = buildBaseParams()
      if (branchesA.length > 0) baseParams['branches_a'] = branchesA.join(',')
      if (branchesB.length > 0) baseParams['branches_b'] = branchesB.join(',')
      const res = await api.get('/comparison/by-cedante', {
        params: { cedante_a: cedanteA.pays, cedante_b: cedanteB.pays, ...baseParams }
      })
      const mapCedante = (c: any) => ({
        pays: c.cedante, branche: c.branche_label || c.pays_cedante || '',
        written_premium: c.written_premium ?? 0, resultat: c.resultat ?? 0,
        avg_ulr: c.avg_ulr ?? 0, sum_insured: c.sum_insured ?? 0,
        contract_count: c.contract_count ?? 0, avg_commission: c.avg_commission ?? 0,
        type_cedante: c.type_cedante, branches_actives: c.branches_actives ?? 0,
        fac_saturation_alerts: c.fac_saturation_alerts ?? [],
        active_branches: c.active_branches ?? [],
        by_year: (c.by_year || []).map((y: any) => ({
          year: y.year,
          total_written_premium: y.total_written_premium ?? y.written_premium ?? 0,
          avg_ulr: y.avg_ulr ?? 0,
          total_resultat: y.total_resultat ?? y.resultat ?? 0,
        })),
        radar: c.radar ?? {},
      })
      setResult({ market_a: mapCedante(res.data.cedante_a), market_b: mapCedante(res.data.cedante_b) })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [cedanteA, cedanteB, branchesA, branchesB, buildBaseParams])

  useEffect(() => {
    if (mode === 'cedante' && cedanteA && cedanteB) fetchCedante()
  }, [mode, fetchCedante, cedanteA, cedanteB])

  // Mémos graphiques
  const radarData = React.useMemo(() =>
    result ? Object.keys(result.market_a.radar).map(metric => ({
      metric, marketA: result.market_a.radar[metric], marketB: result.market_b.radar[metric],
    })) : []
  , [result])

  const evolutionData = React.useMemo(() => {
    if (!result) return []
    const yearMap: Record<number, any> = {}
    result.market_a.by_year.forEach(d => {
      yearMap[d.year] = { year: d.year, premA: d.total_written_premium, lrA: d.avg_ulr }
    })
    result.market_b.by_year.forEach(d => {
      if (!yearMap[d.year]) yearMap[d.year] = { year: d.year }
      yearMap[d.year].premB = d.total_written_premium
      yearMap[d.year].lrB = d.avg_ulr
    })
    return Object.values(yearMap).sort((a, b) => a.year - b.year)
  }, [result])

  // ── AJOUTÉ — Bloc de 3 filtres locaux ──────────────────────────────────────
  const SPC_OPTIONS = ['FAC', 'TTY', 'TTE']
  const uwYears = filterOptions?.underwriting_years ?? []
  const contractTypeOptions = filterOptions?.type_of_contract ?? []

  const localFilterBar = (
    <div className="bg-white rounded-xl border border-[var(--color-gray-100)] shadow-sm px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontal size={13} className="text-[var(--color-navy)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">Filtres de la vue</span>
        {/* Badge compteur filtres actifs */}
        {(localYears.length > 0 || localContractType.length > 0 || localSpcType.length > 0) && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'var(--color-navy)' }}>
            {[localYears.length > 0, localContractType.length > 0, localSpcType.length > 0].filter(Boolean).length}
          </span>
        )}
        {(localYears.length > 0 || localContractType.length > 0 || localSpcType.length > 0) && (
          <button
            onClick={() => { setLocalYears([]); setLocalContractType([]); setLocalSpcType([]) }}
            className="ml-auto text-[10px] font-bold text-[var(--color-gray-500)] hover:text-[var(--color-red)] transition-colors"
          >
            Réinitialiser
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Filtre 1 : Année de souscription */}
        <div>
          <label className="block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]">
            Année de souscription
          </label>
          <Select
            {...rsProps}
            isMulti
            options={toNumOptions(uwYears)}
            value={toNumOptions(localYears)}
            onChange={v => setLocalYears(v.map((x: any) => x.value))}
            placeholder="Toutes les années…"
            classNamePrefix="rs"
          />
        </div>
        {/* Filtre 2 : Type de contrat */}
        <div>
          <label className="block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]">
            Type de contrat
          </label>
          <Select
            {...rsProps}
            isMulti
            options={toOptions(contractTypeOptions)}
            value={toOptions(localContractType)}
            onChange={v => setLocalContractType(v.map((x: any) => x.value))}
            placeholder="Tous les types…"
            classNamePrefix="rs"
          />
        </div>
        {/* Filtre 3 : Type SPC (FAC / TTY / TTE) */}
        <div>
          <label className="block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]">
            Type SPC
          </label>
          <Select
            {...rsProps}
            isMulti
            options={toOptions(SPC_OPTIONS)}
            value={toOptions(localSpcType)}
            onChange={v => setLocalSpcType(v.map((x: any) => x.value))}
            placeholder="FAC / TTY / TTE…"
            classNamePrefix="rs"
          />
        </div>
      </div>
    </div>
  )

  // ── Vue résultat ───────────────────────────────────────────────────────────
  const resultView = React.useMemo(() => {
    if (!result || loading) return null
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header Blocks A et B */}
        <div className="flex gap-6 relative">
          <KPIColHeader kpis={result.market_a} headerBg="linear-gradient(135deg, #1E2D3D, var(--color-navy))" label={mode === 'cedante' ? 'Cédante A' : 'Pays A'} />
          <KPIColHeader kpis={result.market_b} headerBg="linear-gradient(135deg, #4E6820, hsl(83,52%,36%))" label={mode === 'cedante' ? 'Cédante B' : 'Pays B'} />
        </div>

        {/* KPI rows */}
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] overflow-hidden">
          <KPIRow label="Prime écrite" valA={result.market_a.written_premium} valB={result.market_b.written_premium} formatFn={v => formatCompact(v)} />
          <KPIRow label="Résultat net" valA={result.market_a.resultat} valB={result.market_b.resultat} formatFn={v => formatCompact(v)} />
          <KPIRow label="Loss Ratio" valA={result.market_a.avg_ulr} valB={result.market_b.avg_ulr} formatFn={v => formatPercent(v)} />
          <KPIRow label="Somme assurée" valA={result.market_a.sum_insured} valB={result.market_b.sum_insured} formatFn={v => formatCompact(v)} />
          <KPIRow label="Contrats" valA={result.market_a.contract_count} valB={result.market_b.contract_count} formatFn={v => v.toLocaleString('fr-FR')} />
          <KPIRow label="Commission moy." valA={result.market_a.avg_commission} valB={result.market_b.avg_commission} formatFn={v => formatPercent(v)} />
        </div>

        {/* Diversification — mode cédante uniquement */}
        {mode === 'cedante' && (
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-6 overflow-hidden relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-navy)]">Rapport de Diversification par Branche</h3>
                <p className="text-sm text-[var(--color-gray-500)] mt-1">Analyse de la répartition de l'activité sur l'ensemble des branches du marché.</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-gray-500)] uppercase">
                Total branches (N):
                <input
                  type="number" min={1} max={20} value={diversifN}
                  onChange={e => setDiversifN(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className="w-16 rounded border border-[var(--color-gray-200)] p-1.5 text-center text-[var(--color-navy)] font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[{ key: 'A', kpis: result.market_a }, { key: 'B', kpis: result.market_b }].map(({ key, kpis }) => {
                const activeBranchesCount = kpis.branches_actives || 0
                const rawPct = Math.round((activeBranchesCount / diversifN) * 100)
                const pct = Math.min(rawPct, 100)
                const good = rawPct >= 40
                const colorCode = good ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)'
                const saturated = new Set(kpis.fac_saturation_alerts || [])
                const branches = kpis.active_branches || []
                return (
                  <div key={key} className="bg-[var(--color-off-white)] rounded-xl p-5 border border-[var(--color-gray-100)]">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-gray-500)]">Cédante {key}</span>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full border" style={{ color: colorCode, borderColor: colorCode }}>
                        {good ? 'Portefeuille diversifié' : 'Concentration élevée'}
                      </span>
                    </div>
                    <div className="mb-4">
                      <div className="text-4xl font-mono font-bold mb-1" style={{ color: colorCode }}>{rawPct}%</div>
                      <div className="text-xs text-[var(--color-gray-500)] mb-2">
                        <span className="font-bold text-[var(--color-navy)]">{activeBranchesCount}</span> branches actives sur <span className="font-bold text-[var(--color-navy)]">{diversifN}</span>
                      </div>
                      <div className="w-full bg-[var(--color-gray-200)] h-3 rounded-full overflow-hidden border border-[var(--color-gray-300)]">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: colorCode }} />
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-[var(--color-navy)] mb-2">Détail des branches explorées</h4>
                    <div className="max-h-[220px] overflow-y-auto pr-1">
                      <ul className="space-y-2">
                        {branches.map((b, i) => {
                          const isSaturated = saturated.has(b.branche)
                          return (
                            <li key={`${b.branche}-${i}`} className="flex justify-between items-center p-2 rounded bg-white border border-[var(--color-gray-200)]">
                              <div className="flex items-center gap-2">
                                {isSaturated ? <AlertTriangle size={13} color="hsl(358,66%,54%)" className="animate-pulse" /> : <CheckCircle size={13} color="hsl(83,52%,36%)" />}
                                <span className="text-xs font-bold text-[var(--color-navy)]">{b.branche}</span>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-[var(--color-gray-500)]">{formatCompact(b.total_written_premium || 0)} prime</span>
                            </li>
                          )
                        })}
                        {diversifN > activeBranchesCount && [...Array(diversifN - activeBranchesCount)].map((_, i) => (
                          <li key={`inactive-${key}-${i}`} className="flex justify-between items-center p-2 rounded bg-white border border-[var(--color-gray-200)] opacity-60">
                            <div className="flex items-center gap-2">
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--color-gray-300)]" />
                              <span className="text-xs font-semibold text-[var(--color-gray-500)] italic">Branche non explorée</span>
                            </div>
                            <span className="text-[10px] font-mono text-[var(--color-gray-400)]">0 prime</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Radar + Évolution */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl border border-[var(--color-gray-100)] shadow-sm">
            <h3 className="text-sm font-bold text-[var(--color-navy)] mb-4">Radar de performances comparé</h3>
            <RadarChartComponent
              data={radarData}
              labelA={result.market_a.pays}
              labelB={result.market_b.pays}
            />
          </div>
          <div className="bg-white p-5 rounded-xl border border-[var(--color-gray-100)] shadow-sm">
            <h3 className="text-sm font-bold text-[var(--color-navy)] mb-4">Évolution Prime & LR</h3>
            {evolutionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={evolutionData} margin={{ right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--color-gray-500)', fontSize: 10, fontWeight: 500 }} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: 'var(--color-gray-500)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--color-gray-500)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    formatter={(v: any, name: string) => [name.includes('LR%') ? formatPercent(v) : formatCompact(v), name]}
                    contentStyle={{ background: 'hsla(209,28%,18%,0.92)', backdropFilter: 'blur(16px)', border: '1px solid hsl(83,52%,36%)', borderRadius: 10, color: '#FFF' }}
                  />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-[var(--color-gray-500)] text-xs font-semibold">{v}</span>} />
                  <Line connectNulls yAxisId="left" type="monotone" dataKey="premA" name="Prime A" stroke="var(--color-navy)" strokeWidth={2.5} dot={{ r: 4, fill: '#FFFFFF', stroke: 'var(--color-navy)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line connectNulls yAxisId="right" type="monotone" dataKey="lrA" name="LR% A" stroke="var(--color-navy)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                  <Line connectNulls yAxisId="left" type="monotone" dataKey="premB" name="Prime B" stroke="hsl(83,52%,36%)" strokeWidth={2.5} dot={{ r: 4, fill: '#FFFFFF', stroke: 'hsl(83,52%,36%)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line connectNulls yAxisId="right" type="monotone" dataKey="lrB" name="LR% B" stroke="hsl(83,52%,36%)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-center py-8 font-medium text-[var(--color-gray-500)]">Données insuffisantes</p>
            )}
          </div>
        </div>
      </div>
    )
  }, [result, loading, radarData, evolutionData, mode, diversifN])

  // ── Render principal ───────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4 min-h-[100vh] bg-[var(--color-off-white)]">
      <ActiveFiltersBar />

      {/* MODIFIÉ — Remplacement de <PageFilterPanel /> par le bloc de 3 filtres locaux */}
      {localFilterBar}

      {/* Titre + switch de mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-navy)] mb-1">Comparaison de portefeuilles</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-gray-500)]">
            {mode === 'cedante' ? 'Analyse côte à côte de deux cédantes' : 'Analyse côte à côte de la performance globale de deux pays'}
          </p>
        </div>
        <div className="inline-flex bg-white rounded-lg p-1 border shadow-sm flex-wrap gap-1" style={{ borderColor: 'var(--color-gray-200)' }}>
          <button
            onClick={() => { setMode('country'); setResult(null) }}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'country' ? 'bg-[var(--color-navy)] text-white shadow-md' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}>
            Par pays
          </button>
          <button
            onClick={() => { setMode('cedante'); setResult(null) }}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'cedante' ? 'bg-[var(--color-navy)] text-white shadow-md' : 'text-[var(--color-navy)]'}`}>
            Par cédante
          </button>
        </div>
      </div>

      {/* ── Sélecteurs mode "Par pays" ────────────────────────────────────── */}
      {mode === 'country' && (
        <div className="bg-white p-5 rounded-xl border border-[var(--color-gray-100)] shadow-sm">
          <div className="flex gap-6 items-start flex-wrap">
            <CountryBlock
              label="Pays A (Référence)"
              color="var(--color-navy)"
              countryOptions={countryOptions.filter(c => c !== country2)}
              selectedCountry={country1}
              onCountryChange={c => { setCountry1(c); setBranches1([]) }}
              availBranches={availBranches1}
              selectedBranches={branches1}
              onBranchesChange={setBranches1}
              loadingBranches={loadingBranches1}
              noData={noData1}
            />
            <div className="flex-shrink-0 flex flex-col items-center justify-center pt-6 px-2">
              <div className="w-8 h-8 rounded-full bg-[var(--color-off-white)] flex items-center justify-center border border-[var(--color-gray-200)]">
                <span className="text-[10px] font-bold text-[var(--color-gray-500)]">VS</span>
              </div>
            </div>
            <CountryBlock
              label="Pays B (Comparaison)"
              color="hsl(83,52%,36%)"
              countryOptions={countryOptions.filter(c => c !== country1)}
              selectedCountry={country2}
              onCountryChange={c => { setCountry2(c); setBranches2([]) }}
              availBranches={availBranches2}
              selectedBranches={branches2}
              onBranchesChange={setBranches2}
              loadingBranches={loadingBranches2}
              noData={noData2}
            />
          </div>
        </div>
      )}

      {/* ── Sélecteurs mode "Par cédante" ───────────────────────────────── */}
      {mode === 'cedante' && (
        <div className="bg-white p-5 rounded-xl border border-[var(--color-gray-100)] shadow-sm">
          <div className="flex gap-6 items-start flex-wrap">
            <CedanteBlock
              label="Cédante A (Référence)"
              color="var(--color-navy)"
              cedanteOptions={cedanteOptions.filter(o => o.value !== cedanteB?.value)}
              selectedCedante={cedanteA}
              onCedanteChange={setCedanteA}
              availBranches={availBranchesA}
              selectedBranches={branchesA}
              onBranchesChange={setBranchesA}
              loadingBranches={loadingBranchesA}
            />
            <div className="flex-shrink-0 flex flex-col items-center justify-center pt-6 px-2">
              <div className="w-8 h-8 rounded-full bg-[var(--color-off-white)] flex items-center justify-center border border-[var(--color-gray-200)]">
                <span className="text-[10px] font-bold text-[var(--color-gray-500)]">VS</span>
              </div>
            </div>
            <CedanteBlock
              label="Cédante B (Comparaison)"
              color="hsl(83,52%,36%)"
              cedanteOptions={cedanteOptions.filter(o => o.value !== cedanteA?.value)}
              selectedCedante={cedanteB}
              onCedanteChange={setCedanteB}
              availBranches={availBranchesB}
              selectedBranches={branchesB}
              onBranchesChange={setBranchesB}
              loadingBranches={loadingBranchesB}
            />
          </div>
        </div>
      )}

      {/* État vide */}
      {!result && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--color-gray-500)]">
          <GitCompare size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">
            Sélectionnez 2 {mode === 'cedante' ? 'cédantes' : 'pays'} pour analyser les données de manière visuelle
          </p>
        </div>
      )}

      {loading && <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />}

      {resultView}
    </div>
  )
}
