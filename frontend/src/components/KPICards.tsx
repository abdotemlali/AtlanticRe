import React from 'react';
// 🎨 STYLE UPDATED — KPICards : float-element glassmorphism, stagger entrance, icônes avec gradient, useCountUp préservé
import { useEffect, useState } from "react"
import { useData } from '../context/DataContext'
import { Banknote, TrendingUp, TrendingDown, Shield, FileText, Activity, Percent } from 'lucide-react'
import { formatCompact, formatPercent, formatMAD } from '../utils/formatters'
import { KPICardSkeleton } from './ui/Skeleton'

/* ─── useCountUp — logique métier inchangée ─── */
function useCountUp(endValue: number | undefined, duration = 1200) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (endValue === undefined) return
    let startTimestamp: number | null = null
    let animationFrameId: number

    const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3)

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      setCount(easeOutCubic(progress) * endValue)
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step)
      } else {
        setCount(endValue)
      }
    }

    animationFrameId = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(animationFrameId)
  }, [endValue, duration])

  return count
}

/* ─── KPICard ─── */
interface KPICardProps {
  label: string
  rawValue?: number
  formatFn: (val: number | undefined) => string
  sub?: string
  icon: React.ReactNode
  accentColor: string
  glowColor: string
  loading?: boolean
  index: number
  trend?: 'positive' | 'negative' | 'neutral'
}

function KPICard({ label, rawValue, formatFn, sub, icon, accentColor, glowColor, loading, index, trend }: KPICardProps) {
  const animatedValue = useCountUp(rawValue)
  const displayValue = formatFn(loading ? undefined : animatedValue)

  if (loading) {
    return (
      <div style={{ animationDelay: `${index * 80}ms` }} className="flex-1 min-w-0 animate-slide-up">
        <KPICardSkeleton />
      </div>
    )
  }

  return (
    <div
      className="float-element flex-1 min-w-0 glass-card p-5 relative overflow-hidden group"
      style={{
        animation: `slideUpFade 400ms cubic-bezier(0.22,1,0.36,1) ${index * 80}ms both`,
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      {/* Ambient glow orb — decorative */}
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: glowColor, filter: 'blur(18px)' }}
        aria-hidden="true"
      />
      {/* Decorative diagonal stripe */}
      <div
        className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-[0.04]"
        style={{
          background: `linear-gradient(135deg, ${accentColor} 0%, transparent 60%)`,
          borderRadius: '0 var(--radius-lg) 0 0',
        }}
        aria-hidden="true"
      />

      {/* Label + Icon row */}
      <div className="flex items-start justify-between mb-3">
        <p
          className="text-[0.71rem] font-bold uppercase tracking-[0.07em] pr-2 leading-tight"
          style={{ color: 'var(--color-gray-500)' }}
        >
          {label}
        </p>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-250 group-hover:scale-110 group-hover:shadow-md"
          style={{
            background: `${glowColor}`,
            boxShadow: `0 2px 10px ${glowColor}`,
          }}
        >
          {React.cloneElement(icon as React.ReactElement, { size: 18, color: accentColor })}
        </div>
      </div>

      {/* Main value — count-up */}
      <p
        className="font-bold text-navy tabular-nums leading-tight mb-1.5 font-mono break-words"
        style={{ fontSize: 'clamp(1.1rem, 1.5vw, 1.45rem)', letterSpacing: '-0.01em' }}
      >
        {displayValue}
      </p>

      {/* Sub label */}
      {sub && (
        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
          {trend === 'positive' && <span style={{ color: 'var(--color-emerald)' }}>▲</span>}
          {trend === 'negative' && <span style={{ color: 'var(--color-red)' }}>▼</span>}
          {sub}
        </p>
      )}
    </div>
  )
}

/* ─── KPICards container ─── */
export default function KPICards() {
  const { kpiSummary, kpiLoading } = useData()
  const loading = kpiLoading || !kpiSummary

  // Dynamic LR color
  const getLrAccent = (lr: number | undefined): [string, string] => {
    if (lr === undefined) return ['var(--color-gray-300)', 'hsla(218,14%,80%,0.2)']
    if (lr < 70) return ['hsl(83,52%,36%)', 'hsla(83,52%,36%,0.12)']
    if (lr <= 90) return ['hsl(30,88%,66%)', 'hsla(30,88%,66%,0.12)']
    return ['hsl(358,66%,54%)', 'hsla(358,66%,54%,0.12)']
  }
  const [lrAccent, lrGlow] = getLrAccent(kpiSummary?.avg_ulr)

  // Result trend
  const resultPositive = !!(kpiSummary?.total_resultat && kpiSummary.total_resultat >= 0)
  const resultAccent = resultPositive ? 'hsl(152,56%,39%)' : 'hsl(358,66%,54%)'
  const resultGlow = resultPositive ? 'hsla(152,56%,39%,0.12)' : 'hsla(358,66%,54%,0.12)'

  // Ratio Résultat/Prime trend
  const ratioResPrime = kpiSummary?.ratio_resultat_prime ?? 0
  const ratioPositive = ratioResPrime >= 0
  const ratioAccent = ratioPositive ? 'hsl(152,56%,39%)' : 'hsl(358,66%,54%)'
  const ratioGlow = ratioPositive ? 'hsla(152,56%,39%,0.12)' : 'hsla(358,66%,54%,0.12)'

  const kpis: Omit<KPICardProps, 'index' | 'loading'>[] = [
    {
      label: 'Prime écrite',
      rawValue: kpiSummary?.total_written_premium,
      formatFn: formatMAD,
      sub: "Volume d'affaires total",
      icon: <Banknote />,
      accentColor: 'hsl(209,28%,24%)',
      glowColor: 'hsla(209,28%,24%,0.10)',
      trend: 'neutral',
    },
    {
      label: 'Résultat net',
      rawValue: kpiSummary?.total_resultat,
      formatFn: formatMAD,
      sub: 'Résultat technique agrégé',
      icon: resultPositive ? <TrendingUp /> : <TrendingDown />,
      accentColor: resultAccent,
      glowColor: resultGlow,
      trend: resultPositive ? 'positive' : 'negative',
    },
    {
      label: 'Loss Ratio moyen',
      rawValue: kpiSummary?.avg_ulr,
      formatFn: formatPercent,
      sub: 'Performance technique',
      icon: <Activity />,
      accentColor: lrAccent,
      glowColor: lrGlow,
      trend: (kpiSummary?.avg_ulr ?? 0) < 70 ? 'positive' : 'negative',
    },
    {
      label: "Somme assurée",
      rawValue: kpiSummary?.total_sum_insured,
      formatFn: formatMAD,
      sub: "Exposition globale",
      icon: <Shield />,
      accentColor: 'hsl(209,24%,32%)',
      glowColor: 'hsla(209,24%,32%,0.10)',
      trend: 'neutral',
    },
    {
      label: 'Nb contrats',
      rawValue: kpiSummary?.contract_count,
      formatFn: (val) => val !== undefined ? Math.round(val).toLocaleString('fr-FR') : '—',
      sub: 'Périmètre actif',
      icon: <FileText />,
      accentColor: 'hsl(83,50%,45%)',
      glowColor: 'hsla(83,50%,45%,0.12)',
      trend: 'neutral',
    },
    {
      label: 'Ratio Résultat/Prime',
      rawValue: kpiSummary?.ratio_resultat_prime,
      formatFn: (val) => val !== undefined ? `${val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '—',
      sub: 'Rentabilité relative',
      icon: <Percent />,
      accentColor: ratioAccent,
      glowColor: ratioGlow,
      trend: ratioPositive ? 'positive' : 'negative',
    },
  ]

  return (
    <div className="flex gap-4 flex-wrap xl:flex-nowrap">
      {kpis.map((kpi, i) => (
        <KPICard key={i} index={i} {...kpi} loading={loading} />
      ))}
    </div>
  )
}
