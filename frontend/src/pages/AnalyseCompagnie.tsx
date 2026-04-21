/**
 * AnalyseCompagnie — Axe 2 / Vue globale des compagnies d'assurance & réassurance africaines.
 * Route : /modelisation/analyse-compagnie
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  Cell,
} from 'recharts'
import CartographieLayout from '../components/cartographie/CartographieLayout'

// ── Constantes ─────────────────────────────────────────────────────────────────
const OLIVE = 'hsl(83,52%,36%)'
const NAVY  = 'hsl(213,60%,27%)'
const TYPE_COLORS: Record<string, string> = {
  Insurance:   OLIVE,
  Reinsurance: NAVY,
}

// ── Formatters ─────────────────────────────────────────────────────────────────
function fmtUSD(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} Md USD`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)} Md USD`
  return `${v.toFixed(0)} mn USD`
}

// ── API types ──────────────────────────────────────────────────────────────────
interface GlobalData {
  top_companies: {
    company: string
    pays: string
    total_primes: number
    avg_croissance: number | null
    lob: string
    type: string
  }[]
}

interface CompanyListItem {
  company: string
  pays: string[]
  type: string
}

// ── TypeFilter ─────────────────────────────────────────────────────────────────
function TypeFilter({
  showAssurance,
  showReassurance,
  onChange,
}: {
  showAssurance: boolean
  showReassurance: boolean
  onChange: (a: boolean, r: boolean) => void
}) {
  const pillBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 14px', borderRadius: 999,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: '1.5px solid', transition: 'all 0.2s',
    userSelect: 'none',
  }
  const activePill  = (color: string): React.CSSProperties => ({
    ...pillBase, background: `${color}18`, borderColor: `${color}55`, color,
  })
  const inactivePill = (): React.CSSProperties => ({
    ...pillBase, background: 'hsl(0,0%,94%)', borderColor: 'hsl(0,0%,86%)', color: '#9ca3af',
  })

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type :</span>
      <label style={showAssurance ? activePill(OLIVE) : inactivePill()} onClick={() => onChange(!showAssurance, showReassurance)}>
        <span style={{
          width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${showAssurance ? OLIVE : '#d1d5db'}`,
          background: showAssurance ? OLIVE : 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {showAssurance && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
        </span>
        Assurance
      </label>
      <label style={showReassurance ? activePill(NAVY) : inactivePill()} onClick={() => onChange(showAssurance, !showReassurance)}>
        <span style={{
          width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${showReassurance ? NAVY : '#d1d5db'}`,
          background: showReassurance ? NAVY : 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {showReassurance && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
        </span>
        Réassurance
      </label>
    </div>
  )
}

// ── TypeBadge ──────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const isIns = type === 'Insurance'
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{
        background: isIns ? 'hsla(83,52%,42%,0.12)' : 'hsla(213,60%,27%,0.12)',
        color: isIns ? OLIVE : NAVY,
        border: `1px solid ${isIns ? 'hsla(83,52%,42%,0.30)' : 'hsla(213,60%,27%,0.30)'}`,
      }}>
      {isIns ? 'Insurance' : 'Reinsurance'}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AnalyseCompagnie() {
  const navigate = useNavigate()

  const [showAssurance, setShowAssurance]     = useState(true)
  const [showReassurance, setShowReassurance] = useState(true)

  const [globalData, setGlobalData] = useState<GlobalData | null>(null)
  const [allCompanies, setAllCompanies] = useState<CompanyListItem[]>([])
  const [loading, setLoading]       = useState(true)

  // ── Type param ───────────────────────────────────────────────────────────
  const typeParam = useMemo((): string | undefined => {
    if (showAssurance && !showReassurance) return 'assurance'
    if (!showAssurance && showReassurance) return 'reassurance'
    return undefined
  }, [showAssurance, showReassurance])

  // ── Load global data (top companies) ────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    const url = '/api/companies/global' + (typeParam ? `?type=${typeParam}` : '')
    fetch(url)
      .then(r => r.json())
      .then(d => { setGlobalData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [typeParam])

  // ── Load company list ────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/companies/list')
      .then(r => r.json())
      .then(d => setAllCompanies(d))
      .catch(() => {})
  }, [])

  // ── Filtered list data ───────────────────────────────────────────────────
  const listData = useMemo(() => {
    return allCompanies.filter(c => {
      if (c.type === 'Insurance' && !showAssurance) return false
      if (c.type === 'Reinsurance' && !showReassurance) return false
      return true
    })
  }, [allCompanies, showAssurance, showReassurance])

  const totalAssurance = useMemo(() => allCompanies.filter(c => c.type === 'Insurance').length, [allCompanies])
  const totalReassurance = useMemo(() => allCompanies.filter(c => c.type === 'Reinsurance').length, [allCompanies])

  // ── react-select options ─────────────────────────────────────────────────
  const companyOptions = useMemo(() =>
    listData.map(c => ({
      value: c.company,
      label: c.company,
      pays: c.pays.join(', '),
      type: c.type,
    })),
  [listData])

  const totalCompanies = listData.length

  if (loading && !globalData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div style={{
          width: 36, height: 36, border: `3px solid ${OLIVE}`,
          borderTopColor: 'transparent', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <CartographieLayout
      title="Analyse Compagnie"
      subtitle={
        <div className="flex flex-col gap-1.5">
          <span>Vue consolidée des compagnies d'assurance et de réassurance sur les marchés africains</span>
          {allCompanies.length > 0 && (
            <span className="text-xs font-medium text-gray-400 bg-gray-50/50 w-fit px-2 py-0.5 rounded border border-gray-100">
              {totalAssurance} compagnies d'assurance • {totalReassurance} de réassurance
            </span>
          )}
        </div>
      }
      dataSource="Companies CSV · Assurance & Réassurance"
      navItems={[]}
    >
      {/* ── Filtre Type ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl px-6 py-4"
        style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <TypeFilter
          showAssurance={showAssurance}
          showReassurance={showReassurance}
          onChange={(a, r) => { setShowAssurance(a); setShowReassurance(r) }}
        />
      </div>

      {/* ── Accéder à la fiche compagnie ───────────────────────────────────────── */}
      <section>
        <div className="bg-white rounded-xl p-6"
          style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: 'hsla(83,52%,42%,0.10)' }}>🔍</div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Accéder à la fiche compagnie</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Sélectionnez une compagnie pour voir son analyse détaillée parmi les {totalCompanies} entreprises
              </p>
            </div>
          </div>
          <div className="max-w-lg">
            <Select
              options={companyOptions}
              value={null}
              onChange={v => v && navigate(`/modelisation/analyse-compagnie/${encodeURIComponent(v.value)}`)}
              placeholder={`Rechercher une compagnie parmi les ${totalCompanies} entreprises…`}
              isClearable={false}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              formatOptionLabel={(opt: any) => (
                <div className="flex items-center justify-between gap-2 py-0.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{opt.label}</p>
                    <p className="text-[10px] text-gray-400">{opt.pays}</p>
                  </div>
                  <TypeBadge type={opt.type} />
                </div>
              )}
              styles={{
                control: (b: any) => ({
                  ...b, borderRadius: 10, minHeight: 44,
                  borderColor: 'hsl(0,0%,88%)', boxShadow: 'none',
                  '&:hover': { borderColor: 'hsl(83,52%,42%)' },
                }),
                option: (b: any, s: any) => ({
                  ...b,
                  background: s.isFocused ? 'hsla(83,52%,42%,0.08)' : 'white',
                  color: '#374151', fontSize: 13, padding: '6px 12px',
                }),
                placeholder: (b: any) => ({ ...b, color: '#9ca3af', fontSize: 13 }),
                menu: (b: any) => ({ ...b, borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }),
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Top 15 compagnies ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-5"
        style={{ border: '1px solid hsl(0,0%,92%)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h3 className="text-xs font-bold text-gray-700 mb-4">Top 15 compagnies par primes totales (mn USD)</h3>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart
            data={globalData?.top_companies ?? []}
            layout="vertical"
            margin={{ top: 0, right: 80, left: 140, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,94%)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => fmtUSD(v)} />
            <YAxis
              type="category" dataKey="company"
              tick={{ fontSize: 10 }} width={135}
              tickFormatter={v => v.length > 20 ? v.slice(0, 20) + '…' : v}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="bg-white rounded-lg px-3 py-2 text-xs shadow-lg"
                    style={{ border: '1px solid hsl(0,0%,88%)' }}>
                    <p className="font-bold text-gray-800 mb-1">{d.company}</p>
                    <p className="text-gray-500 mb-1">{d.pays} · <TypeBadge type={d.type} /></p>
                    <p style={{ color: OLIVE }}>Primes : <strong>{fmtUSD(d.total_primes)}</strong></p>
                    {d.avg_croissance != null && (
                      <p style={{ color: d.avg_croissance >= 0 ? '#1E8449' : '#922B21' }}>
                        Croissance : <strong>{d.avg_croissance >= 0 ? '+' : ''}{d.avg_croissance.toFixed(1)}%</strong>
                      </p>
                    )}
                  </div>
                )
              }}
            />
            <Bar
              dataKey="total_primes"
              name="Primes"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(d) => navigate(`/modelisation/analyse-compagnie/${encodeURIComponent(d.company)}`)}>
              {(globalData?.top_companies ?? []).map((entry, i) => (
                <Cell key={i} fill={TYPE_COLORS[entry.type] ?? OLIVE} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CartographieLayout>
  )
}
