import InsightCard, { InsightCardProps } from './InsightCard'

interface Props {
  icon?: string
  title: string
  subtitle?: string
  cards: InsightCardProps[]
}

export default function InsightPanel({ icon, title, subtitle, cards }: Props) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-base">{icon}</span>}
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
      </div>
      {subtitle && <p className="text-xs text-gray-500 mb-3 -mt-2">{subtitle}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c, i) => <InsightCard key={i} {...c} />)}
      </div>
    </div>
  )
}
