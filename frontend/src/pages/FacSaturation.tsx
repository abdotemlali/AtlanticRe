import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import Select from 'react-select'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { useData } from '../context/DataContext'
import { formatCompact } from '../utils/formatters'
import { getScopedParams } from '../utils/pageFilterScopes'
import ActiveFiltersBar from '../components/ActiveFiltersBar'
import PageFilterPanel from '../components/PageFilterPanel'

export default function FacSaturation() {
  const { filters, filterOptions } = useData()
  const location = useLocation()
  const [selectedCedante, setSelectedCedante] = useState<string | null>(null)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [seuilPrime, setSeuilPrime] = useState(1000000)
  const [seuilAffaires, setSeuilAffaires] = useState(5)

  const cedanteOptions = useMemo(() => {
    return (filterOptions?.cedantes || []).map((c: string) => ({ value: c, label: c }))
  }, [filterOptions?.cedantes])

  // Reset data when cedante changes
  useEffect(() => {
    if (!selectedCedante) {
      setData([])
      return
    }
    
    setLoading(true)
    const params = {
      ...getScopedParams(location.pathname, filters),
      cedante: selectedCedante,
      seuil_prime: seuilPrime,
      seuil_affaires: seuilAffaires
    }
    api.get(API_ROUTES.CEDANTE.FAC_SATURATION, { params })
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedCedante, filters, seuilPrime, seuilAffaires])

  const hasAlerts = data.some(d => d.is_saturated)

  return (
    <div className="space-y-4 animate-fade-in p-2 pb-12">
      <ActiveFiltersBar />
      <PageFilterPanel />
      {/* Header & Cedante Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 p-4 rounded-xl border border-[var(--color-gray-100)] backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[hsla(358,66%,54%,0.1)]">
            <ShieldAlert size={20} className="text-[hsl(358,66%,54%)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-navy)] line-clamp-1">Alertes Saturation FAC</h1>
            <p className="text-sm text-[var(--color-gray-500)] mt-0.5">Pilotez les seuils de surveillance par cédante</p>
          </div>
        </div>

        <div className="w-full md:w-80 relative z-50">
          <Select
            options={cedanteOptions}
            value={cedanteOptions.find(o => o.value === selectedCedante) || null}
            onChange={(v) => setSelectedCedante(v?.value || null)}
            placeholder="Sélectionnez une cédante..."
            isClearable
            menuPortalTarget={document.body}
            menuPosition="fixed"
            styles={{
              menuPortal: base => ({ ...base, zIndex: 9999 }),
              control: base => ({
                ...base,
                minHeight: '42px',
                borderRadius: '0.75rem',
                borderColor: 'var(--color-gray-100)',
                boxShadow: 'none',
                '&:hover': { borderColor: 'var(--color-gray-300)' }
              })
            }}
          />
        </div>
      </div>

      {!selectedCedante ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center opacity-60">
          <AlertTriangle size={48} className="text-[var(--color-gray-300)] mb-4" />
          <h2 className="text-lg font-bold text-[var(--color-navy)]">Sélectionnez une cédante</h2>
          <p className="text-sm mt-1">Choisissez une cédante dans le menu déroulant pour afficher les alertes de saturation.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] overflow-hidden mt-6">
          <div className="p-4 border-b border-[var(--color-gray-100)] flex items-center justify-between bg-[var(--color-off-white)]">
            <div className="flex items-center gap-2">
               <AlertTriangle size={18} className={hasAlerts ? "text-[hsl(358,66%,54%)]" : "text-[var(--color-navy)]"} />
               <h3 className="text-sm font-bold text-[var(--color-navy)]">
                 Saturation Facultative : Vue des Seuils
                 {hasAlerts && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsla(358,66%,54%,0.1)] text-[hsl(358,66%,54%)] border border-[hsla(358,66%,54%,0.3)]">Alertes actives</span>}
               </h3>
            </div>
          </div>

          <div className="p-4 border-b border-[var(--color-gray-100)] bg-white flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="flex-1">
              <p className="text-xs text-[var(--color-gray-500)] mb-2 uppercase font-bold tracking-wider">Ciblage & Adaptation des Seuils</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex flex-col gap-1 text-xs font-bold text-[var(--color-navy)]">
                  Seuil Prime (DH)
                  <input type="number" step={100000} value={seuilPrime} onChange={e => setSeuilPrime(Number(e.target.value) || 0)}
                    className="px-3 py-2 border border-[var(--color-gray-200)] rounded-md font-mono text-[var(--color-navy)] shadow-sm focus:border-[var(--color-navy)] focus:outline-none transition-all" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[var(--color-navy)]">
                  Seuil Nb Affaires
                  <input type="number" min={1} value={seuilAffaires} onChange={e => setSeuilAffaires(Number(e.target.value) || 0)}
                    className="px-3 py-2 border border-[var(--color-gray-200)] rounded-md font-mono text-[var(--color-navy)] w-32 shadow-sm focus:border-[var(--color-navy)] focus:outline-none transition-all" />
                </label>
              </div>
            </div>
            <div className="text-left md:text-right bg-[var(--color-off-white)] p-3 rounded-lg border border-[var(--color-gray-200)] w-full md:w-auto">
               <p className="text-[10px] text-[var(--color-gray-500)] uppercase font-bold mb-1">Règle de l'alerte</p>
               <p className="text-xs font-bold text-[hsl(358,66%,54%)] flex items-center gap-1.5 justify-start md:justify-end">
                 Prime &gt; {formatCompact(seuilPrime)}
                 <span className="text-[var(--color-navy)] mx-1">ET</span>
                 Affaires &gt; {seuilAffaires}
               </p>
            </div>
          </div>

          <div className="overflow-x-auto relative min-h-[100px]">
            {loading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-[var(--color-navy)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            {data.length === 0 && !loading && (
               <div className="p-8 text-center text-sm text-[var(--color-gray-500)] font-bold">Aucune opération FAC trouvée pour cette cédante selon vos filtres.</div>
            )}
            
            {data.length > 0 && (
              <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-off-white)]">
                        <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase">Branche</th>
                        <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right">Prime Totale FAC</th>
                        <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-right">Nb Affaires FAC</th>
                        <th className="py-3 px-4 text-xs font-bold text-[var(--color-gray-500)] uppercase text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((d, i) => (
                        <tr key={i} className={`border-b border-[var(--color-gray-100)] last:border-0 transition-colors ${d.is_saturated ? 'bg-[hsla(358,66%,54%,0.02)]' : 'hover:bg-[hsla(0,0%,0%,0.02)]'}`}>
                          <td className="py-3 px-4 text-xs font-bold text-[var(--color-navy)]">{d.branche}</td>
                          <td className="py-3 px-4 text-xs font-mono text-right font-bold" style={{ color: d.total_prime_fac > seuilPrime ? 'hsl(358,66%,54%)' : 'inherit' }}>{formatCompact(d.total_prime_fac)}</td>
                          <td className="py-3 px-4 text-xs font-mono text-right font-bold" style={{ color: d.nb_affaires_fac > seuilAffaires ? 'hsl(358,66%,54%)' : 'inherit' }}>{d.nb_affaires_fac}</td>
                          <td className="py-3 px-4 flex justify-center">
                            {d.is_saturated ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[hsl(358,66%,54%)] text-white">SATURÉ</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[hsl(83,52%,36%)] text-white">OK</span>
                            )}
                          </td>
                        </tr>
                    ))}
                  </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
