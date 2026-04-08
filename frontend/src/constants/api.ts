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
        PROFIT_COMMISSION_BY_BRANCH: '/kpis/profit-commission-by-branch',
        BY_BROKER: '/kpis/by-broker',
        TOP_BROKERS: '/kpis/top-brokers',
        BY_YEAR: '/kpis/by-year',
        PIVOT: '/kpis/pivot',
        BY_CONTRACT_TYPE: '/kpis/by-contract-type',
        BY_CEDANTE: '/kpis/by-cedante',
        BY_SPECIALITE: '/kpis/by-specialite',
        ALERTS: '/kpis/alerts',
        FINANCIAL_BREAKDOWN: '/kpis/financial-breakdown',
    },
    CEDANTE: {
        PROFILE: '/kpis/cedante/profile',
        BY_YEAR: '/kpis/cedante/by-year',
        BY_BRANCH: '/kpis/cedante/by-branch',
        FAC_SATURATION: '/kpis/cedante/fac-saturation',  // B3
        FAC_SATURATION_GLOBAL: '/kpis/cedante/fac-saturation-global',
    },
    MARKET: {
        PROFILE: '/kpis/market/profile',
        BY_YEAR: '/kpis/market/by-year',
    },
    COUNTRY: {
        PROFILE: '/kpis/country/profile',
        BY_YEAR: '/kpis/country/by-year',
        BY_BRANCH: '/kpis/country/by-branch',
        BY_CONTRACT_TYPE: '/kpis/by-country-contract-type', // A5
    },
    EXPOSITION: {
        BY_COUNTRY: '/kpis/exposition/by-country',
        BY_BRANCH: '/kpis/exposition/by-branch',
        TOP_RISKS: '/kpis/exposition/top-risks',
    },
    CONTRACTS: '/contracts',
    SCORING: {
        COMPUTE: '/scoring/compute',
        DEFAULTS: '/scoring/defaults',
    },
    COMPARISON: {
        BASE: '/comparison',
        BY_COUNTRY: '/comparison/by-country',
        MARKETS: '/comparison/markets',
        CEDANTES: '/comparison/cedantes',
        BY_CEDANTE: '/comparison/by-cedante',
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
        RENEWALS: '/clients/renewals',
    },
} as const
