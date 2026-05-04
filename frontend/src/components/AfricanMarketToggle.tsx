/**
 * AfricanMarketToggle — Bouton toggle rapide "Marchés Africains"
 *
 * Quand actif, filtre les données sur les pays africains disponibles.
 * Réutilisable dans LocalFilterPanel et Analysis.tsx.
 */
import React from 'react'
import { getAvailableAfricanMarkets } from '../constants/africanMarkets'

interface AfricanMarketToggleProps {
  /** Liste des pays risque disponibles (depuis filterOptions.pays_risque) */
  availableCountries: string[]
  /** true quand le filtre Afrique est actif */
  active: boolean
  /** Callback quand on toggle */
  onToggle: (active: boolean) => void
  compact?: boolean
}

export default function AfricanMarketToggle({
  availableCountries,
  active,
  onToggle,
  compact = false,
}: AfricanMarketToggleProps) {
  const africanCount = getAvailableAfricanMarkets(availableCountries).length

  // Don't render if no African countries available in data
  if (africanCount === 0) return null

  const color = 'hsl(145,45%,38%)'
  const bgActive = color
  const bgInactive = 'transparent'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '3px' : '5px' }}>
      {/* Label */}
      {!compact && (
        <span
          className="font-bold uppercase tracking-wider text-gray-400"
          style={{ fontSize: '0.65rem' }}
        >
          Marchés Africains
        </span>
      )}

      <button
        onClick={() => onToggle(!active)}
        title={`${active ? 'Désactiver' : 'Activer'} le filtre marchés africains (${africanCount} pays)`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: compact ? '4px 10px' : '6px 12px',
          borderRadius: '8px',
          border: active ? `1.5px solid ${color}` : '1.5px solid var(--color-gray-200)',
          background: active ? bgActive : bgInactive,
          color: active ? '#fff' : 'var(--color-gray-500)',
          fontSize: compact ? '0.68rem' : '0.72rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          letterSpacing: '0.02em',
          width: '100%',
          justifyContent: 'center',
        } as React.CSSProperties}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.borderColor = color
            e.currentTarget.style.color = color
            e.currentTarget.style.background = `hsla(145,45%,38%,0.08)`
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.borderColor = 'var(--color-gray-200)'
            e.currentTarget.style.color = 'var(--color-gray-500)'
            e.currentTarget.style.background = bgInactive
          }
        }}
      >
        <span style={{ fontSize: compact ? '0.8rem' : '0.9rem' }}>🌍</span>
        {active ? `✓ Marchés Africains` : `Marchés Africains`}
        <span
          style={{
            fontSize: '0.6rem',
            fontWeight: 800,
            padding: '1px 5px',
            borderRadius: '10px',
            background: active ? 'rgba(255,255,255,0.25)' : 'var(--color-gray-100)',
            color: active ? '#fff' : 'var(--color-gray-500)',
          }}
        >
          {africanCount}
        </span>
      </button>
    </div>
  )
}
