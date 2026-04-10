/**
 * Shared style constants — centralized to eliminate duplication.
 * Previously copied identically in CedanteAnalysis, BrokerDetail,
 * BrokerAnalysis, Analysis, and Comparison.
 */

// ── React-Select shared styles ────────────────────────────────────────────────

export const SHARED_SELECT_STYLES = {
  control: (base: any) => ({
    ...base,
    minHeight: '36px',
    fontSize: '0.78rem',
    borderRadius: '0.5rem',
    borderColor: 'var(--color-gray-200)',
    boxShadow: 'none',
    '&:hover': { borderColor: 'var(--color-navy)' },
  }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: '0.78rem',
    backgroundColor: state.isSelected
      ? 'var(--color-navy)'
      : state.isFocused
        ? 'var(--color-off-white)'
        : 'white',
    color: state.isSelected ? 'white' : 'var(--color-navy)',
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: 'hsla(209,28%,24%,0.10)',
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    color: 'var(--color-navy)',
    fontWeight: 700,
    fontSize: '0.72rem',
  }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  placeholder: (base: any) => ({
    ...base,
    fontSize: '0.78rem',
    color: 'var(--color-gray-400)',
  }),
}

export const SHARED_SELECT_PROPS = {
  menuPortalTarget: typeof document !== 'undefined' ? document.body : undefined,
  menuPosition: 'fixed' as const,
  styles: SHARED_SELECT_STYLES,
}

// ── Branch color palette ──────────────────────────────────────────────────────

export const BRANCH_COLORS = [
  'hsl(209,28%,24%)',  // Navy (dark)
  'hsl(83,52%,36%)',   // Green (primary)
  'hsl(12,76%,45%)',   // Rust (warm accent)
  'hsl(218,12%,68%)',  // Gray-blue (neutral)
  'hsl(358,66%,54%)',  // Red (alert)
  'hsl(30,88%,56%)',   // Orange (secondary)
  'hsl(180,25%,35%)',  // Teal (cool accent)
  'hsl(43,96%,56%)',   // Yellow (warning)
  'hsl(280,30%,45%)',  // Purple (special)
  'hsl(0,0%,40%)',     // Dark gray (other)
]

export const CHART_PALETTE = [
  '#1E3A5F', '#4E6820', '#E67E22', '#3498DB',
  '#9B59B6', '#1ABC9C', '#E74C3C', '#2C3E50',
]

// ── Colors object (for BrokerAnalysis/BrokerDetail inline styles) ─────────────

export const C = {
  navy: 'hsl(209,35%,16%)',
  olive: 'hsl(83,52%,36%)',
  oliveLight: 'hsl(83,50%,55%)',
  orange: 'hsl(28,88%,55%)',
  red: 'hsl(358,66%,54%)',
  blue: 'hsl(209,60%,55%)',
  green: 'hsl(145,55%,42%)',
  gray: 'hsl(218,14%,65%)',
  grayLight: 'hsl(218,22%,92%)',
  bg: '#f8fafc',
}

// ── Shared CSS class strings ──────────────────────────────────────────────────

export const LABEL_STYLE = 'block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]'

// ── Life branch constant ──────────────────────────────────────────────────────

export const LIFE_BRANCH = 'VIE'
