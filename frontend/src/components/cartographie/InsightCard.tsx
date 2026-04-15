export type InsightTone = 'navy' | 'green' | 'amber' | 'red' | 'info'

export interface InsightCardProps {
  tone?: InsightTone
  icon?: string
  value?: string
  label?: string
  body: string
  badge?: { text: string; kind?: 'ok' | 'warn' | 'alert' | 'info' }
  countryTags?: string[]
}

const TONES: Record<InsightTone, { bg: string; border: string; accent: string }> = {
  navy:  { bg: 'linear-gradient(135deg, hsla(215,40%,22%,0.05), hsla(215,40%,30%,0.08))', border: 'hsla(215,40%,30%,0.25)', accent: '#1B3F6B' },
  green: { bg: 'linear-gradient(135deg, hsla(140,50%,35%,0.05), hsla(140,50%,40%,0.08))', border: 'hsla(140,50%,35%,0.25)', accent: '#1E8449' },
  amber: { bg: 'linear-gradient(135deg, hsla(35,80%,50%,0.05), hsla(35,85%,55%,0.08))',    border: 'hsla(35,80%,50%,0.30)', accent: '#E8940C' },
  red:   { bg: 'linear-gradient(135deg, hsla(0,60%,45%,0.05), hsla(0,65%,50%,0.08))',     border: 'hsla(0,60%,45%,0.25)',  accent: '#C0392B' },
  info:  { bg: 'linear-gradient(135deg, hsla(200,55%,45%,0.05), hsla(200,60%,50%,0.08))',  border: 'hsla(200,55%,45%,0.25)', accent: '#2E86C1' },
}

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  ok:    { bg: 'hsla(140,50%,40%,0.12)', color: '#1E8449' },
  warn:  { bg: 'hsla(35,85%,55%,0.12)',   color: '#B9770E' },
  alert: { bg: 'hsla(0,60%,50%,0.12)',    color: '#922B21' },
  info:  { bg: 'hsla(200,60%,50%,0.12)',  color: '#1F618D' },
}

export default function InsightCard(props: InsightCardProps) {
  const t = TONES[props.tone ?? 'navy']
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ background: t.bg, border: `1px solid ${t.border}`, minHeight: 150 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {props.icon && <span className="text-xl">{props.icon}</span>}
          {props.value && (
            <span className="text-lg font-bold" style={{ color: t.accent }}>
              {props.value}
            </span>
          )}
        </div>
        {props.badge && (
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
            style={BADGE_STYLES[props.badge.kind ?? 'info']}
          >
            {props.badge.text}
          </span>
        )}
      </div>
      {props.label && (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {props.label}
        </span>
      )}
      <p className="text-[12px] text-gray-600 leading-relaxed flex-1">{props.body}</p>
      {props.countryTags && props.countryTags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {props.countryTags.map((c, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: 'hsla(0,0%,100%,0.6)', color: t.accent, border: `1px solid ${t.border}` }}
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
