import { useState, useEffect } from "react"
import { useNavigate } from 'react-router-dom'
import { AlertOctagon, ChevronDown, ChevronRight } from 'lucide-react'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { useData } from '../context/DataContext'
import { formatCompact, formatMAD } from '../utils/formatters'

interface AlertItem {
    pays: string
    branche: string
    avg_ulr: number
    total_written_premium: number
    total_resultat: number
    contract_count: number
}

export default function DashboardAlerts() {
    const { filters, dataStatus } = useData()
    const navigate = useNavigate()
    const [alerts, setAlerts] = useState<AlertItem[]>([])
    const [loading, setLoading] = useState(false)
    const [threshold, setThreshold] = useState<number>(80)
    const [debouncedThreshold, setDebouncedThreshold] = useState<number>(80)
    const [expanded, setExpanded] = useState(false)

    // Debounce threshold input
    useEffect(() => {
        const t = setTimeout(() => {
            if (threshold >= 50 && threshold <= 150) {
                setDebouncedThreshold(threshold)
            }
        }, 400)
        return () => clearTimeout(t)
    }, [threshold])

    // Load alerts
    useEffect(() => {
        if (!dataStatus?.loaded) {
            setAlerts([])
            return
        }
        setLoading(true)
        api.get(API_ROUTES.KPIS.ALERTS, {
            params: {
                ulr_threshold: debouncedThreshold,
                ...filters
            }
        }).then(res => {
            setAlerts(res.data || [])
        }).catch(err => {
            console.error('Erreur chargement alertes', err)
        }).finally(() => {
            setLoading(false)
        })
    }, [debouncedThreshold, filters, dataStatus?.loaded])

    if (!alerts.length && !loading && threshold === debouncedThreshold) {
        return (
            <div className="flex items-center gap-3 mb-5 px-1 animate-fade-in">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--color-navy-muted)' }}
                >
                  <AlertOctagon size={13} style={{ color: 'var(--color-navy)' }} />
                </div>
                <label className="text-sm font-semibold text-[var(--color-navy)] whitespace-nowrap">Seuil ULR :</label>
                <div className="relative w-24">
                    <input 
                        type="number" 
                        min={50} max={150} 
                        value={threshold}
                        onChange={e => setThreshold(Number(e.target.value))}
                        className="w-full text-sm font-bold font-mono pl-3 pr-6 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--color-green-muted)]"
                        style={{ borderColor: 'var(--color-gray-200)', backgroundColor: 'var(--color-off-white)', color: 'var(--color-navy)' }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-gray-500)]">%</span>
                </div>
                <span className="text-xs text-[var(--color-green)] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)] inline-block" />
                  Aucune alerte
                </span>
            </div>
        )
    }

    return (
        <div className="mb-5 animate-slide-up stagger-2">
            <div className="flex items-center gap-3 mb-3 px-1">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--color-red-muted)' }}
                >
                  <AlertOctagon size={13} style={{ color: 'var(--color-red)' }} />
                </div>
                <label className="text-sm font-semibold text-[var(--color-navy)] whitespace-nowrap">Seuil ULR :</label>
                <div className="relative w-24">
                    <input 
                        type="number" 
                        min={50} max={150} 
                        value={threshold}
                        onChange={e => setThreshold(Number(e.target.value))}
                        className="w-full text-sm font-bold font-mono pl-3 pr-6 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--color-green-muted)]"
                        style={{ borderColor: 'var(--color-gray-200)', backgroundColor: 'var(--color-off-white)', color: 'var(--color-navy)' }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-gray-500)]">%</span>
                </div>
                {loading && <span className="text-xs text-[var(--color-gray-500)] ml-2 animate-pulse">Actualisation...</span>}
            </div>

            {alerts.length > 0 && (
                <div 
                    className="glass-card overflow-hidden transition-all duration-300"
                    style={{ borderLeft: '3px solid hsl(358,66%,54%)' }}
                >
                    <div 
                        className="flex flex-wrap items-center justify-between p-3.5 cursor-pointer hover:bg-[hsla(358,66%,54%,0.03)]"
                        onClick={() => setExpanded(!expanded)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'hsla(358,66%,54%,0.1)' }}>
                                <AlertOctagon size={16} style={{ color: 'hsl(358,66%,54%)' }} />
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--color-navy)] text-sm">
                                    <span style={{ color: 'hsl(358,66%,54%)' }}>{alerts.length} marché{alerts.length > 1 ? 's' : ''}</span> en alerte
                                </h3>
                                <p className="text-xs text-[var(--color-gray-500)] mt-0.5">ULR dépassant le seuil critique de {debouncedThreshold}%</p>
                            </div>
                        </div>
                        <button className="p-1 rounded-md text-[var(--color-gray-500)] hover:bg-[hsla(0,0%,0%,0.05)] transition-colors">
                            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                    </div>

                    {expanded && (
                        <div className="border-t border-[var(--color-gray-100)] bg-[var(--color-off-white)] p-0">
                            <div className="max-h-[300px] overflow-y-auto">
                                <table className="w-full text-xs text-left whitespace-nowrap">
                                    <thead className="bg-[var(--color-gray-50)] text-[var(--color-gray-500)]">
                                        <tr>
                                            <th className="py-2.5 px-4 font-semibold">Pays</th>
                                            <th className="py-2.5 px-4 font-semibold">Branche</th>
                                            <th className="py-2.5 px-4 font-semibold text-right">Contrats</th>
                                            <th className="py-2.5 px-4 font-semibold text-right">Prime (MAD)</th>
                                            <th className="py-2.5 px-4 font-semibold text-right">Résultat (MAD)</th>
                                            <th className="py-2.5 px-4 font-semibold text-right text-[var(--color-red)]">ULR %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-gray-100)]">
                                        {alerts.map((a, i) => (
                                            <tr key={`${a.pays}-${a.branche}-${i}`} className="hover:bg-white transition-colors">
                                                <td 
                                                    className="py-2.5 px-4 font-medium text-[var(--color-navy)] cursor-pointer hover:text-[hsl(209,28%,40%)] hover:underline transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        sessionStorage.setItem('analysis_mode', 'country')
                                                        navigate(`/analyse/${encodeURIComponent(a.pays)}`)
                                                    }}
                                                    title={`Analyser le pays ${a.pays}`}
                                                >
                                                    {a.pays}
                                                </td>
                                                <td 
                                                    className="py-2.5 px-4 text-[var(--color-gray-500)] cursor-pointer hover:text-[var(--color-navy)] hover:underline transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        sessionStorage.setItem('analysis_mode', 'market')
                                                        sessionStorage.setItem('analysis_market', JSON.stringify({ pays: a.pays, branche: a.branche }))
                                                        navigate(`/analyse/${encodeURIComponent(a.pays)}`)
                                                    }}
                                                    title={`Analyser le marché ${a.pays} — ${a.branche}`}
                                                >
                                                    {a.branche}
                                                </td>
                                                <td className="py-2.5 px-4 text-right font-mono">{a.contract_count}</td>
                                                <td className="py-2.5 px-4 text-right font-mono text-[var(--color-navy)] font-medium">{formatMAD(a.total_written_premium)}</td>
                                                <td className="py-2.5 px-4 text-right font-mono text-[var(--color-red)] font-medium">{formatMAD(a.total_resultat)}</td>
                                                <td className="py-2.5 px-4 text-right font-mono text-[var(--color-red)] font-bold">{a.avg_ulr.toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
