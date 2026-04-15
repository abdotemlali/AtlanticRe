/**
 * useGouvInsights.ts
 * Hook d'insights dynamiques pour la Cartographie Gouvernance.
 * Tous les insights sont calculés à partir des données réelles.
 * Aucune redondance, tous les pays mentionnés → countryTags.
 */

import { useMemo } from 'react'
import type { GouvRow } from '../types/cartographie'
import type { InsightCardProps } from '../components/cartographie/InsightCard'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
const median = (arr: number[]) => {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const fmtScore = (v: number) => v.toFixed(1)
const fmtPct = (v: number) => `${v.toFixed(1)}%`
const fmtWgi = (v: number) => v.toFixed(2)

/** Score composite gouvernance [0–100] */
function computeScore(r: GouvRow): number | null {
  const st = r.political_stability, rq = r.regulatory_quality
  const ka = r.kaopen, fd = r.fdi_inflows_pct_gdp
  if (st == null && rq == null && ka == null && fd == null) return null
  const nStab = st != null ? Math.max(0, Math.min(1, (st + 2.5) / 5)) : 0
  const nReg  = rq != null ? Math.max(0, Math.min(1, (rq + 2.5) / 5)) : 0
  const nKa   = ka != null ? Math.max(0, Math.min(1, (ka + 2.5) / 5)) : 0
  const nFdi  = fd != null ? Math.max(0, Math.min(1, fd / 15)) : 0
  return (0.35 * nStab + 0.35 * nReg + 0.20 * nKa + 0.10 * nFdi) * 100
}

/** Agrégat par pays (toutes années) */
interface CountryStat {
  pays: string
  region: string
  avgScore: number
  avgStab: number
  avgReg: number
  avgKaopen: number
  avgFdi: number
  trend: number // évolution score 1ère → dernière année dispo
}

function aggregateByCountry(data: GouvRow[]): CountryStat[] {
  const byPays: Record<string, GouvRow[]> = {}
  for (const r of data) {
    ;(byPays[r.pays] ??= []).push(r)
  }
  return Object.entries(byPays).map(([pays, rows]) => {
    const region = rows[rows.length - 1]?.region ?? 'Autre'
    const scores = rows.map(r => computeScore(r)).filter((v): v is number => v != null)
    const stabs  = rows.map(r => r.political_stability).filter((v): v is number => v != null)
    const regs   = rows.map(r => r.regulatory_quality).filter((v): v is number => v != null)
    const kas    = rows.map(r => r.kaopen).filter((v): v is number => v != null)
    const fdis   = rows.map(r => r.fdi_inflows_pct_gdp).filter((v): v is number => v != null)
    // Tendance : score dernière - score première année
    const sortedYears = rows.sort((a, b) => a.annee - b.annee)
    const first = computeScore(sortedYears[0]) ?? 0
    const last  = computeScore(sortedYears[sortedYears.length - 1]) ?? 0
    return {
      pays, region,
      avgScore:  avg(scores),
      avgStab:   avg(stabs),
      avgReg:    avg(regs),
      avgKaopen: avg(kas),
      avgFdi:    avg(fdis),
      trend:     last - first,
    }
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// Top 10 Score Composite Insights
// ══════════════════════════════════════════════════════════════════════════════
export function useGouvTop10Insights(data: GouvRow[], year: number | 'avg'): InsightCardProps[] {
  return useMemo(() => {
    const rows = year === 'avg' ? data : data.filter(r => r.annee === year)
    if (!rows.length) return []

    const scored = rows
      .map(r => ({ pays: r.pays, region: r.region ?? 'Autre', score: computeScore(r) }))
      .filter((r): r is { pays: string; region: string; score: number } => r.score != null)
      .sort((a, b) => b.score - a.score)

    if (!scored.length) return []

    const top3 = scored.slice(0, 3)
    const bottom3 = scored.slice(-3)
    const scores = scored.map(s => s.score)
    const medScore = median(scores)

    // Card 1 : Champions continentaux
    const card1: InsightCardProps = {
      tone: 'green', icon: '🏆',
      label: 'CHAMPIONS CONTINENTAUX',
      value: top3[0].pays,
      body: `${top3[0].pays} (${fmtScore(top3[0].score)}), ${top3[1]?.pays ?? '—'} (${fmtScore(top3[1]?.score ?? 0)}) et ${top3[2]?.pays ?? '—'} (${fmtScore(top3[2]?.score ?? 0)}) forment le trio de tête en gouvernance africaine. Ces marchés combinent stabilité politique, qualité réglementaire et ouverture financière — conditions idéales pour l'assurance SCAR.`,
      badge: { text: 'Leaders gouvernance', kind: 'ok' },
      countryTags: top3.map(t => t.pays),
    }

    // Card 2 : Fracture Nord/Sud du classement
    const medianCard = scored.filter(s => Math.abs(s.score - medScore) < 5)
    const card2: InsightCardProps = {
      tone: 'amber', icon: '📊',
      label: 'MÉDIANE CONTINENTALE',
      value: `${fmtScore(medScore)} / 100`,
      body: `Médiane continental : ${fmtScore(medScore)}/100. L'écart entre le 1er (${fmtScore(top3[0].score)}) et le dernier (${fmtScore(bottom3[0]?.score ?? 0)}) est de ${fmtScore(top3[0].score - (bottom3[0]?.score ?? 0))} points — une disparité qui structure directement les primes de risque poitique.`,
      countryTags: medianCard.slice(0, 3).map(s => s.pays),
    }

    // Card 3 : Zones fragiles
    const card3: InsightCardProps = {
      tone: 'red', icon: '⚠️',
      label: 'MARCHÉS À RISQUE ÉLEVÉ',
      value: bottom3[0]?.pays ?? '—',
      body: `${bottom3.map(b => b.pays).join(', ')} affichent les scores gouvernance les plus faibles (< ${fmtScore(bottom3[bottom3.length - 1]?.score ?? 0)}/100). Ces marchés concentrent instabilité politique et cadre réglementaire défaillant — exposition SCAR à surveiller étroitement.`,
      badge: { text: 'Risque gouvernance élevé', kind: 'alert' },
      countryTags: bottom3.map(b => b.pays),
    }

    return [card1, card2, card3]
  }, [data, year])
}

// ══════════════════════════════════════════════════════════════════════════════
// Carte Choroplèthe Insights
// ══════════════════════════════════════════════════════════════════════════════
export function useGouvChoroplethInsights(data: GouvRow[]): InsightCardProps[] {
  return useMemo(() => {
    const stats = aggregateByCountry(data)
    if (!stats.length) return []

    // Stabilité : top vs bottom
    const byStab = [...stats].sort((a, b) => b.avgStab - a.avgStab)
    const topStab3 = byStab.slice(0, 3)
    const bottomStab3 = byStab.slice(-3)

    // Qualité réglementaire : top
    const byReg = [...stats].sort((a, b) => b.avgReg - a.avgReg)
    const topReg3 = byReg.slice(0, 3)

    // FDI : top attracteurs
    const byFdi = [...stats].sort((a, b) => b.avgFdi - a.avgFdi)
    const topFdi3 = byFdi.slice(0, 3)

    const card2: InsightCardProps = {
      tone: 'navy', icon: '🏛️',
      label: 'STABILITÉ POLITIQUE — CARTE',
      value: topStab3[0].pays,
      body: `En stabilité politique (WGI), ${topStab3.map(t => t.pays).join(', ')} s'imposent (scores positifs > 0). À l'opposé, ${bottomStab3.map(b => b.pays).join(', ')} affichent des scores fortement négatifs (< ${fmtWgi(bottomStab3[bottomStab3.length - 1].avgStab)}) — zones de conflit et de tension institutionnelle.`,
      countryTags: [...topStab3.map(t => t.pays), ...bottomStab3.map(b => b.pays)],
    }

    const card3: InsightCardProps = {
      tone: 'green', icon: '📋',
      label: 'QUALITÉ RÉGLEMENTAIRE — TOP',
      value: topReg3[0].pays,
      body: `${topReg3.map(t => t.pays).join(', ')} disposent du cadre réglementaire le plus favorable d'Afrique (score WGI moyen : ${fmtWgi(avg(topReg3.map(t => t.avgReg)))}). Ces marchés facilitent l'entrée de nouveaux capteurs et la structuration des produits assuranciels.`,
      badge: { text: '✓ Cadre favorable investissement', kind: 'ok' },
      countryTags: topReg3.map(t => t.pays),
    }

    const card4: InsightCardProps = {
      tone: 'amber', icon: '💰',
      label: 'ATTRACTIVITÉ FDI — GÉOGRAPHIE',
      value: topFdi3[0].pays,
      body: `${topFdi3.map(t => t.pays).join(', ')} dominent l'attractivité IDE (${fmtPct(topFdi3[0].avgFdi)}, ${fmtPct(topFdi3[1]?.avgFdi ?? 0)}, ${fmtPct(topFdi3[2]?.avgFdi ?? 0)} du PIB respectivement). Ces flux reflètent la confiance des investisseurs étrangers dans la stabilité de ces juridictions.`,
      countryTags: topFdi3.map(t => t.pays),
    }

    return [card2, card3, card4]
  }, [data])
}

// ══════════════════════════════════════════════════════════════════════════════
// Scatter Stabilité vs Réglementation Insights
// ══════════════════════════════════════════════════════════════════════════════
export function useGouvScatterStabRegInsights(data: GouvRow[]): InsightCardProps[] {
  return useMemo(() => {
    const rows = data.filter(r => r.political_stability != null && r.regulatory_quality != null)
    if (!rows.length) return []

    // Q1 : topRight (stab > 0 AND reg > 0) — leaders
    const leaders = rows.filter(r => (r.political_stability ?? 0) > 0 && (r.regulatory_quality ?? 0) > 0)
    const payLeaders = [...new Set(leaders.map(r => r.pays))].slice(0, 5)

    // Q2 : bottomLeft (stab < 0 AND reg < 0) — double risque
    const fragile = rows.filter(r => (r.political_stability ?? 0) < -1 && (r.regulatory_quality ?? 0) < -0.8)
    const payFragile = [...new Set(fragile.map(r => r.pays))].slice(0, 5)

    // Corrélation stabilité–réglementation
    const stabArr = rows.map(r => r.political_stability as number)
    const regArr  = rows.map(r => r.regulatory_quality as number)
    const avgStab = avg(stabArr), avgReg = avg(regArr)
    const cov = avg(stabArr.map((s, i) => (s - avgStab) * (regArr[i] - avgReg)))
    const r_ = cov / (Math.sqrt(avg(stabArr.map(s => (s - avgStab) ** 2))) * Math.sqrt(avg(regArr.map(r => (r - avgReg) ** 2))) + 1e-10)

    const card1: InsightCardProps = {
      tone: 'green', icon: '🏆',
      label: 'DOUBLE AVANTAGE : STABLE + BIEN RÉGULÉ',
      value: payLeaders[0] ?? '—',
      body: `${payLeaders.join(', ')} occupent le quadrant supérieur droit : stabilité politique positive ET qualité réglementaire positive. Ces pays offrent les conditions les plus favorables pour les cédantes SCAR souhaitant structurer des traités proportionnels stables.`,
      badge: { text: '✓ Quadrant leaders', kind: 'ok' },
      countryTags: payLeaders,
    }

    const card2: InsightCardProps = {
      tone: 'red', icon: '⚠️',
      label: 'DOUBLE RISQUE : INSTABLE + MAL RÉGULÉ',
      value: payFragile[0] ?? '—',
      body: `${payFragile.join(', ')} cumulent instabilité politique (WGI < -1) et faiblesse réglementaire (WGI < -0.8) — la combinaison la plus défavorable pour la souscription. Les primes SCAR sur ces marchés doivent intégrer une prime de risque gouvernance significative.`,
      badge: { text: 'Risque cumulé élevé', kind: 'alert' },
      countryTags: payFragile,
    }

    const card3: InsightCardProps = {
      tone: 'amber', icon: '🔗',
      label: 'CORRÉLATION STABILITÉ–RÉGLEMENTATION',
      value: `r = ${r_.toFixed(2)}`,
      body: `La corrélation entre stabilité politique et qualité réglementaire est de ${r_.toFixed(2)} — ${Math.abs(r_) > 0.7 ? 'forte liaison : les pays bien gouvernés le sont généralement sur les deux dimensions.' : 'liaison modérée : des divergences existent, créant des opportunités d\'analyse différenciée.'}`,
      countryTags: [],
    }

    return [card1, card2, card3]
  }, [data])
}

// ══════════════════════════════════════════════════════════════════════════════
// Scatter KAOPEN vs FDI Insights
// ══════════════════════════════════════════════════════════════════════════════
export function useGouvScatterKaopenFdiInsights(data: GouvRow[]): InsightCardProps[] {
  return useMemo(() => {
    const rows = data.filter(r => r.kaopen != null && r.fdi_inflows_pct_gdp != null)
    if (!rows.length) return []

    const stats = aggregateByCountry(data)

    // Top KAOPEN ouvert
    const byKaopen = [...stats].filter(s => s.avgKaopen > 0).sort((a, b) => b.avgKaopen - a.avgKaopen)
    const topKaopen = byKaopen.slice(0, 4)

    // Top FDI attracteurs
    const byFdi = [...stats].filter(s => s.avgFdi > 5).sort((a, b) => b.avgFdi - a.avgFdi)
    const topFdi = byFdi.slice(0, 4)

    // Pays fermés (kaopen très négatif) avec IDE malgré tout
    const fermesAvecFdi = [...stats]
      .filter(s => s.avgKaopen < -1 && s.avgFdi > 3)
      .sort((a, b) => b.avgFdi - a.avgFdi)

    const avgKaopen = avg(rows.map(r => r.kaopen as number))
    const avgFdi    = avg(rows.map(r => r.fdi_inflows_pct_gdp as number))

    const card1: InsightCardProps = {
      tone: 'navy', icon: '🌐',
      label: 'MARCHÉS FINANCIÈREMENT OUVERTS',
      value: topKaopen[0]?.pays ?? '—',
      body: `${topKaopen.map(t => t.pays).join(', ')} affichent un index KAOPEN positif — signifiant une ouverture significative du compte de capital. Ces marchés permettent une réassurance plus fluide et des transferts de primes sans contraintes de change.`,
      badge: { text: '✓ Ouverture financière', kind: 'ok' },
      countryTags: topKaopen.map(t => t.pays),
    }

    const card2: InsightCardProps = {
      tone: 'green', icon: '💰',
      label: 'CHAMPIONS D\'ATTRACTIVITÉ IDE',
      value: topFdi[0]?.pays ?? '—',
      body: `${topFdi.map(t => t.pays).join(', ')} captent plus de 5% du PIB en flux IDE — signal fort de confiance des investisseurs. Pour l'assurance SCAR, ces flux induisent des besoins en couverture de projets d'infrastructure et d'assurance crédit.`,
      countryTags: topFdi.map(t => t.pays),
    }

    if (fermesAvecFdi.length > 0) {
      const card3: InsightCardProps = {
        tone: 'amber', icon: '🔍',
        label: 'PARADOXE : FERMÉS MAIS ATTRACTIFS',
        value: fermesAvecFdi[0].pays,
        body: `${fermesAvecFdi.map(f => f.pays).join(', ')} présentent un KAOPEN négatif (compte de capital contrôlé) mais attirent néanmoins des IDE significatifs (${fmtPct(fermesAvecFdi[0].avgFdi)}). Ces flux sont souvent concentrés sur des secteurs extractifs — à distinguer des investissements productifs diversifiés. KAOPEN moyen continental : ${fmtWgi(avgKaopen)}, FDI moyen : ${fmtPct(avgFdi)}.`,
        countryTags: fermesAvecFdi.slice(0, 3).map(f => f.pays),
      }
      return [card1, card2, card3]
    }

    const card3: InsightCardProps = {
      tone: 'navy', icon: '📊',
      label: 'VUE D\'ENSEMBLE KAOPEN / FDI',
      value: `KAOPEN moy. ${fmtWgi(avgKaopen)}`,
      body: `KAOPEN moyen continental : ${fmtWgi(avgKaopen)} (fermeture relative). FDI moyen : ${fmtPct(avgFdi)} du PIB. La plupart des marchés africains maintiennent des contrôles sur les flux de capitaux, limitant la réassurance transfrontalière spontanée.`,
      countryTags: [],
    }

    return [card1, card2, card3]
  }, [data])
}

// ══════════════════════════════════════════════════════════════════════════════
// Évolution régionale — Indicateurs bruts (stabilité politique)
// ══════════════════════════════════════════════════════════════════════════════
export function useGouvEvolutionInsights(data: GouvRow[]): InsightCardProps[] {
  return useMemo(() => {
    const allYears = [...new Set(data.map(r => r.annee))].sort((a, b) => a - b)
    if (allYears.length < 2) return []
    const minY = allYears[0], maxY = allYears[allYears.length - 1]

    // ── Δ Stabilité politique par région (minY → maxY) ───────────────────────
    const byRegStab: Record<string, { minY: number[]; maxY: number[]; all: number[] }> = {}
    for (const r of data) {
      if (r.political_stability == null) continue
      const reg = r.region ?? 'Autre'
      ;(byRegStab[reg] ??= { minY: [], maxY: [], all: [] })
      if (r.annee === minY) byRegStab[reg].minY.push(r.political_stability)
      if (r.annee === maxY) byRegStab[reg].maxY.push(r.political_stability)
      byRegStab[reg].all.push(r.political_stability)
    }

    type RegTrend = { region: string; v0: number; v1: number; delta: number; avgAll: number }
    const regTrends: RegTrend[] = Object.entries(byRegStab)
      .filter(([, d]) => d.minY.length > 0 && d.maxY.length > 0)
      .map(([region, d]) => ({
        region,
        v0: avg(d.minY),
        v1: avg(d.maxY),
        delta: avg(d.maxY) - avg(d.minY),
        avgAll: avg(d.all),
      }))

    if (!regTrends.length) return []
    const improving = [...regTrends].sort((a, b) => b.delta - a.delta)
    const declining  = [...regTrends].sort((a, b) => a.delta - b.delta)
    const mostStable = [...regTrends].sort((a, b) => b.avgAll - a.avgAll)

    // Card 1 : Région la plus améliorée sur la stabilité politique brute
    const card1: InsightCardProps = {
      tone: improving[0].delta >= 0 ? 'green' : 'amber',
      icon: '📈',
      label: 'REGION EN PROGRESSION — STABILITÉ POLITIQUE',
      value: improving[0].region,
      body: `${improving[0].region} enregistre la plus forte progression de stabilité politique WGI sur ${minY}–${maxY} : ${improving[0].delta >= 0 ? '+' : ''}${improving[0].delta.toFixed(2)} pts (${improving[0].v0.toFixed(2)} → ${improving[0].v1.toFixed(2)}). ${improving[1] ? `${improving[1].region} suit avec ${improving[1].delta >= 0 ? '+' : ''}${improving[1].delta.toFixed(2)} pts.` : ''} Un WGI positif signifie un environnement de souscription plus serein pour les traités SCAR.`,
      badge: { text: `${improving[0].delta >= 0 ? '+' : ''}${improving[0].delta.toFixed(2)} WGI sur ${minY}–${maxY}`, kind: 'ok' },
      countryTags: [],
    }

    // Card 2 : Région la plus dégradée — focus sur l'indicateur réglementation aussi
    // Pour ajouter de la profondeur : on compare aussi Δ réglementation dans cette région
    const byRegReg: Record<string, { minY: number[]; maxY: number[] }> = {}
    for (const r of data) {
      if (r.regulatory_quality == null) continue
      const reg = r.region ?? 'Autre'
      ;(byRegReg[reg] ??= { minY: [], maxY: [] })
      if (r.annee === minY) byRegReg[reg].minY.push(r.regulatory_quality)
      if (r.annee === maxY) byRegReg[reg].maxY.push(r.regulatory_quality)
    }
    const declReg = declining[0].region
    const deltaReg = byRegReg[declReg]
      ? (avg(byRegReg[declReg].maxY) - avg(byRegReg[declReg].minY)).toFixed(2)
      : '—'

    const card2: InsightCardProps = {
      tone: 'red',
      icon: '📉',
      label: 'RÉGION EN DÉGRADATION — DOUBLE SIGNAL',
      value: declining[0].region,
      body: `${declining[0].region} enregistre la plus forte détérioration de stabilité politique sur ${minY}–${maxY} : ${declining[0].delta.toFixed(2)} pts WGI (${declining[0].v0.toFixed(2)} → ${declining[0].v1.toFixed(2)}). La qualité réglementaire évolue aussi de ${deltaReg} pts dans cette région — une convergence de détérioration sur les deux indicateurs renforce le signal de risque pour l'underwriting SCAR.`,
      badge: { text: `${declining[0].delta.toFixed(2)} WGI`, kind: 'alert' },
      countryTags: [],
    }

    // Card 3 : Pays individuels — top Δ stabilité politique (pas composite)
    type PayTrend = { pays: string; region: string; deltaStab: number; deltaReg: number; v0: number; v1: number }
    const payTrends: PayTrend[] = []
    const byPaysData: Record<string, GouvRow[]> = {}
    for (const r of data) { (byPaysData[r.pays] ??= []).push(r) }
    for (const [pays, rows] of Object.entries(byPaysData)) {
      const region = rows[rows.length - 1]?.region ?? 'Autre'
      const r0stab = rows.find(r => r.annee === minY)?.political_stability
      const r1stab = rows.find(r => r.annee === maxY)?.political_stability
      const r0reg  = rows.find(r => r.annee === minY)?.regulatory_quality
      const r1reg  = rows.find(r => r.annee === maxY)?.regulatory_quality
      if (r0stab == null || r1stab == null) continue
      payTrends.push({
        pays, region,
        deltaStab: r1stab - r0stab,
        deltaReg: r0reg != null && r1reg != null ? r1reg - r0reg : 0,
        v0: r0stab, v1: r1stab,
      })
    }

    const topGainers  = [...payTrends].sort((a, b) => b.deltaStab - a.deltaStab).slice(0, 4)
    const topLosers   = [...payTrends].sort((a, b) => a.deltaStab - b.deltaStab).slice(0, 3)
    // Marchés qui reculent sur DEUX indicateurs simultanément
    const dualDecline = payTrends.filter(t => t.deltaStab < -0.2 && t.deltaReg < -0.1).sort((a, b) => a.deltaStab - b.deltaStab)

    const card3: InsightCardProps = {
      tone: 'navy',
      icon: '🔄',
      label: 'DYNAMIQUE INDIVIDUELLE — STABILITÉ POLITIQUE',
      value: topGainers[0]?.pays ?? '—',
      body: `Pays en plus forte progression de stabilité politique : ${topGainers.map(t => `${t.pays} (${t.deltaStab >= 0 ? '+' : ''}${t.deltaStab.toFixed(2)})`).join(', ')}. En recul : ${topLosers.map(t => `${t.pays} (${t.deltaStab.toFixed(2)})`).join(', ')}. ${dualDecline.length > 0 ? `⚠️ ${dualDecline.slice(0, 3).map(t => t.pays).join(', ')} reculent simultanément en stabilité ET en réglementation — double détérioration à surveiller.` : ''}`,
      badge: dualDecline.length > 0 ? { text: `${dualDecline.length} pays en double recul`, kind: 'alert' } : undefined,
      countryTags: [...topGainers.map(t => t.pays), ...topLosers.map(t => t.pays), ...dualDecline.slice(0, 3).map(t => t.pays)],
    }

    return [card1, card2, card3]
  }, [data])
}

// ══════════════════════════════════════════════════════════════════════════════
// Profil Pays — Indicateurs bruts uniquement (pas de composite)
// ══════════════════════════════════════════════════════════════════════════════
export function useGouvCountryInsights(data: GouvRow[], pays: string): InsightCardProps[] {
  return useMemo(() => {
    if (!pays) return []
    const rows = data.filter(r => r.pays === pays).sort((a, b) => a.annee - b.annee)
    if (!rows.length) return []

    const last  = rows[rows.length - 1]
    const first = rows[0]

    // ── Δ de chaque indicateur brut sur la période ────────────────────────────
    const dStab = last.political_stability  != null && first.political_stability  != null ? last.political_stability  - first.political_stability  : null
    const dReg  = last.regulatory_quality   != null && first.regulatory_quality   != null ? last.regulatory_quality   - first.regulatory_quality   : null
    const dKa   = last.kaopen               != null && first.kaopen               != null ? last.kaopen               - first.kaopen               : null
    const dFdi  = last.fdi_inflows_pct_gdp  != null && first.fdi_inflows_pct_gdp  != null ? last.fdi_inflows_pct_gdp  - first.fdi_inflows_pct_gdp  : null

    const nImproved = [dStab, dReg, dKa, dFdi].filter(d => d != null && d > 0.05).length
    const nDeclined = [dStab, dReg, dKa, dFdi].filter(d => d != null && d < -0.05).length

    // ── Card 1 : Trajectoire multi-indicateurs ────────────────────────────────
    const dimLines: string[] = []
    if (dStab != null) dimLines.push(`Stabilité ${dStab >= 0 ? '+' : ''}${dStab.toFixed(2)} WGI`)
    if (dReg  != null) dimLines.push(`Réglementation ${dReg >= 0 ? '+' : ''}${dReg.toFixed(2)} WGI`)
    if (dKa   != null) dimLines.push(`KAOPEN ${dKa >= 0 ? '+' : ''}${dKa.toFixed(2)}`)
    if (dFdi  != null) dimLines.push(`IDE ${dFdi >= 0 ? '+' : ''}${dFdi.toFixed(1)} pp`)

    const overallTone = nImproved > nDeclined ? 'green' : nDeclined > nImproved ? 'red' : 'amber'
    const card1: InsightCardProps = {
      tone: overallTone, icon: nImproved >= nDeclined ? '📈' : '📉',
      label: 'TRAJECTOIRE MULTI-INDICATEURS',
      value: `${nImproved} hausse · ${nDeclined} baisse`,
      body: `Sur ${first.annee}–${last.annee}, ${pays} affiche : ${dimLines.join(' · ')}. ${nImproved > nDeclined ? 'La balance est positive : davantage d\'indicateurs en amélioration qu\'en recul.' : nDeclined > nImproved ? 'La balance est négative : recul dominant sur plusieurs dimensions.' : 'La gouvernance est globalement stable — ni embellie ni dégradation nette.'}`,
      badge: { text: nImproved > nDeclined ? '✓ Bilan positif' : nDeclined > nImproved ? '↘ Bilan négatif' : '→ Stable', kind: nImproved > nDeclined ? 'ok' : nDeclined > nImproved ? 'alert' : 'info' },
      countryTags: [pays],
    }

    // ── Card 2 : Rang par indicateur (pas de composite) ────────────────────────
    const lastYearRows = data.filter(r => r.annee === last.annee)
    const rankByField = (field: keyof GouvRow) => {
      const sorted = lastYearRows
        .filter(r => r[field] != null)
        .sort((a, b) => (b[field] as number) - (a[field] as number))
      const idx = sorted.findIndex(r => r.pays === pays)
      return { rank: idx + 1, total: sorted.length }
    }
    const stabRank = rankByField('political_stability')
    const regRank  = rankByField('regulatory_quality')
    const kaRank   = rankByField('kaopen')
    const fdiRank  = rankByField('fdi_inflows_pct_gdp')

    const rankLabel = (r: { rank: number; total: number }) =>
      r.rank === 0 ? '—' : `${r.rank}e/${r.total}`
    const bestField = [stabRank, regRank, kaRank, fdiRank].reduce(
      (a, b) => (b.rank > 0 && (a.rank === 0 || b.rank < a.rank) ? b : a),
      { rank: 0, total: 0 }
    )
    const bestName = bestField === stabRank ? 'Stabilité politique'
      : bestField === regRank ? 'Qualité réglementaire'
      : bestField === kaRank ? 'KAOPEN' : 'IDE'

    const card2: InsightCardProps = {
      tone: stabRank.rank <= stabRank.total / 3 ? 'green' : stabRank.rank <= 2 * stabRank.total / 3 ? 'amber' : 'red',
      icon: '🏅',
      label: 'RANGS PAR INDICATEUR',
      value: `${bestName} : ${rankLabel(bestField)}`,
      body: `En ${last.annee}, ${pays} se classe : Stabilité pol. ${rankLabel(stabRank)} · Qualité régl. ${rankLabel(regRank)} · KAOPEN ${rankLabel(kaRank)} · IDE ${rankLabel(fdiRank)}. Point le plus fort : ${bestName} (${rankLabel(bestField)}). Ces rangs permettent d'identifier précisément les leviers d'amélioration prioritaires pour renforcer l'attractivité du marché.`,
      countryTags: [pays],
    }

    // ── Card 3 : Comparaison régionale sur les indicateurs bruts ──────────────
    const peers = lastYearRows.filter(r => r.region === last.region && r.pays !== pays)
    const peerAvgStab = avg(peers.map(r => r.political_stability).filter((v): v is number => v != null))
    const peerAvgReg  = avg(peers.map(r => r.regulatory_quality).filter((v): v is number => v != null))
    const peerAvgFdi  = avg(peers.map(r => r.fdi_inflows_pct_gdp).filter((v): v is number => v != null))

    const stabVsPeers = last.political_stability != null ? last.political_stability - peerAvgStab : null
    const regVsPeers  = last.regulatory_quality  != null ? last.regulatory_quality  - peerAvgReg  : null
    const fdiVsPeers  = last.fdi_inflows_pct_gdp != null ? last.fdi_inflows_pct_gdp - peerAvgFdi  : null

    const card3: InsightCardProps = {
      tone: (stabVsPeers ?? 0) > 0 && (regVsPeers ?? 0) > 0 ? 'green' : (stabVsPeers ?? 0) < 0 && (regVsPeers ?? 0) < 0 ? 'red' : 'navy',
      icon: '🌍',
      label: 'COMPARAISON RÉGIONALE — INDICATEURS BRUTS',
      value: last.region ?? '—',
      body: `Vs. pairs de ${last.region ?? 'sa région'} (${last.annee}) — Stabilité : ${stabVsPeers != null ? `${stabVsPeers >= 0 ? '+' : ''}${stabVsPeers.toFixed(2)} WGI` : '—'} · Réglementation : ${regVsPeers != null ? `${regVsPeers >= 0 ? '+' : ''}${regVsPeers.toFixed(2)} WGI` : '—'} · IDE : ${fdiVsPeers != null ? `${fdiVsPeers >= 0 ? '+' : ''}${fdiVsPeers.toFixed(1)} pp` : '—'}. ${(stabVsPeers ?? 0) > 0 && (regVsPeers ?? 0) > 0 ? `${pays} surperforme sa région sur les deux axes institucionnels clés.` : (stabVsPeers ?? 0) < 0 && (regVsPeers ?? 0) < 0 ? `${pays} est en retrait sur les deux axes vs. sa région — convergence nécessaire.` : `Profil mixte : avantage sur certains indicateurs, retard sur d'autres.`}`,
      countryTags: [pays],
    }

    return [card1, card2, card3]
  }, [data, pays])
}

// ══════════════════════════════════════════════════════════════════════════════
// Distribution KAOPEN par région Insights
// ══════════════════════════════════════════════════════════════════════════════
export function useGouvKaopenDistribInsights(data: GouvRow[]): InsightCardProps[] {
  return useMemo(() => {
    const stats = aggregateByCountry(data)
    if (!stats.length) return []

    // Par région
    const byReg: Record<string, number[]> = {}
    for (const s of stats) {
      ;(byReg[s.region] ??= []).push(s.avgKaopen)
    }
    const regStats = Object.entries(byReg)
      .map(([region, vals]) => ({ region, avg: avg(vals), n: vals.length }))
      .sort((a, b) => b.avg - a.avg)

    const mostOpen   = regStats[0]
    const leastOpen  = regStats[regStats.length - 1]
    const openCountries = stats.filter(s => s.avgKaopen > 1).sort((a, b) => b.avgKaopen - a.avgKaopen)
    const closedCountries = stats.filter(s => s.avgKaopen < -1.5).sort((a, b) => a.avgKaopen - b.avgKaopen)

    const card1: InsightCardProps = {
      tone: 'navy', icon: '🌐',
      label: 'RÉGION LA PLUS OUVERTE FINANCIÈREMENT',
      value: mostOpen.region,
      body: `${mostOpen.region} est la région africaine la plus ouverte aux flux de capitaux (KAOPEN moyen : ${fmtWgi(mostOpen.avg)}), suivie de ${regStats[1]?.region ?? '—'} (${fmtWgi(regStats[1]?.avg ?? 0)}). ${leastOpen.region} reste la plus fermée (${fmtWgi(leastOpen.avg)}), exposant les cédantes locales à des risques de change et de conversion.`,
      countryTags: [],
    }

    const card2: InsightCardProps = {
      tone: 'green', icon: '🔓',
      label: 'PAYS AVEC COMPTE CAPITAL OUVERT',
      value: openCountries[0]?.pays ?? '—',
      body: openCountries.length > 0
        ? `${openCountries.slice(0, 5).map(c => c.pays).join(', ')} disposent d'un KAOPEN > 1 — signalant une convertibilité quasi-totale du compte de capital. Ces marchés offrent les meilleures conditions pour les flux de réassurance internationale.`
        : 'Peu de marchés africains ont un compte de capital pleinement libéralisé.',
      badge: { text: `${openCountries.length} pays avec KAOPEN > 1`, kind: 'ok' },
      countryTags: openCountries.slice(0, 5).map(c => c.pays),
    }

    const card3: InsightCardProps = {
      tone: 'amber', icon: '🔒',
      label: 'MARCHÉS À CONTRÔLE DE CAPITAUX FORT',
      value: closedCountries[0]?.pays ?? '—',
      body: closedCountries.length > 0
        ? `${closedCountries.slice(0, 5).map(c => c.pays).join(', ')} maintiennent un contrôle stricte sur le compte de capital (KAOPEN < -1.5). Pour les cédantes, ces marchés impliquent des obstacles à la remontée des primes et à la constitution des provisions techniques en devises.`
        : 'La plupart des marchés sont modérément ouverts.',
      badge: { text: `${closedCountries.length} pays avec KAOPEN < -1.5`, kind: 'alert' },
      countryTags: closedCountries.slice(0, 5).map(c => c.pays),
    }

    return [card1, card2, card3]
  }, [data])
}

// ══════════════════════════════════════════════════════════════════════════════
// Classement gouvernemental Insights — basé sur les indicateurs bruts
// ══════════════════════════════════════════════════════════════════════════════
export function useGouvRankingInsights(data: GouvRow[]): InsightCardProps[] {
  return useMemo(() => {
    const stats = aggregateByCountry(data)
    if (!stats.length) return []

    // Top stabilité politique
    const byStab  = [...stats].filter(s => s.avgStab  != null).sort((a, b) => b.avgStab  - a.avgStab)
    const topStab5 = byStab.slice(0, 5)
    const lowStab5 = byStab.slice(-5)

    // Top qualité réglementaire
    const byReg   = [...stats].filter(s => s.avgReg   != null).sort((a, b) => b.avgReg   - a.avgReg)
    const topReg5  = byReg.slice(0, 5)

    // Top KAOPEN (ouverture financière)
    const byKa    = [...stats].filter(s => s.avgKaopen != null).sort((a, b) => b.avgKaopen - a.avgKaopen)
    const topKa4   = byKa.filter(s => s.avgKaopen > 0).slice(0, 4)

    // Top FDI
    const byFdi   = [...stats].filter(s => s.avgFdi   != null).sort((a, b) => b.avgFdi   - a.avgFdi)
    const topFdi4  = byFdi.slice(0, 4)

    // Pays en double avantage (stab > 0 ET reg > 0)
    const doublePos = stats.filter(s => s.avgStab > 0 && s.avgReg > 0).sort((a, b) => (b.avgStab + b.avgReg) - (a.avgStab + a.avgReg))

    const card1: InsightCardProps = {
      tone: 'green', icon: '🏆',
      label: 'TOP STABILITÉ POLITIQUE',
      value: topStab5[0]?.pays ?? '—',
      body: `${topStab5.map(t => `${t.pays} (${fmtWgi(t.avgStab)})`).join(', ')} affichent les meilleures moyennes de stabilité politique WGI sur 2015–2024. Ces environnements institutionnels stables réduisent le risque de rupture brutale de contrats de réassurance.`,
      badge: { text: `Top 5 stabilité politique`, kind: 'ok' },
      countryTags: topStab5.map(t => t.pays),
    }

    const card2: InsightCardProps = {
      tone: 'navy', icon: '📋',
      label: 'TOP QUALITÉ RÉGLEMENTAIRE',
      value: topReg5[0]?.pays ?? '—',
      body: `${topReg5.map(t => `${t.pays} (${fmtWgi(t.avgReg)})`).join(', ')} présentent le cadre réglementaire le plus favorable. Une réglementation solide (WGI > 0) facilite l'entrée des SCAR et la structuration de produits assuranciels complexes.`,
      countryTags: topReg5.map(t => t.pays),
    }

    const card3: InsightCardProps = {
      tone: 'red', icon: '⚠️',
      label: 'MARCHÉS INSTABILITÉ POLITIQUE CHRONIQUE',
      value: lowStab5[0]?.pays ?? '—',
      body: `${lowStab5.map(t => `${t.pays} (${fmtWgi(t.avgStab)})`).join(', ')} enregistrent les scores de stabilité les plus faibles du continent. Ces marchés exposent les cédantes à des risques de nationalisation, de coup d'État ou d'interruption réglementaire — prime de risque SCAR à recalibrer.`,
      badge: { text: 'Stabilité chroniquement faible', kind: 'alert' },
      countryTags: lowStab5.map(t => t.pays),
    }

    const card4: InsightCardProps = {
      tone: 'amber', icon: '🌐',
      label: 'MARCHÉS OUVERTS ET ATTRACTIFS (KAOPEN + FDI)',
      value: topKa4[0]?.pays ?? topFdi4[0]?.pays ?? '—',
      body: `${topKa4.length > 0 ? `Marchés ouverts financièrement (KAOPEN > 0) : ${topKa4.map(t => t.pays).join(', ')}.` : ''} ${topFdi4.length > 0 ? `Meilleurs attracteurs IDE : ${topFdi4.map(t => `${t.pays} (${fmtPct(t.avgFdi)})`).join(', ')}.` : ''} Ces marchés combinent ouverture du compte de capital et flux d'investissements — conditions propices à la réassurance internationale.`,
      countryTags: [...new Set([...topKa4.map(t => t.pays), ...topFdi4.map(t => t.pays)])],
    }

    if (doublePos.length > 0) {
      const card5: InsightCardProps = {
        tone: 'green', icon: '⭐',
        label: 'DOUBLE AVANTAGE : STABLE + BIEN RÉGULÉ',
        value: doublePos[0].pays,
        body: `${doublePos.slice(0, 5).map(t => t.pays).join(', ')} combinent stabilité politique positive ET qualité réglementaire positive — la situation idéale pour l'activité SCAR. Ce double avantage réduit à la fois le risque politique et le risque réglementaire sur ces marchés.`,
        badge: { text: `${doublePos.length} pays en double avantage`, kind: 'ok' },
        countryTags: doublePos.slice(0, 5).map(t => t.pays),
      }
      return [card1, card2, card3, card4, card5]
    }

    return [card1, card2, card3, card4]
  }, [data])
}

// ══════════════════════════════════════════════════════════════════════════════
// Heatmap Qualité Réglementaire — 3 insights innovants
// Angles : trajectoire réformiste · prévisibilité/volatilité · convergence régionale
// ══════════════════════════════════════════════════════════════════════════════
export function useGouvHeatmapRegInsights(data: GouvRow[]): InsightCardProps[] {
  return useMemo(() => {
    const allYears = [...new Set(data.map(r => r.annee))].sort((a, b) => a - b)
    if (allYears.length < 2) return []
    const minY = allYears[0], maxY = allYears[allYears.length - 1]

    // ── Par pays : série temporelle de regulatory_quality ──────────────────
    const byPays: Record<string, { region: string; vals: { annee: number; rq: number }[] }> = {}
    for (const r of data) {
      if (r.regulatory_quality == null) continue
      ;(byPays[r.pays] ??= { region: r.region ?? 'Autre', vals: [] }).vals.push({ annee: r.annee, rq: r.regulatory_quality })
    }

    // ── 1. Réformateurs réglementaires — trajectoire la plus positive ───────
    // Calcul : Δreg = rq(maxY) - rq(minY)
    type RegTraj = { pays: string; region: string; delta: number; v0: number; v1: number }
    const trajectories: RegTraj[] = []
    for (const [pays, { region, vals }] of Object.entries(byPays)) {
      const sorted = vals.sort((a, b) => a.annee - b.annee)
      const v0 = sorted.find(v => v.annee === minY)?.rq
      const v1 = sorted.find(v => v.annee === maxY)?.rq
      if (v0 == null || v1 == null) continue
      trajectories.push({ pays, region, delta: v1 - v0, v0, v1 })
    }

    const topReformers  = [...trajectories].sort((a, b) => b.delta - a.delta).slice(0, 4)
    const topDecliners  = [...trajectories].sort((a, b) => a.delta - b.delta).slice(0, 3)

    // ── 2. Prévisibilité réglementaire — pays à faible volatilité (écart-type bas) ──
    // Un marché stable réglementairement est plus prévisible pour les SCAR
    type StabilityRec = { pays: string; region: string; stdDev: number; avgReg: number }
    const stability: StabilityRec[] = Object.entries(byPays).map(([pays, { region, vals }]) => {
      if (vals.length < 3) return null
      const regs = vals.map(v => v.rq)
      const mean = avg(regs)
      const stdDev = Math.sqrt(avg(regs.map(r => (r - mean) ** 2)))
      return { pays, region, stdDev, avgReg: mean }
    }).filter((s): s is StabilityRec => s != null)

    // Marchés stables = écart-type faible ET qualité réglementaire positive
    const stablePositive = stability
      .filter(s => s.avgReg > 0 && s.stdDev < 0.15)
      .sort((a, b) => a.stdDev - b.stdDev)
    // Marchés volatils = écart-type élevé (imprévisibles)
    const volatile = stability
      .filter(s => s.stdDev > 0.25)
      .sort((a, b) => b.stdDev - a.stdDev)

    // ── 3. Convergence régionale — est-ce que les régions s'homogénéisent ? ──
    // Compare l'écart-type inter-pays par région entre minY et maxY
    const byRegYear: Record<string, Record<number, number[]>> = {}
    for (const r of data) {
      if (r.regulatory_quality == null) continue
      const reg = r.region ?? 'Autre'
      ;(byRegYear[reg] ??= {})
      ;(byRegYear[reg][r.annee] ??= []).push(r.regulatory_quality)
    }

    type RegConv = { region: string; std0: number; std1: number; delta: number; avg0: number; avg1: number }
    const regionConvergence: RegConv[] = Object.entries(byRegYear).map(([region, yMap]) => {
      const vals0 = yMap[minY] ?? [], vals1 = yMap[maxY] ?? []
      if (vals0.length < 2 || vals1.length < 2) return null
      const mean0 = avg(vals0), mean1 = avg(vals1)
      const std0 = Math.sqrt(avg(vals0.map(v => (v - mean0) ** 2)))
      const std1 = Math.sqrt(avg(vals1.map(v => (v - mean1) ** 2)))
      return { region, std0, std1, delta: std1 - std0, avg0: mean0, avg1: mean1 }
    }).filter((r): r is RegConv => r != null)

    const convergingReg = [...regionConvergence].sort((a, b) => a.delta - b.delta).slice(0, 2) // réduction dispersion
    const divergingReg  = [...regionConvergence].sort((a, b) => b.delta - a.delta).slice(0, 2) // hausse dispersion

    // ── Cards ───────────────────────────────────────────────────────────────

    const card1: InsightCardProps = {
      tone: topReformers[0]?.delta >= 0 ? 'green' : 'red',
      icon: '📈',
      label: 'TRAJECTOIRE RÉFORMISTE (Δ Qualité réglementaire)',
      value: topReformers[0]?.pays ?? '—',
      body: `${topReformers.map(t => `${t.pays} (${t.delta >= 0 ? '+' : ''}${t.delta.toFixed(2)})`).join(', ')} ont le plus amélioré leur cadre réglementaire entre ${minY} et ${maxY}. À l'inverse, ${topDecliners.map(t => `${t.pays} (${t.delta.toFixed(2)})`).join(', ')} ont vu leur environnement réglementaire se dégrader — signal de potentielle instabilité institutionnelle à surveiller pour les traités SCAR en cours.`,
      badge: { text: `+${topReformers[0]?.delta.toFixed(2) ?? '?'} pts meilleure progression`, kind: 'ok' },
      countryTags: [...topReformers.map(t => t.pays), ...topDecliners.map(t => t.pays)],
    }

    const card2: InsightCardProps = {
      tone: stablePositive.length > 0 ? 'navy' : 'amber',
      icon: '🎯',
      label: 'PRÉVISIBILITÉ RÉGLEMENTAIRE (σ faible)',
      value: stablePositive[0]?.pays ?? volatile[0]?.pays ?? '—',
      body: stablePositive.length > 0
        ? `${stablePositive.slice(0, 4).map(s => `${s.pays} (σ=${s.stdDev.toFixed(2)}, moy=${s.avgReg.toFixed(2)})`).join(', ')} affichent une qualité réglementaire positive ET stable dans le temps — les marchés les plus prévisibles pour la souscription SCAR. ${volatile.length > 0 ? `À l'opposé, ${volatile.slice(0, 3).map(s => s.pays).join(', ')} présentent une forte volatilité réglementaire (σ > 0.25), compliquant la planification des primes sur le long terme.` : ''}`
        : `La majorité des marchés africains affichent une certaine instabilité réglementaire. ${volatile.slice(0, 3).map(s => s.pays).join(', ')} sont les plus imprévisibles (σ > 0.25) — prime de risque réglementaire à intégrer dans la tarification.`,
      badge: stablePositive.length > 0
        ? { text: `${stablePositive.length} marchés stables + positifs`, kind: 'ok' }
        : { text: `${volatile.length} marchés à haute volatilité`, kind: 'alert' },
      countryTags: [...stablePositive.slice(0, 4).map(s => s.pays), ...volatile.slice(0, 3).map(s => s.pays)],
    }

    const card3: InsightCardProps = {
      tone: convergingReg.length > 0 && convergingReg[0].delta < -0.05 ? 'green' : 'amber',
      icon: '🔄',
      label: 'CONVERGENCE RÉGLEMENTAIRE RÉGIONALE',
      value: convergingReg[0]?.region ?? '—',
      body: convergingReg.length > 0
        ? `${convergingReg.map(r => `${r.region} (dispersion ${r.std0.toFixed(2)} → ${r.std1.toFixed(2)}, niveau ${r.avg1.toFixed(2)})`).join(' · ')} : la dispersion intra-régionale de la qualité réglementaire s'est ${convergingReg[0].delta < 0 ? 'réduite' : 'creusée'} entre ${minY} et ${maxY}. ${divergingReg.length > 0 ? `${divergingReg[0].region} voit au contraire ses pays diverger réglementairement (dispersion ${divergingReg[0].std0.toFixed(2)} → ${divergingReg[0].std1.toFixed(2)}) — intégration régionale fragilisée.` : ''}`
        : `Données insuffisantes pour calculer la convergence régionale.`,
      countryTags: [],
    }

    return [card1, card2, card3]
  }, [data])
}

// ══════════════════════════════════════════════════════════════════════════════
// Heatmap Stabilité Politique — 3 insights sur les anomalies temporelles
// ══════════════════════════════════════════════════════════════════════════════
export function useGouvHeatmapStabInsights(data: GouvRow[]): InsightCardProps[] {
  return useMemo(() => {
    const allYears = [...new Set(data.map(r => r.annee))].sort((a, b) => a - b)
    if (allYears.length < 2) return []

    // Grouper par pays
    const byPays: Record<string, { annee: number; stab: number }[]> = {}
    for (const r of data) {
      if (r.political_stability == null) continue
      ;(byPays[r.pays] ??= []).push({ annee: r.annee, stab: r.political_stability })
    }

    // 1. Chocs soudains (Décrochages brutaux)
    const chocPays: string[] = []
    for (const [pays, vals] of Object.entries(byPays)) {
      const sorted = vals.sort((a, b) => a.annee - b.annee)
      let hasChoc = false
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i - 1].stab - sorted[i].stab >= 0.4) {
          hasChoc = true; break;
        }
      }
      if (hasChoc) chocPays.push(pays)
    }

    // 2. Résilients imperturbables (Stabilité toujours > 0 sur > 5 ans)
    const resilients: string[] = []
    for (const [pays, vals] of Object.entries(byPays)) {
      if (vals.length < 5) continue
      if (vals.every(v => v.stab > 0)) resilients.push(pays)
    }

    // 3. Recovery institutionnelle (Rebonds durables)
    const recoveries: string[] = []
    for (const [pays, vals] of Object.entries(byPays)) {
      const sorted = vals.sort((a, b) => a.annee - b.annee)
      if (sorted.length < 3) continue
      const v0 = sorted[0].stab
      const v1 = sorted[sorted.length - 1].stab
      if (v0 < -0.4 && v1 - v0 >= 0.4) {
         if (sorted[sorted.length - 2].stab <= v1 + 0.2) {
           recoveries.push(pays)
         }
      }
    }

    const card1: InsightCardProps = {
      tone: chocPays.length ? 'red' : 'green',
      icon: '⚡',
      label: 'CHOCS GÉOPOLITIQUES SOUDAINS',
      value: chocPays.length ? `${chocPays.length} pays` : 'Aucun',
      body: chocPays.length ? `${chocPays.join(', ')} ont subi au moins un effondrement brutal de leur stabilité (chute > 0.4 pts en un an) au cours de la décennie. Une volatilité de court terme qui exige des clauses d'annulation spécifiques dans les traités.` : 'Aucun décrochage brutal de stabilité (> 0.4 pts) détecté sur la période.',
      badge: chocPays.length ? { text: '⚠ Volatilité extrême', kind: 'alert' } : undefined,
      countryTags: chocPays
    }

    const card2: InsightCardProps = {
      tone: 'green',
      icon: '🛡️',
      label: 'RÉSILIENCE INÉBRANLABLE',
      value: resilients.length ? `${resilients.length} pays` : '—',
      body: resilients.length ? `${resilients.join(', ')} affichent un score WGI systématiquement positif (> 0) année après année sur la décennie analysée. Ce sont les véritables valeurs refuges pour les portefeuilles longs de l'assurance continentale.` : 'Aucun marché n\'a maintenu une stabilité positive sur l\'intégralité de la décennie.',
      badge: { text: '✓ Piliers de stabilité', kind: 'ok' },
      countryTags: resilients
    }

    const card3: InsightCardProps = {
      tone: 'amber',
      icon: '🌱',
      label: 'RECOVERY INSTITUTIONNELLE',
      value: recoveries.length ? `${recoveries.length} pays` : '—',
      body: recoveries.length ? `${recoveries.join(', ')} partaient d'un contexte dégradé (< -0.4) mais ont su sécuriser un rebond significatif de la paix sociale et politique (+0.4 pts sur la décennie). Des marchés en reconstruction offrant des primes de développement intéressantes.` : 'Aucun marché en fort rebond politique constant détecté sur les 10 dernières années.',
      badge: recoveries.length ? { text: '↗ En cours de stabilisation', kind: 'info' } : undefined,
      countryTags: recoveries
    }

    return [card1, card2, card3]
  }, [data])
}
