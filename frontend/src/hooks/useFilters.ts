import { useState, useCallback } from 'react'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { FilterOptions } from '../types/contract.types'

export const useFilters = () => {
    const [options, setOptions] = useState<FilterOptions | null>(null)
    const [loading, setLoading] = useState(false)

    const fetchOptions = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.get(API_ROUTES.DATA.FILTER_OPTIONS)
            setOptions(res.data)
        } finally {
            setLoading(false)
        }
    }, [])

    return { options, loading, fetchOptions }
}
