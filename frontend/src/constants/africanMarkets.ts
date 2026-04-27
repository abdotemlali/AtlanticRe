/**
 * AFRICAN_MARKETS — Liste exhaustive des marchés africains (PAYS_RISQUE)
 *
 * ⚠️ Les valeurs correspondent aux libellés PAYS_RISQUE EXACTS tels qu'ils
 *    apparaissent dans le filtre de l'application (colonne PAYS_RISQUE des données).
 *    Mélange d'anglais et de français selon la saisie historique.
 *
 * Utilisé par le filtre rapide "Marchés Africains" dans le FilterPanel (Axe 1).
 * Indépendant de la logique de mappage interne ↔ externe (Axe 2 / SCAR).
 *
 * La fonction getAvailableAfricanMarkets() fait l'intersection avec les pays
 * réellement présents dans filterOptions.pays_risque — les entrées absentes
 * de la data sont simplement ignorées.
 */
export const AFRICAN_MARKETS: readonly string[] = [
  // ── Afrique du Nord ──
  'MOROCCO',
  'ALGERIE',
  'TUNISIE',
  'EGYPT',
  'LIBYE',
  'SUDAN',

  // ── Afrique de l'Ouest ──
  'NIGERIA',
  'GHANA',
  'SENEGAL',
  'IVORY COAST',
  'MALI',
  'BURKINA FASO',
  'NIGER',
  'TOGO',
  'BENIN',
  'MAURITANIE',
  'GAMBIA',
  'GUINEA-BISSAU',
  'SIERRA LEONE',
  'LIBERIA',
  'CAPE VERDE',

  // ── Afrique Centrale ──
  'CAMEROON',
  'CONGO',
  'GABON',
  'CHAD',
  'CENTRAL AFRICAN REP.',
  'CENTRAL AFRICAN REP',   // variante sans point final
  'EQUATORIAL GUINEA',
  'ZAIRE',

  // ── Afrique de l'Est ──
  'ETHIOPIA',
  'KENYA',
  'TANZANIA, UNITED REP.',
  'TANZANIA UNITED REP',   // variante sans virgule
  'UGANDA',
  'RWANDA',
  'SOMALIA',
  'DJIBOUTI',
  'SUDAN',                 // déjà ci-dessus, ignorée par le Set
  'BURUNDI',
  'MADAGASCAR',
  'MOZAMBIQUE',
  'MALAWI',
  'ZAMBIA',
  'ZIMBABWE',
  'SEYCHELLES',

  // ── Afrique Australe ──
  'SOUTH AFRICA',
  'NAMIBIA',
  'BOTSWANA',
  'ANGOLA',
  'SWAZILAND',
  'LESOTHO',

  // ── Îles océan Indien / Atlantique ──
  'MAURITIUS',
  'COMOROS',

  // ── Entrées génériques "Afrique" présentes dans les données ──
  'Africa',
  'AFRIQUE',
  'AFRIQUE DU SUD',          // variante française de SOUTH AFRICA

  // ── Entrées régionales incluant une exposition africaine ──
  'AFRIQUE + MOYEN ORIENT + TURQUIE',
  'AFRIQUE + ASE',
  'AFRIQUE + PAYS ARABES',
  'PAYS AFRO ASIATIQUES',

  // ── Variantes françaises (saisies historiques) ──
  'ETHIOPIE',
  'CAMEROUN',
  'EGYPTE',
  'OUGANDA',
  'TANZANIE',
  'ZAMBIE',
  'NAMIBIE',
  'SOMALIE',
  'SOUDAN',
  'COTE D IVOIRE',
  'MAROC CEDANTE ETRANGERE',   // entrée spécifique présente dans les données
] as const

/** Set pour lookup O(1) — déduplique automatiquement */
export const AFRICAN_MARKETS_SET = new Set<string>(AFRICAN_MARKETS)

/**
 * Retourne les pays africains disponibles dans une liste de pays donnée.
 * Fait l'intersection avec le Set — seules les valeurs réellement présentes
 * dans filterOptions.pays_risque seront retournées.
 */
export function getAvailableAfricanMarkets(availableCountries: string[]): string[] {
  return availableCountries.filter(c => AFRICAN_MARKETS_SET.has(c))
}

/**
 * Retourne true si tous les marchés africains disponibles sont sélectionnés.
 */
export function isAfricanFilterActive(selectedCountries: string[], availableCountries: string[]): boolean {
  const available = getAvailableAfricanMarkets(availableCountries)
  if (available.length === 0) return false
  return available.every(c => selectedCountries.includes(c))
}
