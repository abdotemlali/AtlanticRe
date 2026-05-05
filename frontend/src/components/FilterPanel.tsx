import React from 'react';
// 🎨 STYLE UPDATED — FilterPanel : sidebar glassmorphism, sections collapsables avec transitions, reset badge premium
// F1: UW Year en 1ère position avec toggle 3 modes | F2: Type cédante checkboxes
// C1: uw_years (non-contiguous multi-year) | C3: resetToDefaultYear
import { useMemo, useState } from "react"
import Select from 'react-select'
import { useData, FilterState } from '../context/DataContext'
import { Filter, ChevronUp, RotateCcw, X, Globe } from 'lucide-react'
import { getAvailableAfricanMarkets, isAfricanFilterActive } from '../constants/africanMarkets'
import { Skeleton } from './ui/Skeleton'

const selectStyles = {
  classNamePrefix: 'rs',
  menuPortalTarget: typeof document !== 'undefined' ? document.body : undefined,
  menuPosition: 'fixed' as const,
}

/* ─── Collapsable Section ─── */
function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-250 group"
        style={{ color: 'var(--color-navy)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-navy-muted)' }}
        onMouseLeave={e => { e.currentTarget.style.background = '' }}
      >
        <span className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-gray-600 group-hover:text-navy transition-colors">
          {title}
        </span>
        <ChevronUp
          size={13}
          className="text-gray-400 group-hover:text-navy transition-all duration-250"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}
        />
      </button>

      {/* Animated content */}
      <div
        className="overflow-hidden transition-all duration-300 ease-out-expo"
        style={{ maxHeight: open ? '800px' : '0px', opacity: open ? 1 : 0 }}
      >
        <div className="px-4 pb-3 space-y-2.5">
          {children}
        </div>
      </div>
    </div>
  )
}



function toOptions(arr: string[]) { return arr.map(v => ({ value: v, label: v })) }
function toNumOptions(arr: number[]) { return arr.map(v => ({ value: v, label: String(v) })) }

const STATUS_ALL = ['CONFIRMED', 'CLOSED', 'ACCEPTED', 'OFFER LOGGED', 'CANCELLED', 'COMMUTED', 'IDENTF']
const TYPE_CONTRACT_ALL = ['PROPORT.', 'XOL', 'QUOTA SHARE', 'SURPLUS', 'AUTRES']
const LIFE_BRANCH = 'VIE'

/* ─── Status badge color dot ─── */
const STATUS_DOTS: Record<string, string> = {
  CONFIRMED: '#10b981', ACCEPTED: '#3b82f6', CLOSED: '#94a3b8',
  'OFFER LOGGED': '#0ea5e9', CANCELLED: '#ef4444',
  COMMUTED: '#f59e0b', IDENTF: '#8b5cf6',
}

/* ─── UW Year Mode toggle ─── */
type YearMode = 'specific' | 'multiple' | 'all'

function YearFilter({ uwYears }: { uwYears: number[] }) {
  const { draftFilters: filters, setDraftFilters: setFilters } = useData()
  const [mode, setMode] = useState<YearMode>(() => {
    if (filters.uw_years.length > 0) return 'multiple'
    if (filters.uw_year_min !== null && filters.uw_year_min === filters.uw_year_max) return 'specific'
    if (filters.uw_year_min === null && filters.uw_year_max === null) return 'all'
    return 'specific'
  })

  const switchMode = (newMode: YearMode) => {
    setMode(newMode)
    // Always clear uw_years on mode switch (C1)
    if (newMode === 'all') {
      setFilters(f => ({ ...f, uw_years: [], uw_year_min: null, uw_year_max: null, underwriting_years: [] }))
    } else if (newMode === 'specific') {
      const defaultYear = filters.uw_year_min ?? filters.uw_years[0] ?? (uwYears.length ? uwYears[uwYears.length - 1] : null)
      setFilters(f => ({ ...f, uw_years: [], uw_year_min: defaultYear, uw_year_max: defaultYear, underwriting_years: [] }))
    } else {
      // multiple — reset min/max, user will select
      setFilters(f => ({ ...f, uw_years: [], uw_year_min: null, uw_year_max: null, underwriting_years: [] }))
    }
  }

  const pillStyle = (active: boolean) => ({
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: '0.68rem',
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    background: active ? 'var(--color-navy)' : 'transparent',
    color: active ? '#fff' : 'var(--color-gray-500)',
    transition: 'all .2s',
  })

  return (
    <div className="space-y-2">
      {/* Mode toggle pills */}
      <div
        className="flex gap-1 p-0.5 rounded-lg"
        style={{ background: 'var(--color-gray-100)' }}
      >
        <button style={pillStyle(mode === 'specific')} onClick={() => switchMode('specific')}>Spécifique</button>
        <button style={pillStyle(mode === 'multiple')} onClick={() => switchMode('multiple')}>Plusieurs</button>
        <button style={pillStyle(mode === 'all')} onClick={() => switchMode('all')}>Toutes</button>
      </div>

      {/* Controls per mode */}
      {mode === 'specific' && (
        <select
          className="input-dark text-xs py-1.5 w-full"
          value={filters.uw_year_min ?? ''}
          onChange={e => {
            const y = Number(e.target.value)
            setFilters(f => ({ ...f, uw_year_min: y, uw_year_max: y }))
          }}
        >
          {uwYears.slice().reverse().map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      )}

      {mode === 'multiple' && (
        <Select
          isMulti
          options={toNumOptions(uwYears)}
          {...selectStyles}
          placeholder="Sélectionner les années…"
          value={toNumOptions(filters.uw_years.length > 0 ? filters.uw_years : filters.underwriting_years)}
          onChange={v => {
            // C1: set uw_years (exact, non-contiguous list) and clear min/max
            const selected = v.map(x => x.value)
            setFilters(f => ({ ...f, uw_years: selected, uw_year_min: null, uw_year_max: null, underwriting_years: [] }))
          }}
        />
      )}

      {mode === 'all' && (
        <p className="text-[0.72rem] text-gray-400 italic px-1">Aucun filtre temporel appliqué</p>
      )}
    </div>
  )
}

export default function FilterPanel() {
  const { draftFilters: filters, setDraftFilters: setFilters, resetFilters, resetToDefaultYear, filterOptions } = useData()
  const [brancheScope, setBrancheScope] = useState({ vie: true, nonVie: true })
  const allBrancheValues = filterOptions?.branc || []

  const applyBrancheScope = (vie: boolean, nonVie: boolean) => {
    setBrancheScope({ vie, nonVie })
    setFilters(prev => {
      // Set vie_non_vie_view for backend filtering on VIE_NON_VIE column
      let vieView = ''
      if (vie && !nonVie) vieView = 'VIE'
      else if (!vie && nonVie) vieView = 'NON_VIE'
      // else: both or neither → no scope filter

      return { ...prev, vie_non_vie_view: vieView, branche: [], sous_branche: [] }
    })
  }

  const brancheOptions = useMemo(() => {
    if (brancheScope.vie && !brancheScope.nonVie) {
      return toOptions(allBrancheValues.filter(branch => branch === LIFE_BRANCH))
    }
    if (!brancheScope.vie && brancheScope.nonVie) {
      return toOptions(allBrancheValues.filter(branch => branch !== LIFE_BRANCH))
    }
    return toOptions(allBrancheValues)
  }, [allBrancheValues, brancheScope])

  const subBrancheOptions = useMemo(() => {
    if (!filterOptions?.sous_branche) return []
    if (filters.branche.length === 0) {
      const all: string[] = []
      Object.values(filterOptions.sous_branche).forEach(arr => all.push(...arr))
      return toOptions([...new Set(all)].sort())
    }
    const options: string[] = []
    filters.branche.forEach(b => { options.push(...(filterOptions.sous_branche[b] || [])) })
    return toOptions([...new Set(options)].sort())
  }, [filterOptions, filters.branche])

  const activeCount = useMemo(() => {
    let n = 0
    // Périmètre × Type combiné = un seul filtre
    if (filters.perimetre.length || filters.type_contrat_spc.length) n++
    if (filters.specialite.length) n++
    if (filters.int_spc_search) n++
    if (filters.branche.length) n++
    if (filters.sous_branche.length) n++
    if (filters.pays_risque.length) n++
    if (filters.pays_cedante.length) n++
    if (filters.courtier.length) n++
    if (filters.cedante.length) n++
    if (filters.underwriting_years.length) n++
    if (filters.uw_year_min || filters.uw_year_max) n++
    if (filters.statuts.length) n++
    if (filters.type_of_contract.length) n++
    if (filters.type_cedante.length) n++
    if (filters.insured_name?.length) n++
    return n
  }, [filters])

  /* Loading skeleton */
  if (!filterOptions) {
    return (
      <div
        className="flex flex-col h-full overflow-y-auto"
        style={{ width: 272, background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRight: '1px solid var(--color-gray-100)', boxShadow: '2px 0 20px hsla(209,28%,14%,0.07)' }}
      >
        <div className="p-4 space-y-3 mt-14">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-9" style={{ animationDelay: `${i * 60}ms` }} />)}
        </div>
      </div>
    )
  }

  // Generate Active Filter Chips
  const activeChips: { label: string; onRemove: () => void }[] = []
  const removeFilter = (key: keyof FilterState, value?: any) => {
    setFilters(prev => {
      const next = { ...prev }
      if (Array.isArray(next[key]) && value) {
        // @ts-ignore
        next[key] = next[key].filter(v => v !== value)
      } else {
        // @ts-ignore
        next[key] = Array.isArray(next[key]) ? [] : null
      }
      return next
    })
  }

  // Périmètre × Type : afficher un seul chip combiné (e.g. 'AE-TTY' ou 'AE-TT')
  if (filters.perimetre.length > 0 || filters.type_contrat_spc.length > 0) {
    const perLabel = filters.perimetre.join('+') || '?'
    const typeLabel = filters.type_contrat_spc.length === 3 && ['TTY','TTE','FAC'].every(t => filters.type_contrat_spc.includes(t))
      ? 'TOUT'
      : filters.type_contrat_spc.length === 2 && filters.type_contrat_spc.includes('TTY') && filters.type_contrat_spc.includes('TTE')
      ? 'TT'
      : filters.type_contrat_spc.join('+') || '?'
    activeChips.push({
      label: `${perLabel}-${typeLabel}`,
      onRemove: () => setFilters(f => ({ ...f, perimetre: [], type_contrat_spc: [] })),
    })
  }

  const arrayFilters: (keyof FilterState)[] = ['specialite', 'branche', 'sous_branche', 'pays_cedante', 'courtier', 'cedante', 'underwriting_years', 'type_of_contract', 'statuts', 'type_cedante', 'insured_name']
  arrayFilters.forEach(k => {
    const vals = filters[k] as string[] | number[]
    if (vals && vals.length > 0) {
      vals.forEach(v => {
        activeChips.push({ label: String(v), onRemove: () => removeFilter(k, v) })
      })
    }
  })

  // pays_risque : un seul chip "Marchés Africains" si le toggle est actif, sinon chips individuels
  if (filters.african_markets_only) {
    activeChips.push({
      label: '🌍 Marchés Africains',
      onRemove: () => setFilters(f => ({ ...f, pays_risque: [], african_markets_only: false })),
    })
  } else if (filters.pays_risque.length > 0) {
    filters.pays_risque.forEach(v => {
      activeChips.push({ label: v, onRemove: () => removeFilter('pays_risque', v) })
    })
  }

  // Special cases for string/number filters
  if (filters.int_spc_search) {
    activeChips.push({ label: `Recherche: ${filters.int_spc_search}`, onRemove: () => removeFilter('int_spc_search') })
  }
  if (filters.uw_year_min && filters.uw_year_min === filters.uw_year_max) {
    activeChips.push({ label: `Année: ${filters.uw_year_min}`, onRemove: () => setFilters(f => ({ ...f, uw_year_min: null, uw_year_max: null })) })
  } else {
    if (filters.uw_year_min) {
      activeChips.push({ label: `Année Min: ${filters.uw_year_min}`, onRemove: () => removeFilter('uw_year_min') })
    }
    if (filters.uw_year_max) {
      activeChips.push({ label: `Année Max: ${filters.uw_year_max}`, onRemove: () => removeFilter('uw_year_max') })
    }
  }


  const typeCedanteOptions = filterOptions.type_cedante_options?.length
    ? filterOptions.type_cedante_options
    : ['ASSUREUR', 'REASSUREUR']

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        width: 272,
        background: 'hsla(220,20%,98%,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRight: '1px solid var(--color-gray-100)',
        boxShadow: '2px 0 20px hsla(209,28%,14%,0.07)',
      }}
    >
      {/* ─── Sticky Header ─── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{
          background: 'hsla(220,20%,98%,0.98)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: 'none',
          boxShadow: '0 1px 0 var(--color-gray-100)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-navy-muted)' }}
          >
            <Filter size={13} style={{ color: 'var(--color-navy)' }} />
          </div>
          <span className="text-[0.82rem] font-bold text-navy tracking-wide">Filtres</span>
          {activeCount > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white animate-scale-in"
              style={{ background: 'var(--color-green)', boxShadow: 'var(--shadow-green-glow)' }}
            >
              {activeCount}
            </span>
          )}
        </div>

        <button
          onClick={() => { resetFilters(); resetToDefaultYear() }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[0.7rem] font-semibold text-gray-500 transition-all duration-250"
          title="Réinitialiser tous les filtres (remet l'année N)"
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-red-muted)'; e.currentTarget.style.color = 'var(--color-red)' }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '' }}
        >
          <RotateCcw size={11} />
          Réinitialiser
        </button>
      </div>

      {/* ─── Active Filters Summary ─── */}
      {activeChips.length > 0 && (
        <div className="px-5 py-3 border-b border-[var(--color-gray-100)] bg-[var(--color-off-white)]">
          <div className="flex flex-wrap gap-2">
            {activeChips.map((chip, idx) => (
              <span
                key={idx}
                className="chip animate-fade-in group"
              >
                {chip.label}
                <button
                  onClick={chip.onRemove}
                  className="chip__remove"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── Filter sections ─── */}
      <div className="py-2">

        {/* ── FEATURE 1: Année de souscription (1ère position) ── */}
        <Section title="Année de souscription">
          <YearFilter uwYears={filterOptions.underwriting_years} />
        </Section>

        <div className="divider-gradient" />

        {/* ── FEATURE 2: Type cédante ── */}
        <Section title="Type cédante">
          <div className="space-y-1.5">
            {typeCedanteOptions.map(t => (
              <label key={t} className="flex items-center gap-2.5 cursor-pointer group px-1 py-0.5 rounded transition-colors hover:bg-navy-muted">
                <input
                  type="checkbox"
                  checked={filters.type_cedante.includes(t)}
                  onChange={e => {
                    const next = e.target.checked ? [...filters.type_cedante, t] : filters.type_cedante.filter(x => x !== t)
                    setFilters(f => ({ ...f, type_cedante: next }))
                  }}
                />
                <span className="text-[0.82rem] font-medium text-gray-600 group-hover:text-navy transition-colors capitalize">
                  {t === 'REASSUREUR' ? 'Réassureur' : t === 'ASSUREUR' ? 'Assureur' : t}
                </span>
              </label>
            ))}
          </div>
        </Section>

        <div className="mx-4 my-1" style={{ borderTop: '1px solid var(--color-gray-100)' }} />

        {/* INT_SPC — Filtre combiné Périmètre × Type */}
        <Section title="Spécialité">
          {(() => {
            /* ── Combined filter definitions ── */
            const ALL_TYPES = ['TTY', 'TTE', 'FAC']
            const COMBINED_OPTIONS = [
              { id: 'ae-tt',  label: 'AE-TT',  perimetre: ['AE'], types: ['TTY', 'TTE'], group: 'ae', color: 'var(--color-navy)' },
              { id: 'ae-tty', label: 'AE-TTY', perimetre: ['AE'], types: ['TTY'],        group: 'ae', color: 'hsl(209,55%,45%)' },
              { id: 'ae-tte', label: 'AE-TTE', perimetre: ['AE'], types: ['TTE'],        group: 'ae', color: 'hsl(209,55%,55%)' },
              { id: 'ae-fac', label: 'AE-FAC', perimetre: ['AE'], types: ['FAC'],        group: 'ae', color: 'hsl(209,55%,65%)' },
              { id: 'am-tt',  label: 'AM-TT',  perimetre: ['AM'], types: ['TTY', 'TTE'], group: 'am', color: 'hsl(145,45%,40%)' },
              { id: 'am-tty', label: 'AM-TTY', perimetre: ['AM'], types: ['TTY'],        group: 'am', color: 'hsl(145,40%,48%)' },
              { id: 'am-tte', label: 'AM-TTE', perimetre: ['AM'], types: ['TTE'],        group: 'am', color: 'hsl(145,40%,55%)' },
              { id: 'am-fac', label: 'AM-FAC', perimetre: ['AM'], types: ['FAC'],        group: 'am', color: 'hsl(145,40%,62%)' },
            ]

            /* Check exact match (for toggle logic) */
            const isExactActive = (opt: typeof COMBINED_OPTIONS[0]) => {
              const pMatch = opt.perimetre.length === filters.perimetre.length && opt.perimetre.every(p => filters.perimetre.includes(p))
              const tMatch = opt.types.length === filters.type_contrat_spc.length && opt.types.every(t => filters.type_contrat_spc.includes(t))
              return pMatch && tMatch
            }

            /* Check if button should appear highlighted (subset match — lit up when "Tout" is active) */
            const isHighlighted = (opt: typeof COMBINED_OPTIONS[0]) => {
              const pMatch = opt.perimetre.every(p => filters.perimetre.includes(p))
              const tMatch = opt.types.every(t => filters.type_contrat_spc.includes(t))
              return pMatch && tMatch
            }

            /* Check if "Tout" (all) is active for a group */
            const isAllActive = (group: 'ae' | 'am') => {
              const per = group === 'ae' ? 'AE' : 'AM'
              const pMatch = filters.perimetre.length === 1 && filters.perimetre[0] === per
              const tMatch = ALL_TYPES.length === filters.type_contrat_spc.length && ALL_TYPES.every(t => filters.type_contrat_spc.includes(t))
              return pMatch && tMatch
            }

            /* Toggle handler for individual buttons */
            const handleToggle = (opt: typeof COMBINED_OPTIONS[0]) => {
              if (isExactActive(opt)) {
                // Deactivate — clear both filters
                setFilters(f => ({ ...f, perimetre: [], type_contrat_spc: [] }))
              } else {
                // Activate — set both filters
                setFilters(f => ({ ...f, perimetre: [...opt.perimetre], type_contrat_spc: [...opt.types] }))
              }
            }

            /* Toggle handler for "Tout" button */
            const handleToggleAll = (group: 'ae' | 'am') => {
              if (isAllActive(group)) {
                setFilters(f => ({ ...f, perimetre: [], type_contrat_spc: [] }))
              } else {
                const per = group === 'ae' ? 'AE' : 'AM'
                setFilters(f => ({ ...f, perimetre: [per], type_contrat_spc: [...ALL_TYPES] }))
              }
            }

            /* Compute active label for badge */
            const activeLabel = (() => {
              if (isAllActive('ae')) return { label: 'AE-TOUT', color: 'var(--color-navy)' }
              if (isAllActive('am')) return { label: 'AM-TOUT', color: 'hsl(145,45%,40%)' }
              const exact = COMBINED_OPTIONS.find(o => isExactActive(o))
              return exact ? { label: exact.label, color: exact.color } : null
            })()

            const btnStyle = (color: string, active: boolean): React.CSSProperties => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5px 0',
              borderRadius: '6px',
              border: active ? `1.5px solid ${color}` : '1.5px solid var(--color-gray-200)',
              background: active ? color : 'transparent',
              color: active ? '#fff' : 'var(--color-gray-500)',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              letterSpacing: '0.03em',
              flex: 1,
            })

            /* "Tout" button style */
            const toutBtnStyle = (active: boolean, color: string): React.CSSProperties => ({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '1px 7px',
              borderRadius: '4px',
              border: active ? `1.5px solid ${color}` : '1.5px solid var(--color-gray-200)',
              background: active ? color : 'transparent',
              color: active ? '#fff' : 'var(--color-gray-400)',
              fontSize: '0.6rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              letterSpacing: '0.04em',
              textTransform: 'uppercase' as const,
              marginLeft: 'auto',
            })

            return (
              <div className="space-y-2">
                {/* Label */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-gray-400">Périmètre × Type</span>
                  {activeLabel && (
                    <span
                      className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full text-white animate-scale-in"
                      style={{ background: activeLabel.color }}
                    >
                      {activeLabel.label}
                    </span>
                  )}
                </div>

                {/* AE Group — Affaires Étrangères */}
                <div className="space-y-1">
                  <div className="flex items-center">
                    <span className="text-[0.65rem] font-semibold text-gray-400 px-0.5">🌍 Affaires Étrangères</span>
                    <button
                      onClick={() => handleToggleAll('ae')}
                      style={toutBtnStyle(isAllActive('ae'), 'var(--color-navy)')}
                      title="Sélectionner tout AE (TTY + TTE + FAC)"
                      onMouseEnter={e => {
                        if (!isAllActive('ae')) {
                          e.currentTarget.style.borderColor = 'var(--color-navy)'
                          e.currentTarget.style.color = 'var(--color-navy)'
                          e.currentTarget.style.background = 'hsla(209,55%,45%,0.1)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isAllActive('ae')) {
                          e.currentTarget.style.borderColor = 'var(--color-gray-200)'
                          e.currentTarget.style.color = 'var(--color-gray-400)'
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      {isAllActive('ae') ? '✓ Tout' : 'Tout'}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {COMBINED_OPTIONS.filter(o => o.group === 'ae').map(opt => {
                      const highlighted = isHighlighted(opt)
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleToggle(opt)}
                          style={btnStyle(opt.color, highlighted)}
                          onMouseEnter={e => {
                            if (!highlighted) {
                              e.currentTarget.style.borderColor = opt.color
                              e.currentTarget.style.color = opt.color
                              e.currentTarget.style.background = `${opt.color}15`
                            }
                          }}
                          onMouseLeave={e => {
                            if (!highlighted) {
                              e.currentTarget.style.borderColor = 'var(--color-gray-200)'
                              e.currentTarget.style.color = 'var(--color-gray-500)'
                              e.currentTarget.style.background = 'transparent'
                            }
                          }}
                          title={opt.id === 'ae-tt' ? 'Affaires Étrangères — Treaty (TTY + TTE)' : `Affaires Étrangères — ${opt.types.join(', ')}`}
                        >
                          {opt.label.replace('AE-', '')}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* AM Group — Affaires Maroc */}
                <div className="space-y-1">
                  <div className="flex items-center">
                    <span className="text-[0.65rem] font-semibold text-gray-400 px-0.5">🇲🇦 Affaires Maroc</span>
                    <button
                      onClick={() => handleToggleAll('am')}
                      style={toutBtnStyle(isAllActive('am'), 'hsl(145,45%,40%)')}
                      title="Sélectionner tout AM (TTY + TTE + FAC)"
                      onMouseEnter={e => {
                        if (!isAllActive('am')) {
                          e.currentTarget.style.borderColor = 'hsl(145,45%,40%)'
                          e.currentTarget.style.color = 'hsl(145,45%,40%)'
                          e.currentTarget.style.background = 'hsla(145,45%,40%,0.1)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isAllActive('am')) {
                          e.currentTarget.style.borderColor = 'var(--color-gray-200)'
                          e.currentTarget.style.color = 'var(--color-gray-400)'
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      {isAllActive('am') ? '✓ Tout' : 'Tout'}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {COMBINED_OPTIONS.filter(o => o.group === 'am').map(opt => {
                      const highlighted = isHighlighted(opt)
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleToggle(opt)}
                          style={btnStyle(opt.color, highlighted)}
                          onMouseEnter={e => {
                            if (!highlighted) {
                              e.currentTarget.style.borderColor = opt.color
                              e.currentTarget.style.color = opt.color
                              e.currentTarget.style.background = `${opt.color}15`
                            }
                          }}
                          onMouseLeave={e => {
                            if (!highlighted) {
                              e.currentTarget.style.borderColor = 'var(--color-gray-200)'
                              e.currentTarget.style.color = 'var(--color-gray-500)'
                              e.currentTarget.style.background = 'transparent'
                            }
                          }}
                          title={opt.id === 'am-tt' ? 'Affaires Maroc — Treaty (TTY + TTE)' : `Affaires Maroc — ${opt.types.join(', ')}`}
                        >
                          {opt.label.replace('AM-', '')}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()}
          <Select isMulti options={toOptions(filterOptions.specialite)} {...selectStyles} placeholder="Spécialité" value={toOptions(filters.specialite)} onChange={v => setFilters(f => ({ ...f, specialite: v.map(x => x.value) }))} />
          <input type="text" className="input-dark text-xs" placeholder="Recherche libre INT_SPC..." value={filters.int_spc_search} onChange={e => setFilters(f => ({ ...f, int_spc_search: e.target.value }))} />
        </Section>

        <div className="mx-4 my-1" style={{ borderTop: '1px solid var(--color-gray-100)' }} />

        {/* Business */}
        <Section title="Données métier">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2.5 cursor-pointer group px-1 py-0.5 rounded transition-colors hover:bg-navy-muted">
              <input
                type="checkbox"
                checked={brancheScope.vie}
                onChange={e => applyBrancheScope(e.target.checked, brancheScope.nonVie)}
              />
              <span className="text-[0.82rem] font-medium text-gray-600 group-hover:text-navy transition-colors">Vie</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer group px-1 py-0.5 rounded transition-colors hover:bg-navy-muted">
              <input
                type="checkbox"
                checked={brancheScope.nonVie}
                onChange={e => applyBrancheScope(brancheScope.vie, e.target.checked)}
              />
              <span className="text-[0.82rem] font-medium text-gray-600 group-hover:text-navy transition-colors">Non-vie</span>
            </label>
          </div>
          <Select
            isMulti
            options={brancheOptions}
            {...selectStyles}
            placeholder="Branche"
            value={toOptions(filters.branche)}
            onChange={v => {
              setBrancheScope({ vie: false, nonVie: false })
              setFilters(f => ({ ...f, branche: v.map(x => x.value), sous_branche: [] }))
            }}
          />
          <Select isMulti options={subBrancheOptions} {...selectStyles} placeholder="Sous-branche" value={toOptions(filters.sous_branche)} isDisabled={subBrancheOptions.length === 0} onChange={v => setFilters(f => ({ ...f, sous_branche: v.map(x => x.value) }))} />
          {/* ── Toggle rapide : Marchés Africains ── */}
          {(() => {
            const availPays = filterOptions.pays_risque ?? []
            const africanAvail = getAvailableAfricanMarkets(availPays)
            const isActive = isAfricanFilterActive(filters.pays_risque, availPays)

            const handleToggle = () => {
              if (isActive) {
                // Désactiver → vider pays_risque ET réinitialiser le flag
                setFilters(f => ({ ...f, pays_risque: [], african_markets_only: false }))
              } else {
                // Activer → remplir pays_risque + poser le flag UI
                setFilters(f => ({ ...f, pays_risque: africanAvail, african_markets_only: true }))
              }
            }

            return (
              <button
                onClick={handleToggle}
                title={isActive ? 'Désactiver le filtre marchés africains' : 'Filtrer uniquement les marchés africains'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: isActive
                    ? '1.5px solid var(--color-navy)'
                    : '1.5px solid var(--color-gray-200)',
                  background: isActive
                    ? 'var(--color-navy)'
                    : 'transparent',
                  color: isActive ? '#fff' : 'var(--color-gray-500)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: africanAvail.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: africanAvail.length === 0 ? 0.4 : 1,
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.02em',
                }}
                disabled={africanAvail.length === 0}
                onMouseEnter={e => {
                  if (!isActive && africanAvail.length > 0) {
                    e.currentTarget.style.borderColor = 'var(--color-navy)'
                    e.currentTarget.style.color = 'var(--color-navy)'
                    e.currentTarget.style.background = 'var(--color-navy-muted)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--color-gray-200)'
                    e.currentTarget.style.color = 'var(--color-gray-500)'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <Globe
                  size={13}
                  style={{
                    flexShrink: 0,
                    animation: isActive ? 'spin 8s linear infinite' : 'none',
                  }}
                />
                <span style={{ flex: 1, textAlign: 'left' }}>
                  {isActive ? '✓ Marchés Africains' : 'Marchés Africains'}
                </span>
                {isActive && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      background: 'hsla(0,0%,100%,0.25)',
                      borderRadius: '4px',
                      padding: '1px 5px',
                      fontWeight: 800,
                    }}
                  >
                    {africanAvail.length} pays
                  </span>
                )}
              </button>
            )
          })()}

          {/* Sélecteur Pays risque : masqué quand le toggle africain est actif */}
          {filters.african_markets_only ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '8px',
                border: '1.5px solid hsla(209,28%,24%,0.25)',
                background: 'hsla(209,28%,24%,0.04)',
                fontSize: '0.73rem',
                color: 'var(--color-navy)',
                fontWeight: 600,
              }}
            >
              <Globe size={11} style={{ opacity: 0.6, flexShrink: 0 }} />
              <span style={{ opacity: 0.7 }}>Afrique ({filters.pays_risque.length} pays)</span>
              <button
                onClick={() => setFilters(f => ({ ...f, pays_risque: [], african_markets_only: false }))}
                style={{ marginLeft: 'auto', opacity: 0.5, cursor: 'pointer', background: 'none', border: 'none', padding: 0, display: 'flex', color: 'inherit' }}
                title="Réinitialiser le filtre africain"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <Select isMulti options={toOptions(filterOptions.pays_risque)} {...selectStyles} placeholder="Pays du risque" value={toOptions(filters.pays_risque)} onChange={v => setFilters(f => ({ ...f, pays_risque: v.map(x => x.value), african_markets_only: false }))} />
          )}
          <Select isMulti options={toOptions(filterOptions.pays_cedante)} {...selectStyles} placeholder="Pays cédante" value={toOptions(filters.pays_cedante)} onChange={v => setFilters(f => ({ ...f, pays_cedante: v.map(x => x.value) }))} />
          <Select isMulti options={toOptions(filterOptions.courtiers)} {...selectStyles} placeholder="Courtier" value={toOptions(filters.courtier)} onChange={v => setFilters(f => ({ ...f, courtier: v.map(x => x.value) }))} />
          <Select isMulti options={toOptions(filterOptions.cedantes)} {...selectStyles} placeholder="Cédante" value={toOptions(filters.cedante)} onChange={v => setFilters(f => ({ ...f, cedante: v.map(x => x.value) }))} />
        </Section>

        <div className="mx-4 my-1" style={{ borderTop: '1px solid var(--color-gray-100)' }} />

        {/* Assuré (INSURED_NAME_NORM) */}
        {filterOptions.insured_names?.length > 0 && (
          <Section title="Assuré" defaultOpen={false}>
            <Select
              isMulti
              options={toOptions(filterOptions.insured_names)}
              {...selectStyles}
              placeholder="Rechercher un assuré..."
              value={toOptions(filters.insured_name ?? [])}
              onChange={v => setFilters(f => ({ ...f, insured_name: v.map((x: any) => x.value) }))}
            />
          </Section>
        )}

        <div className="mx-4 my-1" style={{ borderTop: '1px solid var(--color-gray-100)' }} />

        {/* Status contrat */}
        <Section title="Statut contrat">
          <div className="space-y-1.5">
            {STATUS_ALL.map(s => (
              <label key={s} className="flex items-center gap-2.5 cursor-pointer group px-1 py-0.5 rounded transition-colors hover:bg-navy-muted">
                <input
                  type="checkbox"
                  checked={filters.statuts.includes(s)}
                  onChange={e => {
                    const next = e.target.checked ? [...filters.statuts, s] : filters.statuts.filter(x => x !== s)
                    setFilters(f => ({ ...f, statuts: next }))
                  }}
                />
                {/* Color dot */}
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_DOTS[s] || '#94a3b8' }} />
                <span className="text-[0.82rem] font-medium text-gray-600 group-hover:text-navy transition-colors">{s}</span>
              </label>
            ))}
          </div>
        </Section>

        <div className="mx-4 my-1" style={{ borderTop: '1px solid var(--color-gray-100)' }} />

        {/* Type de contrat */}
        <Section title="Type de contrat">
          <div className="space-y-1.5">
            {TYPE_CONTRACT_ALL.map(t => (
              <label key={t} className="flex items-center gap-2.5 cursor-pointer group px-1 py-0.5 rounded transition-colors hover:bg-navy-muted">
                <input
                  type="checkbox"
                  checked={filters.type_of_contract.includes(t)}
                  onChange={e => {
                    const next = e.target.checked ? [...filters.type_of_contract, t] : filters.type_of_contract.filter(x => x !== t)
                    setFilters(f => ({ ...f, type_of_contract: next }))
                  }}
                />
                <span className="text-[0.82rem] font-medium text-gray-600 group-hover:text-navy transition-colors">{t}</span>
              </label>
            ))}
          </div>
        </Section>



        {/* Bottom spacing */}
        <div className="h-8" />
      </div>
    </div>
  )
}
