import { useState, useCallback } from "react"
import { useData, filtersToParams } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { formatCompact, formatPercent, BADGE_LABELS } from '../utils/formatters'
import ExportButton from '../components/ExportButton'
import { Save, RotateCcw, AlertTriangle, Target, CheckCircle, GitCompare } from 'lucide-react'
import toast from 'react-hot-toast'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const SortHeader = ({ col, label, align = 'left', currentSort, currentDir, onSort }: any) => (
  <th 
    onClick={() => onSort(col)}
    className={`cursor-pointer group py-3 text-[var(--color-navy)] whitespace-nowrap px-3
      ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} 
      hover:bg-[var(--color-gray-100)] transition-colors`}
  >
    <div className={`flex items-center gap-1 inline-flex ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <span className="text-xs font-bold leading-tight uppercase tracking-wide">{label}</span>
      <span className="text-[var(--color-gray-500)] opacity-40 group-hover:opacity-100 transition-opacity">
        {currentSort === col 
          ? (currentDir === 'asc' ? <ArrowUp size={12} className="text-[hsl(83,52%,36%)]" /> : <ArrowDown size={12} className="text-[hsl(83,52%,36%)]" />)
          : <ArrowUpDown size={12} />}
      </span>
    </div>
  </th>
)

interface MarketScore {
  pays: string; branche: string; score: number; badge: string
  written_premium: number; avg_ulr: number; total_resultat: number
  avg_commission: number; avg_share: number; contract_count: number
}

interface Criterion {
  key: string; label: string; weight: number; threshold: number
  direction: 'lower_is_better' | 'higher_is_better'
}

const DEFAULT_CRITERIA: Criterion[] = [
  { key: 'ulr', label: 'Loss Ratio (ULR)', weight: 40, threshold: 70, direction: 'lower_is_better' },
  { key: 'written_premium', label: 'Prime écrite (volume)', weight: 25, threshold: 100000, direction: 'higher_is_better' },
  { key: 'resultat', label: 'Résultat net', weight: 20, threshold: 0, direction: 'higher_is_better' },
  { key: 'commi', label: 'Taux de commission', weight: 10, threshold: 35, direction: 'lower_is_better' },
  { key: 'share_written', label: 'Part souscrite (Share)', weight: 5, threshold: 5, direction: 'higher_is_better' },
]

export default function MarketSelection() {
  const { filters, scoringCriteria, setScoringCriteria } = useData()
  const { can } = useAuth()
  const navigate = useNavigate()
  const [criteria, setCriteria] = useState<Criterion[]>(scoringCriteria as Criterion[])
  const [markets, setMarkets] = useState<MarketScore[]>([])
  const [loading, setLoading] = useState(false)
  const [topN, setTopN] = useState(20)
  const [badgeFilter, setBadgeFilter] = useState<string>('ALL')
  const [computed, setComputed] = useState(false)
  const [sortCol, setSortCol] = useState<keyof MarketScore>('score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0)
  const weightOk = Math.abs(totalWeight - 100) <= 1

  const compute = useCallback(async () => {
    if (!weightOk) return toast.error(`La somme des poids doit être 100% (actuel : ${totalWeight}%)`)
    setLoading(true)
    try {
      const params = filtersToParams(filters)
      const res = await api.post('/scoring/compute', {
        filters: params,
        criteria,
      })
      setMarkets(res.data.markets)
      setComputed(true)
      toast.success(`${res.data.markets.length} marchés scorés`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Erreur de calcul')
    } finally {
      setLoading(false)
    }
  }, [filters, criteria, weightOk, totalWeight])

  const saveDefaults = async () => {
    try {
      await api.put('/scoring/defaults', { criteria })
      setScoringCriteria(criteria)
      toast.success('Seuils sauvegardés comme défaut')
    } catch {
      toast.error('Erreur de sauvegarde')
    }
  }

  const handleSort = (col: keyof MarketScore) => {
    if (sortCol === col) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const displayedMarkets = [...markets]
    .filter(m => badgeFilter === 'ALL' || m.badge === badgeFilter)
    .sort((a, b) => {
      const va = a[sortCol]; const vb = b[sortCol]
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    .slice(0, topN)

  const getScoreGradient = (score: number) => {
    if (score >= 70) return 'linear-gradient(135deg, hsl(83,54%,27%), hsl(83,52%,36%))' // Green
    if (score >= 40) return 'linear-gradient(135deg, hsl(30,88%,40%), hsl(30,88%,56%))' // Orange
    return 'linear-gradient(135deg, hsl(358,66%,40%), var(--color-red))' // Red
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'hsl(83,52%,36%)' // ATTRACTIF
    if (score >= 40) return 'hsl(30,88%,56%)' // NEUTRE
    return 'hsl(358,66%,54%)' // A_EVITER
  }

  return (
    <div className="flex h-full min-h-screen bg-[var(--color-off-white)] p-6 gap-6">
      {/* Scoring Panel */}
      <aside 
        className="flex-shrink-0 p-5 space-y-5 h-fit sticky top-0" 
        style={{ 
          width: 360, 
          background: 'linear-gradient(160deg, var(--color-off-white) 0%, var(--color-gray-100) 100%)',
          border: '1px solid var(--color-gray-200)',
          borderRadius: 14,
          boxShadow: '0 4px 20px rgba(45,62,80,0.08)'
        }}
      >
        <div className="flex items-center gap-3 border-l-4 pl-3" style={{ borderColor: 'hsl(83,52%,36%)' }}>
          <Target size={20} className="text-[var(--color-navy)]" />
          <div>
            <h2 className="text-base font-bold text-[var(--color-navy)]">Critères de scoring</h2>
            <p className="text-[10px] font-semibold tracking-wider uppercase text-[var(--color-gray-500)]">Poids ajustables = 100%</p>
          </div>
        </div>

        {/* Weight validation Jauge */}
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              {weightOk ? (
                <span className="text-xs font-semibold inline-flex items-center gap-1 text-[hsl(83,52%,36%)] animate-fade-in">
                  <CheckCircle size={14} /> Total 100% — OK
                </span>
              ) : (
                <span className="text-xs font-semibold inline-flex items-center gap-1 text-[var(--color-red)] animate-pulse">
                  <AlertTriangle size={14} /> Somme des poids: {totalWeight}%
                </span>
              )}
            </div>
          </div>
          <div className="overflow-hidden h-2 text-xs flex rounded-full bg-[var(--color-gray-200)]">
            <div 
              style={{ width: `${Math.min(totalWeight, 100)}%` }} 
              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-300 ${weightOk ? 'bg-[hsl(83,52%,36%)]' : 'bg-[var(--color-red)]'}`}
            ></div>
          </div>
        </div>

        {/* Criteria inputs */}
        <div className="space-y-3">
          {criteria.map((c, i) => (
            <div key={c.key} className="p-3 bg-white" style={{ border: '1px solid var(--color-gray-100)', borderRadius: 10, boxShadow: '0 2px 8px rgba(45,62,80,0.04)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[var(--color-navy)]">{c.label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider" style={{ background: 'hsla(83,52%,36%,0.1)', color: 'hsl(83,52%,36%)' }}>
                  {c.direction === 'lower_is_better' ? '↓ Min' : '↑ Max'}
                </span>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-semibold text-[var(--color-gray-500)] mb-1">Poids (%)</p>
                  <input type="number" min={0} max={100} value={c.weight}
                    onChange={e => setCriteria(prev => prev.map((x, j) => j === i ? { ...x, weight: Number(e.target.value) } : x))}
                    className="w-full text-center text-sm font-semibold text-[var(--color-navy)] py-1.5 transition-colors outline-none" 
                    style={{ border: '1px solid var(--color-gray-200)', borderRadius: 6 }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(83,52%,36%)'; e.currentTarget.style.boxShadow = '0 0 0 3px hsla(83,52%,36%,0.15)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-gray-200)'; e.currentTarget.style.boxShadow = 'none' }}
                    disabled={!can('modify_scoring')} 
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-semibold text-[var(--color-gray-500)] mb-1">Seuil cible</p>
                  <input type="number" value={c.threshold}
                    onChange={e => setCriteria(prev => prev.map((x, j) => j === i ? { ...x, threshold: Number(e.target.value) } : x))}
                    className="w-full text-center text-sm font-semibold text-[var(--color-navy)] py-1.5 transition-colors outline-none" 
                    style={{ border: '1px solid var(--color-gray-200)', borderRadius: 6 }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(83,52%,36%)'; e.currentTarget.style.boxShadow = '0 0 0 3px hsla(83,52%,36%,0.15)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-gray-200)'; e.currentTarget.style.boxShadow = 'none' }}
                    disabled={!can('modify_scoring')} 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        {can('modify_scoring') && (
          <div className="flex gap-2 pt-2">
            <button onClick={saveDefaults} className="btn-secondary flex-1 text-xs justify-center py-2 bg-white">
              <Save size={14} /> Défaut
            </button>
            <button onClick={() => setCriteria(DEFAULT_CRITERIA)} className="btn-secondary text-xs px-3 bg-white" title="Rétablir les défauts">
              <RotateCcw size={14} />
            </button>
          </div>
        )}

        <button onClick={compute} disabled={loading || !weightOk} className="w-full justify-center py-2.5 flex items-center gap-2 font-bold text-white transition-all transform hover:-translate-y-[1px] disabled:opacity-50 disabled:transform-none"
          style={{
            background: 'linear-gradient(135deg, var(--color-navy) 0%, #3D5166 100%)',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(45,62,80,0.25)'
          }}>
          {loading ? 'Calcul...' : '⚡ Lancer le Scoring'}
        </button>
      </aside>

      {/* Results */}
      <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
        <div className="bg-white p-5 rounded-xl border border-[var(--color-gray-100)] shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-navy)] mb-1">Résultats du Scoring</h1>
            <p className="text-xs font-medium text-[var(--color-gray-500)]">Analyse multicritère dynamique par Marché (Pays + Branche)</p>
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {['ALL', 'ATTRACTIF', 'NEUTRE', 'A_EVITER'].map(b => (
                <button key={b} onClick={() => setBadgeFilter(b)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${badgeFilter === b ? (b === 'ALL' ? 'bg-[var(--color-navy)] text-white shadow-md' : b === 'ATTRACTIF' ? 'bg-[hsl(83,52%,36%)] text-white shadow-md' : b === 'NEUTRE' ? 'bg-[hsl(30,88%,56%)] text-white shadow-md' : 'bg-[hsl(358,66%,54%)] text-white shadow-md') : 'bg-transparent text-[var(--color-gray-500)] hover:bg-[var(--color-gray-100)]'}`}
                  style={badgeFilter === b ? {} : { border: '1px solid var(--color-gray-200)' }}>
                  {b === 'ALL' ? 'Tous' : b === 'A_EVITER' ? 'À éviter' : b === 'ATTRACTIF' ? 'Attractifs' : 'Neutres'}
                </button>
              ))}
            </div>
            <div className="w-px h-6 bg-[var(--color-gray-200)]"></div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-gray-500)]">Top N</span>
              <input type="number" min={5} max={50} value={topN} onChange={e => setTopN(Number(e.target.value))}
                className="input-dark text-xs py-1.5 px-2 text-center" style={{ width: 60 }} />
            </div>
            {/* The ExportButton uses 'recommendations' internally which matches the valid values for this component prop */}
            <ExportButton markets={displayedMarkets} topN={topN} variant="recommendations" />
          </div>
        </div>

        {!computed && (
          <div className="flex-1 bg-white rounded-xl border border-[var(--color-gray-100)] flex flex-col items-center justify-center text-[var(--color-gray-500)]">
            <Target size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Configurez les critères et lancez le scoring pour afficher les résultats</p>
          </div>
        )}

        {computed && (
          <div className="flex-1 bg-white rounded-xl border border-[var(--color-gray-100)] shadow-sm overflow-hidden flex flex-col mt-4">
            <div className="overflow-x-auto flex-1">
              <table className="data-table w-full">
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr>
                    <th className="w-10 text-center text-[var(--color-gray-500)] text-xs font-bold py-3">#</th>
                    <SortHeader col="pays" label="Pays" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader col="branche" label="Branche" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader col="score" label="Score Global" align="center" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader col="badge" label="Recommandation" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader col="written_premium" label="Prime écrite" align="right" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader col="avg_ulr" label="LR %" align="right" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader col="total_resultat" label="Résultat" align="right" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader col="avg_commission" label="Commission" align="right" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader col="avg_share" label="Share %" align="right" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader col="contract_count" label="Contrats" align="center" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} />
                    <th className="text-center text-[var(--color-gray-500)] text-xs font-bold py-3">Comparer</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedMarkets.length === 0 ? (
                    <tr><td colSpan={12} className="text-center py-10 text-[var(--color-gray-500)] font-medium">Aucun marché ne correspond aux critères</td></tr>
                  ) : displayedMarkets.map((m, i) => (
                    <tr key={i} className="hover:bg-[var(--color-off-white)] transition-colors animate-fade-in border-b border-[var(--color-gray-100)] last:border-0" style={{ animationDelay: `${i * 0.05}s` }}>
                      <td className="text-center font-bold text-[var(--color-gray-500)] py-3">{i + 1}</td>
                      <td className="font-bold text-[var(--color-navy)]">{m.pays}</td>
                      <td className="font-medium text-[var(--color-gray-500)]">{m.branche}</td>
                      <td>
                        <div className="relative flex items-center justify-center h-8" title={`${m.score.toFixed(1)}/100`}>
                          {/* Background Progress Bar */}
                          <div className="absolute inset-0 rounded overflow-hidden bg-transparent" style={{ border: '1px solid var(--color-gray-100)' }}>
                            <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${m.score}%`, backgroundColor: getScoreColor(m.score), opacity: 0.15 }} />
                          </div>
                          {/* Score Badge */}
                          <div className="relative z-10 text-white font-bold text-xs px-3 py-1 shadow-sm" style={{ background: getScoreGradient(m.score), borderRadius: 20 }}>
                            {m.score.toFixed(1)} <span className="text-[9px] opacity-80 font-normal">pts</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded font-bold" 
                          style={{
                            background: m.badge === 'ATTRACTIF' ? 'hsla(83,52%,36%,0.1)' : m.badge === 'A_EVITER' ? 'hsla(358,66%,54%,0.1)' : 'hsla(30,88%,56%,0.1)',
                            color: m.badge === 'ATTRACTIF' ? 'hsl(83,52%,36%)' : m.badge === 'A_EVITER' ? 'hsl(358,66%,54%)' : 'hsl(30,88%,56%)',
                            border: `1px solid ${getScoreColor(m.score)}`
                          }}>
                          {BADGE_LABELS[m.badge] || m.badge}
                        </span>
                      </td>
                      <td className="text-right font-medium text-[var(--color-navy)]">{formatCompact(m.written_premium)}</td>
                      <td className="text-right font-bold" style={{ color: m.avg_ulr > 100 ? 'hsl(358,66%,54%)' : m.avg_ulr > 70 ? 'hsl(30,88%,56%)' : 'hsl(83,52%,36%)' }}>{formatPercent(m.avg_ulr)}</td>
                      <td className="text-right font-bold" style={{ color: m.total_resultat >= 0 ? 'hsl(83,52%,36%)' : 'hsl(358,66%,54%)' }}>{formatCompact(m.total_resultat)}</td>
                      <td className="text-right text-[var(--color-gray-500)]">{formatPercent(m.avg_commission)}</td>
                      <td className="text-right text-[var(--color-gray-500)]">{formatPercent(m.avg_share)}</td>
                      <td className="text-center font-medium text-[var(--color-gray-500)]">{m.contract_count}</td>
                      <td className="text-center">
                        <button
                          onClick={() => {
                            sessionStorage.setItem('compare_market_a', JSON.stringify({ pays: m.pays, branche: m.branche }))
                            navigate('/comparaison')
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-gray-400)] hover:text-[var(--color-navy)] hover:bg-[var(--color-navy-muted)] transition-all"
                          title={`Comparer ${m.pays} — ${m.branche}`}
                        >
                          <GitCompare size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
