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
  // Already formatted by backend as DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value
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
