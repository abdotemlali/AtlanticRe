// ─── Types pour les 4 pages Cartographie SCAR ───────────────────────────────

export type DatasetType = 'non-vie' | 'vie' | 'macroeconomie' | 'gouvernance'

interface BaseRow {
  pays: string
  code_iso3: string | null
  region: string | null
  annee: number
}

export interface NonVieRow extends BaseRow {
  primes_emises_mn_usd: number | null
  croissance_primes_pct: number | null
  taux_penetration_pct: number | null
  ratio_sp_pct: number | null
  densite_assurance_usd: number | null
}

export interface VieRow extends BaseRow {
  primes_emises_mn_usd: number | null
  croissance_primes_pct: number | null
  taux_penetration_pct: number | null
  densite_assurance_usd: number | null
}

export interface MacroRow extends BaseRow {
  gdp_growth_pct: number | null
  current_account_mn: number | null
  exchange_rate: number | null
  gdp_per_capita: number | null
  gdp_mn: number | null
  inflation_rate_pct: number | null
  integration_regionale_score: number | null
}

export interface GouvRow extends BaseRow {
  fdi_inflows_pct_gdp: number | null
  political_stability: number | null
  regulatory_quality: number | null
  kaopen: number | null
}

export type AnyRow = NonVieRow | VieRow | MacroRow | GouvRow

export interface CartoData<T extends AnyRow = AnyRow> {
  data: T[]
  years: number[]
  countries: string[]
  loading: boolean
  error: string | null
}
