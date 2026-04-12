import React, { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import type { RetroFilters, RetroOptions, RetroSummary, RetroSecurite } from '../types/retro'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid,
} from 'recharts'
import { Shield, Users, TrendingUp, AlertTriangle, Check, Minus } from 'lucide-react'

// ── Colors ───────────────────────────────────────────────────────────────────
const C = {
  navy: 'hsl(209,35%,16%)', olive: 'hsl(83,52%,36%)', oliveLight: 'hsl(83,50%,55%)',
  orange: 'hsl(28,88%,55%)', red: 'hsl(358,66%,54%)', blue: 'hsl(209,60%,55%)',
  green: 'hsl(145,55%,42%)', gray: 'hsl(218,14%,65%)',
  borderCard: 'hsl(218,22%,92%)',
}
const CHART_COLORS = ['#4E6820', '#E67E22', '#3498DB', '#9B59B6', '#1ABC9C', '#E74C3C', '#F1C40F', '#2C3E50', '#16A085', '#D35400']

const fmtMAD = (v: number) => {
  if (v >= 1e9) return `${(v/1e9).toFixed(1)} Md`
  if (v >= 1e6) return `${(v/1e6).toFixed(1)} M`
  if (v >= 1e3) return `${(v/1e3).toFixed(0)} K`
  return v.toLocaleString('fr-FR')
}

export default function PanelSecurites() {
  const [filters, setFilters] = useState<RetroFilters>({
    uy: [], nature: null, traite: null, courtier: null, securite: null,
  })
  const [options, setOptions] = useState<RetroOptions | null>(null)
  const [summary, setSummary] = useState<RetroSummary | null>(null)
  const [securites, setSecurites] = useState<RetroSecurite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(API_ROUTES.RETRO.OPTIONS).then(r => setOptions(r.data)).catch(console.error)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const p: Record<string, string> = {}
      if (filters.uy.length) p.uy = filters.uy.join(',')
      if (filters.nature) p.nature = filters.nature
      if (filters.traite) p.traite = filters.traite

      const [sumR, secR] = await Promise.all([
        api.get(API_ROUTES.RETRO.SUMMARY, { params: p }),
        api.get(API_ROUTES.RETRO.BY_SECURITE, { params: p }),
      ])
      setSummary(sumR.data)
      setSecurites(secR.data as RetroSecurite[])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { loadData() }, [loadData])

  // Top 10 by PMD
  const top10 = securites.slice(0, 10)

  // Concentration alerts
  const concentrated = securites.filter(s => s.concentration_score > 30)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: C.navy, marginBottom: 4 }}>
        Panel de Sécurités
      </h1>
      <p style={{ fontSize: '0.82rem', color: C.gray, marginBottom: 20 }}>
        Analyse du panel de rétrocessionnaires et leur engagement
      </p>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        padding: '14px 20px', background: 'white', borderRadius: 12,
        border: `1px solid ${C.borderCard}`, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: C.gray }}>Année :</span>
          {options?.uy_list.map(y => (
            <button key={y} onClick={() => setFilters(f => ({ ...f, uy: f.uy.includes(y) ? f.uy.filter(v => v !== y) : [...f.uy, y] }))}
              style={{
                padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
                border: `1px solid ${filters.uy.includes(y) ? C.olive : C.borderCard}`,
                background: filters.uy.includes(y) ? `${C.olive}18` : 'transparent',
                color: filters.uy.includes(y) ? C.olive : C.gray, cursor: 'pointer',
              }}>{y}</button>
          ))}
        </div>
        <select value={filters.nature || ''} onChange={e => setFilters(f => ({ ...f, nature: e.target.value || null }))}
          style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', border: `1px solid ${C.borderCard}`, color: C.navy }}>
          <option value="">Toutes natures</option>
          {options?.natures.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={filters.traite || ''} onChange={e => setFilters(f => ({ ...f, traite: e.target.value || null }))}
          style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', border: `1px solid ${C.borderCard}`, color: C.navy }}>
          <option value="">Tous les traités</option>
          {options?.traites.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => setFilters({ uy: [], nature: null, traite: null, courtier: null, securite: null })}
          style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, background: '#f1f5f9', color: C.gray, border: 'none', cursor: 'pointer' }}>
          Réinitialiser
        </button>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Sécurités actives', value: String(securites.length), color: C.blue, icon: Users },
            { label: 'PMD Totale Placée', value: `${fmtMAD(summary.pmd_totale)} MAD`, color: C.orange, icon: TrendingUp },
            { label: '% Rating > A', value: `${summary.rating_a_plus_moyen}%`, color: summary.rating_a_plus_moyen >= 70 ? C.green : C.orange, icon: Shield },
            { label: 'Concentration Max', value: securites.length > 0 ? `${Math.max(...securites.map(s => s.concentration_score))}%` : '—', color: C.red, icon: AlertTriangle },
          ].map(k => (
            <div key={k.label} style={{
              background: 'white', borderRadius: 14, padding: '20px 22px',
              border: `1px solid ${C.borderCard}`, boxShadow: '0 2px 12px hsla(209,28%,14%,0.06)',
              flex: 1, minWidth: 180,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${k.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <k.icon size={18} color={k.color} />
                </div>
                <span style={{ fontSize: '0.77rem', color: C.gray, fontWeight: 600 }}>{k.label}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: C.navy }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div style={{ marginBottom: 24 }}>
        {/* Top 10 Sécurités */}
        <div style={{ background: 'white', borderRadius: 14, padding: 20, border: `1px solid ${C.borderCard}` }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: C.navy, marginBottom: 16 }}>Top 10 Sécurités par PMD reçue</h3>
          <ResponsiveContainer width="100%" height={Math.max(300, top10.length * 36)}>
            <BarChart data={top10} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" tickFormatter={fmtMAD} tick={{ fontSize: 11 }} />
              <YAxis dataKey="securite" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={(v: number) => fmtMAD(v) + ' MAD'} />
              <Bar dataKey="pmd_totale_recue" name="PMD Reçue" radius={[0, 6, 6, 0]}>
                {top10.map((s, i) => <Cell key={i} fill={s.rating_a_plus ? C.olive : C.orange} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sécurité Cards Grid */}
      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: C.navy, marginBottom: 16 }}>Détail des Sécurités</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        {securites.map(s => (
          <div key={s.securite} style={{
            background: 'white', borderRadius: 14, padding: '20px 22px',
            border: `1px solid ${s.concentration_score > 30 ? C.red : C.borderCard}`,
            boxShadow: s.concentration_score > 30
              ? '0 2px 12px hsla(358,66%,54%,0.10)'
              : '0 2px 12px hsla(209,28%,14%,0.05)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px hsla(209,28%,14%,0.10)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: C.navy }}>{s.securite}</span>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 8, fontSize: '0.68rem', fontWeight: 700,
                background: s.rating_a_plus ? '#E8F5E9' : '#FFF3E0',
                color: s.rating_a_plus ? C.green : C.orange,
              }}>
                {s.rating_a_plus ? <Check size={12} /> : <Minus size={12} />}
                {s.rating_a_plus ? 'Rating ≥ A' : 'Rating < A'}
              </span>
            </div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.76rem' }}>
              <div>
                <span style={{ color: C.gray }}>PMD totale</span>
                <div style={{ fontWeight: 700, color: C.navy }}>{fmtMAD(s.pmd_totale_recue)} MAD</div>
              </div>
              <div>
                <span style={{ color: C.gray }}>Traités</span>
                <div style={{ fontWeight: 700, color: C.navy }}>{s.nb_traites}</div>
              </div>
              <div>
                <span style={{ color: C.gray }}>Part moyenne</span>
                <div style={{ fontWeight: 700, color: C.navy }}>{s.part_moyenne}%</div>
              </div>
              <div>
                <span style={{ color: C.gray }}>Part max</span>
                <div style={{ fontWeight: 700, color: s.part_max > 30 ? C.red : C.navy }}>{s.part_max}%</div>
              </div>
              <div>
                <span style={{ color: C.gray }}>Années</span>
                <div style={{ fontWeight: 600, color: C.navy }}>{s.uy_list[0]} → {s.uy_list[s.uy_list.length - 1]}</div>
              </div>
              <div>
                <span style={{ color: C.gray }}>Concentration</span>
                <div style={{ fontWeight: 700, color: s.concentration_score > 30 ? C.red : C.navy }}>{s.concentration_score}%</div>
              </div>
            </div>
            {/* Tags */}
            <div style={{ marginTop: 12, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {s.traites_couverts.slice(0, 4).map(t => (
                <span key={t} style={{
                  padding: '2px 8px', borderRadius: 6, fontSize: '0.66rem', fontWeight: 600,
                  background: '#f1f5f9', color: C.gray,
                }}>{t}</span>
              ))}
              {s.traites_couverts.length > 4 && (
                <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.66rem', fontWeight: 600, background: '#f1f5f9', color: C.gray }}>
                  +{s.traites_couverts.length - 4}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Concentration Alerts */}
      {concentrated.length > 0 && (
        <div style={{ padding: 16, borderRadius: 12, background: '#FEF5EC', border: '1px solid #FDEBD0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={16} color={C.orange} />
            <span style={{ fontWeight: 700, color: C.navy, fontSize: '0.82rem' }}>Alerte Concentration</span>
          </div>
          {concentrated.map(s => (
            <div key={s.securite} style={{ fontSize: '0.76rem', color: '#7f4f24', marginBottom: 4 }}>
              <strong>{s.securite}</strong> porte {s.concentration_score}% d'au moins un traité — risque de dépendance
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
