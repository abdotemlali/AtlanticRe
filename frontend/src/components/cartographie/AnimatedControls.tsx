import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

interface Props {
  years: number[]
  value: number
  onChange: (y: number) => void
  intervalMs?: number
  showAvg?: boolean
}

/** Select année + bouton Animer réutilisable. */
export default function AnimatedControls({ years, value, onChange, intervalMs = 900, showAvg = false }: Props) {
  const [playing, setPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handle = () => {
    if (playing) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setPlaying(false); return
    }
    setPlaying(true)
    let idx = years.indexOf(value)
    if (idx < 0) idx = 0
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % years.length
      onChange(years[idx])
      if (idx === years.length - 1) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setPlaying(false)
      }
    }, intervalMs)
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Année"
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300"
      >
        {showAvg && years.length > 0 && (
          <option value={0}>Moyenne {years[0]}–{years[years.length - 1]}</option>
        )}
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <button
        onClick={handle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
        style={{ background: 'hsl(83,52%,42%)' }}
      >
        {playing ? <Pause size={12} /> : <Play size={12} />}
        {playing ? 'Pause' : 'Animer'}
      </button>
    </div>
  )
}
