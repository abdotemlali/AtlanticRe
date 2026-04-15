import { useEffect, useMemo, useState } from 'react'
import type { AnyRow, DatasetType, NonVieRow, VieRow, MacroRow, GouvRow } from '../types/cartographie'
import { resolveRegion, normalizePaysName } from '../utils/cartographieConstants'

type RowOf<T extends DatasetType> =
  T extends 'non-vie' ? NonVieRow :
  T extends 'vie' ? VieRow :
  T extends 'macroeconomie' ? MacroRow :
  T extends 'gouvernance' ? GouvRow : never

const ENDPOINTS: Record<DatasetType, string> = {
  'non-vie': '/api/public/cartographie/non-vie',
  vie: '/api/public/cartographie/vie',
  macroeconomie: '/api/public/cartographie/macroeconomie',
  gouvernance: '/api/public/cartographie/gouvernance',
}

export function useCartographieData<T extends DatasetType>(type: T) {
  const [raw, setRaw] = useState<RowOf<T>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(ENDPOINTS[type])
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((rows: RowOf<T>[]) => {
        if (cancelled) return
        // Normalise le nom du pays (UPPERCASE EN → FR canonique) puis la région
        const normalized = rows.map(r => {
          const pays = normalizePaysName(r.pays)
          return {
            ...r,
            pays,
            region: resolveRegion(pays, r.region),
          }
        }) as RowOf<T>[]
        setRaw(normalized)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Erreur de chargement')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [type])

  const years = useMemo(() => {
    const s = new Set<number>()
    raw.forEach(r => s.add(r.annee))
    return Array.from(s).sort((a, b) => a - b)
  }, [raw])

  const countries = useMemo(() => {
    const s = new Set<string>()
    raw.forEach(r => s.add(r.pays))
    return Array.from(s).sort()
  }, [raw])

  return { data: raw, years, countries, loading, error }
}

/** Moyenne d'un champ numérique sur toutes les années disponibles pour un pays. */
export function averageByCountry<T extends AnyRow>(
  rows: T[],
  field: keyof T
): Map<string, number> {
  const acc = new Map<string, { sum: number; n: number }>()
  for (const r of rows) {
    const v = r[field] as unknown as number | null | undefined
    if (v == null || !Number.isFinite(v)) continue
    const cur = acc.get(r.pays) ?? { sum: 0, n: 0 }
    cur.sum += v
    cur.n += 1
    acc.set(r.pays, cur)
  }
  const out = new Map<string, number>()
  acc.forEach((v, k) => out.set(k, v.sum / v.n))
  return out
}

/** Filtre rows pour une année donnée (ou retourne rows moyennés si annee === null). */
export function filterByYear<T extends AnyRow>(rows: T[], annee: number | null): T[] {
  if (annee === null) {
    // Moyenne par pays sur toutes les années disponibles
    const byCountry = new Map<string, T[]>()
    rows.forEach(r => {
      const arr = byCountry.get(r.pays) ?? []
      arr.push(r)
      byCountry.set(r.pays, arr)
    })
    const out: T[] = []
    byCountry.forEach((arr, pays) => {
      if (arr.length === 0) return
      const first = arr[0]
      const numericKeys = Object.keys(first).filter(
        k => typeof (first as any)[k] === 'number' && k !== 'annee'
      )
      const merged: any = { ...first, annee: 0 }
      numericKeys.forEach(k => {
        const vals = arr.map(r => (r as any)[k]).filter(v => v != null && Number.isFinite(v))
        merged[k] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      })
      out.push(merged as T)
      void pays
    })
    return out
  }
  return rows.filter(r => r.annee === annee)
}
