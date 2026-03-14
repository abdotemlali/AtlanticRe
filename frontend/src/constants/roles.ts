import { UserRole } from '../types/auth.types'

export const ROLES = {
    ADMIN: 'admin' as UserRole,
    SOUSCRIPTEUR: 'souscripteur' as UserRole,
    LECTEUR: 'lecteur' as UserRole,
} as const

export const PERMISSIONS = {
    EXPORT: [ROLES.ADMIN, ROLES.SOUSCRIPTEUR],
    MODIFY_SCORING: [ROLES.ADMIN, ROLES.SOUSCRIPTEUR],
    ADMIN_PANEL: [ROLES.ADMIN],
    VIEW_DATA: [ROLES.ADMIN, ROLES.SOUSCRIPTEUR, ROLES.LECTEUR],
} as const

export const ROLE_LABELS: Record<UserRole, string> = {
    admin: 'Administrateur',
    souscripteur: 'Souscripteur',
    lecteur: 'Lecteur',
}

export const ROLE_COLORS: Record<UserRole, string> = {
    admin: '#1E2D3D',
    souscripteur: '#4E6820',
    lecteur: '#7A8A99',
}
