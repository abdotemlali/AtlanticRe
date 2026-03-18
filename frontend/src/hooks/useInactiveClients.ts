import { useState, useCallback } from 'react'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { InactiveClient, InactiveClientsParams, InactiveClientsResponse } from '../types/admin.types'

export const useInactiveClients = () => {
    const [data, setData] = useState<InactiveClientsResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // ── State ─────────────────────────────────────────────────────────────────
    const [params, setParams] = useState<InactiveClientsParams>({
        years_threshold: 2,
        min_contracts: 3,
        page: 1,
        page_size: 5000,
        sort_by: 'last_year',
        sort_order: 'desc',
    })

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const analyze = useCallback(async (overrides?: Partial<InactiveClientsParams>) => {
        const p = { ...params, ...overrides }
        setParams(p)
        setLoading(true)
        setError(null)
        try {
            const res = await api.get(API_ROUTES.CLIENTS.INACTIVE, { params: p })
            setData(res.data)
        } catch (e: any) {
            const detail = e?.response?.data?.detail
            if (typeof detail === 'string') {
                setError(detail)
            } else if (Array.isArray(detail)) {
                setError(detail.map((d: any) => d.msg || 'Erreur').join(', '))
            } else {
                setError('Erreur lors de l\'analyse')
            }
        } finally {
            setLoading(false)
        }
    }, [params])

    // ── Sort ──────────────────────────────────────────────────────────────────
    const sortBy = useCallback((col: string) => {
        const newOrder = params.sort_by === col && params.sort_order === 'desc' ? 'asc' : 'desc'
        analyze({ sort_by: col, sort_order: newOrder, page: 1 })
    }, [params, analyze])

    // ── Pagination ────────────────────────────────────────────────────────────
    const goToPage = useCallback((page: number) => {
        analyze({ page })
    }, [analyze])

    // ── Export ────────────────────────────────────────────────────────────────
    const exportExcel = useCallback(async () => {
        setExporting(true)
        try {
            const res = await api.get(API_ROUTES.CLIENTS.INACTIVE_EXPORT, {
                params: {
                    years_threshold: params.years_threshold,
                    min_contracts: params.min_contracts,
                    sort_by: params.sort_by,
                    sort_order: params.sort_order,
                },
                responseType: 'blob',
            })
            const url = URL.createObjectURL(new Blob([res.data]))
            const a = document.createElement('a')
            a.href = url
            a.download = 'clients_inactifs.xlsx'
            a.click()
            URL.revokeObjectURL(url)
        } catch (e) {
            console.error(e)
        } finally {
            setExporting(false)
        }
    }, [params])

    return {
        data, loading, exporting, error, params,
        setParams, analyze, sortBy, goToPage, exportExcel,
    }
}
