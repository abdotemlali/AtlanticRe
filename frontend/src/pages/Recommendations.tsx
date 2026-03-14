import React, { useState, useEffect } from 'react'
import { useData, filtersToParams } from '../context/DataContext'
import { formatCompact, formatPercent, badgeClass, BADGE_LABELS } from '../utils/formatters'
import ExportButton from '../components/ExportButton'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { Star, RefreshCw, Trophy, Medal } from 'lucide-react'
import { useScoring } from '../hooks/useScoring'
import type { MarketScore } from '../types/scoring.types'

export default function Recommendations() {
  const { scoringCriteria, filters } = useData()
  const { markets, loading, computeScoring } = useScoring()
  const [topN, setTopN] = useState(15)

  const compute = () => {
    computeScoring(scoringCriteria, filtersToParams(filters))
  }

  useEffect(() => { compute() }, [])

  const topMarkets = markets.slice(0, topN)
  const attractifs = markets.filter(m => m.badge === 'ATTRACTIF').length
  const neutres = markets.filter(m => m.badge === 'NEUTRE').length
  const aEviter = markets.filter(m => m.badge === 'A_EVITER').length

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#6B8C2A'
    if (score >= 40) return '#F4A261'
    return '#D64045'
  }

  const getRankStyle = (index: number) => {
    if (index === 0) return { color: '#FFD700', bg: 'rgba(255,215,0,0.1)', border: '#FFD700' } // Gold
    if (index === 1) return { color: '#C0C0C0', bg: 'rgba(192,192,192,0.1)', border: '#C0C0C0' } // Silver
    if (index === 2) return { color: '#CD7F32', bg: 'rgba(205,127,50,0.1)', border: '#CD7F32' } // Bronze
    return { color: '#CBD2DA', bg: 'transparent', border: '#EEF0F3' }
  }

  return (
    <div className="p-6 space-y-6 min-h-[100vh] bg-[var(--color-off-white)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#2D3E50] mb-1">Recommandations Stratégiques</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#7A8A99]">Top marchés selon les critères de scoring actifs</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-[#EEF0F3]">
          <div className="flex items-center gap-2 pl-2 border-r border-[#EEF0F3] pr-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A8A99]">Top N</span>
            <input type="number" min={5} max={50} value={topN} onChange={e => setTopN(Number(e.target.value))}
              className="input-dark text-xs py-1.5 px-2 text-center" style={{ width: 60 }} />
          </div>
          <button onClick={compute} disabled={loading} className="btn-secondary text-xs px-3 bg-white shadow-sm border-[#CBD2DA]">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Recalculer
          </button>
          <ExportButton markets={topMarkets} topN={topN} variant="primary" />
        </div>
      </div>

      {/* Summary badges */}
      {markets.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          {[
            { label: 'Marchés analysés', value: markets.length, color: '#2D3E50' },
            { label: '🟢 Attractifs', value: attractifs, color: '#6B8C2A' },
            { label: '🟡 Neutres', value: neutres, color: '#F4A261' },
            { label: '🔴 À éviter', value: aEviter, color: '#D64045' },
          ].map(s => (
            <div key={s.label} className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-[#EEF0F3] flex items-center gap-4 transition-transform hover:-translate-y-1" style={{ borderTop: `3px solid ${s.color}` }}>
              <span className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A8A99]">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />}

      {!loading && markets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-[#7A8A99] bg-white rounded-xl border border-[#EEF0F3]">
          <Star size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Aucun marché calculé. Cliquez sur Recalculer.</p>
        </div>
      )}

      {/* Top 3 Cards */}
      {!loading && topMarkets.length >= 3 && (
        <div className="grid grid-cols-3 gap-6 animate-fade-in">
          {[0, 1, 2].map((i) => {
            const m = topMarkets[i]
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
                    <h3 className="text-xl font-bold text-[#2D3E50] leading-tight">{m.pays}</h3>
                    <p className="text-xs font-medium text-[#7A8A99]">{m.branche}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-extrabold" style={{ color: getScoreColor(m.score) }}>{m.score.toFixed(1)}</p>
                    <span className="text-[10px] font-bold uppercase text-[#7A8A99]">Score</span>
                  </div>
                </div>

                {/* Body Metrics */}
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-sm border-b border-[#EEF0F3] pb-2">
                    <span className="text-[#7A8A99] font-medium">Prime écrite</span>
                    <span className="text-[#2D3E50] font-bold">{formatCompact(m.written_premium)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-[#EEF0F3] pb-2">
                    <span className="text-[#7A8A99] font-medium">Loss Ratio</span>
                    <span className="font-bold" style={{ color: m.avg_ulr > 100 ? '#D64045' : m.avg_ulr > 70 ? '#F4A261' : '#6B8C2A' }}>{formatPercent(m.avg_ulr)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pb-1">
                    <span className="text-[#7A8A99] font-medium">Résultat</span>
                    <span className="font-bold" style={{ color: m.total_resultat >= 0 ? '#6B8C2A' : '#D64045' }}>{formatCompact(m.total_resultat)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && markets.length > 0 && (
        <div className="grid grid-cols-5 gap-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {/* Bar chart */}
          <div className="col-span-2 bg-white rounded-xl shadow-sm border border-[#EEF0F3] p-5">
            <h3 className="text-sm font-bold text-[#2D3E50] mb-4">Scores Top {topN}</h3>
            <ResponsiveContainer width="100%" height={Math.max(300, topN * 28)}>
              <BarChart data={topMarkets} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#7A8A99', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="pays" tick={{ fill: '#7A8A99', fontSize: 10, fontWeight: 500 }} width={90} axisLine={false} tickLine={false}
                  tickFormatter={v => v.length > 12 ? v.slice(0, 12) + '…' : v} />
                <Tooltip
                  cursor={{ fill: 'rgba(107,140,42,0.05)' }}
                  content={({ active, payload }) => active && payload?.length ? (
                    <div className="p-3 shadow-xl" style={{ background: '#2D3E50', border: '1px solid #6B8C2A', borderRadius: 10 }}>
                      <p className="font-bold text-white text-xs mb-1">{payload[0]?.payload?.pays} — {payload[0]?.payload?.branche}</p>
                      <p className="text-xs font-semibold" style={{ color: getScoreColor(payload[0]?.value as number) }}>Score : {(payload[0]?.value as number)?.toFixed(1)}/100</p>
                    </div>
                  ) : null}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={16}>
                  {topMarkets.map((m, i) => <Cell key={i} fill={getScoreColor(m.score)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="col-span-3 bg-white rounded-xl shadow-sm border border-[#EEF0F3] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#EEF0F3] flex items-center justify-between bg-[#F5F6F8]">
              <h3 className="text-sm font-bold text-[#2D3E50]">Détail Top {topN}</h3>
              <span className="text-[10px] uppercase font-bold text-[#7A8A99] tracking-wider">{topMarkets.length} marchés</span>
            </div>
            <div className="overflow-auto flex-1">
              <table className="data-table w-full">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="text-center w-10">#</th>
                    <th>Pays</th>
                    <th>Branche</th>
                    <th className="text-center">Score</th>
                    <th>Badge</th>
                    <th className="text-right">Prime</th>
                    <th className="text-right">LR %</th>
                    <th className="text-right">Résultat</th>
                  </tr>
                </thead>
                <tbody>
                  {topMarkets.map((m, i) => (
                    <tr key={i}>
                      <td className="text-center font-bold text-[#7A8A99]">{i + 1}</td>
                      <td className="font-bold text-[#2D3E50]">{m.pays}</td>
                      <td className="font-medium text-[#4A5568]">{m.branche}</td>
                      <td>
                        <div className="flex items-center gap-2 justify-center">
                          <span className="text-xs font-bold" style={{ color: getScoreColor(m.score) }}>{m.score.toFixed(1)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-[9px] uppercase tracking-wider px-2 py-1 rounded font-bold"
                          style={{
                            background: m.badge === 'ATTRACTIF' ? 'rgba(107,140,42,0.1)' : m.badge === 'A_EVITER' ? 'rgba(214,64,69,0.1)' : 'rgba(244,162,97,0.1)',
                            color: m.badge === 'ATTRACTIF' ? '#4E6820' : m.badge === 'A_EVITER' ? '#D64045' : '#B07D00',
                          }}>
                          {BADGE_LABELS[m.badge] || m.badge}
                        </span>
                      </td>
                      <td className="text-right font-medium text-[#2D3E50]">{formatCompact(m.written_premium)}</td>
                      <td className="text-right font-bold" style={{ color: m.avg_ulr > 100 ? '#e63946' : m.avg_ulr > 70 ? '#f77f00' : '#2dc653' }}>{formatPercent(m.avg_ulr)}</td>
                      <td className="text-right font-bold" style={{ color: m.total_resultat >= 0 ? '#2dc653' : '#e63946' }}>{formatCompact(m.total_resultat)}</td>
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
