// Layout SCAR (Axe 2) — navbar olive, Cartographie dropdown actif.
// Utilisé comme parent des routes /modelisation/cartographie/*
import React from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, BarChart2, ChevronDown, Compass, Database, LayoutDashboard, Map,
  Network, Sparkles, Target, TrendingUp, Shield, Building2, Heart, Landmark, Combine,
} from 'lucide-react'

type NavChild = { to: string; label: string; icon: React.ElementType; enabled?: boolean; gold?: boolean }
type NavDirect = { to: string; label: string; icon: React.ElementType; exact?: boolean; children?: undefined }
type NavGroup = { label: string; icon: React.ElementType; children: NavChild[]; to?: undefined }
type NavItem = NavDirect | NavGroup

const navItems: NavItem[] = [
  { to: '/modelisation', label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  {
    label: 'Modélisation', icon: Target,
    children: [
      { to: '/modelisation/scoring', label: 'Scoring SCAR', icon: Target },
      { to: '/modelisation/criteres', label: 'Critères & poids', icon: Sparkles },
    ],
  },
  {
    label: 'Cartographie', icon: Map,
    children: [
      { to: '/modelisation/cartographie/non-vie', label: 'Assurance Non-Vie', icon: Building2, enabled: true },
      { to: '/modelisation/cartographie/vie', label: 'Assurance Vie', icon: Heart, enabled: true },
      { to: '/modelisation/cartographie/macroeconomie', label: 'Macroéconomie', icon: TrendingUp, enabled: true },
      { to: '/modelisation/cartographie/gouvernance', label: 'Gouvernance', icon: Landmark, enabled: true },
    ],
  },
  {
    label: 'Analyse', icon: Network,
    children: [
      { to: '/modelisation/analyse', label: 'Analyse par Pays', icon: BarChart2, enabled: true },
      { to: '/modelisation/comparaison', label: 'Comparaison marchés', icon: Network, enabled: true },
      { to: '/analyse-synergie', label: 'Analyse Synergie', icon: Combine, enabled: true, gold: true },
      { to: '/modelisation/projections', label: 'Projections ML', icon: TrendingUp },
    ],
  },
  { to: '/modelisation/recommandations', label: 'Recommandations', icon: Sparkles },
]

function NavDropdown({ label, icon: Icon, children }: NavGroup) {
  const { pathname } = useLocation()
  const isGroupActive = children.some(
    c => c.enabled && (pathname === c.to || pathname.startsWith(c.to + '/'))
  )
  return (
    <div className="relative group flex-shrink-0" style={{ isolation: 'auto' }}>
      <button
        className={[
          'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.81rem] font-medium whitespace-nowrap relative',
          'transition-all duration-250 border',
          isGroupActive ? 'text-white -translate-y-px' : 'text-white/55 hover:text-white/95 hover:-translate-y-px border-transparent',
        ].join(' ')}
        style={isGroupActive ? { background: 'hsla(83,50%,55%,0.18)', borderColor: 'hsla(83,50%,55%,0.40)' } : undefined}
        onMouseEnter={e => { if (!isGroupActive) e.currentTarget.style.background = 'hsla(0,0%,100%,0.07)' }}
        onMouseLeave={e => { if (!isGroupActive) e.currentTarget.style.background = '' }}
      >
        <Icon size={14} className="flex-shrink-0 transition-all duration-250"
          style={isGroupActive ? { color: 'hsl(83,60%,75%)', opacity: 1 } : { opacity: 0.55 }} />
        <span>{label}</span>
        <ChevronDown size={11} className="flex-shrink-0 ml-0.5 transition-transform duration-250 group-hover:rotate-180"
          style={{ opacity: isGroupActive ? 0.85 : 0.45 }} />
        {isGroupActive && (
          <span className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-t-sm"
            style={{ background: 'hsl(83,60%,70%)' }} />
        )}
      </button>
      <div className="absolute left-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
        style={{
          top: 'calc(100% + 8px)', zIndex: 200,
          background: 'hsla(83,30%,12%,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid hsla(83,52%,50%,0.25)', boxShadow: '0 16px 48px hsla(83,40%,8%,0.55)',
          borderRadius: 12, minWidth: 240, padding: 6,
        }}
      >
        {children.map(child => {
          const ChildIcon = child.icon
          if (child.enabled) {
            if (child.gold) {
              return (
                <NavLink
                  key={child.to}
                  to={child.to}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[0.81rem] font-medium whitespace-nowrap transition-all duration-200"
                  style={({ isActive }) => ({
                    color: isActive ? 'white' : 'hsl(43,96%,70%)',
                    background: isActive ? 'hsla(43,96%,48%,0.28)' : undefined,
                  })}
                  onMouseEnter={e => { e.currentTarget.style.background = 'hsla(43,96%,48%,0.15)' }}
                  onMouseLeave={e => {
                    const active = e.currentTarget.getAttribute('aria-current') === 'page'
                    e.currentTarget.style.background = active ? 'hsla(43,96%,48%,0.28)' : ''
                  }}
                >
                  <ChildIcon size={13} className="flex-shrink-0" style={{ color: 'hsl(43,96%,65%)' }} />
                  <span>{child.label}</span>
                  <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'hsla(43,96%,48%,0.25)', color: 'hsl(43,96%,70%)', border: '1px solid hsla(43,96%,48%,0.35)' }}>
                    Axe 1x2
                  </span>
                </NavLink>
              )
            }
            return (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) => [
                  'flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[0.81rem] font-medium whitespace-nowrap transition-all duration-200',
                  isActive ? 'text-white' : 'text-white/70 hover:text-white',
                ].join(' ')}
                style={({ isActive }) => (isActive ? { background: 'hsla(83,52%,50%,0.22)' } : undefined)}
                onMouseEnter={e => { e.currentTarget.style.background = 'hsla(0,0%,100%,0.07)' }}
                onMouseLeave={e => {
                  const active = (e.currentTarget.getAttribute('aria-current') === 'page')
                  e.currentTarget.style.background = active ? 'hsla(83,52%,50%,0.22)' : ''
                }}
              >
                <ChildIcon size={13} className="flex-shrink-0" style={{ color: 'hsl(83,60%,70%)', opacity: 0.9 }} />
                <span>{child.label}</span>
              </NavLink>
            )
          }
          return (
            <div key={child.label}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[0.81rem] font-medium whitespace-nowrap text-white/45 select-none"
              style={{ cursor: 'not-allowed' }}>
              <ChildIcon size={13} className="flex-shrink-0" style={{ opacity: 0.5 }} />
              <span>{child.label}</span>
              <span className="ml-auto px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                style={{ background: 'hsla(83,52%,50%,0.15)', color: 'hsl(83,60%,70%)', border: '1px solid hsla(83,52%,50%,0.25)' }}>
                Soon
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ScarLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--color-off-white)' }}>
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

        <div className="flex items-center gap-3 px-5 h-full flex-shrink-0"
          style={{ borderRight: '1px solid hsla(0,0%,100%,0.07)', minWidth: 220 }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0 tracking-wider"
            style={{ background: 'linear-gradient(135deg, hsl(83,54%,30%) 0%, hsl(83,52%,42%) 60%, hsl(83,55%,55%) 100%)', boxShadow: '0 2px 12px hsla(83,55%,50%,0.55), inset 0 1px 0 hsla(0,0%,100%,0.20)' }}>
            SCAR
          </div>
          <div className="flex flex-col justify-center cursor-pointer" onClick={() => navigate('/modelisation')}>
            <span className="text-[1.05rem] font-bold tracking-[0.01em] text-white leading-tight">
              Reach<span style={{ color: 'hsl(83,60%,70%)' }}>2030</span>
            </span>
            <span className="text-[0.59rem] font-medium tracking-[0.18em] uppercase mt-px" style={{ color: 'hsla(0,0%,100%,0.40)' }}>
              Modélisation Stratégique
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-0.5 flex-1 px-3 h-full overflow-visible">
          {navItems.map(item =>
            item.children ? (
              <NavDropdown key={item.label} {...item} />
            ) : (
              <button
                key={item.to}
                title={item.label}
                onClick={() => navigate(item.to)}
                className={[
                  'group flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.81rem] font-medium whitespace-nowrap relative',
                  'transition-all duration-250 border',
                  pathname === item.to ? 'text-white -translate-y-px' : 'text-white/55 hover:text-white/95 border-transparent',
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
            )
          )}
        </nav>

        <div className="flex items-center gap-2.5 px-4 h-full flex-shrink-0"
          style={{ borderLeft: '1px solid hsla(0,0%,100%,0.07)' }}>
          <div className="hidden lg:flex flex-col items-end px-3 py-1.5 rounded-lg"
            style={{ background: 'hsla(0,0%,0%,0.22)', border: '1px solid hsla(0,0%,100%,0.07)', backdropFilter: 'blur(8px)' }}>
            <div className="flex items-center gap-1.5">
              <Database size={11} style={{ color: 'hsl(83,60%,70%)', opacity: 0.9 }} />
              <span className="text-white text-xs font-bold tracking-wide">Axe 2 · SCAR</span>
            </div>
            <span className="hidden xl:block text-[0.6rem] mt-0.5 tracking-wide" style={{ color: 'hsla(0,0%,100%,0.40)' }}>
              Cartographie des marchés
            </span>
          </div>
          <button
            onClick={() => navigate('/')}
            title="Retour à l'accueil"
            className="group flex items-center gap-2 px-4 py-2 text-[0.8rem] font-semibold text-white rounded-lg whitespace-nowrap transition-all duration-250"
            style={{ background: 'linear-gradient(135deg, hsl(83,54%,30%) 0%, hsl(83,52%,42%) 55%, hsl(83,55%,52%) 100%)', boxShadow: '0 2px 12px hsla(83,55%,50%,0.45), inset 0 1px 0 hsla(0,0%,100%,0.18)', border: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = '' }}
          >
            <ArrowLeft size={13} className="flex-shrink-0 transition-transform duration-300 group-hover:-translate-x-1" />
            <span className="hidden sm:inline">Accueil</span>
          </button>
        </div>
      </header>

      <main id="scar-main-scroll" className="flex-1 overflow-y-auto w-full relative" style={{ scrollbarWidth: 'thin' }}>
        <Outlet />
      </main>

      <div className="status-bar">
        <div className="status-bar__left">
          <span className="status-bar__dot" />
          <span>SCAR · Cartographie</span>
          <span className="status-bar__separator" />
          <span>© 2024–2026 Atlantic Re — CDG Group</span>
        </div>
        <div className="status-bar__right">
          <span>Decision Intelligence Platform</span>
          <span className="status-bar__separator" />
          <span style={{ color: 'hsla(83,60%,70%,0.6)' }}>v1.0.0</span>
        </div>
      </div>
    </div>
  )
}
// Unused icon references kept intentionally
void Shield
void Compass
