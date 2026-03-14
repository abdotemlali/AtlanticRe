import { useState, useCallback } from 'react'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { KPISummary, KPIByCountry, KPIByBranch, KPIByYear } from '../types/contract.types'

interface KPIState {
    summary: KPISummary | null
    byCountry: KPIByCountry[]
    byBranch: KPIByBranch[]
    byYear: KPIByYear[]
    loading: boolean
    error: string | null
}

export const useKPIs = () => {
    const [state, setState] = useState<KPIState>({
        summary: null,
        byCountry: [],
        byBranch: [],
        byYear: [],
        loading: false,
        error: null,
    })

    const buildFilterQS = (filters: Record<string, any> = {}) => {
        const params = new URLSearchParams()
        Object.entries(filters).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                params.append(k, String(v))
            }
        })
        return params.toString()
    }

    const fetchAll = useCallback(async (filters: Record<string, any> = {}) => {
        setState(s => ({ ...s, loading: true, error: null }))
        const qs = buildFilterQS(filters)
        const suffix = qs ? `?${qs}` : ''
        try {
            const [summaryRes, countryRes, branchRes, yearRes] = await Promise.all([
                api.get(`${API_ROUTES.KPIS.SUMMARY}${suffix}`),
                api.get(`${API_ROUTES.KPIS.BY_COUNTRY}${suffix}`),
                api.get(`${API_ROUTES.KPIS.BY_BRANCH}${suffix}`),
                api.get(`${API_ROUTES.KPIS.BY_YEAR}${suffix}`),
            ])
            setState({
                summary: summaryRes.data,
                byCountry: countryRes.data,
                byBranch: branchRes.data,
                byYear: yearRes.data,
                loading: false,
                error: null,
            })
        } catch (e: any) {
            setState(s => ({ ...s, loading: false, error: e.response?.data?.detail || 'Erreur KPIs' }))
        }
    }, [])

    return { ...state, fetchAll }
}
