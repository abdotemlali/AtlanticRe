/**
 * useAnalyseInsights — Insights dynamiques pour AnalyseGlobale et AnalysePays
 * Toutes les valeurs viennent exclusivement des données réelles.
 */
import { useMemo } from 'react'
import type { NonVieRow, VieRow, MacroRow, GouvRow } from '../types/cartographie'
import type { InsightCardProps } from '../components/cartographie/InsightCard'

// ── Helpers ───────────────────────────────────────────────────────────────────
function sum(a: number[]) { return a.reduce((x, y) => x + y, 0) }
function avg(a: number[]) { return a.length ? sum(a) / a.length : 0 }
function median(a: number[]) {
  if (!a.length) return 0
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
function fmtMn(v: number) { return v >= 1000 ? `${(v / 1000).toFixed(1)} Mrd$` : `${v.toFixed(0)} Mn$` }

// ── useAnalyseGlobaleInsights ─────────────────────────────────────────────────
export function useAnalyseGlobaleInsights(
  nvData: NonVieRow[],
  vieData: VieRow[],
  macroData: MacroRow[],
  gouvData: GouvRow[]
): InsightCardProps[] {
  return useMemo(() => {
    if (!nvData.length) return []

    const nvYears = [...new Set(nvData.map(r => r.annee))].sort((a, b) => a - b)
    const lastYear = nvYears[nvYears.length - 1] ?? 2024

    // ── 1. Champions continentaux (NV + Vie cumulées, dernière année) ──────────
    const nvLast = nvData.filter(r => r.annee === lastYear)
    const vieLast = vieData.filter(r => r.annee === lastYear)

    const combinedPrimes: Record<string, { nv: number; vie: number; region: string }> = {}
    for (const r of nvLast) {
      if (!combinedPrimes[r.pays]) combinedPrimes[r.pays] = { nv: 0, vie: 0, region: r.region ?? 'Autre' }
      combinedPrimes[r.pays].nv += r.primes_emises_mn_usd ?? 0
    }
    for (const r of vieLast) {
      if (!combinedPrimes[r.pays]) combinedPrimes[r.pays] = { nv: 0, vie: 0, region: r.region ?? 'Autre' }
      combinedPrimes[r.pays].vie += r.primes_emises_mn_usd ?? 0
    }
    const ranked = Object.entries(combinedPrimes)
      .map(([pays, { nv, vie, region }]) => ({ pays, region, total: nv + vie }))
      .sort((a, b) => b.total - a.total)
    const top3 = ranked.slice(0, 3)
    const totalMarket = sum(ranked.map(r => r.total))
    const top3Pct = totalMarket > 0 ? sum(top3.map(r => r.total)) / totalMarket * 100 : 0

    // ── 2. Marchés en émergence (croissance NV > médiane ET gdp_growth > 5%) ──
    const nvGrowths = nvLast.map(r => r.croissance_primes_pct).filter((v): v is number => v != null)
    const medGrowthNV = median(nvGrowths)
    const macroLast = macroData.filter(r => r.annee === lastYear)
    const macroByPays: Record<string, MacroRow> = {}
    for (const r of macroLast) macroByPays[r.pays] = r

    const emerging = nvLast.filter(r =>
      (r.croissance_primes_pct ?? -999) > medGrowthNV &&
      (macroByPays[r.pays]?.gdp_growth_pct ?? 0) > 5
    )

    // ── 3. Concentration régionale ─────────────────────────────────────────────
    const byRegion: Record<string, number> = {}
    for (const [, { nv, vie, region }] of Object.entries(combinedPrimes)) {
      byRegion[region] = (byRegion[region] ?? 0) + nv + vie
    }
    const sortedRegions = Object.entries(byRegion).sort((a, b) => b[1] - a[1])
    const topRegion = sortedRegions[0]
    const topRegionPct = totalMarket > 0 ? (topRegion?.[1] ?? 0) / totalMarket * 100 : 0

    // ── 4. Risques institutionnels ─────────────────────────────────────────────
    const gouvLast = gouvData.filter(r => r.annee === lastYear)
    const riskCountries = gouvLast.filter(r =>
      (r.political_stability ?? 0) < -1 &&
      (r.fdi_inflows_pct_gdp ?? 1) < 1
    )

    return [
      {
        tone: 'navy',
        icon: '🏆',
        value: top3.map(r => r.pays).join(' · '),
        label: 'CHAMPIONS CONTINENTAUX',
        body: top3.length >= 3
          ? `${top3[0].pays} (${fmtMn(top3[0].total)}), ${top3[1].pays} (${fmtMn(top3[1].total)}) et ${top3[2].pays} (${fmtMn(top3[2].total)}) dominent le marché africain en ${lastYear}. Ensemble, ils concentrent ${top3Pct.toFixed(0)}% des primes NV+Vie.`
          : 'Données insuffisantes pour identifier les champions.',
        countryTags: top3.map(r => r.pays),
        badge: { text: `Top 3 · ${lastYear}`, kind: 'info' },
      },
      {
        tone: 'green',
        icon: '🌱',
        value: `${emerging.length} marchés`,
        label: 'MARCHÉS EN ÉMERGENCE',
        body: emerging.length
          ? `${emerging.slice(0, 4).map(r => r.pays).join(', ')} : croissance NV > médiane continentale (${medGrowthNV.toFixed(1)}%) ET PIB en expansion > 5% en ${lastYear}. Double dynamisme assurantiel et économique — opportunités prioritaires pour Atlantic Re.`
          : `Aucun marché ne cumule simultanément une croissance NV > médiane (${medGrowthNV.toFixed(1)}%) et une croissance PIB > 5% en ${lastYear}.`,
        countryTags: emerging.slice(0, 5).map(r => r.pays),
        badge: { text: '✓ Opportunités', kind: 'ok' },
      },
      {
        tone: 'amber',
        icon: '🌍',
        value: topRegion?.[0] ?? '—',
        label: 'CONCENTRATION RÉGIONALE',
        body: topRegion
          ? `${topRegion[0]} concentre ${topRegionPct.toFixed(1)}% du marché NV+Vie continental (${fmtMn(topRegion[1])}).${sortedRegions[1] ? ` ${sortedRegions[1][0]} arrive en 2ème position avec ${((sortedRegions[1][1] / (totalMarket || 1)) * 100).toFixed(1)}%.` : ''} Ces deux régions dominent structurellement le marché africain de l'assurance.`
          : 'Données régionales insuffisantes.',
        badge: { text: topRegionPct > 60 ? '⚠ Forte concentration' : 'ℹ️ Répartition', kind: topRegionPct > 60 ? 'warn' : 'info' },
      },
      {
        tone: 'red',
        icon: '⚠️',
        value: `${riskCountries.length} pays`,
        label: 'RISQUES INSTITUTIONNELS',
        body: riskCountries.length
          ? `${riskCountries.map(r => r.pays).join(', ')} combinent une stabilité politique inférieure à -1 (WGI) et des IDE inférieurs à 1% du PIB en ${lastYear}. Environnement institutionnel défavorable — vigilance accrue pour la réassurance.`
          : `Aucun pays ne cumule stabilité politique < -1 et IDE < 1% du PIB en ${lastYear}. Contexte institutionnel globalement favorable.`,
        countryTags: riskCountries.map(r => r.pays),
        badge: { text: riskCountries.length > 0 ? '⚠ Vigilance' : '✓ Stable', kind: riskCountries.length > 0 ? 'warn' : 'ok' },
      },
    ] satisfies InsightCardProps[]
  }, [nvData, vieData, macroData, gouvData])
}

// ── useAnalysePaysInsights ────────────────────────────────────────────────────
export function useAnalysePaysInsights(
  pays: string,
  nvRows: NonVieRow[],
  vieRows: VieRow[],
  macRows: MacroRow[],
  gouvRows: GouvRow[],
  allNvData: NonVieRow[],
  allMacroData: MacroRow[],
  allGouvData: GouvRow[]
): InsightCardProps[] {
  return useMemo(() => {
    if (!pays || (!nvRows.length && !macRows.length)) return []

    const allYears = [...new Set(allNvData.map(r => r.annee))].sort((a, b) => a - b)
    const lastYear = allYears[allYears.length - 1] ?? 2024

    const avgNum = (arr: (number | null | undefined)[]) => {
      const vals = arr.filter((v): v is number => v != null)
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    }
    const medianArr = (arr: (number | null | undefined)[]) => {
      const v = arr.filter((x): x is number => x != null).sort((a, b) => a - b)
      if (!v.length) return null
      const m = Math.floor(v.length / 2)
      return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
    }

    // ── Médianes continentales (dernière année) ────────────────────────────────
    const nvLast = allNvData.filter(r => r.annee === lastYear)
    const macLast = allMacroData.filter(r => r.annee === lastYear)
    const gouvLast = allGouvData.filter(r => r.annee === lastYear)

    const medPrimesNV = medianArr(nvLast.map(r => r.primes_emises_mn_usd))
    const medGdpCap = medianArr(macLast.map(r => r.gdp_per_capita))
    const medGdpGrowth = medianArr(macLast.map(r => r.gdp_growth_pct))
    const medStab = medianArr(gouvLast.map(r => r.political_stability))

    // ── Valeurs du pays (dernière année disponible pour ce pays) ──────────────
    const nvLastPays = nvRows.find(r => r.annee === lastYear) ?? nvRows[nvRows.length - 1]
    const macLastPays = macRows.find(r => r.annee === lastYear) ?? macRows[macRows.length - 1]
    const gouvLastPays = gouvRows.find(r => r.annee === lastYear) ?? gouvRows[gouvRows.length - 1]

    // ── Forces ────────────────────────────────────────────────────────────────
    const forces: string[] = []
    if (nvLastPays?.primes_emises_mn_usd != null && medPrimesNV != null && nvLastPays.primes_emises_mn_usd > medPrimesNV) forces.push('Primes Non-Vie')
    if (macLastPays?.gdp_per_capita != null && medGdpCap != null && macLastPays.gdp_per_capita > medGdpCap) forces.push('PIB/habitant')
    if (macLastPays?.gdp_growth_pct != null && medGdpGrowth != null && macLastPays.gdp_growth_pct > medGdpGrowth) forces.push('Croissance PIB')
    if (gouvLastPays?.political_stability != null && medStab != null && gouvLastPays.political_stability > medStab) forces.push('Stabilité politique')
    if ((gouvLastPays?.fdi_inflows_pct_gdp ?? 0) >= 5) forces.push('Attractivité IDE')

    // ── Faiblesses ────────────────────────────────────────────────────────────
    const faiblesses: string[] = []
    if (nvLastPays?.primes_emises_mn_usd != null && medPrimesNV != null && nvLastPays.primes_emises_mn_usd < medPrimesNV) faiblesses.push('Primes Non-Vie')
    if (macLastPays?.gdp_per_capita != null && medGdpCap != null && macLastPays.gdp_per_capita < medGdpCap) faiblesses.push('PIB/habitant')
    if (gouvLastPays?.political_stability != null && medStab != null && gouvLastPays.political_stability < medStab) faiblesses.push('Stabilité politique')
    if ((gouvLastPays?.fdi_inflows_pct_gdp ?? 5) < 1) faiblesses.push('Attractivité IDE')
    if ((macLastPays?.inflation_rate_pct ?? 0) > 10) faiblesses.push('Inflation élevée')

    // ── Tendance 5 ans ────────────────────────────────────────────────────────
    const nvPre = nvRows.filter(r => r.annee >= 2015 && r.annee <= 2019)
    const nvPost = nvRows.filter(r => r.annee >= 2020 && r.annee <= 2024)
    const avgNvPre = avgNum(nvPre.map(r => r.primes_emises_mn_usd))
    const avgNvPost = avgNum(nvPost.map(r => r.primes_emises_mn_usd))
    const nvTrend = avgNvPre != null && avgNvPost != null && avgNvPre > 0
      ? ((avgNvPost - avgNvPre) / avgNvPre) * 100
      : null

    const macPre = macRows.filter(r => r.annee >= 2015 && r.annee <= 2019)
    const macPost = macRows.filter(r => r.annee >= 2020 && r.annee <= 2024)
    const avgGdpGrowthPre = avgNum(macPre.map(r => r.gdp_growth_pct))
    const avgGdpGrowthPost = avgNum(macPost.map(r => r.gdp_growth_pct))

    // ── Opportunités réassurance ──────────────────────────────────────────────
    const nvCagrRows = nvRows.filter(r => r.primes_emises_mn_usd != null).sort((a, b) => a.annee - b.annee)
    const nvV0 = nvCagrRows[0]?.primes_emises_mn_usd ?? 0
    const nvV1 = nvCagrRows[nvCagrRows.length - 1]?.primes_emises_mn_usd ?? 0
    const nvN = nvCagrRows.length >= 2
      ? (nvCagrRows[nvCagrRows.length - 1].annee - nvCagrRows[0].annee) || 1
      : 1
    const nvCagr = nvV0 > 0 && nvV1 > 0 ? (Math.pow(nvV1 / nvV0, 1 / nvN) - 1) * 100 : 0

    const avgStab = avgNum(gouvRows.map(r => r.political_stability))
    const avgFdi = avgNum(gouvRows.map(r => r.fdi_inflows_pct_gdp))
    const isAttractive = nvCagr > 5 && (avgStab ?? -5) > -0.5

    const sgn = (v: number) => v >= 0 ? '+' : ''

    return [
      {
        tone: forces.length > faiblesses.length ? 'green' : forces.length > 0 ? 'amber' : 'navy',
        icon: '💪',
        value: `${forces.length} force${forces.length > 1 ? 's' : ''}`,
        label: 'FORCES',
        body: forces.length
          ? `${pays} dépasse la médiane continentale sur : ${forces.join(', ')}. ${forces.length >= 3 ? 'Profil supérieur à la moyenne africaine sur la majorité des indicateurs analysés.' : ''}`
          : `${pays} se situe en-dessous de la médiane continentale sur les indicateurs clés analysés en ${lastYear}. Axes d'amélioration à identifier.`,
        badge: { text: forces.length > 0 ? `✓ ${forces.length} dimension${forces.length > 1 ? 's' : ''} forte${forces.length > 1 ? 's' : ''}` : '⚠ Pas de force identifiée', kind: forces.length > 0 ? 'ok' : 'warn' },
      },
      {
        tone: faiblesses.length > 2 ? 'red' : faiblesses.length > 0 ? 'amber' : 'green',
        icon: '📉',
        value: `${faiblesses.length} faiblesse${faiblesses.length > 1 ? 's' : ''}`,
        label: 'FAIBLESSES',
        body: faiblesses.length
          ? `${pays} est en-dessous de la médiane sur : ${faiblesses.join(', ')}. Ces dimensions représentent des défis structurels pour le développement du marché d'assurance.`
          : `${pays} dépasse la médiane continentale sur tous les indicateurs analysés — profil très favorable pour Atlantic Re.`,
        badge: { text: faiblesses.length > 2 ? '⚠ Points de vigilance' : faiblesses.length > 0 ? '⚠ Zones à surveiller' : '✓ Profil solide', kind: faiblesses.length > 2 ? 'alert' : faiblesses.length > 0 ? 'warn' : 'ok' },
      },
      {
        tone: nvTrend != null && nvTrend > 10 ? 'green' : nvTrend != null && nvTrend > 0 ? 'amber' : 'navy',
        icon: '📊',
        value: nvTrend != null ? `${sgn(nvTrend)}${nvTrend.toFixed(0)}%` : '—',
        label: 'TENDANCE 5 ANS (2020–2024 VS 2015–2019)',
        body: [
          nvTrend != null
            ? `Primes NV : ${sgn(nvTrend)}${nvTrend.toFixed(1)}% (moy. 2020-2024 vs moy. 2015-2019).`
            : 'Données primes NV insuffisantes pour la comparaison.',
          avgGdpGrowthPre != null && avgGdpGrowthPost != null
            ? `Croissance PIB : ${sgn(avgGdpGrowthPost - avgGdpGrowthPre)}${(avgGdpGrowthPost - avgGdpGrowthPre).toFixed(1)} pts (${avgGdpGrowthPost.toFixed(1)}% vs ${avgGdpGrowthPre.toFixed(1)}% moy. antérieure).`
            : '',
        ].filter(Boolean).join(' '),
        badge: {
          text: nvTrend != null && nvTrend > 10 ? '✓ Forte progression' : nvTrend != null && nvTrend > 0 ? '↑ En progression' : nvTrend != null ? '↓ En recul' : '→ Données insuffisantes',
          kind: nvTrend != null && nvTrend > 0 ? 'ok' : 'warn',
        },
      },
      {
        tone: isAttractive ? 'green' : nvCagr > 0 ? 'amber' : 'navy',
        icon: '🎯',
        value: isAttractive ? 'Opportunité' : nvCagr > 0 ? 'Potentiel modéré' : 'À suivre',
        label: 'OPPORTUNITÉS RÉASSURANCE',
        body: [
          `Croissance NV (CAGR) : ${sgn(nvCagr)}${nvCagr.toFixed(1)}%/an sur ${nvCagrRows[0]?.annee ?? 2015}–${nvCagrRows[nvCagrRows.length - 1]?.annee ?? 2024}.`,
          avgStab != null ? `Stabilité politique moyenne : ${sgn(avgStab)}${avgStab.toFixed(2)} WGI.` : '',
          avgFdi != null ? `IDE moyen : ${avgFdi.toFixed(1)}% du PIB.` : '',
          isAttractive
            ? `Profil attractif : croissance soutenue + environnement institutionnel stable.`
            : nvCagr > 0
            ? `Dynamisme commercial présent mais contexte institutionnel à surveiller.`
            : `Faible dynamique assurantielle — marché à potentiel long terme.`,
        ].filter(Boolean).join(' '),
        badge: {
          text: isAttractive ? '✓ Priorité Atlantic Re' : nvCagr > 5 ? '📌 À développer' : '📌 Long terme',
          kind: isAttractive ? 'ok' : 'info',
        },
      },
    ] satisfies InsightCardProps[]
  }, [pays, nvRows, vieRows, macRows, gouvRows, allNvData, allMacroData, allGouvData])
}
