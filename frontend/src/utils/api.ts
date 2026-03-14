import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // envoie le cookie JWT httpOnly automatiquement
})

// ── Intercepteur de réponses ────────────────────────────────────────────────
// Gère les cas globaux d'erreur 401 / 403 PASSWORD_CHANGE_REQUIRED
// IMPORTANT : on retourne une Promise qui ne se résout jamais (new Promise(() => {}))
// pour éviter que le code appelant n'affiche un toast d'erreur parasite
// lors d'une redirection en cours.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const detail = err.response?.data?.detail

    // 401 — Session expirée ou non authentifié → retour login
    if (status === 401) {
      localStorage.removeItem('auth_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
        // Bloquer la propagation de l'erreur pour éviter les toasts parasites
        return new Promise(() => { })
      }
    }

    // 403 PASSWORD_CHANGE_REQUIRED → redirection silencieuse vers /change-password
    if (
      status === 403 &&
      (detail?.code === 'PASSWORD_CHANGE_REQUIRED' ||
        (typeof detail === 'object' && detail?.code === 'PASSWORD_CHANGE_REQUIRED'))
    ) {
      if (window.location.pathname !== '/change-password') {
        window.location.href = '/change-password'
        // Bloquer la propagation pour éviter le double toast
        return new Promise(() => { })
      }
    }

    return Promise.reject(err)
  }
)

export default api
