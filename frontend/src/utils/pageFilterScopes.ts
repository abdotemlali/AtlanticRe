/**
 * Page Filter Scopes — Solution C
 * Defines which FilterState keys are relevant per page.
 * Pages with a defined scope will ONLY send those filter params to the API.
 */

import type { FilterState } from '../context/DataContext'
import { filtersToParams } from '../context/DataContext'

/** All possible filter keys */
type FilterKey = keyof FilterState

/** Scope definition per page */
export type PageScope = {
  /** Human-readable label for the scope (used in the ActiveFiltersBar) */
  label: string
  /** List of FilterState keys that this page respects */
  keys: FilterKey[]
  /** Optional keys to EXCLUDE (even if present in keys) — e.g. skip global cedante */
  excluded?: FilterKey[]
}

/** Label override map for prettier display in the UI */
export const FILTER_LABELS: Partial<Record<FilterKey, string>> = {
  uw_year_min: 'Année min',
  uw_year_max: 'Année max',
  uw_years: 'Années',
  branche: 'Branche',
  sous_branche: 'Sous-branche',
  pays_risque: 'Pays risque',
  pays_cedante: 'Pays cédante',
  type_of_contract: 'Type contrat',
  type_cedante: 'Type cédante',
  courtier: 'Courtier',
  cedante: 'Cédante',
  perimetre: 'Périmètre',
  specialite: 'Spécialité',
  statuts: 'Statuts',
  ulr_min: 'ULR min',
  ulr_max: 'ULR max',
  prime_min: 'Prime min',
  prime_max: 'Prime max',
}

/** Scope definitions per page path */
export const PAGE_SCOPES: Record<string, PageScope> = {
  '/top-brokers': {
    label: 'Top Courtiers',
    // Courtier exclu : filtrer sur un seul courtier dans son propre classement n'a pas de sens
    // Cédante incluse : permet de voir "quels courtiers opèrent sur cette cédante"
    keys: ['uw_year_min', 'uw_year_max', 'uw_years', 'branche', 'sous_branche', 'type_of_contract', 'pays_cedante', 'perimetre', 'cedante'],
    excluded: ['courtier'],
  },
  '/fac-saturation': {
    label: 'Saturation FAC',
    // FAC saturation: years + branch. Cedante is selected locally on the page.
    keys: ['uw_year_min', 'uw_year_max', 'uw_years', 'branche', 'sous_branche', 'pays_cedante', 'perimetre'],
    excluded: ['cedante'],  // avoid conflict with local cedante picker
  },
  '/analyse-cedante': {
    label: 'Analyse Cédante',
    // Years + branch only. Cedante is selected locally.
    keys: ['uw_year_min', 'uw_year_max', 'uw_years', 'branche', 'sous_branche', 'type_of_contract', 'pays_cedante'],
    excluded: ['cedante'],  // selected locally in the page
  },
  '/exposition': {
    label: 'Exposition & Risques',
    // Cédante et Courtier inclus : permet de voir l'exposition géographique pour une entité spécifique
    keys: ['uw_year_min', 'uw_year_max', 'uw_years', 'pays_risque', 'branche', 'sous_branche', 'type_of_contract', 'cedante', 'courtier'],
  },
  '/comparaison': {
    label: 'Comparaison',
    keys: ['uw_year_min', 'uw_year_max', 'uw_years', 'branche', 'pays_cedante', 'type_of_contract'],
  },
}

/**
 * Given a page path and the global filters, return only the params that are
 * relevant to that page according to its scope definition.
 */
export function getScopedParams(
  path: string,
  filters: FilterState,
): Record<string, string> {
  const scope = PAGE_SCOPES[path]
  if (!scope) {
    // No scope defined — fall back to all filters
    return filtersToParams(filters)
  }

  // Build a partial FilterState containing only the allowed keys
  const partial: Partial<FilterState> = {}
  for (const key of scope.keys) {
    if (!scope.excluded?.includes(key)) {
      (partial as any)[key] = (filters as any)[key]
    }
  }

  // Fill in missing required keys with their defaults
  const scoped: FilterState = {
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
    ...partial,
  }

  return filtersToParams(scoped)
}

/**
 * Returns a list of { label, value } for all active (non-empty) filters
 * in the scope of the current page — for display in the ActiveFiltersBar.
 */
export function getActiveFiltersForScope(
  path: string,
  filters: FilterState,
): { key: string; label: string; value: string }[] {
  const scope = PAGE_SCOPES[path]
  const activeKeys: FilterKey[] = scope
    ? scope.keys.filter(k => !scope.excluded?.includes(k))
    : (Object.keys(filters) as FilterKey[])

  const active: { key: string; label: string; value: string }[] = []

  for (const key of activeKeys) {
    const val = (filters as any)[key]
    if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) continue

    let display = ''
    if (Array.isArray(val)) display = val.join(', ')
    else display = String(val)

    active.push({
      key,
      label: FILTER_LABELS[key] ?? key,
      value: display,
    })
  }

  return active
}
