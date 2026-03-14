import React, { useEffect, useState, useMemo } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { useData, filtersToParams } from '../../context/DataContext'
import api from '../../utils/api'
import { formatCompact, formatPercent } from '../../utils/formatters'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

interface CountryData {
  pays: string
  total_written_premium: number
  total_resultat: number
  avg_ulr: number
  contract_count: number
}

interface TooltipState {
  x: number; y: number; data: CountryData
}

// Map French country names to standard English names using a simple lookup
const COUNTRY_NAME_MAP: Record<string, string> = {
  'MAROC': 'Morocco', 'FRANCE': 'France', 'SENEGAL': 'Senegal',
  'COTE D\'IVOIRE': 'Ivory Coast', 'CAMEROUN': 'Cameroon', 'ALGERIE': 'Algeria',
  'TUNISIE': 'Tunisia', 'EGYPTE': 'Egypt', "NIGER": "Niger", 'MALI': 'Mali',
  'BURKINA FASO': 'Burkina Faso', 'CONGO': 'Congo', 'GABON': 'Gabon',
  'GUINEE': 'Guinea', 'TOGO': 'Togo', 'BENIN': 'Benin', 'GHANA': 'Ghana',
  'NIGERIA': 'Nigeria', 'KENYA': 'Kenya', 'TANZANIE': 'Tanzania',
  'MOZAMBIQUE': 'Mozambique', 'ANGOLA': 'Angola', 'ZAMBIE': 'Zambia',
  'ZIMBABWE': 'Zimbabwe', 'LIBYE': 'Libya', 'MAURITANIE': 'Mauritania',
  'DUBAI': 'United Arab Emirates', 'EMIRATS ARABES': 'United Arab Emirates',
  'ARABIE SAOUDITE': 'Saudi Arabia', 'BAHREIN': 'Bahrain', 'OMAN': 'Oman',
  'JORDANIE': 'Jordan', 'LIBAN': 'Lebanon', 'IRAK': 'Iraq',
}

export default function WorldMap() {
  const { filters } = useData()
  const [countryData, setCountryData] = useState<CountryData[]>([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    setLoading(true)
    const params = filtersToParams(filters)
    api.get('/kpis/by-country', { params })
      .then(r => setCountryData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filters])

  const maxPremium = useMemo(() => Math.max(...countryData.map(d => d.total_written_premium), 1), [countryData])

  const dataByName = useMemo(() => {
    const map: Record<string, CountryData> = {}
    countryData.forEach(d => {
      const eng = COUNTRY_NAME_MAP[d.pays.toUpperCase()] || d.pays
      map[eng.toLowerCase()] = d
      map[d.pays.toLowerCase()] = d
    })
    return map
  }, [countryData])

  const getColor = (geoName: string): string => {
    const d = dataByName[geoName.toLowerCase()]
    if (!d) return '#1a1a3a'
    const ratio = d.total_written_premium / maxPremium
    if (ratio > 0.7) return '#4361ee'
    if (ratio > 0.4) return '#7b9cff'
    if (ratio > 0.15) return '#4cc9f0'
    if (ratio > 0.02) return '#2a4a7a'
    return '#1f2f55'
  }

  return (
    <div className="relative" style={{ height: 420 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 12 }} />
        </div>
      )}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 140, center: [20, 15] }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = geo.properties.name || ''
                const d = dataByName[name.toLowerCase()]
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(name)}
                    stroke="#0d0d1a"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none', cursor: d ? 'pointer' : 'default', transition: 'fill 0.2s' },
                      hover: { fill: d ? '#4361ee' : '#252545', outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(e) => {
                      if (d) setTooltip({ x: e.clientX, y: e.clientY, data: d })
                    }}
                    onMouseMove={(e) => {
                      if (d) setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 rounded-lg p-3 pointer-events-none shadow-xl"
          style={{
            left: tooltip.x + 12, top: tooltip.y - 10,
            background: '#16213e', border: '1px solid #2a2a4a',
            minWidth: 180,
          }}
        >
          <p className="text-sm font-semibold text-white mb-2">{tooltip.data.pays}</p>
          <div className="space-y-1 text-xs" style={{ color: '#94a3b8' }}>
            <p>Prime écrite : <span className="text-white font-medium">{formatCompact(tooltip.data.total_written_premium)}</span></p>
            <p>Loss Ratio : <span className="text-white font-medium">{formatPercent(tooltip.data.avg_ulr)}</span></p>
            <p>Résultat : <span className={`font-medium ${tooltip.data.total_resultat >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCompact(tooltip.data.total_resultat)}</span></p>
            <p>Contrats : <span className="text-white font-medium">{tooltip.data.contract_count}</span></p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <p className="text-xs" style={{ color: '#94a3b8' }}>Prime écrite :</p>
        {['Faible', 'Modérée', 'Élevée', 'Très élevée'].map((l, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: ['#1f2f55', '#2a4a7a', '#4cc9f0', '#4361ee'][i] }} />
            <span className="text-xs" style={{ color: '#64748b' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
