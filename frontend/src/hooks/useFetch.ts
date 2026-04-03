import { useState, useEffect } from 'react'
import api from '../utils/api'

export interface FetchResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useFetch<T>(url: string | null, params?: Record<string, any>): FetchResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Si l'URL est nulle, on ne fetch pas
    if (!url) return

    const controller = new AbortController()

    setLoading(true)
    setError(null)

    api.get<T>(url, { params, signal: controller.signal })
      .then(res => {
        setData(res.data)
        setLoading(false)
      })
      .catch(err => {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          // Ignorer silencieusement les AbortError (Axios utilise CanceledError)
          return
        }
        setError(err)
        setLoading(false)
        console.error('Fetch error:', err)
      })

    return () => {
      controller.abort() // Annulation de la requête précédente
    }
  }, [url, JSON.stringify(params)]) // On sérialise params pour éviter les boucles infinies de re-rendus

  return { data, loading, error }
}
