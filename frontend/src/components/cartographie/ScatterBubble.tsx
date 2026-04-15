import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts'
import { Play, Pause } from 'lucide-react'
import { REGION_COLORS } from '../../utils/cartographieConstants'

export interface ScatterPoint {
  pays: string
  region: string
  x: number
  y: number
  z: number
  [extra: string]: any
}

interface Props {
  title: string
  xLabel: string
  yLabel: string
  zLabel: string
  xFormat?: (v: number) => string
  yFormat?: (v: number) => string
  zFormat?: (v: number) => string
  /** Pour chaque année, la liste des points. */
  pointsByYear: Record<number | string, ScatterPoint[]>
  years: number[]
  defaultYear?: number | string
  xLog?: boolean
  /** Ligne de référence verticale */
  xRef?: number
  /** Ligne de référence horizontale */
  yRef?: number
  height?: number
  showAvgButton?: boolean
  quadrantLabels?: { tl?: string; tr?: string; bl?: string; br?: string }
}

export default function ScatterBubble({
  title, xLabel, yLabel, zLabel,
  xFormat = v => v.toFixed(1),
  yFormat = v => v.toFixed(1),
  zFormat = v => v.toFixed(0),
  pointsByYear, years, defaultYear, xLog = false,
  xRef, yRef, height = 460, showAvgButton = false,
  quadrantLabels,
}: Props) {
  const [selectedYear, setSelectedYear] = useState<number | string>(
    defaultYear ?? years[years.length - 1]
  )
  const [playing, setPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const points = useMemo(() => pointsByYear[selectedYear] ?? [], [pointsByYear, selectedYear])

  const handleAnimate = () => {
    if (playing) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setPlaying(false); return
    }
    setPlaying(true)
    let idx = years.indexOf(selectedYear as number)
    if (idx === -1) idx = 0
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
    const vals = points.map(p => p.z).filter(Number.isFinite)
    if (!vals.length) return [0, 1]
    return [Math.min(...vals), Math.max(...vals)]
  }, [points])

  return (
    <div className="bg-white rounded-xl p-5"
      style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-sm font-bold text-gray-700">{title}</h3>
        <div className="flex items-center gap-2">
          <select
            aria-label="Année"
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value === 'avg' ? 'avg' : parseInt(e.target.value))}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handleAnimate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'hsl(83,52%,42%)' }}
          >
            {playing ? <Pause size={12} /> : <Play size={12} />}
            {playing ? 'Pause' : 'Animer'}
          </button>
          {showAvgButton && (
            <button
              onClick={() => setSelectedYear('avg')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${selectedYear === 'avg' ? 'bg-[hsl(83,52%,42%)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Moyenne 2015-2024
            </button>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 30, bottom: 40, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            scale={xLog ? 'log' : 'auto'}
            domain={xLog ? ['auto', 'auto'] : ['auto', 'auto']}
            tickFormatter={xFormat}
            label={{ value: xLabel, position: 'insideBottom', offset: -20, style: { fontSize: 12, fill: '#64748b' } }}
            tick={{ fontSize: 11, fill: '#64748b' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            tickFormatter={yFormat}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: -10, style: { fontSize: 12, fill: '#64748b' } }}
            tick={{ fontSize: 11, fill: '#64748b' }}
          />
          <ZAxis type="number" dataKey="z" name={zLabel} range={[80, 1200]} domain={zDomain} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ borderRadius: 8, border: '1px solid #D1D9E0', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null
              const d = payload[0].payload as ScatterPoint
              return (
                <div className="bg-white rounded-lg p-3 shadow-lg border border-gray-200 text-xs">
                  <p className="font-bold text-gray-800">{d.pays}</p>
                  <p className="text-gray-500 text-[10px] mb-1">{d.region}</p>
                  <p className="text-gray-600">{xLabel}: <b>{xFormat(d.x)}</b></p>
                  <p className="text-gray-600">{yLabel}: <b>{yFormat(d.y)}</b></p>
                  <p className="text-gray-600">{zLabel}: <b>{zFormat(d.z)}</b></p>
                </div>
              )
            }}
          />
          {xRef !== undefined && (
            <ReferenceLine x={xRef} stroke="#94a3b8" strokeDasharray="4 4" />
          )}
          {yRef !== undefined && (
            <ReferenceLine y={yRef} stroke="#94a3b8" strokeDasharray="4 4" />
          )}
          <Scatter data={points} isAnimationActive>
            {points.map((p, i) => (
              <Cell key={i} fill={REGION_COLORS[p.region] ?? REGION_COLORS.Autre} fillOpacity={0.75} stroke={REGION_COLORS[p.region] ?? REGION_COLORS.Autre} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {quadrantLabels && (
        <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] text-gray-500">
          {quadrantLabels.tl && <div>↖ {quadrantLabels.tl}</div>}
          {quadrantLabels.tr && <div className="text-right">↗ {quadrantLabels.tr}</div>}
          {quadrantLabels.bl && <div>↙ {quadrantLabels.bl}</div>}
          {quadrantLabels.br && <div className="text-right">↘ {quadrantLabels.br}</div>}
        </div>
      )}
    </div>
  )
}
