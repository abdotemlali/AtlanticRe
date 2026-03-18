import { useState, useEffect } from "react"
import { useData, filtersToParams } from '../context/DataContext'
import { formatCompact, formatPercent, BADGE_LABELS } from '../utils/formatters'
import ExportButton from '../components/ExportButton'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { Star, RefreshCw, Trophy, Medal, ArrowUpDown, ArrowUp, ArrowDown, GitCompare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useScoring } from '../hooks/useScoring'
import type { MarketScore } from '../types/scoring.types'

const SortHeader = ({ field, label, currentSort, currentDir, onSort, align = 'left' }: any) => {
  const active = currentSort === field
  return (
    <th className={`cursor-pointer hover:bg-[var(--color-off-white)] transition-colors py-3 px-4 select-none ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`} onClick={() => onSort(field)}>
      <div className={`flex items-center gap-1.5 inline-flex ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className={`text-[10px] uppercase tracking-wider font-bold ${active ? 'text-[var(--color-navy)]' : 'text-[var(--color-gray-500)]'}`}>
          {label}
        </span>
        {active ? (
          currentDir === 'asc' ? <ArrowUp size={12} className="text-[var(--color-navy)]" /> : <ArrowDown size={12} className="text-[var(--color-navy)]" />
        ) : (
          <ArrowUpDown size={12} className="text-[var(--color-gray-200)] opacity-50" />
        )}
      </div>
    </th>
  )
}

export default function Recommendations() {
  const navigate = useNavigate()
  const { scoringCriteria, filters } = useData()
  const { markets, loading, computeScoring } = useScoring()
  const [topN, setTopN] = useState(15)
  const [badgeFilter, setBadgeFilter] = useState<string>('ALL')
  const [sortCol, setSortCol] = useState<keyof MarketScore>('score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const compute = () => {
    computeScoring(scoringCriteria, filtersToParams(filters))
  }

  useEffect(() => { compute() }, [filters, scoringCriteria])

  const attractifs = markets.filter(m => m.badge === 'ATTRACTIF').length
  const neutres = markets.filter(m => m.badge === 'NEUTRE').length
  const aEviter = markets.filter(m => m.badge === 'A_EVITER').length

  const handleSort = (col: keyof MarketScore) => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  // Filter & Sort
  const filteredMarkets = [...markets]
    .filter(m => badgeFilter === 'ALL' || m.badge === badgeFilter)
    .sort((a, b) => {
      const aVal = a[sortCol]
      const bVal = b[sortCol]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return 0
    })

  const topFilteredMarkets = filteredMarkets.slice(0, topN)
  const chartData = topFilteredMarkets.map(m => ({
    ...m,
    market_label: `${m.pays} — ${m.branche}`
  }))

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'hsl(83,52%,36%)'
    if (score >= 40) return 'hsl(30,88%,56%)'
    return 'var(--color-red)'
  }

  const getRankStyle = (index: number) => {
    if (index === 0) return { color: '#FFD700', bg: 'rgba(255,215,0,0.1)', border: '#FFD700' } // Gold
    if (index === 1) return { color: '#C0C0C0', bg: 'rgba(192,192,192,0.1)', border: '#C0C0C0' } // Silver
    if (index === 2) return { color: '#CD7F32', bg: 'rgba(205,127,50,0.1)', border: '#CD7F32' } // Bronze
    return { color: 'var(--color-gray-200)', bg: 'transparent', border: 'var(--color-gray-100)' }
  }

  return (
    <div className="p-6 space-y-6 min-h-[100vh] bg-[var(--color-off-white)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-navy)] mb-1">Recommandations Stratégiques</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-gray-500)]">Top marchés selon les critères de scoring actifs</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-[var(--color-gray-100)]">
          <div className="flex items-center gap-1 bg-[var(--color-off-white)] p-1 rounded-lg border border-[var(--color-gray-200)] mr-2">
            {['ALL', 'ATTRACTIF', 'NEUTRE', 'A_EVITER'].map(b => (
              <button key={b} onClick={() => setBadgeFilter(b)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${badgeFilter === b ? 'bg-white shadow-sm text-[var(--color-navy)]' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}>
                {b === 'ALL' ? 'TOUS' : BADGE_LABELS[b as keyof typeof BADGE_LABELS] || b}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pl-2 border-l border-[var(--color-gray-100)] pr-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-gray-500)]">Top N</span>
            <input type="number" min={5} max={50} value={topN} onChange={e => setTopN(Number(e.target.value))}
              className="input-dark text-xs py-1.5 px-2 text-center" style={{ width: 60 }} />
          </div>
          <button onClick={compute} disabled={loading} className="btn-secondary text-xs px-3 bg-white shadow-sm border-[var(--color-gray-200)]">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Recalculer
          </button>
          <ExportButton markets={topFilteredMarkets} topN={topN} variant="recommendations" />
        </div>
      </div>

      {/* Summary badges */}
      {markets.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          {[
            { label: 'Marchés analysés', value: markets.length, color: 'var(--color-navy)' },
            { label: '🟢 Attractifs', value: attractifs, color: 'hsl(83,52%,36%)' },
            { label: '🟡 Neutres', value: neutres, color: 'hsl(30,88%,56%)' },
            { label: '🔴 À éviter', value: aEviter, color: 'var(--color-red)' },
          ].map(s => (
            <div key={s.label} className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-[var(--color-gray-100)] flex items-center gap-4 transition-transform hover:-translate-y-1" style={{ borderTop: `3px solid ${s.color}` }}>
              <span className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gray-500)]">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />}

      {!loading && markets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--color-gray-500)] bg-white rounded-xl border border-[var(--color-gray-100)]">
          <Star size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Aucun marché calculé. Cliquez sur Recalculer.</p>
        </div>
      )}

      {/* Top 3 Cards */}
      {!loading && topFilteredMarkets.length >= 3 && (
        <div className="grid grid-cols-3 gap-6 animate-fade-in">
          {[0, 1, 2].map((i) => {
            const m = topFilteredMarkets[i]
            const rank = getRankStyle(i)
            return (
              <div key={i} className="bg-white rounded-xl shadow-sm relative overflow-hidden group transition-all"
                style={{ border: `2px solid ${rank.border}`, transform: i === 0 ? 'scale(1.02)' : 'none', zIndex: i === 0 ? 10 : 1 }}>

                {/* Header Gradient */}
                <div className="p-4 flex items-start justify-between" style={{ background: rank.bg }}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {i === 0 ? <Trophy size={18} fill={rank.color} color={rank.color} /> : <Medal size={18} fill={rank.color} color={rank.color} />}
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: rank.color }}>Top {i + 1}</span>
                    </div>
                    <h3 className="text-xl font-bold text-[var(--color-navy)] leading-tight">{m.pays}</h3>
                    <p className="text-xs font-medium text-[var(--color-gray-500)]">{m.branche}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-extrabold" style={{ color: getScoreColor(m.score) }}>{m.score.toFixed(1)}</p>
                    <span className="text-[10px] font-bold uppercase text-[var(--color-gray-500)]">Score</span>
                  </div>
                </div>

                {/* Body Metrics */}
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-sm border-b border-[var(--color-gray-100)] pb-2">
                    <span className="text-[var(--color-gray-500)] font-medium">Prime écrite</span>
                    <span className="text-[var(--color-navy)] font-bold">{formatCompact(m.written_premium)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-[var(--color-gray-100)] pb-2">
                    <span className="text-[var(--color-gray-500)] font-medium">Loss Ratio</span>
                    <span className="font-bold" style={{ color: m.avg_ulr > 100 ? 'var(--color-red)' : m.avg_ulr > 70 ? 'hsl(30,88%,56%)' : 'hsl(83,52%,36%)' }}>{formatPercent(m.avg_ulr)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pb-1">
                    <span className="text-[var(--color-gray-500)] font-medium">Résultat</span>
                    <span className="font-bold" style={{ color: m.total_resultat >= 0 ? 'hsl(83,52%,36%)' : 'var(--color-red)' }}>{formatCompact(m.total_resultat)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Compare Quick Action */}
      {!loading && topFilteredMarkets.length >= 2 && (
        <div className="flex justify-center mt-2 mb-6 animate-slide-up stagger-2">
          <button
            onClick={() => {
              sessionStorage.setItem('compare_market_a', JSON.stringify({ pays: topFilteredMarkets[0].pays, branche: topFilteredMarkets[0].branche }))
              sessionStorage.setItem('compare_market_b', JSON.stringify({ pays: topFilteredMarkets[1].pays, branche: topFilteredMarkets[1].branche }))
              navigate('/comparaison')
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[var(--color-gray-200)] shadow-sm rounded-xl text-sm font-bold text-[var(--color-navy)] hover:border-[var(--color-navy)] hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <GitCompare size={16} />
            Comparer Top 1 vs Top 2
          </button>
        </div>
      )}

      {!loading && markets.length > 0 && (
        <div className="grid grid-cols-5 gap-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* Bar chart */}
          <div className="col-span-2 bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] p-5">
            <h3 className="text-sm font-bold text-[var(--color-navy)] mb-4">Scores Top {topN}</h3>
            <ResponsiveContainer width="100%" height={Math.max(300, topN * 28)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--color-gray-500)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="market_label" tick={{ fill: 'var(--color-gray-500)', fontSize: 10, fontWeight: 500 }} width={120} axisLine={false} tickLine={false}
                  tickFormatter={v => v && v.length > 20 ? v.slice(0, 20) + '…' : v} />
                <Tooltip
                  cursor={{ fill: 'hsla(83,52%,36%,0.05)' }}
                  content={({ active, payload }) => active && payload?.length ? (
                    <div className="p-3 shadow-xl" style={{ background: 'hsla(209,28%,18%,0.92)', backdropFilter: 'blur(16px)', border: '1px solid hsl(83,52%,36%)', borderRadius: 10 }}>
                      <p className="font-bold text-white text-xs mb-1">{payload[0]?.payload?.pays} — {payload[0]?.payload?.branche}</p>
                      <p className="text-xs font-semibold" style={{ color: getScoreColor(payload[0]?.value as number) }}>Score : {(payload[0]?.value as number)?.toFixed(1)}/100</p>
                    </div>
                  ) : null}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={16}>
                  {chartData.map((m, i) => <Cell key={i} fill={getScoreColor(m.score)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="col-span-3 bg-white rounded-xl shadow-sm border border-[var(--color-gray-100)] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[var(--color-gray-100)] flex items-center justify-between bg-[var(--color-off-white)]">
              <h3 className="text-sm font-bold text-[var(--color-navy)]">Détail Top {topN}</h3>
              <span className="text-[10px] uppercase font-bold text-[var(--color-gray-500)] tracking-wider">{topFilteredMarkets.length} marchés</span>
            </div>
            <div className="overflow-auto flex-1">
              <table className="data-table w-full">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="text-center w-10 py-3 px-4"><span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-gray-500)]">#</span></th>
                    <SortHeader field="pays" label="Pays" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader field="branche" label="Branche" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader field="score" label="Score" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} align="center" />
                    <SortHeader field="badge" label="Badge" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader field="written_premium" label="Prime" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="avg_ulr" label="LR %" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} align="right" />
                    <SortHeader field="total_resultat" label="Résultat" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {topFilteredMarkets.map((m, i) => (
                    <tr key={i}>
                      <td className="text-center font-bold text-[var(--color-gray-500)]">{i + 1}</td>
                      <td className="font-bold text-[var(--color-navy)]">{m.pays}</td>
                      <td className="font-medium text-[var(--color-gray-600)]">{m.branche}</td>
                      <td>
                        <div className="flex items-center gap-2 justify-center">
                          <span className="text-xs font-bold" style={{ color: getScoreColor(m.score) }}>{m.score.toFixed(1)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-[9px] uppercase tracking-wider px-2 py-1 rounded font-bold"
                          style={{
                            background: m.badge === 'ATTRACTIF' ? 'rgba(107,140,42,0.1)' : m.badge === 'A_EVITER' ? 'rgba(214,64,69,0.1)' : 'rgba(244,162,97,0.1)',
                            color: m.badge === 'ATTRACTIF' ? 'hsl(83,52%,36%)' : m.badge === 'A_EVITER' ? 'var(--color-red)' : 'hsl(30,88%,56%)',
                          }}>
                          {BADGE_LABELS[m.badge] || m.badge}
                        </span>
                      </td>
                      <td className="text-right font-medium text-[var(--color-navy)]">{formatCompact(m.written_premium)}</td>
                      <td className="text-right font-bold" style={{ color: m.avg_ulr > 100 ? 'var(--color-red)' : m.avg_ulr > 70 ? 'hsl(30,88%,56%)' : 'hsl(83,52%,36%)' }}>{formatPercent(m.avg_ulr)}</td>
                      <td className="text-right font-bold" style={{ color: m.total_resultat >= 0 ? 'hsl(83,52%,36%)' : 'var(--color-red)' }}>{formatCompact(m.total_resultat)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
