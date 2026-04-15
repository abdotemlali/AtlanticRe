import { useMemo, useState } from 'react'
import { REGION_COLORS, ALL_REGIONS } from '../../utils/cartographieConstants'

export interface TableColumn<T> {
  key: keyof T & string
  label: string
  format?: (v: any) => string
  badge?: (v: any) => { color: string; bg: string } | null
  numeric?: boolean
}

interface Props<T extends { pays: string; region: string }> {
  rows: T[]
  columns: TableColumn<T>[]
  initialSort?: keyof T & string
  showRank?: boolean
}

export default function CountryTable<T extends { pays: string; region: string }>({
  rows, columns, initialSort, showRank = false,
}: Props<T>) {
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<string>(initialSort ?? 'pays')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const pageSize = 20

  const filtered = useMemo(() => {
    let r = rows
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(x => x.pays.toLowerCase().includes(q))
    }
    if (regionFilter !== 'all') {
      r = r.filter(x => x.region === regionFilter)
    }
    r = [...r].sort((a, b) => {
      const av = (a as any)[sortKey]
      const bv = (b as any)[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
    return r
  }, [rows, search, regionFilter, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize)

  const toggleSort = (k: string) => {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  return (
    <div className="bg-white rounded-xl p-5"
      style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <input
          aria-label="Rechercher pays"
          placeholder="Rechercher un pays…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 min-w-[200px]"
        />
        <select
          aria-label="Région"
          value={regionFilter}
          onChange={e => { setRegionFilter(e.target.value); setPage(0) }}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 font-semibold"
        >
          <option value="all">Toutes les régions</option>
          <option value="Afrique du Sud">Afrique du Sud</option>
          {ALL_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} pays</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-200">
              {showRank && (
                <th className="py-2 px-2 font-bold text-gray-600 text-center w-10">#</th>
              )}
              {columns.map(c => (
                <th
                  key={c.key}
                  className={`py-2 px-2 font-bold text-gray-600 cursor-pointer select-none ${c.numeric ? 'text-right' : 'text-left'}`}
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label}
                  {sortKey === c.key && <span className="ml-1 text-gray-400">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                {showRank && (
                  <td className="py-2 px-2 text-center tabular-nums text-gray-400 font-semibold text-[11px]">
                    {page * pageSize + i + 1}
                  </td>
                )}
                {columns.map(c => {
                  const val = (r as any)[c.key]
                  const isRegion = c.key === 'region'
                  const content = c.format ? c.format(val) : (val ?? '—')
                  const badge = c.badge?.(val)
                  return (
                    <td key={c.key} className={`py-2 px-2 ${c.numeric ? 'text-right tabular-nums' : ''}`}>
                      {isRegion ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            background: `${REGION_COLORS[val] ?? REGION_COLORS.Autre}18`,
                            color: REGION_COLORS[val] ?? REGION_COLORS.Autre,
                          }}
                        >
                          {val}
                        </span>
                      ) : badge ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {content}
                        </span>
                      ) : content}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-500">Page {page + 1} / {pageCount}</span>
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40"
            >Précédent</button>
            <button
              disabled={page >= pageCount - 1}
              onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
              className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40"
            >Suivant</button>
          </div>
        </div>
      )}
    </div>
  )
}
