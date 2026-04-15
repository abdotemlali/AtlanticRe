import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts'
import { Play, Pause } from 'lucide-react'
import { REGION_COLORS } from '../../utils/cartographieConstants'

export interface MetricDef {
  key: string
  label: string
  format: (v: number) => string
  ref?: number
}

export interface ConfigurableScatterPoint {
  pays: string
  region: string
  primes: number
  [metricKey: string]: any
}

interface Props {
  title: string
  metrics: MetricDef[]
  defaultX: string
  defaultY: string
  sizeLabel: string
  sizeFormat: (v: number) => string
  pointsByYear: Record<number, ConfigurableScatterPoint[]>
  years: number[]
  defaultYear?: number
  height?: number
  onAxesChange?: (xKey: string, yKey: string) => void
}

// Custom label for vertical reference line (xRef)
function XRefLabel({ viewBox, text }: { viewBox?: any; text: string }) {
  if (!viewBox) return null
  const { x, y } = viewBox
  return (
    <text x={x + 5} y={y + 14} fontSize={10} fill="#94a3b8" textAnchor="start">
      {text}
    </text>
  )
}

// Custom label for horizontal reference line (yRef)
function YRefLabel({ viewBox, text }: { viewBox?: any; text: string }) {
  if (!viewBox) return null
  const { x, y, width } = viewBox
  return (
    <text x={x + width - 5} y={y - 5} fontSize={10} fill="#94a3b8" textAnchor="end">
      {text}
    </text>
  )
}

export default function ConfigurableScatterBubble({
  title,
  metrics,
  defaultX,
  defaultY,
  sizeLabel,
  sizeFormat,
  pointsByYear,
  years,
  defaultYear,
  height = 480,
  onAxesChange,
}: Props) {
  const [xKey, setXKey] = useState(defaultX)
  const [yKey, setYKey] = useState(defaultY)
  const [selectedYear, setSelectedYear] = useState<number>(
    defaultYear ?? years[years.length - 1]
  )
  const [playing, setPlaying] = useState(false)
  const [showAvg, setShowAvg] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const xMetric = metrics.find(m => m.key === xKey) ?? metrics[0]
  const yMetric = metrics.find(m => m.key === yKey) ?? metrics[1]

  // Average across all years, per country
  const avgPoints = useMemo<ConfigurableScatterPoint[]>(() => {
    const acc: Record<string, { pays: string; region: string; sums: Record<string, number>; counts: Record<string, number> }> = {}
    for (const pts of Object.values(pointsByYear)) {
      for (const pt of pts) {
        if (!acc[pt.pays]) acc[pt.pays] = { pays: pt.pays, region: pt.region, sums: {}, counts: {} }
        const entry = acc[pt.pays]
        if (pt.primes != null && pt.primes > 0) {
          entry.sums['primes'] = (entry.sums['primes'] ?? 0) + pt.primes
          entry.counts['primes'] = (entry.counts['primes'] ?? 0) + 1
        }
        for (const m of metrics) {
          if (pt[m.key] != null) {
            entry.sums[m.key] = (entry.sums[m.key] ?? 0) + pt[m.key]
            entry.counts[m.key] = (entry.counts[m.key] ?? 0) + 1
          }
        }
      }
    }
    return Object.values(acc).map(({ pays, region, sums, counts }) => {
      const pt: ConfigurableScatterPoint = {
        pays,
        region,
        primes: counts['primes'] ? sums['primes'] / counts['primes'] : 0,
      }
      for (const m of metrics) {
        pt[m.key] = counts[m.key] ? sums[m.key] / counts[m.key] : null
      }
      return pt
    }).filter(pt => pt.primes > 0)
  }, [pointsByYear, metrics])

  const points = useMemo(() => {
    const raw = showAvg
      ? avgPoints
      : (pointsByYear[selectedYear] ?? [])
    return raw
      .filter(pt => pt[xMetric.key] != null && pt[yMetric.key] != null && pt.primes != null && pt.primes > 0)
      .map(pt => ({ ...pt, x: pt[xMetric.key], y: pt[yMetric.key], z: pt.primes }))
  }, [pointsByYear, selectedYear, xMetric.key, yMetric.key, showAvg, avgPoints])

  const handleAnimate = () => {
    if (playing) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setPlaying(false)
      return
    }
    setPlaying(true)
    let idx = years.indexOf(selectedYear)
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % years.length
      setSelectedYear(years[idx])
      if (idx === years.length - 1) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setPlaying(false)
      }
    }, 900)
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const zDomain: [number, number] = useMemo(() => {
    // Base the scale on non-ZAF countries so South Africa's large primes
    // don't collapse all other bubble sizes.
    const refVals = points
      .filter(p => p.region !== 'Afrique du Sud')
      .map(p => p.z)
      .filter(Number.isFinite)
    const vals = refVals.length ? refVals : points.map(p => p.z).filter(Number.isFinite)
    if (!vals.length) return [0, 1]
    return [Math.min(...vals), Math.max(...vals)]
  }, [points])

  const handleXChange = (key: string) => {
    const newY = key === yKey ? xKey : yKey
    setXKey(key)
    if (key === yKey) setYKey(xKey)
    onAxesChange?.(key, newY)
  }
  const handleYChange = (key: string) => {
    const newX = key === xKey ? yKey : xKey
    if (key === xKey) setXKey(yKey)
    setYKey(key)
    onAxesChange?.(newX, key)
  }

  const minYear = years[0]
  const maxYear = years[years.length - 1]

  return (
    <div className="bg-white rounded-xl p-5"
      style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-sm font-bold text-gray-700">{title}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Axis selectors */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Axe X</span>
            <select
              aria-label="Axe X"
              value={xKey}
              onChange={e => handleXChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300"
            >
              {metrics.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Axe Y</span>
            <select
              aria-label="Axe Y"
              value={yKey}
              onChange={e => handleYChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300"
            >
              {metrics.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>

          {/* Year controls — disabled in avg mode */}
          <select
            aria-label="Année"
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            disabled={showAvg}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handleAnimate}
            disabled={showAvg}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'hsl(83,52%,42%)' }}
          >
            {playing ? <Pause size={12} /> : <Play size={12} />}
            {playing ? 'Pause' : 'Animer'}
          </button>

          {/* Avg toggle */}
          <button
            onClick={() => {
              setShowAvg(v => !v)
              if (playing) {
                if (intervalRef.current) clearInterval(intervalRef.current)
                setPlaying(false)
              }
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            style={showAvg
              ? { background: 'hsl(214,60%,22%)', color: '#fff', borderColor: 'hsl(214,60%,22%)' }
              : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}
          >
            Moyenne {minYear}–{maxYear}
          </button>

        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 30, bottom: 40, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            type="number"
            dataKey="x"
            name={xMetric.label}
            tickFormatter={xMetric.format}
            label={{ value: xMetric.label, position: 'insideBottom', offset: -20, style: { fontSize: 12, fill: '#64748b' } }}
            tick={{ fontSize: 11, fill: '#64748b' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yMetric.label}
            tickFormatter={yMetric.format}
            label={{ value: yMetric.label, angle: -90, position: 'insideLeft', offset: -10, style: { fontSize: 12, fill: '#64748b' } }}
            tick={{ fontSize: 11, fill: '#64748b' }}
          />
          <ZAxis type="number" dataKey="z" name={sizeLabel} range={[80, 1200]} domain={zDomain} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null
              const d = payload[0].payload as any
              return (
                <div className="bg-white rounded-lg p-3 shadow-lg border border-gray-200 text-xs">
                  <p className="font-bold text-gray-800">{d.pays}</p>
                  <p className="text-gray-500 text-[10px] mb-1">{d.region}</p>
                  <p className="text-gray-600">{xMetric.label}: <b>{xMetric.format(d.x)}</b></p>
                  <p className="text-gray-600">{yMetric.label}: <b>{yMetric.format(d.y)}</b></p>
                  <p className="text-gray-600">{sizeLabel}: <b>{sizeFormat(d.z)}</b></p>
                  {showAvg && <p className="text-gray-400 text-[10px] mt-1 italic">Moyenne {minYear}–{maxYear}</p>}
                </div>
              )
            }}
          />
          {xMetric.ref !== undefined && (
            <ReferenceLine
              x={xMetric.ref}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={<XRefLabel text={xMetric.format(xMetric.ref)} />}
            />
          )}
          {yMetric.ref !== undefined && (
            <ReferenceLine
              y={yMetric.ref}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={<YRefLabel text={yMetric.format(yMetric.ref)} />}
            />
          )}
          <Scatter data={points} isAnimationActive>
            {points.map((p, i) => (
              <Cell key={i} fill={REGION_COLORS[p.region] ?? REGION_COLORS.Autre} fillOpacity={0.75} stroke={REGION_COLORS[p.region] ?? REGION_COLORS.Autre} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
