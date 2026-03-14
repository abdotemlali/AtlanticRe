// 🎨 STYLE UPDATED — InactiveClients : AbsenceBadge HSL, StatutsTooltip glassmorphism, sliders CSS styled, pagination premium
import React, { useState } from 'react'
import { useInactiveClients } from '../hooks/useInactiveClients'
import { InactiveClient } from '../types/admin.types'
import { UserX, Download, Search, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react'
import { TableSkeleton } from '../components/ui/Skeleton'

/* ─── Absence Badge — HSL Premium ─── */
function AbsenceBadge({ years }: { years: number }) {
    const label = `${years} an${years > 1 ? 's' : ''}`

    // 🎨 HSL gradient severity
    let bg: string, text: string, glow: string
    if (years > 3) {
        bg = 'hsla(358,66%,54%,0.14)'
        text = 'hsl(358,66%,50%)'
        glow = 'hsl(358,66%,54%)'
    } else if (years >= 2) {
        bg = 'hsla(30,88%,56%,0.14)'
        text = 'hsl(30,88%,48%)'
        glow = 'hsl(30,88%,56%)'
    } else {
        bg = 'hsla(83,52%,36%,0.14)'
        text = 'hsl(83,54%,32%)'
        glow = 'hsl(83,52%,36%)'
    }

    return (
        <span
            className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full"
            style={{
                background: bg,
                color: text,
                border: `1px solid ${glow}30`,
            }}
        >
            {/* Pulsing dot */}
            <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: glow, animation: years > 2 ? 'pulse 1.5s ease-in-out infinite' : 'none' }}
                aria-hidden="true"
            />
            {label}
        </span>
    )
}

/* ─── Statuts Tooltip — glassmorphism ─── */
function StatutsTooltip({ breakdown }: { breakdown: Record<string, number> }) {
    const entries = Object.entries(breakdown).filter(([, v]) => v > 0)
    if (!entries.length) return <span className="text-gray-300 text-xs">—</span>
    const total = entries.reduce((s, [, v]) => s + v, 0)
    return (
        <div className="relative group inline-block">
            <span
                className="text-xs font-semibold cursor-default"
                style={{
                    color: 'var(--color-navy-light)',
                    textDecoration: 'underline',
                    textDecorationStyle: 'dotted',
                    textDecorationColor: 'var(--color-gray-300)',
                }}
            >
                {total} contrat{total > 1 ? 's' : ''}
            </span>
            {/* Glassmorphism tooltip panel */}
            <div
                className="absolute z-50 bottom-full left-0 mb-2 min-w-[180px] rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-250 ease-out-expo"
                style={{
                    background: 'hsla(209,28%,18%,0.94)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid hsla(0,0%,100%,0.10)',
                    boxShadow: '0 16px 40px hsla(209,28%,8%,0.40)',
                }}
            >
                <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    Répartition statuts
                </p>
                {entries.map(([status, cnt]) => (
                    <div key={status} className="flex justify-between gap-4 py-0.5">
                        <span className="text-xs" style={{ color: 'hsla(0,0%,100%,0.60)' }}>{status}</span>
                        <span className="text-xs font-bold text-white">{cnt}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ─── Sort Header ─── */
function SortTh({ label, field, currentSort, currentOrder, onSort }: {
    label: string; field: string
    currentSort: string; currentOrder: string
    onSort: (f: string) => void
}) {
    const active = currentSort === field
    const SortIcon = active
        ? (currentOrder === 'desc' ? <ArrowDown size={10} className="flex-shrink-0" style={{ color: 'hsl(83,50%,55%)' }} /> : <ArrowUp size={10} className="flex-shrink-0" style={{ color: 'hsl(83,50%,55%)' }} />)
        : <ArrowUpDown size={10} className="flex-shrink-0 opacity-30" />

    return (
        <th onClick={() => onSort(field)} style={{ cursor: 'pointer', userSelect: 'none' }}>
            <span className="flex items-center gap-1">{label}{SortIcon}</span>
        </th>
    )
}

/* ─────────────────────────────────────────────────────────────
   Main Page
   ───────────────────────────────────────────────────────────── */
export default function InactiveClients() {
    const { data, loading, exporting, error, params, analyze, sortBy, goToPage, exportExcel } = useInactiveClients()
    const [yearsInput, setYearsInput] = useState(2)
    const [contractsInput, setContractsInput] = useState(3)

    const totalPages = data ? Math.ceil(data.total / data.page_size) : 0

    return (
        <div className="p-5 space-y-5 page-container" style={{ minHeight: '100vh' }}>

            {/* ─── Header ─── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="animate-slide-up">
                    <h1 className="text-lg font-bold text-navy flex items-center gap-2">
                        <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: 'hsla(358,66%,54%,0.12)', border: '1px solid hsla(358,66%,54%,0.25)' }}
                        >
                            <UserX size={15} style={{ color: 'hsl(358,66%,54%)' }} />
                        </span>
                        Clients Inactifs
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Détecter les cédantes ayant cessé toute activité de souscription
                    </p>
                </div>

                {/* Export Excel */}
                {data && data.total > 0 && (
                    <button
                        onClick={exportExcel}
                        disabled={exporting}
                        className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white transition-all duration-250 ease-out-expo disabled:opacity-60 disabled:cursor-wait animate-scale-in"
                        style={{
                            background: 'linear-gradient(135deg, hsl(83,54%,27%) 0%, hsl(83,52%,36%) 60%, hsl(83,50%,45%) 100%)',
                            boxShadow: '0 2px 12px hsla(83,52%,36%,0.35)',
                            border: 'none',
                            willChange: 'transform',
                        }}
                        onMouseEnter={e => { if (!exporting) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px hsla(83,52%,36%,0.45)' } }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px hsla(83,52%,36%,0.35)' }}
                    >
                        {exporting ? <Loader2 size={14} className="animate-spin flex-shrink-0" /> : <Download size={14} className="flex-shrink-0" />}
                        {exporting ? 'Export…' : 'Exporter Excel'}
                    </button>
                )}
            </div>

            {/* ─── Parameters Card ─── */}
            <div className="glass-card p-5 animate-slide-up stagger-2">
                <h2 className="text-sm font-bold text-navy mb-4 flex items-center gap-2">
                    <span className="text-base">⚙️</span>
                    Paramètres de détection
                </h2>

                <div className="flex flex-wrap items-end gap-8">
                    {/* Slider — Années d'absence */}
                    <div className="flex-1 min-w-[200px]">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Années d'absence minimum
                            </label>
                            <span
                                className="text-xl font-extrabold tabular-nums"
                                style={{ color: 'hsl(83,52%,36%)' }}
                            >
                                {yearsInput}
                            </span>
                        </div>
                        {/* Styled HTML range — RC-slider CSS already covers it */}
                        <input
                            type="range" min={1} max={10} step={1}
                            value={yearsInput}
                            onChange={e => setYearsInput(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full cursor-pointer appearance-none"
                            style={{
                                background: `linear-gradient(to right, hsl(83,52%,36%) 0%, hsl(83,52%,36%) ${(yearsInput - 1) / 9 * 100}%, hsl(218,22%,88%) ${(yearsInput - 1) / 9 * 100}%, hsl(218,22%,88%) 100%)`,
                                accentColor: 'hsl(83,52%,36%)',
                            }}
                        />
                        <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                            <span>1 an</span><span>10 ans</span>
                        </div>
                    </div>

                    {/* Slider — Min contrats */}
                    <div className="flex-1 min-w-[200px]">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Nombre minimum de contrats
                            </label>
                            <span
                                className="text-xl font-extrabold tabular-nums"
                                style={{ color: 'hsl(209,28%,30%)' }}
                            >
                                {contractsInput}
                            </span>
                        </div>
                        <input
                            type="range" min={1} max={20} step={1}
                            value={contractsInput}
                            onChange={e => setContractsInput(Number(e.target.value))}
                            className="w-full h-1.5 rounded-full cursor-pointer appearance-none"
                            style={{
                                background: `linear-gradient(to right, hsl(209,28%,30%) 0%, hsl(209,28%,30%) ${(contractsInput - 1) / 19 * 100}%, hsl(218,22%,88%) ${(contractsInput - 1) / 19 * 100}%, hsl(218,22%,88%) 100%)`,
                                accentColor: 'hsl(209,28%,30%)',
                            }}
                        />
                        <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                            <span>1</span><span>20</span>
                        </div>
                    </div>

                    {/* Analyze button + reference year */}
                    <div className="flex flex-col gap-2 items-start">
                        {data && (
                            <span className="text-xs text-gray-400">
                                Année de référence :
                                <strong className="ml-1.5" style={{ color: 'var(--color-navy)' }}>
                                    {data.reference_year}
                                </strong>
                            </span>
                        )}
                        <button
                            onClick={() => analyze({ years_threshold: yearsInput, min_contracts: contractsInput, page: 1 })}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all duration-250 ease-out-expo disabled:opacity-60 disabled:cursor-wait"
                            style={{
                                background: 'linear-gradient(135deg, hsl(209,32%,17%) 0%, hsl(209,28%,26%) 55%, hsl(209,24%,34%) 100%)',
                                boxShadow: '0 2px 14px hsla(209,28%,24%,0.32)',
                                border: 'none',
                                willChange: 'transform',
                            }}
                            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px hsla(209,28%,24%,0.45)' } }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 14px hsla(209,28%,24%,0.32)' }}
                        >
                            {loading
                                ? <><Loader2 size={13} className="animate-spin flex-shrink-0" /> Analyse…</>
                                : <><Search size={13} className="flex-shrink-0" /> Analyser</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Error ─── */}
            {error && (
                <div
                    className="glass-card p-4 flex items-center gap-3 animate-slide-up"
                    style={{ borderLeft: '3px solid hsl(358,66%,54%)' }}
                >
                    <AlertTriangle size={18} style={{ color: 'hsl(358,66%,54%)', flexShrink: 0 }} />
                    <span className="text-sm font-medium" style={{ color: 'hsl(358,66%,54%)' }}>{error}</span>
                </div>
            )}

            {/* ─── Empty state ─── */}
            {!data && !loading && !error && (
                <div className="glass-card p-14 flex flex-col items-center gap-4 animate-fade-in">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ background: 'hsla(358,66%,54%,0.08)' }}
                    >
                        <UserX size={28} style={{ color: 'hsl(358,66%,54%)', opacity: 0.5 }} />
                    </div>
                    <p className="text-sm font-medium text-gray-400">
                        Configurez les paramètres et cliquez sur <strong className="text-navy">Analyser</strong>
                    </p>
                </div>
            )}

            {/* ─── Loading skeleton ─── */}
            {loading && (
                <div
                    className="glass-card overflow-hidden animate-fade-in"
                    style={{ borderRadius: 'var(--radius-lg)' }}
                >
                    <TableSkeleton rows={10} columns={7} />
                </div>
            )}

            {/* ─── Results ─── */}
            {data && !loading && (
                <>
                    {/* Summary badge */}
                    <div className="flex items-center gap-3 flex-wrap animate-slide-up">
                        <span
                            className="text-sm font-bold px-4 py-1.5 rounded-full"
                            style={{
                                background: data.total === 0 ? 'hsla(83,52%,36%,0.12)' : 'hsla(358,66%,54%,0.12)',
                                color: data.total === 0 ? 'hsl(83,54%,30%)' : 'hsl(358,66%,48%)',
                                border: `1px solid ${data.total === 0 ? 'hsla(83,52%,36%,0.25)' : 'hsla(358,66%,54%,0.25)'}`,
                            }}
                        >
                            {data.total === 0
                                ? '✅ Aucune cédante inactive détectée'
                                : `⚠️ ${data.total} cédante${data.total > 1 ? 's' : ''} inactive${data.total > 1 ? 's' : ''} détectée${data.total > 1 ? 's' : ''}`}
                        </span>
                        <span className="text-xs text-gray-400">
                            Seuil : ≥ {data.years_threshold} an{data.years_threshold > 1 ? 's' : ''} d'absence · ≥ {data.min_contracts} contrats
                        </span>
                    </div>

                    {/* Results table */}
                    {data.clients.length > 0 && (
                        <>
                            <div
                                className="glass-card overflow-hidden animate-slide-up stagger-2"
                                style={{ borderRadius: 'var(--radius-lg)' }}
                            >
                                <div className="overflow-x-auto">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <SortTh label="Cédante" field="int_cedante" currentSort={params.sort_by} currentOrder={params.sort_order} onSort={sortBy} />
                                                <th>Code</th>
                                                <th>Pays</th>
                                                <SortTh label="Total contrats" field="total_contracts" currentSort={params.sort_by} currentOrder={params.sort_order} onSort={sortBy} />
                                                <SortTh label="Dernière année" field="last_year" currentSort={params.sort_by} currentOrder={params.sort_order} onSort={sortBy} />
                                                <SortTh label="Années d'absence" field="years_absent" currentSort={params.sort_by} currentOrder={params.sort_order} onSort={sortBy} />
                                                <th>Répartition statuts</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.clients.map((client: InactiveClient, i: number) => (
                                                <tr
                                                    key={`${client.cedant_code}-${i}`}
                                                    style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
                                                >
                                                    {/* Cedante name */}
                                                    <td className="font-medium text-navy" style={{ maxWidth: 220 }}>
                                                        <span
                                                            className="block overflow-hidden text-ellipsis whitespace-nowrap"
                                                            title={client.int_cedante}
                                                        >
                                                            {client.int_cedante}
                                                        </span>
                                                    </td>
                                                    {/* Code — mono navy */}
                                                    <td>
                                                        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--color-navy-light)' }}>
                                                            {client.cedant_code}
                                                        </span>
                                                    </td>
                                                    <td className="text-gray-500 text-xs">{client.pays_cedante || '—'}</td>
                                                    <td className="text-right font-mono text-xs font-bold text-navy">{client.total_contracts}</td>
                                                    <td className="text-center font-mono text-sm font-semibold text-navy">{client.last_year_active}</td>
                                                    <td className="text-center"><AbsenceBadge years={client.years_absent} /></td>
                                                    <td><StatutsTooltip breakdown={client.statuts_breakdown} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ─── Pagination ─── */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between flex-wrap gap-2 animate-fade-in">
                                    <p className="text-xs text-gray-400 tabular-nums">
                                        Page <span className="font-semibold text-navy">{data.page}</span> / {totalPages}
                                        <span className="mx-1">·</span>
                                        {data.total} résultat{data.total > 1 ? 's' : ''}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => goToPage(data.page - 1)}
                                            disabled={data.page <= 1}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-250 disabled:opacity-35"
                                            style={{ border: '1px solid var(--color-gray-200)', color: 'var(--color-gray-600)' }}
                                            onMouseEnter={e => { if (data.page > 1) e.currentTarget.style.background = 'var(--color-navy-muted)' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = '' }}
                                        >
                                            <ChevronLeft size={13} /> Précédent
                                        </button>
                                        <button
                                            onClick={() => goToPage(data.page + 1)}
                                            disabled={data.page >= totalPages}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-250 disabled:opacity-35"
                                            style={{ border: '1px solid var(--color-gray-200)', color: 'var(--color-gray-600)' }}
                                            onMouseEnter={e => { if (data.page < totalPages) e.currentTarget.style.background = 'var(--color-navy-muted)' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = '' }}
                                        >
                                            Suivant <ChevronRight size={13} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    )
}
