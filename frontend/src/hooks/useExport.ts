import { useCallback } from 'react'
import api from '../utils/api'
import { API_ROUTES } from '../constants/api'

export const useExport = () => {
    const exportCsv = useCallback(async (filters: Record<string, any> = {}) => {
        const res = await api.post(API_ROUTES.EXPORT.CSV, { filters }, { responseType: 'blob' })
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url
        a.download = `reinsurance_export_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }, [])

    const exportExcel = useCallback(async (filters: Record<string, any> = {}) => {
        const res = await api.post(API_ROUTES.EXPORT.EXCEL, { filters }, { responseType: 'blob' })
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url
        a.download = `reinsurance_export_${new Date().toISOString().slice(0, 10)}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
    }, [])

    const exportPdf = useCallback(async (markets: any[], topN: number = 10) => {
        const res = await api.post(API_ROUTES.EXPORT.PDF, { markets, top_n: topN }, { responseType: 'blob' })
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url
        a.download = `recommandations_${new Date().toISOString().slice(0, 10)}.pdf`
        a.click()
        URL.revokeObjectURL(url)
    }, [])

    return { exportCsv, exportExcel, exportPdf }
}
