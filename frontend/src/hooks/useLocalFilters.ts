/**
 * useLocalFilters — Reusable hook for page-local filter state.
 *
 * Eliminates the ~100-line local filter pattern previously
 * copy-pasted in CedanteAnalysis, Analysis, BrokerDetail,
 * BrokerAnalysis, and Comparison.
 */
import { useState, useMemo } from 'react'
import { LIFE_BRANCH } from '../constants/styles'
import { toOptions } from '../utils/formatters'
import { getAvailableAfricanMarkets } from '../constants/africanMarkets'

export interface LocalFilterState {
  uwYears: number[]
  uwYearMin: number | null
  uwYearMax: number | null
  branches: string[]
  typeSpc: string[]
  typeOfContract: string[]
  brancheScope: { vie: boolean; nonVie: boolean }
  cedantes: string[]
  brokers: string[]
  countries: string[]
  /** AE / AM perimetre filter */
  perimetre: string[]
  /** Toggle: filter on African markets (pays_risque) */
  africanMarketsOnly: boolean
}

export interface UseLocalFiltersReturn {
  // State values
  state: LocalFilterState
  // Individual setters
  setUwYears: (v: number[]) => void
  setUwYearMin: (v: number | null) => void
  setUwYearMax: (v: number | null) => void
  setBranches: (v: string[]) => void
  setTypeSpc: (v: string[]) => void
  setTypeOfContract: (v: string[]) => void
  setCedantes: (v: string[]) => void
  setBrokers: (v: string[]) => void
  setCountries: (v: string[]) => void
  setBrancheScope: (v: { vie: boolean; nonVie: boolean }) => void
  setPerimetre: (v: string[]) => void
  setAfricanMarketsOnly: (v: boolean) => void
  // Convenience
  applyBrancheScope: (vie: boolean, nonVie: boolean) => void
  reset: () => void
  activeCount: number
  hasFilters: boolean
  /** Build API query params from local state */
  buildParams: (availableCountries?: string[]) => Record<string, string>
  /** Build params excluding the branch filter (for pie charts etc.) */
  buildParamsNoBranch: (availableCountries?: string[]) => Record<string, string>
  /** Branch options respecting vie/non-vie scope */
  brancheOptions: (allBranches: string[]) => { value: string; label: string }[]
}

export function useLocalFilters(): UseLocalFiltersReturn {
  const [uwYears, setUwYears] = useState<number[]>([])
  const [uwYearMin, setUwYearMin] = useState<number | null>(null)
  const [uwYearMax, setUwYearMax] = useState<number | null>(null)
  const [branches, setBranches] = useState<string[]>([])
  const [typeSpc, setTypeSpc] = useState<string[]>([])
  const [typeOfContract, setTypeOfContract] = useState<string[]>([])
  const [cedantes, setCedantes] = useState<string[]>([])
  const [brokers, setBrokers] = useState<string[]>([])
  const [countries, setCountries] = useState<string[]>([])
  const [brancheScope, setBrancheScope] = useState({ vie: true, nonVie: true })
  const [perimetre, setPerimetre] = useState<string[]>([])
  const [africanMarketsOnly, setAfricanMarketsOnly] = useState(false)

  const state: LocalFilterState = {
    uwYears, uwYearMin, uwYearMax,
    branches, typeSpc, typeOfContract, brancheScope,
    cedantes, brokers, countries,
    perimetre, africanMarketsOnly,
  }

  const reset = () => {
    setUwYears([])
    setUwYearMin(null)
    setUwYearMax(null)
    setBranches([])
    setTypeSpc([])
    setTypeOfContract([])
    setCedantes([])
    setBrokers([])
    setCountries([])
    setBrancheScope({ vie: true, nonVie: true })
    setPerimetre([])
    setAfricanMarketsOnly(false)
  }

  const applyBrancheScope = (vie: boolean, nonVie: boolean) => {
    setBrancheScope({ vie, nonVie })
    setBranches([]) // Clear branch selection when scope changes
  }

  const activeCount = useMemo(() => {
    let n = 0
    if (uwYears.length > 0 || uwYearMin !== null || uwYearMax !== null) n++
    if (branches.length > 0) n++
    if (typeSpc.length > 0 || perimetre.length > 0) n++  // combined market filter counts as 1
    if (typeOfContract.length > 0) n++
    if (cedantes.length > 0) n++
    if (brokers.length > 0) n++
    if (countries.length > 0) n++
    if (africanMarketsOnly) n++
    return n
  }, [uwYears, uwYearMin, uwYearMax, branches, typeSpc, perimetre, typeOfContract, cedantes, brokers, countries, africanMarketsOnly])

  const hasFilters = activeCount > 0 || !brancheScope.vie || !brancheScope.nonVie

  const buildParams = useMemo(() => {
    return (availableCountries: string[] = []): Record<string, string> => {
      const p: Record<string, string> = {}
      if (uwYears.length > 0) {
        p['uw_years_raw'] = uwYears.join(',')
      } else {
        if (uwYearMin !== null) p['uw_year_min'] = String(uwYearMin)
        if (uwYearMax !== null) p['uw_year_max'] = String(uwYearMax)
      }
      if (branches.length > 0) p['branche'] = branches.join(',')
      if (typeSpc.length > 0) p['type_contrat_spc'] = typeSpc.join(',')
      if (perimetre.length > 0) p['perimetre'] = perimetre.join(',')
      if (typeOfContract.length > 0) p['type_of_contract'] = typeOfContract.join(',')
      if (cedantes.length > 0) p['cedante'] = cedantes.join(',')
      if (brokers.length > 0) p['broker'] = brokers.join(',')
      if (countries.length > 0) p['country'] = countries.join(',')
      if (brancheScope.vie && !brancheScope.nonVie) p['vie_non_vie_view'] = 'VIE'
      if (!brancheScope.vie && brancheScope.nonVie) p['vie_non_vie_view'] = 'NON_VIE'
      // African markets filter
      if (africanMarketsOnly && availableCountries.length > 0) {
        const africanList = getAvailableAfricanMarkets(availableCountries)
        if (africanList.length > 0) p['pays_risque'] = africanList.join(',')
      }
      return p
    }
  }, [uwYears, uwYearMin, uwYearMax, branches, typeSpc, perimetre, typeOfContract, cedantes, brokers, countries, brancheScope, africanMarketsOnly])

  const buildParamsNoBranch = useMemo(() => {
    return (availableCountries: string[] = []): Record<string, string> => {
      const p = { ...buildParams(availableCountries) }
      delete p['branche']
      delete p['vie_non_vie_view']
      return p
    }
  }, [buildParams])

  const brancheOptions = (allBranches: string[]) => {
    if (brancheScope.vie && !brancheScope.nonVie) {
      return toOptions(allBranches.filter(b => b === LIFE_BRANCH))
    }
    if (!brancheScope.vie && brancheScope.nonVie) {
      return toOptions(allBranches.filter(b => b !== LIFE_BRANCH))
    }
    return toOptions(allBranches)
  }

  return {
    state,
    setUwYears, setUwYearMin, setUwYearMax,
    setBranches, setTypeSpc, setTypeOfContract, setBrancheScope,
    setCedantes, setBrokers, setCountries,
    setPerimetre, setAfricanMarketsOnly,
    applyBrancheScope, reset,
    activeCount, hasFilters,
    buildParams, buildParamsNoBranch,
    brancheOptions,
  }
}
