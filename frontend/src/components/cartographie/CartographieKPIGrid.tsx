export interface KPI {
  label: string
  value: string
  sublabel?: string
  accent?: 'olive' | 'navy' | 'green' | 'amber' | 'red'
}

const ACCENTS: Record<string, string> = {
  olive: 'hsl(83,52%,42%)',
  navy: '#1B3F6B',
  green: '#1E8449',
  amber: '#E8940C',
  red: '#C0392B',
}

export default function CartographieKPIGrid({ kpis }: { kpis: KPI[] }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map((k, i) => {
        const color = ACCENTS[k.accent ?? 'olive']
        return (
          <div
            key={i}
            className="bg-white rounded-xl p-5 flex flex-col"
            style={{
              border: '1px solid hsl(0,0%,92%)',
              borderLeftWidth: 4,
              borderLeftColor: color,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              minHeight: 120,
            }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              {k.label}
            </span>
            <span className="text-3xl font-bold mt-2" style={{ color: '#1a202c' }}>
              {k.value}
            </span>
            {k.sublabel && (
              <span className="text-[11px] text-gray-400 mt-1">{k.sublabel}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
