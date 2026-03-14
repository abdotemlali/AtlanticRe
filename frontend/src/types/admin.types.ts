import { UserRole } from './auth.types'

// ── Admin Types ───────────────────────────────────────────────────────────────
export interface AdminUser {
    id: number
    username: string
    full_name: string
    email: string
    role: UserRole
    active: boolean
    must_change_password: boolean
}

export interface UserCreate {
    username: string
    full_name: string
    email: string
    role: UserRole
    active?: boolean
    password?: string
}

export interface UserUpdate {
    full_name?: string
    email?: string
    role?: UserRole
    active?: boolean
    password?: string
}

export interface LogEntry {
    timestamp: string
    username: string
    action: string
    detail?: string
}

// ── Inactive Clients Types ────────────────────────────────────────────────────
export interface InactiveClient {
    cedant_code: string
    int_cedante: string
    total_contracts: number
    last_year_active: number
    years_absent: number
    pays_cedante: string
    statuts_breakdown: Record<string, number>
}

export interface InactiveClientsResponse {
    total: number
    page: number
    page_size: number
    years_threshold: number
    min_contracts: number
    reference_year: number
    clients: InactiveClient[]
}

export interface InactiveClientsParams {
    years_threshold: number
    min_contracts: number
    page: number
    page_size: number
    sort_by: string
    sort_order: 'asc' | 'desc'
}
