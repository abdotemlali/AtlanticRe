import { useState } from 'react'
import { ALL_REGIONS, REGION_COLORS } from '../../utils/cartographieConstants'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function RegionLegend() {
  const [open, setOpen] = useState(true)
  return (
    <div
      className="bg-white rounded-xl"
      style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5"
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
          Légende des régions
        </span>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-3 flex flex-wrap gap-2 items-center">
          {ALL_REGIONS.map(r => (
            <span
              key={r}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: `${REGION_COLORS[r]}18`, color: REGION_COLORS[r], border: `1px solid ${REGION_COLORS[r]}40` }}
            >
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
