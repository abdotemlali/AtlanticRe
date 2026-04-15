/**
 * useNonVieInsights — Calculs d'insights dynamiques pour CartographieNonVie
 * Toutes les valeurs affichées viennent exclusivement des données réelles.
 */
import { useMemo } from 'react'
import type { NonVieRow } from '../types/cartographie'
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

// ── Agrégation par pays sur toutes les années ─────────────────────────────────
interface CountryStat {
  pays: string
  region: string
  primes: number         // moyenne
  penetration: number | null
  sp: number | null
  croissance: number | null
  densite: number | null
}

function aggregateByCountry(data: NonVieRow[]): CountryStat[] {
  const acc: Record<string, {
    pays: string; region: string
    primes: number[]; pen: number[]; sp: number[]; grow: number[]; dens: number[]
  }> = {}
  for (const r of data) {
    if (!acc[r.pays]) acc[r.pays] = { pays: r.pays, region: r.region ?? 'Autre', primes: [], pen: [], sp: [], grow: [], dens: [] }
    const e = acc[r.pays]
    if (r.primes_emises_mn_usd != null) e.primes.push(r.primes_emises_mn_usd)
    if (r.taux_penetration_pct != null) e.pen.push(r.taux_penetration_pct)
    if (r.ratio_sp_pct != null) e.sp.push(r.ratio_sp_pct)
    if (r.croissance_primes_pct != null) e.grow.push(r.croissance_primes_pct)
    if (r.densite_assurance_usd != null) e.dens.push(r.densite_assurance_usd)
  }
  return Object.values(acc).map(e => ({
    pays: e.pays,
    region: e.region,
    primes: e.primes.length ? avg(e.primes) : 0,
    penetration: e.pen.length ? avg(e.pen) : null,
    sp: e.sp.length ? avg(e.sp) : null,
    croissance: e.grow.length ? avg(e.grow) : null,
    densite: e.dens.length ? avg(e.dens) : null,
  }))
}

// ── 1. INSIGHTS CARTE CHOROPLÈTHE ────────────────────────────────────────────
export function useChoroplethInsights(data: NonVieRow[]): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []
    const stats = aggregateByCountry(data)

    // Top 5 concentration
    const sorted = [...stats].sort((a, b) => b.primes - a.primes)
    const total = sum(stats.map(s => s.primes))
    const top5 = sorted.slice(0, 5)
    const top5Pct = total > 0 ? sum(top5.map(s => s.primes)) / total * 100 : 0

    // Sous-pénétrés dynamiques : pénétration < médiane ET croissance > 5% ET hors SA
    const pensAvail = stats.filter(s => s.penetration != null && s.pays !== 'Afrique du Sud')
    const medPen = median(pensAvail.map(s => s.penetration as number))
    const underPen = pensAvail.filter(s =>
      (s.penetration ?? 0) < medPen &&
      (s.croissance ?? 0) > 5
    )

    // Pays le plus régulier (S/P) : écart max-min le plus faible (toutes années)
    const spVolByCountry: Record<string, number[]> = {}
    for (const r of data) {
      if (r.ratio_sp_pct == null) continue
      ;(spVolByCountry[r.pays] ??= []).push(r.ratio_sp_pct)
    }
    const spVolStats = Object.entries(spVolByCountry)
      .filter(([, vals]) => vals.length >= 3) // au moins 3 ans de données
      .map(([pays, vals]) => ({ pays, range: Math.max(...vals) - Math.min(...vals), avg: avg(vals) }))
      .filter(s => s.avg < 80) // exclut les marchés structurellement mauvais
      .sort((a, b) => a.range - b.range)
    const mostRegular = spVolStats[0]
    const regTone: InsightCardProps['tone'] = (mostRegular?.avg ?? 100) < 50 ? 'green' : 'amber'

    return [
      {
        tone: 'navy',
        icon: '🏭',
        value: `${top5Pct.toFixed(1)}%`,
        label: 'CONCENTRATION TOP 5',
        body: `${top5.map(s => s.pays).join(', ')} captent ${top5Pct.toFixed(1)}% du marché. Dépendance élevée aux grands marchés.`,
        badge: { text: 'ℹ️ Concentration', kind: 'info' },
        countryTags: top5.map(s => s.pays),
      },
      {
        tone: 'green',
        icon: '🚀',
        value: `${underPen.length} marchés`,
        label: 'SOUS-PÉNÉTRÉS DYNAMIQUES',
        body: underPen.length
          ? `${underPen.map(s => s.pays).join(', ')} : pénétration < ${fmtPct(medPen)} (médiane) mais croissance > 5%. Opportunités à saisir.`
          : `Aucun marché ne remplit simultanément pénétration < médiane et croissance > 5% sur la période.`,
        badge: { text: '✓ Opportunités Atlantic Re', kind: 'ok' },
        countryTags: underPen.map(s => s.pays),
      },
      {
        tone: regTone,
        icon: '🛡️',
        value: mostRegular ? mostRegular.pays : '—',
        label: 'MARCHÉ LE PLUS RÉGULIER',
        body: mostRegular
          ? `${mostRegular.pays} présente la sinistralité la plus stable sur la période : écart max–min de seulement ${mostRegular.range.toFixed(1)} pts de S/P (moy. ${mostRegular.avg.toFixed(1)}%). Portefeuille prévisible — risque de réassurance maîtrisé pour Atlantic Re.`
          : 'Données S/P insuffisantes pour évaluer la régularité.',
        badge: { text: mostRegular ? '✓ Volatilité faible' : '—', kind: 'ok' },
        countryTags: mostRegular ? [mostRegular.pays] : [],
      },
    ] satisfies InsightCardProps[]
  }, [data])
}

// ── 2. INSIGHTS SCATTER (selon axes) ─────────────────────────────────────────
export function computeScatterInsights(
  xKey: string,
  yKey: string,
  data: NonVieRow[]
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
        tone: 'green', icon: '🏅', label: 'LEADERS PÉNÉTRATION',
        value: top2Pen.map(s => s.pays).join(' · '),
        body: top2Pen.length >= 2
          ? `Pénétration moy: ${fmtPct(top2Pen[0].penetration ?? 0)} / ${fmtPct(top2Pen[1].penetration ?? 0)}. Densité: ${top2Pen[0].densite?.toFixed(0)}$/hab / ${top2Pen[1].densite?.toFixed(0)}$/hab.`
          : 'Données insuffisantes.',
        countryTags: top2Pen.map(s => s.pays),
      },
      {
        tone: 'navy', icon: '⚡', label: 'ÉMERGENTS RAPIDES',
        value: `${emerg.length} pays`,
        body: emerg.length
          ? `${emerg.slice(0, 3).map(s => s.pays).join(', ')} : pénétration < 0.5% mais croissance > 10%. Marchés à fort potentiel.`
          : 'Aucun marché n\'affiche simultanément pénétration < 0.5% et croissance > 10%.',
        countryTags: emerg.slice(0, 3).map(s => s.pays),
      },
      {
        tone: 'amber', icon: '🌍', label: 'ÉCART SOUTH AFRICA',
        value: `x${facteur.toFixed(0)}`,
        body: `La densité d'assurance de l'Afrique du Sud est ${facteur.toFixed(1)}× supérieure à la médiane des autres marchés africains (${sa?.densite?.toFixed(0) ?? '—'}$ vs ${medDens.toFixed(0)}$/hab).`,
        countryTags: ['Afrique du Sud'],
      },
    ]
  }

  // Motion 2 : Croissance vs S/P
  if ((xKey === 'croissance' && yKey === 'sp') || (xKey === 'sp' && yKey === 'croissance')) {
    const ideal = noSA.filter(s => (s.croissance ?? 0) > 5 && (s.sp ?? 100) < 50)
    // S/P pondéré 2015 vs 2024
    const year2015 = data.filter(r => r.annee === 2015 && r.pays !== 'Afrique du Sud')
    const year2024 = data.filter(r => r.annee === 2024 && r.pays !== 'Afrique du Sud')
    const spWgt2015 = year2015.length
      ? sum(year2015.map(r => (r.ratio_sp_pct ?? 0) * (r.primes_emises_mn_usd ?? 0))) /
      (sum(year2015.map(r => r.primes_emises_mn_usd ?? 0)) || 1)
      : null
    const spWgt2024 = year2024.length
      ? sum(year2024.map(r => (r.ratio_sp_pct ?? 0) * (r.primes_emises_mn_usd ?? 0))) /
      (sum(year2024.map(r => r.primes_emises_mn_usd ?? 0)) || 1)
      : null
    const spDelta = spWgt2024 != null && spWgt2015 != null ? spWgt2024 - spWgt2015 : null
    const spColor: InsightCardProps['tone'] = (spWgt2024 ?? 100) < 60 ? 'green' : (spWgt2024 ?? 100) < 80 ? 'amber' : 'red'
    return [
      {
        tone: 'green', icon: '✅', label: 'ZONE IDÉALE',
        value: `${ideal.length} pays`,
        body: `${ideal.length} march${ideal.length > 1 ? 'és' : 'é'} cumule${ideal.length > 1 ? 'nt' : ''} croissance > 5% et S/P < 50%. Zone de rentabilité technique optimale.`,
        countryTags: ideal.slice(0, 4).map(s => s.pays),
        badge: { text: '✓ Cible prioritaire', kind: 'ok' },
      },
      {
        tone: 'red', icon: '📈', label: 'S/P PONDÉRÉ ÉVOLUTION',
        value: spWgt2024 ? fmtPct(spWgt2024) : '—',
        body: spDelta != null
          ? `S/P pondéré hors SA : ${fmtPct(spWgt2015 ?? 0)} (2015) → ${fmtPct(spWgt2024 ?? 0)} (2024). Évolution : ${spDelta > 0 ? '+' : ''}${fmtPct(spDelta)}.`
          : 'Évolution du S/P pondéré non calculable (données 2015 et/ou 2024 manquantes).',
        badge: { text: spDelta != null && spDelta < 0 ? '↓ Amélioration' : '↑ Détérioration', kind: spDelta != null && spDelta < 0 ? 'ok' : 'warn' },
      },
      {
        tone: spColor, icon: '📉', label: 'TENDANCE S/P',
        value: spWgt2024 ? fmtPct(spWgt2024) : '—',
        body: spWgt2015 != null && spWgt2024 != null
          ? `S/P moyen hors SA : ${fmtPct(spWgt2015)} → ${fmtPct(spWgt2024)} sur 2015–2024.`
          : 'Données insuffisantes pour calculer la tendance du S/P.',
      },
    ]
  }

  // Motion 3 : Densité vs Croissance
  if ((xKey === 'densite' && yKey === 'croissance') || (xKey === 'croissance' && yKey === 'densite')) {
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
        tone: 'green', icon: '🥇', label: 'DENSITÉ + CROISSANCE',
        value: top3.length ? top3.map(s => s.pays).slice(0, 2).join(' · ') : '—',
        body: top3.length
          ? `Top 3 hors SA avec densité ≥ médiane et forte croissance: ${top3.map(s => `${s.pays} (${fmtPct(s.croissance ?? 0)})`).join(', ')}.`
          : 'Données insuffisantes.',
        countryTags: top3.map(s => s.pays),
      },
      {
        tone: 'navy', icon: '🏛️', label: 'MARCHÉS MATURES',
        value: `${matures.length} pays`,
        body: `${matures.length} march${matures.length > 1 ? 'és' : 'é'} à densité élevée (> médiane) mais croissance < 3%. Marchés arrivés à maturité, compétition renforcée.`,
        countryTags: matures.slice(0, 4).map(s => s.pays),
      },
      {
        tone: 'amber', icon: '🌱', label: 'POTENTIELS ÉMERGENTS',
        value: `${potentials.length} pays`,
        body: `${potentials.length} march${potentials.length > 1 ? 'és' : 'é'} à faible densité mais croissance > médiane. Forte capacité d'absorption des nouvelles polices.`,
        countryTags: potentials.slice(0, 4).map(s => s.pays),
      },
    ]
  }

  // Motion 4 : Pénétration vs Croissance
  if ((xKey === 'penetration' && yKey === 'croissance') || (xKey === 'croissance' && yKey === 'penetration')) {
    const withPC = noSA.filter(s => s.penetration != null && s.croissance != null)
    const avgPen = avg(withPC.map(s => s.penetration as number))
    const avgGrow = avg(withPC.map(s => s.croissance as number))
    const oppo = withPC.filter(s => (s.penetration ?? 0) < avgPen && (s.croissance ?? 0) > avgGrow)
    const leaders = withPC.filter(s => (s.penetration ?? 0) > avgPen && (s.croissance ?? 0) > avgGrow)
    const decel = withPC.filter(s => (s.penetration ?? 0) > avgPen && (s.croissance ?? 0) < 0)
    return [
      {
        tone: 'green', icon: '🎯', label: 'OPPORTUNITÉS CLÉS',
        value: `${oppo.length} marchés`,
        body: `Pénétration < ${fmtPct(avgPen)} (moy) ET croissance > ${fmtPct(avgGrow)} (moy). Marchés sous-pénétrés mais en expansion : priorité Atlantic Re.`,
        countryTags: oppo.map(s => s.pays),
        badge: { text: '✓ Cible', kind: 'ok' },
      },
      {
        tone: 'navy', icon: '🏆', label: 'LEADERS CONSOLIDÉS',
        value: `${leaders.length} pays`,
        body: `Pénétration > ${fmtPct(avgPen)} ET croissance > ${fmtPct(avgGrow)}. Marchés matures et dynamiques : concurrence élevée.`,
        countryTags: leaders.map(s => s.pays),
      },
      {
        tone: 'amber', icon: '⚠️', label: 'EN DÉCÉLÉRATION',
        value: `${decel.length} pays`,
        body: decel.length
          ? `${decel.map(s => s.pays).join(', ')} : pénétration élevée mais croissance négative. Marchés en contraction à surveiller.`
          : 'Aucun marché en décélération (pénétration élevée + croissance négative) détecté.',
        badge: { text: decel.length ? '⚠ Vigilance' : '✓ Stable', kind: decel.length ? 'warn' : 'ok' },
        countryTags: decel.map(s => s.pays),
      },
    ]
  }

  // Insight générique pour autres combinaisons
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
      tone: 'amber', icon: '🌍', label: 'VUE ENSEMBLE',
      value: `${vals.length} pays`,
      body: `${vals.length} pays disposent de données pour les deux axes sélectionnés. Faites varier les axes pour des insights spécifiques.`,
    },
  ]
}

// ── 3. INSIGHTS STRUCTURE RÉGIONALE ──────────────────────────────────────────
export function useStructureInsights(
  data: NonVieRow[],
  yearOrAvg: number | 'avg'
): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []
    const source = yearOrAvg === 'avg' ? data : data.filter(r => r.annee === yearOrAvg)

    const totAll = sum(source.map(r => r.primes_emises_mn_usd ?? 0))
    const totSA = sum(source.filter(r => r.pays === 'Afrique du Sud').map(r => r.primes_emises_mn_usd ?? 0))
    const saPct = totAll > 0 ? totSA / totAll * 100 : 0
    const n = yearOrAvg === 'avg' ? (new Set(data.map(r => r.annee)).size || 1) : 1

    // Régions hors SA
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

    return [
      {
        tone: 'red',
        icon: '🇿🇦',
        value: `${saPct.toFixed(1)}%`,
        label: 'POIDS SOUTH AFRICA',
        body: `South Africa représente ${saPct.toFixed(1)}% du marché continental à elle seule (${fmtMn(totSA / n)}). Le graphique ci-contre affiche la répartition des ${(100 - saPct).toFixed(1)}% restants entre les autres régions.`,
        badge: { text: '⚠ Hors-norme', kind: 'alert' },
        countryTags: ['Afrique du Sud'],
      },
      {
        tone: 'navy',
        icon: '🥈',
        value: top2.length >= 2 ? `${top2[0][0]} + ${top2[1][0]}` : top2[0]?.[0] ?? '—',
        label: 'TOP 2 HORS SOUTH AFRICA',
        body: top2.length >= 2
          ? `${top2[0][0]} : ${((top2[0][1] / totHorsSA) * 100).toFixed(1)}% du marché hors SA. ${top2[1][0]} : ${((top2[1][1] / totHorsSA) * 100).toFixed(1)}% du marché hors SA.`
          : 'Données régionales insuffisantes.',
        countryTags: top2.map(([name]) => name),
      },
      {
        tone: 'amber',
        icon: '📦',
        value: `${sortedReg.length} régions`,
        label: 'CONCENTRATION HORS SOUTH AFRICA',
        body: top2.length >= 2
          ? `${top2[0][0]} et ${top2[1][0]} captent ensemble ${top2Pct.toFixed(1)}% du marché résiduel. Les ${Math.max(0, sortedReg.length - 2)} autres régions se partagent seulement ${rest.toFixed(1)}%.`
          : 'Concentration régionale non calculable.',
        badge: { text: `${top2Pct.toFixed(0)}% top 2`, kind: top2Pct > 70 ? 'warn' : 'info' },
      },
    ] satisfies InsightCardProps[]
  }, [data, yearOrAvg])
}

// ── 5. INSIGHTS ÉVOLUTION RÉGIONALE (CAGR 2015–2024 + accélération post-2020) ─
export function useEvolutionInsights(data: NonVieRow[]): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []

    const years = [...new Set(data.map(r => r.annee))].sort((a, b) => a - b)
    const minYear = years[0] ?? 2015
    const maxYear = years[years.length - 1] ?? 2024
    const nYears = maxYear - minYear || 1

    // Agréger les primes par région et par année
    const byRegionYear: Record<string, Record<number, number>> = {}
    for (const r of data) {
      const reg = r.region ?? 'Autre'
      if (!byRegionYear[reg]) byRegionYear[reg] = {}
      byRegionYear[reg][r.annee] = (byRegionYear[reg][r.annee] ?? 0) + (r.primes_emises_mn_usd ?? 0)
    }

    const regions = Object.keys(byRegionYear)

    // Calculer le CAGR pour chaque région sur minYear→maxYear
    interface RegStat {
      region: string
      v0: number          // volume début
      v1: number          // volume fin
      cagr: number        // CAGR annuel
      cagrPost2020: number | null  // CAGR 2020→maxYear
    }

    const stats: RegStat[] = regions.map(reg => {
      const yrMap = byRegionYear[reg]
      const v0 = yrMap[minYear] ?? 0
      const v1 = yrMap[maxYear] ?? 0
      const cagr = v0 > 0 && v1 > 0 ? (Math.pow(v1 / v0, 1 / nYears) - 1) * 100 : 0

      // CAGR post-2020
      const v2020 = yrMap[2020] ?? 0
      const nPost = maxYear - 2020 || 1
      const cagrPost2020 = v2020 > 0 && v1 > 0 ? (Math.pow(v1 / v2020, 1 / nPost) - 1) * 100 : null

      return { region: reg, v0, v1, cagr, cagrPost2020 }
    })

    // Insight 2 candidat : région à TRÈS forte croissance mais volume de départ faible
    // = volume initial ≤ 25e percentile ET CAGR le plus élevé toutes régions
    const v0Values = stats.map(s => s.v0).filter(v => v > 0).sort((a, b) => a - b)
    const p25 = v0Values[Math.floor(v0Values.length * 0.25)] ?? 0
    const lowBaseRegions = stats.filter(s => s.v0 <= p25 || s.v0 < 150) // petite base
    const baseFaible = [...lowBaseRegions].sort((a, b) => b.cagr - a.cagr)[0]

    // Insight 1 : région la plus dynamique HORS la région à base faible
    const otherRegions = stats.filter(s => s.region !== baseFaible?.region)
    const mostDynamic = [...otherRegions].sort((a, b) => b.cagr - a.cagr)[0]

    // Insight 3 : région qui a le plus accéléré post-2020 (cagrPost2020 - cagr le plus élevé)
    const withPost = stats.filter(s => s.cagrPost2020 != null)
    const mostAccelerated = [...withPost].sort((a, b) => (b.cagrPost2020 ?? 0) - (a.cagrPost2020 ?? 0))[0]

    const cards: InsightCardProps[] = []

    // ── Card 1 : Région la plus dynamique ──
    if (mostDynamic) {
      cards.push({
        tone: 'green',
        icon: '🚀',
        value: mostDynamic.region,
        label: 'RÉGION LA PLUS DYNAMIQUE',
        body: `${mostDynamic.region} affiche la croissance annuelle réelle la plus forte hors base faible : +${mostDynamic.cagr.toFixed(1)}%/an sur ${minYear}–${maxYear}. Volume : ${fmtMn(mostDynamic.v0)} → ${fmtMn(mostDynamic.v1)}.`,
        badge: { text: '✓ Leader croissance', kind: 'ok' },
      })
    }

    // ── Card 2 : Croissance sur base faible ──
    if (baseFaible) {
      cards.push({
        tone: 'amber',
        icon: '⚠️',
        value: baseFaible.region,
        label: 'CROISSANCE SUR BASE FAIBLE',
        body: `Croissance annuelle réelle de +${baseFaible.cagr.toFixed(1)}%/an sur ${minYear}–${maxYear}, mais sur une base de départ quasi-nulle (${fmtMn(baseFaible.v0)} → ${fmtMn(baseFaible.v1)}). Volume insuffisant pour être actionnable pour Atlantic Re à court terme. À surveiller sur le long terme.`,
        badge: { text: '⚠ Effet base — non actionnable', kind: 'warn' },
      })
    }

    // ── Card 3 : Accélère post-2020 ──
    if (mostAccelerated) {
      cards.push({
        tone: 'navy',
        icon: '📊',
        value: mostAccelerated.region,
        label: 'ACCÉLÈRE POST-2020',
        body: `${mostAccelerated.region} a accéléré après 2020 : +${(mostAccelerated.cagrPost2020 ?? 0).toFixed(1)}%/an depuis 2020, contre +${mostAccelerated.cagr.toFixed(1)}%/an sur la période complète. Signal de dynamisme récent à surveiller pour Atlantic Re.`,
        badge: { text: '📌 Dynamisme récent', kind: 'info' },
      })
    }

    return cards
  }, [data])
}

// ── 4. INSIGHTS TOP 10 (remplacent les cartes hardcodées) ────────────────────
export function useTop10Insights(data: NonVieRow[], yearOrAvg: number | 'avg'): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []
    const source = yearOrAvg === 'avg' ? data : data.filter(r => r.annee === yearOrAvg)
    const totAll = sum(source.map(r => r.primes_emises_mn_usd ?? 0))

    // Top 10 pays par primes sur la source
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
    const nRegionsTop10 = new Set(top10.map(r => r.region)).size

    // #2 hors SA : pays le plus puissant après Afrique du Sud
    const rankedNoSA = ranked.filter(r => r.pays !== 'Afrique du Sud')
    const challenger = rankedNoSA[0]
    const saPrimes = byCountry['Afrique du Sud']?.primes ?? 0
    const challengerRatio = challenger && saPrimes > 0 ? saPrimes / challenger.primes : null

    // Pénétration Maghreb
    const maghreb = aggregateByCountry(data.filter(r => r.region === 'Maghreb'))
    const avgPenMaghreb = avg(maghreb.map(s => s.penetration ?? 0).filter(v => v > 0))

    return [
      {
        tone: 'navy',
        icon: '🏭',
        value: `${top10Pct.toFixed(1)}%`,
        label: 'CONCENTRATION DU TOP 10',
        body: `Les 10 premiers marchés africains totalisent ${top10Pct.toFixed(1)}% des primes non-vie continentales (${fmtMn(top10Primes)}). Ces pays couvrent ${nRegionsTop10} région${nRegionsTop10 > 1 ? 's' : ''} — forte concentration géographique du marché.`,
        badge: { text: top10Pct > 90 ? '⚠ Très concentré' : 'ℹ️ Concentration', kind: top10Pct > 90 ? 'warn' : 'info' },
        countryTags: top10.map(r => r.pays),
      },
      {
        tone: 'green',
        icon: '🥈',
        value: challenger?.pays ?? '—',
        label: 'CHALLENGERS APRÈS SOUTH AFRICA',
        body: challenger
          ? `${challenger.pays} est le 1er marché hors Afrique du Sud avec ${fmtMn(challenger.primes)}.${challengerRatio != null ? ` L'Afrique du Sud génère ×${challengerRatio.toFixed(1)} plus de primes — écart structurel majeur entre le leader et le reste du continent.` : ''}`
          : 'Données insuffisantes.',
        countryTags: rankedNoSA.slice(0, 3).map(r => r.pays),
        badge: { text: challengerRatio != null ? `×${challengerRatio.toFixed(0)} vs SA` : '—', kind: 'info' },
      },
      {
        tone: 'amber',
        icon: '🎯',
        value: avgPenMaghreb > 0 ? `${fmtPct(avgPenMaghreb)} moy.` : '< 2%',
        label: 'OPPORTUNITÉ MAGHREB',
        body: `Le Maghreb affiche une pénétration moyenne de ${avgPenMaghreb > 0 ? fmtPct(avgPenMaghreb) : '< 2%'} du PIB malgré une économie stable — potentiel de développement significatif pour la réassurance.`,
        badge: { text: 'Potentiel', kind: 'info' },
      },
    ] satisfies InsightCardProps[]
  }, [data, yearOrAvg])
}

// ── 6. INSIGHTS DISTRIBUTION S/P PAR RÉGION ──────────────────────────────────
// Pays membres de la zone CIMA (14 membres)
const CIMA_COUNTRIES = new Set([
  'Benin', 'Burkina Faso', 'Cameroon', 'Central African Republic', 'Chad',
  'Comoros', 'Congo, Republic of the', 'Equatorial Guinea', 'Gabon',
  'Guinea-Bissau', 'Ivory Coast', 'Mali', 'Niger', 'Senegal', 'Togo',
])

export function useSPDistributionInsights(data: NonVieRow[]): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []

    // ── Agréger le S/P par pays (toutes années) → liste de valeurs par région ──
    const spByRegion: Record<string, number[]> = {}
    const spByCountry: Record<string, { region: string; vals: number[] }> = {}

    for (const r of data) {
      if (r.ratio_sp_pct == null) continue
      const reg = r.region ?? 'Autre'
        ; (spByRegion[reg] ??= []).push(r.ratio_sp_pct)
      if (!spByCountry[r.pays]) spByCountry[r.pays] = { region: reg, vals: [] }
      spByCountry[r.pays].vals.push(r.ratio_sp_pct)
    }

    // ── Stat par région : médiane + range (max-min de toutes les valeurs pays) ──
    interface RegSPStat {
      region: string
      medianSP: number
      range: number       // max(median/pays) - min(median/pays)
      countries: string[] // pays de la région (triés par médiane S/P)
    }

    // Médiane par pays, puis agrégation par région
    const medianByCountry: Record<string, { region: string; med: number }> = {}
    for (const [pays, { region, vals }] of Object.entries(spByCountry)) {
      medianByCountry[pays] = { region, med: median(vals) }
    }

    const regionStats: Record<string, { meds: number[]; countries: string[] }> = {}
    for (const [pays, { region, med }] of Object.entries(medianByCountry)) {
      ; (regionStats[region] ??= { meds: [], countries: [] }).meds.push(med)
      regionStats[region].countries.push(pays)
    }

    const regList: RegSPStat[] = Object.entries(regionStats).map(([region, { meds, countries }]) => ({
      region,
      medianSP: median(meds),
      range: meds.length > 1 ? Math.max(...meds) - Math.min(...meds) : 0,
      countries: countries.sort(),
    }))

    // ── Insight 1 : Région la moins volatile (range le plus faible, ≥2 pays) ──
    const candidatesVol = regList.filter(r => regionStats[r.region].meds.length >= 2)
    const leastVolatile = [...candidatesVol].sort((a, b) => a.range - b.range)[0]

    // ── Insight 2 : Région la plus sinistre (médiane S/P la plus élevée) ──
    const mostSinistre = [...regList].sort((a, b) => b.medianSP - a.medianSP)[0]

    // ── Insight 3 : CIMA vs reste hors SA ──
    const cimaSP: number[] = []
    const otherSP: number[] = []
    for (const r of data) {
      if (r.ratio_sp_pct == null || r.pays === 'Afrique du Sud') continue
      if (CIMA_COUNTRIES.has(r.pays)) cimaSP.push(r.ratio_sp_pct)
      else otherSP.push(r.ratio_sp_pct)
    }
    const avgCima = avg(cimaSP)
    const avgOther = avg(otherSP)

    // Pays CIMA présents dans les données (pour countryTags)
    const cimaPaysInData = [...new Set(
      data.filter(r => CIMA_COUNTRIES.has(r.pays)).map(r => r.pays)
    )].sort()

    const cards: InsightCardProps[] = []

    // Card 1 — Moins volatile
    if (leastVolatile) {
      cards.push({
        tone: 'green',
        icon: '🛡️',
        value: leastVolatile.region,
        label: 'RÉGION MOINS VOLATILE',
        body: `Écart entre le S/P le plus haut et le plus bas observé : ${leastVolatile.range.toFixed(1)} points. La faible dispersion des résultats techniques indique un portefeuille prévisible et stable pour Atlantic Re.`,
        badge: { text: '✓ Faible volatilité', kind: 'ok' },
        countryTags: leastVolatile.countries.slice(0, 6),
      })
    }

    // Card 2 — Plus sinistre
    if (mostSinistre) {
      cards.push({
        tone: 'amber',
        icon: '⚠️',
        value: mostSinistre.region,
        label: 'RÉGION LA PLUS SINISTRE',
        body: `Médiane S/P : ${mostSinistre.medianSP.toFixed(1)}% sur 2015–2024. Sinistralité structurellement la plus élevée parmi les régions comparables. Conditions de réassurance à surveiller.`,
        badge: { text: '⚠ Sinistralité élevée', kind: 'warn' },
        countryTags: mostSinistre.countries.slice(0, 6),
      })
    }

    // Card 3 — CIMA avantage
    if (cimaSP.length > 0 && otherSP.length > 0) {
      const advantage = avgOther - avgCima
      cards.push({
        tone: 'navy',
        icon: '💹',
        value: `CIMA ${avgCima.toFixed(1)}%`,
        label: 'CIMA — AVANTAGE SINISTRALITÉ',
        body: `Le ratio sinistres/primes de la zone CIMA est de ${avgCima.toFixed(1)}%, contre ${avgOther.toFixed(1)}% pour le reste du marché africain hors South Africa. Zone particulièrement attractive pour Atlantic Re.`,
        badge: { text: `✓ CIMA favorable${advantage > 0 ? ` −${advantage.toFixed(1)}pts` : ''}`, kind: 'ok' },
        countryTags: cimaPaysInData,
      })
    }

    return cards
  }, [data])
}

// ── 7. INSIGHTS PROFIL PAYS ────────────────────────────────────────────────
export function useCountryInsights(
  data: NonVieRow[],
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

    // Parts de marche continental
    const allMaxYear = data.filter(r => r.annee === maxYear)
    const allMinYear = data.filter(r => r.annee === minYear)
    const totContMax = allMaxYear.reduce((s, r) => s + (r.primes_emises_mn_usd ?? 0), 0)
    const totContMin = allMinYear.reduce((s, r) => s + (r.primes_emises_mn_usd ?? 0), 0)
    const shareCont = totContMax > 0 ? v1 / totContMax * 100 : 0
    const shareContStart = totContMin > 0 && v0 > 0 ? v0 / totContMin * 100 : 0
    const shareContDelta = shareCont - shareContStart

    // Part regionale
    const regMaxYear = allMaxYear.filter(r => r.region === region)
    const totReg = regMaxYear.reduce((s, r) => s + (r.primes_emises_mn_usd ?? 0), 0)
    const shareReg = totReg > 0 ? v1 / totReg * 100 : 0

    // Rangs primes
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

    // S/P
    const spRows = cRows.filter(r => r.ratio_sp_pct != null)
    const spVals = spRows.map(r => r.ratio_sp_pct as number)
    const avgSPVal = spVals.length ? spVals.reduce((a, b) => a + b, 0) / spVals.length : 0
    const bestSP = spVals.length ? Math.min(...spVals) : 0
    const worstSP = spVals.length ? Math.max(...spVals) : 0
    const bestSPYear = spRows.find(r => r.ratio_sp_pct === bestSP)?.annee
    const worstSPYear = spRows.find(r => r.ratio_sp_pct === worstSP)?.annee
    const spTrend = spVals.length >= 2 ? spVals[spVals.length - 1] - spVals[0] : 0
    const regPeersSP = data.filter(r => r.region === region && r.pays !== country && r.ratio_sp_pct != null)
    const avgRegSP = regPeersSP.length ? regPeersSP.reduce((s, r) => s + (r.ratio_sp_pct ?? 0), 0) / regPeersSP.length : 0
    const vsPeersSP = avgSPVal - avgRegSP
    const avgSPByCountry: Record<string, number[]> = {}
    for (const r of data) {
      if (r.ratio_sp_pct == null) continue
      if (!avgSPByCountry[r.pays]) avgSPByCountry[r.pays] = []
      avgSPByCountry[r.pays].push(r.ratio_sp_pct)
    }
    const spRanked = Object.entries(avgSPByCountry)
      .map(([pays, vals]) => ({ pays, avgSP: vals.reduce((a, b) => a + b, 0) / vals.length }))
      .sort((a, b) => a.avgSP - b.avgSP)
    const rankSP = spRanked.findIndex(e => e.pays === country) + 1
    const totalSPRanked = spRanked.length

    // Penetration
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

    // Densite
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

    // Attractivite
    const isLargeMarket = v1 >= 500
    const criteria: string[] = []
    let score = 0
    if (cagrPrimes >= 5) { score += 2; criteria.push(`+ Forte croissance (+${cagrPrimes.toFixed(1)}%/an) - marche dynamique`) }
    else if (cagrPrimes >= 0) { score += 1; criteria.push(`/ Croissance moderee (+${cagrPrimes.toFixed(1)}%/an)`) }
    else { score -= 1; criteria.push(`x Croissance limitee (${cagrPrimes.toFixed(1)}%/an) - marche arrive a maturite ou sous pression`) }
    if (avgSPVal < 50) { score += 2; criteria.push(`+ Sinistralite maitrisee (S/P moy. ${avgSPVal.toFixed(1)}%) - marge technique favorable`) }
    else if (avgSPVal < 70) { score += 1; criteria.push(`+ Sinistralite maitrisee (S/P moy. ${avgSPVal.toFixed(1)}%) - marge technique favorable`) }
    else { score -= 1; criteria.push(`x Sinistralite elevee (S/P moy. ${avgSPVal.toFixed(1)}%) - risque technique`) }
    if (avgPen < 1) { score += 1; criteria.push(`+ Faible penetration (${avgPen.toFixed(2)}%) - fort potentiel de developpement du marche`) }
    if (isLargeMarket) {
      if (cagrPrimes < 1) criteria.push(`! Grand marche (${fmtMn(v1)}) mais croissance nulle ou negative - marche en saturation, concurrence intense`)
      else criteria.push(`+ Grand marche (${fmtMn(v1)}) en croissance - marche prioritaire pour Atlantic Re`)
    }

    // Reformatter les criteres avec les vrais symboles
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
    const growthBadgeText = cagrPrimes >= 5 ? '\u2713 Croissance forte' : cagrPrimes >= 0 ? '\u26a0 Croissance moderee' : '\u274c Declin'

    const spTone: Tone = avgSPVal < 50 ? 'green' : avgSPVal < 70 ? 'amber' : 'red'
    const spBadgeKind: BKind = avgSPVal < 50 ? 'ok' : avgSPVal < 70 ? 'warn' : 'alert'
    const spBadgeText = avgSPVal < 50 ? '\u2713 Sinistralite maitrisee' : avgSPVal < 70 ? '\u26a0 Vigilance' : '\u2716 Sinistralite elevee'

    const densLabel =
      rankDens > 0 && totalDensRanked > 0 && rankDens <= Math.ceil(totalDensRanked / 3) ? 'Densite elevee' :
        rankDens <= Math.ceil(totalDensRanked * 2 / 3) ? 'Densite dans la moyenne africaine' : 'Densite faible'

    const [attractLabel, attractTone, attractBadge, attractBadgeKind]: [string, Tone, string, BKind] =
      score >= 4 ? ['Tres Attractif', 'green', '\u2713 Priorite Atlantic Re', 'ok'] :
        score >= 2 ? ['Attractif', 'navy', '\u2713 Opportunite confirmee', 'ok'] :
          score >= 0 ? ['Potentiel Modere', 'amber', isLargeMarket ? '\u26a0 Grand marche en saturation - prudence' : '\u26a0 Marche a surveiller', 'warn'] :
            ['Peu Attractif', 'red', '\u2716 Priorite faible', 'alert']

    const fmtV = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)} Mrd` : `$${v.toFixed(0)}M`
    const sgn = (v: number) => v >= 0 ? '+' : ''

    const cards: InsightCardProps[] = [
      {
        tone: growthTone, icon: '\ud83d\udcc8',
        value: `${sgn(cagrPrimes)}${cagrPrimes.toFixed(1)}%/an`,
        label: 'CROISSANCE ANNUELLE MOYENNE DES PRIMES NON-VIE',
        body: `Volume ${minYear} : ${fmtV(v0)} \u2192 ${maxYear} : ${fmtV(v1)} (croissance annuelle moyenne ${sgn(cagrPrimes)}${cagrPrimes.toFixed(1)}%/an). Pic historique : ${fmtV(peakPrimes)} \u00b7 Plancher : ${fmtV(floorPrimes)}.`,
        badge: { text: growthBadgeText, kind: growthBadgeKind },
      },
      {
        tone: 'navy', icon: '\ud83c\udfe6',
        value: fmtV(v1),
        label: `VOLUME & PARTS DE MARCHE ${maxYear}`,
        body: `Part de marche continental : ${shareCont.toFixed(2)}% du total africain (${shareContDelta >= 0 ? '\u2197' : '\u2198'} ${Math.abs(shareContDelta).toFixed(2)} pts vs ${minYear} \u2014 ${shareContDelta >= 0 ? 'gagne des parts' : 'perd des parts'}). Part regionale (${region}) : ${shareReg.toFixed(1)}%. Rang continental : ${rankContPrimes > 0 ? rankContPrimes : '-'}/${totalContPrimes} \u00b7 Rang regional : ${rankRegPrimes > 0 ? rankRegPrimes : '-'}/${totalRegPrimes}. ${isLargeMarket ? 'Grand marche \u2014 a consolider pour Atlantic Re.' : 'Marche de taille intermediaire.'}`,
        badge: { text: rankContPrimes > 0 && rankContPrimes <= 5 ? '\ud83c\udfc6 Top 5 continental' : '\ud83d\udccc Grand marche', kind: 'info' },
      },
      {
        tone: spTone, icon: '\u2696\ufe0f',
        value: `${avgSPVal.toFixed(1)}%`,
        label: 'SINISTRALITE MOYENNE (S/P)',
        body: `S/P moyen ${minYear}\u2013${maxYear} : ${avgSPVal.toFixed(1)}%. Meilleure annee : ${bestSP.toFixed(1)}%${bestSPYear ? ` (${bestSPYear})` : ''} \u00b7 Pire annee : ${worstSP.toFixed(1)}%${worstSPYear ? ` (${worstSPYear})` : ''}. Tendance sur ${nYears} ans : ${spTrend >= 0 ? '\u2197' : '\u2198'} ${Math.abs(spTrend).toFixed(1)} pts. Ecart vs pairs regionaux : ${sgn(vsPeersSP)}${vsPeersSP.toFixed(1)} pts vs moy. regionale. Rang continental rentabilite : ${rankSP > 0 ? rankSP : '-'}/${totalSPRanked}.`,
        badge: { text: spBadgeText, kind: spBadgeKind },
      },
      {
        tone: penTrend < -0.05 ? 'amber' : 'green', icon: '\ud83d\udcca',
        value: `${pen2024.toFixed(2)}%`,
        label: 'TAUX DE PENETRATION NON-VIE',
        body: `Penetration ${maxYear} : ${pen2024.toFixed(2)}% (moy. : ${avgPen.toFixed(2)}% \u00b7 pic : ${peakPen.toFixed(2)}%). Tendance : ${penTrend >= 0 ? '\u2197' : '\u2198'} ${Math.abs(penTrend).toFixed(2)} pts sur ${nYears} ans. Rang continental : ${rankPen > 0 ? rankPen : '-'}/${totalPenRanked}. ${avgPen < 1 ? 'Marge de progression significative \u2014 opportunite structurelle.' : 'Marche deja bien penetre.'}`,
        badge: { text: avgPen < 1 ? '\ud83d\udccc Fort potentiel' : '\ud83d\udccc Bien penetre', kind: 'info' },
      },
      {
        tone: densEvol >= 0 ? 'green' : 'amber', icon: '\ud83d\udcb0',
        value: `$${dens2024.toFixed(0)}/hab`,
        label: 'DENSITE D\'ASSURANCE NON-VIE',
        body: `Densite ${maxYear} : $${dens2024.toFixed(0)}/hab (moy. : $${avgDens.toFixed(0)}/hab). Evolution ${minYear}\u2192${maxYear} : ${sgn(densEvol)}${densEvol.toFixed(0)} $/hab. Rang continental : ${rankDens > 0 ? rankDens : '-'}/${totalDensRanked}. ${densLabel}.`,
        badge: { text: densEvol >= 0 ? '\u2713 En progression' : '\u26a0 En developpement', kind: densEvol >= 0 ? 'ok' : 'warn' },
      },
      {
        tone: attractTone, icon: '\ud83c\udfaf',
        value: attractLabel,
        label: 'ATTRACTIVITE REASSURANCE NON-VIE',
        body: criteriaFormatted.join(' '),
        badge: { text: attractBadge, kind: attractBadgeKind },
      },
    ]

    return { cards, region, coverage }
  }, [data, country])
}

// -- 8. INSIGHTS CLASSEMENT PAYS ---------------------------------------------
export function useRankingInsights(data: NonVieRow[]): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []

    // Agreger par pays (toutes annees)
    const byCountry: Record<string, {
      region: string; sp: number[]; cagr: number | null; dens: number[]
      v0: number; v1: number; minYr: number; maxYr: number
    }> = {}

    // D'abord obtenir les annees min/max par pays
    for (const r of data) {
      if (!byCountry[r.pays]) {
        byCountry[r.pays] = { region: r.region ?? 'Autre', sp: [], cagr: null, dens: [], v0: 0, v1: 0, minYr: r.annee, maxYr: r.annee }
      }
      const e = byCountry[r.pays]
      if (r.ratio_sp_pct != null) e.sp.push(r.ratio_sp_pct)
      if (r.densite_assurance_usd != null) e.dens.push(r.densite_assurance_usd)
      if (r.annee < e.minYr) e.minYr = r.annee
      if (r.annee > e.maxYr) e.maxYr = r.annee
    }

    // Calculer v0, v1 et CAGR primes par pays
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
      avgSP: e.sp.length ? e.sp.reduce((a, b) => a + b, 0) / e.sp.length : null,
      cagr: e.cagr,
      avgDens: e.dens.length ? e.dens.reduce((a, b) => a + b, 0) / e.dens.length : null,
    }))

    // -- Top 5 S/P (hors South Africa, S/P disponible) --
    const top5SP = statsArr
      .filter(s => s.avgSP != null && s.pays !== 'Afrique du Sud')
      .sort((a, b) => (a.avgSP as number) - (b.avgSP as number))
      .slice(0, 5)

    // -- Top 5 Croissance (CAGR disponible, hors extremes) --
    const top5Growth = statsArr
      .filter(s => s.cagr != null)
      .sort((a, b) => (b.cagr as number) - (a.cagr as number))
      .slice(0, 5)

    // -- Top 5 Densite --
    const top5Dens = statsArr
      .filter(s => s.avgDens != null)
      .sort((a, b) => (b.avgDens as number) - (a.avgDens as number))
      .slice(0, 5)

    const fmtSP = (v: number) => `${v.toFixed(1)}%`
    const fmtGrowth = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
    const fmtDens = (v: number) => `$${v.toFixed(0)}/hab`

    const spBody = top5SP.length
      ? `Pays avec le S/P le plus faible (hors South Africa): ${top5SP.map(s => `${s.pays} (${fmtSP(s.avgSP as number)})`).join(', ')}. Un S/P bas signifie que les sinistres payes representent une faible part des primes encaissees - les conditions sont les plus favorables pour la reassurance.`
      : 'Donnees S/P insuffisantes.'

    const growthBody = top5Growth.length
      ? `Pays avec la croissance annuelle moyenne la plus forte: ${top5Growth.map(s => `${s.pays} (${fmtGrowth(s.cagr as number)})`).join(', ')}. Ces marches en forte expansion offrent les opportunites de developpement de portefeuille les plus importantes pour Atlantic Re.`
      : 'Donnees de croissance insuffisantes.'

    const densBody = top5Dens.length
      ? `Pays avec la densite d\'assurance la plus elevee (depense par habitant): ${top5Dens.map(s => `${s.pays} (${fmtDens(s.avgDens as number)})`).join(', ')}. Une densite elevee reflete un marche mature avec un volume de primes fiable et previsible.`
      : 'Donnees de densite insuffisantes.'

    return [
      {
        tone: 'green',
        icon: '\ud83e\udd47',
        value: top5SP[0]?.pays ?? '-',
        label: 'MEILLEURE RENTABILITE TECHNIQUE',
        body: spBody,
        badge: { text: '\u2713 Rentabilite optimale', kind: 'ok' },
        countryTags: top5SP.map(s => s.pays),
      },
      {
        tone: 'navy',
        icon: '\ud83d\udcc8',
        value: top5Growth[0] ? `Top Croissance: ${fmtGrowth(top5Growth[0].cagr as number)}` : '-',
        label: 'MARCHES EN EXPANSION',
        body: growthBody,
        badge: { text: '\u2713 Fort potentiel', kind: 'ok' },
        countryTags: top5Growth.map(s => s.pays),
      },
      {
        tone: 'amber',
        icon: '\ud83d\udcb0',
        value: top5Dens[0] ? fmtDens(top5Dens[0].avgDens as number) : '-',
        label: 'MARCHES LES PLUS DEVELOPPES',
        body: densBody,
        badge: { text: '\ud83d\udccc Marches matures', kind: 'info' },
        countryTags: top5Dens.map(s => s.pays),
      },
    ] satisfies InsightCardProps[]
  }, [data])
}

// ── 9. INSIGHTS PRIMES PAR RÉGION (BarChart régional) ────────────────────────
/**
 * useBarRegionalInsights — 3 insights dynamiques pour le BarChart "Primes par région".
 * @param data       — toutes les lignes NonVie
 * @param barYear    — année sélectionnée dans le contrôle
 * @param barShowAvg — true si mode moyenne 2015–2024 activé
 * @param years      — liste des années disponibles
 */
export function useBarRegionalInsights(
  data: NonVieRow[],
  barYear: number,
  barShowAvg: boolean,
  years: number[]
): InsightCardProps[] {
  return useMemo(() => {
    if (!data.length) return []

    // ── Source filtrée selon le mode actif ──
    const source = barShowAvg ? data : data.filter(r => r.annee === barYear)
    const nYears = barShowAvg ? (years.length || 1) : 1

    // ── Agrégation hors SA ──
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

    // ── Insight 1 : Région dominante hors SA ──
    const card1: InsightCardProps = {
      tone: 'navy',
      icon: '🏆',
      value: leader.region,
      label: 'RÉGION DOMINANTE',
      body: `${leader.region} concentre ${leaderPct.toFixed(1)}% des primes régionales hors Afrique du Sud (${fmtMn(leader.value)}).${second
        ? ` ${second.region} arrive en 2ème position avec ${secondPct.toFixed(1)}% (${fmtMn(second.value)}). Ensemble, ces deux régions représentent ${(leaderPct + secondPct).toFixed(1)}% du marché hors SA.`
        : ''}`,
      badge: { text: `${leaderPct.toFixed(0)}% part de marché hors SA`, kind: leaderPct > 60 ? 'alert' : 'info' },
    }

    const usedRegions = new Set([leader.region])

    // ── Insight 2 : Profondeur de marché — prime moyenne par pays actif dans la région (hors SA, hors leader) ──
    // Nombre de pays actifs (ayant des primes > 0) dans chaque région sur la source filtrée
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

    // Région avec la plus haute prime moyenne par pays = marché le plus profond (hors leader)
    const deepestReg   = depthByRegion[0]
    // Région avec la plus faible prime moyenne par pays = plus grand potentiel latent par pays
    const shallowReg   = depthByRegion.length > 1 ? depthByRegion[depthByRegion.length - 1] : null
    const ratioDepth   = shallowReg && shallowReg.avgPerCountry > 0
      ? deepestReg.avgPerCountry / shallowReg.avgPerCountry
      : null

    usedRegions.add(deepestReg?.region ?? '')

    const depthTone: InsightCardProps['tone'] =
      (deepestReg?.avgPerCountry ?? 0) >= 500 ? 'green' : (deepestReg?.avgPerCountry ?? 0) >= 100 ? 'amber' : 'navy'

    const card2: InsightCardProps = deepestReg
      ? {
          tone: depthTone,
          icon: '🔬',
          value: deepestReg.region,
          label: 'PROFONDEUR DE MARCHÉ PAR PAYS',
          body: `${deepestReg.region} affiche la prime moyenne la plus élevée par pays actif hors leader : ${fmtMn(deepestReg.avgPerCountry)}/pays (${fmtMn(deepestReg.total)} répartis sur ${deepestReg.nCountries} pays).${ratioDepth != null && shallowReg
            ? ` À l'opposé, ${shallowReg.region} ne génère que ${fmtMn(shallowReg.avgPerCountry)}/pays — soit un écart de ×${ratioDepth.toFixed(1)} entre les deux régions.`
            : ''} Signe d'une forte concentration intra-régionale à considérer pour la diversification du portefeuille Atlantic Re.`,
          badge: { text: `${fmtMn(deepestReg.avgPerCountry)}/pays · ${deepestReg.nCountries} pays`, kind: 'info' },
        }
      : {
          tone: 'navy',
          icon: '🔬',
          value: '—',
          label: 'PROFONDEUR DE MARCHÉ PAR PAYS',
          body: 'Données insuffisantes pour calculer la profondeur régionale.',
        }

    // ── Insight 3 : Meilleur équilibre volume / S/P — hors régions déjà citées ──
    const spByRegion: Record<string, number[]> = {}
    for (const r of data) {
      if (r.ratio_sp_pct == null || r.pays === 'Afrique du Sud') continue
      const reg = r.region ?? 'Autre'
        ; (spByRegion[reg] ??= []).push(r.ratio_sp_pct)
    }
    const regWithSP = regListNoSA
      .filter(r => !usedRegions.has(r.region) && spByRegion[r.region]?.length > 0)
      .map(r => ({ region: r.region, value: r.value, medSP: median(spByRegion[r.region]) }))

    // Fallback : inclure toutes les régions NoSA si toutes déjà citées
    const regWithSPFull = regListNoSA
      .filter(r => spByRegion[r.region]?.length > 0)
      .map(r => ({ region: r.region, value: r.value, medSP: median(spByRegion[r.region]) }))

    const medPrimes = totalNoSA > 0 ? median(regListNoSA.map(r => r.value)) : 0

    const sweetSpot = (regWithSP.length ? regWithSP : regWithSPFull)
      .filter(r => r.value >= medPrimes && r.medSP <= 70)
      .sort((a, b) => a.medSP - b.medSP)

    const bestSPReg = (regWithSP.length ? regWithSP : regWithSPFull).length
      ? [...(regWithSP.length ? regWithSP : regWithSPFull)].sort((a, b) => a.medSP - b.medSP)[0]
      : null

    const targetReg = sweetSpot[0] ?? bestSPReg
    const sp3Tone: InsightCardProps['tone'] =
      (targetReg?.medSP ?? 100) < 50 ? 'green' : (targetReg?.medSP ?? 100) < 70 ? 'amber' : 'red'

    const card3: InsightCardProps = targetReg
      ? {
        tone: sp3Tone,
        icon: '⚖️',
        value: targetReg.region,
        label: 'MEILLEUR ÉQUILIBRE VOLUME / RENTABILITÉ',
        body: sweetSpot.length > 0
          ? `${targetReg.region} offre le meilleur équilibre : primes ${fmtMn(targetReg.value)} (≥ médiane régionale ${fmtMn(medPrimes)}) et un ratio S/P médian de ${targetReg.medSP.toFixed(1)}%, sous le seuil technique de 70%. Conditions optimales pour la réassurance non-vie d'Atlantic Re.`
          : `Aucune région ne cumule simultanément primes ≥ médiane et S/P ≤ 70%. ${bestSPReg ? `Meilleur S/P disponible : ${bestSPReg.region} (${bestSPReg.medSP.toFixed(1)}%).` : ''}`,
        badge: {
          text: sweetSpot.length > 0 ? '✓ Zone prioritaire Atlantic Re' : '⚠ Meilleur disponible',
          kind: sweetSpot.length > 0 ? 'ok' : 'warn',
        },
      }
      : {
        tone: 'amber',
        icon: '⚖️',
        value: '—',
        label: 'MEILLEUR ÉQUILIBRE VOLUME / RENTABILITÉ',
        body: 'Données de ratio S/P insuffisantes pour comparer les régions.',
      }

    return [card1, card2, card3] satisfies InsightCardProps[]
  }, [data, barYear, barShowAvg, years])
}
