// ── Contract & Filter Types ───────────────────────────────────────────────────
export interface Contract {
    policy_id: string
    contract_number?: string
    int_spc?: string
    int_branche?: string
    int_cedante?: string
    int_broker?: string
    pays_risque?: string
    underwriting_year?: number
    status?: string
    written_premium?: number
    ulr?: number
    resultat?: number
    inception_date?: string
    expiry_date?: string
}

export interface PaginatedContracts {
    total: number
    page: number
    page_size: number
    data: Contract[]
}

export interface FilterParams {
    perimetre?: string
    type_contrat_spc?: string
    specialite?: string
    int_spc_search?: string
    branche?: string
    sous_branche?: string
    pays_risque?: string
    pays_cedante?: string
    courtier?: string
    cedante?: string
    uw_year_min?: number
    uw_year_max?: number
    statuts?: string
    type_of_contract?: string
    prime_min?: number
    prime_max?: number
    ulr_min?: number
    ulr_max?: number
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

// ── KPI Types ─────────────────────────────────────────────────────────────────
export interface KPISummary {
    total_written_premium: number
    total_resultat: number
    avg_ulr: number
    total_sum_insured: number
    contract_count: number
    ratio_resultat_prime: number
}

export interface KPIByCountry extends KPISummary {
    pays: string
}

export interface KPIByBranch extends KPISummary {
    branche: string
}

export interface KPIByYear extends KPISummary {
    year: number
}
