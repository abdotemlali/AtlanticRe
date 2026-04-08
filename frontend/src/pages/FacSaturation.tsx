import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, ShieldAlert, X, Download, Search } from 'lucide-react'
import Select from 'react-select'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { useData } from '../context/DataContext'
import { formatCompact } from '../utils/formatters'
import { getScopedParams } from '../utils/pageFilterScopes'
import ActiveFiltersBar from '../components/ActiveFiltersBar'
import PageFilterPanel from '../components/PageFilterPanel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrancheDetail {
  branche: string
  total_prime_fac: number
  nb_affaires_fac: number
  is_saturated: boolean
  saturation_score: number
  seuil_prime: number
  seuil_affaires: number
}

interface CedanteGlobal {
  cedante: string
  total_prime_fac: number
  nb_branches_fac: number
  nb_branches_saturees: number
  branches_saturees: string[]
  score_global: number
  branches_detail: BrancheDetail[]
}

// ─── Formatage montant marocain ───────────────────────────────────────────────

function formatMontant(v: number): string {
  return v.toLocaleString('fr-MA', { maximumFractionDigits: 0 }) + ' DH'
}

// ─── Barre de progression ──────────────────────────────────────────────────────

function SaturationBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-[var(--color-gray-100)] rounded-full overflow-hidden" style={{ minWidth: 60 }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-mono font-bold" style={{ color, minWidth: 32, textAlign: 'right' }}>
        {Math.round(pct)}%
      </span>
    </div>
  )
}

// ─── Modale détail cédante ─────────────────────────────────────────────────────

function ModalDetail({
  cedante,
  branches,
  seuilPrime,
  seuilAffaires,
  onClose,
}: {
  cedante: string
  branches: BrancheDetail[]
  seuilPrime: number
  seuilAffaires: number
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header modale */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-gray-100)]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-[hsl(358,66%,54%)]" />
            <h2 className="text-sm font-bold text-[var(--color-navy)]">
              Détail FAC — <span className="text-[hsl(358,66%,54%)]">{cedante}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-gray-100)] transition-colors"
          >
            <X size={16} className="text-[var(--color-gray-500)]" />
          </button>
        </div>

        {/* Tableau branches */}
        <div className="overflow-auto flex-1 p-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-off-white)]">
                <th className="py-2.5 px-3 text-[10px] font-bold text-[var(--color-gray-500)] uppercase">Branche</th>
                <th className="py-2.5 px-3 text-[10px] font-bold text-[var(--color-gray-500)] uppercase text-right">Prime Totale FAC</th>
                <th className="py-2.5 px-3 text-[10px] font-bold text-[var(--color-gray-500)] uppercase text-right">Nb Affaires</th>
                <th className="py-2.5 px-3 text-[10px] font-bold text-[var(--color-gray-500)] uppercase">Score</th>
                <th className="py-2.5 px-3 text-[10px] font-bold text-[var(--color-gray-500)] uppercase text-center">Statut</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b, i) => {
                const pct = Math.min((b.saturation_score / 2) * 100, 100)
                const barColor = b.is_saturated ? 'hsl(358,66%,54%)' : 'hsl(83,52%,36%)'
                return (
                  <tr
                    key={i}
                    className={`border-b border-[var(--color-gray-100)] last:border-0 ${b.is_saturated ? 'bg-[hsla(358,66%,54%,0.03)]' : ''}`}
                  >
                    <td className="py-2.5 px-3 text-xs font-bold text-[var(--color-navy)]">{b.branche}</td>
                    <td
                      className="py-2.5 px-3 text-xs font-mono text-right font-bold"
                      style={{ color: b.total_prime_fac > seuilPrime ? 'hsl(358,66%,54%)' : 'inherit' }}
                    >
                      {formatMontant(b.total_prime_fac)}
                    </td>
                    <td
                      className="py-2.5 px-3 text-xs font-mono text-right font-bold"
                      style={{ color: b.nb_affaires_fac > seuilAffaires ? 'hsl(358,66%,54%)' : 'inherit' }}
                    >
                      {b.nb_affaires_fac}
                    </td>
                    <td className="py-2.5 px-3 min-w-[120px]">
                      <SaturationBar pct={pct} color={barColor} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {b.is_saturated ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[hsl(358,66%,54%)] text-white">SATURÉ</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[hsl(83,52%,36%)] text-white">OK</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Vue Globale ───────────────────────────────────────────────────────────────

function VueGlobale({
  seuilPrime,
  seuilAffaires,
}: {
  seuilPrime: number
  seuilAffaires: number
}) {
  const { filters } = useData()
  const location = useLocation()
  const [data, setData] = useState<CedanteGlobal[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modalCedante, setModalCedante] = useState<CedanteGlobal | null>(null)

  useEffect(() => {
    setLoading(true)
    const params = {
      ...getScopedParams(location.pathname, filters),
      seuil_prime: seuilPrime,
      seuil_affaires: seuilAffaires,
    }
    api
      .get(API_ROUTES.CEDANTE.FAC_SATURATION_GLOBAL, { params })
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filters, seuilPrime, seuilAffaires, location.pathname])

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter(d => d.cedante.toLowerCase().includes(q))
  }, [data, search])

  function exportExcel() {
    import('xlsx').then(XLSX => {
      // Onglet 1 — Résumé
      const summaryRows = data.map(d => ({
        Cédante: d.cedante,
        'Prime FAC Totale (DH)': d.total_prime_fac,
        'Nb Branches FAC': d.nb_branches_fac,
        'Branches Saturées': d.nb_branches_saturees,
        'Ratio Saturation': `${d.nb_branches_saturees} / ${d.nb_branches_fac}`,
        'Branches en Alerte': d.branches_saturees.join(', '),
        'Score Global': d.score_global,
      }))

      // Onglet 2 — Détail Branches
      const detailRows: object[] = []
      data.forEach(d => {
        d.branches_detail.forEach(b => {
          detailRows.push({
            Cédante: d.cedante,
            Branche: b.branche,
            'Prime FAC (DH)': b.total_prime_fac,
            'Nb Affaires': b.nb_affaires_fac,
            Saturé: b.is_saturated ? 'Oui' : 'Non',
            'Score Saturation': b.saturation_score,
            'Seuil Prime': b.seuil_prime,
            'Seuil Affaires': b.seuil_affaires,
          })
        })
      })

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Résumé')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), 'Détail Branches')
      const date = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `fac_saturation_global_${date}.xlsx`)
    })
  }

  return (
    <>
      {/* Barre recherche + export */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-gray-400)]" />
          <input
            type="text"
            placeholder="Rechercher une cédante..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs border border-[var(--color-gray-200)] rounded-lg focus:outline-none focus:border-[var(--color-navy)] transition-all"
          />
        </div>
        <button
          onClick={exportExcel}
          disabled={data.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-[var(--color-navy)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={14} />
          Exporter (Excel)
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] overflow-hidden">
        <div className="overflow-x-auto relative min-h-[100px]">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
              <div className="w-6 h-6 border-2 border-[var(--color-navy)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-[var(--color-gray-500)] font-bold">
              {data.length === 0
                ? 'Aucune opération FAC trouvée selon vos filtres.'
                : 'Aucune cédante ne correspond à votre recherche.'}
            </div>
          )}

          {filtered.length > 0 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-off-white)]">
                  <th className="py-3 px-4 text-[10px] font-bold text-[var(--color-gray-500)] uppercase">Cédante</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[var(--color-gray-500)] uppercase text-right">Prime FAC Totale</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[var(--color-gray-500)] uppercase text-center">Nb Branches FAC</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[var(--color-gray-500)] uppercase text-center">Branches Saturées</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[var(--color-gray-500)] uppercase">Branches en alerte</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[var(--color-gray-500)] uppercase min-w-[160px]">Saturation globale</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-[var(--color-gray-500)] uppercase text-center">Détail</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => {
                  const pct =
                    d.nb_branches_fac > 0
                      ? Math.min((d.score_global / (2 * d.nb_branches_fac)) * 100, 100)
                      : 0
                  const barColor =
                    d.nb_branches_saturees === 0
                      ? 'hsl(83,52%,36%)'
                      : d.nb_branches_saturees >= d.nb_branches_fac
                      ? 'hsl(358,66%,54%)'
                      : 'hsl(35,90%,50%)'
                  const rowBg = d.nb_branches_saturees > 0 ? 'bg-[hsla(358,66%,54%,0.03)]' : ''
                  return (
                    <tr key={i} className={`border-b border-[var(--color-gray-100)] last:border-0 transition-colors ${rowBg}`}>
                      <td className="py-3 px-4 text-xs font-bold text-[var(--color-navy)]">{d.cedante}</td>
                      <td className="py-3 px-4 text-xs font-mono text-right font-bold text-[var(--color-navy)]">
                        {formatMontant(d.total_prime_fac)}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-center text-[var(--color-navy)]">
                        {d.nb_branches_fac}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {d.nb_branches_saturees > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[hsl(358,66%,54%)] text-white">
                            {d.nb_branches_saturees} / {d.nb_branches_fac}
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-[var(--color-gray-500)]">
                            0 / {d.nb_branches_fac}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {d.branches_saturees.map(br => (
                            <span
                              key={br}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[hsla(358,66%,54%,0.12)] text-[hsl(358,66%,54%)] border border-[hsla(358,66%,54%,0.3)]"
                            >
                              {br}
                            </span>
                          ))}
                          {d.branches_saturees.length === 0 && (
                            <span className="text-[10px] text-[var(--color-gray-400)]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 min-w-[160px]">
                        <SaturationBar pct={pct} color={barColor} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setModalCedante(d)}
                          className="px-3 py-1 text-[10px] font-bold rounded-lg border border-[var(--color-navy)] text-[var(--color-navy)] hover:bg-[var(--color-navy)] hover:text-white transition-colors"
                        >
                          Voir détail
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modale */}
      {modalCedante && (
        <ModalDetail
          cedante={modalCedante.cedante}
          branches={modalCedante.branches_detail}
          seuilPrime={seuilPrime}
          seuilAffaires={seuilAffaires}
          onClose={() => setModalCedante(null)}
        />
      )}
    </>
  )
}

// ─── Vue par Cédante (existante) ───────────────────────────────────────────────

function VueCedante({
  seuilPrime,
  seuilAffaires,
}: {
  seuilPrime: number
  seuilAffaires: number
}) {
  const { filters, filterOptions } = useData()
  const location = useLocation()
  const [selectedCedante, setSelectedCedante] = useState<string | null>(null)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const cedanteOptions = useMemo(() => {
    return (filterOptions?.cedantes || []).map((c: string) => ({ value: c, label: c }))
  }, [filterOptions?.cedantes])

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
      seuil_affaires: seuilAffaires,
    }
    api
      .get(API_ROUTES.CEDANTE.FAC_SATURATION, { params })
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedCedante, filters, seuilPrime, seuilAffaires, location.pathname])

  const hasAlerts = data.some(d => d.is_saturated)

  return (
    <div className="space-y-4">
      {/* Sélecteur cédante */}
      <div className="w-full md:w-80 relative z-50">
        <Select
          options={cedanteOptions}
          value={cedanteOptions.find((o: { value: string }) => o.value === selectedCedante) || null}
          onChange={(v: any) => setSelectedCedante(v?.value || null)}
          placeholder="Sélectionnez une cédante..."
          isClearable
          menuPortalTarget={document.body}
          menuPosition="fixed"
          styles={{
            menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
            control: (base: any) => ({
              ...base,
              minHeight: '42px',
              borderRadius: '0.75rem',
              borderColor: 'var(--color-gray-100)',
              boxShadow: 'none',
              '&:hover': { borderColor: 'var(--color-gray-300)' },
            }),
          }}
        />
      </div>

      {!selectedCedante ? (
        <div className="flex flex-col items-center justify-center h-[40vh] text-center opacity-60">
          <AlertTriangle size={48} className="text-[var(--color-gray-300)] mb-4" />
          <h2 className="text-lg font-bold text-[var(--color-navy)]">Sélectionnez une cédante</h2>
          <p className="text-sm mt-1">Choisissez une cédante dans le menu déroulant pour afficher les alertes de saturation.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] overflow-hidden">
          <div className="p-4 border-b border-[var(--color-gray-100)] flex items-center justify-between bg-[var(--color-off-white)]">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className={hasAlerts ? 'text-[hsl(358,66%,54%)]' : 'text-[var(--color-navy)]'} />
              <h3 className="text-sm font-bold text-[var(--color-navy)]">
                Saturation Facultative : Vue des Seuils
                {hasAlerts && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsla(358,66%,54%,0.1)] text-[hsl(358,66%,54%)] border border-[hsla(358,66%,54%,0.3)]">
                    Alertes actives
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto relative min-h-[100px]">
            {loading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-[var(--color-navy)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {data.length === 0 && !loading && (
              <div className="p-8 text-center text-sm text-[var(--color-gray-500)] font-bold">
                Aucune opération FAC trouvée pour cette cédante selon vos filtres.
              </div>
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
                  {data.map((d: any, i: number) => (
                    <tr
                      key={i}
                      className={`border-b border-[var(--color-gray-100)] last:border-0 transition-colors ${d.is_saturated ? 'bg-[hsla(358,66%,54%,0.02)]' : 'hover:bg-[hsla(0,0%,0%,0.02)]'}`}
                    >
                      <td className="py-3 px-4 text-xs font-bold text-[var(--color-navy)]">{d.branche}</td>
                      <td
                        className="py-3 px-4 text-xs font-mono text-right font-bold"
                        style={{ color: d.total_prime_fac > seuilPrime ? 'hsl(358,66%,54%)' : 'inherit' }}
                      >
                        {formatMontant(d.total_prime_fac)}
                      </td>
                      <td
                        className="py-3 px-4 text-xs font-mono text-right font-bold"
                        style={{ color: d.nb_affaires_fac > seuilAffaires ? 'hsl(358,66%,54%)' : 'inherit' }}
                      >
                        {d.nb_affaires_fac}
                      </td>
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

// ─── Page principale ───────────────────────────────────────────────────────────

export default function FacSaturation() {
  const [activeTab, setActiveTab] = useState<'global' | 'cedante'>('global')
  const [seuilPrime, setSeuilPrime] = useState(1_000_000)
  const [seuilAffaires, setSeuilAffaires] = useState(5)

  return (
    <div className="space-y-4 animate-fade-in p-2 pb-12">
      <ActiveFiltersBar />
      <PageFilterPanel />

      {/* Header */}
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
      </div>

      {/* Contrôles seuils (partagés) */}
      <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-100)] shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="flex-1">
          <p className="text-xs text-[var(--color-gray-500)] mb-2 uppercase font-bold tracking-wider">Ciblage & Adaptation des Seuils</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-xs font-bold text-[var(--color-navy)]">
              Seuil Prime (DH)
              <input
                type="number"
                step={100000}
                value={seuilPrime}
                onChange={e => setSeuilPrime(Number(e.target.value) || 0)}
                className="px-3 py-2 border border-[var(--color-gray-200)] rounded-md font-mono text-[var(--color-navy)] shadow-sm focus:border-[var(--color-navy)] focus:outline-none transition-all"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-[var(--color-navy)]">
              Seuil Nb Affaires
              <input
                type="number"
                min={1}
                value={seuilAffaires}
                onChange={e => setSeuilAffaires(Number(e.target.value) || 0)}
                className="px-3 py-2 border border-[var(--color-gray-200)] rounded-md font-mono text-[var(--color-navy)] w-32 shadow-sm focus:border-[var(--color-navy)] focus:outline-none transition-all"
              />
            </label>
          </div>
        </div>
        <div className="bg-[var(--color-off-white)] p-3 rounded-lg border border-[var(--color-gray-200)] text-left md:text-right w-full md:w-auto">
          <p className="text-[10px] text-[var(--color-gray-500)] uppercase font-bold mb-1">Règle active</p>
          <p className="text-xs font-bold text-[hsl(358,66%,54%)] flex items-center gap-1.5 justify-start md:justify-end">
            Prime &gt; {formatCompact(seuilPrime)}
            <span className="text-[var(--color-navy)] mx-1">ET</span>
            Affaires &gt; {seuilAffaires}
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-[var(--color-off-white)] p-1 rounded-xl border border-[var(--color-gray-100)] w-fit">
        {(['global', 'cedante'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-white shadow-sm text-[var(--color-navy)] border border-[var(--color-gray-100)]'
                : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'
            }`}
          >
            {tab === 'global' ? 'Vue Globale' : 'Vue par Cédante'}
          </button>
        ))}
      </div>

      {/* Contenu onglet */}
      {activeTab === 'global' ? (
        <VueGlobale seuilPrime={seuilPrime} seuilAffaires={seuilAffaires} />
      ) : (
        <VueCedante seuilPrime={seuilPrime} seuilAffaires={seuilAffaires} />
      )}
    </div>
  )
}
