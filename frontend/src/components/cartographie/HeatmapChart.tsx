import { useMemo, useState } from 'react'
import { REGION_COLORS, COLOR_SCALES, interpolateScale } from '../../utils/cartographieConstants'

interface Props {
  /** rows[pays][année] = valeur */
  matrix: Record<string, Record<number, number | null>>
  years: number[]
  countries: string[]
  regions: Record<string, string>
  scale?: keyof typeof COLOR_SCALES
  format?: (v: number) => string
  title?: string
}

export default function HeatmapChart({
  matrix, years, countries, regions,
  scale = 'primes', format = v => v.toFixed(1), title,
}: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; pays: string; annee: number; value: number | null } | null>(null)

  // Tri : par région, puis alphabétique
  const sortedCountries = useMemo(() => {
    return [...countries].sort((a, b) => {
      const ra = regions[a] ?? 'zzz'
      const rb = regions[b] ?? 'zzz'
      if (ra !== rb) return ra.localeCompare(rb)
      return a.localeCompare(b)
    })
  }, [countries, regions])

  const { min, max } = useMemo(() => {
    const vals: number[] = []
    Object.values(matrix).forEach(yRow => {
      Object.values(yRow).forEach(v => { if (v != null && Number.isFinite(v)) vals.push(v) })
    })
    if (!vals.length) return { min: 0, max: 1 }
    return { min: Math.min(...vals), max: Math.max(...vals) }
  }, [matrix])

  const getColor = (v: number | null): string => {
    if (v == null || !Number.isFinite(v)) return '#f5f5f5'
    const stops = COLOR_SCALES[scale]
    const t = max === min ? 0 : (v - min) / (max - min)
    return interpolateScale(t, stops)
  }

  const cellW = 80
  const cellH = 20
  const labelW = 180

  return (
    <div className="bg-white rounded-xl p-5"
      style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
      {title && <h3 className="text-sm font-bold text-gray-700 mb-4">{title}</h3>}
      <div className="flex flex-col lg:flex-row gap-2 items-center">
        {/* Graphe */}
        <div className="relative overflow-x-auto flex-1">
          <div style={{ display: 'inline-block', minWidth: labelW + years.length * cellW }}>
            {/* Header */}
            <div className="flex" style={{ paddingLeft: labelW }}>
              {years.map(y => (
                <div key={y} className="text-[10px] text-gray-500 text-center" style={{ width: cellW }}>{y}</div>
              ))}
            </div>
            {/* Rows */}
            {sortedCountries.map(pays => {
              const region = regions[pays] ?? 'Autre'
              const regionColor = REGION_COLORS[region] ?? REGION_COLORS.Autre
              return (
                <div key={pays} className="flex items-center">
                  <div className="flex items-center gap-2 pr-2" style={{ width: labelW }}>
                    <div className="w-1.5 h-4 rounded-sm" style={{ background: regionColor }} />
                    <span className="text-[11px] text-gray-700 truncate">{pays}</span>
                  </div>
                  {years.map(y => {
                    const v = matrix[pays]?.[y] ?? null
                    return (
                      <div
                        key={y}
                        className="border border-white"
                        style={{ width: cellW, height: cellH, background: getColor(v), cursor: 'pointer' }}
                        onMouseMove={e => setTooltip({ x: e.clientX, y: e.clientY, pays, annee: y, value: v })}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
          {tooltip && (
            <div
              className="fixed z-50 px-3 py-2 rounded-lg pointer-events-none text-xs bg-gray-900 text-white"
              style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
            >
              <p className="font-bold">{tooltip.pays}</p>
              <p>{tooltip.annee}: {tooltip.value != null ? format(tooltip.value) : 'N/A'}</p>
            </div>
          )}
        </div>

        {/* Légende de couleur (à droite, serréé) */}
        <div className="flex flex-col items-center justify-center pr-6 pb-6">
          <span className="text-[11px] text-gray-500 font-medium mb-2 text-center">Max<br /><b className="text-gray-700">{format(max)}</b></span>
          <div
            className="w-3 h-48 rounded-sm shadow-sm"
            style={{ background: `linear-gradient(to top, ${COLOR_SCALES[scale].join(', ')})` }}
          />
          <span className="text-[11px] text-gray-500 font-medium mt-2 text-center">Min<br /><b className="text-gray-700">{format(min)}</b></span>
        </div>
      </div>
    </div>
  )
}
