/**
 * useMacroInsights — Calculs d'insights dynamiques pour CartographieMacro
 * Tous les indicateurs : croissance PIB, inflation, compte courant, PIB/hab, intégration régionale.
 * Toutes les valeurs viennent exclusivement des données réelles.
 */
import { useMemo } from 'react'
import type { MacroRow } from '../types/cartographie'
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
function fmtPct(v: number, d = 1) { return `${v >= 0 ? '+' : ''}${v.toFixed(d)}%` }
function fmtPctAbs(v: number, d = 1) { return `${v.toFixed(d)}%` }
function fmtBn(v: number) { return v >= 1000 ? `$${(v / 1000).toFixed(1)} Mrd` : `$${v.toFixed(0)}M` }
function fmtUsd(v: number) { return `$${v.toFixed(0)}/hab` }
function fmtScore(v: number) { return v.toFixed(3) }

// ── Agrégation par pays (toutes années) ───────────────────────────────────────
interface CountryStat {
  pays: string
  region: string
  gdp: number               // moyenne PIB
  gdpCap: number | null     // moyenne PIB/hab
  growth: number | null     // moyenne croissance
  inflation: number | null  // moyenne inflation
  currentAcc: number | null // moyenne compte courant
  integration: number | null // score (fixe dans les données)
}

function aggregateByCountry(data: MacroRow[]): CountryStat[] {
  const acc: Record<string, {
    pays: string; region: string
    gdp: number[]; gdpCap: number[]; growth: number[]; infl: number[]; ca: number[]; integ: number[]
  }> = {}
  for (const r of data) {
    if (!acc[r.pays]) acc[r.pays] = { pays: r.pays, region: r.region ?? 'Autre', gdp: [], gdpCap: [], growth: [], infl: [], ca: [], integ: [] }
    const e = acc[r.pays]
    if (r.gdp_mn != null) e.gdp.push(r.gdp_mn)
    if (r.gdp_per_capita != null) e.gdpCap.push(r.gdp_per_capita)
    if (r.gdp_growth_pct != null) e.growth.push(r.gdp_growth_pct)
    if (r.inflation_rate_pct != null) e.infl.push(r.inflation_rate_pct)
    if (r.current_account_mn != null) e.ca.push(r.current_account_mn)
    if (r.integration_regionale_score != null) e.integ.push(r.integration_regionale_score)
  }
  return Object.values(acc).map(e => ({
    pays: e.pays,
    region: e.region,
    gdp: e.gdp.length ? avg(e.gdp) : 0,
    gdpCap: e.gdpCap.length ? avg(e.gdpCap) : null,
    growth: e.growth.length ? avg(e.growth) : null,
    inflation: e.infl.length ? avg(e.infl) : null,
    currentAcc: e.ca.length ? avg(e.ca) : null,
    integration: e.integ.length ? avg(e.integ) : null,
  }))
}

// ── 1. INSIGHTS CARTE CHOROPLÈTHE ────────────────────────────────────────────
export function useMacroChoroplethInsights(data: MacroRow[]): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []
    const stats = aggregateByCountry(data)

    // PIB concentration top 3
    const sorted = [...stats].sort((a, b) => b.gdp - a.gdp)
    const total = sum(stats.map(s => s.gdp))
    const top3 = sorted.slice(0, 3)
    const top3Pct = total > 0 ? sum(top3.map(s => s.gdp)) / total * 100 : 0

    // Champions croissance : PIB/hab > médiane ET croissance > médiane (tous pays)
    const withGrowth = stats.filter(s => s.growth != null && s.gdpCap != null)
    const medGrowth = median(withGrowth.map(s => s.growth as number))
    const medGdpCap = median(withGrowth.map(s => s.gdpCap as number))
    const champions = withGrowth.filter(s => (s.growth ?? 0) > medGrowth && (s.gdpCap ?? 0) > medGdpCap)

    // Pays à fort risque inflation : inflation > 15% en moyenne
    const highInflation = stats.filter(s => (s.inflation ?? 0) > 15).sort((a, b) => (b.inflation ?? 0) - (a.inflation ?? 0))

    return [
      {
        tone: 'navy',
        icon: '🏭',
        value: `${top3Pct.toFixed(1)}%`,
        label: 'CONCENTRATION PIB TOP 3',
        body: `${top3.map(s => s.pays).join(', ')} concentrent ${top3Pct.toFixed(1)}% du PIB africain total. Une polarisation économique structurelle qui rend le continent très sensible aux chocs dans ces trois pays.`,
        badge: { text: top3Pct > 55 ? '⚠ Concentration extrême' : 'ℹ️ Concentration', kind: top3Pct > 55 ? 'warn' : 'info' },
        countryTags: top3.map(s => s.pays),
      },
      {
        tone: 'green',
        icon: '🚀',
        value: `${champions.length} pays`,
        label: 'CHAMPIONS MACRO AFRIQUE',
        body: champions.length
          ? `${champions.map(s => s.pays).join(', ')} combinent PIB/hab supérieur à la médiane (${fmtUsd(medGdpCap)}) et croissance > ${fmtPctAbs(medGrowth)}. Ces marchés offrent les meilleures conditions macroéconomiques pour la réassurance.`
          : 'Aucun pays ne combine simultanément PIB/hab et croissance au-dessus des médianes.',
        badge: { text: '✓ Environnement macro favorable', kind: 'ok' },
        countryTags: champions.map(s => s.pays),
      },
      {
        tone: highInflation.length > 3 ? 'red' : 'amber',
        icon: '⚠️',
        value: `${highInflation.length} pays`,
        label: 'RISQUE INFLATIONNISTE ÉLEVÉ',
        body: highInflation.length
          ? `${highInflation.map(s => s.pays).join(', ')} affichent une inflation moyenne > 15% sur la période. Risque de dépréciation monétaire, d'érosion des primes réelles et d'instabilité des tarifs de réassurance.`
          : 'Aucun pays n\'affiche une inflation chronique > 15% en moyenne sur la période.',
        badge: { text: highInflation.length > 3 ? '⚠ Risque FX élevé' : '⚠ Vigilance', kind: highInflation.length > 3 ? 'alert' : 'warn' },
        countryTags: highInflation.map(s => s.pays),
      },
    ] satisfies InsightCardProps[]
  }, [data])
}

// ── 2. INSIGHTS TOP 10 PIB ────────────────────────────────────────────────────
export function useMacroTop10Insights(data: MacroRow[], yearOrAvg: number | 'avg'): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []
    const source = yearOrAvg === 'avg' ? data : data.filter(r => r.annee === yearOrAvg)

    const byCountry: Record<string, { gdp: number; region: string; growth: number[]; gdpCap: number[] }> = {}
    for (const r of source) {
      if (!byCountry[r.pays]) byCountry[r.pays] = { gdp: 0, region: r.region ?? 'Autre', growth: [], gdpCap: [] }
      byCountry[r.pays].gdp += (r.gdp_mn ?? 0)
      if (r.gdp_growth_pct != null) byCountry[r.pays].growth.push(r.gdp_growth_pct)
      if (r.gdp_per_capita != null) byCountry[r.pays].gdpCap.push(r.gdp_per_capita)
    }
    const nYears = yearOrAvg === 'avg' ? (new Set(data.map(r => r.annee)).size || 1) : 1
    const ranked = Object.entries(byCountry)
      .map(([pays, e]) => ({ pays, region: e.region, gdp: e.gdp / nYears, avgGrowth: e.growth.length ? avg(e.growth) : null, avgGdpCap: e.gdpCap.length ? avg(e.gdpCap) : null }))
      .sort((a, b) => b.gdp - a.gdp)
    const top10 = ranked.slice(0, 10)
    const totAll = sum(ranked.map(r => r.gdp))
    const top10Pct = totAll > 0 ? sum(top10.map(r => r.gdp)) / totAll * 100 : 0

    // Strongest grower in Top 10
    const top10WithGrowth = top10.filter(r => r.avgGrowth != null)
    const fastestInTop10 = [...top10WithGrowth].sort((a, b) => (b.avgGrowth ?? 0) - (a.avgGrowth ?? 0))[0]

    // Richest per capita in top10
    const richestCapTop10 = [...top10.filter(r => r.avgGdpCap != null)].sort((a, b) => (b.avgGdpCap ?? 0) - (a.avgGdpCap ?? 0))[0]

    return [
      {
        tone: 'navy',
        icon: '🏛️',
        value: `${top10Pct.toFixed(1)}%`,
        label: 'CONCENTRATION PIB TOP 10',
        body: `Les 10 premières économies africaines totalisent ${top10Pct.toFixed(1)}% du PIB continental (${fmtBn(sum(top10.map(r => r.gdp)))}). Cette polarisation reflète des écarts structurels importants entre les économies du continent.`,
        badge: { text: `${top10Pct.toFixed(0)}% du PIB africain`, kind: top10Pct > 80 ? 'warn' : 'info' },
        countryTags: top10.map(r => r.pays),
      },
      {
        tone: 'green',
        icon: '📈',
        value: fastestInTop10 ? `${fmtPct(fastestInTop10.avgGrowth ?? 0)}` : '—',
        label: 'LEADER CROISSANCE DANS LE TOP 10',
        body: fastestInTop10
          ? `${fastestInTop10.pays} est le champion de la croissance parmi les 10 premières économies africaines (${fmtPct(fastestInTop10.avgGrowth ?? 0)}/an). Association taille + dynamisme particultièrement attrayante pour la réassurance.`
          : 'Données de croissance insuffisantes dans le Top 10.',
        countryTags: fastestInTop10 ? [fastestInTop10.pays] : [],
        badge: { text: '✓ Taille + croissance', kind: 'ok' },
      },
      {
        tone: 'amber',
        icon: '💰',
        value: richestCapTop10 ? fmtUsd(richestCapTop10.avgGdpCap ?? 0) : '—',
        label: 'PIB/HAB LE PLUS ÉLEVÉ (TOP 10)',
        body: richestCapTop10
          ? `${richestCapTop10.pays} affiche le PIB/habitant le plus élevé parmi les 10 premières économies (${fmtUsd(richestCapTop10.avgGdpCap ?? 0)}). Une capacité de paiement élevée qui soutient la demande d'assurance et de réassurance.`
          : 'Données PIB/hab insuffisantes.',
        countryTags: richestCapTop10 ? [richestCapTop10.pays] : [],
      },
    ] satisfies InsightCardProps[]
  }, [data, yearOrAvg])
}

// ── 3. INSIGHTS SCATTER (Inflation vs Croissance / PIB-cap vs Croissance) ─────
export function computeMacroScatterInsights(
  xKey: string,
  yKey: string,
  data: MacroRow[]
): InsightCardProps[] {
  const stats = aggregateByCountry(data)
  // SA est un pays normal dans macro — on inclut tous les pays dans les analyses
  const noSA = stats

  // Motion 1 : Inflation vs Croissance PIB
  if ((xKey === 'inflation' && yKey === 'growth') || (xKey === 'growth' && yKey === 'inflation')) {
    const withIG = noSA.filter(s => s.inflation != null && s.growth != null)
    // Quadrant vertueux : inflation < 5% ET croissance > 5%
    const virtuous = withIG.filter(s => (s.inflation ?? 100) < 5 && (s.growth ?? 0) > 5)
    // Stagflation : inflation > 10% ET croissance < 3%
    const stagflation = withIG.filter(s => (s.inflation ?? 0) > 10 && (s.growth ?? 100) < 3)
    // Surchauffe : inflation > 10% ET croissance > 5%
    const overheating = withIG.filter(s => (s.inflation ?? 0) > 10 && (s.growth ?? 0) > 5)
    const medInfl = median(withIG.map(s => s.inflation as number))
    return [
      {
        tone: 'green',
        icon: '✅',
        value: `${virtuous.length} pays`,
        label: 'ZONE MACRO VERTUEUSE',
        body: virtuous.length
          ? `${virtuous.map(s => s.pays).join(', ')} combinent inflation < 5% et croissance > 5%. Environnement macro optimal pour la réassurance : stabilité des prix + expansion économique soutenue.`
          : 'Aucun pays ne combine simultanément inflation < 5% et croissance > 5% sur la période.',
        badge: { text: '✓ Environnement macro idéal', kind: 'ok' },
        countryTags: virtuous.map(s => s.pays),
      },
      {
        tone: 'red',
        icon: '🔥',
        value: `${stagflation.length} pays`,
        label: 'RISQUE STAGFLATION',
        body: stagflation.length
          ? `${stagflation.map(s => s.pays).join(', ')} souffrent de stagflation (inflation > 10% + croissance < 3%). Contexte défavorable pour la réassurance : érosion des marges et capacité de paiement réduite.`
          : 'Aucun marché africain en situation de stagflation avérée sur la période.',
        badge: { text: stagflation.length ? '⚠ Risque élevé' : '✓ Pas de stagflation', kind: stagflation.length ? 'alert' : 'ok' },
        countryTags: stagflation.map(s => s.pays),
      },
      {
        tone: 'amber',
        icon: '🌡️',
        value: `${fmtPctAbs(medInfl)} médiane`,
        label: 'INFLATION MÉDIANE CONTINENTALE',
        body: `L'inflation médiane sur le continent est de ${fmtPctAbs(medInfl)} sur 2015–2024. ${overheating.length} pays combinent forte croissance et forte inflation (surchauffe) : ${overheating.slice(0, 4).map(s => s.pays).join(', ') || '—'}. Risque de change à intégrer pour Atlantic Re.`,
        badge: { text: overheating.length > 2 ? '⚠ Surchauffe localisée' : 'ℹ️ Surveillance', kind: overheating.length > 2 ? 'warn' : 'info' },
        countryTags: overheating.slice(0, 5).map(s => s.pays),
      },
    ]
  }

  // Motion 2 : PIB/hab vs Croissance
  if ((xKey === 'gdpCap' && yKey === 'growth') || (xKey === 'growth' && yKey === 'gdpCap')) {
    const withCG = noSA.filter(s => s.gdpCap != null && s.growth != null)
    const medCap = median(withCG.map(s => s.gdpCap as number))
    const medGrowth = median(withCG.map(s => s.growth as number))
    // Leaders : PIB/hab > médiane ET croissance > médiane
    const leaders = withCG.filter(s => (s.gdpCap ?? 0) > medCap && (s.growth ?? 0) > medGrowth)
    // Emerging rich : PIB/hab > médiane mais croissance < médiane (marchés matures)
    const matures = withCG.filter(s => (s.gdpCap ?? 0) > medCap && (s.growth ?? 0) < medGrowth)
    // Catching up : PIB/hab < médiane mais croissance > médiane (pays en rattrapage)
    const catchingUp = withCG.filter(s => (s.gdpCap ?? 0) < medCap && (s.growth ?? 0) > medGrowth)
    return [
      {
        tone: 'green',
        icon: '🏆',
        value: `${leaders.length} pays`,
        label: 'LEADERS MACRO (RICHESSE + CROISSANCE)',
        body: leaders.length
          ? `${leaders.map(s => s.pays).join(', ')} : PIB/hab > médiane (${fmtUsd(medCap)}) ET croissance > médiane (${fmtPctAbs(medGrowth)}). Ces marchés cumulent richesse et dynamisme — priorité absolue pour le développement de la réassurance vie et non-vie.`
          : 'Aucun pays ne combine PIB/hab et croissance au-dessus des médianes.',
        badge: { text: '✓ Double atout macro', kind: 'ok' },
        countryTags: leaders.map(s => s.pays),
      },
      {
        tone: 'navy',
        icon: '🏛️',
        value: `${matures.length} pays`,
        label: 'MARCHÉS MATURES (RICHESSE / CROISSANCE FAIBLE)',
        body: matures.length
          ? `${matures.map(s => s.pays).join(', ')} : PIB/hab élevé mais croissance modérée. Marchés à revenu intermédiaire supérieur en phase de consolidation — demande d'assurance établie mais expansion limitée.`
          : 'Aucun marché mature identifié.',
        countryTags: matures.map(s => s.pays),
      },
      {
        tone: 'amber',
        icon: '🌱',
        value: `${catchingUp.length} pays`,
        label: 'ÉCONOMIES EN RATTRAPAGE',
        body: catchingUp.length
          ? `${catchingUp.map(s => s.pays).join(', ')} : PIB/hab encore modeste mais croissance soutenue. Ces pays en convergence représentent le potentiel de développement à long terme du marché africain.`
          : 'Peu d\'économies en phase de rattrapage identifiables.',
        badge: { text: '📌 Potentiel long terme', kind: 'info' },
        countryTags: catchingUp.slice(0, 6).map(s => s.pays),
      },
    ]
  }

  // Motion 3 : Compte courant vs Croissance
  if ((xKey === 'currentAcc' && yKey === 'growth') || (xKey === 'growth' && yKey === 'currentAcc')) {
    const withCAG = noSA.filter(s => s.currentAcc != null && s.growth != null)
    const surplusGrowth = withCAG.filter(s => (s.currentAcc ?? -1) > 0 && (s.growth ?? 0) > 3)
    const deficitRisk = withCAG.filter(s => (s.currentAcc ?? 0) < -2000 && (s.growth ?? 0) < 3)
    const medCA = median(withCAG.map(s => s.currentAcc as number))
    return [
      {
        tone: 'green',
        icon: '✅',
        value: `${surplusGrowth.length} pays`,
        label: 'SURPLUS + CROISSANCE',
        body: surplusGrowth.length
          ? `${surplusGrowth.map(s => s.pays).join(', ')} combinent solde courant positif ET croissance > 3%. Économies équilibrées à faible risque de compte extérieur — stabilité macro favorable à la réassurance.`
          : 'Aucun pays ne combine surplus courant et croissance > 3%.',
        badge: { text: '✓ Équilibre externe', kind: 'ok' },
        countryTags: surplusGrowth.map(s => s.pays),
      },
      {
        tone: 'red',
        icon: '⚠️',
        value: `${deficitRisk.length} pays`,
        label: 'DÉFICIT COURANT + FAIBLE CROISSANCE',
        body: deficitRisk.length
          ? `${deficitRisk.map(s => s.pays).join(', ')} : large déficit courant ET croissance < 3%. Risque de déséquilibre externe chronique pouvant entraîner dépréciation monétaire et instabilité macro.`
          : 'Aucun pays ne cumule déficit courant élevé et faible croissance sur la période.',
        badge: { text: '⚠ Risque externe', kind: 'alert' },
        countryTags: deficitRisk.map(s => s.pays),
      },
      {
        tone: 'navy',
        icon: '🧭',
        value: `${fmtBn(medCA)} médiane`,
        label: 'SOLDE COURANT MÉDIAN',
        body: `Solde courant médian continental : ${fmtBn(medCA)} sur 2015–2024. La plupart des pays africains opèrent en déficit structurel, financé par les IDE et l'aide. Ce contexte impacte directement la stabilité du taux de change et donc les primes libellées en USD.`,
        countryTags: [],
      },
    ]
  }

  // Fallback générique
  const vals = noSA.filter(s => s[xKey as keyof CountryStat] != null && s[yKey as keyof CountryStat] != null)
  const topX = [...vals].sort((a, b) => (b[xKey as keyof CountryStat] as number) - (a[xKey as keyof CountryStat] as number)).slice(0, 3)
  const topY = [...vals].sort((a, b) => (b[yKey as keyof CountryStat] as number) - (a[yKey as keyof CountryStat] as number)).slice(0, 3)
  return [
    { tone: 'navy', icon: '📊', label: 'TOP AXE X', value: topX[0]?.pays ?? '—', body: `Leader sur l'axe X. Moy: ${avg(vals.map(s => s[xKey as keyof CountryStat] as number)).toFixed(1)}.`, countryTags: topX.map(s => s.pays) },
    { tone: 'green', icon: '📈', label: 'TOP AXE Y', value: topY[0]?.pays ?? '—', body: `Leader sur l'axe Y. Moy: ${avg(vals.map(s => s[yKey as keyof CountryStat] as number)).toFixed(1)}.`, countryTags: topY.map(s => s.pays) },
    { tone: 'amber', icon: '🌍', label: 'VUE ENSEMBLE MACRO', value: `${vals.length} pays`, body: `${vals.length} pays disposent de données pour les axes sélectionnés.` },
  ]
}

// ── 4. INSIGHTS ÉVOLUTION PIB RÉGIONALE ───────────────────────────────────────
export function useMacroEvolutionInsights(data: MacroRow[]): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []

    const years = [...new Set(data.map(r => r.annee))].sort((a, b) => a - b)
    const minYear = years[0] ?? 2015
    const maxYear = years[years.length - 1] ?? 2024
    const nYears = maxYear - minYear || 1

    // PIB par région (tous pays, SA inclus dans Afrique Australe)
    const byRegionYear: Record<string, Record<number, number>> = {}
    for (const r of data) {
      if (r.gdp_mn == null) continue
      const reg = r.region ?? 'Autre'
      if (!byRegionYear[reg]) byRegionYear[reg] = {}
      byRegionYear[reg][r.annee] = (byRegionYear[reg][r.annee] ?? 0) + r.gdp_mn
    }

    interface RegStat { region: string; v0: number; v1: number; cagr: number; cagrPost2020: number | null }
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
    const lowBaseRegions = stats.filter(s => s.v0 <= p25 || s.v0 < 5000)
    const baseFaible = [...lowBaseRegions].sort((a, b) => b.cagr - a.cagr)[0]

    const otherRegions = stats.filter(s => s.region !== baseFaible?.region)
    const mostDynamic = [...otherRegions].sort((a, b) => b.cagr - a.cagr)[0]

    const withPost = stats.filter(s => s.cagrPost2020 != null)
    const mostAccelerated = [...withPost].sort((a, b) => (b.cagrPost2020 ?? 0) - (a.cagrPost2020 ?? 0))[0]

    const cards: InsightCardProps[] = []
    if (mostDynamic) {
      cards.push({
        tone: 'green', icon: '🚀', value: mostDynamic.region,
        label: 'RÉGION PIB LA PLUS DYNAMIQUE',
        body: `${mostDynamic.region} affiche le CAGR PIB le plus élevé (hors base faible) : +${mostDynamic.cagr.toFixed(1)}%/an sur ${minYear}–${maxYear}. PIB : ${fmtBn(mostDynamic.v0)} → ${fmtBn(mostDynamic.v1)}.`,
        badge: { text: '✓ Leader croissance PIB', kind: 'ok' },
      })
    }
    if (baseFaible) {
      cards.push({
        tone: 'amber', icon: '⚠️', value: baseFaible.region,
        label: 'CROISSANCE PIB SUR BASE FAIBLE',
        body: `CAGR de +${baseFaible.cagr.toFixed(1)}%/an sur ${minYear}–${maxYear} mais base de départ faible (${fmtBn(baseFaible.v0)} → ${fmtBn(baseFaible.v1)}). Effet base à interpréter avec prudence — volume PIB insuffisant pour impacter significativement le marché réassurance à court terme.`,
        badge: { text: '⚠ Effet base — relativiser', kind: 'warn' },
      })
    }
    if (mostAccelerated) {
      cards.push({
        tone: 'navy', icon: '📊', value: mostAccelerated.region,
        label: 'ACCÉLÈRE POST-2020',
        body: `${mostAccelerated.region} a accéléré sa croissance PIB après 2020 : +${(mostAccelerated.cagrPost2020 ?? 0).toFixed(1)}%/an depuis 2020 contre +${mostAccelerated.cagr.toFixed(1)}%/an sur la période complète. Signal de rebond structurel.`,
        badge: { text: '📌 Dynamisme récent', kind: 'info' },
      })
    }
    return cards
  }, [data])
}

// ── 5. INSIGHTS BAR PIB PAR RÉGION ────────────────────────────────────────────
export function useMacroBarRegionalInsights(
  data: MacroRow[],
  barYear: number,
  barShowAvg: boolean,
  years: number[]
): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []

    const source = barShowAvg ? data : data.filter(r => r.annee === barYear)
    const nYrs = barShowAvg ? (years.length || 1) : 1

    // Tous pays inclus (SA dans Afrique Australe)
    const accReg: Record<string, number> = {}
    for (const r of source) {
      if (r.gdp_mn == null) continue
      const reg = r.region ?? 'Autre'
      accReg[reg] = (accReg[reg] ?? 0) + r.gdp_mn
    }
    const regList = Object.entries(accReg)
      .map(([region, total]) => ({ region, value: total / nYrs }))
      .sort((a, b) => b.value - a.value)

    if (!regList.length) return []

    const totalAll = sum(regList.map(r => r.value))
    const leader = regList[0]
    const second = regList[1]
    const leaderPct = totalAll > 0 ? leader.value / totalAll * 100 : 0
    const secondPct = totalAll > 0 && second ? second.value / totalAll * 100 : 0

    const card1: InsightCardProps = {
      tone: 'navy', icon: '🏆',
      value: leader.region,
      label: 'RÉGION PIB DOMINANTE',
      body: `${leader.region} concentre ${leaderPct.toFixed(1)}% du PIB régional total (${fmtBn(leader.value)}).${second ? ` ${second.region} suit avec ${secondPct.toFixed(1)}% (${fmtBn(second.value)}). Ces deux régions représentent ${(leaderPct + secondPct).toFixed(1)}% du PIB africain.` : ''}`,
      badge: { text: `${leaderPct.toFixed(0)}% part de marché PIB`, kind: leaderPct > 50 ? 'alert' : 'info' },
    }

    const usedRegions = new Set([leader.region])

    // Profondeur : PIB moyen par pays actif
    const countriesPerRegion: Record<string, Set<string>> = {}
    for (const r of source) {
      if ((r.gdp_mn ?? 0) <= 0) continue
      const reg = r.region ?? 'Autre'
      if (!countriesPerRegion[reg]) countriesPerRegion[reg] = new Set()
      countriesPerRegion[reg].add(r.pays)
    }
    const depthByRegion = regList
      .filter(r => !usedRegions.has(r.region) && countriesPerRegion[r.region]?.size > 0)
      .map(r => ({ region: r.region, total: r.value, nC: countriesPerRegion[r.region]?.size ?? 1, avgPerC: r.value / (countriesPerRegion[r.region]?.size || 1) }))
      .sort((a, b) => b.avgPerC - a.avgPerC)

    const deepest = depthByRegion[0]
    const shallowest = depthByRegion.length > 1 ? depthByRegion[depthByRegion.length - 1] : null
    usedRegions.add(deepest?.region ?? '')

    const card2: InsightCardProps = deepest
      ? {
          tone: 'green', icon: '🔬',
          value: deepest.region,
          label: 'PIB MOYEN PAR PAYS LE PLUS ÉLEVÉ',
          body: `${deepest.region} génère le PIB moyen le plus élevé par pays actif (hors leader) : ${fmtBn(deepest.avgPerC)}/pays (${fmtBn(deepest.total)} sur ${deepest.nC} pays).${shallowest ? ` À l'opposé, ${shallowest.region} ne génère que ${fmtBn(shallowest.avgPerC)}/pays — écart ×${(deepest.avgPerC / (shallowest.avgPerC || 1)).toFixed(1)}.` : ''} Concentration intra-régionale à considérer pour la stratégie Atlantic Re.`,
          badge: { text: `${fmtBn(deepest.avgPerC)}/pays · ${deepest.nC} pays`, kind: 'info' },
        }
      : { tone: 'navy', icon: '🔬', value: '—', label: 'PIB MOYEN PAR PAYS', body: 'Données insuffisantes.' }

    // Inflation régionale (meilleur équilibre PIB / inflation, tous pays)
    const inflByRegion: Record<string, number[]> = {}
    for (const r of data) {
      if (r.inflation_rate_pct == null) continue
      const reg = r.region ?? 'Autre'
      ;(inflByRegion[reg] ??= []).push(r.inflation_rate_pct)
    }
    const regWithInfl = regList
      .filter(r => !usedRegions.has(r.region) && inflByRegion[r.region]?.length > 0)
      .map(r => ({ region: r.region, value: r.value, avgInfl: avg(inflByRegion[r.region]) }))
    const regWithInflFull = regList
      .filter(r => inflByRegion[r.region]?.length > 0)
      .map(r => ({ region: r.region, value: r.value, avgInfl: avg(inflByRegion[r.region]) }))

    const medPIB = totalAll > 0 ? median(regList.map(r => r.value)) : 0
    const sweetSpot = (regWithInfl.length ? regWithInfl : regWithInflFull)
      .filter(r => r.value >= medPIB && r.avgInfl <= 5)
      .sort((a, b) => a.avgInfl - b.avgInfl)
    const bestInfl = (regWithInfl.length ? regWithInfl : regWithInflFull).length
      ? [...(regWithInfl.length ? regWithInfl : regWithInflFull)].sort((a, b) => a.avgInfl - b.avgInfl)[0]
      : null
    const target = sweetSpot[0] ?? bestInfl
    const inflTone: InsightCardProps['tone'] = (target?.avgInfl ?? 99) <= 3 ? 'green' : (target?.avgInfl ?? 99) <= 7 ? 'amber' : 'red'

    const card3: InsightCardProps = target
      ? {
          tone: inflTone, icon: '⚖️',
          value: target.region,
          label: 'MEILLEUR ÉQUILIBRE TAILLE / INFLATION',
          body: sweetSpot.length > 0
            ? `${target.region} offre le meilleur équilibre macro : PIB ${fmtBn(target.value)} (≥ médiane ${fmtBn(medPIB)}) et inflation moyenne de ${fmtPctAbs(target.avgInfl)}. Zone de stabilité optimale pour Atlantic Re.`
            : `Aucune région ne cumule PIB ≥ médiane et inflation ≤ 5%. Meilleure inflation disponible : ${bestInfl ? `${bestInfl.region} (${fmtPctAbs(bestInfl.avgInfl)})` : '—'}.`,
          badge: { text: sweetSpot.length > 0 ? '✓ Zone macro prioritaire' : '⚠ Meilleur disponible', kind: sweetSpot.length > 0 ? 'ok' : 'warn' },
        }
      : { tone: 'amber', icon: '⚖️', value: '—', label: 'MEILLEUR ÉQUILIBRE TAILLE / INFLATION', body: 'Données insuffisantes.' }

    return [card1, card2, card3] satisfies InsightCardProps[]
  }, [data, barYear, barShowAvg, years])
}

// ── 6. INSIGHTS DISTRIBUTION INFLATION ────────────────────────────────────────
export function useMacroInflationDistributionInsights(data: MacroRow[]): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []

    // Médiane inflation par pays → agrégation par région
    const inflByCountry: Record<string, { region: string; vals: number[] }> = {}
    for (const r of data) {
      if (r.inflation_rate_pct == null) continue
      if (!inflByCountry[r.pays]) inflByCountry[r.pays] = { region: r.region ?? 'Autre', vals: [] }
      inflByCountry[r.pays].vals.push(r.inflation_rate_pct)
    }
    const medByCountry: Record<string, { region: string; med: number }> = {}
    for (const [pays, { region, vals }] of Object.entries(inflByCountry)) {
      medByCountry[pays] = { region, med: median(vals) }
    }

    const regionStats: Record<string, { meds: number[]; countries: string[] }> = {}
    for (const [pays, { region, med }] of Object.entries(medByCountry)) {
      ;(regionStats[region] ??= { meds: [], countries: [] }).meds.push(med)
      regionStats[region].countries.push(pays)
    }

    interface RegInflStat { region: string; medianInfl: number; range: number; countries: string[] }
    const regList: RegInflStat[] = Object.entries(regionStats).map(([region, { meds, countries }]) => ({
      region, medianInfl: median(meds), range: meds.length > 1 ? Math.max(...meds) - Math.min(...meds) : 0, countries: countries.sort(),
    }))
    // SA inclus dans Afrique Australe — aucune région à exclure
    const noSAReg = regList

    // Région la moins inflationniste
    const leastInflationary = [...noSAReg].sort((a, b) => a.medianInfl - b.medianInfl)[0]
    // Région la plus inflationniste
    const mostInflationary = [...noSAReg].sort((a, b) => b.medianInfl - a.medianInfl)[0]
    // Région la plus hétérogène
    const candidatesVol = noSAReg.filter(r => regionStats[r.region].meds.length >= 2)
    const mostVolatile = [...candidatesVol].sort((a, b) => b.range - a.range)[0]

    const cards: InsightCardProps[] = []
    if (leastInflationary) {
      cards.push({
        tone: 'green', icon: '🏅', value: leastInflationary.region,
        label: 'RÉGION LA MOINS INFLATIONNISTE',
        body: `Médiane d'inflation : ${fmtPctAbs(leastInflationary.medianInfl)} sur 2015–2024. Environnement de prix le plus stable parmi toutes les régions — conditions favorables pour la préservation des marges de réassurance et la stabilité des taux de change.`,
        badge: { text: '✓ Stabilité des prix', kind: 'ok' },
        countryTags: leastInflationary.countries.slice(0, 5),
      })
    }
    if (mostInflationary) {
      cards.push({
        tone: 'red', icon: '🔥', value: mostInflationary.region,
        label: 'RÉGION LA PLUS INFLATIONNISTE',
        body: `Médiane d'inflation : ${fmtPctAbs(mostInflationary.medianInfl)} sur 2015–2024. Pressions inflationnistes chroniques — risque d'érosion des primes réelles, de dépréciation monétaire et de sous-tarification des risques pour Atlantic Re.`,
        badge: { text: '⚠ Risque prix élevé', kind: 'alert' },
        countryTags: mostInflationary.countries.slice(0, 5),
      })
    }
    if (mostVolatile) {
      cards.push({
        tone: 'amber', icon: '📈', value: mostVolatile.region,
        label: 'RÉGION INFLATION LA PLUS HÉTÉROGÈNE',
        body: `Écart d'inflation entre pays de cette région : ${fmtPctAbs(mostVolatile.range)} (max–min). Forte dispersion intra-régionale requérant une analyse pays par pays avant engagement de réassurance — impossible de traiter cette région de manière homogène.`,
        badge: { text: '⚠ Hétérogénéité élevée', kind: 'warn' },
        countryTags: mostVolatile.countries.slice(0, 6),
      })
    }
    return cards
  }, [data])
}

// ── 7. INSIGHTS INTÉGRATION RÉGIONALE ─────────────────────────────────────────
export function useMacroIntegrationInsights(data: MacroRow[]): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []
    const stats = aggregateByCountry(data).filter(s => s.integration != null)

    const sorted = [...stats].sort((a, b) => (b.integration ?? 0) - (a.integration ?? 0))
    const top5 = sorted.slice(0, 5)
    const bottom5 = [...sorted].reverse().slice(0, 5)
    const medInteg = median(stats.map(s => s.integration as number))

    // Pairs bien intégrés ET forte croissance (double atout)
    const integratedAndGrowing = stats.filter(s => (s.integration ?? 0) > medInteg && (s.growth ?? 0) > 4)

    return [
      {
        tone: 'green', icon: '🤝', value: top5[0]?.pays ?? '—',
        label: 'LEADERS INTÉGRATION RÉGIONALE',
        body: `${top5.map(s => `${s.pays} (${fmtScore(s.integration ?? 0)})`).join(', ')} affichent les scores d'intégration régionale les plus élevés. Une intégration forte facilite les flux commerciaux et financiers — favorable au développement des marchés d'assurance et de réassurance.`,
        badge: { text: '✓ Intégration optimale', kind: 'ok' },
        countryTags: top5.map(s => s.pays),
      },
      {
        tone: 'amber', icon: '⚠️', value: bottom5[0]?.pays ?? '—',
        label: 'MARCHÉS LES MOINS INTÉGRÉS',
        body: `${bottom5.map(s => `${s.pays} (${fmtScore(s.integration ?? 0)})`).join(', ')} présentent les scores d'intégration les plus faibles. Marchés plus isolés : risque de fragmentation réglementaire, barrières au flux de capitaux et complexité opérationnelle accrue pour Atlantic Re.`,
        badge: { text: '⚠ Fragmentation régionale', kind: 'warn' },
        countryTags: bottom5.map(s => s.pays),
      },
      {
        tone: 'navy', icon: '🎯', value: `${integratedAndGrowing.length} pays`,
        label: 'INTÉGRÉS + DYNAMIQUES',
        body: integratedAndGrowing.length
          ? `${integratedAndGrowing.map(s => s.pays).join(', ')} : score d'intégration > médiane (${fmtScore(medInteg)}) ET croissance PIB > 4%. La double combinaison intégration + dynamisme maximise les opportunités de développement des activités de réassurance.`
          : 'Aucun pays ne combine intégration supérieure à la médiane et croissance > 4% sur la période.',
        badge: { text: '✓ Cible stratégique Atlantic Re', kind: 'ok' },
        countryTags: integratedAndGrowing.map(s => s.pays),
      },
    ] satisfies InsightCardProps[]
  }, [data])
}

// ── 8. INSIGHTS PROFIL PAYS MACRO ─────────────────────────────────────────────
export function useMacroCountryInsights(
  data: MacroRow[],
  country: string
): { cards: InsightCardProps[]; region: string; coverage: string } {
  return useMemo(() => {
    const empty = { cards: [] as InsightCardProps[], region: '', coverage: '' }
    if (!data.length || !country) return empty

    const cRows = data.filter(r => r.pays === country).sort((a, b) => a.annee - b.annee)
    if (!cRows.length) return empty

    const region = cRows[0].region ?? 'Autre'
    const minYear = cRows[0].annee
    const maxYear = cRows[cRows.length - 1].annee
    const nYears = maxYear - minYear || 1
    const coverage = `${minYear}-${maxYear}`

    // PIB : CAGR
    const gdpRows = cRows.filter(r => r.gdp_mn != null)
    const gdp0 = gdpRows[0]?.gdp_mn ?? 0
    const gdp1 = gdpRows[gdpRows.length - 1]?.gdp_mn ?? 0
    const cagrGdp = gdp0 > 0 && gdp1 > 0 ? (Math.pow(gdp1 / gdp0, 1 / nYears) - 1) * 100 : 0

    // Rangs
    const allMaxYear = data.filter(r => r.annee === maxYear)
    const gdpRanked = [...allMaxYear].filter(r => r.gdp_mn != null).sort((a, b) => (b.gdp_mn ?? 0) - (a.gdp_mn ?? 0))
    const rankGdp = gdpRanked.findIndex(r => r.pays === country) + 1
    const totalGdp = gdpRanked.length
    const gdpCapRanked = [...allMaxYear].filter(r => r.gdp_per_capita != null).sort((a, b) => (b.gdp_per_capita ?? 0) - (a.gdp_per_capita ?? 0))
    const rankGdpCap = gdpCapRanked.findIndex(r => r.pays === country) + 1
    const totalGdpCap = gdpCapRanked.length

    // Croissance moyenne
    const growthVals = cRows.filter(r => r.gdp_growth_pct != null).map(r => r.gdp_growth_pct as number)
    const avgGrowth = growthVals.length ? avg(growthVals) : 0
    const lastGrowth = growthVals.length ? growthVals[growthVals.length - 1] : 0
    const growthVolatility = growthVals.length > 1 ? Math.max(...growthVals) - Math.min(...growthVals) : 0

    // Inflation
    const inflVals = cRows.filter(r => r.inflation_rate_pct != null).map(r => r.inflation_rate_pct as number)
    const avgInfl = inflVals.length ? avg(inflVals) : 0
    const lastInfl = inflVals.length ? inflVals[inflVals.length - 1] : 0
    const maxInfl = inflVals.length ? Math.max(...inflVals) : 0
    const inflTrend = inflVals.length >= 2 ? inflVals[inflVals.length - 1] - inflVals[0] : 0

    // Compte courant
    const caVals = cRows.filter(r => r.current_account_mn != null).map(r => r.current_account_mn as number)
    const avgCA = caVals.length ? avg(caVals) : 0
    const lastCA = caVals.length ? caVals[caVals.length - 1] : null
    const posYears = caVals.filter(v => v > 0).length
    const negYears = caVals.filter(v => v < 0).length

    // PIB/hab
    const gdpCapVals = cRows.filter(r => r.gdp_per_capita != null).map(r => r.gdp_per_capita as number)
    const lastGdpCap = gdpCapVals.length ? gdpCapVals[gdpCapVals.length - 1] : 0
    const avgGdpCap = gdpCapVals.length ? avg(gdpCapVals) : 0
    const gdpCapEvol = gdpCapVals.length >= 2 ? gdpCapVals[gdpCapVals.length - 1] - gdpCapVals[0] : 0

    // Intégration régionale
    const integVals = cRows.filter(r => r.integration_regionale_score != null).map(r => r.integration_regionale_score as number)
    const integScore = integVals.length ? integVals[integVals.length - 1] : null
    const allInteg = data.filter(r => r.integration_regionale_score != null)
      .map(r => ({ pays: r.pays, score: r.integration_regionale_score as number }))
      .filter((v, i, arr) => arr.findIndex(x => x.pays === v.pays) === i)
      .sort((a, b) => b.score - a.score)
    const rankInteg = integScore != null ? allInteg.findIndex(r => r.pays === country) + 1 : null
    const totalInteg = allInteg.length

    // Score attractivité macro
    let score = 0
    const criteria: string[] = []
    if (avgGrowth >= 5) { score += 2; criteria.push(`+ Forte croissance PIB (${fmtPctAbs(avgGrowth)}/an moy.) — dynamisme économique soutenu`) }
    else if (avgGrowth >= 2) { score += 1; criteria.push(`/ Croissance PIB modérée (${fmtPctAbs(avgGrowth)}/an) — économie stable`) }
    else { score -= 1; criteria.push(`x Croissance PIB faible (${fmtPctAbs(avgGrowth)}/an) — risque de stagnation`) }
    if (avgInfl <= 5) { score += 2; criteria.push(`+ Inflation maîtrisée (${fmtPctAbs(avgInfl)} moy.) — stabilité des prix favorable`) }
    else if (avgInfl <= 10) { score += 1; criteria.push(`/ Inflation modérée (${fmtPctAbs(avgInfl)} moy.) — à surveiller`) }
    else { score -= 1; criteria.push(`x Inflation élevée (${fmtPctAbs(avgInfl)} moy.) — risque de change et d'érosion`) }
    if (avgGdpCap >= 3000) { score += 1; criteria.push(`+ PIB/hab significatif (${fmtUsd(avgGdpCap)}) — capacité de paiement établie`) }
    if (posYears > negYears) { score += 1; criteria.push(`+ Solde courant positif majoritairement (${posYears}/${posYears + negYears} années) — équilibre externe`) }
    else { criteria.push(`/ Déficit courant dominant (${negYears}/${posYears + negYears} années) — dépendance aux flux externes`) }

    const criteriaFormatted = criteria.map(c => {
      if (c.startsWith('+ ')) return '\u2714 ' + c.slice(2)
      if (c.startsWith('x ')) return '\u2716 ' + c.slice(2)
      return '\u26a0 ' + c.slice(2)
    })

    type Tone = InsightCardProps['tone']
    type BKind = NonNullable<InsightCardProps['badge']>['kind']

    const growthTone: Tone = avgGrowth >= 5 ? 'green' : avgGrowth >= 2 ? 'amber' : 'red'
    const inflTone: Tone = avgInfl <= 5 ? 'green' : avgInfl <= 10 ? 'amber' : 'red'
    const caTone: Tone = avgCA > 0 ? 'green' : avgCA > -2000 ? 'amber' : 'red'
    const [attractLabel, attractTone, attractBadge, attractBadgeKind]: [string, Tone, string, BKind] =
      score >= 5 ? ['Très Attractif', 'green', '\u2713 Priorité Macro Atlantic Re', 'ok'] :
      score >= 3 ? ['Attractif', 'navy', '\u2713 Environnement macro favorable', 'ok'] :
      score >= 1 ? ['Potentiel Modéré', 'amber', '\u26a0 Marché à surveiller', 'warn'] :
      ['Risqué', 'red', '\u2716 Conditions macro difficiles', 'alert']

    const sgn = (v: number) => v >= 0 ? '+' : ''

    const cards: InsightCardProps[] = [
      {
        tone: growthTone, icon: '\ud83d\udcc8',
        value: `${sgn(avgGrowth)}${avgGrowth.toFixed(1)}%/an moy.`,
        label: 'CROISSANCE PIB RÉELLE',
        body: `PIB ${minYear} : ${fmtBn(gdp0)} \u2192 ${maxYear} : ${fmtBn(gdp1)} (CAGR ${sgn(cagrGdp)}${cagrGdp.toFixed(1)}%/an). Croissance ${maxYear} : ${sgn(lastGrowth)}${lastGrowth.toFixed(1)}%. Volatilité sur ${nYears} ans : ${growthVolatility.toFixed(1)} pts. Rang continental PIB : ${rankGdp > 0 ? rankGdp : '-'}/${totalGdp}.`,
        badge: { text: avgGrowth >= 5 ? '\u2713 Forte croissance' : avgGrowth >= 2 ? '\u26a0 Croissance modérée' : '\u274c Faible croissance', kind: avgGrowth >= 5 ? 'ok' : avgGrowth >= 2 ? 'warn' : 'alert' },
      },
      {
        tone: inflTone, icon: '\ud83d\udcb5',
        value: `${fmtPctAbs(avgInfl)} moy.`,
        label: 'INFLATION MOYENNE',
        body: `Inflation moyenne ${minYear}\u2013${maxYear} : ${fmtPctAbs(avgInfl)}. Pic historique : ${fmtPctAbs(maxInfl)}. Dernière valeur (${maxYear}) : ${fmtPctAbs(lastInfl)}. Tendance : ${inflTrend >= 0 ? '\u2197' : '\u2198'} ${Math.abs(inflTrend).toFixed(1)} pts sur la période. ${avgInfl > 10 ? 'Risque d\'érosion des primes réelles.' : 'Conditions de prix stables.'}`,
        badge: { text: avgInfl <= 5 ? '\u2713 Prix stables' : avgInfl <= 10 ? '\u26a0 Modérée' : '\u2716 Élevée', kind: avgInfl <= 5 ? 'ok' : avgInfl <= 10 ? 'warn' : 'alert' },
      },
      {
        tone: caTone, icon: '\ud83e\uddfe',
        value: lastCA != null ? fmtBn(lastCA) : '—',
        label: 'SOLDE DU COMPTE COURANT',
        body: `Solde courant ${maxYear} : ${lastCA != null ? fmtBn(lastCA) : '—'}. Moyenne ${minYear}\u2013${maxYear} : ${fmtBn(avgCA)}. Années en surplus : ${posYears}/${posYears + negYears}. ${posYears > negYears ? 'Équilibre externe majoritairement positif \u2014 faible dépendance aux flux extérieurs.' : 'Déficit courant dominant \u2014 vulnérabilité aux flux de capitaux.'}`,
        badge: { text: avgCA > 0 ? '\u2713 Équilibre externe' : '\u26a0 Déficit structurel', kind: avgCA > 0 ? 'ok' : 'warn' },
      },
      {
        tone: gdpCapEvol >= 0 ? 'green' : 'amber', icon: '\ud83d\udcb0',
        value: fmtUsd(lastGdpCap),
        label: `PIB PAR HABITANT ${maxYear}`,
        body: `PIB/hab ${maxYear} : ${fmtUsd(lastGdpCap)} (moy. ${minYear}\u2013${maxYear} : ${fmtUsd(avgGdpCap)}). Évolution : ${sgn(gdpCapEvol)}${fmtUsd(gdpCapEvol)} sur ${nYears} ans. Rang continental : ${rankGdpCap > 0 ? rankGdpCap : '-'}/${totalGdpCap}. ${lastGdpCap >= 3000 ? 'Capacité de paiement significative \u2014 marché à fort potentiel assurance.' : 'Marché à faible revenu par habitant \u2014 développement de l\'assurance encore limité.'}`,
        badge: { text: gdpCapEvol >= 0 ? '\u2713 En progression' : '\u26a0 En régression', kind: gdpCapEvol >= 0 ? 'ok' : 'warn' },
      },
      ...(integScore != null ? [{
        tone: integScore >= 0.4 ? 'green' as Tone : integScore >= 0.3 ? 'amber' as Tone : 'navy' as Tone,
        icon: '\ud83e\udd1d',
        value: fmtScore(integScore),
        label: 'SCORE D\'INTÉGRATION RÉGIONALE',
        body: `Score d'intégration régionale : ${fmtScore(integScore)} (sur une échelle 0\u20131). Rang continental : ${rankInteg ?? '-'}/${totalInteg}. ${integScore >= 0.4 ? 'Forte intégration \u2014 facilite les flux commerciaux et l\'attractivité pour les investisseurs et réassureurs.' : 'Intégration modérée \u2014 barrières réglementaires et opérationnelles à considérer.'}`,
        badge: { text: integScore >= 0.4 ? '\u2713 Bien intégré' : '\u26a0 Intégration limitée', kind: integScore >= 0.4 ? 'ok' as BKind : 'warn' as BKind },
      } as InsightCardProps] : []),
      {
        tone: attractTone, icon: '\ud83c\udfaf',
        value: attractLabel,
        label: 'ATTRACTIVITÉ MACRO RÉASSURANCE',
        body: criteriaFormatted.join(' '),
        badge: { text: attractBadge, kind: attractBadgeKind },
      },
    ]

    return { cards, region, coverage }
  }, [data, country])
}

// ── 9. INSIGHTS CLASSEMENT MACRO ──────────────────────────────────────────────
export function useMacroRankingInsights(data: MacroRow[]): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []
    const stats = aggregateByCountry(data)

    // Top 5 croissance (hors extrêmes bizarres > 50%/an)
    const top5Growth = [...stats]
      .filter(s => s.growth != null && s.growth < 30)
      .sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0))
      .slice(0, 5)

    // Top 5 PIB/hab (tous pays, SA normal)
    const top5GdpCap = [...stats]
      .filter(s => s.gdpCap != null)
      .sort((a, b) => (b.gdpCap ?? 0) - (a.gdpCap ?? 0))
      .slice(0, 5)

    // Top 5 inflation la plus basse
    const top5LowInfl = [...stats]
      .filter(s => s.inflation != null && s.inflation > 0)
      .sort((a, b) => (a.inflation ?? 99) - (b.inflation ?? 99))
      .slice(0, 5)

    const fmtGrowth = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`

    return [
      {
        tone: 'green', icon: '\ud83d\udcc8',
        value: top5Growth[0] ? fmtGrowth(top5Growth[0].growth ?? 0) : '-',
        label: 'CHAMPIONS CROISSANCE PIB',
        body: top5Growth.length
          ? `Pays avec la croissance PIB réelle annuelle moyenne la plus forte : ${top5Growth.map(s => `${s.pays} (${fmtGrowth(s.growth ?? 0)})`).join(', ')}. Ces marchés en forte expansion offrent les meilleures perspectives macroéconomiques pour Atlantic Re.`
          : 'Données insuffisantes.',
        badge: { text: '\u2713 Dynamisme économique', kind: 'ok' },
        countryTags: top5Growth.map(s => s.pays),
      },
      {
        tone: 'navy', icon: '\ud83d\udcb0',
        value: top5GdpCap[0] ? fmtUsd(top5GdpCap[0].gdpCap ?? 0) : '-',
        label: 'MARCHÉS LES PLUS RICHES (PIB/HAB)',
        body: top5GdpCap.length
          ? `Pays avec le PIB/habitant le plus élevé (hors SA) : ${top5GdpCap.map(s => `${s.pays} (${fmtUsd(s.gdpCap ?? 0)})`).join(', ')}. Une densité économique élevée corrèle avec une demande d'assurance plus forte et des marchés plus matures.`
          : 'Données insuffisantes.',
        badge: { text: '\ud83d\udccc Marchés riches', kind: 'info' },
        countryTags: top5GdpCap.map(s => s.pays),
      },
      {
        tone: 'amber', icon: '\ud83c\udfc5',
        value: top5LowInfl[0] ? fmtPctAbs(top5LowInfl[0].inflation ?? 0) : '-',
        label: 'MARCHÉS LES PLUS STABLES (INFLATION)',
        body: top5LowInfl.length
          ? `Pays avec l'inflation la plus basse sur 2015–2024 : ${top5LowInfl.map(s => `${s.pays} (${fmtPctAbs(s.inflation ?? 0)})`).join(', ')}. La faible inflation préserve les marges de réassurance et réduit le risque de change.`
          : 'Données insuffisantes.',
        badge: { text: '\u2713 Prix stables', kind: 'ok' },
        countryTags: top5LowInfl.map(s => s.pays),
      },
    ] satisfies InsightCardProps[]
  }, [data])
}
