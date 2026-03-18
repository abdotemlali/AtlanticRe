import { formatCompact } from '../utils/formatters'

interface Contract {
    policy_id: string
    contract_number: string | null
    int_spc: string | null
    int_branche: string | null
    int_cedante: string | null
    int_broker: string | null
    pays_risque: string | null
    underwriting_year: number | null
    status: string | null
    written_premium: number | null
    ulr: number | null
    resultat: number | null
    inception_date: string | null
    expiry_date: string | null
    date_accepted: string | null
    date_confirmed: string | null
    date_closed: string | null
    date_cancelled: string | null
    date_saisie: string | null
}

interface PipelineViewProps {
    data: Contract[]
}

const KANBAN_COLUMNS = [
    { id: 'OFFER LOGGED', label: 'OFFER LOGGED', color: 'hsl(209,28%,24%)', dateField: 'date_saisie' as keyof Contract },
    { id: 'ACCEPTED', label: 'ACCEPTED', color: 'hsl(152,56%,39%)', dateField: 'date_accepted' as keyof Contract },
    { id: 'CONFIRMED', label: 'CONFIRMED', color: 'hsl(83,52%,36%)', dateField: 'date_confirmed' as keyof Contract },
    { id: 'CLOSED', label: 'CLOSED', color: 'hsl(218,12%,68%)', dateField: 'date_closed' as keyof Contract },
    { id: 'COMMUTED', label: 'COMMUTED', color: 'hsl(30,88%,56%)', dateField: 'expiry_date' as keyof Contract }, // Fallback for COMMUTED
    { id: 'CANCELLED', label: 'CANCELLED', color: 'hsl(358,66%,54%)', dateField: 'date_cancelled' as keyof Contract },
]

export default function PipelineView({ data }: PipelineViewProps) {
    const ulrColor = (v: number | null) => {
        if (!v) return 'var(--color-gray-400)'
        if (v > 100) return 'var(--color-red)'
        if (v > 70) return 'var(--color-orange)'
        return 'var(--color-emerald)'
    }

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[600px] snap-x scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
            {KANBAN_COLUMNS.map(col => {
                const columnData = data.filter(c => c.status === col.id)
                const columnVolume = columnData.reduce((sum, c) => sum + (c.written_premium || 0), 0)

                return (
                    <div 
                        key={col.id} 
                        className="flex flex-col flex-shrink-0 w-72 bg-[var(--color-gray-50)] rounded-xl border border-[var(--color-gray-100)] snap-center shadow-sm h-full"
                    >
                        {/* Header */}
                        <div 
                            className="p-3 border-b-2 rounded-t-xl"
                            style={{ borderBottomColor: col.color, backgroundColor: 'white' }}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="font-bold text-[13px] tracking-wide" style={{ color: col.color }}>{col.label}</h3>
                                <span className="text-xs font-mono font-bold bg-[var(--color-gray-100)] text-[var(--color-gray-600)] px-2 py-0.5 rounded-full">
                                    {columnData.length}
                                </span>
                            </div>
                            <div className="text-xs text-[var(--color-gray-500)] font-medium">
                                Vol. <span className="font-mono text-[var(--color-navy)] font-bold">{formatCompact(columnVolume)}</span> MAD
                            </div>
                        </div>

                        {/* Cards */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ scrollbarWidth: 'none' }}>
                            {columnData.map((c, i) => (
                                <div 
                                    key={c.policy_id || i}
                                    className="bg-white p-3 rounded-lg border border-[var(--color-gray-200)] shadow-sm hover:shadow-md transition-shadow cursor-default group"
                                    style={{ borderLeft: `3px solid ${col.color}` }}
                                >
                                    <div className="flex justify-between items-start mb-1.5">
                                        <div className="font-mono text-xs font-bold text-[var(--color-navy-light)]">{c.policy_id}</div>
                                        <div className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-[var(--color-gray-50)] text-[var(--color-gray-500)] rounded">
                                            {c.underwriting_year || '—'}
                                        </div>
                                    </div>
                                    
                                    <div className="text-xs font-semibold text-[var(--color-navy)] truncate mb-0.5" title={c.int_cedante || ''}>
                                        {c.int_cedante || 'Sans Cédante'}
                                    </div>
                                    <div className="text-[11px] text-[var(--color-gray-500)] mb-2 flex items-center justify-between">
                                        <span className="truncate max-w-[120px]" title={c.pays_risque || ''}>{c.pays_risque}</span>
                                        {c[col.dateField] && (
                                            <span className="text-[10px] text-gray-400 font-mono">{String(c[col.dateField])}</span>
                                        )}
                                    </div>
                                    
                                    <div className="flex justify-between items-end pt-2 border-t border-[var(--color-gray-50)]">
                                        <div>
                                            <div className="text-[10px] text-[var(--color-gray-400)] mb-0.5">Prime (MAD)</div>
                                            <div className="text-xs font-mono font-bold text-[var(--color-navy)]">
                                                {formatCompact(c.written_premium)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-[var(--color-gray-400)] mb-0.5">ULR</div>
                                            <div className="text-xs font-mono font-bold" style={{ color: ulrColor(c.ulr) }}>
                                                {c.ulr ? `${c.ulr.toFixed(0)}%` : '—'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
