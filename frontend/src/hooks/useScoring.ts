import { useState, useCallback } from 'react'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'
import { MarketScore, ScoringCriterion } from '../types/scoring.types'

export const useScoring = () => {
    const [markets, setMarkets] = useState<MarketScore[]>([])
    const [defaults, setDefaults] = useState<ScoringCriterion[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchDefaults = useCallback(async () => {
        const res = await api.get(API_ROUTES.SCORING.DEFAULTS)
        setDefaults(res.data.criteria)
        return res.data.criteria as ScoringCriterion[]
    }, [])

    const computeScoring = useCallback(async (
        criteria: ScoringCriterion[],
        filters: Record<string, any> = {}
    ) => {
        setLoading(true)
        setError(null)
        try {
            const res = await api.post(API_ROUTES.SCORING.COMPUTE, { criteria, filters })
            setMarkets(res.data.markets)
            return res.data.markets as MarketScore[]
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Erreur scoring')
            return []
        } finally {
            setLoading(false)
        }
    }, [])

    const updateDefaults = useCallback(async (criteria: ScoringCriterion[]) => {
        const res = await api.put(API_ROUTES.SCORING.DEFAULTS, { criteria })
        setDefaults(res.data.criteria)
    }, [])

    return { markets, defaults, loading, error, fetchDefaults, computeScoring, updateDefaults }
}
