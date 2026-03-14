export const API_ROUTES = {
    AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        ME: '/auth/me',
        CHANGE_PASSWORD: '/auth/change-password',
        CONFIRM_RESET: '/auth/confirm-reset',
    },
    ADMIN: {
        USERS: '/admin/users',
        LOGS: '/admin/logs',
        CONFIG: '/admin/config',
    },
    KPIS: {
        SUMMARY: '/kpis/summary',
        BY_COUNTRY: '/kpis/by-country',
        BY_BRANCH: '/kpis/by-branch',
        BY_BROKER: '/kpis/by-broker',
        BY_YEAR: '/kpis/by-year',
        PIVOT: '/kpis/pivot',
    },
    CONTRACTS: '/contracts',
    SCORING: {
        COMPUTE: '/scoring/compute',
        DEFAULTS: '/scoring/defaults',
    },
    COMPARISON: {
        BASE: '/comparison',
        BY_COUNTRY: '/comparison/by-country',
    },
    DATA: {
        REFRESH: '/data/refresh',
        STATUS: '/data/status',
        FILTER_OPTIONS: '/data/filters/options',
    },
    EXPORT: {
        CSV: '/export/csv',
        EXCEL: '/export/excel',
        PIVOT: '/export/pivot',
        PDF: '/export/pdf',
    },
    CLIENTS: {
        INACTIVE: '/clients/inactive',
        INACTIVE_EXPORT: '/clients/inactive/export',
    },
} as const
