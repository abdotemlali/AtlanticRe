// ─── Constantes partagées — 4 pages Cartographie SCAR ──────────────────────

export const REGION_MAP: Record<string, string> = {
  'Afrique du Sud': 'Afrique du Sud',
  'South Africa': 'Afrique du Sud',

  Algeria: 'Maghreb', 'Algérie': 'Maghreb',
  Egypt: 'Maghreb', 'Égypte': 'Maghreb',
  Morocco: 'Maghreb', Maroc: 'Maghreb',
  Tunisia: 'Maghreb', Tunisie: 'Maghreb',
  Mauritania: 'Maghreb', Mauritanie: 'Maghreb',

  'Burkina Faso': 'CIMA',
  'Ivory Coast': 'CIMA', "Côte d'Ivoire": 'CIMA',
  Senegal: 'CIMA', Sénégal: 'CIMA',
  Togo: 'CIMA',
  Benin: 'CIMA', 'Bénin': 'CIMA',
  Cameroon: 'CIMA', Cameroun: 'CIMA',
  Gabon: 'CIMA',
  Chad: 'CIMA', Tchad: 'CIMA',
  Congo: 'CIMA', 'Congo, Republic of the': 'CIMA',
  Mali: 'CIMA',
  Niger: 'CIMA',

  Kenya: 'Afrique Est',
  Tanzania: 'Afrique Est', Tanzanie: 'Afrique Est',
  Uganda: 'Afrique Est', Ouganda: 'Afrique Est',
  Rwanda: 'Afrique Est',
  Ethiopia: 'Afrique Est', 'Éthiopie': 'Afrique Est',
  Burundi: 'Afrique Est',
  Malawi: 'Afrique Est',
  Madagascar: 'Afrique Est',
  Mozambique: 'Afrique Est',
  Zimbabwe: 'Afrique Est',
  Zambia: 'Afrique Est', Zambie: 'Afrique Est',

  Namibia: 'Afrique Australe', Namibie: 'Afrique Australe',
  Botswana: 'Afrique Australe',
  Angola: 'Afrique Australe',
  Swaziland: 'Afrique Australe',

  Nigeria: 'Afrique Ouest', 'Nigéria': 'Afrique Ouest',
  Ghana: 'Afrique Ouest',

  'Congo, Democratic Republic of the': 'Afrique Centrale',
  'RD Congo': 'Afrique Centrale',

  'Cap-Vert': 'Iles', 'Cape Verde': 'Iles',
  Mauritius: 'Iles', Maurice: 'Iles',
  Seychelles: 'Iles',
}

export const REGION_COLORS: Record<string, string> = {
  'Afrique du Sud': '#C0392B',
  'Afrique Australe': '#8E44AD',
  Maghreb: '#1B3F6B',
  CIMA: '#E8940C',
  'Afrique Est': '#1E8449',
  'Afrique Ouest': '#E74C3C',
  'Afrique Centrale': '#2E86C1',
  Iles: '#17A589',
  Autre: '#95a5a6',
}

export const ALL_REGIONS = [
  'Maghreb',
  'CIMA',
  'Afrique Est',
  'Afrique Australe',
  'Afrique Ouest',
  'Afrique Centrale',
  'Iles',
]

/** Assure une région connue pour chaque pays (fallback sur REGION_MAP puis 'Autre'). */
export function resolveRegion(pays: string, fromDb: string | null): string {
  if (pays === 'Afrique du Sud' || pays === 'South Africa') return 'Afrique du Sud'
  if (fromDb && fromDb !== 'N/A') return fromDb
  return REGION_MAP[pays] ?? 'Autre'
}

/** Normalise les noms pays bruts (UPPERCASE, EN) vers la forme FR canonique utilisée partout dans l'UI. */
export const PAYS_NORMALIZE: Record<string, string> = {
  'SOUTH AFRICA': 'Afrique du Sud',
  ALGERIE: 'Algérie',
  ALGERIA: 'Algérie',
  ANGOLA: 'Angola',
  BENIN: 'Bénin',
  BOTSWANA: 'Botswana',
  'BURKINA FASO': 'Burkina Faso',
  BURUNDI: 'Burundi',
  CAMEROON: 'Cameroun',
  CAMEROUN: 'Cameroun',
  'CAPE VERDE': 'Cap-Vert',
  CHAD: 'Tchad',
  TCHAD: 'Tchad',
  CONGO: 'Congo',
  EGYPT: 'Égypte',
  EGYPTE: 'Égypte',
  ETHIOPIA: 'Éthiopie',
  ETHIOPIE: 'Éthiopie',
  GABON: 'Gabon',
  GHANA: 'Ghana',
  'IVORY COAST': "Côte d'Ivoire",
  "COTE D'IVOIRE": "Côte d'Ivoire",
  KENYA: 'Kenya',
  MADAGASCAR: 'Madagascar',
  MALAWI: 'Malawi',
  MALI: 'Mali',
  MAURITANIE: 'Mauritanie',
  MAURITANIA: 'Mauritanie',
  MAURITIUS: 'Maurice',
  MAURICE: 'Maurice',
  MOROCCO: 'Maroc',
  MAROC: 'Maroc',
  MOZAMBIQUE: 'Mozambique',
  NAMIBIA: 'Namibie',
  NAMIBIE: 'Namibie',
  NIGER: 'Niger',
  NIGERIA: 'Nigéria',
  SENEGAL: 'Sénégal',
  'TANZANIA,UNITED REP.': 'Tanzanie',
  'TANZANIA, UNITED REP.': 'Tanzanie',
  TANZANIA: 'Tanzanie',
  TANZANIE: 'Tanzanie',
  TOGO: 'Togo',
  TUNISIE: 'Tunisie',
  TUNISIA: 'Tunisie',
  UGANDA: 'Ouganda',
  OUGANDA: 'Ouganda',
  ZAIRE: 'RD Congo',
  'DR CONGO': 'RD Congo',
  'DRC': 'RD Congo',
  ZAMBIA: 'Zambie',
  ZAMBIE: 'Zambie',
}

/** Retourne le nom canonique FR d'un pays (passthrough si déjà canonique). */
export function normalizePaysName(raw: string): string {
  if (!raw) return raw
  return PAYS_NORMALIZE[raw] ?? PAYS_NORMALIZE[raw.toUpperCase()] ?? raw
}

// ── Mapping ISO numeric (topoJSON) → ISO3 pour nos 34 pays ─────────────────
export const NUMERIC_TO_ISO3: Record<number, string> = {
  710: 'ZAF', 12: 'DZA', 24: 'AGO', 72: 'BWA', 854: 'BFA', 108: 'BDI',
  204: 'BEN', 120: 'CMR', 132: 'CPV', 178: 'COG', 384: 'CIV', 266: 'GAB',
  288: 'GHA', 404: 'KEN', 450: 'MDG', 454: 'MWI', 466: 'MLI', 504: 'MAR',
  480: 'MUS', 478: 'MRT', 508: 'MOZ', 516: 'NAM', 562: 'NER', 566: 'NGA',
  800: 'UGA', 180: 'COD', 686: 'SEN', 834: 'TZA', 148: 'TCD', 768: 'TGO',
  788: 'TUN', 894: 'ZMB', 818: 'EGY', 231: 'ETH',
}

export const AFRICA_NUMERIC = new Set([
  12, 24, 72, 204, 854, 108, 120, 132, 140, 148, 174, 178, 180, 231, 232,
  262, 266, 270, 288, 324, 328, 384, 404, 426, 430, 434, 450, 454, 466, 478,
  480, 504, 508, 516, 562, 566, 646, 686, 694, 706, 710, 716, 724, 728, 736,
  748, 768, 788, 800, 818, 834, 894,
])

/** Noms lisibles en français par ISO3. */
export const ISO3_NAMES: Record<string, string> = {
  ZAF: 'Afrique du Sud', DZA: 'Algérie', AGO: 'Angola', BWA: 'Botswana',
  BFA: 'Burkina Faso', BDI: 'Burundi', BEN: 'Bénin', CMR: 'Cameroun',
  CPV: 'Cap-Vert', COG: 'Congo', CIV: "Côte d'Ivoire", GAB: 'Gabon',
  GHA: 'Ghana', KEN: 'Kenya', MDG: 'Madagascar', MWI: 'Malawi',
  MLI: 'Mali', MAR: 'Maroc', MUS: 'Maurice', MRT: 'Mauritanie',
  MOZ: 'Mozambique', NAM: 'Namibie', NER: 'Niger', NGA: 'Nigéria',
  UGA: 'Ouganda', COD: 'RD Congo', SEN: 'Sénégal', TZA: 'Tanzanie',
  TCD: 'Tchad', TGO: 'Togo', TUN: 'Tunisie', ZMB: 'Zambie',
  EGY: 'Égypte', ETH: 'Éthiopie',
}

/** Région par ISO3 — utilisé pour le coloriage régional de la carte. */
export const ISO3_REGION: Record<string, string> = {
  ZAF: 'Afrique du Sud', DZA: 'Maghreb', AGO: 'Afrique Australe', BWA: 'Afrique Australe',
  BFA: 'CIMA', BDI: 'Afrique Est', BEN: 'CIMA', CMR: 'CIMA', CPV: 'Iles',
  COG: 'CIMA', CIV: 'CIMA', GAB: 'CIMA', GHA: 'Afrique Ouest', KEN: 'Afrique Est',
  MDG: 'Afrique Est', MWI: 'Afrique Est', MLI: 'CIMA', MAR: 'Maghreb', MUS: 'Iles',
  MRT: 'Maghreb', MOZ: 'Afrique Est', NAM: 'Afrique Australe', NER: 'CIMA',
  NGA: 'Afrique Ouest', UGA: 'Afrique Est', COD: 'Afrique Centrale', SEN: 'CIMA',
  TZA: 'Afrique Est', TCD: 'CIMA', TGO: 'CIMA', TUN: 'Maghreb', ZMB: 'Afrique Est',
  EGY: 'Maghreb', ETH: 'Afrique Est',
}

/** Inverse lookup : nom pays (FR ou EN) → ISO3. */
export const NAME_TO_ISO3: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  for (const [iso, name] of Object.entries(ISO3_NAMES)) m[name] = iso
  // alias EN → ISO3
  Object.assign(m, {
    'South Africa': 'ZAF', Algeria: 'DZA', Egypt: 'EGY', Morocco: 'MAR',
    Tunisia: 'TUN', Mauritania: 'MRT', 'Burkina Faso': 'BFA', 'Ivory Coast': 'CIV',
    "Côte d'Ivoire": 'CIV', Senegal: 'SEN', Togo: 'TGO', Benin: 'BEN',
    Cameroon: 'CMR', Gabon: 'GAB', Chad: 'TCD', 'Congo, Republic of the': 'COG',
    Congo: 'COG', Mali: 'MLI', Niger: 'NER', Kenya: 'KEN', Tanzania: 'TZA',
    Uganda: 'UGA', Rwanda: 'RWA', Ethiopia: 'ETH', Burundi: 'BDI', Malawi: 'MWI',
    Madagascar: 'MDG', Mozambique: 'MOZ', Zambia: 'ZMB', Namibia: 'NAM',
    Botswana: 'BWA', Angola: 'AGO', Nigeria: 'NGA', Ghana: 'GHA',
    'Congo, Democratic Republic of the': 'COD', 'Cape Verde': 'CPV',
    Mauritius: 'MUS',
  })
  return m
})()

// ── Couleurs SCAR ──────────────────────────────────────────────────────────
export const SCAR_COLORS = {
  navy: '#1B3F6B',
  navyDark: 'hsl(83,40%,10%)',
  oliveDark: 'hsl(83,52%,30%)',
  olive: 'hsl(83,52%,42%)',
  oliveLight: 'hsl(83,60%,70%)',
  bg: 'hsl(83,15%,12%)',
  gridLine: '#f0f0f0',
  muted: '#ecf0f1',
  green: '#1E8449',
  amber: '#E8940C',
  red: '#C0392B',
  info: '#2E86C1',
}

// ── Interpolation avec stops positionnés [position 0-1, couleur] ────────────
export type PositionedStop = [number, string]

export function interpolatePositioned(t: number, stops: PositionedStop[]): string {
  if (!Number.isFinite(t) || stops.length === 0) return stops[0]?.[1] ?? '#888'
  t = Math.max(0, Math.min(1, t))
  if (stops.length === 1) return stops[0][1]
  // Find surrounding stops
  let lo = stops[0], hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) { lo = stops[i]; hi = stops[i + 1]; break }
  }
  const range = hi[0] - lo[0]
  const frac = range === 0 ? 0 : (t - lo[0]) / range
  return mixHex(lo[1], hi[1], frac)
}

/** Legacy: interpolation uniforme (équidistante) sur tableau de couleurs */
export function interpolateScale(t: number, stops: string[]): string {
  if (!Number.isFinite(t)) return stops[0]
  t = Math.max(0, Math.min(1, t))
  if (stops.length === 1) return stops[0]
  const idx = t * (stops.length - 1)
  const i = Math.floor(idx)
  const frac = idx - i
  if (i >= stops.length - 1) return stops[stops.length - 1]
  return mixHex(stops[i], stops[i + 1], frac)
}

function mixHex(a: string, b: string, t: number): string {
  const pa = parseColor(a); const pb = parseColor(b)
  if (!pa || !pb) return a
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t)
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t)
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t)
  return `rgb(${r}, ${g}, ${bl})`
}

function parseColor(hex: string): [number, number, number] | null {
  const s = hex.replace('#', '')
  if (s.length !== 6) return null
  const n = parseInt(s, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// ── Nouvelles palettes calibrées avec stops positionnés ──────────────────────
// Chaque entrée = [position_0_to_1, couleur_hex]
export const COLOR_SCALES_POSITIONED: Record<string, PositionedStop[]> = {
  // Primes — échelle log10, du clair au foncé
  primes: [
    [0,    '#EBF5FB'],
    [0.30, '#5DADE2'],
    [0.70, '#1A5276'],
    [1,    '#0D1B2E'],
  ],
  // Ratio S/P — divergente centrée ~42%
  sp: [
    [0,    '#08306b'],
    [0.17, '#2171b5'],
    [0.25, '#6baed6'],
    [0.33, '#bdd7e7'],
    [0.42, '#d9a30d'],
    [0.50, '#fecc5c'],
    [0.62, '#fd8d3c'],
    [0.75, '#f03b20'],
    [1,    '#7b0000'],
  ],
  // Pénétration — transformation v^0.4
  penetration: [
    [0,    '#3d0066'],
    [0.17, '#0033cc'],
    [0.33, '#00aa88'],
    [0.50, '#00cc44'],
    [0.67, '#ffee00'],
    [0.83, '#ff7700'],
    [1,    '#cc0000'],
  ],
  // Densité — transformation log10
  densite: [
    [0,    '#000080'],
    [0.14, '#0000ff'],
    [0.28, '#00ccff'],
    [0.43, '#00cc00'],
    [0.57, '#ffff00'],
    [0.71, '#ff8800'],
    [0.86, '#ff0000'],
    [1,    '#800000'],
  ],
  // Croissance — transformation symlog sign(v)*log10(|v|+1)
  croissance: [
    [0,    '#67001f'],
    [0.25, '#d6604d'],
    [0.44, '#f4a582'],
    [0.47, '#fddbc7'],
    [0.50, '#d1e5f0'],
    [0.53, '#d1e5f0'],
    [0.62, '#4393c3'],
    [0.65, '#00ff00'],
    [0.68, '#ffff00'],
    [0.72, '#ff6600'],
    [0.78, '#2ca25f'],
    [1,    '#00441b'],
  ],
  // GDP — volume (comme primes)
  gdp: [
    [0,    '#EBF5FB'],
    [0.30, '#5DADE2'],
    [0.70, '#1A5276'],
    [1,    '#0D1B2E'],
  ],
  // PIB/habitant — (comme densité, du violet/bleu au chaud)
  gdpCap: [
    [0,    '#000080'],
    [0.14, '#0000ff'],
    [0.28, '#00ccff'],
    [0.43, '#00cc00'],
    [0.57, '#ffff00'],
    [0.71, '#ff8800'],
    [0.86, '#ff0000'],
    [1,    '#800000'],
  ],
  // Inflation — vert (basse) à rouge foncé (très haute)
  inflation: [
    [0,    '#ABEBC6'],
    [0.15, '#2ECC71'],
    [0.30, '#F4D03F'],
    [0.50, '#E8940C'],
    [0.75, '#E74C3C'],
    [1,    '#7B241C'],
  ],
  // Compte courant — divergent rouge (déficit) à bleu (surplus), blanc au centre
  currentAcc: [
    [0,    '#7B241C'],
    [0.25, '#E74C3C'],
    [0.45, '#FDEDEC'],
    [0.50, '#FFFFFF'],
    [0.55, '#EBF5FB'],
    [0.75, '#5DADE2'],
    [1,    '#1A5276'],
  ],
  // Intégration régionale (score ~0 à 1) — rouge à vert -> transformé en multi-hue vibrant (Gouvernance)
  wgi: [
    [0,    '#cc0000'],
    [0.17, '#ff7700'],
    [0.33, '#ffee00'],
    [0.50, '#00cc44'],
    [0.67, '#00aa88'],
    [0.83, '#0033cc'],
    [1,    '#3d0066'],
  ],
}

// ── Legacy COLOR_SCALES (used by other pages / non-vie specific scales below) ─
export const COLOR_SCALES: Record<string, string[]> = {
  primes:       ['#EBF5FB', '#5DADE2', '#1A5276', '#0D1B2E'],
  sp:           ['#08306b', '#2171b5', '#6baed6', '#bdd7e7', '#d9a30d', '#fecc5c', '#fd8d3c', '#f03b20', '#7b0000'],
  penetration:  ['#3d0066', '#0033cc', '#00aa88', '#00cc44', '#ffee00', '#ff7700', '#cc0000'],
  densite:      ['#000080', '#0000ff', '#00ccff', '#00cc00', '#ffff00', '#ff8800', '#ff0000', '#800000'],
  croissance:   ['#67001f', '#d6604d', '#f4a582', '#fddbc7', '#d1e5f0', '#4393c3', '#00ff00', '#ffff00', '#ff6600', '#2ca25f', '#00441b'],
  gdp:          ['#E8F0FA', '#A9CCE3', '#5499C7', '#1F618D', '#154360'],
  gdpCap:       ['#FDEDEC', '#F5B7B1', '#E74C3C', '#C0392B', '#7B241C'],
  inflation:    ['#ABEBC6', '#F4D03F', '#E8940C', '#E74C3C', '#7B241C'],
  currentAcc:   ['#C0392B', '#F5B7B1', '#FFFFFF', '#AED6F1', '#1F618D'],
  exchange:     ['#ECF0F1', '#BFC9CA', '#7F8C8D', '#4D5656', '#2C3E50'],
  wgi:          ['#7B241C', '#E74C3C', '#FDEDEC', '#FFFFFF', '#D5F5E3', '#2ECC71', '#1E8449'],
  fdi:          ['#E8F0FA', '#A9CCE3', '#5499C7', '#1F618D', '#154360'],
  kaopen:       ['#9B59B6', '#BB8FCE', '#FFFFFF', '#AED6F1', '#2874A6', '#1B3F6B'],
}
