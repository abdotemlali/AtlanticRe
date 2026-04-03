/**
 * ActiveFiltersBar — Solution A
 * Displays a banner showing active global filters that affect the current page.
 * Scoped to only show filters relevant to this page (Solution C integration).
 */
import { useLocation } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { useData } from '../context/DataContext'
import { getActiveFiltersForScope } from '../utils/pageFilterScopes'

interface ActiveFiltersBarProps {
  /** If true, the bar is always visible even when no filters are active */
  alwaysShow?: boolean
}

export default function ActiveFiltersBar({ alwaysShow = false }: ActiveFiltersBarProps) {
  const location = useLocation()
  const { filters, resetFilters } = useData()

  const activeFilters = getActiveFiltersForScope(location.pathname, filters)

  if (activeFilters.length === 0 && !alwaysShow) return null

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-xl border text-xs"
      style={{
        background: 'hsla(209,28%,24%,0.05)',
        borderColor: 'hsla(209,28%,24%,0.15)',
      }}
    >
      {/* Icon + label */}
      <div className="flex items-center gap-1.5 text-[var(--color-navy)] font-bold flex-shrink-0">
        <SlidersHorizontal size={13} />
        <span>Filtres actifs :</span>
      </div>

      {activeFilters.length === 0 ? (
        <span className="text-[var(--color-gray-400)] italic">Aucun filtre actif — affichage de toutes les données</span>
      ) : (
        <>
          {activeFilters.map(({ key, label, value }) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold"
              style={{
                background: 'hsla(209,28%,24%,0.10)',
                color: 'var(--color-navy)',
                border: '1px solid hsla(209,28%,24%,0.20)',
              }}
            >
              <span className="opacity-60">{label}:</span>
              <span className="truncate max-w-[120px]" title={value}>{value}</span>
            </span>
          ))}

          {/* Reset button */}
          <button
            onClick={resetFilters}
            title="Réinitialiser tous les filtres"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold transition-all hover:opacity-80"
            style={{
              background: 'hsla(358,66%,54%,0.10)',
              color: 'hsl(358,66%,54%)',
              border: '1px solid hsla(358,66%,54%,0.25)',
            }}
          >
            <X size={11} />
            Réinitialiser
          </button>
        </>
      )}
    </div>
  )
}
