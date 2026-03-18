// 🎨 STYLE UPDATED — PivotTable : harmonisé avec DataTable (glass, badges, couleurs HSL, sort icons, export btn premium)
import { useState } from "react"
import Select from 'react-select'
import { useData, filtersToParams } from '../../context/DataContext'
import api from '../../utils/api'
import { API_ROUTES } from '../../constants/api'
import { formatCompact } from '../../utils/formatters'
import { ArrowUp, ArrowDown, ArrowUpDown, Download, Loader2, CalculatorIcon } from 'lucide-react'
import { TableSkeleton } from '../ui/Skeleton'

const AXIS_OPTIONS = [
  { value: 'INT_BRANCHE', label: 'Branche' },
  { value: 'PAYS_RISQUE', label: 'Pays risque' },
  { value: 'INT_BROKER', label: 'Courtier' },
  { value: 'UNDERWRITING_YEAR', label: 'Année' },
  { value: 'CONTRACT_STATUS', label: 'Statut' },
]
const VALUE_OPTIONS = [
  { value: 'WRITTEN_PREMIUM', label: 'Prime écrite' },
  { value: 'RESULTAT', label: 'Résultat' },
  { value: 'ULR', label: 'Loss Ratio' },
]

export default function PivotTable() {
  const { filters } = useData()
  const [rowAxis, setRowAxis] = useState('INT_BRANCHE')
  const [colAxis, setColAxis] = useState('UNDERWRITING_YEAR')
  const [valueKey, setValueKey] = useState('WRITTEN_PREMIUM')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(false)

  const compute = async () => {
    setLoading(true)
    try {
      const res = await api.post('/kpis/pivot', {
        filters: filtersToParams(filters),
        row_axis: rowAxis,
        col_axis: colAxis,
        value: valueKey,
      })
      setData(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSortCol = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(false) }
  }

  const sortedRows = data?.data ? [...data.data].sort((a: any, b: any) => {
    if (!sortCol) return 0
    const av = a[sortCol] ?? 0
    const bv = b[sortCol] ?? 0
    return sortAsc ? av - bv : bv - av
  }) : []

  const handleExport = async () => {
    if (!data?.data?.length) return
    setExporting(true)
    try {
      const rowLabel = AXIS_OPTIONS.find(o => o.value === rowAxis)?.label ?? rowAxis
      const valueLabel = VALUE_OPTIONS.find(o => o.value === valueKey)?.label ?? valueKey
      const res = await api.post(
        API_ROUTES.EXPORT.PIVOT,
        { data: sortedRows, columns: data.columns, row_label: rowLabel, value_label: valueLabel },
        { responseType: 'blob' }
      )
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `pivot_${rowAxis}_${valueKey}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setExporting(false)
    }
  }

  // Sort icon
  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ArrowUpDown size={10} className="opacity-30 ml-1 flex-shrink-0" />
    return sortAsc
      ? <ArrowUp size={10} className="ml-1 flex-shrink-0" style={{ color: 'hsl(83,50%,55%)' }} />
      : <ArrowDown size={10} className="ml-1 flex-shrink-0" style={{ color: 'hsl(83,50%,55%)' }} />
  }

  return (
    <div>
      {/* ─── Config toolbar ─── */}
      <div className="flex gap-3 mb-4 flex-wrap items-end">
        <div className="flex-1 min-w-[130px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Lignes (Y)</p>
          <Select
            classNamePrefix="rs"
            options={AXIS_OPTIONS}
            value={AXIS_OPTIONS.find(o => o.value === rowAxis)}
            onChange={v => v && setRowAxis(v.value)}
          />
        </div>
        <div className="flex-1 min-w-[130px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Colonnes (X)</p>
          <Select
            classNamePrefix="rs"
            options={AXIS_OPTIONS.filter(o => o.value !== rowAxis)}
            value={AXIS_OPTIONS.find(o => o.value === colAxis)}
            onChange={v => v && setColAxis(v.value)}
          />
        </div>
        <div className="flex-1 min-w-[130px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Valeur</p>
          <Select
            classNamePrefix="rs"
            options={VALUE_OPTIONS}
            value={VALUE_OPTIONS.find(o => o.value === valueKey)}
            onChange={v => v && setValueKey(v.value)}
          />
        </div>

        {/* Compute button */}
        <button
          onClick={compute}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-250 ease-out-expo disabled:opacity-60 disabled:cursor-wait"
          style={{
            background: 'linear-gradient(135deg, hsl(209,32%,17%) 0%, hsl(209,28%,24%) 60%, hsl(209,24%,32%) 100%)',
            boxShadow: '0 2px 12px hsla(209,28%,24%,0.30)',
            border: 'none',
            willChange: 'transform',
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px hsla(209,28%,24%,0.40)' } }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px hsla(209,28%,24%,0.30)' }}
        >
          {loading
            ? <Loader2 size={13} className="animate-spin flex-shrink-0" />
            : <CalculatorIcon size={13} className="flex-shrink-0" />}
          {loading ? 'Calcul…' : 'Calculer'}
        </button>

        {/* Export button — shown when data is ready */}
        {data?.data?.length > 0 && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-250 ease-out-expo disabled:opacity-60 disabled:cursor-wait"
            style={{
              background: 'linear-gradient(135deg, hsl(83,54%,27%) 0%, hsl(83,52%,36%) 60%, hsl(83,50%,45%) 100%)',
              boxShadow: '0 2px 12px hsla(83,52%,36%,0.30)',
              border: 'none',
              willChange: 'transform',
            }}
            onMouseEnter={e => { if (!exporting) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px hsla(83,52%,36%,0.40)' } }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px hsla(83,52%,36%,0.30)' }}
          >
            {exporting
              ? <Loader2 size={13} className="animate-spin flex-shrink-0" />
              : <Download size={13} className="flex-shrink-0" />}
            {exporting ? 'Export…' : 'Excel'}
          </button>
        )}
      </div>

      {/* ─── Empty state ─── */}
      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: 'hsla(209,28%,24%,0.08)' }}
          >
            <CalculatorIcon size={24} style={{ color: 'hsl(209,24%,40%)' }} />
          </div>
          <p className="text-sm font-medium">Configurez les axes et cliquez sur <strong>Calculer</strong></p>
        </div>
      )}

      {/* ─── Loading skeleton ─── */}
      {loading && (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-gray-100)' }}>
          <TableSkeleton rows={8} columns={(data?.columns?.length ?? 5) + 2} />
        </div>
      )}

      {/* ─── Data table ─── */}
      {data && !loading && (
        <div
          className="overflow-auto rounded-xl"
          style={{
            maxHeight: 420,
            border: '1px solid var(--color-gray-100)',
            boxShadow: 'var(--shadow-md)',
            background: 'var(--color-white)',
          }}
        >
          <table className="data-table">
            <thead>
              <tr>
                {/* Row label column */}
                <th style={{ textAlign: 'left', minWidth: 140 }}>
                  {AXIS_OPTIONS.find(o => o.value === rowAxis)?.label}
                </th>
                {/* Dynamic columns */}
                {data.columns.map((col: string) => (
                  <th
                    key={col}
                    onClick={() => handleSortCol(col)}
                    style={{ textAlign: 'right', cursor: 'pointer' }}
                  >
                    <span className="flex items-center gap-1 justify-end">
                      {col}
                      <SortIcon col={col} />
                    </span>
                  </th>
                ))}
                {/* Total */}
                <th style={{ textAlign: 'right', minWidth: 90 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row: any, i: number) => {
                const rowTotal = data.columns.reduce((s: number, c: string) => s + (row[c] || 0), 0)
                return (
                  <tr key={i} style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}>
                    {/* Row label */}
                    <td className="font-medium text-gray-600">{row.label}</td>
                    {/* Cell values */}
                    {data.columns.map((col: string) => (
                      <td
                        key={col}
                        className="text-right font-mono text-xs"
                        style={{ color: row[col] ? 'var(--color-gray-700)' : 'var(--color-gray-300)' }}
                      >
                        {row[col] ? formatCompact(row[col]) : '—'}
                      </td>
                    ))}
                    {/* Total cell */}
                    <td
                      className="text-right font-mono text-xs font-bold"
                      style={{ color: 'var(--color-navy)' }}
                    >
                      {formatCompact(rowTotal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
