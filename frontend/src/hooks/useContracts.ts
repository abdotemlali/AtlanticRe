import { useState, useCallback } from 'react'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { Contract, PaginatedContracts } from '../types/contract.types'

interface ContractState {
    data: Contract[]
    total: number
    page: number
    loading: boolean
    error: string | null
}

export const useContracts = () => {
    const [state, setState] = useState<ContractState>({
        data: [], total: 0, page: 1, loading: false, error: null
    })

    const fetchContracts = useCallback(async (params: {
        page?: number
        page_size?: number
        search?: string
        sort_by?: string
        sort_desc?: boolean
        filters?: Record<string, any>
    } = {}) => {
        setState(s => ({ ...s, loading: true, error: null }))
        try {
            const query = new URLSearchParams()
            if (params.page) query.set('page', String(params.page))
            if (params.page_size) query.set('page_size', String(params.page_size))
            if (params.search) query.set('search', params.search)
            if (params.sort_by) query.set('sort_by', params.sort_by)
            if (params.sort_desc !== undefined) query.set('sort_desc', String(params.sort_desc))
            if (params.filters) {
                Object.entries(params.filters).forEach(([k, v]) => {
                    if (v !== undefined && v !== null && v !== '') query.set(k, String(v))
                })
            }
            const res = await api.get<PaginatedContracts>(`${API_ROUTES.CONTRACTS}?${query.toString()}`)
            setState({ data: res.data.data, total: res.data.total, page: res.data.page, loading: false, error: null })
        } catch (e: any) {
            setState(s => ({ ...s, loading: false, error: e.response?.data?.detail || 'Erreur contrats' }))
        }
    }, [])

    return { ...state, fetchContracts }
}
