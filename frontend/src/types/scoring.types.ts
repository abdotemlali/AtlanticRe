// ── Scoring Types ─────────────────────────────────────────────────────────────
export interface ScoringCriterion {
    key: string
    label: string
    weight: number
    threshold: number
    direction: 'lower_is_better' | 'higher_is_better'
}

export type MarketBadge = 'ATTRACTIF' | 'NEUTRE' | 'A_EVITER'

export interface MarketScore {
    pays: string
    branche: string
    score: number
    badge: MarketBadge
    written_premium: number
    avg_ulr: number
    total_resultat: number
    avg_commission: number
    avg_share: number
    contract_count: number
}

export interface ScoringResult {
    markets: MarketScore[]
}
