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
  uw_year_min: number | null
  uw_year_max: number | null
  statuts: string[]
  type_of_contract: string[]
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
  uw_year_min: null,
  uw_year_max: null,
  statuts: ['CONFIRMED', 'CLOSED', 'ACCEPTED', 'OFFER LOGGED', 'COMMUTED', 'IDENTF'],
  type_of_contract: [],
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
}

export interface KPISummary {
  total_written_premium: number
  total_resultat: number
  avg_ulr: number
  total_sum_insured: number
  contract_count: number
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
  statuts: string[]
  type_of_contract: string[]
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
  filters: FilterState
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>
  resetFilters: () => void
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

/** Build query params string from FilterState */
export function filtersToParams(filters: FilterState): Record<string, string> {
  const params: Record<string, string> = {}
  const add = (key: string, val: string[] | string | number | null | undefined) => {
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
  add('uw_year_min', filters.uw_year_min ?? undefined)
  add('uw_year_max', filters.uw_year_max ?? undefined)
  add('statuts', filters.statuts)
  add('type_of_contract', filters.type_of_contract)
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
  return params
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [kpiSummary, setKpiSummary] = useState<KPISummary | null>(null)
  const [kpiLoading, setKpiLoading] = useState(false)
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null)
  const [scoringCriteria, setScoringCriteria] = useState<ScoringCriterion[]>(DEFAULT_SCORING)
  const [refreshing, setRefreshing] = useState(false)
  const kpiTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadFilterOptions = useCallback(() => {
    api.get(API_ROUTES.DATA.FILTER_OPTIONS).then((r) => setFilterOptions(r.data)).catch(console.error)
    api.get(API_ROUTES.DATA.STATUS).then((r) => setDataStatus(r.data)).catch(console.error)
  }, [])

  const loadKPIs = useCallback(() => {
    if (kpiTimer.current) clearTimeout(kpiTimer.current)
    kpiTimer.current = setTimeout(async () => {
      setKpiLoading(true)
      try {
        const params = filtersToParams(filters)
        const r = await api.get(API_ROUTES.KPIS.SUMMARY, { params })
        setKpiSummary(r.data)
      } catch (e) {
        console.error(e)
      } finally {
        setKpiLoading(false)
      }
    }, 400)
  }, [filters])

  const refreshData = useCallback(async () => {
    setRefreshing(true)
    try {
      await api.post(API_ROUTES.DATA.REFRESH)
      await Promise.all([loadFilterOptions(), loadKPIs()])
    } finally {
      setRefreshing(false)
    }
  }, [loadFilterOptions, loadKPIs])

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [])

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
      filters, setFilters, resetFilters,
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
