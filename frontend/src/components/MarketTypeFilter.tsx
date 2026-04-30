/**
 * MarketTypeFilter — Filtre combiné Périmètre × Type de contrat SPC
 *
 * Réutilisable dans :
 *   - FilterPanel (sidebar global)  — mode normal
 *   - LocalFilterPanel (vues locales) — mode compact
 *
 * Props :
 *   perimetre       : string[]  — valeurs actuelles ['AE'] | ['AM'] | []
 *   typeSpc         : string[]  — valeurs actuelles ['TTY','TTE'] | ['FAC'] | []
 *   onPerimetreChange : setter perimetre
 *   onTypeSpcChange   : setter typeSpc
 *   compact         : affichage horizontal réduit (pour filtres locaux)
 */
import React from 'react'

const ALL_TYPES = ['TTY', 'TTE', 'FAC']

const COMBINED_OPTIONS = [
  { id: 'ae-tt',  label: 'AE-TT',  perimetre: ['AE'], types: ['TTY', 'TTE'], group: 'ae' as const, color: 'var(--color-navy)' },
  { id: 'ae-tty', label: 'AE-TTY', perimetre: ['AE'], types: ['TTY'],        group: 'ae' as const, color: 'hsl(209,55%,45%)' },
  { id: 'ae-tte', label: 'AE-TTE', perimetre: ['AE'], types: ['TTE'],        group: 'ae' as const, color: 'hsl(209,55%,55%)' },
  { id: 'ae-fac', label: 'AE-FAC', perimetre: ['AE'], types: ['FAC'],        group: 'ae' as const, color: 'hsl(209,55%,65%)' },
  { id: 'am-tt',  label: 'AM-TT',  perimetre: ['AM'], types: ['TTY', 'TTE'], group: 'am' as const, color: 'hsl(145,45%,40%)' },
  { id: 'am-tty', label: 'AM-TTY', perimetre: ['AM'], types: ['TTY'],        group: 'am' as const, color: 'hsl(145,40%,48%)' },
  { id: 'am-tte', label: 'AM-TTE', perimetre: ['AM'], types: ['TTE'],        group: 'am' as const, color: 'hsl(145,40%,55%)' },
  { id: 'am-fac', label: 'AM-FAC', perimetre: ['AM'], types: ['FAC'],        group: 'am' as const, color: 'hsl(145,40%,62%)' },
] as const

type Option = typeof COMBINED_OPTIONS[number]

interface MarketTypeFilterProps {
  perimetre: string[]
  typeSpc: string[]
  onPerimetreChange: (v: string[]) => void
  onTypeSpcChange: (v: string[]) => void
  /** Compact horizontal layout for inline page filters (default: false = sidebar style) */
  compact?: boolean
}

export default function MarketTypeFilter({
  perimetre,
  typeSpc,
  onPerimetreChange,
  onTypeSpcChange,
  compact = false,
}: MarketTypeFilterProps) {

  /* ── Helpers ── */
  const isHighlighted = (opt: Option) => {
    const pMatch = opt.perimetre.every(p => perimetre.includes(p))
    const tMatch = opt.types.every(t => typeSpc.includes(t))
    return pMatch && tMatch
  }

  const isExactActive = (opt: Option) => {
    const pMatch = opt.perimetre.length === perimetre.length && opt.perimetre.every(p => perimetre.includes(p))
    const tMatch = opt.types.length === typeSpc.length && opt.types.every(t => typeSpc.includes(t))
    return pMatch && tMatch
  }

  const isAllActive = (group: 'ae' | 'am') => {
    const per = group === 'ae' ? 'AE' : 'AM'
    return (
      perimetre.length === 1 && perimetre[0] === per &&
      ALL_TYPES.length === typeSpc.length && ALL_TYPES.every(t => typeSpc.includes(t))
    )
  }

  /* ── Toggle handlers ── */
  const handleToggle = (opt: Option) => {
    if (isExactActive(opt)) {
      onPerimetreChange([])
      onTypeSpcChange([])
    } else {
      onPerimetreChange([...opt.perimetre])
      onTypeSpcChange([...opt.types])
    }
  }

  const handleToggleAll = (group: 'ae' | 'am') => {
    if (isAllActive(group)) {
      onPerimetreChange([])
      onTypeSpcChange([])
    } else {
      onPerimetreChange([group === 'ae' ? 'AE' : 'AM'])
      onTypeSpcChange([...ALL_TYPES])
    }
  }

  /* ── Active badge label ── */
  const activeLabel = (() => {
    if (isAllActive('ae')) return { label: 'AE-TOUT', color: 'var(--color-navy)' }
    if (isAllActive('am')) return { label: 'AM-TOUT', color: 'hsl(145,45%,40%)' }
    const exact = COMBINED_OPTIONS.find(o => isExactActive(o))
    return exact ? { label: exact.label, color: exact.color } : null
  })()

  /* ── Styles ── */
  const btnStyle = (color: string, active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: compact ? '3px 0' : '5px 0',
    borderRadius: '6px',
    border: active ? `1.5px solid ${color}` : '1.5px solid var(--color-gray-200)',
    background: active ? color : 'transparent',
    color: active ? '#fff' : 'var(--color-gray-500)',
    fontSize: compact ? '0.65rem' : '0.7rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    letterSpacing: '0.03em',
    flex: 1,
    whiteSpace: 'nowrap',
  })

  const toutBtnStyle = (active: boolean, color: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: compact ? '1px 5px' : '1px 7px',
    borderRadius: '4px',
    border: active ? `1.5px solid ${color}` : '1.5px solid var(--color-gray-200)',
    background: active ? color : 'transparent',
    color: active ? '#fff' : 'var(--color-gray-400)',
    fontSize: '0.58rem',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    marginLeft: 'auto',
  })

  /* ── Group renderer ── */
  const renderGroup = (group: 'ae' | 'am') => {
    const isAE = group === 'ae'
    const groupColor = isAE ? 'var(--color-navy)' : 'hsl(145,45%,40%)'
    const groupHover = isAE ? 'hsla(209,55%,45%,0.1)' : 'hsla(145,45%,40%,0.1)'
    const groupLabel = isAE ? '🌍 Aff. Étrangères' : '🇲🇦 Aff. Maroc'
    const allActive = isAllActive(group)
    const opts = COMBINED_OPTIONS.filter(o => o.group === group)

    return (
      <div key={group} className={compact ? '' : 'space-y-1'}>
        {/* Group header */}
        <div className="flex items-center" style={{ marginBottom: compact ? '3px' : '4px' }}>
          <span
            className="font-semibold text-gray-400 px-0.5"
            style={{ fontSize: compact ? '0.6rem' : '0.65rem' }}
          >
            {groupLabel}
          </span>
          <button
            onClick={() => handleToggleAll(group)}
            style={toutBtnStyle(allActive, groupColor)}
            title={`Tout sélectionner (TTY + TTE + FAC)`}
            onMouseEnter={e => {
              if (!allActive) {
                e.currentTarget.style.borderColor = groupColor
                e.currentTarget.style.color = groupColor
                e.currentTarget.style.background = groupHover
              }
            }}
            onMouseLeave={e => {
              if (!allActive) {
                e.currentTarget.style.borderColor = 'var(--color-gray-200)'
                e.currentTarget.style.color = 'var(--color-gray-400)'
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            {allActive ? '✓ Tout' : 'Tout'}
          </button>
        </div>

        {/* Toggle buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
          {opts.map(opt => {
            const highlighted = isHighlighted(opt)
            return (
              <button
                key={opt.id}
                onClick={() => handleToggle(opt)}
                style={btnStyle(opt.color, highlighted)}
                title={opt.label}
                onMouseEnter={e => {
                  if (!highlighted) {
                    e.currentTarget.style.borderColor = opt.color
                    e.currentTarget.style.color = opt.color
                    e.currentTarget.style.background = `${opt.color}18`
                  }
                }}
                onMouseLeave={e => {
                  if (!highlighted) {
                    e.currentTarget.style.borderColor = 'var(--color-gray-200)'
                    e.currentTarget.style.color = 'var(--color-gray-500)'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {opt.label.replace(`${isAE ? 'AE' : 'AM'}-`, '')}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '6px' : '8px' }}>
      {/* Header + badge */}
      <div className="flex items-center gap-1.5">
        <span
          className="font-bold uppercase tracking-wider text-gray-400"
          style={{ fontSize: '0.65rem' }}
        >
          Périmètre × Type
        </span>
        {activeLabel && (
          <span
            className="font-bold rounded-full text-white"
            style={{
              fontSize: '0.58rem',
              padding: '1px 6px',
              background: activeLabel.color,
            }}
          >
            {activeLabel.label}
          </span>
        )}
      </div>

      {/* Groups */}
      {renderGroup('ae')}
      {renderGroup('am')}
    </div>
  )
}
