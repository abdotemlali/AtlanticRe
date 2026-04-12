// ── Retrocession Types ───────────────────────────────────────────────────────
export type RetroNature = 'Proportionnel' | 'Non Proportionnel'

export interface RetroFilters {
  uy: number[]
  nature: string | null
  traite: string | null
  courtier: string | null
  securite: string | null
}

export interface RetroOptions {
  traites: string[]
  natures: string[]
  courtiers: string[]
  securites: string[]
  uy_list: number[]
  uy_default: number | null
}

export interface RetroSummary {
  epi_total: number
  pmd_totale: number
  courtage_total: number
  cout_net_total: number
  ratio_cout_epi_pct: number
  nb_traites: number
  nb_securites: number
  nb_courtiers: number
  taux_placement_moyen: number
  rating_a_plus_moyen: number
}

export interface RetroSecuriteDetail {
  securite: string
  part_pct: number
  pmd_par_securite: number
  commission_courtage: number
  commission_courtage_pct: number
}

export interface RetroTraite {
  traite: string
  nature: RetroNature
  uy: number
  epi: number
  pmd_100: number
  pmd_totale: number
  courtage_total: number
  cout_net: number
  taux_pmd_pct: number
  ratio_cout_epi_pct: number
  nb_securites: number
  taux_placement: number
  rating_a_plus_pct: number
  courtier: string
  securites?: RetroSecuriteDetail[]
}

export interface RetroByYear {
  uy: number
  epi_total: number
  pmd_totale: number
  courtage_total: number
  cout_net: number
  ratio_cout_epi_pct: number
  nb_traites_actifs: number
}

export interface RetroByNature {
  proportionnel: {
    epi: number
    pmd_totale: number
    nb_traites: number
    ratio_cout_epi_pct: number
  }
  non_proportionnel: {
    epi: number
    pmd_totale: number
    nb_traites: number
    ratio_cout_epi_pct: number
  }
}

export interface RetroCourtier {
  courtier: string
  est_direct: boolean
  nb_traites_places: number
  epi_gere: number
  pmd_placee: number
  courtage_percu: number
  taux_courtage_moyen: number
  securites_utilisees: string[]
  rating_a_plus_moyen: number
  traites_list: string[]
}

export interface RetroSecurite {
  securite: string
  rating_a_plus: boolean
  nb_traites: number
  uy_list: number[]
  part_moyenne: number
  part_max: number
  pmd_totale_recue: number
  traites_couverts: string[]
  natures_couvertes: RetroNature[]
  courtiers_via: string[]
  concentration_score: number
}

export interface RetroPlacementStatus {
  traite: string
  uy: number
  taux_placement: number
  part_non_placee: number
  epi_non_couvert: number
  statut: 'COMPLET' | 'PARTIEL' | 'CRITIQUE'
}

export interface RetroCourtierCroise {
  courtier: string
  role_apporteur: boolean
  role_placeur: boolean
  role_double: boolean
  primes_apportees: number
  pmd_placee: number
  volume_total: number
  courtage_retro: number
}
