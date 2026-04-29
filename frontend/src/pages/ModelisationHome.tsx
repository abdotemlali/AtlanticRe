import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Combine,
  Globe2,
  Map,
  TrendingUp,
  X,
  Heart,
  Building2,
  Landmark,
  BarChart2,
  Shuffle,
} from 'lucide-react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps'


const navItems: NavItem[] = [
  { to: '/vue_ensemble', label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  {
    label: 'Modélisation', icon: Target,
    children: [
      { to: '/vue_ensemble#scoring',  label: 'Scoring SCAR',     icon: Target, enabled: true },
      { to: '/vue_ensemble#criteres', label: 'Critères & poids', icon: Sparkles, enabled: true },
      { to: '/modelisation/predictions',  label: 'Prédictions 2030',  icon: TrendingUp, enabled: true },
      { to: '/modelisation/monte-carlo',  label: 'Monte Carlo',        icon: Shuffle,    enabled: true },
    ],
  },
  {
    label: 'Cartographie', icon: Map,
    children: [
      { to: '/modelisation/cartographie/non-vie',      label: 'Assurance Non-Vie', icon: Building2, enabled: true },
      { to: '/modelisation/cartographie/vie',          label: 'Assurance Vie',     icon: Heart,     enabled: true },
      { to: '/modelisation/cartographie/macroeconomie', label: 'Macroéconomie',   icon: TrendingUp, enabled: true },
      { to: '/modelisation/cartographie/gouvernance',  label: 'Gouvernance',       icon: Landmark,  enabled: true },
    ],
  },
  {
    label: 'Analyse', icon: Network,
    children: [
      { to: '/modelisation/analyse',     label: 'Analyse par Pays',    icon: BarChart2,    enabled: true },
      { to: '/modelisation/analyse-compagnie', label: 'Analyse Compagnie', icon: Building2, enabled: true },
      { to: '/modelisation/comparaison', label: 'Comparaison marchés', icon: Scale,       enabled: true },
      { to: '/analyse-synergie',         label: 'Analyse Synergie',    icon: Combine,    enabled: true, gold: true },
    ],
  },
  { to: '/modelisation/recommandations', label: 'Recommandations', icon: Sparkles },
]

// ─── Types ───────────────────────────────────────────────────────────────────


interface OverviewStats {
  nb_pays: number
  regions: string[]
  annee_min: number
  annee_max: number
  economique: {
    gdp_growth_pct_avg: number | null
    exchange_rate_avg: number | null
    gdp_per_capita_avg: number | null
    inflation_rate_pct_avg: number | null
    gdp_mn_total: number | null
    current_account_mn_avg: number | null
    integration_regionale_score_avg: number | null
  }
  assurance_vie: {
    primes_mn_usd_total: number | null
    croissance_pct_avg: number | null
    taux_penetration_pct_avg: number | null
    densite_usd_avg: number | null
  }
  assurance_non_vie: {
    primes_mn_usd_total: number | null
    croissance_pct_avg: number | null
    taux_penetration_pct_avg: number | null
    densite_usd_avg: number | null
    ratio_sp_pct_avg: number | null
  }
  reglementaire: {
    fdi_inflows_pct_gdp_avg: number | null
    political_stability_avg: number | null
    regulatory_quality_avg: number | null
    kaopen_avg: number | null
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmt(val: number | null | undefined, decimals = 1, suffix = ''): string {
  if (val == null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val) + suffix
}

function fmtBig(val: number | null | undefined): string {
  if (val == null) return '—'
  if (val >= 1_000_000) return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(val / 1_000_000) + ' Md USD'
  if (val >= 1_000) return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(val / 1_000) + ' Md USD'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(val) + ' Mn USD'
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ w = '80%', h = 20 }: { w?: string; h?: number }) {
  return (
    <div className="animate-pulse rounded" style={{ width: w, height: h, background: 'hsl(83,10%,88%)' }} />
  )
}

// ─── Indicateur definitions ───────────────────────────────────────────────────
type Indicateur = {
  label: string
  description: string
  source: string
  getValue: (s: OverviewStats) => number | null | undefined
  format: (v: number | null | undefined) => string
  pending?: boolean
}

const INDICATEURS: Record<string, Indicateur[]> = {
  economique: [
    {
      label: 'Croissance PIB (%)',
      description: 'Taux de croissance annuel du PIB réel',
      source: 'AXCO',
      getValue: s => s.economique.gdp_growth_pct_avg,
      format: v => fmt(v, 1, ' %'),
    },
    {
      label: 'Taux de change',
      description: 'Taux de change moyen par rapport au USD',
      source: 'AXCO',
      getValue: s => s.economique.exchange_rate_avg,
      format: v => fmt(v, 2),
    },
    {
      label: 'PIB par habitant (USD)',
      description: 'Revenu moyen par habitant en USD',
      source: 'AXCO',
      getValue: s => s.economique.gdp_per_capita_avg,
      format: v => fmt(v, 0, ' USD'),
    },
    {
      label: "Taux d'inflation (%)",
      description: 'Variation annuelle des prix à la consommation',
      source: 'AXCO',
      getValue: s => s.economique.inflation_rate_pct_avg,
      format: v => fmt(v, 1, ' %'),
    },
    {
      label: 'PIB total (Mn USD)',
      description: 'Produit Intérieur Brut total agrégé en Mn USD',
      source: 'AXCO',
      getValue: s => s.economique.gdp_mn_total,
      format: v => fmtBig(v),
    },
    {
      label: 'Solde compte courant (Mn)',
      description: 'Balance des paiements courants moyenne',
      source: 'AXCO',
      getValue: s => s.economique.current_account_mn_avg,
      format: v => fmt(v, 0, ' Mn'),
    },
    {
      label: 'Intégration Régionale',
      description: "Score d'intégration économique régionale",
      source: 'Banque Africaine de Développement',
      getValue: s => s.economique.integration_regionale_score_avg,
      format: v => fmt(v, 2),
    },
  ],
  assurance_vie: [
    {
      label: 'Primes émises (Mn USD)',
      description: 'Volume total des primes vie sur 34 pays',
      source: 'Axco Navigator · Backcasting',
      getValue: s => s.assurance_vie.primes_mn_usd_total,
      format: v => fmtBig(v),
    },
    {
      label: 'Croissance Primes (%)',
      description: 'Taux de croissance annuel moyen des primes vie',
      source: 'Axco Navigator · ARCA · IPEC · DGAMP',
      getValue: s => s.assurance_vie.croissance_pct_avg,
      format: v => fmt(v, 1, ' %'),
    },
    {
      label: 'Taux de pénétration (%)',
      description: 'Ratio primes vie / PIB',
      source: 'Axco Navigator',
      getValue: s => s.assurance_vie.taux_penetration_pct_avg,
      format: v => fmt(v, 2, ' %'),
    },
    {
      label: 'Densité Assurance (USD/hab)',
      description: 'Primes vie par habitant',
      source: 'Axco Navigator',
      getValue: s => s.assurance_vie.densite_usd_avg,
      format: v => fmt(v, 1, ' USD'),
    },
  ],
  assurance_non_vie: [
    {
      label: 'Primes émises (Mn USD)',
      description: 'Volume total des primes non-vie sur 34 pays',
      source: 'Axco Navigator · Backcasting',
      getValue: s => s.assurance_non_vie.primes_mn_usd_total,
      format: v => fmtBig(v),
    },
    {
      label: 'Croissance Primes (%)',
      description: 'Taux de croissance annuel moyen des primes non-vie',
      source: 'Axco Navigator · ARCA · IPEC · DGAMP',
      getValue: s => s.assurance_non_vie.croissance_pct_avg,
      format: v => fmt(v, 1, ' %'),
    },
    {
      label: 'Taux de pénétration (%)',
      description: 'Ratio primes non-vie / PIB',
      source: 'Axco Navigator',
      getValue: s => s.assurance_non_vie.taux_penetration_pct_avg,
      format: v => fmt(v, 2, ' %'),
    },
    {
      label: 'Densité Assurance (USD/hab)',
      description: 'Primes non-vie par habitant',
      source: 'Axco Navigator',
      getValue: s => s.assurance_non_vie.densite_usd_avg,
      format: v => fmt(v, 1, ' USD'),
    },
    {
      label: 'Ratio S/P (%)',
      description: 'Ratio sinistres sur primes',
      source: 'Axco Navigator · ACAPS · CNA · NIC · Prudential Authority/KPMG · NAICOM · IPEC · PIA · NBFIRA · FSC · FANAF · BEAC',
      getValue: s => s.assurance_non_vie.ratio_sp_pct_avg,
      format: v => fmt(v, 1, ' %'),
    },
  ],
  reglementaire: [
    {
      label: 'IDE entrants (% PIB)',
      description: "Flux d'investissements directs étrangers entrants en % du PIB",
      source: 'Banque Mondiale',
      getValue: s => s.reglementaire.fdi_inflows_pct_gdp_avg,
      format: v => fmt(v, 2, ' %'),
    },
    {
      label: 'Stabilité politique',
      description: 'Indice WGI de stabilité politique (–2.5 à +2.5)',
      source: 'Banque Mondiale WGI',
      getValue: s => s.reglementaire.political_stability_avg,
      format: v => fmt(v, 2),
    },
    {
      label: 'Qualité réglementaire',
      description: 'Indice WGI de qualité réglementaire (–2.5 à +2.5)',
      source: 'Banque Mondiale WGI',
      getValue: s => s.reglementaire.regulatory_quality_avg,
      format: v => fmt(v, 2),
    },
    {
      label: 'Ouverture financière (KAOPEN)',
      description: "Indice Chinn-Ito d'ouverture du compte de capital",
      source: 'Chinn & Ito (2006)',
      getValue: s => s.reglementaire.kaopen_avg,
      format: v => fmt(v, 2),
    },
  ],
}

// ─── Card config ──────────────────────────────────────────────────────────────
const CARD_CONFIG = [
  {
    key: 'economique' as const,
    label: 'Économique',
    icon: TrendingUp,
    color: 'hsl(83,52%,42%)',
    colorLight: 'hsla(83,52%,42%,0.12)',
    // indices prioritaires affichés sur la card (sans ouvrir la modale)
    primaryKeys: ['gdp_growth_pct_avg', 'gdp_per_capita_avg', 'inflation_rate_pct_avg', 'gdp_mn_total'] as const,
  },
  {
    key: 'assurance_vie' as const,
    label: 'Assurance Vie',
    icon: Heart,
    color: 'hsl(210,70%,55%)',
    colorLight: 'hsla(210,70%,55%,0.10)',
    primaryKeys: [] as const,
  },
  {
    key: 'assurance_non_vie' as const,
    label: 'Assurance Non-Vie',
    icon: Building2,
    color: 'hsl(30,80%,55%)',
    colorLight: 'hsla(30,80%,55%,0.10)',
    primaryKeys: [] as const,
  },
  {
    key: 'reglementaire' as const,
    label: 'Réglementaire',
    icon: Scale,
    color: 'hsl(270,55%,60%)',
    colorLight: 'hsla(270,55%,60%,0.10)',
    primaryKeys: [] as const,
  },
]

// ─── Modale détails ───────────────────────────────────────────────────────────
function DetailsModal({
  critere,
  stats,
  onClose,
}: {
  critere: typeof CARD_CONFIG[number]
  stats: OverviewStats
  onClose: () => void
}) {
  const indicateurs = INDICATEURS[critere.key]

  // Fermer avec Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full bg-white rounded-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: 680, maxHeight: '85vh', boxShadow: '0 24px 80px rgba(0,0,0,0.22)' }}
      >
        {/* Header modale */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: critere.colorLight }}
            >
              <critere.icon size={18} style={{ color: critere.color }} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Critère</p>
              <h3 className="text-base font-bold text-gray-800">{critere.label}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Corps modale — scrollable */}
        <div className="overflow-y-auto flex-1 px-7 py-5 space-y-3">
          {indicateurs.map((ind) => {
            const val = ind.pending ? null : ind.getValue(stats)
            const formatted = ind.format(val)
            return (
              <div
                key={ind.label}
                className="flex items-start gap-4 p-4 rounded-xl border border-gray-100"
                style={{ background: 'hsl(0,0%,98.5%)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{ind.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{ind.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {ind.source.split(' · ').map(src => (
                      <span
                        key={src}
                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          background: critere.colorLight,
                          color: critere.color,
                          border: `1px solid ${critere.color}30`,
                        }}
                      >
                        {src}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-lg font-bold" style={{ color: ind.pending ? '#9ca3af' : critere.color }}>
                    {formatted}
                  </p>
                  {ind.pending && (
                    <span className="text-[10px] text-gray-400 font-medium">Données à venir</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400">Moyennes calculées sur la période 2022–2024 · 34 pays africains</p>
        </div>
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  config,
  stats,
  loading,
  onDetails,
}: {
  config: typeof CARD_CONFIG[number]
  stats: OverviewStats | null
  loading: boolean
  onDetails: () => void
}) {
  const indicateurs = INDICATEURS[config.key]

  return (
    <div
      className="bg-white rounded-xl flex flex-col overflow-hidden"
      style={{
        border: '1px solid hsl(0,0%,92%)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Strip couleur */}
      <div style={{ height: 4, background: config.color }} />

      {/* En-tête card */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: config.colorLight }}
        >
          <config.icon size={17} style={{ color: config.color }} />
        </div>
        <h3 className="text-sm font-bold text-gray-800">{config.label}</h3>
      </div>

      {/* Indicateurs */}
      <div className="px-5 pb-3 flex-1 space-y-2.5">
        {indicateurs.map(ind => {
          const val = loading || !stats ? null : (ind.pending ? null : ind.getValue(stats))
          return (
            <div key={ind.label} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 leading-tight flex-1">{ind.label}</span>
              <span className="flex-shrink-0">
                {loading ? (
                  <Skeleton w="60px" h={14} />
                ) : ind.pending ? (
                  <span className="text-xs font-medium text-gray-300 italic">À venir</span>
                ) : (
                  <span className="text-sm font-bold" style={{ color: config.color }}>
                    {ind.format(val)}
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>

      {/* Bouton Détails */}
      <div className="px-5 pb-4 pt-2 border-t border-gray-50 flex justify-end">
        <button
          onClick={onDetails}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
          style={{
            background: config.colorLight,
            color: config.color,
            border: `1px solid ${config.color}30`,
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Détails →
        </button>
      </div>
    </div>
  )
}

// ─── Carte Afrique ────────────────────────────────────────────────────────────
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// ISO 3166-1 numeric → ISO3 — uniquement nos 34 pays
const NUMERIC_TO_ISO3: Record<number, string> = {
  710: 'ZAF', 12: 'DZA', 24: 'AGO', 72: 'BWA', 854: 'BFA', 108: 'BDI',
  204: 'BEN', 120: 'CMR', 132: 'CPV', 178: 'COG', 384: 'CIV', 266: 'GAB',
  288: 'GHA', 404: 'KEN', 450: 'MDG', 454: 'MWI', 466: 'MLI', 504: 'MAR',
  480: 'MUS', 478: 'MRT', 508: 'MOZ', 516: 'NAM', 562: 'NER', 566: 'NGA',
  800: 'UGA', 180: 'COD', 686: 'SEN', 834: 'TZA', 148: 'TCD', 768: 'TGO',
  788: 'TUN', 894: 'ZMB', 818: 'EGY', 231: 'ETH',
  // Sahara Occidental → traité comme Maroc (même couleur et tooltip)
  732: 'MAR',
}

// Tous les ISO3 africains (hors périmètre, pour les colorer en gris)
const AFRICA_NUMERIC = new Set([
  12, 24, 72, 204, 72, 854, 108, 120, 132, 140, 148, 174, 178, 180, 204,
  231, 232, 262, 266, 270, 288, 324, 328, 384, 404, 426, 430, 434, 450,
  454, 466, 478, 480, 504, 508, 516, 562, 566, 646, 686, 694, 706, 710,
  716, 724, 728, 729, 732, 736, 748, 768, 788, 800, 818, 834, 854, 894,
  // Petits territoires/îles
  174, 175, 638,
])

const TARGET_ISO3 = new Set(Object.values(NUMERIC_TO_ISO3))

// Noms lisibles par ISO3
const ISO3_NAMES: Record<string, string> = {
  ZAF: 'Afrique du Sud', DZA: 'Algérie', AGO: 'Angola', BWA: 'Botswana',
  BFA: 'Burkina Faso', BDI: 'Burundi', BEN: 'Bénin', CMR: 'Cameroun',
  CPV: 'Cap-Vert', COG: 'Congo', CIV: "Côte d'Ivoire", GAB: 'Gabon',
  GHA: 'Ghana', KEN: 'Kenya', MDG: 'Madagascar', MWI: 'Malawi',
  MLI: 'Mali', MAR: 'Maroc', MUS: 'Maurice', MRT: 'Mauritanie',
  MOZ: 'Mozambique', NAM: 'Namibie', NER: 'Niger', NGA: 'Nigéria',
  UGA: 'Ouganda', COD: 'RD Congo', SEN: 'Sénégal', TZA: 'Tanzanie',
  TCD: 'Tchad', TGO: 'Togo', TUN: 'Tunisie', ZMB: 'Zambie',
  EGY: 'Égypte', ETH: 'Éthiopie',
}

// Région par ISO3
const ISO3_REGION: Record<string, string> = {
  ZAF: 'Afrique Australe', DZA: 'Maghreb', AGO: 'Afrique Australe', BWA: 'Afrique Australe',
  BFA: 'CIMA', BDI: 'Afrique Est', BEN: 'CIMA', CMR: 'CIMA', CPV: 'Iles',
  COG: 'CIMA', CIV: 'CIMA', GAB: 'CIMA', GHA: 'Afrique Ouest', KEN: 'Afrique Est',
  MDG: 'Afrique Est', MWI: 'Afrique Est', MLI: 'CIMA', MAR: 'Maghreb', MUS: 'Iles',
  MRT: 'Maghreb', MOZ: 'Afrique Est', NAM: 'Afrique Australe', NER: 'CIMA',
  NGA: 'Afrique Ouest', UGA: 'Afrique Est', COD: 'Afrique Centrale', SEN: 'CIMA',
  TZA: 'Afrique Est', TCD: 'CIMA', TGO: 'CIMA', TUN: 'Maghreb', ZMB: 'Afrique Est',
  EGY: 'Maghreb', ETH: 'Afrique Est',
}

function AfriqueMap() {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; region: string } | null>(null)
  const [zoom, setZoom] = useState(1)

  return (
    <div className="relative" style={{ background: 'hsl(83,15%,12%)', borderRadius: 16, overflow: 'hidden' }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 380, center: [20, 2] }}
        style={{ width: '100%', height: 520 }}
      >
        <ZoomableGroup
          zoom={zoom}
          minZoom={0.8}
          maxZoom={4}
          onMoveEnd={({ zoom: newZoom }) => setZoom(newZoom)}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                const numericId = parseInt(geo.id, 10)
                const iso3 = NUMERIC_TO_ISO3[numericId]
                const isTarget = TARGET_ISO3.has(iso3)
                const isAfrica = AFRICA_NUMERIC.has(numericId)

                if (!isAfrica) return null

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseMove={e => {
                      if (iso3) {
                        setTooltip({
                          x: e.clientX,
                          y: e.clientY,
                          name: ISO3_NAMES[iso3] || iso3,
                          region: ISO3_REGION[iso3] || '',
                        })
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      default: {
                        fill: isTarget ? 'hsl(83,52%,42%)' : 'hsl(83,10%,28%)',
                        stroke: 'hsl(83,15%,18%)',
                        strokeWidth: 0.5,
                        outline: 'none',
                      },
                      hover: {
                        fill: isTarget ? 'hsl(83,58%,52%)' : 'hsl(83,12%,35%)',
                        stroke: 'hsl(83,15%,18%)',
                        strokeWidth: 0.5,
                        outline: 'none',
                        cursor: isTarget ? 'pointer' : 'default',
                      },
                      pressed: {
                        fill: isTarget ? 'hsl(83,60%,38%)' : 'hsl(83,10%,28%)',
                        outline: 'none',
                      },
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Zoom buttons */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-10">
        <button
          onClick={() => setZoom(z => Math.min(z + 0.5, 4))}
          title="Zoom +"
          style={{
            width: 28, height: 28,
            background: 'hsla(83,30%,12%,0.90)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid hsla(83,52%,50%,0.30)',
            borderRadius: 6,
            color: 'hsl(83,60%,85%)',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'hsla(83,30%,18%,0.95)'; e.currentTarget.style.borderColor = 'hsla(83,52%,50%,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'hsla(83,30%,12%,0.90)'; e.currentTarget.style.borderColor = 'hsla(83,52%,50%,0.30)'; }}
        >+</button>
        <button
          onClick={() => setZoom(z => Math.max(z - 0.5, 0.8))}
          title="Zoom -"
          style={{
            width: 28, height: 28,
            background: 'hsla(83,30%,12%,0.90)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid hsla(83,52%,50%,0.30)',
            borderRadius: 6,
            color: 'hsl(83,60%,85%)',
            fontWeight: 700,
            fontSize: '1.2rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'hsla(83,30%,18%,0.95)'; e.currentTarget.style.borderColor = 'hsla(83,52%,50%,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'hsla(83,30%,12%,0.90)'; e.currentTarget.style.borderColor = 'hsla(83,52%,50%,0.30)'; }}
        >−</button>
      </div>

      {/* Légende */}
      <div className="absolute bottom-4 left-4 flex items-center gap-5 px-4 py-2.5 rounded-lg"
        style={{ background: 'hsla(83,20%,8%,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ background: 'hsl(83,52%,42%)' }} />
          <span className="text-xs text-white/80 font-medium">Marchés analysés (34)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ background: 'hsl(83,10%,28%)' }} />
          <span className="text-xs text-white/80 font-medium">Hors périmètre</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-2 rounded-lg text-sm pointer-events-none"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 40,
            background: 'hsla(83,30%,10%,0.95)',
            border: '1px solid hsla(83,52%,50%,0.30)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          <p className="font-semibold text-white text-[13px]">{tooltip.name}</p>
          {tooltip.region && (
            <p className="text-[11px] mt-0.5" style={{ color: 'hsl(83,60%,70%)' }}>{tooltip.region}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ModelisationHome ─────────────────────────────────────────────────────────
export default function ModelisationHome() {
  const navigate = useNavigate()

  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [openModal, setOpenModal] = useState<typeof CARD_CONFIG[number] | null>(null)

  useEffect(() => {
    fetch('/api/public/overview/stats')
      .then(r => { if (!r.ok) throw new Error('API error'); return r.json() })
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--color-off-white)' }}>
      {/* ── HEADER ── */}
      <header
        className="flex items-center justify-between flex-shrink-0 relative overflow-visible"
        style={{
          height: 64,
          background: 'linear-gradient(135deg, hsl(83,40%,10%) 0%, hsl(83,38%,16%) 40%, hsl(83,42%,22%) 70%, hsl(100,36%,18%) 100%)',
          boxShadow: '0 4px 28px hsla(83,40%,8%,0.50), 0 1px 0 hsla(83,52%,50%,0.30)',
          zIndex: 100,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 5%, hsla(83,60%,70%,0.40) 30%, hsla(0,0%,100%,0.12) 50%, hsla(83,60%,70%,0.40) 70%, transparent 95%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none z-10"
          style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(83,54%,32%) 15%, hsl(83,52%,42%) 40%, hsl(83,55%,52%) 55%, hsl(83,52%,42%) 70%, hsl(83,54%,32%) 85%, transparent 100%)' }} />

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-full flex-shrink-0"
          style={{ borderRight: '1px solid hsla(0,0%,100%,0.07)', minWidth: 220 }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0 tracking-wider"
            style={{ background: 'linear-gradient(135deg, hsl(83,54%,30%) 0%, hsl(83,52%,42%) 60%, hsl(83,55%,55%) 100%)', boxShadow: '0 2px 12px hsla(83,55%,50%,0.55), inset 0 1px 0 hsla(0,0%,100%,0.20)' }}>
            SCAR
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[1.05rem] font-bold tracking-[0.01em] text-white leading-tight">
              Target<span style={{ color: 'hsl(83,60%,70%)' }}>BD</span>
            </span>
            <span className="text-[0.59rem] font-medium tracking-[0.18em] uppercase mt-px" style={{ color: 'hsla(0,0%,100%,0.40)' }}>
              Modélisation Stratégique
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-0.5 flex-1 px-3 h-full overflow-visible">
          {navItems.map(item =>
            item.children ? (
              <NavDropdown key={item.label} {...item} />
            ) : item.to === '/vue_ensemble' ? (
              // Item "Vue d'ensemble" — cliquable, actif
              <button
                key={item.to}
                title={item.label}
                onClick={() => navigate(item.to)}
                className={[
                  'group flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.81rem] font-medium whitespace-nowrap relative',
                  'transition-all duration-250 border',
                  pathname === item.to
                    ? 'text-white -translate-y-px'
                    : 'text-white/55 hover:text-white/95 border-transparent',
                ].join(' ')}
                style={pathname === item.to ? { background: 'hsla(83,50%,55%,0.18)', borderColor: 'hsla(83,50%,55%,0.40)' } : undefined}
                onMouseEnter={e => { if (pathname !== item.to) e.currentTarget.style.background = 'hsla(0,0%,100%,0.07)' }}
                onMouseLeave={e => { if (pathname !== item.to) e.currentTarget.style.background = '' }}
              >
                <item.icon size={14} className="flex-shrink-0 transition-all duration-250"
                  style={pathname === item.to ? { color: 'hsl(83,60%,75%)', opacity: 1 } : { opacity: 0.55 }} />
                <span>{item.label}</span>
                {pathname === item.to && (
                  <span className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-t-sm"
                    style={{ background: 'hsl(83,60%,70%)' }} />
                )}
              </button>
            ) : (
              // Item non implémenté — badge Soon, non cliquable
              <div
                key={item.to}
                title={item.label}
                className="group flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.81rem] font-medium whitespace-nowrap relative text-white/45 select-none"
                style={{ cursor: 'not-allowed' }}
              >
                <item.icon size={14} className="flex-shrink-0" style={{ opacity: 0.4 }} />
                <span>{item.label}</span>
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                  style={{ background: 'hsla(83,52%,50%,0.15)', color: 'hsl(83,60%,70%)', border: '1px solid hsla(83,52%,50%,0.25)' }}>
                  Soon
                </span>
              </div>
            )
          )}
        </nav>

        {/* Zone droite */}
        <div className="flex items-center gap-2.5 px-4 h-full flex-shrink-0"
          style={{ borderLeft: '1px solid hsla(0,0%,100%,0.07)' }}>
          <div className="hidden lg:flex flex-col items-end px-3 py-1.5 rounded-lg"
            style={{ background: 'hsla(0,0%,0%,0.22)', border: '1px solid hsla(0,0%,100%,0.07)', backdropFilter: 'blur(8px)' }}>
            <div className="flex items-center gap-1.5">
              <Database size={11} style={{ color: 'hsl(83,60%,70%)', opacity: 0.9 }} />
              <span className="text-white text-xs font-bold tracking-wide">Module SCAR</span>
            </div>
            <span className="hidden xl:block text-[0.6rem] mt-0.5 tracking-wide" style={{ color: 'hsla(0,0%,100%,0.40)' }}>
              En intégration
            </span>
          </div>
          <button
            onClick={() => navigate('/')}
            title="Retour à l'accueil"
            className="group flex items-center gap-2 px-4 py-2 text-[0.8rem] font-semibold text-white rounded-lg whitespace-nowrap transition-all duration-250"
            style={{ background: 'linear-gradient(135deg, hsl(83,54%,30%) 0%, hsl(83,52%,42%) 55%, hsl(83,55%,52%) 100%)', boxShadow: '0 2px 12px hsla(83,55%,50%,0.45), inset 0 1px 0 hsla(0,0%,100%,0.18)', border: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px hsla(83,55%,50%,0.55), inset 0 1px 0 hsla(0,0%,100%,0.22)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px hsla(83,55%,50%,0.45), inset 0 1px 0 hsla(0,0%,100%,0.18)' }}
          >
            <ArrowLeft size={13} className="flex-shrink-0 transition-transform duration-300 group-hover:-translate-x-1" />
            <span className="hidden sm:inline">Accueil</span>
          </button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="flex-1 overflow-y-auto w-full relative" style={{ scrollbarWidth: 'thin' }}>
        <div className="px-8 py-10 max-w-7xl mx-auto space-y-14">

          {/* ── Section 0 : Vue d'ensemble — Titre ── */}
          <section>
            <div
              className="bg-white rounded-xl px-7 py-5 flex items-start justify-between gap-4 flex-wrap"
              style={{
                border: '1px solid hsl(0,0%,92%)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              }}
            >
              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-gray-800">Vue d'ensemble</h1>
                <p className="text-sm text-gray-500 max-w-3xl leading-relaxed">
                  Panorama consolidé des 34 marchés africains analysés par Atlantic Re — indicateurs macroéconomiques,
                  performance assurantielle, cadre réglementaire et cartographie stratégique Reach 2030.
                </p>
              </div>
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 self-start mt-1"
                style={{
                  background: 'hsla(83,52%,42%,0.12)',
                  color: 'hsl(83,52%,30%)',
                  border: '1px solid hsla(83,52%,42%,0.30)',
                }}
              >
                Modélisation · Axe II
              </span>
            </div>
          </section>

          {/* ── Section 1 : Bandeau + KPI Cards ── */}
          <section>
            {/* Bandeau stats */}
            <div className="flex items-center gap-6 mb-8 flex-wrap">
              <div className="flex items-center gap-2">
                <Globe2 size={18} style={{ color: 'hsl(83,52%,42%)' }} />
                <span className="text-2xl font-bold text-gray-800">
                  {loading ? <Skeleton w="40px" h={24} /> : (stats?.nb_pays ?? 34)}
                </span>
                <span className="text-sm text-gray-500 font-medium">Marchés suivis</span>
              </div>
              <span className="text-gray-300">·</span>
              <div className="flex items-center gap-2">
                <Map size={16} style={{ color: 'hsl(83,40%,55%)' }} />
                <span className="text-lg font-semibold text-gray-700">
                  {loading ? <Skeleton w="20px" h={20} /> : (stats?.regions.length ?? 7)}
                </span>
                <span className="text-sm text-gray-500">Régions</span>
              </div>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-gray-400">Données 2022–2024</span>

              {error && (
                <span className="text-xs text-red-400 font-medium px-3 py-1 rounded-full bg-red-50 border border-red-100">
                  Erreur de chargement des données
                </span>
              )}
            </div>

            {/* 4 KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {CARD_CONFIG.map(cfg => (
                <KpiCard
                  key={cfg.key}
                  config={cfg}
                  stats={stats}
                  loading={loading}
                  onDetails={() => setOpenModal(cfg)}
                />
              ))}
            </div>
          </section>

          {/* ── Section 2 : Pourquoi l'Afrique ? ── */}
          <section>
            <div
              className="bg-white rounded-xl p-8"
              style={{
                borderLeft: '4px solid hsl(83,52%,42%)',
                border: '1px solid hsl(0,0%,92%)',
                borderLeftWidth: 4,
                borderLeftColor: 'hsl(83,52%,42%)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              }}
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span style={{ color: 'hsl(83,52%,42%)' }}>🌍</span>
                Pourquoi l'Afrique ?
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed text-[0.93rem]">
                <p>
                  Le marché africain de l'assurance Vie et Non-Vie est en transformation profonde.
                  La croissance démographique, l'urbanisation accélérée, les grands projets d'infrastructure
                  et la montée en puissance des risques climatiques créent une demande structurelle de
                  couverture assurantielle que les capacités locales peinent à satisfaire seules. Cette
                  situation génère un besoin de réassurance que des acteurs comme Atlantic Re sont en
                  position de capter, à condition de disposer d'une information fiable et d'un outil de
                  priorisation stratégique des marchés <span className="text-gray-400">(Guerard et al., 2021)</span>.
                </p>
                <p>
                  C'est précisément dans ce cadre que s'inscrit le plan stratégique Reach2030 d'Atlantic Re,
                  qui fixe l'expansion africaine comme axe de croissance prioritaire à l'horizon 2030. Avec
                  un ratio de solvabilité S2 établi à{' '}
                  <span className="font-semibold text-gray-800">215%</span> et un ROE de{' '}
                  <span className="font-semibold text-gray-800">13,4%</span> pour l'exercice 2025, Atlantic
                  Re dispose d'une assise financière solide pour financer cette expansion, tout en maintenant
                  une discipline technique illustrée par un ratio combiné de{' '}
                  <span className="font-semibold text-gray-800">92,3%</span>. La couverture actuelle de plus
                  de <span className="font-semibold text-gray-800">60 pays</span> et un portefeuille dépassant{' '}
                  <span className="font-semibold text-gray-800">400 clients</span> témoignent de la capacité
                  opérationnelle du réassureur à opérer dans des environnements réglementaires et économiques variés.
                </p>
              </div>
            </div>
          </section>

          {/* ── Section 3 : Pourquoi 34 pays ? ── */}
          <section>
            <div
              className="bg-white rounded-xl p-8"
              style={{
                border: '1px solid hsl(0,0%,92%)',
                borderLeftWidth: 4,
                borderLeftColor: 'hsl(30,70%,55%)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              }}
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>🗂️</span>
                Pourquoi 34 pays seulement ?
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed text-[0.93rem]">
                <p>
                  Le périmètre d'analyse a été construit à partir d'un univers initial de{' '}
                  <span className="font-semibold text-gray-800">54 pays africains</span>, réduit à{' '}
                  <span className="font-semibold text-gray-800">34 marchés</span> après application
                  de deux filtres successifs.
                </p>
                <div className="pl-4 border-l-2 border-red-200 space-y-1">
                  <p className="font-semibold text-gray-700">Exclusion pour instabilité politique et sécuritaire</p>
                  <p>
                    Certains pays ont été écartés en raison d'un contexte de conflit armé, d'effondrement
                    institutionnel ou d'une instabilité chronique rendant toute activité de réassurance
                    impossible ou non-rentable : <span className="text-gray-500">Soudan, Somalie, Libye,
                    Zimbabwe, République Centrafricaine, Guinée-Bissau, Érythrée.</span>
                  </p>
                </div>
                <div className="pl-4 border-l-2 border-amber-200 space-y-1">
                  <p className="font-semibold text-gray-700">Exclusion pour données manquantes ou non fiables</p>
                  <p>
                    Les pays dont les données de marché assurantiel sont absentes ou fragmentaires sur la
                    période 2015–2024 ont été exclus : <span className="text-gray-500">Sierra Leone,
                    Seychelles, Sao Tomé-et-Principe, Djibouti, Comores, Guinée équatoriale.</span>
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-500 pt-1">
                  Cette sélection aboutit à un panel de 34 pays représentant plus de{' '}
                  <span className="text-gray-700 font-semibold">85% du PIB africain</span> et plus de{' '}
                  <span className="text-gray-700 font-semibold">90% du volume total de primes</span> d'assurance du continent.
                </p>
              </div>
            </div>
          </section>

          {/* ── Section 3b : Analyse Synergique — module card ── */}
          <section>
            <div
              className="bg-white rounded-xl p-6 flex items-start gap-5"
              style={{
                border: '2px solid hsl(43,96%,48%)',
                background: 'hsla(43,96%,48%,0.03)',
                boxShadow: '0 4px 20px hsla(43,96%,48%,0.10)',
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, hsl(43,96%,48%), hsl(35,88%,50%))', boxShadow: '0 4px 12px hsla(43,96%,48%,0.35)' }}
              >
                <Combine size={22} style={{ color: 'white' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h2 className="text-lg font-bold" style={{ color: 'hsl(35,88%,38%)' }}>
                    Analyse Synergique
                  </h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'hsla(43,96%,48%,0.15)', color: 'hsl(35,88%,38%)', border: '1px solid hsla(43,96%,48%,0.35)' }}
                  >
                    Axe 1 × Axe 2
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'hsla(43,96%,48%,0.10)', color: 'hsl(43,96%,48%)', border: '1px solid hsla(43,96%,48%,0.25)' }}
                  >
                    NOUVEAU
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Vue croisée Portefeuille Interne × Marchés Africains. Mesurez la pénétration réelle
                  d'Atlantic Re dans chaque marché africain en croisant les données internes de souscription
                  avec les volumes de primes de marché externes.
                </p>
                <button
                  onClick={() => navigate('/analyse-synergie')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, hsl(43,96%,48%), hsl(35,88%,50%))', boxShadow: '0 2px 12px hsla(43,96%,48%,0.35)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 18px hsla(43,96%,48%,0.45)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px hsla(43,96%,48%,0.35)' }}
                >
                  <Combine size={15} />
                  Accéder à l'Analyse Synergique →
                </button>
              </div>
            </div>
          </section>

          {/* ── Section 3c : Prédictions 2030 — module card ── */}
          <section>
            <div
              className="bg-white rounded-xl p-6 flex items-start gap-5"
              style={{
                border: '2px solid hsl(83,52%,42%)',
                background: 'hsla(83,52%,42%,0.03)',
                boxShadow: '0 4px 20px hsla(83,52%,42%,0.10)',
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, hsl(83,54%,28%), hsl(83,52%,42%))', boxShadow: '0 4px 12px hsla(83,52%,42%,0.35)' }}
              >
                <TrendingUp size={22} style={{ color: 'white' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h2 className="text-lg font-bold" style={{ color: 'hsl(83,52%,28%)' }}>
                    Prédictions 2030
                  </h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'hsla(83,52%,42%,0.15)', color: 'hsl(83,52%,30%)', border: '1px solid hsla(83,52%,42%,0.35)' }}
                  >
                    Axe 2 · Modélisation
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'hsla(83,52%,42%,0.10)', color: 'hsl(83,52%,42%)', border: '1px solid hsla(83,52%,42%,0.25)' }}
                  >
                    NOUVEAU
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Projections univariées à horizon 2030 sur 34 marchés africains.
                  3 modèles statistiques (linéaire, polynomial, lissage exponentiel), intervalles de confiance 95%, carte choroplèthe et export Excel.
                </p>
                <button
                  onClick={() => navigate('/modelisation/predictions')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, hsl(83,54%,28%), hsl(83,52%,42%))', boxShadow: '0 2px 12px hsla(83,52%,42%,0.35)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 18px hsla(83,52%,42%,0.45)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px hsla(83,52%,42%,0.35)' }}
                >
                  <TrendingUp size={15} />
                  Accéder aux Prédictions 2030 →
                </button>
              </div>
            </div>
          </section>

          {/* ── Section 3d : Monte Carlo — module card ── */}
          <section>
            <div
              className="bg-white rounded-xl p-6 flex items-start gap-5"
              style={{
                border: '2px solid hsl(270,55%,60%)',
                background: 'hsla(270,55%,60%,0.03)',
                boxShadow: '0 4px 20px hsla(270,55%,60%,0.10)',
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, hsl(270,60%,50%), hsl(270,55%,60%))', boxShadow: '0 4px 12px hsla(270,55%,60%,0.35)' }}
              >
                <Shuffle size={22} style={{ color: 'white' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h2 className="text-lg font-bold" style={{ color: 'hsl(270,60%,40%)' }}>
                    Monte Carlo
                  </h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'hsla(270,55%,60%,0.15)', color: 'hsl(270,60%,40%)', border: '1px solid hsla(270,55%,60%,0.35)' }}
                  >
                    Axe 2 · Modélisation
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'hsla(270,55%,60%,0.10)', color: 'hsl(270,55%,60%)', border: '1px solid hsla(270,55%,60%,0.25)' }}
                  >
                    NOUVEAU
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Simulations stochastiques avancées de type Monte Carlo. Évaluez la distribution des probabilités
                  des résultats futurs et modélisez les incertitudes sur les variables clés à l'horizon 2030.
                </p>
                <button
                  onClick={() => navigate('/modelisation/monte-carlo')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, hsl(270,60%,50%), hsl(270,55%,60%))', boxShadow: '0 2px 12px hsla(270,55%,60%,0.35)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 18px hsla(270,55%,60%,0.45)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px hsla(270,55%,60%,0.35)' }}
                >
                  <Shuffle size={15} />
                  Accéder à Monte Carlo →
                </button>
              </div>
            </div>
          </section>

          {/* ── Section 4 : Carte ── */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
              <Globe2 size={20} style={{ color: 'hsl(83,52%,42%)' }} />
              Cartographie des marchés suivis
            </h2>
            <AfriqueMap />
          </section>

      </div>

      {/* ── MODALE ── */}
      {openModal && stats && (
        <DetailsModal
          critere={openModal}
          stats={stats}
          onClose={() => setOpenModal(null)}
        />
      )}
    </>
  )
}
