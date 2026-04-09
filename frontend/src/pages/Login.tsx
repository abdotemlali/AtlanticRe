// 🎨 STYLE UPDATED — Login : page glassmorphism premium avec fond dot-grid, carte flottante, logo animé, form stylisé
import { useState } from "react"
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Shield, Loader2, Lock, User, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/*
 * Login — Antigravity design:
 * - Full-screen navy gradient with dot-grid background
 * - Floating glassmorphism card with ambient glow orbs
 * - Premium form (glass inputs, green focus ring)
 * - Animated logo mark
 * Logic: 100% inchangée
 */
export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return toast.error('Veuillez remplir tous les champs')
    setLoading(true)
    try {
      const mustChangePwd = await login(username, password)
      if (mustChangePwd) {
        toast.success('Veuillez changer votre mot de passe temporaire.')
        navigate('/change-password')
      } else {
        toast.success('Connexion réussie')
      }
    } catch {
      toast.error('Identifiants incorrects')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, hsl(209,35%,10%) 0%, hsl(209,30%,17%) 45%, hsl(209,28%,22%) 70%, hsl(100,34%,12%) 100%)',
      }}
    >
      {/* ── Dot-grid background ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(hsla(0,0%,100%,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden="true"
      />
      {/* ── Geometric animated orbs ── */}
      <div className="login-geo-grid" aria-hidden="true" />

      {/* ── Ambient glow orbs (decorative depth) ── */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'hsla(83,52%,36%,0.08)', filter: 'blur(80px)' }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'hsla(209,28%,24%,0.20)', filter: 'blur(80px)' }}
        aria-hidden="true"
      />

      {/* ── Login Card ── */}
      <div
        className="w-full max-w-[420px] mx-4 relative z-10 animate-slide-up"
        style={{
          background: 'hsla(0,0%,100%,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 20,
          boxShadow: '0 32px 80px hsla(209,35%,8%,0.50), 0 0 0 1px hsla(0,0%,100%,0.12)',
          padding: '40px 44px',
        }}
      >
        {/* ── Logo mark ── */}
        <div className="flex flex-col items-center mb-8">
          {/* Floating logo badge */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-extrabold text-white mb-4 animate-float"
            style={{
              background: 'linear-gradient(135deg, hsl(83,54%,27%) 0%, hsl(83,52%,36%) 55%, hsl(83,50%,45%) 100%)',
              boxShadow: '0 8px 32px hsla(83,52%,36%,0.45), inset 0 1px 0 hsla(0,0%,100%,0.22)',
              willChange: 'transform',
            }}
          >
            Re
          </div>
          {/* Brand name */}
          <div className="text-center">
            <span className="text-[1.6rem] font-extrabold tracking-tight gradient-text-navy">
              Atlantic<span className="gradient-text-green">Re</span>
            </span>
            <p className="text-[0.62rem] font-bold tracking-[0.22em] uppercase mt-1" style={{ color: 'hsl(218,10%,55%)' }}>
              CDG GROUP · Decision Intelligence
            </p>
          </div>
        </div>

        {/* ── Title ── */}
        <div className="mb-6 pb-4" style={{ borderBottom: '1.5px solid hsl(218,22%,93%)' }}>
          <h1 className="text-lg font-extrabold" style={{ color: 'hsl(209,28%,20%)' }}>
            Connexion sécurisée
          </h1>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: 'hsla(83,52%,36%,0.12)' }}
            >
              <Shield size={11} style={{ color: 'hsl(83,52%,36%)' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'hsl(218,10%,55%)' }}>
              Accès chiffré · Plateforme Decision Intelligence
            </span>
          </div>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="username"
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: 'hsl(218,12%,42%)' }}
            >
              Identifiant
            </label>
            <div className="relative">
              <User
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'hsl(218,10%,65%)' }}
              />
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-dark text-sm pl-9"
                placeholder="ex: admin"
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: 'hsl(218,12%,42%)' }}
            >
              Mot de passe
            </label>
            <div className="relative">
              <Lock
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'hsl(218,10%,65%)' }}
              />
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-dark text-sm pl-9 pr-10"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-250"
                style={{ color: 'hsl(218,10%,65%)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'hsl(209,28%,24%)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'hsl(218,10%,65%)' }}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit — Antigravity btn */}
          <button
            type="submit"
            disabled={loading}
            className="w-full justify-center mt-6 py-3 flex items-center gap-2 text-sm font-bold text-white rounded-xl transition-all duration-250 ease-out-expo disabled:opacity-60 disabled:cursor-wait"
            style={{
              background: 'linear-gradient(135deg, hsl(209,32%,17%) 0%, hsl(209,28%,26%) 55%, hsl(209,24%,34%) 100%)',
              boxShadow: '0 4px 20px hsla(209,28%,24%,0.35), inset 0 1px 0 hsla(0,0%,100%,0.12)',
              border: 'none',
              willChange: 'transform',
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 28px hsla(209,28%,24%,0.45), inset 0 1px 0 hsla(0,0%,100%,0.15)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = ''
              e.currentTarget.style.boxShadow = '0 4px 20px hsla(209,28%,24%,0.35), inset 0 1px 0 hsla(0,0%,100%,0.12)'
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0)' }}
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin flex-shrink-0" /> Connexion…</>
              : 'Se connecter'
            }
          </button>
        </form>

        {/* ── Demo credentials — discreet collapsible ── */}
        <details
          className="mt-7 pt-5 group"
          style={{ borderTop: '1.5px solid hsl(218,22%,93%)' }}
        >
          <summary className="text-[0.62rem] font-bold uppercase tracking-widest cursor-pointer list-none flex items-center gap-1.5 select-none" style={{ color: 'hsl(218,10%,65%)' }}>
            <Lock size={10} className="flex-shrink-0" />
            Comptes de démonstration
            <ChevronDown size={10} className="ml-auto transition-transform group-open:rotate-180" style={{ opacity: 0.5 }} />
          </summary>
          <div className="space-y-1.5 text-xs mt-3 animate-slide-down" style={{ color: 'hsl(218,12%,42%)' }}>
            <div className="flex justify-between items-center p-2 rounded-lg" style={{ background: 'hsl(218,22%,96%)' }}>
              <span className="font-semibold">Admin</span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded text-navy" style={{ background: 'white' }}>
                admin / admin123
              </span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg" style={{ background: 'hsl(218,22%,96%)' }}>
              <span className="font-semibold">Souscripteur</span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded text-navy" style={{ background: 'white' }}>
                souscripteur / sous123
              </span>
            </div>
          </div>
        </details>
      </div>

      {/* ── Footer ── */}
      <p
        className="absolute bottom-5 w-full text-center text-[10px] font-medium tracking-widest uppercase"
        style={{ color: 'hsla(0,0%,100%,0.30)' }}
      >
        Atlantic Re — CDG Group · Decision Intelligence Platform
      </p>
    </div>
  )
}
