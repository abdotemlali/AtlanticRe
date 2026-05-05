import React, {
  createContext, useContext, useState, useCallback,
  useEffect, ReactNode, useRef,
} from 'react'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'

export interface FilterState {
  perimetre: string[]
  type_contrat_spc: string[]
  specialite: string[]
  int_spc_search: string
  branche: string[]
  sous_branche: string[]
  pays_risque: string[]
  pays_cedante: string[]
  courtier: string[]
  cedante: string[]
  underwriting_years: number[]
  uw_year_min: number | null
  uw_year_max: number | null
  uw_years: number[]           // C1: exact year list (non-contiguous), priority over uw_year_min/max
  statuts: string[]
  type_of_contract: string[]
  type_cedante: string[]
  prime_min: number | null
  prime_max: number | null
  ulr_min: number | null
  ulr_max: number | null
  share_min: number | null
  share_max: number | null
  commission_min: number | null
  commission_max: number | null
  courtage_min: number | null
  courtage_max: number | null
  african_markets_only: boolean   // UI flag: afficher un seul chip "Marchés Africains" au lieu de 52 chips
  vie_non_vie_view: string         // "VIE" | "NON_VIE" | "" (all)
  insured_name: string[]           // Assuré (INSURED_NAME_NORM)
}

export const DEFAULT_FILTERS: FilterState = {
  perimetre: [],
  type_contrat_spc: [],
  specialite: [],
  int_spc_search: '',
  branche: [],
  sous_branche: [],
  pays_risque: [],
  pays_cedante: [],
  courtier: [],
  cedante: [],
  underwriting_years: [],
  uw_year_min: null,
  uw_year_max: null,
  uw_years: [],
  statuts: [],
  type_of_contract: [],
  type_cedante: [],
  prime_min: null,
  prime_max: null,
  ulr_min: null,
  ulr_max: null,
  share_min: null,
  share_max: null,
  commission_min: null,
  commission_max: null,
  courtage_min: null,
  courtage_max: null,
  african_markets_only: false,
  vie_non_vie_view: '',
  insured_name: [],
}

export interface KPISummary {
  total_written_premium: number
  total_resultat: number
  avg_ulr: number
  total_sum_insured: number
  contract_count: number
  ratio_resultat_prime: number
}

export interface FilterOptions {
  perimetre: string[]
  type_contrat_spc: string[]
  specialite: string[]
  branc: string[]
  sous_branche: Record<string, string[]>
  pays_risque: string[]
  pays_cedante: string[]
  courtiers: string[]
  cedantes: string[]
  underwriting_years: number[]
  uw_year_default?: number
  statuts: string[]
  type_of_contract: string[]
  type_cedante_options: string[]
  insured_names: string[]
}

export interface ScoringCriterion {
  key: string
  label: string
  weight: number
  threshold: number
  direction: 'lower_is_better' | 'higher_is_better'
}

export interface DataStatus {
  loaded: boolean
  last_loaded: string | null
  row_count: number
  file_path: string
}

interface DataContextType {
  filters: FilterState           // Alias pour backward compatibility = appliedFilters
  appliedFilters: FilterState
  draftFilters: FilterState
  setFilters: React.Dispatch<React.SetStateAction<FilterState>> // Alias vers setDraftFilters
  setDraftFilters: React.Dispatch<React.SetStateAction<FilterState>>
  applyFilters: () => void
  resetFilters: () => void
  resetToDefaultYear: () => void   // C3: reset year filter to uw_year_default (year N)
  filterOptions: FilterOptions | null
  kpiSummary: KPISummary | null
  kpiLoading: boolean
  dataStatus: DataStatus | null
  scoringCriteria: ScoringCriterion[]
  setScoringCriteria: React.Dispatch<React.SetStateAction<ScoringCriterion[]>>
  refreshData: () => Promise<void>
  refreshing: boolean
  loadFilterOptions: () => void
  loadKPIs: () => void
}

const DataContext = createContext<DataContextType | null>(null)

const DEFAULT_SCORING: ScoringCriterion[] = [
  { key: 'ulr', label: 'Loss Ratio (ULR)', weight: 40, threshold: 70, direction: 'lower_is_better' },
  { key: 'written_premium', label: 'Prime écrite (volume)', weight: 25, threshold: 100000, direction: 'higher_is_better' },
  { key: 'resultat', label: 'Résultat net', weight: 20, threshold: 0, direction: 'higher_is_better' },
  { key: 'commi', label: 'Taux de commission', weight: 10, threshold: 35, direction: 'lower_is_better' },
  { key: 'share_written', label: 'Part souscrite (Share)', weight: 5, threshold: 5, direction: 'higher_is_better' },
]

import { useDebounce } from '../hooks/useDebounce'

/** Build query params string from FilterState */
export function filtersToParams(filters: FilterState): Record<string, string> {
  const params: Record<string, string> = {}
  const add = (key: string, val: string[] | number[] | string | number | null | undefined) => {
    if (val === null || val === undefined) return
    if (Array.isArray(val) && val.length > 0) params[key] = val.join(',')
    else if (typeof val === 'string' && val.trim()) params[key] = val
    else if (typeof val === 'number') params[key] = String(val)
  }
  add('perimetre', filters.perimetre)
  add('type_contrat_spc', filters.type_contrat_spc)
  add('specialite', filters.specialite)
  add('int_spc_search', filters.int_spc_search)
  add('branche', filters.branche)
  add('sous_branche', filters.sous_branche)
  add('pays_risque', filters.pays_risque)
  add('pays_cedante', filters.pays_cedante)
  add('courtier', filters.courtier)
  add('cedante', filters.cedante)
  // C1: uw_years (exact list) takes priority — send as uw_years_raw for backend
  if (filters.uw_years.length > 0) {
    params['uw_years_raw'] = filters.uw_years.join(',')
  } else {
    if (filters.uw_year_min != null) params['uw_year_min'] = String(filters.uw_year_min)
    if (filters.uw_year_max != null) params['uw_year_max'] = String(filters.uw_year_max)
  }
  add('statuts', filters.statuts)
  add('type_of_contract', filters.type_of_contract)
  add('type_cedante', filters.type_cedante)
  add('prime_min', filters.prime_min ?? undefined)
  add('prime_max', filters.prime_max ?? undefined)
  add('ulr_min', filters.ulr_min ?? undefined)
  add('ulr_max', filters.ulr_max ?? undefined)
  add('share_min', filters.share_min ?? undefined)
  add('share_max', filters.share_max ?? undefined)
  add('commission_min', filters.commission_min ?? undefined)
  add('commission_max', filters.commission_max ?? undefined)
  add('courtage_min', filters.courtage_min ?? undefined)
  add('courtage_max', filters.courtage_max ?? undefined)
  add('vie_non_vie_view', filters.vie_non_vie_view || undefined)
  add('insured_name', filters.insured_name)
  return params
}

/**
 * Same as filtersToParams but excludes one specific filter dimension.
 * Used for "frozen graph" logic: fetch the full distribution ignoring the filter
 * of the same dimension as the chart (e.g. branch chart ignores branche filter).
 */
export function filtersToParamsExcluding(
  filters: FilterState,
  exclude: 'branche' | 'type_contrat_spc' | 'specialite' | 'cedante' | 'courtier' | 'type_of_contract' | 'pays_risque'
): Record<string, string> {
  const f: FilterState = { ...filters }
  if (exclude === 'branche') f.branche = []
  if (exclude === 'type_contrat_spc') f.type_contrat_spc = []
  if (exclude === 'specialite') f.specialite = []
  if (exclude === 'cedante') f.cedante = []
  if (exclude === 'courtier') f.courtier = []
  if (exclude === 'type_of_contract') f.type_of_contract = []
  if (exclude === 'pays_risque') f.pays_risque = []
  return filtersToParams(f)
}

/**
 * Same as filtersToParams but strips ALL year-related params.
 * Use this for time-series endpoints (by-year, evolution) that must span all years.
 */
export function filtersToParamsNoYear(filters: FilterState): Record<string, string> {
  const params = filtersToParams(filters)
  delete params['uw_year_min']
  delete params['uw_year_max']
  delete params['uw_years_raw']
  delete params['underwriting_years']
  return params
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [draftFilters, setDraftFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const appliedFilters = useDebounce(draftFilters, 300)
  
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [kpiSummary, setKpiSummary] = useState<KPISummary | null>(null)
  const [kpiLoading, setKpiLoading] = useState(false)
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null)
  const [scoringCriteria, setScoringCriteria] = useState<ScoringCriterion[]>(DEFAULT_SCORING)
  const [refreshing, setRefreshing] = useState(false)
  const kpiTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadFilterOptions = useCallback(() => {
    api.get(API_ROUTES.DATA.FILTER_OPTIONS).then((r) => {
      setFilterOptions(r.data)
      // Feature 1: auto-init year filter to most recent year (only if no year filter is active)
      const defaultYear: number | undefined = r.data.uw_year_default
      if (defaultYear) {
        setDraftFilters(prev => {
          if (prev.uw_year_min === null && prev.uw_year_max === null) {
            return { ...prev, uw_year_min: defaultYear, uw_year_max: defaultYear }
          }
          return prev
        })
      }
    }).catch(console.error)
    api.get(API_ROUTES.DATA.STATUS).then((r) => setDataStatus(r.data)).catch(console.error)
  }, [])

  const loadKPIs = useCallback(() => {
    if (kpiTimer.current) clearTimeout(kpiTimer.current)
    kpiTimer.current = setTimeout(async () => {
      setKpiLoading(true)
      try {
        const params = filtersToParams(appliedFilters)
        const r = await api.get(API_ROUTES.KPIS.SUMMARY, { params })
        setKpiSummary(r.data)
      } catch (e) {
        console.error(e)
      } finally {
        setKpiLoading(false)
      }
    }, 400)
  }, [appliedFilters])

  const refreshData = useCallback(async () => {
    setRefreshing(true)
    try {
      await api.post(API_ROUTES.DATA.REFRESH)
      await Promise.all([loadFilterOptions(), loadKPIs()])
    } finally {
      setRefreshing(false)
    }
  }, [loadFilterOptions, loadKPIs])

  const applyFilters = useCallback(() => {}, []) // Synchro est gérée automatiquement via useDebounce 
  const resetFilters = useCallback(() => setDraftFilters(DEFAULT_FILTERS), [])

  // C3: Reset year filter to default year N (from filterOptions)
  const resetToDefaultYear = useCallback(() => {
    const defaultYear = filterOptions?.uw_year_default
    if (defaultYear) {
      setDraftFilters(prev => ({
        ...prev,
        uw_years: [],
        uw_year_min: defaultYear,
        uw_year_max: defaultYear,
      }))
    }
  }, [filterOptions?.uw_year_default])

  // Load on mount
  useEffect(() => {
    loadFilterOptions()
  }, [loadFilterOptions])

  // Load KPIs whenever filters change
  useEffect(() => {
    loadKPIs()
  }, [loadKPIs])

  return (
    <DataContext.Provider value={{
      filters: appliedFilters,
      appliedFilters,
      draftFilters,
      setFilters: setDraftFilters,
      setDraftFilters,
      applyFilters,
      resetFilters, resetToDefaultYear,
      filterOptions, kpiSummary, kpiLoading, dataStatus,
      scoringCriteria, setScoringCriteria,
      refreshData, refreshing,
      loadFilterOptions, loadKPIs,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
