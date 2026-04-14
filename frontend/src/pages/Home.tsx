import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Compass,
  Globe2,
  LineChart,
  Network,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'

const NAVY = '#2D3E50'
const NAVY_DEEP = '#1B2A3A'
const NAVY_LIGHT = '#3d5470'
const OLIVE = '#4E6820'
const OLIVE_DEEP = '#3A4F18'
const OLIVE_LIGHT = '#a8c45a'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen w-full flex flex-col relative"
      style={{
        background: '#F7F8FA',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* ─── KEYFRAMES ─────────────────────────────────────────── */}
      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(40px, -30px) scale(1.05); }
          66%      { transform: translate(-30px, 20px) scale(0.97); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-50px, 30px) scale(1.08); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .home-fade-up { animation: fadeUp 0.7s var(--ease-out, cubic-bezier(0.22,1,0.36,1)) both; }
      `}</style>

      {/* ─── HERO ──────────────────────────────────────────────── */}
      <header
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${NAVY_DEEP} 0%, ${NAVY} 50%, #243446 100%)`,
          color: '#fff',
        }}
      >
        {/* Animated orbs */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: '-15%',
            left: '-5%',
            width: 520,
            height: 520,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(78,104,32,0.35) 0%, rgba(78,104,32,0) 65%)',
            filter: 'blur(40px)',
            animation: 'orbFloat 18s ease-in-out infinite',
          }}
        />
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: '20%',
            right: '-10%',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(61,84,112,0.55) 0%, rgba(61,84,112,0) 65%)',
            filter: 'blur(50px)',
            animation: 'orbFloat2 22s ease-in-out infinite',
          }}
        />

        {/* Decorative grid */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
            maskImage:
              'radial-gradient(ellipse at 50% 30%, rgba(0,0,0,0.85), transparent 70%)',
            WebkitMaskImage:
              'radial-gradient(ellipse at 50% 30%, rgba(0,0,0,0.85), transparent 70%)',
          }}
        />

        {/* Olive accent line */}
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: 3,
            background: `linear-gradient(90deg, transparent 0%, ${OLIVE} 25%, ${OLIVE_LIGHT} 50%, ${OLIVE} 75%, transparent 100%)`,
          }}
        />

        <div className="relative max-w-6xl mx-auto px-8 pt-16 pb-28">
          {/* Brand mark */}
          <div className="flex items-center gap-3 mb-12 home-fade-up">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-extrabold relative"
              style={{
                background: `linear-gradient(135deg, ${OLIVE_DEEP} 0%, ${OLIVE} 55%, #6c8c2c 100%)`,
                boxShadow:
                  '0 8px 24px rgba(78,104,32,0.50), inset 0 1px 0 rgba(255,255,255,0.20)',
              }}
            >
              Re
              <span
                aria-hidden
                className="absolute inset-0 rounded-xl"
                style={{
                  border: '1px solid rgba(255,255,255,0.18)',
                  pointerEvents: 'none',
                }}
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-bold tracking-wide">
                Atlantic<span style={{ color: OLIVE_LIGHT }}>Re</span>
              </span>
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: 'rgba(255,255,255,0.45)' }}
              >
                CDG Group · Reach 2030
              </span>
            </div>
          </div>

          {/* Eyebrow badge */}
          <div
            className="home-fade-up"
            style={{ animationDelay: '0.05s' }}
          >
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{
                background: 'rgba(168,196,90,0.10)',
                border: '1px solid rgba(168,196,90,0.30)',
                color: OLIVE_LIGHT,
                backdropFilter: 'blur(8px)',
              }}
            >
              <Sparkles size={11} />
              Plateforme d'Intelligence Réassurantielle
            </span>
          </div>

          {/* Title */}
          <h1
            className="mt-6 font-bold tracking-tight home-fade-up"
            style={{
              fontSize: 'clamp(2.75rem, 6vw, 4.75rem)',
              lineHeight: 1.02,
              letterSpacing: '-0.025em',
              animationDelay: '0.1s',
            }}
          >
            Atlantic{' '}
            <span
              style={{
                background: `linear-gradient(135deg, ${OLIVE_LIGHT} 0%, #d4e89a 50%, ${OLIVE_LIGHT} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Re
            </span>
          </h1>
          <p
            className="mt-5 font-medium home-fade-up"
            style={{
              fontSize: 'clamp(1.15rem, 2.2vw, 1.55rem)',
              color: '#cdd7e2',
              letterSpacing: '0.005em',
              animationDelay: '0.15s',
            }}
          >
            Piloter la performance.{' '}
            <span style={{ color: '#fff' }}>Modéliser l'expansion.</span>
          </p>

          <p
            className="mt-7 max-w-2xl text-[15px] leading-relaxed home-fade-up"
            style={{
              color: 'rgba(255,255,255,0.72)',
              animationDelay: '0.2s',
            }}
          >
            Filiale du <strong style={{ color: '#fff' }}>Groupe CDG</strong>,
            Atlantic Re est un réassureur international actif sur plus de 60
            marchés et auprès de 400+ cédantes. Cette plateforme porte la
            double mission du programme{' '}
            <strong style={{ color: OLIVE_LIGHT }}>Reach 2030</strong> :
            piloter la performance du portefeuille existant et modéliser
            l'expansion stratégique sur le continent africain.
          </p>

          {/* Stats strip */}
          <div
            className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 home-fade-up"
            style={{ animationDelay: '0.3s' }}
          >
            {[
              { icon: Globe2, value: '60+', label: 'Marchés couverts' },
              { icon: Network, value: '400+', label: 'Cédantes actives' },
              { icon: TrendingUp, value: '54', label: 'Pays Afrique' },
              { icon: ShieldCheck, value: '2030', label: 'Horizon Reach' },
            ].map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="rounded-xl px-4 py-3.5 transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon
                    size={13}
                    style={{ color: OLIVE_LIGHT, opacity: 0.9 }}
                  />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    {label}
                  </span>
                </div>
                <p
                  className="text-[24px] font-bold tracking-tight"
                  style={{ color: '#fff', letterSpacing: '-0.01em' }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ─── SELECTION CARDS ───────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-8 py-20 relative">
        <div className="mb-14 text-center home-fade-up">
          <span
            className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{
              background: 'rgba(45,62,80,0.06)',
              color: NAVY,
              border: '1px solid rgba(45,62,80,0.12)',
            }}
          >
            Choisir un module
          </span>
          <h2
            className="mt-5 text-[30px] md:text-[38px] font-bold tracking-tight"
            style={{ color: NAVY, letterSpacing: '-0.02em' }}
          >
            Deux missions, une plateforme
          </h2>
          <p className="mt-3 text-[15px] text-gray-600 max-w-2xl mx-auto">
            Sélectionnez l'axe que vous souhaitez explorer.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
          <SelectionCard
            accent={NAVY}
            accentDeep={NAVY_DEEP}
            accentLight={NAVY_LIGHT}
            label="Axe 1 · Opérationnel"
            title="Portefeuille Interne"
            subtitle="Analyse opérationnelle du portefeuille de réassurance"
            description="KPIs, filtres avancés, scoring d'attractivité, comparaison de marchés, suivi des cédantes, exports Excel et PDF."
            features={[
              { icon: BarChart3, label: 'KPIs & indicateurs financiers' },
              { icon: Target, label: 'Scoring & recommandations' },
              { icon: LineChart, label: 'Analyse cédantes & courtiers' },
            ]}
            cta="Accéder à l'analyse"
            status="Module actif"
            statusActive
            onClick={() => navigate('/dashboard')}
            delay="0s"
          />

          <SelectionCard
            accent={OLIVE}
            accentDeep={OLIVE_DEEP}
            accentLight={OLIVE_LIGHT}
            label="Axe 2 · Stratégique"
            title="Modélisation Afrique 2030"
            subtitle="Module SCAR — expansion stratégique africaine"
            description="Scoring multicritère, carte d'attractivité des 54 marchés africains et pipeline ML pour piloter Reach 2030."
            features={[
              { icon: Compass, label: 'Scoring SCAR multicritère' },
              { icon: Globe2, label: '54 marchés africains' },
              { icon: Sparkles, label: 'Pipeline ML & projections' },
            ]}
            cta="Explorer"
            status="En intégration"
            statusActive={false}
            onClick={() => navigate('/modelisation')}
            delay="0.08s"
          />
        </div>
      </main>

      {/* ─── FOOTER ────────────────────────────────────────────── */}
      <footer
        className="mt-auto relative"
        style={{
          borderTop: '1px solid rgba(45,62,80,0.10)',
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-6xl mx-auto px-8 py-7 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-extrabold text-white"
              style={{
                background: `linear-gradient(135deg, ${OLIVE_DEEP}, ${OLIVE})`,
              }}
            >
              Re
            </div>
            <p className="text-[12px] text-gray-500 tracking-wide">
              Atlantic Re © 2026 — Groupe CDG · Reach 2030
            </p>
          </div>
          <p
            className="text-[11px] uppercase tracking-[0.18em] font-semibold"
            style={{ color: NAVY }}
          >
            Plateforme d'Intelligence Réassurantielle
          </p>
        </div>
      </footer>
    </div>
  )
}

// ─── SelectionCard ──────────────────────────────────────────────
type Feature = { icon: React.ElementType; label: string }
type SelectionCardProps = {
  accent: string
  accentDeep: string
  accentLight: string
  label: string
  title: string
  subtitle: string
  description: string
  features: Feature[]
  cta: string
  status: string
  statusActive: boolean
  onClick: () => void
  delay: string
}

function SelectionCard({
  accent,
  accentDeep,
  accentLight,
  label,
  title,
  subtitle,
  description,
  features,
  cta,
  status,
  statusActive,
  onClick,
  delay,
}: SelectionCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative text-left rounded-2xl overflow-hidden transition-all duration-500 home-fade-up"
      style={{
        background: '#fff',
        border: '1px solid rgba(45,62,80,0.08)',
        boxShadow:
          '0 1px 3px rgba(45,62,80,0.04), 0 12px 36px rgba(45,62,80,0.06)',
        cursor: 'pointer',
        animationDelay: delay,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)'
        e.currentTarget.style.boxShadow = `0 8px 16px rgba(45,62,80,0.06), 0 32px 64px ${accent}30`
        e.currentTarget.style.borderColor = `${accent}55`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow =
          '0 1px 3px rgba(45,62,80,0.04), 0 12px 36px rgba(45,62,80,0.06)'
        e.currentTarget.style.borderColor = 'rgba(45,62,80,0.08)'
      }}
    >
      {/* Decorative corner glow */}
      <div
        aria-hidden
        className="absolute pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100"
        style={{
          top: -80,
          right: -80,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}28 0%, transparent 65%)`,
          filter: 'blur(24px)',
        }}
      />

      {/* Top accent bar */}
      <div
        aria-hidden
        style={{
          height: 4,
          background: `linear-gradient(90deg, ${accentDeep} 0%, ${accent} 35%, ${accentLight} 65%, ${accent} 100%)`,
        }}
      />

      <div className="relative p-8">
        {/* Header row: badge + status */}
        <div className="flex items-center justify-between mb-6">
          <span
            className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{
              background: `${accent}10`,
              color: accent,
              border: `1px solid ${accent}28`,
            }}
          >
            {label}
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: statusActive ? '#16a34a' : 'rgba(45,62,80,0.4)' }}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: 6,
                height: 6,
                background: statusActive ? '#22c55e' : 'rgba(45,62,80,0.35)',
                boxShadow: statusActive
                  ? '0 0 0 3px rgba(34,197,94,0.18)'
                  : 'none',
              }}
            />
            {status}
          </span>
        </div>

        {/* Title */}
        <h3
          className="text-[28px] font-bold tracking-tight"
          style={{ color: accent, letterSpacing: '-0.02em', lineHeight: 1.1 }}
        >
          {title}
        </h3>
        <p
          className="mt-2 text-[14px] font-medium"
          style={{ color: 'rgba(45,62,80,0.65)' }}
        >
          {subtitle}
        </p>

        {/* Description */}
        <p className="mt-5 text-[14px] leading-relaxed text-gray-600">
          {description}
        </p>

        {/* Feature list */}
        <ul className="mt-7 space-y-3">
          {features.map(({ icon: Icon, label: featLabel }) => (
            <li
              key={featLabel}
              className="flex items-center gap-3 text-[13px] text-gray-700"
            >
              <span
                className="flex items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110"
                style={{
                  width: 30,
                  height: 30,
                  background: `linear-gradient(135deg, ${accent}10, ${accent}18)`,
                  color: accent,
                  border: `1px solid ${accent}20`,
                }}
              >
                <Icon size={14} />
              </span>
              <span className="font-medium">{featLabel}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div
          className="mt-9 pt-6 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(45,62,80,0.08)' }}
        >
          <span
            className="text-[14px] font-bold flex items-center gap-2 transition-all duration-300"
            style={{ color: accent }}
          >
            {cta}
            <span
              className="flex items-center justify-center rounded-full transition-all duration-300 group-hover:translate-x-1"
              style={{
                width: 26,
                height: 26,
                background: `${accent}12`,
                border: `1px solid ${accent}25`,
              }}
            >
              <ArrowRight size={13} />
            </span>
          </span>
        </div>
      </div>
    </button>
  )
}
