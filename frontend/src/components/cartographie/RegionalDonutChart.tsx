/**
 * RegionalDonutChart — Donut Plotly de la structure régionale du marché
 * South Africa exclue du donut principal, affichée comme annotation séparée.
 */
import { useEffect, useRef, useMemo } from 'react'
import type { NonVieRow } from '../../types/cartographie'
import AnimatedControls from './AnimatedControls'

// ── Palette régions ───────────────────────────────────────────────────────────
const PIE_COLORS: Record<string, string> = {
  'Afrique Australe': '#8E44AD',
  'Maghreb':          '#1B3F6B',
  'CIMA':             '#E8940C',
  'Afrique Est':      '#1E8449',
  'Afrique Ouest':    '#E74C3C',
  'Afrique Centrale': '#2E86C1',
  'Iles':             '#17A589',
  'Autre':            '#95a5a6',
}

function fmtMrd(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)} Mrd`
  return `$${v.toFixed(0)}M`
}

interface Props {
  data: NonVieRow[]
  years: number[]
  year: number
  showAvg: boolean
  onYearChange: (y: number) => void
  onToggleAvg: () => void
}

interface RegionData {
  name: string
  value: number
  countries: { pays: string; primes: number }[]
}

export default function RegionalDonutChart({ data, years, year, showAvg, onYearChange, onToggleAvg }: Props) {
  const divRef = useRef<HTMLDivElement>(null)

  const source = useMemo(
    () => (showAvg ? data : data.filter(r => r.annee === year)),
    [data, year, showAvg]
  )
  const nYears = useMemo(
    () => showAvg ? (new Set(data.map(r => r.annee)).size || 1) : 1,
    [data, showAvg]
  )

  // Aggrégation primes par région (hors SA)
  const regData = useMemo<RegionData[]>(() => {
    const acc: Record<string, { value: number; countries: Record<string, number> }> = {}
    for (const r of source) {
      if (r.pays === 'Afrique du Sud') continue
      const reg = r.region ?? 'Autre'
      if (!acc[reg]) acc[reg] = { value: 0, countries: {} }
      const prime = (r.primes_emises_mn_usd ?? 0) / nYears
      acc[reg].value += prime
      acc[reg].countries[r.pays] = (acc[reg].countries[r.pays] ?? 0) + prime
    }
    return Object.entries(acc)
      .map(([name, { value, countries }]) => ({
        name,
        value,
        countries: Object.entries(countries)
          .map(([pays, primes]) => ({ pays, primes }))
          .sort((a, b) => b.primes - a.primes),
      }))
      .sort((a, b) => b.value - a.value)
  }, [source, nYears])

  const totHorsSA = useMemo(() => regData.reduce((s, d) => s + d.value, 0), [regData])
  const totAll = useMemo(
    () => source.reduce((s, r) => s + (r.primes_emises_mn_usd ?? 0) / nYears, 0),
    [source, nYears]
  )
  const saPrimes = totAll - totHorsSA
  const saPct = totAll > 0 ? (saPrimes / totAll * 100) : 0

  const periodLabel = showAvg
    ? `${years[0]}–${years[years.length - 1]} (moy.)`
    : String(year)

  useEffect(() => {
    if (!divRef.current) return
    const Plotly = (window as any).Plotly
    if (!Plotly) {
      // Lazy-load Plotly if not yet available (handled by dynamic import below)
      return
    }
    renderPlotly(Plotly)
  })

  // Dynamic import Plotly
  useEffect(() => {
    let cancelled = false
    import('plotly.js-dist-min').then((Plotly: any) => {
      if (cancelled || !divRef.current) return
      renderPlotly(Plotly)
    })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regData, saPct, saPrimes, totHorsSA, periodLabel])

  function renderPlotly(Plotly: any) {
    if (!divRef.current) return

    const labels = regData.map(d => d.name)
    const values = regData.map(d => d.value)
    const colors = regData.map(d => PIE_COLORS[d.name] ?? PIE_COLORS.Autre)

    const customText = regData.map(d => {
      const pctHorsSA = totHorsSA > 0 ? d.value / totHorsSA * 100 : 0
      const pctTotal = totAll > 0 ? d.value / totAll * 100 : 0
      const top3 = d.countries.slice(0, 3)
      const lines = top3.map(c => `  • ${c.pays}: ${fmtMrd(c.primes)}`).join('<br>')
      return (
        `<b>${d.name}</b><br>` +
        `Moy. annuelle: ${fmtMrd(d.value)}<br>` +
        `${pctHorsSA.toFixed(1)}% hors SA (${pctTotal.toFixed(1)}% total)<br>` +
        lines
      )
    })

    const textLabels = regData.map(d => {
      const pct = totHorsSA > 0 ? d.value / totHorsSA * 100 : 0
      return `${d.name}<br>${pct.toFixed(1)}%`
    })

    // ── Trace ─────────────────────────────────────────────────────────────────
    const trace = {
      type: 'pie',
      labels,
      values,
      hole: 0.42,
      marker: { colors, line: { color: '#fff', width: 2 } },
      text: textLabels,
      textinfo: 'text',
      textposition: 'outside',
      hovertemplate: '%{customdata}<extra></extra>',
      customdata: customText,
      // Donut sur ~55% gauche — la droite est réservée à SA + légende
      domain: { x: [0.0, 0.58], y: [0.0, 1.0] },
      textfont: { size: 10, color: '#374151' },
      pull: regData.map(() => 0.01),
      automargin: true,
    }

    // ── Layout ────────────────────────────────────────────────────────────────
    const layout = {
      // Marges réduites pour tenir à 100% de zoom
      margin: { t: 20, b: 55, l: 80, r: 20 },
      showlegend: true,
      legend: {
        // Légèrement à gauche de l'extrémité droite
        x: 0.72,
        y: 0.35,
        xanchor: 'left',
        yanchor: 'top',
        font: { size: 10.5, color: '#374151' },
        bgcolor: 'rgba(255,255,255,0)',
        bordercolor: 'rgba(0,0,0,0)',
        tracegroupgap: 4,
      },
      paper_bgcolor: '#fff',
      plot_bgcolor: '#fff',
      annotations: [
        // ── Centre du donut ──
        {
          text: (
            `<b style="font-size:16px;color:#1B3F6B">${fmtMrd(totHorsSA)}</b><br>` +
            `<span style="font-size:9px;color:#6b7280">Hors South Africa</span><br>` +
            `<span style="font-size:9px;color:#6b7280">${periodLabel}</span>`
          ),
          // x = milieu du domaine x du donut = (0.0+0.58)/2
          x: 0.29,
          y: 0.50,
          xanchor: 'center',
          yanchor: 'middle',
          showarrow: false,
          font: { size: 13, color: '#1B3F6B' },
          align: 'center',
        },
        // ── Annotation South Africa — au-dessus de la légende ──
        {
          text: (
            `<b style="font-size:22px;color:#C0392B">${saPct.toFixed(1)}%</b><br>` +
            `<span style="font-size:10px;color:#7b241c;font-weight:600">South Africa</span><br>` +
            `<span style="font-size:9px;color:#888">${fmtMrd(saPrimes)} — ${periodLabel}</span><br>` +
            `<span style="font-size:8px;color:#b0b0b0">Hors du graphique</span>`
          ),
          x: 0.84,
          y: 0.88,
          xanchor: 'center',
          yanchor: 'middle',
          showarrow: false,
          align: 'center',
          bgcolor: 'rgba(192,57,43,0.07)',
          bordercolor: 'rgba(192,57,43,0.35)',
          borderwidth: 1,
          borderpad: 10,
          font: { size: 11, color: '#C0392B' },
        },
      ],
    }

    const config = { responsive: true, displayModeBar: false }
    Plotly.react(divRef.current, [trace], layout, config)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-sm font-bold text-gray-700">
          Structure du marché (hors Afrique du Sud)
        </h2>
        <AnimatedControls
          years={years}
          value={year}
          onChange={y => { onYearChange(y) }}
        />
        <button
          onClick={onToggleAvg}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
            showAvg ? 'bg-[#1B3F6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Moy. {years[0]}–{years[years.length - 1]}
        </button>
      </div>

      {/* Chart container — hauteur réduite pour tenir à 100% de zoom */}
      <div
        className="bg-white rounded-xl overflow-hidden"
        style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
      >
        {/* Titre + sous-titre */}
        <div style={{ textAlign: 'center', paddingTop: 14, paddingBottom: 2 }}>
          <span className="text-sm font-bold text-gray-700">
            Répartition Régionale — {periodLabel}
          </span>
          <br />
          <span className="text-[11px]" style={{ color: '#6b7280' }}>
            South Africa exclue du graphique — affichée séparément à droite
          </span>
        </div>
        {/* 380px = visible à 100% de zoom sur un écran standard */}
        <div ref={divRef} style={{ height: 380, width: '100%' }} />
      </div>
    </div>
  )
}
