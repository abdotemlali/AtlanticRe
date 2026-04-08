// 🎨 STYLE UPDATED — DataTable : lignes animées (stagger), pagination pill moderne, sorts stylisés, StatusBadge
import { useEffect, useState, useCallback } from "react"
import { useData, filtersToParams } from '../context/DataContext'
import api from '../utils/api'
import { formatDate, formatCompact, formatPercent, truncate } from '../utils/formatters'
import { ArrowUp, ArrowDown, ArrowUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import ExportButton from './ExportButton'
import { StatusBadge } from './ui/Badge'
import { TableSkeleton } from './ui/Skeleton'
import PipelineView from './PipelineView'

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

export default function DataTable() {
  const { filters } = useData()
  const [data, setData] = useState<Contract[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDesc, setSortDesc] = useState(true)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = {
        ...filtersToParams(filters),
        page, page_size: pageSize,
        ...(search ? { search } : {}),
        ...(sortBy ? { sort_by: sortBy, sort_desc: sortDesc } : {}),
      }
      const r = await api.get('/contracts', { params })
      setData(r.data.data)
      setTotal(r.data.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters, page, pageSize, search, sortBy, sortDesc])

  useEffect(() => { setPage(1) }, [filters, search])
  useEffect(() => { load() }, [load])

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDesc(!sortDesc)
    else { setSortBy(col); setSortDesc(true) }
  }

  const totalPages = Math.ceil(total / pageSize)

  /* Sort icon */
  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <ArrowUpDown size={10} className="opacity-30 ml-1 flex-shrink-0" />
    return sortDesc
      ? <ArrowDown size={10} className="ml-1 flex-shrink-0" style={{ color: 'hsl(83,50%,55%)' }} />
      : <ArrowUp size={10} className="ml-1 flex-shrink-0" style={{ color: 'hsl(83,50%,55%)' }} />
  }

  const ColHeader = ({ col, label, align = 'left' }: { col: string; label: string; align?: 'left' | 'right' | 'center' }) => (
    <th
      onClick={() => handleSort(col)}
      style={{ textAlign: align, cursor: 'pointer' }}
    >
      <span className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        {label}
        <SortIcon col={col} />
      </span>
    </th>
  )

  /* ULR color */
  const ulrColor = (v: number | null) => {
    if (!v) return 'var(--color-gray-400)'
    if (v > 100) return 'var(--color-red)'
    if (v > 70) return 'var(--color-orange)'
    return 'var(--color-emerald)'
  }

  /* Page numbers to display */
  const pageNumbers = (() => {
    const delta = 2
    const start = Math.max(1, page - delta)
    const end = Math.min(totalPages, page + delta)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  })()

  return (
    <div className="flex flex-col gap-3">

      {/* ─── Toolbar ─── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View Toggle */}
        <div className="flex bg-[var(--color-gray-100)] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-[var(--color-navy)]' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            Table
          </button>
          <button
            onClick={() => setViewMode('pipeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'pipeline' ? 'bg-white shadow-sm text-[var(--color-navy)]' : 'text-[var(--color-gray-500)] hover:text-[var(--color-navy)]'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            Pipeline
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher dans les contrats…"
            className="input-dark pl-8 text-xs py-2"
          />
        </div>

        {/* Count badge */}
        <span
          className="text-xs font-semibold rounded-full px-3 py-1 tabular-nums"
          style={{ background: 'var(--color-navy-muted)', color: 'var(--color-navy)' }}
        >
          {total.toLocaleString('fr-FR')} contrat{total > 1 ? 's' : ''}
        </span>

        <div className="ml-auto">
          {viewMode !== 'pipeline' && <ExportButton />}
        </div>
      </div>

      {/* ─── Table container ─── */}
      <div
        className="overflow-auto rounded-xl"
        style={{
          border: '1px solid var(--color-gray-100)',
          boxShadow: 'var(--shadow-md)',
          maxHeight: 520,
          background: 'var(--color-white)',
        }}
      >
        {loading ? (
          <TableSkeleton rows={10} columns={13} />
        ) : viewMode === 'pipeline' ? (
          <PipelineView />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <ColHeader col="POLICY_SEQUENCE_NUMBER" label="N° Police" />
                <ColHeader col="INT_SPC" label="Spécialité" />
                <ColHeader col="INT_BRANCHE" label="Branche" />
                <ColHeader col="INT_CEDANTE" label="Cédante" />
                <ColHeader col="INT_BROKER" label="Courtier" />
                <ColHeader col="PAYS_RISQUE" label="Pays risque" />
                <ColHeader col="UNDERWRITING_YEAR" label="Année" align="center" />
                <ColHeader col="CONTRACT_STATUS" label="Statut" />
                <ColHeader col="WRITTEN_PREMIUM" label="Prime écrite" align="right" />
                <ColHeader col="ULR" label="LR %" align="right" />
                <ColHeader col="RESULTAT" label="Résultat" align="right" />
                <th>Effet</th>
                <th>Expiration</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-16 text-gray-400 text-sm">
                    Aucun contrat trouvé
                  </td>
                </tr>
              ) : data.map((c, i) => (
                <tr
                  key={c.policy_id || i}
                  style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}
                >
                  {/* Policy ID — mono navy */}
                  <td>
                    <span
                      className="font-mono text-xs font-semibold"
                      style={{ color: 'var(--color-navy-light)' }}
                    >
                      {c.policy_id}
                    </span>
                  </td>
                  <td title={c.int_spc || ''}>{truncate(c.int_spc || '', 22)}</td>
                  <td>{truncate(c.int_branche || '', 15)}</td>
                  <td title={c.int_cedante || ''}>{truncate(c.int_cedante || '', 18)}</td>
                  <td title={c.int_broker || ''}>{truncate(c.int_broker || '', 18)}</td>
                  <td>{c.pays_risque}</td>
                  <td className="text-center font-mono text-xs">{c.underwriting_year || '—'}</td>
                  <td>
                    {c.status && <StatusBadge status={c.status} size="xs" />}
                  </td>
                  <td className="text-right font-mono text-xs">{formatCompact(c.written_premium)}</td>
                  <td
                    className="text-right font-mono text-xs font-semibold"
                    style={{ color: ulrColor(c.ulr) }}
                  >
                    {formatPercent(c.ulr)}
                  </td>
                  <td
                    className="text-right font-mono text-xs font-semibold"
                    style={{ color: c.resultat !== null && c.resultat >= 0 ? 'var(--color-emerald)' : 'var(--color-red)' }}
                  >
                    {formatCompact(c.resultat)}
                  </td>
                  <td className="text-xs text-gray-400">{formatDate(c.inception_date)}</td>
                  <td className="text-xs text-gray-400">{formatDate(c.expiry_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Pagination ─── */}
      {!loading && totalPages > 1 && viewMode !== 'pipeline' && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-gray-400 tabular-nums">
            Page <span className="font-semibold text-navy">{page}</span> / {totalPages}
            <span className="mx-1">·</span>
            {total.toLocaleString('fr-FR')} enregistrements
          </p>

          <div className="flex items-center gap-1">
            {/* Prev */}
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-250 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ border: '1px solid var(--color-gray-200)' }}
              onMouseEnter={e => { if (page > 1) e.currentTarget.style.background = 'var(--color-navy-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '' }}
            >
              <ChevronLeft size={14} className="text-gray-600" />
            </button>

            {/* First page */}
            {pageNumbers[0] > 1 && (
              <>
                <button onClick={() => setPage(1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold text-gray-500 transition-all duration-250 hover:bg-navy-muted">1</button>
                {pageNumbers[0] > 2 && <span className="text-gray-300 text-xs font-bold px-1">…</span>}
              </>
            )}

            {/* Page numbers */}
            {pageNumbers.map(pg => (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all duration-250"
                style={pg === page ? {
                  background: 'linear-gradient(135deg, var(--color-navy-dark), var(--color-navy-light))',
                  color: 'white',
                  boxShadow: 'var(--shadow-navy-glow)',
                } : { color: 'var(--color-gray-600)' }}
                onMouseEnter={e => { if (pg !== page) e.currentTarget.style.background = 'var(--color-navy-muted)' }}
                onMouseLeave={e => { if (pg !== page) e.currentTarget.style.background = '' }}
              >
                {pg}
              </button>
            ))}

            {/* Last page */}
            {pageNumbers[pageNumbers.length - 1] < totalPages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                  <span className="text-gray-300 text-xs font-bold px-1">…</span>
                )}
                <button onClick={() => setPage(totalPages)} className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold text-gray-500 transition-all duration-250 hover:bg-navy-muted">{totalPages}</button>
              </>
            )}

            {/* Next */}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-250 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ border: '1px solid var(--color-gray-200)' }}
              onMouseEnter={e => { if (page < totalPages) e.currentTarget.style.background = 'var(--color-navy-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '' }}
            >
              <ChevronRight size={14} className="text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
