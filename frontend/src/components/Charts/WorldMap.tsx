import { useEffect, useState, useMemo, useRef } from "react"
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { useData, filtersToParams } from '../../context/DataContext'
import api from '../../utils/api'
import { API_ROUTES } from '../../constants/api'
import { formatCompact, formatPercent, formatMAD } from '../../utils/formatters'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

interface CountryData {
  pays: string
  total_written_premium: number
  total_resultat: number
  avg_ulr: number
  contract_count: number
  exposition?: number
  sum_insured_100?: number
  avg_share_signed?: number
}

interface TooltipState {
  x: number; y: number; data: CountryData
}

const normalizeName = (name: string) => {
  if (!name) return ""
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/['\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Mapping: nom français normalisé → nom EXACT dans world-atlas TopoJSON
// Les noms TopoJSON sont en anglais et peuvent différer des noms courants
const FRENCH_TO_TOPOJSON: Record<string, string> = {
  // Afrique du Nord
  'MAROC': 'Morocco',
  'ALGERIE': 'Algeria',
  'TUNISIE': 'Tunisia',
  'LIBYE': 'Libya',
  'EGYPTE': 'Egypt',
  'MAURITANIE': 'Mauritania',
  // Afrique de l'Ouest
  'SENEGAL': 'Senegal',
  'MALI': 'Mali',
  'BURKINA FASO': 'Burkina Faso',
  'NIGER': 'Niger',
  'TOGO': 'Togo',
  'BENIN': 'Benin',
  'GHANA': 'Ghana',
  'NIGERIA': 'Nigeria',
  'GUINEE': 'Guinea',
  'SIERRA LEONE': 'Sierra Leone',
  'LIBERIA': 'Liberia',
  'COTE D IVOIRE': "Côte d'Ivoire",       // Nom exact TopoJSON
  'GAMBIE': 'Gambia',
  'GUINEE BISSAU': 'Guinea-Bissau',
  'CAP VERT': 'Cape Verde',
  // Afrique Centrale
  'CAMEROUN': 'Cameroon',
  'GABON': 'Gabon',
  'CONGO': 'Republic of the Congo',
  'RDC': 'Democratic Republic of the Congo',
  'REPUBLIQUE DEMOCRATIQUE DU CONGO': 'Democratic Republic of the Congo',
  'REPUBLIQUE DU CONGO': 'Republic of the Congo',
  'CENTRAFRIQUE': 'Central African Republic',
  'TCHAD': 'Chad',
  'GUINEE EQUATORIALE': 'Equatorial Guinea',
  'SAO TOME ET PRINCIPE': 'São Tomé and Príncipe',
  // Afrique de l'Est
  'ANGOLA': 'Angola',
  'NAMIBIE': 'Namibia',
  'AFRIQUE DU SUD': 'South Africa',
  'BOTSWANA': 'Botswana',
  'ZIMBABWE': 'Zimbabwe',
  'ZAMBIE': 'Zambia',
  'MOZAMBIQUE': 'Mozambique',
  'TANZANIE': 'Tanzania',
  'KENYA': 'Kenya',
  'OUGANDA': 'Uganda',
  'RWANDA': 'Rwanda',
  'BURUNDI': 'Burundi',
  'SOMALIE': 'Somalia',
  'ETHIOPIE': 'Ethiopia',
  'ERYTHREE': 'Eritrea',
  'DJIBOUTI': 'Djibouti',
  'SOUDAN': 'Sudan',
  'SOUDAN DU SUD': 'South Sudan',
  'MADAGASCAR': 'Madagascar',
  'MALAWI': 'Malawi',
  'LESOTHO': 'Lesotho',
  'SWAZILAND': 'Swaziland',
  'ESWATINI': 'Swaziland',
  // Moyen-Orient
  'ARABIE SAOUDITE': 'Saudi Arabia',
  'ARABIE SAOUDITE ': 'Saudi Arabia',
  'EMIRATS ARABES UNIS': 'United Arab Emirates',
  'KOWEIT': 'Kuwait',
  'QATAR': 'Qatar',
  'BAHREIN': 'Bahrain',
  'OMAN': 'Oman',
  'YEMEN': 'Yemen',
  'JORDANIE': 'Jordan',
  'LIBAN': 'Lebanon',
  'IRAK': 'Iraq',
  'IRAN': 'Iran',
  'SYRIE': 'Syria',
  'ISRAEL': 'Israel',
  'PALESTINE': 'Palestine',
  'TURQUIE': 'Turkey',
  // Asie du Sud
  'PAKISTAN': 'Pakistan',
  'INDE': 'India',
  'SRI LANKA': 'Sri Lanka',
  'BANGLADESH': 'Bangladesh',
  'NEPAL': 'Nepal',
  'BHOUTAN': 'Bhutan',
  'MALDIVES': 'Maldives',
  'AFGHANISTAN': 'Afghanistan',
  // Asie Centrale
  'KAZAKHSTAN': 'Kazakhstan',
  'OUZBEKISTAN': 'Uzbekistan',
  'TURKMENISTAN': 'Turkmenistan',
  'KIRGHIZISTAN': 'Kyrgyzstan',
  'TADJIKISTAN': 'Tajikistan',
  // Asie de l'Est
  'CHINE': 'China',
  'TAIWAN': 'Taiwan',
  'COREE DU SUD': 'South Korea',
  'COREE DU NORD': 'North Korea',
  'JAPON': 'Japan',
  'MONGOLIE': 'Mongolia',
  // Asie du Sud-Est
  'SINGAPOUR': 'Singapore',
  'MALAISIE': 'Malaysia',
  'INDONESIE': 'Indonesia',
  'VIETNAM': 'Vietnam',
  'THAÏLANDE': 'Thailand',
  'THAILANDE': 'Thailand',
  'CAMBODGE': 'Cambodia',
  'LAOS': 'Laos',
  'MYANMAR': 'Myanmar',
  'BIRMANIE': 'Myanmar',
  'PHILIPPINES': 'Philippines',
  'TIMOR ORIENTAL': 'East Timor',
  'BRUNEI': 'Brunei',
  // Europe
  'FRANCE': 'France',
  'ALLEMAGNE': 'Germany',
  'ESPAGNE': 'Spain',
  'ITALIE': 'Italy',
  'ROYAUME UNI': 'United Kingdom',
  'ANGLETERRE': 'United Kingdom',
  'PAYS BAS': 'Netherlands',
  'BELGIQUE': 'Belgium',
  'SUISSE': 'Switzerland',
  'AUTRICHE': 'Austria',
  'PORTUGAL': 'Portugal',
  'GRECE': 'Greece',
  'POLOGNE': 'Poland',
  'REPUBLIQUE TCHEQUE': 'Czech Republic',
  'SLOVAQUIE': 'Slovakia',
  'HONGRIE': 'Hungary',
  'ROUMANIE': 'Romania',
  'BULGARIE': 'Bulgaria',
  'SERBIE': 'Serbia',
  'CROATIE': 'Croatia',
  'SLOVENIE': 'Slovenia',
  'BOSNIE': 'Bosnia and Herzegovina',
  'MACEDOINE': 'Macedonia',
  'ALBANIE': 'Albania',
  'MONTENEGRO': 'Montenegro',
  'KOSOVO': 'Kosovo',
  'MOLDAVIE': 'Moldova',
  'UKRAINE': 'Ukraine',
  'BIELORUSSIE': 'Belarus',
  'RUSSIE': 'Russia',
  'LITUANIE': 'Lithuania',
  'LETTONIE': 'Latvia',
  'ESTONIE': 'Estonia',
  'FINLANDE': 'Finland',
  'SUEDE': 'Sweden',
  'NORVEGE': 'Norway',
  'DANEMARK': 'Denmark',
  'ISLANDE': 'Iceland',
  'IRLANDE': 'Ireland',
  'LUXEMBOURG': 'Luxembourg',
  'MALTE': 'Malta',
  'CHYPRE': 'Cyprus',
  'GEORGIE': 'Georgia',
  'ARMENIE': 'Armenia',
  'AZERBAIDJAN': 'Azerbaijan',
  // Amériques
  'ETATS UNIS': 'United States of America',
  'USA': 'United States of America',
  'CANADA': 'Canada',
  'MEXIQUE': 'Mexico',
  'BRESIL': 'Brazil',
  'ARGENTINE': 'Argentina',
  'COLOMBIE': 'Colombia',
  'CHILI': 'Chile',
  'PEROU': 'Peru',
  'VENEZUELA': 'Venezuela',
  'EQUATEUR': 'Ecuador',
  'BOLIVIE': 'Bolivia',
  'PARAGUAY': 'Paraguay',
  'URUGUAY': 'Uruguay',
  'GUYANA': 'Guyana',
  'SURINAME': 'Suriname',
  'PANAMA': 'Panama',
  'COSTA RICA': 'Costa Rica',
  'NICARAGUA': 'Nicaragua',
  'HONDURAS': 'Honduras',
  'GUATEMALA': 'Guatemala',
  'EL SALVADOR': 'El Salvador',
  'BELIZE': 'Belize',
  'CUBA': 'Cuba',
  'HAITI': 'Haiti',
  'REPUBLIQUE DOMINICAINE': 'Dominican Republic',
  'JAMAIQUE': 'Jamaica',
  'TRINIDAD ET TOBAGO': 'Trinidad and Tobago',
  // Océanie
  'AUSTRALIE': 'Australia',
  'NOUVELLE ZELANDE': 'New Zealand',
  'PAPOUASIE NOUVELLE GUINEE': 'Papua New Guinea',
  'FIDJI': 'Fiji',
  // Régions (ne correspondent pas à des pays sur la carte — ignorées)
  'ASIE PACIFIQUE': '',
  'EUROPE': '',
  'MOYEN ORIENT': '',
  'MONDE ENTIER': '',
  'AFRIQUE': '',
}

const MIN_ZOOM = 1
const MAX_ZOOM = 8

interface WorldMapProps {
  colorBy?: 'premium' | 'exposition'
  /** Liste de noms de pays (en français) à mettre en surbrillance. Les autres sont atténués. */
  highlightedCountries?: string[]
  /** Params externaux optionnels — si fournis, bypasse le filtre global */
  externalParams?: Record<string, string>
}

export default function WorldMap({
  colorBy = 'premium',
  highlightedCountries = [],
  externalParams,
}: WorldMapProps) {
  const { filters } = useData()
  const [countryData, setCountryData] = useState<CountryData[]>([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [zoom, setZoom] = useState<number>(1)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  const hasHighlight = highlightedCountries.length > 0

  // Normalised set des pays surlignés pour lookup rapide
  const highlightedNormSet = useMemo(() => {
    return new Set(highlightedCountries.map(p => normalizeName(p)))
  }, [highlightedCountries])

  useEffect(() => {
    setLoading(true)
    const baseParams = externalParams ?? filtersToParams(filters)
    const endpoint = colorBy === 'exposition' ? API_ROUTES.EXPOSITION.BY_COUNTRY : API_ROUTES.KPIS.BY_COUNTRY
    // Force top=300 to fetch all countries for the map, not just the default 10
    const params = { ...baseParams, top: 300 }
    
    api.get(endpoint, { params })
      .then(r => setCountryData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filters, colorBy, externalParams])

  const maxValue = useMemo(() => {
    if (colorBy === 'exposition') {
      return Math.max(...countryData.map(d => d.exposition || 0), 1)
    }
    return Math.max(...countryData.map(d => d.total_written_premium || 0), 1)
  }, [countryData, colorBy])

  // dataByTopoName : clé = nom EXACT du TopoJSON (en anglais, casse originale)
  const dataByTopoName = useMemo(() => {
    const map: Record<string, CountryData> = {}

    countryData.forEach(d => {
      const normalized = normalizeName(d.pays)
      const topoName = FRENCH_TO_TOPOJSON[normalized]

      if (topoName) {
        // Clé = nom TopoJSON exact en minuscule pour comparaison insensible à la casse
        map[topoName.toLowerCase()] = d
      }
      // Fallback : stocker aussi le nom français normalisé et brut
      map[normalized.toLowerCase()] = d
      map[d.pays.toLowerCase()] = d
    })

    return map
  }, [countryData])

  const getColor = (geoName: string): string => {
    // geoName est le nom exact du TopoJSON (ex: "France", "Côte d'Ivoire")
    const d = dataByTopoName[geoName.toLowerCase()]
    if (!d) return '#1a1a3a'
    const metric = colorBy === 'exposition' ? (d.exposition || 0) : (d.total_written_premium || 0)
    const ratio = metric / maxValue
    if (ratio > 0.7) return '#4361ee'
    if (ratio > 0.4) return '#7b9cff'
    if (ratio > 0.15) return '#4cc9f0'
    if (ratio > 0.02) return '#2a4a7a'
    return '#1f2f55'
  }

  /** Retourne true si ce pays (identifié via son CountryData) est dans la liste surlignée */
  const isCountryHighlighted = (d: CountryData | undefined): boolean => {
    if (!hasHighlight || !d) return true  // pas de filtre → tous actifs
    return highlightedNormSet.has(normalizeName(d.pays))
  }

  const getTooltipPosition = (clientX: number, clientY: number) => {
    const container = mapContainerRef.current
    if (!container) return { x: clientX, y: clientY }

    const offset = 12
    const margin = 8
    const rect = container.getBoundingClientRect()
    const tooltipWidth = tooltipRef.current?.offsetWidth ?? 220
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 130

    const rawX = clientX - rect.left + offset
    const rawY = clientY - rect.top + offset

    const maxX = Math.max(margin, rect.width - tooltipWidth - margin)
    const maxY = Math.max(margin, rect.height - tooltipHeight - margin)

    return {
      x: Math.min(Math.max(rawX, margin), maxX),
      y: Math.min(Math.max(rawY, margin), maxY),
    }
  }

  return (
    <div ref={mapContainerRef} className="relative" style={{ height: 420 }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 12 }} />
        </div>
      )}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 140 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup
          zoom={zoom}
          center={[20, 15]}
          onMoveEnd={({ zoom: newZoom }) => setZoom(newZoom)}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = geo.properties.name || ''
                const d = dataByTopoName[name.toLowerCase()]
                const highlighted = isCountryHighlighted(d)
                const fillOpacity = hasHighlight ? (highlighted ? 1 : 0.3) : 1
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(name)}
                    fillOpacity={fillOpacity}
                    stroke="#0d0d1a"
                    strokeWidth={highlighted ? 0.8 : 0.3}
                    style={{
                      default: { outline: 'none', cursor: d ? 'pointer' : 'default', transition: 'fill 0.2s, fill-opacity 0.3s' },
                      hover: { fill: d ? '#4361ee' : '#252545', outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(e) => {
                      if (!d) return
                      const pos = getTooltipPosition(e.clientX, e.clientY)
                      setTooltip({ x: pos.x, y: pos.y, data: d })
                    }}
                    onMouseMove={(e) => {
                      if (!d) return
                      const pos = getTooltipPosition(e.clientX, e.clientY)
                      setTooltip(t => (t ? { ...t, x: pos.x, y: pos.y } : { x: pos.x, y: pos.y, data: d }))
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
          ref={tooltipRef}
          className="absolute z-50 rounded-xl pointer-events-none"
          style={{
            left: tooltip.x, top: tooltip.y,
            background: 'hsla(209,28%,18%,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid hsla(0,0%,100%,0.12)',
            boxShadow: '0 16px 48px hsla(209,28%,14%,0.30)',
            minWidth: 190,
            padding: '10px 14px',
          }}
        >
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(83,50%,55%)', letterSpacing: '0.06em', marginBottom: 6, textTransform: 'uppercase' }}>
            {tooltip.data.pays}
          </p>
          <div className="space-y-1" style={{ fontSize: '0.75rem' }}>
            {colorBy === 'exposition' ? (
              <>
                <p style={{ color: 'hsla(0,0%,100%,0.65)' }}>Exposition : <span style={{ color: '#fff', fontWeight: 700 }}>{formatMAD(tooltip.data.exposition || 0)}</span></p>
                <p style={{ color: 'hsla(0,0%,100%,0.65)' }}>Somme assurée : <span style={{ color: '#fff', fontWeight: 700 }}>{formatMAD(tooltip.data.sum_insured_100 || 0)}</span></p>
                <p style={{ color: 'hsla(0,0%,100%,0.65)' }}>Part moy. : <span style={{ color: '#fff', fontWeight: 700 }}>{tooltip.data.avg_share_signed || 0}%</span></p>
                <p style={{ color: 'hsla(0,0%,100%,0.65)' }}>Contrats : <span style={{ color: '#fff', fontWeight: 700 }}>{tooltip.data.contract_count}</span></p>
              </>
            ) : (
              <>
                <p style={{ color: 'hsla(0,0%,100%,0.65)' }}>Prime écrite : <span style={{ color: 'hsl(83,50%,55%)', fontWeight: 700 }}>{formatMAD(tooltip.data.total_written_premium || 0)}</span></p>
                <p style={{ color: 'hsla(0,0%,100%,0.65)' }}>Loss Ratio : <span style={{ color: (tooltip.data.avg_ulr || 0) > 100 ? 'hsl(358,66%,54%)' : (tooltip.data.avg_ulr || 0) > 70 ? 'hsl(43,96%,56%)' : 'hsl(152,56%,39%)', fontWeight: 700 }}>{formatPercent(tooltip.data.avg_ulr || 0)}</span></p>
                <p style={{ color: 'hsla(0,0%,100%,0.65)' }}>Résultat : <span style={{ color: (tooltip.data.total_resultat || 0) >= 0 ? 'hsl(152,56%,39%)' : 'hsl(358,66%,54%)', fontWeight: 700 }}>{formatMAD(tooltip.data.total_resultat || 0)}</span></p>
                <p style={{ color: 'hsla(0,0%,100%,0.65)' }}>Contrats : <span style={{ color: '#fff', fontWeight: 700 }}>{tooltip.data.contract_count}</span></p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Zoom buttons */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          onClick={() => setZoom(z => Math.min(z + 0.5, MAX_ZOOM))}
          title="Zoom +"
          style={{
            width: 28, height: 28,
            background: 'hsla(209,28%,18%,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid hsla(0,0%,100%,0.12)',
            borderRadius: 8,
            color: '#fff',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >+</button>
        <button
          onClick={() => setZoom(z => Math.max(z - 0.5, MIN_ZOOM))}
          title="Zoom -"
          style={{
            width: 28, height: 28,
            background: 'hsla(209,28%,18%,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid hsla(0,0%,100%,0.12)',
            borderRadius: 8,
            color: '#fff',
            fontWeight: 700,
            fontSize: '1.1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >−</button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <p className="text-xs" style={{ color: '#94a3b8' }}>{colorBy === 'exposition' ? 'Exposition :' : 'Prime écrite :'}</p>
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
