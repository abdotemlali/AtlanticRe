// 🎨 STYLE UPDATED — ExportButton : dropdown glass premium avec animation slide-down
import { useState, useRef, useEffect } from "react"
import { Download, FileSpreadsheet, FileText, File, ChevronDown, Loader2 } from 'lucide-react'
import api from '../utils/api'
import { useData, filtersToParams } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

interface ExportButtonProps {
  markets?: any[]
  topN?: number
  variant?: 'contracts' | 'recommendations'
}

type ExportFormat = 'csv' | 'excel' | 'pdf' | null

/**
 * ExportButton — Premium dropdown button pour export CSV / Excel / PDF.
 * Logique métier 100% inchangée.
 */
export default function ExportButton({ markets, topN, variant = 'contracts' }: ExportButtonProps) {
  const { filters } = useData()
  const { can } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<ExportFormat>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!can('export')) return null

  /* ─── Download helper ─── */
  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCsv = async () => {
    setLoading('csv'); setOpen(false)
    try {
      const res = await api.post('/export/csv', { filters: filtersToParams(filters) }, { responseType: 'blob' })
      download(res.data, 'export_reinsurance.csv')
      toast.success('Export CSV généré')
    } catch { toast.error('Erreur export CSV') }
    finally { setLoading(null) }
  }

  const exportExcel = async () => {
    setLoading('excel'); setOpen(false)
    try {
      const res = await api.post('/export/excel', { filters: filtersToParams(filters) }, { responseType: 'blob' })
      download(res.data, 'export_reinsurance.xlsx')
      toast.success('Export Excel généré')
    } catch { toast.error('Erreur export Excel') }
    finally { setLoading(null) }
  }

  const exportPdf = async () => {
    setLoading('pdf'); setOpen(false)
    try {
      const res = await api.post('/export/pdf', { markets: markets || [], top_n: topN || 10 }, { responseType: 'blob' })
      download(res.data, 'recommandations_reinsurance.pdf')
      toast.success('Rapport PDF généré')
    } catch { toast.error('Erreur export PDF') }
    finally { setLoading(null) }
  }

  const isLoading = !!loading

  return (
    <div ref={ref} className="relative">
      {/* ─── Trigger button ─── */}
      <button
        onClick={() => setOpen(o => !o)}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.8rem] font-semibold transition-all duration-250 ease-out-expo disabled:opacity-60 disabled:cursor-wait"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1.5px solid var(--color-gray-200)',
          color: 'var(--color-navy)',
          boxShadow: 'var(--shadow-sm)',
          willChange: 'transform',
        }}
        onMouseEnter={e => {
          if (!isLoading) {
            e.currentTarget.style.borderColor = 'var(--color-navy)'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = 'var(--shadow-md)'
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--color-gray-200)'
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        }}
      >
        {isLoading
          ? <Loader2 size={13} className="animate-spin flex-shrink-0" />
          : <Download size={13} className="flex-shrink-0" />}
        {isLoading ? `Export ${loading}…` : 'Exporter'}
        {!isLoading && (
          <ChevronDown
            size={12}
            className="flex-shrink-0 transition-transform duration-250"
            style={{ transform: open ? 'rotate(180deg)' : '' }}
          />
        )}
      </button>

      {/* ─── Dropdown panel ─── */}
      {open && (
        <>
          {/* Backdrop closer */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            className="absolute right-0 top-full mt-2 z-50 rounded-xl overflow-hidden animate-slide-down"
            style={{
              minWidth: 180,
              background: 'hsla(0,0%,100%,0.97)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--color-gray-200)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Header */}
            <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--color-gray-100)' }}>
              <p className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400">Format d'export</p>
            </div>

            {/* Options */}
            <div className="py-1">
              {/* CSV */}
              <button
                onClick={exportCsv}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-gray-700 font-medium transition-all duration-150 group"
                onMouseEnter={e => { e.currentTarget.style.background = 'hsl(152,56%,39%,0.07)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '' }}
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-250 group-hover:scale-110"
                  style={{ background: 'hsla(152,56%,39%,0.12)' }}
                >
                  <File size={14} style={{ color: 'hsl(152,56%,39%)' }} />
                </span>
                <span>Export CSV</span>
                <span className="ml-auto text-[0.68rem] text-gray-300 font-mono">.csv</span>
              </button>

              {/* Excel */}
              <button
                onClick={exportExcel}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-gray-700 font-medium transition-all duration-150 group"
                onMouseEnter={e => { e.currentTarget.style.background = 'hsla(209,28%,24%,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '' }}
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-250 group-hover:scale-110"
                  style={{ background: 'hsla(83,52%,36%,0.12)' }}
                >
                  <FileSpreadsheet size={14} style={{ color: 'hsl(83,52%,36%)' }} />
                </span>
                <span>Export Excel</span>
                <span className="ml-auto text-[0.68rem] text-gray-300 font-mono">.xlsx</span>
              </button>

              {/* PDF — only for recommendations */}
              {variant === 'recommendations' && (
                <button
                  onClick={exportPdf}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-gray-700 font-medium transition-all duration-150 group"
                  onMouseEnter={e => { e.currentTarget.style.background = 'hsla(358,66%,54%,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '' }}
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-250 group-hover:scale-110"
                    style={{ background: 'hsla(358,66%,54%,0.10)' }}
                  >
                    <FileText size={14} style={{ color: 'hsl(358,66%,54%)' }} />
                  </span>
                  <span>Rapport PDF</span>
                  <span className="ml-auto text-[0.68rem] text-gray-300 font-mono">.pdf</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
