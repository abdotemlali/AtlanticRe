// Layout SCAR (Axe 2) — navbar unifié avec le style des fonctionnalités d'analyse
import React from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import {
  BarChart2, ChevronDown, Database, LayoutDashboard, Map,
  Network, Sparkles, Target, TrendingUp, Building2, Heart, Landmark, Combine, Shuffle,
  LogOut, Settings,
} from 'lucide-react'

// ─── Nav types ───────────────────────────────────────────────────────────────
type NavChild  = { to: string; label: string; icon: React.ElementType; enabled?: boolean; gold?: boolean }
type NavDirect = { to: string; label: string; icon: React.ElementType; exact?: boolean; children?: undefined }
type NavGroup  = { label: string; icon: React.ElementType; children: NavChild[]; to?: undefined }
type NavItem   = NavDirect | NavGroup

const navItems: NavItem[] = [
  { to: '/vue_ensemble', label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  {
    label: 'Modélisation', icon: Target,
    children: [
      { to: '/vue_ensemble#scoring', label: 'Scoring SCAR', icon: Target, enabled: true },
      { to: '/vue_ensemble#criteres', label: 'Critères & poids', icon: Sparkles, enabled: true },
      { to: '/modelisation/predictions',  label: 'Prédictions 2030',  icon: TrendingUp, enabled: true },
      { to: '/modelisation/monte-carlo',  label: 'Monte Carlo',        icon: Shuffle,    enabled: true },
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
      { to: '/modelisation/analyse-compagnie', label: 'Analyse Compagnie', icon: Building2, enabled: true },
      { to: '/modelisation/comparaison', label: 'Comparaison marchés', icon: Network, enabled: true },
      { to: '/analyse-synergie', label: 'Analyse Synergie', icon: Combine, enabled: true, gold: true },
    ],
  },
  { to: '/modelisation/recommandations', label: 'Recommandations', icon: Sparkles },
]

// ─── NavDropdown — style unifié avec Layout.tsx ──────────────────────────────
function NavDropdown({ label, icon: Icon, children }: NavGroup) {
  const { pathname } = useLocation()
  const isGroupActive = children.some(
    c => c.enabled && (pathname === c.to || pathname.startsWith(c.to + '/'))
  )

  return (
    <div className="relative group flex-shrink-0" style={{ isolation: 'auto' }}>
      <button
        className={[
          'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[0.78rem] font-medium whitespace-nowrap relative',
          'transition-all duration-250 ease-out-expo border',
          isGroupActive
            ? 'text-white bg-[hsla(83,52%,36%,0.18)] border-[hsla(83,52%,36%,0.35)] -translate-y-px'
            : 'text-white/55 hover:text-white/95 hover:bg-[hsla(0,0%,100%,0.07)] hover:-translate-y-px border-transparent',
        ].join(' ')}
      >
        <Icon
          size={14}
          className="flex-shrink-0 transition-all duration-250"
          style={isGroupActive ? { color: 'hsl(83,50%,55%)', opacity: 1 } : { opacity: 0.55 }}
        />
        <span>{label}</span>
        <ChevronDown
          size={11}
          className="flex-shrink-0 ml-0.5 transition-transform duration-250 group-hover:rotate-180"
          style={{ opacity: isGroupActive ? 0.8 : 0.45 }}
        />
        {isGroupActive && (
          <span
            className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-t-sm"
            style={{ background: 'hsl(83,52%,36%)' }}
          />
        )}
      </button>

      <div
        className="absolute left-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-out-expo"
        style={{
          top: 'calc(100% + 8px)',
          zIndex: 200,
          background: 'hsla(209,35%,14%,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid hsla(83,52%,36%,0.20)',
          boxShadow: '0 16px 48px hsla(209,28%,8%,0.55)',
          borderRadius: 12,
          minWidth: 220,
          padding: 6,
        }}
      >
        {children.map(child => {
          const ChildIcon = child.icon
          if (child.enabled) {
            return (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[0.81rem] font-medium whitespace-nowrap',
                    'transition-all duration-200',
                    isActive
                      ? child.gold ? 'text-white' : 'text-white bg-[hsla(83,52%,36%,0.22)]'
                      : child.gold ? 'hover:bg-[hsla(0,0%,100%,0.07)]' : 'text-white/55 hover:text-white/90 hover:bg-[hsla(0,0%,100%,0.07)]',
                  ].join(' ')
                }
                style={({ isActive }) => child.gold
                  ? { color: isActive ? 'white' : 'hsl(43,96%,65%)', background: isActive ? 'hsla(43,96%,48%,0.25)' : undefined }
                  : undefined
                }
              >
                {({ isActive }) => (
                  <>
                    <ChildIcon
                      size={13}
                      className="flex-shrink-0"
                      style={
                        child.gold
                          ? { color: isActive ? 'white' : 'hsl(43,96%,65%)', opacity: 1 }
                          : isActive ? { color: 'hsl(83,50%,55%)', opacity: 1 } : { opacity: 0.5 }
                      }
                    />
                    <span>{child.label}</span>
                    {child.gold && (
                      <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'hsla(43,96%,48%,0.25)', color: 'hsl(43,96%,70%)', border: '1px solid hsla(43,96%,48%,0.35)' }}>
                        Axe 1×2
                      </span>
                    )}
                  </>
                )}
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

// ─── ScarLayout ──────────────────────────────────────────────────────────────
export default function ScarLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
    toast.success('Déconnexion réussie')
  }

  const userInitials = user?.full_name
    ? user.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AD'

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--color-off-white)' }}>

      {/* ─────────────────────────────────────────────────────
          TOP NAVBAR — Unifié avec le style analyse (navy)
          ───────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between flex-shrink-0 relative overflow-visible"
        style={{
          height: 64,
          background: 'linear-gradient(135deg, hsl(209,35%,12%) 0%, hsl(209,30%,18%) 40%, hsl(209,28%,22%) 70%, hsl(100,36%,14%) 100%)',
          boxShadow: '0 4px 28px hsla(209,35%,8%,0.50), 0 1px 0 hsla(83,52%,36%,0.25)',
          zIndex: 100,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Top shimmer line */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 5%, hsla(83,52%,60%,0.35) 30%, hsla(0,0%,100%,0.10) 50%, hsla(83,52%,60%,0.35) 70%, transparent 95%)' }}
        />
        {/* Bottom green accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none z-10"
          style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(83,54%,27%) 15%, hsl(83,52%,36%) 40%, hsl(83,50%,45%) 55%, hsl(83,52%,36%) 70%, hsl(83,54%,27%) 85%, transparent 100%)' }}
        />

        {/* ───── ZONE 1: LOGO ───── */}
        <div
          className="flex items-center gap-2 px-3.5 h-full flex-shrink-0 cursor-pointer transition-opacity hover:opacity-80"
          style={{
            borderRight: '1px solid hsla(0,0%,100%,0.07)',
            minWidth: 170,
          }}
          onClick={() => navigate('/home')}
          title="Retour à l'accueil"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0 animate-float"
            style={{
              background: 'linear-gradient(135deg, hsl(83,54%,27%) 0%, hsl(83,52%,36%) 60%, hsl(83,50%,45%) 100%)',
              boxShadow: '0 2px 12px hsla(83,52%,36%,0.45), inset 0 1px 0 hsla(0,0%,100%,0.20)',
              willChange: 'transform',
            }}
          >
            Re
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[1.05rem] font-bold tracking-[0.01em] text-white leading-tight">
              Atlantic<span style={{ color: 'hsl(83,50%,55%)' }}>Re</span>
            </span>
            <span className="text-[0.59rem] font-medium tracking-[0.18em] uppercase mt-px" style={{ color: 'hsla(0,0%,100%,0.38)' }}>
              CDG GROUP
            </span>
          </div>
        </div>

        {/* ───── ZONE 2: NAVIGATION ───── */}
        <nav className="flex items-center gap-0.5 flex-1 px-3 h-full overflow-visible">
          {navItems.map((item) =>
            item.children ? (
              <NavDropdown key={item.label} {...item} />
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                title={item.label}
                className={({ isActive }) =>
                  [
                    'group flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[0.78rem] font-medium whitespace-nowrap relative',
                    'transition-all duration-250 ease-out-expo border',
                    isActive
                      ? 'text-white bg-[hsla(83,52%,36%,0.18)] border-[hsla(83,52%,36%,0.35)] -translate-y-px'
                      : 'text-white/55 hover:text-white/95 hover:bg-[hsla(0,0%,100%,0.07)] hover:-translate-y-px border-transparent',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={14}
                      className={`flex-shrink-0 transition-all duration-250 ${isActive ? 'opacity-100' : 'opacity-55 group-hover:opacity-90'}`}
                      style={isActive ? { color: 'hsl(83,50%,55%)' } : undefined}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <span
                        className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-t-sm"
                        style={{ background: 'hsl(83,52%,36%)' }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            )
          )}
        </nav>

        {/* ───── ZONE 3: RIGHT ACTIONS ───── */}
        <div
          className="flex items-center gap-2 px-2.5 h-full flex-shrink-0"
          style={{ borderLeft: '1px solid hsla(0,0%,100%,0.07)' }}
        >
          {/* Axe 2 badge */}
          <div
            className="hidden lg:flex flex-col items-end px-3 py-1.5 rounded-lg"
            style={{
              background: 'hsla(0,0%,0%,0.22)',
              border: '1px solid hsla(0,0%,100%,0.07)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <Database size={11} style={{ color: 'hsl(83,50%,55%)', opacity: 0.9 }} />
              <span className="text-white text-xs font-bold tracking-wide">Axe 2 · SCAR</span>
            </div>
            <span className="hidden xl:block text-[0.6rem] mt-0.5 tracking-wide" style={{ color: 'hsla(0,0%,100%,0.35)' }}>
              Cartographie des marchés
            </span>
          </div>

          {/* User profile dropdown */}
          <div className="relative group">
            <button
              className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl transition-all duration-250 ease-out-expo"
              style={{
                background: 'hsla(0,0%,100%,0.06)',
                border: '1px solid hsla(0,0%,100%,0.10)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'hsla(0,0%,100%,0.10)'
                e.currentTarget.style.borderColor = 'hsla(83,52%,36%,0.40)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'hsla(0,0%,100%,0.06)'
                e.currentTarget.style.borderColor = 'hsla(0,0%,100%,0.10)'
                e.currentTarget.style.transform = ''
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[0.7rem] font-bold text-white flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, hsl(209,28%,28%), hsl(209,24%,40%))',
                  border: '2px solid hsla(83,52%,36%,0.60)',
                }}
              >
                {userInitials}
              </div>
              <div className="hidden md:flex flex-col items-start max-w-[110px]">
                <span className="text-[0.77rem] font-semibold text-white leading-tight truncate w-full">
                  {user?.full_name || 'Administrateur'}
                </span>
                <span className="text-[0.6rem] font-medium tracking-widest uppercase truncate w-full" style={{ color: 'hsl(83,50%,55%)' }}>
                  {user?.role || 'admin'}
                </span>
              </div>
              <ChevronDown
                size={12}
                className="flex-shrink-0 transition-transform duration-250 group-hover:rotate-180"
                style={{ color: 'hsla(0,0%,100%,0.40)' }}
              />
            </button>

            {/* Dropdown */}
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-250 ease-out-expo overflow-hidden z-50 animate-slide-down"
              style={{
                background: 'hsla(0,0%,100%,0.96)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid hsla(209,22%,90%,1)',
                boxShadow: '0 16px 48px hsla(209,28%,14%,0.18)',
                transformOrigin: 'top right',
              }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(218,22%,93%)' }}>
                <p className="text-sm font-semibold text-navy leading-tight">{user?.full_name || 'Administrateur'}</p>
                <p className="text-xs text-gray-500 mt-0.5">{(user as any)?.email || ''}</p>
              </div>

              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-gray-700 transition-colors text-left border-b"
                  style={{ borderColor: 'hsl(218,22%,93%)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'hsl(220,20%,97%)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '' }}
                >
                  <Settings size={14} className="text-gray-400 flex-shrink-0" />
                  Administration
                </button>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold transition-colors text-left"
                style={{ color: 'hsl(358,66%,54%)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'hsla(358,66%,54%,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '' }}
              >
                <LogOut size={14} className="flex-shrink-0" />
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────
          MAIN CONTENT
          ───────────────────────────────────────────────────── */}
      <main id="scar-main-scroll" className="flex-1 overflow-y-auto w-full relative" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-gray-300) transparent' }}>
        <Outlet />
      </main>

      {/* ─────────────────────────────────────────────────────
          STATUS BAR
          ───────────────────────────────────────────────────── */}
      <div className="status-bar">
        <div className="status-bar__left">
          <span className="status-bar__dot" />
          <span>Système opérationnel</span>
          <span className="status-bar__separator" />
          <span>© 2024–2026 Atlantic Re — CDG Group</span>
        </div>
        <div className="status-bar__right">
          <span>Decision Intelligence Platform</span>
          <span className="status-bar__separator" />
          <span style={{ color: 'hsla(83,50%,55%,0.6)' }}>v1.0.0</span>
        </div>
      </div>
    </div>
  )
}
