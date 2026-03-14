// ── Auth Types ────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'souscripteur' | 'lecteur'

export interface AuthUser {
    id?: number
    username: string
    full_name: string
    email?: string
    role: UserRole
    is_active?: boolean
    must_change_password?: boolean
}

export interface AuthState {
    user: AuthUser | null
    isLoading: boolean
    isAuthenticated: boolean
}

export interface LoginRequest {
    username: string
    password: string
}

export interface LoginResponse {
    message: string
    user: {
        id: number
        username: string
        role: UserRole
        full_name: string
        must_change_password: boolean
    }
}
