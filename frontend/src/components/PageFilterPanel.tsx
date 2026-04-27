/**
 * PageFilterPanel — Solution A+
 * An inline, collapsible filter panel that appears on pages without the main FilterPanel.
 * Shows only filters relevant to the current page's scope (Solution C integration).
 *
 * Usage: Place <PageFilterPanel /> just below <ActiveFiltersBar /> in any page component.
 */
import React, { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import Select from 'react-select'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'
import { useData } from '../context/DataContext'
import { PAGE_SCOPES } from '../utils/pageFilterScopes'

const selectStyles = {
  menuPortalTarget: typeof document !== 'undefined' ? document.body : undefined,
  menuPosition: 'fixed' as const,
  styles: {
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
      backgroundColor: state.isSelected ? 'var(--color-navy)' : state.isFocused ? 'var(--color-off-white)' : 'white',
      color: state.isSelected ? 'white' : 'var(--color-navy)',
    }),
    multiValue: (base: any) => ({ ...base, backgroundColor: 'hsla(209,28%,24%,0.10)' }),
    multiValueLabel: (base: any) => ({ ...base, color: 'var(--color-navy)', fontWeight: 700, fontSize: '0.72rem' }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    placeholder: (base: any) => ({ ...base, fontSize: '0.78rem' }),
  },
}

function toOptions(arr: string[]) { return arr.map(v => ({ value: v, label: v })) }
function toNumOptions(arr: number[]) { return arr.map(v => ({ value: v, label: String(v) })) }

export default function PageFilterPanel() {
  const location = useLocation()
  const { draftFilters: filters, setDraftFilters: setFilters, filterOptions } = useData()
  const [open, setOpen] = useState(false)

  const scope = PAGE_SCOPES[location.pathname]

  const keys = scope ? scope.keys.filter(k => !scope.excluded?.includes(k)) : []

  const hasYear = keys.some(k => ['uw_year_min', 'uw_year_max', 'uw_years'].includes(k))
  const hasBranche = keys.includes('branche')
  const hasSousBranche = keys.includes('sous_branche')
  const hasPaysCedante = keys.includes('pays_cedante')
  const hasPaysRisque = keys.includes('pays_risque')
  const hasTypeContrat = keys.includes('type_of_contract')
  const hasPerimetre = keys.includes('perimetre')
  const hasCedante = keys.includes('cedante')
  const hasCourtier = keys.includes('courtier')
  const hasStatuts = keys.includes('statuts')

  const sousBrancheOptions = useMemo(() => {
    if (!filterOptions?.sous_branche) return []
    if (filters.branche.length === 0) {
      const all: string[] = []
      Object.values(filterOptions.sous_branche).forEach(arr => all.push(...arr as string[]))
      return toOptions([...new Set(all)].sort())
    }
    const options: string[] = []
    filters.branche.forEach(b => { options.push(...((filterOptions.sous_branche as any)[b] || [])) })
    return toOptions([...new Set(options)].sort())
  }, [filterOptions, filters.branche])

  // Don't render if no scope is defined for this page — AFTER all hooks
  if (!scope || !filterOptions) return null

  const uwYears = filterOptions.underwriting_years ?? []

  const labelStyle = "block text-[0.70rem] font-bold uppercase tracking-wider mb-1 text-[var(--color-gray-500)]"

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all"
      style={{ borderColor: 'hsla(209,28%,24%,0.15)', background: 'hsla(209,28%,24%,0.03)' }}
    >
      {/* Toggle header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors hover:bg-[hsla(209,28%,24%,0.05)]"
        style={{ color: 'var(--color-navy)' }}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={13} />
          Filtres de cette vue
          {/* Active count badge */}
          {(() => {
            let count = 0
            if (hasYear && (filters.uw_year_min || filters.uw_year_max || filters.uw_years.length > 0)) count++
            if (hasBranche && filters.branche.length > 0) count++
            if (hasPaysCedante && filters.pays_cedante.length > 0) count++
            if (hasPaysRisque && filters.pays_risque.length > 0) count++
            if (hasTypeContrat && filters.type_of_contract.length > 0) count++
            if (hasCedante && filters.cedante.length > 0) count++
            if (hasCourtier && filters.courtier.length > 0) count++
            if (hasStatuts && filters.statuts.length > 0) count++
            return count > 0 ? (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                style={{ background: 'var(--color-navy)' }}
              >
                {count}
              </span>
            ) : null
          })()}
        </span>
        <ChevronDown
          size={14}
          className="text-[var(--color-gray-400)] transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Collapsible content */}
      <div
        style={{
          maxHeight: open ? '600px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease-in-out',
          opacity: open ? 1 : 0,
        }}
      >
        <div className="px-4 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 border-t" style={{ borderColor: 'hsla(209,28%,24%,0.10)' }}>

          {/* ─── UW Year ─── */}
          {hasYear && (
            <div>
              <label className={labelStyle}>Année de souscription</label>
              <div className="space-y-1.5">
                <Select
                  isMulti
                  options={toNumOptions(uwYears)}
                  {...selectStyles}
                  placeholder="Toutes les années…"
                  value={toNumOptions(filters.uw_years.length > 0 ? filters.uw_years : [])}
                  onChange={v => {
                    const selected = v.map((x: any) => x.value)
                    setFilters(f => ({ ...f, uw_years: selected, uw_year_min: null, uw_year_max: null }))
                  }}
                />
                {filters.uw_years.length === 0 && (
                  <div className="flex gap-1.5">
                    <select
                      title="Année min"
                      className="input-dark text-xs py-1 flex-1"
                      value={filters.uw_year_min ?? ''}
                      onChange={e => setFilters(f => ({ ...f, uw_year_min: Number(e.target.value) || null }))}
                    >
                      <option value="">Min</option>
                      {uwYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                      title="Année max"
                      className="input-dark text-xs py-1 flex-1"
                      value={filters.uw_year_max ?? ''}
                      onChange={e => setFilters(f => ({ ...f, uw_year_max: Number(e.target.value) || null }))}
                    >
                      <option value="">Max</option>
                      {uwYears.slice().reverse().map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Branche ─── */}
          {hasBranche && (
            <div>
              <label className={labelStyle}>Branche</label>
              <Select
                isMulti
                options={toOptions(filterOptions.branc ?? [])}
                {...selectStyles}
                placeholder="Toutes les branches…"
                value={toOptions(filters.branche)}
                onChange={v => setFilters(f => ({ ...f, branche: v.map((x: any) => x.value), sous_branche: [] }))}
              />
            </div>
          )}

          {/* ─── Sous-branche ─── */}
          {hasSousBranche && filters.branche.length > 0 && (
            <div>
              <label className={labelStyle}>Sous-branche</label>
              <Select
                isMulti
                options={sousBrancheOptions}
                {...selectStyles}
                placeholder="Toutes…"
                value={toOptions(filters.sous_branche)}
                onChange={v => setFilters(f => ({ ...f, sous_branche: v.map((x: any) => x.value) }))}
              />
            </div>
          )}

          {/* ─── Pays cédante ─── */}
          {hasPaysCedante && (
            <div>
              <label className={labelStyle}>Pays cédante</label>
              <Select
                isMulti
                options={toOptions(filterOptions.pays_cedante ?? [])}
                {...selectStyles}
                placeholder="Tous les pays…"
                value={toOptions(filters.pays_cedante)}
                onChange={v => setFilters(f => ({ ...f, pays_cedante: v.map((x: any) => x.value) }))}
              />
            </div>
          )}

          {/* ─── Pays risque ─── */}
          {hasPaysRisque && (
            <div>
              <label className={labelStyle}>Pays risque</label>
              <Select
                isMulti
                options={toOptions(filterOptions.pays_risque ?? [])}
                {...selectStyles}
                placeholder="Tous les pays risque…"
                value={toOptions(filters.pays_risque)}
                onChange={v => setFilters(f => ({ ...f, pays_risque: v.map((x: any) => x.value) }))}
              />
            </div>
          )}

          {/* ─── Type contrat ─── */}
          {hasTypeContrat && (
            <div>
              <label className={labelStyle}>Type de contrat</label>
              <Select
                isMulti
                options={toOptions(filterOptions.type_of_contract ?? [])}
                {...selectStyles}
                placeholder="Tous les types…"
                value={toOptions(filters.type_of_contract)}
                onChange={v => setFilters(f => ({ ...f, type_of_contract: v.map((x: any) => x.value) }))}
              />
            </div>
          )}

          {/* ─── Périmètre ─── */}
          {hasPerimetre && (
            <div>
              <label className={labelStyle}>Périmètre</label>
              <Select
                isMulti
                options={toOptions(filterOptions.perimetre ?? [])}
                {...selectStyles}
                placeholder="Tous…"
                value={toOptions(filters.perimetre)}
                onChange={v => setFilters(f => ({ ...f, perimetre: v.map((x: any) => x.value) }))}
              />
            </div>
          )}

          {/* ─── Cédante (if in scope, not excluded) ─── */}
          {hasCedante && (
            <div>
              <label className={labelStyle}>Cédante</label>
              <Select
                isMulti
                options={toOptions(filterOptions.cedantes ?? [])}
                {...selectStyles}
                placeholder="Toutes les cédantes…"
                value={toOptions(filters.cedante)}
                onChange={v => setFilters(f => ({ ...f, cedante: v.map((x: any) => x.value) }))}
              />
            </div>
          )}

          {/* ─── Courtier ─── */}
          {hasCourtier && (
            <div>
              <label className={labelStyle}>Courtier</label>
              <Select
                isMulti
                options={toOptions(filterOptions.courtiers ?? [])}
                {...selectStyles}
                placeholder="Tous les courtiers…"
                value={toOptions(filters.courtier)}
                onChange={v => setFilters(f => ({ ...f, courtier: v.map((x: any) => x.value) }))}
              />
            </div>
          )}

          {/* ─── Statuts ─── */}
          {hasStatuts && (
            <div>
              <label className={labelStyle}>Statuts</label>
              <Select
                isMulti
                options={toOptions(filterOptions.statuts ?? [])}
                {...selectStyles}
                placeholder="Tous les statuts…"
                value={toOptions(filters.statuts)}
                onChange={v => setFilters(f => ({ ...f, statuts: v.map((x: any) => x.value) }))}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
