/**
 * useVieInsights — Calculs d'insights dynamiques pour CartographieVie
 * Toutes les valeurs affichées viennent exclusivement des données réelles.
 * Pas de ratio S/P pour le secteur vie → focus sur pénétration, densité, CAGR, concentration SA.
 */
import { useMemo } from 'react'
import type { VieRow } from '../types/cartographie'
import type { InsightCardProps } from '../components/cartographie/InsightCard'

// ── Helpers locaux ────────────────────────────────────────────────────────────
function sum(arr: number[]): number { return arr.reduce((a, b) => a + b, 0) }
function avg(arr: number[]): number { return arr.length ? sum(arr) / arr.length : 0 }
function median(arr: number[]): number {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
function fmtPct(v: number, d = 1) { return `${v.toFixed(d)}%` }
function fmtMn(v: number) { return v >= 1000 ? `$${(v / 1000).toFixed(1)} Mrd` : `$${v.toFixed(0)}M` }
function fmtUsd(v: number) { return `$${v.toFixed(1)}/hab` }

// ── Agrégation par pays sur toutes les années ─────────────────────────────────
interface CountryStat {
  pays: string
  region: string
  primes: number         // moyenne
  penetration: number | null
  croissance: number | null
  densite: number | null
}

function aggregateByCountry(data: VieRow[]): CountryStat[] {
  const acc: Record<string, {
    pays: string; region: string
    primes: number[]; pen: number[]; grow: number[]; dens: number[]
  }> = {}
  for (const r of data) {
    if (!acc[r.pays]) acc[r.pays] = { pays: r.pays, region: r.region ?? 'Autre', primes: [], pen: [], grow: [], dens: [] }
    const e = acc[r.pays]
    if (r.primes_emises_mn_usd != null) e.primes.push(r.primes_emises_mn_usd)
    if (r.taux_penetration_pct != null) e.pen.push(r.taux_penetration_pct)
    if (r.croissance_primes_pct != null) e.grow.push(r.croissance_primes_pct)
    if (r.densite_assurance_usd != null) e.dens.push(r.densite_assurance_usd)
  }
  return Object.values(acc).map(e => ({
    pays: e.pays,
    region: e.region,
    primes: e.primes.length ? avg(e.primes) : 0,
    penetration: e.pen.length ? avg(e.pen) : null,
    croissance: e.grow.length ? avg(e.grow) : null,
    densite: e.dens.length ? avg(e.dens) : null,
  }))
}

// ── 1. INSIGHTS CARTE CHOROPLÈTHE ────────────────────────────────────────────
export function useVieChoroplethInsights(data: VieRow[]): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []
    const stats = aggregateByCountry(data)

    // Top 5 concentration
    const sorted = [...stats].sort((a, b) => b.primes - a.primes)
    const total = sum(stats.map(s => s.primes))
    const top5 = sorted.slice(0, 5)
    const top5Pct = total > 0 ? sum(top5.map(s => s.primes)) / total * 100 : 0

    // Dominance SA
    const sa = stats.find(s => s.pays === 'Afrique du Sud')
    const saPct = sa && total > 0 ? sa.primes / total * 100 : 0

    // Sous-pénétrés dynamiques (hors SA) : pénétration < médiane ET croissance > 5%
    const noSA = stats.filter(s => s.pays !== 'Afrique du Sud')
    const pensAvail = noSA.filter(s => s.penetration != null)
    const medPen = median(pensAvail.map(s => s.penetration as number))
    const underPen = pensAvail.filter(s =>
      (s.penetration ?? 0) < medPen &&
      (s.croissance ?? 0) > 5
    )

    // Pays le plus régulier en densité (évolution stable sur la période)
    const densVolByCountry: Record<string, number[]> = {}
    for (const r of data) {
      if (r.densite_assurance_usd == null) continue
      ;(densVolByCountry[r.pays] ??= []).push(r.densite_assurance_usd)
    }
    const densStable = Object.entries(densVolByCountry)
      .filter(([, vals]) => vals.length >= 3)
      .map(([pays, vals]) => ({
        pays,
        range: Math.max(...vals) - Math.min(...vals),
        avgDens: avg(vals),
      }))
      .filter(s => s.avgDens > 5) // marchés ayant une densité significative
      .sort((a, b) => a.range - b.range)
    const mostStable = densStable[0]

    return [
      {
        tone: 'green',
        icon: '🚀',
        value: `${underPen.length} marchés`,
        label: 'SOUS-PÉNÉTRÉS DYNAMIQUES',
        body: underPen.length
          ? `${underPen.map(s => s.pays).join(', ')} : pénétration < ${fmtPct(medPen)} (médiane) mais croissance > 5%. Opportunités vie à fort potentiel pour Atlantic Re.`
          : `Aucun marché ne remplit simultanément pénétration < médiane et croissance > 5% sur la période.`,
        badge: { text: '✓ Opportunités Vie Atlantic Re', kind: 'ok' },
        countryTags: underPen.map(s => s.pays),
      },
      {
        tone: top5Pct > 90 ? 'amber' : 'navy',
        icon: '🏭',
        value: `${top5Pct.toFixed(1)}%`,
        label: 'CONCENTRATION TOP 5',
        body: `${top5.map(s => s.pays).join(', ')} captent ${top5Pct.toFixed(1)}% des primes vie africaines. Marché extrêmement concentré — les dynamiques de réassurance vie sont portées par un nombre limité de marchés.`,
        badge: { text: top5Pct > 90 ? '⚠ Très concentré' : 'ℹ️ Concentration', kind: top5Pct > 90 ? 'warn' : 'info' },
        countryTags: top5.map(s => s.pays),
      },
      ...(mostStable ? [{
        tone: 'navy' as InsightCardProps['tone'],
        icon: '🛡️',
        value: mostStable.pays,
        label: 'MARCHÉ DENSITÉ LA PLUS STABLE',
        body: `${mostStable.pays} affiche la progression de densité la plus régulière avec un écart max–min de $${mostStable.range.toFixed(1)}/hab (moy. ${fmtUsd(mostStable.avgDens)}). Portefeuille vie prévisible — risque de réassurance maîtrisé pour Atlantic Re.`,
        badge: { text: '✓ Stabilité densité', kind: 'ok' as const },
        countryTags: [mostStable.pays],
      } as InsightCardProps] : []),
    ] satisfies InsightCardProps[]
  }, [data])
}

// ── 2. INSIGHTS SCATTER MULTI-AXES (adapté vie) ───────────────────────────────
export function computeVieScatterInsights(
  xKey: string,
  yKey: string,
  data: VieRow[]
): InsightCardProps[] {
  const stats = aggregateByCountry(data)
  const noSA = stats.filter(s => s.pays !== 'Afrique du Sud')
  const sa = stats.find(s => s.pays === 'Afrique du Sud')

  // Motion 1 : Pénétration vs Densité
  if ((xKey === 'penetration' && yKey === 'densite') || (xKey === 'densite' && yKey === 'penetration')) {
    const withPD = noSA.filter(s => s.penetration != null && s.densite != null)
    const top2Pen = [...withPD].sort((a, b) => (b.penetration ?? 0) - (a.penetration ?? 0)).slice(0, 2)
    const emerg = withPD.filter(s => (s.penetration ?? 1) < 0.5 && (s.croissance ?? 0) > 10)
    const medDens = median(withPD.map(s => s.densite as number))
    const saDens = sa?.densite ?? 0
    const facteur = medDens > 0 ? saDens / medDens : 0
    return [
      {
        tone: 'green', icon: '🏅', label: 'LEADERS PÉNÉTRATION VIE',
        value: top2Pen.map(s => s.pays).join(' · '),
        body: top2Pen.length >= 2
          ? `Top pénétration vie moy: ${fmtPct(top2Pen[0].penetration ?? 0, 2)} / ${fmtPct(top2Pen[1].penetration ?? 0, 2)}. Densité: ${fmtUsd(top2Pen[0].densite ?? 0)} / ${fmtUsd(top2Pen[1].densite ?? 0)}.`
          : 'Données insuffisantes.',
        countryTags: top2Pen.map(s => s.pays),
      },
      {
        tone: 'navy', icon: '⚡', label: 'ÉMERGENTS VIE RAPIDES',
        value: `${emerg.length} pays`,
        body: emerg.length
          ? `${emerg.slice(0, 5).map(s => s.pays).join(', ')} : pénétration vie < 0,5% mais croissance > 10%. Marchés vie à fort potentiel de développement.`
          : 'Aucun marché n\'affiche simultanément pénétration vie < 0,5% et croissance > 10%.',
        countryTags: emerg.slice(0, 5).map(s => s.pays),
      },
      {
        tone: 'amber', icon: '🌍', label: 'ÉCART AFRIQUE DU SUD',
        value: `x${facteur.toFixed(0)}`,
        body: `La densité vie de l'Afrique du Sud est ${facteur.toFixed(1)}× supérieure à la médiane des autres marchés africains (${fmtUsd(saDens)} vs ${fmtUsd(medDens)}). Illustration du fossé structurel North/South.`,
        countryTags: ['Afrique du Sud'],
      },
    ]
  }

  // Motion 2 : Croissance vs Densité
  if ((xKey === 'croissance' && yKey === 'densite') || (xKey === 'densite' && yKey === 'croissance')) {
    const withDG = noSA.filter(s => s.densite != null && s.croissance != null)
    const medDens = median(withDG.map(s => s.densite as number))
    const medGrow = median(withDG.map(s => s.croissance as number))
    const top3 = [...withDG]
      .filter(s => (s.densite ?? 0) >= medDens)
      .sort((a, b) => (b.croissance ?? 0) - (a.croissance ?? 0)).slice(0, 3)
    const matures = withDG.filter(s => (s.densite ?? 0) > medDens && (s.croissance ?? 0) < 3)
    const potentials = withDG.filter(s => (s.densite ?? 0) < medDens && (s.croissance ?? 0) > medGrow)
    return [
      {
        tone: 'green', icon: '🥇', label: 'DENSITÉ + CROISSANCE VIE',
        value: top3.length ? top3.map(s => s.pays).slice(0, 2).join(' · ') : '—',
        body: top3.length
          ? `Top 3 hors SA avec densité ≥ médiane et forte croissance vie: ${top3.map(s => `${s.pays} (+${fmtPct(s.croissance ?? 0)})`).join(', ')}.`
          : 'Données insuffisantes.',
        countryTags: top3.map(s => s.pays),
      },
      {
        tone: 'navy', icon: '🏛️', label: 'MARCHÉS VIE MATURES',
        value: `${matures.length} pays`,
        body: `${matures.length} marché${matures.length > 1 ? 's' : ''} à densité élevée (> médiane) mais croissance vie < 3%. Marchés arrivés à maturité — compétition renforcée dans la réassurance vie.`,
        countryTags: matures.slice(0, 4).map(s => s.pays),
      },
      {
        tone: 'amber', icon: '🌱', label: 'POTENTIELS ÉMERGENTS VIE',
        value: `${potentials.length} pays`,
        body: `${potentials.length} marché${potentials.length > 1 ? 's' : ''} à faible densité mais croissance vie > médiane (${fmtPct(medGrow)}). Capacité d'absorption de nouvelles polices vie élevée.`,
        countryTags: potentials.slice(0, 4).map(s => s.pays),
      },
    ]
  }

  // Motion 3 : Pénétration vs Croissance
  if ((xKey === 'penetration' && yKey === 'croissance') || (xKey === 'croissance' && yKey === 'penetration')) {
    const withPC = noSA.filter(s => s.penetration != null && s.croissance != null)
    const avgPen = avg(withPC.map(s => s.penetration as number))
    const avgGrow = avg(withPC.map(s => s.croissance as number))
    const oppo = withPC.filter(s => (s.penetration ?? 0) < avgPen && (s.croissance ?? 0) > avgGrow)
    const leaders = withPC.filter(s => (s.penetration ?? 0) > avgPen && (s.croissance ?? 0) > avgGrow)
    const decel = withPC.filter(s => (s.penetration ?? 0) > avgPen && (s.croissance ?? 0) < 0)
    return [
      {
        tone: 'green', icon: '🎯', label: 'OPPORTUNITÉS VIE CLÉS',
        value: `${oppo.length} marchés`,
        body: `Pénétration vie < ${fmtPct(avgPen, 2)} (moy) ET croissance > ${fmtPct(avgGrow)} (moy). Marchés vie sous-pénétrés mais en expansion : priorité Atlantic Re.`,
        countryTags: oppo.map(s => s.pays),
        badge: { text: '✓ Cible Vie Atlantic Re', kind: 'ok' },
      },
      {
        tone: 'navy', icon: '🏆', label: 'LEADERS VIE CONSOLIDÉS',
        value: `${leaders.length} pays`,
        body: `Pénétration vie > ${fmtPct(avgPen, 2)} ET croissance > ${fmtPct(avgGrow)}. Marchés vie matures et dynamiques : concurrence élevée dans la réassurance.`,
        countryTags: leaders.map(s => s.pays),
      },
      {
        tone: 'amber', icon: '⚠️', label: 'EN DÉCÉLÉRATION',
        value: `${decel.length} pays`,
        body: decel.length
          ? `${decel.map(s => s.pays).join(', ')} : pénétration vie élevée mais croissance négative. Marchés vie en contraction à surveiller.`
          : 'Aucun marché en décélération (pénétration vie élevée + croissance négative) détecté.',
        badge: { text: decel.length ? '⚠ Vigilance' : '✓ Stable', kind: decel.length ? 'warn' : 'ok' },
        countryTags: decel.map(s => s.pays),
      },
    ]
  }

  // Motion 4 : Densité vs Pénétration (déjà couvert mais au sens inverse)
  // Fallback générique
  const vals = noSA.filter(s => s[xKey as keyof CountryStat] != null && s[yKey as keyof CountryStat] != null)
  const xVals = vals.map(s => s[xKey as keyof CountryStat] as number)
  const yVals = vals.map(s => s[yKey as keyof CountryStat] as number)
  const topX = [...vals].sort((a, b) => (b[xKey as keyof CountryStat] as number) - (a[xKey as keyof CountryStat] as number)).slice(0, 3)
  const topY = [...vals].sort((a, b) => (b[yKey as keyof CountryStat] as number) - (a[yKey as keyof CountryStat] as number)).slice(0, 3)
  return [
    {
      tone: 'navy', icon: '📊', label: `TOP AXE X`,
      value: topX[0]?.pays ?? '—',
      body: `Leader sur l'axe X parmi les pays hors SA. Moy: ${avg(xVals).toFixed(1)}.`,
      countryTags: topX.map(s => s.pays),
    },
    {
      tone: 'green', icon: '📈', label: `TOP AXE Y`,
      value: topY[0]?.pays ?? '—',
      body: `Leader sur l'axe Y parmi les pays hors SA. Moy: ${avg(yVals).toFixed(1)}.`,
      countryTags: topY.map(s => s.pays),
    },
    {
      tone: 'amber', icon: '🌍', label: 'VUE ENSEMBLE VIE',
      value: `${vals.length} pays`,
      body: `${vals.length} pays disposent de données vie pour les deux axes sélectionnés. Faites varier les axes pour des insights spécifiques.`,
    },
  ]
}

// ── 3. INSIGHTS TOP 10 VIE ────────────────────────────────────────────────────
export function useVieTop10Insights(data: VieRow[], yearOrAvg: number | 'avg'): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []
    const source = yearOrAvg === 'avg' ? data : data.filter(r => r.annee === yearOrAvg)
    const totAll = sum(source.map(r => r.primes_emises_mn_usd ?? 0))

    const byCountry: Record<string, { primes: number; region: string }> = {}
    for (const r of source) {
      if (r.primes_emises_mn_usd == null) continue
      if (!byCountry[r.pays]) byCountry[r.pays] = { primes: 0, region: r.region ?? 'Autre' }
      byCountry[r.pays].primes += r.primes_emises_mn_usd
    }
    const ranked = Object.entries(byCountry)
      .map(([pays, { primes, region }]) => ({ pays, primes, region }))
      .sort((a, b) => b.primes - a.primes)
    const top10 = ranked.slice(0, 10)
    const top10Primes = sum(top10.map(r => r.primes))
    const top10Pct = totAll > 0 ? top10Primes / totAll * 100 : 0

    // SA vs reste
    const saPrimes = byCountry['Afrique du Sud']?.primes ?? 0
    const saPct = totAll > 0 ? saPrimes / totAll * 100 : 0

    // 1er challenger hors SA
    const rankedNoSA = ranked.filter(r => r.pays !== 'Afrique du Sud')
    const challenger = rankedNoSA[0]
    const challengerRatio = challenger && saPrimes > 0 ? saPrimes / challenger.primes : null

    // Afrique Est — moteur émergent
    const estCountries = aggregateByCountry(data.filter(r => r.region === 'Afrique Est'))
    const avgPenEst = avg(estCountries.map(s => s.penetration ?? 0).filter(v => v > 0))

    return [
      {
        tone: 'red',
        icon: '🇿🇦',
        value: `${saPct.toFixed(1)}%`,
        label: 'ULTRA-DOMINATION AFRIQUE DU SUD',
        body: `L'Afrique du Sud génère ${saPct.toFixed(1)}% des primes vie africaines (${fmtMn(saPrimes)}). Le reste du continent (${top10Pct < 100 ? (100 - saPct).toFixed(1) : '—'}%) se partage entre 33 pays — une concentration inédite dans l'assurance mondiale.`,
        badge: { text: '⚠ Concentration extrême', kind: 'alert' },
        countryTags: ['Afrique du Sud'],
      },
      {
        tone: 'green',
        icon: '🥈',
        value: challenger?.pays ?? '—',
        label: 'CHALLENGERS HORS AFRIQUE DU SUD',
        body: challenger
          ? `${challenger.pays} est le 1er marché vie hors Afrique du Sud avec ${fmtMn(challenger.primes)}.${challengerRatio != null ? ` L'Afrique du Sud génère ×${challengerRatio.toFixed(1)} plus de primes — écart structurel majeur.` : ''}`
          : 'Données insuffisantes.',
        countryTags: rankedNoSA.slice(0, 4).map(r => r.pays),
        badge: { text: challengerRatio != null ? `×${challengerRatio.toFixed(0)} vs SA` : '—', kind: 'info' },
      },
      {
        tone: 'amber',
        icon: '🎯',
        value: avgPenEst > 0 ? `${fmtPct(avgPenEst, 2)} moy.` : '< 0,5%',
        label: 'OPPORTUNITÉ AFRIQUE EST',
        body: `L'Afrique Est (Kenya, Tanzanie, Ouganda, Éthiopie…) affiche une pénétration vie moyenne de ${avgPenEst > 0 ? fmtPct(avgPenEst, 2) : '< 0,5%'} du PIB malgré une dynamique économique favorable — potentiel de développement important de la réassurance vie.`,
        badge: { text: 'Potentiel vie', kind: 'info' },
        countryTags: estCountries.map(s => s.pays).slice(0, 5),
      },
    ] satisfies InsightCardProps[]
  }, [data, yearOrAvg])
}

// ── 4. INSIGHTS ÉVOLUTION RÉGIONALE (CAGR 2015–2024) ─────────────────────────
export function useVieEvolutionInsights(data: VieRow[]): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []

    const years = [...new Set(data.map(r => r.annee))].sort((a, b) => a - b)
    const minYear = years[0] ?? 2015
    const maxYear = years[years.length - 1] ?? 2024
    const nYears = maxYear - minYear || 1

    const byRegionYear: Record<string, Record<number, number>> = {}
    for (const r of data) {
      if (r.pays === 'Afrique du Sud') continue // exclure SA de l'analyse régionale
      const reg = r.region ?? 'Autre'
      if (!byRegionYear[reg]) byRegionYear[reg] = {}
      byRegionYear[reg][r.annee] = (byRegionYear[reg][r.annee] ?? 0) + (r.primes_emises_mn_usd ?? 0)
    }

    interface RegStat {
      region: string
      v0: number
      v1: number
      cagr: number
      cagrPost2020: number | null
    }

    const stats: RegStat[] = Object.keys(byRegionYear).map(reg => {
      const yrMap = byRegionYear[reg]
      const v0 = yrMap[minYear] ?? 0
      const v1 = yrMap[maxYear] ?? 0
      const cagr = v0 > 0 && v1 > 0 ? (Math.pow(v1 / v0, 1 / nYears) - 1) * 100 : 0

      const v2020 = yrMap[2020] ?? 0
      const nPost = maxYear - 2020 || 1
      const cagrPost2020 = v2020 > 0 && v1 > 0 ? (Math.pow(v1 / v2020, 1 / nPost) - 1) * 100 : null

      return { region: reg, v0, v1, cagr, cagrPost2020 }
    })

    const v0Values = stats.map(s => s.v0).filter(v => v > 0).sort((a, b) => a - b)
    const p25 = v0Values[Math.floor(v0Values.length * 0.25)] ?? 0
    const lowBaseRegions = stats.filter(s => s.v0 <= p25 || s.v0 < 50)
    const baseFaible = [...lowBaseRegions].sort((a, b) => b.cagr - a.cagr)[0]

    const otherRegions = stats.filter(s => s.region !== baseFaible?.region)
    const mostDynamic = [...otherRegions].sort((a, b) => b.cagr - a.cagr)[0]

    const withPost = stats.filter(s => s.cagrPost2020 != null)
    const mostAccelerated = [...withPost].sort((a, b) => (b.cagrPost2020 ?? 0) - (a.cagrPost2020 ?? 0))[0]

    const cards: InsightCardProps[] = []

    if (mostDynamic) {
      cards.push({
        tone: 'green',
        icon: '🚀',
        value: mostDynamic.region,
        label: 'RÉGION VIE LA PLUS DYNAMIQUE',
        body: `${mostDynamic.region} affiche la croissance annuelle réelle la plus forte hors base faible (hors SA) : +${mostDynamic.cagr.toFixed(1)}%/an sur ${minYear}–${maxYear}. Volume : ${fmtMn(mostDynamic.v0)} → ${fmtMn(mostDynamic.v1)}.`,
        badge: { text: '✓ Leader croissance vie', kind: 'ok' },
      })
    }

    if (baseFaible) {
      cards.push({
        tone: 'amber',
        icon: '⚠️',
        value: baseFaible.region,
        label: 'CROISSANCE VIE SUR BASE FAIBLE',
        body: `Croissance vie de +${baseFaible.cagr.toFixed(1)}%/an sur ${minYear}–${maxYear}, mais sur une base de départ quasi-nulle (${fmtMn(baseFaible.v0)} → ${fmtMn(baseFaible.v1)}). Volume insuffisant pour être actionnable pour Atlantic Re à court terme. À surveiller.`,
        badge: { text: '⚠ Effet base — non actionnable', kind: 'warn' },
      })
    }

    if (mostAccelerated) {
      cards.push({
        tone: 'navy',
        icon: '📊',
        value: mostAccelerated.region,
        label: 'ACCÉLÈRE POST-2020',
        body: `${mostAccelerated.region} a accéléré après 2020 : +${(mostAccelerated.cagrPost2020 ?? 0).toFixed(1)}%/an depuis 2020, contre +${mostAccelerated.cagr.toFixed(1)}%/an sur la période complète. Signal de dynamisme récent à considérer pour Atlantic Re.`,
        badge: { text: '📌 Dynamisme récent', kind: 'info' },
      })
    }

    return cards
  }, [data])
}

// ── 5. INSIGHTS STRUCTURE RÉGIONALE VIE ──────────────────────────────────────
export function useVieStructureInsights(
  data: VieRow[],
  yearOrAvg: number | 'avg'
): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []
    const source = yearOrAvg === 'avg' ? data : data.filter(r => r.annee === yearOrAvg)

    const totAll = sum(source.map(r => r.primes_emises_mn_usd ?? 0))
    const totSA = sum(source.filter(r => r.pays === 'Afrique du Sud').map(r => r.primes_emises_mn_usd ?? 0))
    const saPct = totAll > 0 ? totSA / totAll * 100 : 0
    const n = yearOrAvg === 'avg' ? (new Set(data.map(r => r.annee)).size || 1) : 1

    const accReg: Record<string, number> = {}
    for (const r of source.filter(r => r.pays !== 'Afrique du Sud')) {
      const reg = r.region ?? 'Autre'
      accReg[reg] = (accReg[reg] ?? 0) + (r.primes_emises_mn_usd ?? 0)
    }
    const totHorsSA = sum(Object.values(accReg))
    const sortedReg = Object.entries(accReg).sort((a, b) => b[1] - a[1])
    const top2 = sortedReg.slice(0, 2)
    const top2Pct = totHorsSA > 0 ? sum(top2.map(([, v]) => v)) / totHorsSA * 100 : 0
    const rest = 100 - top2Pct

    const minorRegions = sortedReg.filter(([, v]) => (v / totHorsSA) * 100 <= 10)
    const minorPct = totHorsSA > 0 ? sum(minorRegions.map(([, v]) => v)) / totHorsSA * 100 : 0

    return [
      {
        tone: 'amber',
        icon: '🧩',
        value: `${minorRegions.length} régions`,
        label: 'FRAGILITÉ DE LA LONGUE TRAÎNE VIE',
        body: minorRegions.length 
          ? `${minorRegions.map(([name]) => name).join(', ')} peinent à faire décoller leur branche Vie (moins de 10% de part de marché hors SA chacune). Elles ne cumulent que ${minorPct.toFixed(1)}% du volume, reflétant une culture de l'assurance vie encore très naissante dans ces zones.`
          : 'Aucune région n\'est sous la barre des 10% de part de marché.',
        badge: { text: 'Culture vie naissante', kind: 'warn' },
        countryTags: minorRegions.map(([name]) => name),
      },
      {
        tone: 'navy',
        icon: '🥈',
        value: top2.length >= 2 ? `${top2[0][0]} + ${top2[1][0]}` : top2[0]?.[0] ?? '—',
        label: 'TOP 2 RÉGIONS HORS AFRIQUE DU SUD',
        body: top2.length >= 2
          ? `${top2[0][0]} : ${((top2[0][1] / totHorsSA) * 100).toFixed(1)}% du marché vie hors SA. ${top2[1][0]} : ${((top2[1][1] / totHorsSA) * 100).toFixed(1)}% du marché vie hors SA.`
          : 'Données régionales insuffisantes.',
        countryTags: top2.map(([name]) => name),
      },
      {
        tone: 'amber',
        icon: '📦',
        value: `${sortedReg.length} régions`,
        label: 'CONCENTRATION HORS AFRIQUE DU SUD',
        body: top2.length >= 2
          ? `${top2[0][0]} et ${top2[1][0]} captent ensemble ${top2Pct.toFixed(1)}% du marché vie résiduel. Les ${Math.max(0, sortedReg.length - 2)} autres régions se partagent seulement ${rest.toFixed(1)}%.`
          : 'Concentration régionale non calculable.',
        badge: { text: `${top2Pct.toFixed(0)}% top 2`, kind: top2Pct > 70 ? 'warn' : 'info' },
      },
    ] satisfies InsightCardProps[]
  }, [data, yearOrAvg])
}

// ── 6. INSIGHTS DISTRIBUTION PÉNÉTRATION PAR RÉGION ──────────────────────────
export function useViePenetrationDistributionInsights(data: VieRow[]): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []

    // Médiane de pénétration par pays → agrégation par région
    const penByCountry: Record<string, { region: string; vals: number[] }> = {}
    for (const r of data) {
      if (r.taux_penetration_pct == null) continue
      const reg = r.region ?? 'Autre'
      if (!penByCountry[r.pays]) penByCountry[r.pays] = { region: reg, vals: [] }
      penByCountry[r.pays].vals.push(r.taux_penetration_pct)
    }

    const medianByCountry: Record<string, { region: string; med: number }> = {}
    for (const [pays, { region, vals }] of Object.entries(penByCountry)) {
      medianByCountry[pays] = { region, med: median(vals) }
    }

    const regionStats: Record<string, { meds: number[]; countries: string[] }> = {}
    for (const [pays, { region, med }] of Object.entries(medianByCountry)) {
      ;(regionStats[region] ??= { meds: [], countries: [] }).meds.push(med)
      regionStats[region].countries.push(pays)
    }

    interface RegPenStat {
      region: string
      medianPen: number
      range: number
      countries: string[]
    }

    const regList: RegPenStat[] = Object.entries(regionStats).map(([region, { meds, countries }]) => ({
      region,
      medianPen: median(meds),
      range: meds.length > 1 ? Math.max(...meds) - Math.min(...meds) : 0,
      countries: countries.sort(),
    }))

    // Région la plus pénétrée (hors SA)
    const noSAReg = regList.filter(r => r.region !== 'Afrique du Sud')
    const mostPenetrated = [...noSAReg].sort((a, b) => b.medianPen - a.medianPen)[0]

    // Région la moins pénétrée (potentiel)
    const leastPenetrated = [...noSAReg].sort((a, b) => a.medianPen - b.medianPen)[0]

    // Région la plus volatile (range le plus élevé, ≥2 pays)
    const candidatesVol = noSAReg.filter(r => regionStats[r.region].meds.length >= 2)
    const mostVolatile = [...candidatesVol].sort((a, b) => b.range - a.range)[0]

    const cards: InsightCardProps[] = []

    if (mostPenetrated) {
      cards.push({
        tone: 'navy',
        icon: '🏆',
        value: mostPenetrated.region,
        label: 'RÉGION LA PLUS PÉNÉTRÉE',
        body: `Médiane de pénétration vie : ${fmtPct(mostPenetrated.medianPen, 2)} sur 2015–2024. Marché vie le plus développé hors Afrique du Sud — forte présence des acteurs locaux et de bancassurance.`,
        badge: { text: '✓ Marché vie mature', kind: 'ok' },
        countryTags: mostPenetrated.countries.slice(0, 5),
      })
    }

    if (leastPenetrated) {
      cards.push({
        tone: 'green',
        icon: '🚀',
        value: leastPenetrated.region,
        label: 'PLUS FORT POTENTIEL DE PÉNÉTRATION',
        body: `Médiane de pénétration vie : ${fmtPct(leastPenetrated.medianPen, 2)} — la plus faible parmi les régions. Capacité d'absorption des produits vie très élevée. Cible de développement stratégique pour Atlantic Re.`,
        badge: { text: '✓ Potentiel vie maximal', kind: 'ok' },
        countryTags: leastPenetrated.countries.slice(0, 5),
      })
    }

    if (mostVolatile) {
      cards.push({
        tone: 'amber',
        icon: '⚠️',
        value: mostVolatile.region,
        label: 'RÉGION LA PLUS HÉTÉROGÈNE',
        body: `Écart de pénétration vie entre pays de cette région : ${fmtPct(mostVolatile.range, 2)} (max–min). Forte hétérogénéité intra-régionale — les marchés de cette zone requièrent une analyse pays par pays avant engagement Atlantic Re.`,
        badge: { text: '⚠ Hétérogénéité élevée', kind: 'warn' },
        countryTags: mostVolatile.countries.slice(0, 6),
      })
    }

    return cards
  }, [data])
}

// ── 7. INSIGHTS PROFIL PAYS VIE ────────────────────────────────────────────
export function useVieCountryInsights(
  data: VieRow[],
  country: string
): { cards: InsightCardProps[]; region: string; coverage: string } {
  return useMemo(() => {
    const empty = { cards: [] as InsightCardProps[], region: '', coverage: '' }
    if (!data.length || !country) return empty

    const cRows = data.filter(r => r.pays === country).sort((a, b) => a.annee - b.annee)
    if (!cRows.length) return empty

    const region = cRows[0].region ?? 'Autre'
    const allYears = cRows.map(r => r.annee)
    const minYear = allYears[0]
    const maxYear = allYears[allYears.length - 1]
    const nYears = maxYear - minYear || 1
    const coverage = `${minYear}-${maxYear}`

    // Primes
    const primesRows = cRows.filter(r => r.primes_emises_mn_usd != null)
    const v0 = primesRows[0]?.primes_emises_mn_usd ?? 0
    const v1 = primesRows[primesRows.length - 1]?.primes_emises_mn_usd ?? 0
    const cagrPrimes = v0 > 0 && v1 > 0 ? (Math.pow(v1 / v0, 1 / nYears) - 1) * 100 : 0
    const primesVals = primesRows.map(r => r.primes_emises_mn_usd as number)
    const peakPrimes = primesVals.length ? Math.max(...primesVals) : 0
    const floorPrimes = primesVals.length ? Math.min(...primesVals) : 0

    // Parts de marché continental
    const allMaxYear = data.filter(r => r.annee === maxYear)
    const allMinYear = data.filter(r => r.annee === minYear)
    const totContMax = allMaxYear.reduce((s, r) => s + (r.primes_emises_mn_usd ?? 0), 0)
    const totContMin = allMinYear.reduce((s, r) => s + (r.primes_emises_mn_usd ?? 0), 0)
    const shareCont = totContMax > 0 ? v1 / totContMax * 100 : 0
    const shareContStart = totContMin > 0 && v0 > 0 ? v0 / totContMin * 100 : 0
    const shareContDelta = shareCont - shareContStart

    // Part régionale
    const regMaxYear = allMaxYear.filter(r => r.region === region)
    const totReg = regMaxYear.reduce((s, r) => s + (r.primes_emises_mn_usd ?? 0), 0)
    const shareReg = totReg > 0 ? v1 / totReg * 100 : 0

    // Rangs
    const primesRanked = [...allMaxYear]
      .filter(r => r.primes_emises_mn_usd != null)
      .sort((a, b) => (b.primes_emises_mn_usd ?? 0) - (a.primes_emises_mn_usd ?? 0))
    const rankContPrimes = primesRanked.findIndex(r => r.pays === country) + 1
    const totalContPrimes = primesRanked.length
    const regRanked = regMaxYear
      .filter(r => r.primes_emises_mn_usd != null)
      .sort((a, b) => (b.primes_emises_mn_usd ?? 0) - (a.primes_emises_mn_usd ?? 0))
    const rankRegPrimes = regRanked.findIndex(r => r.pays === country) + 1
    const totalRegPrimes = regRanked.length

    // Pénétration
    const penRows = cRows.filter(r => r.taux_penetration_pct != null)
    const penVals = penRows.map(r => r.taux_penetration_pct as number)
    const pen2024 = penVals.length ? penVals[penVals.length - 1] : 0
    const avgPen = penVals.length ? penVals.reduce((a, b) => a + b, 0) / penVals.length : 0
    const peakPen = penVals.length ? Math.max(...penVals) : 0
    const penTrend = penVals.length >= 2 ? penVals[penVals.length - 1] - penVals[0] : 0
    const avgPenByCountry: Record<string, number[]> = {}
    for (const r of data) {
      if (r.taux_penetration_pct == null) continue
      if (!avgPenByCountry[r.pays]) avgPenByCountry[r.pays] = []
      avgPenByCountry[r.pays].push(r.taux_penetration_pct)
    }
    const penRanked = Object.entries(avgPenByCountry)
      .map(([pays, vals]) => ({ pays, avgPen: vals.reduce((a, b) => a + b, 0) / vals.length }))
      .sort((a, b) => b.avgPen - a.avgPen)
    const rankPen = penRanked.findIndex(e => e.pays === country) + 1
    const totalPenRanked = penRanked.length

    // Densité
    const densRows = cRows.filter(r => r.densite_assurance_usd != null)
    const densVals = densRows.map(r => r.densite_assurance_usd as number)
    const dens2024 = densVals.length ? densVals[densVals.length - 1] : 0
    const avgDens = densVals.length ? densVals.reduce((a, b) => a + b, 0) / densVals.length : 0
    const densEvol = densVals.length >= 2 ? densVals[densVals.length - 1] - densVals[0] : 0
    const avgDensByCountry: Record<string, number[]> = {}
    for (const r of data) {
      if (r.densite_assurance_usd == null) continue
      if (!avgDensByCountry[r.pays]) avgDensByCountry[r.pays] = []
      avgDensByCountry[r.pays].push(r.densite_assurance_usd)
    }
    const densRanked = Object.entries(avgDensByCountry)
      .map(([pays, vals]) => ({ pays, avgDens: vals.reduce((a, b) => a + b, 0) / vals.length }))
      .sort((a, b) => b.avgDens - a.avgDens)
    const rankDens = densRanked.findIndex(e => e.pays === country) + 1
    const totalDensRanked = densRanked.length

    // Score d'attractivité spécifique vie
    const isLargeMarket = v1 >= 200
    const criteria: string[] = []
    let score = 0
    if (cagrPrimes >= 5) { score += 2; criteria.push(`+ Forte croissance vie (+${cagrPrimes.toFixed(1)}%/an) — marché dynamique`) }
    else if (cagrPrimes >= 0) { score += 1; criteria.push(`/ Croissance modérée vie (+${cagrPrimes.toFixed(1)}%/an)`) }
    else { score -= 1; criteria.push(`x Croissance vie limitée (${cagrPrimes.toFixed(1)}%/an) — marché sous pression`) }
    if (avgPen < 0.5) { score += 2; criteria.push(`+ Faible pénétration vie (${avgPen.toFixed(2)}%) — fort potentiel de développement`) }
    else if (avgPen < 2) { score += 1; criteria.push(`+ Pénétration vie modérée (${avgPen.toFixed(2)}%) — espace de croissance encore disponible`) }
    else { criteria.push(`/ Pénétration vie établie (${avgPen.toFixed(2)}%) — marché bien développé`) }
    if (avgDens > 10) { score += 1; criteria.push(`+ Densité vie significative ($${avgDens.toFixed(0)}/hab) — capacité de paiement des ménages avérée`) }
    if (isLargeMarket) {
      if (cagrPrimes < 1) criteria.push(`! Grand marché vie (${fmtMn(v1)}) mais croissance nulle — saturation, attention`)
      else criteria.push(`+ Grand marché vie (${fmtMn(v1)}) en croissance — marché prioritaire Atlantic Re`)
    }

    const criteriaFormatted = criteria.map(c => {
      if (c.startsWith('+ ')) return '\u2714 ' + c.slice(2)
      if (c.startsWith('x ')) return '\u2716 ' + c.slice(2)
      if (c.startsWith('! ')) return '\u26a0 ' + c.slice(2)
      if (c.startsWith('/ ')) return '\u26a0 ' + c.slice(2)
      return c
    })

    type Tone = InsightCardProps['tone']
    type BKind = NonNullable<InsightCardProps['badge']>['kind']

    const growthTone: Tone = cagrPrimes >= 5 ? 'green' : cagrPrimes >= 0 ? 'amber' : 'red'
    const growthBadgeKind: BKind = cagrPrimes >= 5 ? 'ok' : cagrPrimes >= 0 ? 'warn' : 'alert'
    const growthBadgeText = cagrPrimes >= 5 ? '\u2713 Croissance forte' : cagrPrimes >= 0 ? '\u26a0 Croissance modérée' : '\u274c Déclin'

    const penTone: Tone = avgPen < 0.5 ? 'green' : avgPen < 2 ? 'amber' : 'navy'
    const densLabel =
      rankDens > 0 && totalDensRanked > 0 && rankDens <= Math.ceil(totalDensRanked / 3) ? 'Densité vie élevée' :
        rankDens <= Math.ceil(totalDensRanked * 2 / 3) ? 'Densité vie dans la moyenne africaine' : 'Densité vie faible'

    const [attractLabel, attractTone, attractBadge, attractBadgeKind]: [string, Tone, string, BKind] =
      score >= 4 ? ['Très Attractif', 'green', '\u2713 Priorité Vie Atlantic Re', 'ok'] :
        score >= 2 ? ['Attractif', 'navy', '\u2713 Opportunité vie confirmée', 'ok'] :
          score >= 0 ? ['Potentiel Modéré', 'amber', isLargeMarket ? '\u26a0 Grand marché en saturation' : '\u26a0 Marché à surveiller', 'warn'] :
            ['Peu Attractif', 'red', '\u2716 Priorité faible', 'alert']

    const fmtV = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)} Mrd` : `$${v.toFixed(0)}M`
    const sgn = (v: number) => v >= 0 ? '+' : ''

    const cards: InsightCardProps[] = [
      {
        tone: growthTone, icon: '\ud83d\udcc8',
        value: `${sgn(cagrPrimes)}${cagrPrimes.toFixed(1)}%/an`,
        label: 'CROISSANCE ANNUELLE MOYENNE DES PRIMES VIE',
        body: `Volume ${minYear} : ${fmtV(v0)} \u2192 ${maxYear} : ${fmtV(v1)} (CAGR ${sgn(cagrPrimes)}${cagrPrimes.toFixed(1)}%/an). Pic historique : ${fmtV(peakPrimes)} \u00b7 Plancher : ${fmtV(floorPrimes)}.`,
        badge: { text: growthBadgeText, kind: growthBadgeKind },
      },
      {
        tone: 'navy', icon: '\ud83c\udfe6',
        value: fmtV(v1),
        label: `VOLUME VIE & PARTS DE MARCHÉ ${maxYear}`,
        body: `Part de marché continental : ${shareCont.toFixed(2)}% du total africain (${shareContDelta >= 0 ? '\u2197' : '\u2198'} ${Math.abs(shareContDelta).toFixed(2)} pts vs ${minYear} \u2014 ${shareContDelta >= 0 ? 'gagne des parts' : 'perd des parts'}). Part régionale (${region}) : ${shareReg.toFixed(1)}%. Rang continental : ${rankContPrimes > 0 ? rankContPrimes : '-'}/${totalContPrimes} \u00b7 Rang régional : ${rankRegPrimes > 0 ? rankRegPrimes : '-'}/${totalRegPrimes}.`,
        badge: { text: rankContPrimes > 0 && rankContPrimes <= 5 ? '\ud83c\udfc6 Top 5 continental' : '\ud83d\udccc Marché significatif', kind: 'info' },
      },
      {
        tone: penTone, icon: '\ud83d\udcca',
        value: `${pen2024.toFixed(2)}%`,
        label: 'TAUX DE PÉNÉTRATION VIE',
        body: `Pénétration vie ${maxYear} : ${pen2024.toFixed(2)}% (moy. : ${avgPen.toFixed(2)}% \u00b7 pic : ${peakPen.toFixed(2)}%). Tendance : ${penTrend >= 0 ? '\u2197' : '\u2198'} ${Math.abs(penTrend).toFixed(2)} pts sur ${nYears} ans. Rang continental : ${rankPen > 0 ? rankPen : '-'}/${totalPenRanked}. ${avgPen < 0.5 ? 'Marge de progression très significative \u2014 potentiel vie majeur.' : avgPen < 2 ? 'Marché vie en développement.' : 'Marché vie bien pénétré.'}`,
        badge: { text: avgPen < 0.5 ? '\ud83d\udccc Potentiel majeur' : avgPen < 2 ? '\ud83d\udccc En développement' : '\ud83d\udccc Bien pénétré', kind: 'info' },
      },
      {
        tone: densEvol >= 0 ? 'green' : 'amber', icon: '\ud83d\udcb0',
        value: `$${dens2024.toFixed(1)}/hab`,
        label: 'DENSITÉ D\'ASSURANCE VIE',
        body: `Densité vie ${maxYear} : $${dens2024.toFixed(1)}/hab (moy. : $${avgDens.toFixed(1)}/hab). Évolution ${minYear}\u2192${maxYear} : ${sgn(densEvol)}$${densEvol.toFixed(1)}/hab. Rang continental : ${rankDens > 0 ? rankDens : '-'}/${totalDensRanked}. ${densLabel}.`,
        badge: { text: densEvol >= 0 ? '\u2713 En progression' : '\u26a0 En développement', kind: densEvol >= 0 ? 'ok' : 'warn' },
      },
      {
        tone: attractTone, icon: '\ud83c\udfaf',
        value: attractLabel,
        label: 'ATTRACTIVITÉ RÉASSURANCE VIE',
        body: criteriaFormatted.join(' '),
        badge: { text: attractBadge, kind: attractBadgeKind },
      },
    ]

    return { cards, region, coverage }
  }, [data, country])
}

// ── 8. INSIGHTS CLASSEMENT PAYS VIE ──────────────────────────────────────────
export function useVieRankingInsights(data: VieRow[]): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []

    const byCountry: Record<string, {
      region: string; pen: number[]; cagr: number | null; dens: number[]
      v0: number; v1: number
    }> = {}

    for (const r of data) {
      if (!byCountry[r.pays]) {
        byCountry[r.pays] = { region: r.region ?? 'Autre', pen: [], cagr: null, dens: [], v0: 0, v1: 0 }
      }
      const e = byCountry[r.pays]
      if (r.taux_penetration_pct != null) e.pen.push(r.taux_penetration_pct)
      if (r.densite_assurance_usd != null) e.dens.push(r.densite_assurance_usd)
    }

    for (const pays of Object.keys(byCountry)) {
      const e = byCountry[pays]
      const primesRows = data
        .filter(r => r.pays === pays && r.primes_emises_mn_usd != null)
        .sort((a, b) => a.annee - b.annee)
      if (primesRows.length >= 2) {
        e.v0 = primesRows[0].primes_emises_mn_usd as number
        e.v1 = primesRows[primesRows.length - 1].primes_emises_mn_usd as number
        const n = primesRows[primesRows.length - 1].annee - primesRows[0].annee || 1
        e.cagr = e.v0 > 0 && e.v1 > 0 ? (Math.pow(e.v1 / e.v0, 1 / n) - 1) * 100 : null
      }
    }

    const statsArr = Object.entries(byCountry).map(([pays, e]) => ({
      pays,
      region: e.region,
      avgPen: e.pen.length ? e.pen.reduce((a, b) => a + b, 0) / e.pen.length : null,
      cagr: e.cagr,
      avgDens: e.dens.length ? e.dens.reduce((a, b) => a + b, 0) / e.dens.length : null,
    }))

    // Top 5 pénétration (hors SA)
    const top5Pen = statsArr
      .filter(s => s.avgPen != null && s.pays !== 'Afrique du Sud')
      .sort((a, b) => (b.avgPen as number) - (a.avgPen as number))
      .slice(0, 5)

    // Top 5 croissance (hors extrêmes)
    const top5Growth = statsArr
      .filter(s => s.cagr != null && s.cagr < 100 && s.pays !== 'Afrique du Sud')
      .sort((a, b) => (b.cagr as number) - (a.cagr as number))
      .slice(0, 5)

    // Top 5 densité (hors SA)
    const top5Dens = statsArr
      .filter(s => s.avgDens != null && s.pays !== 'Afrique du Sud')
      .sort((a, b) => (b.avgDens as number) - (a.avgDens as number))
      .slice(0, 5)

    const fmtPenVal = (v: number) => `${v.toFixed(2)}%`
    const fmtGrowth = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
    const fmtDens = (v: number) => `$${v.toFixed(1)}/hab`

    const penBody = top5Pen.length
      ? `Pays avec la pénétration vie la plus élevée (hors SA): ${top5Pen.map(s => `${s.pays} (${fmtPenVal(s.avgPen as number)})`).join(', ')}. Une pénétration élevée indique un marché vie mature avec une base de primes récurrente et prévisible.`
      : 'Données de pénétration insuffisantes.'

    const growthBody = top5Growth.length
      ? `Pays avec la croissance annuelle vie la plus forte (hors SA): ${top5Growth.map(s => `${s.pays} (${fmtGrowth(s.cagr as number)})`).join(', ')}. Ces marchés en forte expansion offrent les opportunités de développement vie les plus importantes pour Atlantic Re.`
      : 'Données de croissance insuffisantes.'

    const densBody = top5Dens.length
      ? `Pays avec la densité vie la plus élevée (hors SA): ${top5Dens.map(s => `${s.pays} (${fmtDens(s.avgDens as number)})`).join(', ')}. Une densité élevée reflète un marché avec une capacité de paiement des ménages avérée.`
      : 'Données de densité insuffisantes.'

    return [
      {
        tone: 'navy',
        icon: '\ud83d\udcca',
        value: top5Pen[0]?.pays ?? '-',
        label: 'LEADERS PÉNÉTRATION VIE',
        body: penBody,
        badge: { text: '\u2713 Pénétration optimale', kind: 'ok' },
        countryTags: top5Pen.map(s => s.pays),
      },
      {
        tone: 'green',
        icon: '\ud83d\udcc8',
        value: top5Growth[0] ? `Top Croissance: ${fmtGrowth(top5Growth[0].cagr as number)}` : '-',
        label: 'MARCHÉS VIE EN EXPANSION',
        body: growthBody,
        badge: { text: '\u2713 Fort potentiel', kind: 'ok' },
        countryTags: top5Growth.map(s => s.pays),
      },
      {
        tone: 'amber',
        icon: '\ud83d\udcb0',
        value: top5Dens[0] ? fmtDens(top5Dens[0].avgDens as number) : '-',
        label: 'MARCHÉS VIE LES PLUS DÉVELOPPÉS',
        body: densBody,
        badge: { text: '\ud83d\udccc Marchés vie matures', kind: 'info' },
        countryTags: top5Dens.map(s => s.pays),
      },
    ] satisfies InsightCardProps[]
  }, [data])
}

// ── 9. INSIGHTS PRIMES PAR RÉGION VIE (BarChart régional) ────────────────────
export function useVieBarRegionalInsights(
  data: VieRow[],
  barYear: number,
  barShowAvg: boolean,
  years: number[]
): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []

    const source = barShowAvg ? data : data.filter(r => r.annee === barYear)
    const nYears = barShowAvg ? (years.length || 1) : 1

    const sourceNoSA = source.filter(r => r.pays !== 'Afrique du Sud')
    const accRegNoSA: Record<string, number> = {}
    for (const r of sourceNoSA) {
      const reg = r.region ?? 'Autre'
      accRegNoSA[reg] = (accRegNoSA[reg] ?? 0) + (r.primes_emises_mn_usd ?? 0)
    }
    const regListNoSA = Object.entries(accRegNoSA)
      .map(([region, total]) => ({ region, value: total / nYears }))
      .sort((a, b) => b.value - a.value)

    if (!regListNoSA.length) return []

    const totalNoSA = sum(regListNoSA.map(r => r.value))
    const leader = regListNoSA[0]
    const second = regListNoSA[1]
    const leaderPct = totalNoSA > 0 ? leader.value / totalNoSA * 100 : 0
    const secondPct = totalNoSA > 0 && second ? second.value / totalNoSA * 100 : 0

    const card1: InsightCardProps = {
      tone: 'navy',
      icon: '🏆',
      value: leader.region,
      label: 'RÉGION VIE DOMINANTE',
      body: `${leader.region} concentre ${leaderPct.toFixed(1)}% des primes vie régionales hors Afrique du Sud (${fmtMn(leader.value)}).${second
        ? ` ${second.region} arrive en 2ème position avec ${secondPct.toFixed(1)}% (${fmtMn(second.value)}). Ces deux régions représentent ${(leaderPct + secondPct).toFixed(1)}% du marché vie hors SA.`
        : ''}`,
      badge: { text: `${leaderPct.toFixed(0)}% part de marché vie hors SA`, kind: leaderPct > 60 ? 'alert' : 'info' },
    }

    const usedRegions = new Set([leader.region])

    // Profondeur de marché : prime moyenne par pays actif dans la région
    const countriesPerRegion: Record<string, Set<string>> = {}
    for (const r of sourceNoSA) {
      if ((r.primes_emises_mn_usd ?? 0) <= 0) continue
      const reg = r.region ?? 'Autre'
      if (!countriesPerRegion[reg]) countriesPerRegion[reg] = new Set()
      countriesPerRegion[reg].add(r.pays)
    }

    const depthByRegion = regListNoSA
      .filter(r => !usedRegions.has(r.region) && countriesPerRegion[r.region]?.size > 0)
      .map(r => ({
        region: r.region,
        total: r.value,
        nCountries: countriesPerRegion[r.region]?.size ?? 1,
        avgPerCountry: r.value / (countriesPerRegion[r.region]?.size || 1),
      }))
      .sort((a, b) => b.avgPerCountry - a.avgPerCountry)

    const deepestReg = depthByRegion[0]
    const shallowReg = depthByRegion.length > 1 ? depthByRegion[depthByRegion.length - 1] : null
    const ratioDepth = shallowReg && shallowReg.avgPerCountry > 0
      ? deepestReg.avgPerCountry / shallowReg.avgPerCountry
      : null

    usedRegions.add(deepestReg?.region ?? '')

    const depthTone: InsightCardProps['tone'] =
      (deepestReg?.avgPerCountry ?? 0) >= 200 ? 'green' : (deepestReg?.avgPerCountry ?? 0) >= 50 ? 'amber' : 'navy'

    const card2: InsightCardProps = deepestReg
      ? {
          tone: depthTone,
          icon: '🔬',
          value: deepestReg.region,
          label: 'PROFONDEUR VIE PAR PAYS',
          body: `${deepestReg.region} affiche la prime vie moyenne la plus élevée par pays actif hors leader : ${fmtMn(deepestReg.avgPerCountry)}/pays (${fmtMn(deepestReg.total)} répartis sur ${deepestReg.nCountries} pays).${ratioDepth != null && shallowReg
            ? ` À l'opposé, ${shallowReg.region} ne génère que ${fmtMn(shallowReg.avgPerCountry)}/pays — écart de ×${ratioDepth.toFixed(1)} entre les deux régions.`
            : ''} Concentration intra-régionale à considérer pour la diversification vie d'Atlantic Re.`,
          badge: { text: `${fmtMn(deepestReg.avgPerCountry)}/pays · ${deepestReg.nCountries} pays`, kind: 'info' },
        }
      : {
          tone: 'navy',
          icon: '🔬',
          value: '—',
          label: 'PROFONDEUR VIE PAR PAYS',
          body: 'Données insuffisantes pour calculer la profondeur régionale vie.',
        }

    // Insight 3 : Meilleure pénétration vie moyenne par région (hors régions déjà citées)
    const penByRegion: Record<string, number[]> = {}
    for (const r of data) {
      if (r.taux_penetration_pct == null || r.pays === 'Afrique du Sud') continue
      const reg = r.region ?? 'Autre'
      ;(penByRegion[reg] ??= []).push(r.taux_penetration_pct)
    }

    const regWithPen = regListNoSA
      .filter(r => !usedRegions.has(r.region) && penByRegion[r.region]?.length > 0)
      .map(r => ({ region: r.region, value: r.value, avgPen: avg(penByRegion[r.region]) }))

    const regWithPenFull = regListNoSA
      .filter(r => penByRegion[r.region]?.length > 0)
      .map(r => ({ region: r.region, value: r.value, avgPen: avg(penByRegion[r.region]) }))

    const medPrimes = totalNoSA > 0 ? median(regListNoSA.map(r => r.value)) : 0

    const sweetSpot = (regWithPen.length ? regWithPen : regWithPenFull)
      .filter(r => r.value >= medPrimes && r.avgPen >= 0.3)
      .sort((a, b) => b.avgPen - a.avgPen)

    const bestPenReg = (regWithPen.length ? regWithPen : regWithPenFull).length
      ? [...(regWithPen.length ? regWithPen : regWithPenFull)].sort((a, b) => b.avgPen - a.avgPen)[0]
      : null

    const targetReg = sweetSpot[0] ?? bestPenReg
    const pen3Tone: InsightCardProps['tone'] =
      (targetReg?.avgPen ?? 0) >= 1 ? 'navy' : (targetReg?.avgPen ?? 0) >= 0.3 ? 'green' : 'amber'

    const card3: InsightCardProps = targetReg
      ? {
          tone: pen3Tone,
          icon: '⚖️',
          value: targetReg.region,
          label: 'MEILLEUR ÉQUILIBRE VOLUME / PÉNÉTRATION VIE',
          body: sweetSpot.length > 0
            ? `${targetReg.region} offre le meilleur équilibre vie : primes ${fmtMn(targetReg.value)} (≥ médiane régionale ${fmtMn(medPrimes)}) et pénétration vie moyenne de ${fmtPct(targetReg.avgPen, 2)}%. Zone vie optimale pour développer le portefeuille Atlantic Re.`
            : `Aucune région ne cumule simultanément primes ≥ médiane et pénétration vie ≥ 0,3%. ${bestPenReg ? `Meilleure pénétration disponible : ${bestPenReg.region} (${fmtPct(bestPenReg.avgPen, 2)}).` : ''}`,
          badge: {
            text: sweetSpot.length > 0 ? '✓ Zone vie prioritaire Atlantic Re' : '⚠ Meilleur disponible',
            kind: sweetSpot.length > 0 ? 'ok' : 'warn',
          },
        }
      : {
          tone: 'amber',
          icon: '⚖️',
          value: '—',
          label: 'MEILLEUR ÉQUILIBRE VOLUME / PÉNÉTRATION VIE',
          body: 'Données de pénétration insuffisantes pour comparer les régions.',
        }

    return [card1, card2, card3] satisfies InsightCardProps[]
  }, [data, barYear, barShowAvg, years])
}
