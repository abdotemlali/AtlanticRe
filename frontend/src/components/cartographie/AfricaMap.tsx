import { useMemo, useRef, useState, useEffect } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { Play, Pause, RotateCcw, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react'
import {
  AFRICA_NUMERIC, ISO3_NAMES, ISO3_REGION, NUMERIC_TO_ISO3,
  COLOR_SCALES_POSITIONED, interpolatePositioned, REGION_COLORS, NAME_TO_ISO3, normalizePaysName,
} from '../../utils/cartographieConstants'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

export interface MapIndicator {
  key: string
  label: string
  scale: keyof typeof COLOR_SCALES_POSITIONED
  format: (v: number) => string
  /** @deprecated — no longer used, transformations are now metric-specific */
  divergent?: boolean
  /** @deprecated */
  diverMid?: number
}

interface Props {
  indicators: MapIndicator[]
  /** Valeurs par ISO3, indexées par (annee, pays). Ex: values[2024]['Maroc'] = 42.1 */
  rowsByCountryYear: Record<string, Record<number, Record<string, number | null>>>
  years: number[]
  defaultYear?: number
  height?: number
  /** Afficher la bordure rouge spéciale de l'Afrique du Sud (désactivé pour la cartographie macro où SA est un pays normal) */
  showZafBorder?: boolean
}

export default function AfricaMap({ indicators, rowsByCountryYear, years, defaultYear, height = 560, showZafBorder = true }: Props) {
  const [indicatorKey, setIndicatorKey] = useState(indicators[0]?.key ?? '')
  const [selectedYear, setSelectedYear] = useState<number | null>(
    defaultYear ?? (years.length ? years[years.length - 1] : null)
  )
  const [playing, setPlaying] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; value: number | null; region: string } | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const indicator = indicators.find(i => i.key === indicatorKey) ?? indicators[0]

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Valeurs pour l'année/indicateur actif
  const valueByIso3 = useMemo(() => {
    const out: Record<string, number | null> = {}
    const year = selectedYear ?? years[years.length - 1]
    const matrix = rowsByCountryYear[indicator?.key ?? '']
    if (!matrix) return out
    const perCountry = matrix[year] ?? {}
    Object.entries(perCountry).forEach(([pays, v]) => {
      // Try direct lookup with normalized name (handles "MOROCCO" → "Maroc" → ISO3)
      const normalized = normalizePaysName(pays)
      const iso3 = NAME_TO_ISO3[pays] ?? NAME_TO_ISO3[normalized] ?? null
      if (iso3) {
        out[iso3] = v
      } else {
        // Fallback: try matching against ISO3_NAMES values
        for (const [iso, name] of Object.entries(ISO3_NAMES)) {
          if (name === pays || name === normalized) { out[iso] = v; break }
        }
      }
    })
    return out
  }, [selectedYear, years, rowsByCountryYear, indicator])

  const { min, max } = useMemo(() => {
    const vals = Object.values(valueByIso3).filter((v): v is number => v != null && Number.isFinite(v))
    if (!vals.length) return { min: 0, max: 1 }
    return { min: Math.min(...vals), max: Math.max(...vals) }
  }, [valueByIso3])

  // ── Transformation par métrique ───────────────────────────────────────
  const transformValue = (v: number, scale: string): number => {
    switch (scale) {
      case 'primes':      return v > 0 ? Math.log10(v) : 0
      case 'gdp':         return v > 0 ? Math.log10(v) : 0
      case 'densite':     return v > 0 ? Math.log10(v) : 0
      case 'gdpCap':      return v > 0 ? Math.log10(v) : 0
      case 'penetration': return v > 0 ? Math.pow(v, 0.4) : 0
      case 'croissance':  return Math.sign(v) * Math.log10(Math.abs(v) + 1)
      case 'currentAcc':  return Math.sign(v) * Math.log10(Math.abs(v) + 1)
      default:            return v  // sp : identité
    }
  }

  // ── Ticks lisibles pour la légende ─────────────────────────────────────
  const legendTicksReadable = useMemo(() => {
    if (!indicator) return []
    const scale = indicator.scale as string
    switch (scale) {
      case 'primes': return [
        { raw: 5,    label: '5M' },
        { raw: 50,   label: '50M' },
        { raw: 300,  label: '300M' },
        { raw: 1000, label: '1Mrd' },
        { raw: 5000, label: '5Mrd' },
      ]
      case 'penetration': return [
        { raw: 0.1, label: '0.1%' },
        { raw: 0.3, label: '0.3%' },
        { raw: 0.6, label: '0.6%' },
        { raw: 1.0, label: '1%' },
        { raw: 1.5, label: '1.5%' },
        { raw: 3.0, label: '3%' },
      ]
      case 'densite': return [
        { raw: 1,   label: '1' },
        { raw: 5,   label: '5' },
        { raw: 15,  label: '15' },
        { raw: 50,  label: '50' },
        { raw: 150, label: '150' },
        { raw: 500, label: '500+' },
      ]
      case 'croissance': return [
        { raw: -20, label: '-20%' },
        { raw: -10, label: '-10%' },
        { raw: -5,  label: '-5%' },
        { raw: 0,   label: '0%' },
        { raw: 5,   label: '5%' },
        { raw: 10,  label: '10%' },
        { raw: 20,  label: '20%' },
        { raw: 30,  label: '30%' },
      ]
      case 'gdp': return [
        { raw: 5000,   label: '5Mrd' },
        { raw: 25000,  label: '25Mrd' },
        { raw: 100000, label: '100Mrd' },
        { raw: 300000, label: '300Mrd' },
      ]
      case 'gdpCap': return [
        { raw: 500,   label: '$500' },
        { raw: 1500,  label: '$1.5k' },
        { raw: 4000,  label: '$4k' },
        { raw: 10000, label: '$10k' },
      ]
      case 'currentAcc': return [
        { raw: -5000, label: '-5Mrd' },
        { raw: -1000, label: '-1Mrd' },
        { raw: 0,     label: '0' },
        { raw: 1000,  label: '1Mrd' },
        { raw: 5000,  label: '5Mrd' },
      ]
      case 'inflation': return [
        { raw: 0,  label: '0%' },
        { raw: 5,  label: '5%' },
        { raw: 10, label: '10%' },
        { raw: 25, label: '25%' },
        { raw: 50, label: '50%' },
      ]
      case 'sp': return [
        { raw: 20,  label: '20%' },
        { raw: 40,  label: '40%' },
        { raw: 60,  label: '60%' },
        { raw: 80,  label: '80%' },
        { raw: 100, label: '100%' },
      ]
      default: return []
    }
  }, [indicator])

  const getColor = (iso3: string): string => {
    const v = valueByIso3[iso3]
    if (v == null) return '#3a3f47'
    if (!indicator) return '#3a3f47'
    const scale = indicator.scale as string
    const positionedScale = COLOR_SCALES_POSITIONED[scale]
    if (!positionedScale) return '#3a3f47'

    const tv = transformValue(v, scale)
    const tMin = transformValue(min, scale)
    const tMax = transformValue(max, scale)
    const range = tMax - tMin
    const t = range === 0 ? 0 : (tv - tMin) / range
    return interpolatePositioned(t, positionedScale)
  }

  // Animation
  const handleAnimate = () => {
    if (playing) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setPlaying(false)
      return
    }
    setPlaying(true)
    let idx = Math.max(0, years.indexOf(selectedYear ?? years[0]))
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % years.length
      setSelectedYear(years[idx])
      if (idx === years.length - 1) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setPlaying(false)
      }
    }, 800)
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  // Légende : si des ticks lisibles existent, les utiliser, sinon min/max générique
  const legendStops = useMemo(() => {
    if (!indicator) return []
    const scale = indicator.scale as string
    const positionedScale = COLOR_SCALES_POSITIONED[scale]
    if (!positionedScale) return []

    if (legendTicksReadable.length > 0) {
      const tMin = transformValue(min, scale)
      const tMax = transformValue(max, scale)
      const range = tMax - tMin
      return legendTicksReadable
        .filter(tick => {
          const tv = transformValue(tick.raw, scale)
          return tv >= tMin && tv <= tMax
        })
        .map(tick => {
          const tv = transformValue(tick.raw, scale)
          const t = range === 0 ? 0 : (tv - tMin) / range
          return { color: interpolatePositioned(t, positionedScale), label: tick.label }
        })
    }

    // Fallback : 6 steps uniformes
    const steps = 6
    const out: { color: string; label: string }[] = []
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      out.push({ color: interpolatePositioned(t, positionedScale), label: indicator.format(min + (max - min) * t) })
    }
    return out
  }, [indicator, min, max, legendTicksReadable])

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, hsl(220,20%,12%) 0%, hsl(220,18%,16%) 40%, hsl(200,15%,14%) 100%)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
        border: '1px solid hsla(0,0%,100%,0.06)',
      }}
    >
      {/* ── Top Control Bar ── */}
      <div
        className="flex items-center gap-3 flex-wrap px-5 py-3.5"
        style={{
          background: 'hsla(0,0%,100%,0.03)',
          borderBottom: '1px solid hsla(0,0%,100%,0.06)',
        }}
      >
        {/* Indicator Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
            style={{
              background: 'hsla(83,52%,42%,0.15)',
              color: 'hsl(83,60%,75%)',
              border: '1px solid hsla(83,52%,42%,0.30)',
              minWidth: 200,
            }}
          >
            <span className="flex-1 text-left truncate">{indicator?.label ?? 'Indicateur'}</span>
            <ChevronDown size={13} className="flex-shrink-0" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {dropdownOpen && (
            <div
              className="absolute left-0 mt-2 rounded-xl overflow-hidden"
              style={{
                zIndex: 300,
                background: 'hsla(220,20%,10%,0.97)',
                backdropFilter: 'blur(20px)',
                border: '1px solid hsla(83,52%,50%,0.25)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.50)',
                minWidth: 250,
              }}
            >
              {indicators.map(i => {
                const isActive = i.key === indicatorKey
                return (
                  <button
                    key={i.key}
                    onClick={() => { setIndicatorKey(i.key); setDropdownOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-all duration-150"
                    style={{
                      color: isActive ? 'hsl(83,60%,75%)' : 'hsla(0,0%,100%,0.65)',
                      background: isActive ? 'hsla(83,52%,42%,0.18)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'hsla(0,0%,100%,0.06)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '' }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{
                      background: isActive
                        ? 'hsl(83,52%,42%)'
                        : 'hsla(0,0%,100%,0.15)',
                      boxShadow: isActive ? '0 0 6px hsla(83,52%,42%,0.5)' : 'none',
                    }} />
                    <span>{i.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Year Selector */}
        <select
          aria-label="Année"
          value={selectedYear ?? ''}
          onChange={e => setSelectedYear(e.target.value === 'avg' ? null : parseInt(e.target.value))}
          className="px-3 py-2 rounded-xl text-xs font-semibold"
          style={{
            background: 'hsla(0,0%,100%,0.06)',
            color: 'hsla(0,0%,100%,0.80)',
            border: '1px solid hsla(0,0%,100%,0.10)',
            outline: 'none',
          }}
        >
          <option value="avg" style={{ background: '#1a1e25' }}>Moyenne {years[0]}–{years[years.length - 1]}</option>
          {years.map(y => <option key={y} value={y} style={{ background: '#1a1e25' }}>{y}</option>)}
        </select>

        {/* Animation Controls */}
        <button
          onClick={handleAnimate}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
          style={{
            background: playing
              ? 'linear-gradient(135deg, hsl(0,65%,50%), hsl(0,65%,40%))'
              : 'linear-gradient(135deg, hsl(83,52%,42%), hsl(83,52%,36%))',
            color: 'white',
            boxShadow: playing
              ? '0 2px 12px hsla(0,65%,50%,0.4)'
              : '0 2px 12px hsla(83,52%,42%,0.4)',
          }}
        >
          {playing ? <Pause size={12} /> : <Play size={12} />}
          {playing ? 'Pause' : 'Animer'}
        </button>
        <button
          onClick={() => { setSelectedYear(years[years.length - 1]); setPlaying(false); if (intervalRef.current) clearInterval(intervalRef.current) }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
          style={{
            background: 'hsla(0,0%,100%,0.06)',
            color: 'hsla(0,0%,100%,0.55)',
            border: '1px solid hsla(0,0%,100%,0.08)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'hsla(0,0%,100%,0.90)'; e.currentTarget.style.background = 'hsla(0,0%,100%,0.10)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'hsla(0,0%,100%,0.55)'; e.currentTarget.style.background = 'hsla(0,0%,100%,0.06)' }}
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {/* ── Map Container ── */}
      <div ref={containerRef} className="relative" style={{ background: 'transparent' }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 400, center: [20, 2] }}
          style={{ width: '100%', height }}
        >
          <ZoomableGroup zoom={1} minZoom={0.8} maxZoom={4}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map(geo => {
                  const numericId = parseInt(geo.id, 10)
                  if (!AFRICA_NUMERIC.has(numericId)) return null
                  const iso3 = NUMERIC_TO_ISO3[numericId]
                  const isTarget = !!iso3
                  const fill = isTarget ? getColor(iso3) : 'hsla(220,10%,25%,0.5)'
                  const isZaf = showZafBorder && iso3 === 'ZAF'
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke={isZaf ? '#E74C3C' : 'hsla(220,15%,35%,0.5)'}
                      strokeWidth={isZaf ? 2 : 0.4}
                      style={{
                        default: { outline: 'none' },
                        hover: {
                          fill,
                          outline: 'none',
                          cursor: iso3 ? 'pointer' : 'default',
                          filter: 'brightness(1.25) saturate(1.2)',
                          strokeWidth: iso3 ? 1.2 : 0.4,
                          stroke: iso3 ? 'hsla(83,60%,70%,0.60)' : 'hsla(220,15%,35%,0.5)',
                        },
                        pressed: { outline: 'none' },
                      }}
                      onMouseMove={e => {
                        if (!iso3) return
                        const rect = containerRef.current?.getBoundingClientRect()
                        const x = e.clientX - (rect?.left ?? 0)
                        const y = e.clientY - (rect?.top ?? 0)
                        setTooltip({
                          x, y,
                          name: ISO3_NAMES[iso3] ?? iso3,
                          region: ISO3_REGION[iso3] ?? '',
                          value: valueByIso3[iso3] ?? null,
                        })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  )
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* ── Légende — gradient bar ── */}
        <div
          className="absolute bottom-5 right-5 rounded-xl px-4 py-3.5"
          style={{
            background: 'hsla(220,20%,8%,0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid hsla(0,0%,100%,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            minWidth: 160,
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2.5" style={{ color: 'hsl(83,60%,70%)' }}>
            {indicator?.label}
          </p>
          {/* Gradient bar */}
          <div className="rounded-full overflow-hidden mb-2" style={{ height: 8 }}>
            <div
              className="w-full h-full"
              style={{
                background: legendStops.length
                  ? `linear-gradient(to right, ${legendStops.map(s => s.color).join(', ')})`
                  : '#666',
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-white/60 font-medium">{legendStops[0]?.label}</span>
            <span className="text-[9px] text-white/60 font-medium">{legendStops[legendStops.length - 1]?.label}</span>
          </div>
          {/* No data indicator */}
          <div className="flex items-center gap-2 mt-2.5 pt-2" style={{ borderTop: '1px solid hsla(0,0%,100%,0.06)' }}>
            <div className="w-3.5 h-3 rounded-sm" style={{ background: '#3a3f47' }} />
            <span className="text-[9px] text-white/40 font-medium">Données non disponibles</span>
          </div>
        </div>

        {/* ── Badge année ── */}
        <div
          className="absolute top-5 left-5 px-4 py-2.5 rounded-xl"
          style={{
            background: 'hsla(220,20%,8%,0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid hsla(0,0%,100%,0.08)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          }}
        >
          <span className="text-[10px] uppercase tracking-[0.10em] font-medium block" style={{ color: 'hsla(0,0%,100%,0.40)' }}>
            Période
          </span>
          <span className="text-sm font-bold text-white tracking-wide">
            {selectedYear ?? `${years[0]} – ${years[years.length - 1]}`}
          </span>
        </div>

        {/* ── Badge ZAF — uniquement si showZafBorder est actif ── */}
        {showZafBorder && (
          <div
            className="absolute top-5 right-5 px-3 py-2 rounded-xl flex items-center gap-2"
            style={{
              background: 'hsla(220,20%,8%,0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid hsla(0,0%,100%,0.08)',
            }}
          >
            <div className="w-3 h-3 rounded-sm" style={{ background: '#E74C3C' }} />
            <span className="text-[9px] text-white/60 font-medium">Afrique du Sud (bordure)</span>
          </div>
        )}

        {/* ── Tooltip ── */}
        {tooltip && (
          <div
            className="absolute z-50 pointer-events-none rounded-xl"
            style={{
              left: Math.min(tooltip.x + 14, (containerRef.current?.clientWidth ?? 500) - 220),
              top: tooltip.y + 14,
              background: 'hsla(220,20%,8%,0.96)',
              border: '1px solid hsla(83,52%,50%,0.30)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
              minWidth: 200,
              padding: '12px 16px',
            }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  background: REGION_COLORS[tooltip.region] ?? '#95a5a6',
                  boxShadow: `0 0 8px ${REGION_COLORS[tooltip.region] ?? '#95a5a6'}50`,
                }}
              />
              <p className="text-[13px] font-bold text-white leading-tight">{tooltip.name}</p>
            </div>
            {tooltip.region && (
              <p className="text-[10px] font-medium mb-2.5" style={{ color: 'hsl(83,60%,70%)' }}>
                {tooltip.region}
              </p>
            )}
            <div
              className="flex items-center justify-between py-2 px-2.5 rounded-lg"
              style={{ background: 'hsla(0,0%,100%,0.04)' }}
            >
              <span className="text-[10px] text-white/50 font-medium">{indicator?.label}</span>
              <span className="text-sm font-bold" style={{ color: 'hsl(83,60%,75%)' }}>
                {tooltip.value != null ? indicator?.format(tooltip.value) : 'N/A'}
              </span>
            </div>
            <p className="text-[9px] mt-1.5 text-white/30 text-right font-medium">
              {selectedYear ?? 'Moyenne'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
