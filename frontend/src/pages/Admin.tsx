import { useState, useEffect } from "react"
import api from '../utils/api'

import { Users, Settings, FileText, Plus, Edit2, Check, X, Trash2, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { API_ROUTES } from '../constants/api'

import { AdminUser as User, LogEntry, UserUpdate, UserCreate } from '../types/admin.types'

interface EditForm extends Omit<UserUpdate, 'password'> {
  password?: string
  full_name: string
  email: string
  role: User['role']
  active: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  admin: { bg: '#1E2D3D', color: '#FFFFFF' },
  souscripteur: { bg: 'hsl(83,54%,27%)', color: '#FFFFFF' },
  lecteur: { bg: '#516070', color: '#FFFFFF' },
}

function TabBtn({ active, onClick, children }: any) {
  return (
    <button onClick={onClick} className={`tab-btn ${active ? 'active' : ''} flex items-center gap-2`}>
      {children}
    </button>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({
  user,
  isSelf,
  onSave,
  onClose,
}: {
  user: User
  isSelf: boolean
  onSave: (id: number, data: Partial<EditForm>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<EditForm>({
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    active: user.active,
    password: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (field: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = field === 'active' ? (e.target as HTMLInputElement).checked : e.target.value
    setForm(f => ({ ...f, [field]: val }))
  }

  const handleResetPassword = async () => {
    const confirm = window.confirm(
      `🔑 Réinitialisation mot de passe\n\n` +
      `Un email sera envoyé à :\n${user.email || 'cet utilisateur'}\n\n` +
      `L'utilisateur recevra un lien valable 24h pour définir son nouveau mot de passe.\n\n` +
      `Voulez-vous continuer ?`
    )
    if (!confirm) return

    try {
      await api.post(`${API_ROUTES.ADMIN.USERS}/${user.id}/reset-password`)
      toast.success(`Email envoyé à ${user.email || user.username}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Erreur lors de l\'envoi de l\'email')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const payload: Partial<EditForm> = {
      full_name: form.full_name,
      email: form.email,
      role: form.role,
      active: form.active,
    }
    if (form.password) payload.password = form.password
    await onSave(user.id, payload)
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="glass-card p-6 w-full max-w-md space-y-4 animate-fade-in"
        style={{ border: '1px solid #2a2a5a' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Edit2 size={15} color="#4361ee" />
            Modifier — <span className="font-mono text-sm" style={{ color: '#4cc9f0' }}>{user.username}</span>
          </h3>
          <button onClick={onClose} className="btn-secondary text-xs py-1 px-2"><X size={12} /></button>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#94a3b8' }}>Nom complet</label>
            <input
              type="text"
              value={form.full_name}
              onChange={set('full_name')}
              className="input-dark text-xs py-2 w-full"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#94a3b8' }}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              className="input-dark text-xs py-2 w-full"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#94a3b8' }}>Rôle</label>
            <select
              value={form.role}
              onChange={set('role')}
              disabled={isSelf}
              className="input-dark text-xs py-2 w-full"
              title={isSelf ? 'Vous ne pouvez pas modifier votre propre rôle' : ''}
            >
              <option value="lecteur">Lecteur</option>
              <option value="souscripteur">Souscripteur</option>
              <option value="admin">Admin</option>
            </select>
            {isSelf && (
              <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
                ⚠ Vous ne pouvez pas modifier votre propre rôle
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>Compte actif</label>
            <input
              type="checkbox"
              checked={form.active}
              onChange={set('active')}
              disabled={isSelf}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-xs" style={{ color: form.active ? 'hsl(83,52%,36%)' : '#94a3b8' }}>
              {form.active ? 'Actif' : 'Inactif'}
            </span>
          </div>

          <div className="pt-2 border-t border-[#2a2a5a] mt-2">
            <button
              onClick={handleResetPassword}
              disabled={isSelf}
              className="btn-secondary text-xs py-1.5 w-full flex items-center justify-center gap-2"
              title={isSelf ? 'Utilisez votre page profil' : ''}
              style={{
                borderColor: '#4361ee40',
                color: isSelf ? '#64748b' : '#4cc9f0',
                opacity: isSelf ? 0.5 : 1
              }}
            >
              🔑 Envoyer le lien de réinitialisation de mot de passe
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-xs flex-1"
          >
            <Check size={12} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button onClick={onClose} className="btn-secondary text-xs px-4">
            <X size={12} /> Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Admin() {
  const [tab, setTab] = useState<'users' | 'config' | 'logs'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [config, setConfig] = useState<{ excel_file_path: string }>({ excel_file_path: '' })
  const [editUser, setEditUser] = useState<User | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', full_name: '', email: '', role: 'lecteur' as User['role'] })
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const loadUsers = () => api.get(API_ROUTES.ADMIN.USERS).then(r => setUsers(r.data)).catch(console.error)
  const loadLogs = () => api.get(API_ROUTES.ADMIN.LOGS).then(r => setLogs(r.data)).catch(console.error)
  const loadConfig = () => api.get(API_ROUTES.ADMIN.CONFIG).then(r => setConfig(r.data)).catch(console.error)

  useEffect(() => {
    loadUsers()
    loadLogs()
    loadConfig()
    // Retrieve current user id from /auth/me so we can disable self-actions
    api.get(API_ROUTES.AUTH.ME).then(r => setCurrentUserId(Number(r.data.id))).catch(console.error)
  }, [])

  // ── Update user ───────────────────────────────────────────────────────────
  const saveUser = async (id: number, data: Partial<EditForm>) => {
    try {
      await api.put(`${API_ROUTES.ADMIN.USERS}/${id}`, data)
      toast.success('Utilisateur mis à jour')
      setEditUser(null)
      loadUsers()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Erreur lors de la mise à jour')
    }
  }

  // ── Delete user ───────────────────────────────────────────────────────────
  const deleteUser = async (u: User) => {
    if (!window.confirm(`Supprimer "${u.full_name}" ?\n\nCette action est irréversible.`)) return
    try {
      await api.delete(`${API_ROUTES.ADMIN.USERS}/${u.id}`)
      toast.success(`Utilisateur "${u.full_name}" supprimé`)
      setUsers(prev => prev.filter(x => x.id !== u.id))
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Erreur lors de la suppression')
    }
  }

  const createUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.full_name) return toast.error('Remplissez tous les champs obligatoires')
    try {
      const res = await api.post(API_ROUTES.ADMIN.USERS, { ...newUser, active: true })
      const created = res.data

      if (created.email_warning) {
        // L'utilisateur est créé mais l'email n'a pas pu être envoyé
        toast.error(
          `⚠️ Utilisateur créé, mais email non envoyé :\n${created.email_warning}`,
          { duration: 8000 }
        )
      } else {
        toast.success(`✅ Utilisateur créé — Email de bienvenue envoyé à ${created.email}`)
      }

      setShowCreate(false)
      setNewUser({ username: '', full_name: '', email: '', role: 'lecteur' as User['role'] })
      loadUsers()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Erreur lors de la création')
    }
  }

  const updateConfig = async () => {
    try {
      await api.put(API_ROUTES.ADMIN.CONFIG, config)
      toast.success('Configuration sauvegardée')
    } catch { toast.error('Erreur') }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 space-y-5" style={{ minHeight: '100vh' }}>
      {/* Edit modal */}
      {editUser && (
        <EditModal
          user={editUser}
          isSelf={Number(editUser.id) === currentUserId}
          onSave={saveUser}
          onClose={() => setEditUser(null)}
        />
      )}

      <div>
        <h1 className="text-xl font-bold text-[var(--color-navy)] mb-1">Administration</h1>
        <p className="text-sm" style={{ color: '#94a3b8' }}>Gestion des utilisateurs, configuration et logs — Admin uniquement</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2" style={{ borderColor: '#1a1a3a' }}>
        <TabBtn active={tab === 'users'} onClick={() => setTab('users')}><Users size={14} />Utilisateurs</TabBtn>
        <TabBtn active={tab === 'config'} onClick={() => setTab('config')}><Settings size={14} />Configuration</TabBtn>
        <TabBtn active={tab === 'logs'} onClick={() => setTab('logs')}><FileText size={14} />Logs</TabBtn>
      </div>

      {/* ── Users tab ────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-xs">
              <Plus size={13} /> Nouvel utilisateur
            </button>
          </div>

          {/* Create form */}
          {showCreate && (
            <div className="glass-card p-4 animate-fade-in">
              <h3 className="text-sm font-semibold text-white mb-3">Créer un utilisateur</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: '#94a3b8' }}>Nom d'utilisateur *</p>
                  <input type="text" value={newUser.username} onChange={e => setNewUser(n => ({ ...n, username: e.target.value }))} className="input-dark text-xs py-1.5 w-full" />
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#94a3b8' }}>Nom complet *</p>
                  <input type="text" value={newUser.full_name} onChange={e => setNewUser(n => ({ ...n, full_name: e.target.value }))} className="input-dark text-xs py-1.5 w-full" />
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#94a3b8' }}>Email *</p>
                  <input type="email" value={newUser.email} onChange={e => setNewUser(n => ({ ...n, email: e.target.value }))} className="input-dark text-xs py-1.5 w-full" />
                </div>
                {/* Password field removed: generated automatically */}
                <div>
                  <p className="text-xs mb-1" style={{ color: '#94a3b8' }}>Rôle</p>
                  <select value={newUser.role} onChange={e => setNewUser(n => ({ ...n, role: e.target.value as User['role'] }))} className="input-dark text-xs py-1.5 w-full">
                    <option value="lecteur">Lecteur</option>
                    <option value="souscripteur">Souscripteur</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#1e2d3d] border-l-[3px] border-[#4cc9f0] p-3 rounded-r flex gap-3 text-xs mb-4">
                <Shield className="shrink-0" size={16} color="#4cc9f0" />
                <div>
                  <p className="font-semibold mb-1 text-white">Création sécurisée</p>
                  <p style={{ color: '#94a3b8', lineHeight: 1.4 }}>
                    Un <strong>mot de passe temporaire</strong> sera généré automatiquement et envoyé
                    à cette adresse email. L'utilisateur devra le changer à la première connexion.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={createUser} className="btn-primary text-xs"><Check size={12} />Créer</button>
                <button onClick={() => setShowCreate(false)} className="btn-secondary text-xs"><X size={12} />Annuler</button>
              </div>
            </div>
          )}

          {/* Users table */}
          <div className="glass-card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Nom complet</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSelf = Number(u.id) === currentUserId
                  const rc = ROLE_COLORS[u.role] ?? { bg: '#2a2a4a', color: '#94a3b8' }
                  return (
                    <tr key={u.id}>
                      <td className="font-mono text-xs" style={{ color: '#4cc9f0' }}>{u.username}</td>
                      <td className="text-white font-medium">{u.full_name}</td>
                      <td style={{ color: '#94a3b8' }}>{u.email}</td>
                      <td>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: rc.bg, color: rc.color }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.active ? 'badge-attractif' : 'badge-eviter'}`}>
                          {u.active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2 items-center">
                          {/* Edit button */}
                          <button
                            onClick={() => setEditUser(u)}
                            className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
                            title="Modifier"
                            style={{
                              background: 'linear-gradient(135deg, var(--color-navy), #3D5166)',
                              color: 'white',
                              borderRadius: '6px',
                            }}
                          >
                            <Edit2 size={11} /> Modifier
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => !isSelf && deleteUser(u)}
                            disabled={isSelf}
                            title={isSelf ? 'Impossible de supprimer votre propre compte' : `Supprimer ${u.full_name}`}
                            style={{
                              background: isSelf
                                ? '#3a3a5a'
                                : 'linear-gradient(135deg, hsl(358,66%,40%), var(--color-red))',
                              color: isSelf ? '#64748b' : 'white',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              fontSize: '0.75rem',
                              border: 'none',
                              cursor: isSelf ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              opacity: isSelf ? 0.5 : 1,
                              transition: 'opacity 0.2s',
                            }}
                          >
                            <Trash2 size={11} /> Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Config tab ───────────────────────────────────────────────────── */}
      {tab === 'config' && (
        <div className="glass-card p-5 max-w-xl space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Settings size={14} color="#4361ee" />Configuration du fichier Excel</h3>
          <div>
            <p className="text-xs mb-2" style={{ color: '#94a3b8' }}>Chemin du fichier Excel (réseau ou local)</p>
            <input
              type="text" value={config.excel_file_path}
              onChange={e => setConfig(c => ({ ...c, excel_file_path: e.target.value }))}
              className="input-dark text-xs py-2"
              placeholder="\\serveur\dossier\Template_data.xlsx"
            />
            <p className="text-xs mt-1" style={{ color: '#64748b' }}>
              Exemple réseau : <span className="font-mono">\\\\serveur\\dossier\\Template_data.xlsx</span>
            </p>
          </div>
          <button onClick={updateConfig} className="btn-primary text-xs"><Check size={12} />Sauvegarder</button>
        </div>
      )}

      {/* ── Logs tab ──────────────────────────────────────────────────────── */}
      {tab === 'logs' && (
        <div className="glass-card overflow-hidden">
          <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: '#1a1a3a' }}>
            <h3 className="text-sm font-semibold text-white">Journal des activités</h3>
            <button onClick={loadLogs} className="btn-secondary text-xs py-1">Rafraîchir</button>
          </div>
          <div className="overflow-auto" style={{ maxHeight: 500 }}>
            <table className="data-table">
              <thead>
                <tr><th>Date/Heure</th><th>Utilisateur</th><th>Action</th><th>Détail</th></tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10" style={{ color: '#64748b' }}>Aucun log disponible</td></tr>
                ) : logs.map((l, i) => {
                  const actionColor =
                    l.action === 'LOGIN' ? { bg: 'rgba(45,198,83,0.1)', color: '#2dc653' } :
                      l.action === 'LOGOUT' ? { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8' } :
                        l.action === 'DELETE_USER' ? { bg: 'rgba(214,64,69,0.15)', color: 'var(--color-red)' } :
                          { bg: 'rgba(67,97,238,0.1)', color: '#4361ee' }
                  return (
                    <tr key={i}>
                      <td className="font-mono text-xs" style={{ color: '#64748b' }}>
                        {new Date(l.timestamp).toLocaleString('fr-FR')}
                      </td>
                      <td className="font-medium" style={{ color: '#4cc9f0' }}>{l.username}</td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded font-medium" style={actionColor}>
                          {l.action}
                        </span>
                      </td>
                      <td style={{ color: '#64748b' }}>{l.detail || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
