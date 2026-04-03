// 🎨 STYLE UPDATED — Full Antigravity redesign: glassmorphism header, floating nav, premium dropdown
import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { formatCompact } from '../utils/formatters'
import {
  LayoutDashboard, Target, GitCompare, Star, Settings,
  LogOut, RefreshCw, ChevronDown, UserX, Database, BarChart2, ShieldAlert, PieChart
} from 'lucide-react'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { to: '/analyse', label: 'Analyse Globale', icon: BarChart2 },
  { to: '/analyse-cedante', label: 'Analyse Cédante', icon: PieChart },
  { to: '/comparaison', label: 'Comparaison', icon: GitCompare },
  { to: '/scoring', label: 'Scoring', icon: Target },
  { to: '/recommandations', label: 'Recommandations', icon: Star },
  { to: '/fac-saturation', label: 'Saturation FAC', icon: ShieldAlert },
  { to: '/top-brokers', label: 'Courtiers', icon: Target },
  { to: '/exposition', label: 'Exposition & Risques', icon: Target },
]

export default function Layout() {
  const { user, logout, can } = useAuth()
  const { refreshData, refreshing, dataStatus } = useData()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
    toast.success('Déconnexion réussie')
  }

  const handleRefresh = async () => {
    try {
      await refreshData()
      toast.success('Données actualisées avec succès')
    } catch {
      toast.error('Erreur lors du rechargement')
    }
  }

  const userInitials = user?.full_name
    ? user.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AD'

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--color-off-white)' }}>

      {/* ─────────────────────────────────────────────────────
          TOP NAVBAR — Glassmorphism + Antigravity
          ───────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between flex-shrink-0 relative overflow-visible"
        style={{
          height: 64,
          // Deep navy gradient with rich depth
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
          style={{ background: 'linear-gradient(90deg, transparent, hsla(83,52%,60%,0.5) 30%, hsla(0,0%,100%,0.12) 50%, hsla(83,52%,60%,0.5) 70%, transparent)' }}
        />
        {/* Bottom green accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none z-10"
          style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(83,54%,27%) 15%, hsl(83,52%,36%) 40%, hsl(83,50%,45%) 55%, hsl(83,52%,36%) 70%, hsl(83,54%,27%) 85%, transparent 100%)' }}
        />

        {/* ───── ZONE 1: LOGO ───── */}
        <div
          className="flex items-center gap-3 px-5 h-full flex-shrink-0"
          style={{
            borderRight: '1px solid hsla(0,0%,100%,0.07)',
            minWidth: 200,
          }}
        >
          {/* Logo mark — floating with glow */}
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
        <nav
          className="flex items-center gap-0.5 flex-1 px-3 h-full overflow-x-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsla(0,0%,100%,0.2) transparent', paddingBottom: '2px' }}
        >
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              title={label}
              className={({ isActive }) =>
                [
                  'group flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.81rem] font-medium whitespace-nowrap relative',
                  'transition-all duration-250 ease-out-expo border',
                  isActive
                    ? 'text-white bg-[hsla(83,52%,36%,0.18)] border-[hsla(83,52%,36%,0.35)] shadow-green-glow/20 -translate-y-px'
                    : 'text-white/55 hover:text-white/95 hover:bg-[hsla(0,0%,100%,0.07)] hover:-translate-y-px border-transparent',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={14}
                    className={`flex-shrink-0 transition-all duration-250 ${isActive ? 'opacity-100' : 'opacity-55 group-hover:opacity-90'}`}
                    style={isActive ? { color: 'hsl(83,50%,55%)' } : undefined}
                  />
                  <span>{label}</span>
                  {isActive && (
                    <span
                      className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-t-sm"
                      style={{ background: 'hsl(83,52%,36%)' }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Clients Inactifs — admin & souscripteur */}
          {(user?.role === 'admin' || user?.role === 'souscripteur') && (
            <NavLink
              to="/inactive-clients"
              title="Clients Inactifs"
              className={({ isActive }) =>
                [
                  'group flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.81rem] font-medium whitespace-nowrap relative',
                  'transition-all duration-250 ease-out-expo border',
                  isActive
                    ? 'text-white bg-[hsla(358,66%,54%,0.16)] border-[hsla(358,66%,54%,0.32)] -translate-y-px'
                    : 'text-white/55 hover:text-white/95 hover:bg-[hsla(0,0%,100%,0.07)] hover:-translate-y-px border-transparent',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <UserX
                    size={14}
                    className={`flex-shrink-0 transition-all duration-250 ${isActive ? 'opacity-100' : 'opacity-55 group-hover:opacity-90'}`}
                    style={isActive ? { color: 'hsl(358,66%,66%)' } : undefined}
                  />
                  <span>Inactifs</span>
                  {isActive && (
                    <span
                      className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-t-sm"
                      style={{ background: 'hsl(358,66%,54%)' }}
                    />
                  )}
                </>
              )}
            </NavLink>
          )}

          {/* Administration — admin only */}
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              title="Administration"
              className={({ isActive }) =>
                [
                  'group flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.81rem] font-medium whitespace-nowrap relative',
                  'transition-all duration-250 ease-out-expo border',
                  isActive
                    ? 'text-white bg-[hsla(83,52%,36%,0.18)] border-[hsla(83,52%,36%,0.35)] -translate-y-px'
                    : 'text-white/55 hover:text-white/95 hover:bg-[hsla(0,0%,100%,0.07)] hover:-translate-y-px border-transparent',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Settings
                    size={14}
                    className={`flex-shrink-0 transition-all duration-250 ${isActive ? 'opacity-100' : 'opacity-55 group-hover:opacity-90'}`}
                    style={isActive ? { color: 'hsl(83,50%,55%)' } : undefined}
                  />
                  <span>Administration</span>
                  {isActive && (
                    <span
                      className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-t-sm"
                      style={{ background: 'hsl(83,52%,36%)' }}
                    />
                  )}
                </>
              )}
            </NavLink>
          )}
        </nav>

        {/* ───── ZONE 3: RIGHT ACTIONS ───── */}
        <div
          className="flex items-center gap-2.5 px-4 h-full flex-shrink-0"
          style={{ borderLeft: '1px solid hsla(0,0%,100%,0.07)' }}
        >
          {/* Data Status chip — glass */}
          {dataStatus && (
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
                <span className="text-white text-xs font-bold tracking-wide">
                  {dataStatus.loaded
                    ? <><span className="hidden xl:inline">{dataStatus.row_count.toLocaleString('fr-FR')} lignes</span><span className="inline xl:hidden">{formatCompact(dataStatus.row_count)}</span></>
                    : 'Non chargé'}
                </span>
              </div>
              {dataStatus.last_loaded && (
                <span className="hidden xl:block text-[0.6rem] mt-0.5 tracking-wide" style={{ color: 'hsla(0,0%,100%,0.35)' }}>
                  Màj · {new Date(dataStatus.last_loaded).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).replace(',', '')}
                </span>
              )}
            </div>
          )}

          {/* Refresh button — green accent, Antigravity */}
          {(can('export') || user?.role === 'admin') && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Actualiser les données"
              className="group flex items-center gap-2 px-4 py-2 text-[0.8rem] font-semibold text-white rounded-lg whitespace-nowrap transition-all duration-250 ease-out-expo disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, hsl(83,54%,27%) 0%, hsl(83,52%,36%) 55%, hsl(83,50%,45%) 100%)',
                boxShadow: '0 2px 12px hsla(83,52%,36%,0.38), inset 0 1px 0 hsla(0,0%,100%,0.18)',
                border: 'none',
                willChange: 'transform',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 20px hsla(83,52%,36%,0.48), inset 0 1px 0 hsla(0,0%,100%,0.22)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = '0 2px 12px hsla(83,52%,36%,0.38), inset 0 1px 0 hsla(0,0%,100%,0.18)'
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <RefreshCw
                size={13}
                className={`flex-shrink-0 transition-transform duration-500 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180'}`}
              />
              <span className="hidden sm:inline">
                {refreshing ? 'Chargement…' : 'Actualiser'}
              </span>
            </button>
          )}

          {/* User profile dropdown — Glassmorphism */}
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
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[0.7rem] font-bold text-white flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, hsl(209,28%,28%), hsl(209,24%,40%))',
                  border: '2px solid hsla(83,52%,36%,0.60)',
                  boxShadow: '0 0 0 0 hsla(83,52%,36%,0.5)',
                }}
              >
                {userInitials}
              </div>
              {/* Name + role */}
              <div className="hidden md:flex flex-col items-start">
                <span className="text-[0.77rem] font-semibold text-white leading-tight">
                  {user?.full_name || 'Administrateur'}
                </span>
                <span className="text-[0.6rem] font-medium tracking-widest uppercase" style={{ color: 'hsl(83,50%,55%)' }}>
                  {user?.role || 'admin'}
                </span>
              </div>
              <ChevronDown
                size={12}
                className="flex-shrink-0 transition-transform duration-250 group-hover:rotate-180"
                style={{ color: 'hsla(0,0%,100%,0.40)' }}
              />
            </button>

            {/* Dropdown — glass panel */}
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
              {/* User info header */}
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
                  Gestion des utilisateurs
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
          MAIN CONTENT — smooth scroll, page transition
          ───────────────────────────────────────────────────── */}
      <main
        className="flex-1 overflow-y-auto w-full relative"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-gray-300) transparent' }}
      >
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
