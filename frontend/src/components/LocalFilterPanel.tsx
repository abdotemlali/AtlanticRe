/**
 * LocalFilterPanel — Reusable collapsible filter panel for page-local filters.
 *
 * Replaces the ~120-250 lines of inline filter panels that were
 * copy-pasted in CedanteAnalysis, Analysis, BrokerDetail, BrokerAnalysis.
 *
 * Usage:
 * ```tsx
 * const lf = useLocalFilters()
 * <LocalFilterPanel filters={lf} allBranches={filterOptions?.branc ?? []} />
 * ```
 */
import { useState } from 'react'
import Select from 'react-select'
import { SlidersHorizontal, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react'
import type { UseLocalFiltersReturn } from '../hooks/useLocalFilters'
import { toOptions, toNumOptions } from '../utils/formatters'
import { SHARED_SELECT_PROPS, LABEL_STYLE } from '../constants/styles'
import MarketTypeFilter from './MarketTypeFilter'
import AfricanMarketToggle from './AfricanMarketToggle'

interface LocalFilterPanelProps {
  filters: UseLocalFiltersReturn
  /** All available branch values from filterOptions.branc */
  allBranches: string[]
  /** All available UW years from filterOptions.underwriting_years */
  uwYears: number[]
  /** Type SPC options (filterOptions.type_contrat_spc) */
  typeSpcOptions?: string[]
  /** Type of contract options (filterOptions.type_of_contract) */
  typeOfContractOptions?: string[]
  /** Cedante options */
  cedanteOptions?: string[]
  /** Broker options */
  brokerOptions?: string[]
  /** Country options */
  countryOptions?: string[]
  /** All available pays risque (for African markets filter) */
  availableCountries?: string[]
  /** Assuré options (INSURED_NAME_NORM unique values) */
  insuredNameOptions?: string[]
  /** Which filter controls to show (default: all) */
  features?: ('year' | 'branch' | 'typeSpc' | 'typeContract' | 'lifeScope' | 'cedante' | 'broker' | 'country' | 'marketType' | 'africanMarkets' | 'insuredName')[]
  /** Start open (default: false) */
  defaultOpen?: boolean
}

export default function LocalFilterPanel({
  filters,
  allBranches,
  uwYears,
  typeSpcOptions = [],
  typeOfContractOptions = [],
  cedanteOptions = [],
  brokerOptions = [],
  countryOptions = [],
  availableCountries = [],
  insuredNameOptions = [],
  features,
  defaultOpen = false,
}: LocalFilterPanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  const {
    state, setUwYears, setUwYearMin, setUwYearMax,
    setBranches, setTypeSpc, setTypeOfContract,
    setCedantes, setBrokers, setCountries,
    setPerimetre, setAfricanMarketsOnly, setInsuredNames,
    applyBrancheScope, reset, activeCount, hasFilters,
  } = filters

  const show = (feat: string) => !features || features.includes(feat as any)
  const branchOpts = filters.brancheOptions(allBranches)

  return (
    <div className="bg-white rounded-xl border border-[var(--color-gray-100)] shadow-sm overflow-hidden">
      {/* Header — click to toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[var(--color-gray-50)] transition-colors"
      >
        <SlidersHorizontal size={13} className="text-[var(--color-navy)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
          Filtres de la vue
        </span>
        {activeCount > 0 && (
          <span
            className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
            style={{ background: 'var(--color-navy)' }}
          >
            {activeCount}
          </span>
        )}
        {hasFilters && (
          <span
            className="ml-2 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
            style={{
              background: 'hsla(358,66%,54%,0.08)',
              color: 'hsl(358,66%,54%)',
              border: '1px solid hsla(358,66%,54%,0.3)',
            }}
          >
            Filtres actifs
          </span>
        )}
        <span className="ml-auto text-[var(--color-gray-400)]">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="px-4 pb-4 border-t border-[var(--color-gray-100)]">
          <div className="flex items-center justify-end pt-2 pb-2">
            {hasFilters && (
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: 'hsla(358,66%,54%,0.08)',
                  color: 'hsl(358,66%,54%)',
                  border: '1px solid hsla(358,66%,54%,0.3)',
                }}
              >
                <RotateCcw size={11} />
                Réinitialiser
              </button>
            )}
          </div>

          {/* ─── Row 1 : Périmètre × Type  +  Marchés Africains ─── */}
          {(show('marketType') || show('africanMarkets')) && (
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              {show('marketType') && (
                <div className="flex-1 min-w-0">
                  <MarketTypeFilter
                    perimetre={state.perimetre}
                    typeSpc={state.typeSpc}
                    onPerimetreChange={setPerimetre}
                    onTypeSpcChange={setTypeSpc}
                    compact
                  />
                </div>
              )}
              {show('africanMarkets') && (
                <div className="flex items-end flex-shrink-0" style={{ minWidth: 180 }}>
                  <AfricanMarketToggle
                    availableCountries={availableCountries}
                    active={state.africanMarketsOnly}
                    onToggle={setAfricanMarketsOnly}
                    compact
                  />
                </div>
              )}
            </div>
          )}

          {/* ─── Row 2 : Standard dropdown filters (clean grid) ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

            {/* Année de souscription */}
            {show('year') && (
              <div>
                <label className={LABEL_STYLE}>Année de souscription</label>
                <div className="space-y-1.5">
                  <Select
                    isMulti
                    options={toNumOptions(uwYears)}
                    {...SHARED_SELECT_PROPS}
                    placeholder="Toutes les années..."
                    value={toNumOptions(state.uwYears)}
                    onChange={(v: any) => {
                      setUwYears(v.map((x: any) => x.value))
                      setUwYearMin(null)
                      setUwYearMax(null)
                    }}
                  />
                  {state.uwYears.length === 0 && (
                    <div className="flex gap-1.5">
                      <select
                        title="Année min"
                        className="input-dark text-xs py-1 flex-1"
                        value={state.uwYearMin ?? ''}
                        onChange={e => setUwYearMin(Number(e.target.value) || null)}
                      >
                        <option value="">Min</option>
                        {uwYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <select
                        title="Année max"
                        className="input-dark text-xs py-1 flex-1"
                        value={state.uwYearMax ?? ''}
                        onChange={e => setUwYearMax(Number(e.target.value) || null)}
                      >
                        <option value="">Max</option>
                        {uwYears.slice().reverse().map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Branche */}
            {show('branch') && (
              <div>
                <label className={LABEL_STYLE}>Branche</label>
                <Select
                  isMulti
                  options={branchOpts}
                  {...SHARED_SELECT_PROPS}
                  placeholder="Toutes les branches..."
                  value={toOptions(state.branches)}
                  onChange={(v: any) => setBranches(v.map((x: any) => x.value))}
                />
                {/* Vie/Non-vie scope checkboxes */}
                {show('lifeScope') && (
                  <div className="flex gap-3 mt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.brancheScope.vie}
                        onChange={e => applyBrancheScope(e.target.checked, state.brancheScope.nonVie)}
                      />
                      <span className="text-[0.78rem] font-medium text-gray-600">Vie</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.brancheScope.nonVie}
                        onChange={e => applyBrancheScope(state.brancheScope.vie, e.target.checked)}
                      />
                      <span className="text-[0.78rem] font-medium text-gray-600">Non-vie</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Type SPC — kept for backward compat if needed without marketType */}
            {show('typeSpc') && !show('marketType') && typeSpcOptions.length > 0 && (
              <div>
                <label className={LABEL_STYLE}>Type SPC</label>
                <Select
                  isMulti
                  options={toOptions(typeSpcOptions)}
                  {...SHARED_SELECT_PROPS}
                  placeholder="FAC / TTY / TTE..."
                  value={toOptions(state.typeSpc)}
                  onChange={(v: any) => setTypeSpc(v.map((x: any) => x.value))}
                />
              </div>
            )}

            {/* Type de contrat */}
            {show('typeContract') && typeOfContractOptions.length > 0 && (
              <div>
                <label className={LABEL_STYLE}>Type de contrat</label>
                <Select
                  isMulti
                  options={toOptions(typeOfContractOptions)}
                  {...SHARED_SELECT_PROPS}
                  placeholder="Tous les types..."
                  value={toOptions(state.typeOfContract)}
                  onChange={(v: any) => setTypeOfContract(v.map((x: any) => x.value))}
                />
              </div>
            )}

            {/* Cédante */}
            {show('cedante') && cedanteOptions.length > 0 && (
              <div>
                <label className={LABEL_STYLE}>Cédante</label>
                <Select
                  isMulti
                  options={toOptions(cedanteOptions)}
                  {...SHARED_SELECT_PROPS}
                  placeholder="Toutes les cédantes..."
                  value={toOptions(state.cedantes)}
                  onChange={(v: any) => setCedantes(v.map((x: any) => x.value))}
                />
              </div>
            )}

            {/* Courtier */}
            {show('broker') && brokerOptions.length > 0 && (
              <div>
                <label className={LABEL_STYLE}>Courtier</label>
                <Select
                  isMulti
                  options={toOptions(brokerOptions)}
                  {...SHARED_SELECT_PROPS}
                  placeholder="Tous les courtiers..."
                  value={toOptions(state.brokers)}
                  onChange={(v: any) => setBrokers(v.map((x: any) => x.value))}
                />
              </div>
            )}

            {/* Pays Risque */}
            {show('country') && countryOptions.length > 0 && (
              <div>
                <label className={LABEL_STYLE}>Pays</label>
                <Select
                  isMulti
                  options={toOptions(countryOptions)}
                  {...SHARED_SELECT_PROPS}
                  placeholder="Tous les pays..."
                  value={toOptions(state.countries)}
                  onChange={(v: any) => setCountries(v.map((x: any) => x.value))}
                />
              </div>
            )}

            {/* Assuré (INSURED_NAME_NORM) */}
            {show('insuredName') && insuredNameOptions.length > 0 && (
              <div>
                <label className={LABEL_STYLE}>Assuré</label>
                <Select
                  isMulti
                  options={toOptions(insuredNameOptions)}
                  {...SHARED_SELECT_PROPS}
                  placeholder="Rechercher un assuré..."
                  value={toOptions(state.insuredNames)}
                  onChange={(v: any) => setInsuredNames(v.map((x: any) => x.value))}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
