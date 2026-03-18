import { useState, useEffect } from "react"
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Shield, CheckCircle2, XCircle } from 'lucide-react'
import api from '../utils/api'

const RuleIndicator = ({ isValid, text }: { isValid: boolean, text: string }) => (
    <div className="flex items-center gap-2 mb-1.5">
        {isValid ? (
            <CheckCircle2 size={14} className="text-[hsl(83,52%,36%)]" />
        ) : (
            <XCircle size={14} className="text-[var(--color-gray-200)]" />
        )}
        <span className={`text-[0.75rem] font-medium transition-colors ${isValid ? 'text-[hsl(83,52%,36%)]' : 'text-[var(--color-gray-500)]'}`}>
            {text}
        </span>
    </div>
)
export default function ResetPassword() {
    const navigate = useNavigate()
    const location = useLocation()

    // Extract token from URL ?token=...
    const queryParams = new URLSearchParams(location.search)
    const token = queryParams.get('token')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)

    // Redirect to login if no token is found in the URL
    useEffect(() => {
        if (!token) {
            toast.error('Lien de réinitialisation invalide ou manquant.')
            navigate('/login')
        }
    }, [token, navigate])

    const rules = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
        match: password !== '' && password === confirmPassword
    }

    const isFormValid = rules.length && rules.uppercase && rules.number && rules.special && rules.match

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isFormValid) {
            return toast.error('Veuillez respecter toutes les règles de sécurité')
        }

        setLoading(true)
        try {
            // POST to /api/auth/confirm-reset (no auth needed)
            await api.post('/auth/confirm-reset', {
                token: token,
                new_password: password
            })
            toast.success('Mot de passe modifié avec succès !')
            setTimeout(() => navigate('/login'), 2000)
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Une erreur est survenue')
        } finally {
            setLoading(false)
        }
    }

    if (!token) return null



    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{
                background: 'linear-gradient(145deg, #1E2D3D 0%, var(--color-navy) 50%, #3D5166 100%)',
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.03) 2px, transparent 2px)',
                backgroundSize: '30px 30px'
            }}
        >
            <div
                className="w-full max-w-[420px] px-12 py-10 animate-fade-in relative z-10"
                style={{
                    background: 'rgba(255,255,255,0.97)',
                    borderRadius: 16,
                    boxShadow: '0 20px 60px rgba(15,25,40,0.4)',
                }}
            >
                {/* Logo */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="flex items-center justify-center font-extrabold text-4xl mb-2 text-[var(--color-navy)] border-2 border-[var(--color-navy)] rounded-xl px-4 py-2 bg-white">
                        Atlantic<span className="text-[hsl(83,52%,36%)]">Re</span>
                    </div>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--color-gray-500)] mb-1">CDG GROUP</p>
                </div>

                {/* Title */}
                <div className="mb-6 border-b border-[var(--color-gray-100)] pb-4 text-center">
                    <h1 className="text-xl font-bold" style={{ color: 'var(--color-navy)' }}>Nouveau mot de passe</h1>
                    <div className="flex justify-center items-center gap-2 mt-2">
                        <Shield size={14} color="hsl(83,52%,36%)" />
                        <span className="text-xs font-medium" style={{ color: 'var(--color-gray-500)' }}>Réinitialisation sécurisée</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Nouveau Mot de Passe */}
                    <div>
                        <label className="block text-[0.8rem] font-medium mb-1.5 uppercase letter-spacing-[0.05em]" style={{ color: 'var(--color-gray-600)' }}>
                            Nouveau mot de passe
                        </label>
                        <div className="relative">
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full text-sm py-2.5 px-3 pr-10 transition-colors outline-none text-[var(--color-navy)] placeholder-[var(--color-gray-200)]"
                                style={{
                                    border: '1.5px solid var(--color-gray-200)',
                                    borderRadius: 8,
                                    backgroundColor: '#FFFFFF',
                                }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(83,52%,36%)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(107,140,42,0.15)' }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-gray-200)'; e.currentTarget.style.boxShadow = 'none' }}
                                placeholder="••••••••"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-[var(--color-navy)]"
                                style={{ color: 'var(--color-gray-500)' }}
                            >
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirmer Mot de Passe */}
                    <div>
                        <label className="block text-[0.8rem] font-medium mb-1.5 uppercase letter-spacing-[0.05em]" style={{ color: 'var(--color-gray-600)' }}>
                            Confirmer le mot de passe
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full text-sm py-2.5 px-3 pr-10 transition-colors outline-none text-[var(--color-navy)] placeholder-[var(--color-gray-200)]"
                                style={{
                                    border: '1.5px solid var(--color-gray-200)',
                                    borderRadius: 8,
                                    backgroundColor: '#FFFFFF',
                                }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(83,52%,36%)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(107,140,42,0.15)' }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-gray-200)'; e.currentTarget.style.boxShadow = 'none' }}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-[var(--color-navy)]"
                                style={{ color: 'var(--color-gray-500)' }}
                            >
                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Règles de sécurité in-place */}
                    <div className="bg-[var(--color-off-white)] rounded-lg p-3 border border-[var(--color-gray-100)]">
                        <p className="text-[0.7rem] uppercase tracking-wider font-bold mb-2 text-[var(--color-gray-600)]">Règles de sécurité :</p>
                        <div className="grid grid-cols-2 gap-x-2">
                            <RuleIndicator isValid={rules.length} text="Minimum 8 caractères" />
                            <RuleIndicator isValid={rules.uppercase} text="Au moins 1 majuscule" />
                            <RuleIndicator isValid={rules.number} text="Au moins 1 chiffre" />
                            <RuleIndicator isValid={rules.special} text="1 caractère spécial" />
                        </div>
                        <div className="mt-1 pt-2 border-t border-[var(--color-gray-100)]">
                            <RuleIndicator isValid={rules.match} text="Les mots de passe correspondent" />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full justify-center py-3 flex items-center gap-2 font-bold text-white transition-all transform hover:-translate-y-[1px]"
                        style={{
                            background: isFormValid
                                ? 'linear-gradient(135deg, hsl(83,54%,27%), hsl(83,52%,36%))'
                                : 'linear-gradient(135deg, var(--color-gray-500), #94A3B8)',
                            borderRadius: 8,
                            boxShadow: isFormValid ? '0 4px 12px rgba(107,140,42,0.3)' : 'none',
                            marginTop: 28,
                            cursor: isFormValid ? 'pointer' : 'not-allowed'
                        }}
                        disabled={!isFormValid || loading}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Enregistrement...
                            </span>
                        ) : 'Enregistrer le mot de passe'}
                    </button>
                </form>
            </div>

            <p className="absolute bottom-6 text-center text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)', width: '100%' }}>
                Atlantic Re — CDG Group
            </p>
        </div>
    )
}
