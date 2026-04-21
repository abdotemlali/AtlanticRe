/**
 * French number and date formatters for the reinsurance platform.
 */

/** Format a number with French locale (space as thousands separator, comma as decimal) */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** Format as currency (MAD by default) */
export function formatCurrency(value: number | null | undefined, currency = 'MAD'): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const formatted = formatNumber(value, 0)
  return `${formatted} ${currency}`
}

/**
 * Formate un montant en MAD avec séparateur de milliers (Axe 1 — Portefeuille Interne).
 * Exemples : 1 250 000 → "1,25M MAD" | 500 000 → "500K MAD" | 800 → "800 MAD"
 */
export function formatMAD(value: number | null | undefined, unit: 'MAD' | 'MDH' = 'MAD'): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${formatNumber(abs / 1_000_000, 2)}M ${unit}`
  if (abs >= 1_000) return `${sign}${formatNumber(abs / 1_000, 0)}K ${unit}`
  return `${sign}${new Intl.NumberFormat('fr-MA').format(abs)} ${unit}`
}

/**
 * Formate un montant monétaire (primes) avec suffixes compacts lisibles,
 * sans suffixe de devise (la devise est implicite dans le contexte).
 *
 * Règles :
 *   0 – 999          → nombre tel quel  (ex: 450)
 *   1 000 – 999 999  → K avec 2 déc. max si nécessaire (ex: 1K, 12.5K, 999.99K)
 *   1 M – 999.99 M   → Mn avec 2 déc. max si nécessaire (ex: 1Mn, 3.75Mn, 999.99Mn)
 *   ≥ 1 Md           → Md avec 2 déc. max si nécessaire (ex: 1Md, 2.5Md)
 */
export function formatPrime(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  const fmt2 = (n: number) => {
    // Arrondi à 2 décimales, supprime les zéros inutiles
    const rounded = Math.round(n * 100) / 100
    return rounded % 1 === 0
      ? rounded.toFixed(0)
      : rounded.toFixed(2).replace(/\.?0+$/, '')
  }

  if (abs >= 1_000_000_000) return `${sign}${fmt2(abs / 1_000_000_000)}Md`
  if (abs >= 1_000_000)     return `${sign}${fmt2(abs / 1_000_000)}Mn`
  if (abs >= 1_000)         return `${sign}${fmt2(abs / 1_000)}K`
  return `${sign}${Math.round(abs)}`
}

/** Format as percentage */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return `${formatNumber(value, decimals)} %`
}

/** Compact number formatting (K, M, B) */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${formatNumber(value / 1_000_000_000, 1)} Md`
  if (abs >= 1_000_000) return `${formatNumber(value / 1_000_000, 1)} M`
  if (abs >= 1_000) return `${formatNumber(value / 1_000, 0)} K`
  return formatNumber(value, 0)
}

/** Format date to JJ/MM/AAAA */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  // Already formatted as DD/MM/YYYY → return as-is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value
  // Handle DD-MM-YY or DD/MM/YY (2-digit year) → convert to DD/MM/YYYY
  const shortDate = /^(\d{2})[-\/](\d{2})[-\/](\d{2})$/.exec(value)
  if (shortDate) {
    const [, dd, mm, yy] = shortDate
    const year = parseInt(yy, 10) <= 30 ? `20${yy}` : `19${yy}`
    return `${dd}/${mm}/${year}`
  }
  // Handle DD-MM-YYYY (dashes with 4-digit year)
  const dashDate = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value)
  if (dashDate) {
    const [, dd, mm, yyyy] = dashDate
    return `${dd}/${mm}/${yyyy}`
  }
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return value
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  } catch {
    return value
  }
}

/** Badge label mapping */
export const BADGE_LABELS: Record<string, string> = {
  ATTRACTIF: 'ATTRACTIF',
  NEUTRE: 'NEUTRE',
  A_EVITER: 'À ÉVITER',
}

/** Badge CSS class */
export function badgeClass(badge: string): string {
  if (badge === 'ATTRACTIF') return 'badge-attractif'
  if (badge === 'NEUTRE') return 'badge-neutre'
  return 'badge-eviter'
}

/** Color for score */
export function scoreColor(score: number): string {
  if (score >= 70) return '#2dc653'
  if (score >= 40) return '#f77f00'
  return '#e63946'
}

/** Truncate long strings */
export function truncate(str: string, maxLen = 30): string {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

// ── Helpers previously duplicated in 5+ page files ────────────────────────────

/** Convert a string array to react-select options */
export function toOptions(arr: string[]) {
  return arr.map(v => ({ value: v, label: v }))
}

/** Convert a number array to react-select options */
export function toNumOptions(arr: number[]) {
  return arr.map(v => ({ value: v, label: String(v) }))
}

/** Return a color string for ULR (percentage) thresholds */
export function ulrColor(ulr: number | null | undefined): string {
  if (ulr === null || ulr === undefined) return 'var(--color-gray-400, hsl(218,14%,65%))'
  if (ulr > 100) return 'hsl(358,66%,54%)'
  if (ulr > 70) return 'hsl(30,88%,56%)'
  return 'hsl(83,52%,36%)'
}

/** Return a color string for ULR as decimal (0-1 range) — for broker pages */
export function ulrColorDecimal(ulr: number | null | undefined): string {
  if (!ulr) return 'hsl(218,14%,65%)'
  if (ulr <= 0.5) return 'hsl(145,55%,42%)'
  if (ulr <= 0.7) return 'hsl(83,52%,36%)'
  if (ulr <= 0.9) return 'hsl(28,88%,55%)'
  return 'hsl(358,66%,54%)'
}
