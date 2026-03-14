import React, { useState, useCallback } from 'react'
import { useData, filtersToParams } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { formatCompact, formatPercent, BADGE_LABELS } from '../utils/formatters'
import ExportButton from '../components/ExportButton'
import { Save, RotateCcw, AlertTriangle, Target, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

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
  const [criteria, setCriteria] = useState<Criterion[]>(scoringCriteria as Criterion[])
  const [markets, setMarkets] = useState<MarketScore[]>([])
  const [loading, setLoading] = useState(false)
  const [topN, setTopN] = useState(20)
  const [badgeFilter, setBadgeFilter] = useState<string>('ALL')
  const [computed, setComputed] = useState(false)

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

  const displayedMarkets = markets
    .filter(m => badgeFilter === 'ALL' || m.badge === badgeFilter)
    .slice(0, topN)

  const getScoreGradient = (score: number) => {
    if (score >= 70) return 'linear-gradient(135deg, #4E6820, #6B8C2A)' // Green
    if (score >= 40) return 'linear-gradient(135deg, #B07D00, #F4A261)' // Orange
    return 'linear-gradient(135deg, #A02020, #D64045)' // Red
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#6B8C2A'
    if (score >= 40) return '#F4A261'
    return '#D64045'
  }

  return (
    <div className="flex h-full min-h-screen bg-[var(--color-off-white)] p-6 gap-6">
      {/* Scoring Panel */}
      <aside 
        className="flex-shrink-0 p-5 space-y-5 h-fit sticky top-0" 
        style={{ 
          width: 360, 
          background: 'linear-gradient(160deg, #F5F6F8 0%, #EEF0F3 100%)',
          border: '1px solid #CBD2DA',
          borderRadius: 14,
          boxShadow: '0 4px 20px rgba(45,62,80,0.08)'
        }}
      >
        <div className="flex items-center gap-3 border-l-4 pl-3" style={{ borderColor: '#6B8C2A' }}>
          <Target size={20} className="text-[#2D3E50]" />
          <div>
            <h2 className="text-base font-bold text-[#2D3E50]" style={{ fontSize: '1rem' }}>Critères de scoring</h2>
            <p className="text-[10px] font-semibold tracking-wider uppercase text-[#7A8A99]">Poids ajustables = 100%</p>
          </div>
        </div>

        {/* Weight validation Jauge */}
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              {weightOk ? (
                <span className="text-xs font-semibold inline-flex items-center gap-1 text-[#6B8C2A] animate-fade-in">
                  <CheckCircle size={14} /> Total 100% — OK
                </span>
              ) : (
                <span className="text-xs font-semibold inline-flex items-center gap-1 text-[#D64045] animate-pulse">
                  <AlertTriangle size={14} /> Somme des poids: {totalWeight}%
                </span>
              )}
            </div>
          </div>
          <div className="overflow-hidden h-2 text-xs flex rounded-full bg-[#CBD2DA]">
            <div 
              style={{ width: `${Math.min(totalWeight, 100)}%` }} 
              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-300 ${weightOk ? 'bg-[#6B8C2A]' : 'bg-[#D64045]'}`}
            ></div>
          </div>
        </div>

        {/* Criteria inputs */}
        <div className="space-y-3">
          {criteria.map((c, i) => (
            <div key={c.key} className="p-3 bg-white" style={{ border: '1px solid #EEF0F3', borderRadius: 10, boxShadow: '0 2px 8px rgba(45,62,80,0.04)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#2D3E50]">{c.label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider" style={{ background: 'rgba(107,140,42,0.1)', color: '#4E6820' }}>
                  {c.direction === 'lower_is_better' ? '↓ Min' : '↑ Max'}
                </span>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-semibold text-[#7A8A99] mb-1">Poids (%)</p>
                  <input type="number" min={0} max={100} value={c.weight}
                    onChange={e => setCriteria(prev => prev.map((x, j) => j === i ? { ...x, weight: Number(e.target.value) } : x))}
                    className="w-full text-center text-sm font-semibold text-[#2D3E50] py-1.5 transition-colors outline-none" 
                    style={{ border: '1px solid #CBD2DA', borderRadius: 6 }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#6B8C2A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(107,140,42,0.15)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#CBD2DA'; e.currentTarget.style.boxShadow = 'none' }}
                    disabled={!can('modify_scoring')} 
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-semibold text-[#7A8A99] mb-1">Seuil cible</p>
                  <input type="number" value={c.threshold}
                    onChange={e => setCriteria(prev => prev.map((x, j) => j === i ? { ...x, threshold: Number(e.target.value) } : x))}
                    className="w-full text-center text-sm font-semibold text-[#2D3E50] py-1.5 transition-colors outline-none" 
                    style={{ border: '1px solid #CBD2DA', borderRadius: 6 }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#6B8C2A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(107,140,42,0.15)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#CBD2DA'; e.currentTarget.style.boxShadow = 'none' }}
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
            background: 'linear-gradient(135deg, #2D3E50 0%, #3D5166 100%)',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(45,62,80,0.25)'
          }}>
          {loading ? 'Calcul...' : '⚡ Lancer le Scoring'}
        </button>
      </aside>

      {/* Results */}
      <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
        <div className="bg-white p-5 rounded-xl border border-[#EEF0F3] shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#2D3E50] mb-1">Résultats du Scoring</h1>
            <p className="text-xs font-medium text-[#7A8A99]">Analyse multicritère dynamique par Marché (Pays + Branche)</p>
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {['ALL', 'ATTRACTIF', 'NEUTRE', 'A_EVITER'].map(b => (
                <button key={b} onClick={() => setBadgeFilter(b)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${badgeFilter === b ? (b === 'ALL' ? 'bg-[#2D3E50] text-white shadow-md' : b === 'ATTRACTIF' ? 'bg-[#6B8C2A] text-white shadow-md' : b === 'NEUTRE' ? 'bg-[#F4A261] text-white shadow-md' : 'bg-[#D64045] text-white shadow-md') : 'bg-transparent text-[#7A8A99] hover:bg-[#F5F6F8]'}`}
                  style={badgeFilter === b ? {} : { border: '1px solid #CBD2DA' }}>
                  {b === 'ALL' ? 'Tous' : b === 'A_EVITER' ? 'À éviter' : b === 'ATTRACTIF' ? 'Attractifs' : 'Neutres'}
                </button>
              ))}
            </div>
            <div className="w-px h-6 bg-[#EEF0F3]"></div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A8A99]">Top N</span>
              <input type="number" min={5} max={50} value={topN} onChange={e => setTopN(Number(e.target.value))}
                className="input-dark text-xs py-1.5 px-2 text-center" style={{ width: 60 }} />
            </div>
            <ExportButton markets={displayedMarkets} topN={topN} variant="primary" />
          </div>
        </div>

        {!computed && (
          <div className="flex-1 bg-white rounded-xl border border-[#EEF0F3] flex flex-col items-center justify-center text-[#7A8A99]">
            <Target size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Configurez les critères et lancez le scoring pour afficher les résultats</p>
          </div>
        )}

        {computed && (
          <div className="flex-1 bg-white rounded-xl border border-[#EEF0F3] shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="data-table w-full">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="w-10 text-center">#</th>
                    <th>Pays</th>
                    <th>Branche</th>
                    <th className="w-48 text-center">Score Global</th>
                    <th>Recommandation</th>
                    <th className="text-right">Prime écrite</th>
                    <th className="text-right">LR %</th>
                    <th className="text-right">Résultat</th>
                    <th className="text-right">Commission</th>
                    <th className="text-right">Share %</th>
                    <th className="text-center">Contrats</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedMarkets.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-10 text-[#7A8A99] font-medium">Aucun marché ne correspond aux critères</td></tr>
                  ) : displayedMarkets.map((m, i) => (
                    <tr key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                      <td className="text-center font-bold text-[#7A8A99]">{i + 1}</td>
                      <td className="font-bold text-[#2D3E50]">{m.pays}</td>
                      <td className="font-medium text-[#4A5568]">{m.branche}</td>
                      <td>
                        <div className="relative flex items-center justify-center h-8" title={`${m.score.toFixed(1)}/100`}>
                          {/* Background Progress Bar */}
                          <div className="absolute inset-0 rounded overflow-hidden bg-transparent" style={{ border: '1px solid #EEF0F3' }}>
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
                            background: m.badge === 'ATTRACTIF' ? 'rgba(107,140,42,0.1)' : m.badge === 'A_EVITER' ? 'rgba(214,64,69,0.1)' : 'rgba(244,162,97,0.1)',
                            color: m.badge === 'ATTRACTIF' ? '#4E6820' : m.badge === 'A_EVITER' ? '#D64045' : '#B07D00',
                            border: `1px solid ${m.badge === 'ATTRACTIF' ? '#6B8C2A' : m.badge === 'A_EVITER' ? '#D64045' : '#F4A261'}`
                          }}>
                          {BADGE_LABELS[m.badge] || m.badge}
                        </span>
                      </td>
                      <td className="text-right font-medium text-[#2D3E50]">{formatCompact(m.written_premium)}</td>
                      <td className="text-right font-bold" style={{ color: m.avg_ulr > 100 ? '#D64045' : m.avg_ulr > 70 ? '#F4A261' : '#6B8C2A' }}>{formatPercent(m.avg_ulr)}</td>
                      <td className="text-right font-bold" style={{ color: m.total_resultat >= 0 ? '#6B8C2A' : '#D64045' }}>{formatCompact(m.total_resultat)}</td>
                      <td className="text-right text-[#4A5568]">{formatPercent(m.avg_commission)}</td>
                      <td className="text-right text-[#4A5568]">{formatPercent(m.avg_share)}</td>
                      <td className="text-center font-medium text-[#7A8A99]">{m.contract_count}</td>
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
