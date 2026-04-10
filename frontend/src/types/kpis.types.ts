/**
 * KPIs API response types — centralized for type safety.
 * Replaces all `useState<any>` patterns across pages.
 */

// ── Country / Market Analysis ─────────────────────────────────────────────────

export interface CountryProfile {
  pays: string
  total_written_premium: number
  total_resultat: number
  avg_ulr: number
  contract_count: number
  avg_share_signed: number
  avg_commission: number
  avg_profit_comm_rate: number
  avg_brokerage_rate: number
  type_cedante?: string
  branches_actives?: number
  fac_saturation_alerts?: string[]
  filtered_view?: boolean
}

export interface BranchData {
  branche: string
  total_written_premium: number
  total_resultat: number
  avg_ulr: number
  contract_count: number
  avg_share_signed: number
  avg_commission: number
  avg_profit_comm_rate?: number
  avg_brokerage_rate?: number
}

export interface YearData {
  year: number
  total_written_premium: number
  total_resultat: number
  avg_ulr: number
  contract_count: number
  avg_share_signed?: number
  avg_commission?: number
}

// ── Cédante Analysis ──────────────────────────────────────────────────────────

export interface CedanteProfile {
  cedante: string
  pays_cedante: string
  total_written_premium: number
  total_resultat: number
  avg_ulr: number
  contract_count: number
  avg_share_signed: number
  avg_commission: number
  avg_profit_comm_rate: number
  avg_brokerage_rate: number
  type_cedante?: string
  branches_actives?: number
  fac_saturation_alerts?: string[]
  filtered_view?: boolean
}

// ── Broker Analysis ───────────────────────────────────────────────────────────

export interface BrokerProfile {
  broker: string
  total_written_premium: number
  total_resultat: number
  avg_ulr: number
  contract_count: number
  avg_share_signed: number
  avg_commission: number
  retro_role: 'apporteur' | 'placeur' | 'double'
  retro_pmd_placee: number
  solde_net: number
  courtage_percu?: number
  cedantes?: string[]
  branches?: string[]
  pays?: string[]
}

export interface BrokerRow {
  broker: string
  total_written_premium: number
  total_resultat: number
  avg_ulr: number | null
  contract_count: number
  pmd_placee: number
  courtage_retro: number
  retro_role: string
  solde_net: number
}

export interface BrokerContract {
  policy_id: string
  cedante: string
  branche: string
  pays_risque: string
  uw_year: number
  type_contrat: string
  written_premium: number
  resultat: number
  ulr: number
  share_signed: number
  commission: number
  status: string
}

// ── Comparison ────────────────────────────────────────────────────────────────

export interface ActiveBranch {
  branche: string
  total_written_premium: number
}

export interface MarketKPIs {
  pays: string
  branche: string
  written_premium: number
  resultat: number
  avg_ulr: number
  sum_insured: number
  contract_count: number
  avg_commission: number
  by_year: YearData[]
  radar: Record<string, number>
  type_cedante?: string
  branches_actives?: number
  fac_saturation_alerts?: string[]
  active_branches?: ActiveBranch[]
  has_data?: boolean
}

// ── Exposition ─────────────────────────────────────────────────────────────────

export interface ExpositionData {
  pays_risque: string
  sum_insured_100: number
  exposure_atlantic: number
  contract_count: number
  cedante_count: number
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export interface ULRAlert {
  cedante: string
  branche: string
  pays_cedante: string
  avg_ulr: number
  total_written_premium: number
  contract_count: number
}

// ── Shared select option type ─────────────────────────────────────────────────

export interface SelectOption<T = string> {
  value: T
  label: string
}
