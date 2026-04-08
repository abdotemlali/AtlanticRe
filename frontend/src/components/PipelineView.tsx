import { useMemo, useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { Target, PieChart as PieIcon, BarChart2, Loader2 } from 'lucide-react'
import { formatCompact } from '../utils/formatters'
import { useData, filtersToParams } from '../context/DataContext'
import api from '../utils/api'

export interface Contract {
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

const STATUS_COLORS: Record<string, string> = {
    'OFFER LOGGED': 'hsl(209,28%,24%)',
    'ACCEPTED': 'hsl(180,25%,35%)',
    'CONFIRMED': 'hsl(83,52%,36%)',
    'CLOSED': 'hsl(218,12%,68%)',
    'COMMUTED': 'hsl(30,88%,56%)',
    'CANCELLED': 'hsl(358,66%,54%)'
}

const STATUS_LABELS: Record<string, string> = {
    'OFFER LOGGED': 'Offre Enregistrée',
    'ACCEPTED': 'Accepté',
    'CONFIRMED': 'Confirmé',
    'CLOSED': 'Clôturé',
    'COMMUTED': 'Commuté',
    'CANCELLED': 'Annulé'
}

export default function PipelineView() {
    const { filters } = useData()
    const [data, setData] = useState<Contract[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setLoading(true)
        // Ignorer le filtre 'statuts' pour afficher le pipeline complet
        const pipelineFilters = { ...filters, statuts: [] }

        // Fetch all matching contracts without pagination
        api.get('/contracts', { params: { ...filtersToParams(pipelineFilters), page: 1, page_size: 10000 } })
            .then(res => setData(res.data.data || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [filters])
    // Analytics Compute
    const analytics = useMemo(() => {
        const totalContracts = data.length
        
        // Count confirmed+closed vs total
        const activeOrConverted = data.filter(c => c.status !== 'CANCELLED' && c.status !== 'COMMUTED').length
        const totalConverted = data.filter(c => c.status === 'CONFIRMED' || c.status === 'CLOSED').length
        const conversionRate = activeOrConverted > 0 ? (totalConverted / activeOrConverted) * 100 : 0
        
        const totalVolume = data.reduce((sum, c) => sum + (c.written_premium || 0), 0)

        // 1. Pipeline Funnel (Volume for active pipeline stages)
        const pipelineStages = ['OFFER LOGGED', 'ACCEPTED', 'CONFIRMED', 'CLOSED']
        const volumeFunnel = pipelineStages.map(s => ({
            name: STATUS_LABELS[s],
            status: s,
            value: data.filter(c => c.status === s).reduce((sum, c) => sum + (c.written_premium || 0), 0),
            fill: STATUS_COLORS[s]
        }))

        // 2. Mix by Status (Count of contracts)
        const countsByStatus = data.reduce((acc, c) => {
            const s = c.status || 'UNKNOWN'
            acc[s] = (acc[s] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const mixPie = Object.keys(STATUS_COLORS).map(s => ({
            name: STATUS_LABELS[s],
            status: s,
            value: countsByStatus[s] || 0,
            fill: STATUS_COLORS[s]
        })).filter(item => item.value > 0).sort((a, b) => b.value - a.value)

        // 3. Pipeline Stacked by Top 5 Cedantes (Volume)
        const volumeByCedante = data.reduce((acc, c) => {
            const ced = c.int_cedante || 'Inconnu'
            acc[ced] = (acc[ced] || 0) + (c.written_premium || 0)
            return acc
        }, {} as Record<string, number>)

        const topCedantes = Object.entries(volumeByCedante)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(e => e[0])

        const stackedPipeline = topCedantes.map(ced => {
            const cedData = data.filter(c => (c.int_cedante || 'Inconnu') === ced)
            const res: any = { name: ced }
            Object.keys(STATUS_COLORS).forEach(s => {
                res[s] = cedData.filter(c => c.status === s).reduce((sum, c) => sum + (c.written_premium || 0), 0)
            })
            return res
        })

        return {
            totalContracts,
            totalConverted,
            conversionRate,
            totalVolume,
            volumeFunnel,
            mixPie,
            stackedPipeline,
            activeOrConverted
        }
    }, [data])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-[var(--color-navy)]">
                <Loader2 size={32} className="animate-spin mb-4" />
                <p className="text-sm font-semibold">Analyse de l'ensemble du pipeline en cours...</p>
            </div>
        )
    }

    if (!data.length) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-[var(--color-gray-400)]">
                <Target size={48} className="mb-4 opacity-50" />
                <p>Aucun contrat ne correspond aux filtres sélectionnés.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-200)] shadow-sm">
                    <div className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2">Contrats dans le Pipeline</div>
                    <div className="text-2xl font-mono font-bold text-[var(--color-navy)]">{analytics.totalContracts}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-200)] shadow-sm">
                    <div className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2">Volume Total (MAD)</div>
                    <div className="text-2xl font-mono font-bold text-[var(--color-navy)]">{formatCompact(analytics.totalVolume)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[var(--color-gray-200)] shadow-sm relative overflow-hidden">
                    <div className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-wider mb-2">Taux de Conversion (Confirmés / Clôturés)</div>
                    <div className="flex items-end gap-2">
                        <div className="text-2xl font-mono font-bold text-[var(--color-emerald)]">
                            {analytics.conversionRate.toFixed(1)}%
                        </div>
                        <div className="text-xs font-medium text-[var(--color-gray-500)] mb-1">
                            ({analytics.totalConverted} sur {analytics.activeOrConverted})
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Funnel Volume */}
                <div className="bg-white p-5 rounded-xl border border-[var(--color-gray-200)] shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart2 size={18} className="text-[var(--color-navy)]" />
                        <h3 className="font-bold text-[var(--color-navy)] text-sm">Volume Financier (MAD) par Étape</h3>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={analytics.volumeFunnel} margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--color-gray-100)" />
                                <XAxis type="number" tickFormatter={(val) => formatCompact(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-navy)', fontWeight: 600 }} width={120} />
                                <Tooltip
                                    cursor={{ fill: 'hsla(0,0%,0%,0.05)' }}
                                    content={({ active, payload }: any) => {
                                        if (active && payload && payload.length) {
                                            const item = payload[0].payload
                                            return (
                                                <div className="bg-white/95 p-3 rounded-lg shadow-xl border border-[var(--color-gray-100)] text-xs min-w-[150px]">
                                                    <div className="font-bold text-[var(--color-navy)] mb-2">{item.name}</div>
                                                    <div className="flex justify-between items-center gap-4">
                                                        <span className="text-[var(--color-gray-500)]">Volume :</span>
                                                        <span className="font-mono font-bold text-[var(--color-navy)]">{formatCompact(item.value)}</span>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {analytics.volumeFunnel.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2: Mix Portefeuille */}
                <div className="bg-white p-5 rounded-xl border border-[var(--color-gray-200)] shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <PieIcon size={18} className="text-[var(--color-navy)]" />
                        <h3 className="font-bold text-[var(--color-navy)] text-sm">Répartition des Contrats par Statut</h3>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={analytics.mixPie}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {analytics.mixPie.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={({ active, payload }: any) => {
                                        if (active && payload && payload.length) {
                                            const item = payload[0].payload
                                            const percent = ((item.value / analytics.totalContracts) * 100).toFixed(1)
                                            return (
                                                <div className="bg-white/95 p-3 rounded-lg shadow-xl border border-[var(--color-gray-100)] text-xs min-w-[150px]">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></span>
                                                        <span className="font-bold text-[var(--color-navy)]">{item.name}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex justify-between items-center gap-4">
                                                            <span className="text-[var(--color-gray-500)]">Contrats :</span>
                                                            <span className="font-mono font-bold text-[var(--color-navy)]">{item.value}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center gap-4 border-t border-gray-100 mt-1 pt-1">
                                                            <span className="text-[var(--color-gray-500)]">Part :</span>
                                                            <span className="font-mono font-bold text-[var(--color-navy)]">{percent}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Legend 
                                    layout="vertical" 
                                    verticalAlign="middle" 
                                    align="right"
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 3: Pipeline croisé Cédante */}
                <div className="bg-white p-5 rounded-xl border border-[var(--color-gray-200)] shadow-sm lg:col-span-2">
                    <div className="flex items-center gap-2 mb-6">
                        <Target size={18} className="text-[var(--color-navy)]" />
                        <h3 className="font-bold text-[var(--color-navy)] text-sm">Pipelines Comparés : Top 5 Cédantes (Volume)</h3>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.stackedPipeline} margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-gray-100)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                                <YAxis tickFormatter={(val) => formatCompact(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-gray-500)' }} />
                                <Tooltip
                                    cursor={{ fill: 'hsla(0,0%,0%,0.03)' }}
                                    content={({ active, payload, label }: any) => {
                                        if (active && payload && payload.length) {
                                            const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0)
                                            return (
                                                <div className="bg-white/95 p-4 rounded-lg shadow-xl border border-[var(--color-gray-100)] min-w-[200px]">
                                                    <div className="font-bold text-[var(--color-navy)] mb-2 text-sm border-b pb-2">{label}</div>
                                                    <div className="space-y-1.5 mb-2">
                                                        {payload.map((entry: any, index: number) => {
                                                            if (entry.value === 0) return null
                                                            return (
                                                                <div key={index} className="flex justify-between items-center text-xs">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                                                        <span className="text-[var(--color-gray-600)]">{STATUS_LABELS[entry.dataKey as string]}</span>
                                                                    </div>
                                                                    <span className="font-mono font-bold text-[var(--color-navy)]">{formatCompact(entry.value)}</span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs font-bold border-t pt-2 mt-2">
                                                        <span className="text-[var(--color-navy)]">Total</span>
                                                        <span className="font-mono text-[var(--color-navy)]">{formatCompact(total)}</span>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Legend
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                    payload={Object.keys(STATUS_COLORS).map(status => ({
                                        value: STATUS_LABELS[status],
                                        type: 'circle',
                                        id: status,
                                        color: STATUS_COLORS[status]
                                    }))}
                                />
                                {Object.keys(STATUS_COLORS).map(status => (
                                    <Bar key={status} dataKey={status} stackId="a" fill={STATUS_COLORS[status]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}
