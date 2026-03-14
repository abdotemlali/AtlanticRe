// 🎨 STYLE UPDATED — Badge générique couvrant tous CONTRACT_STATUS + variantes sémantiques
import React from 'react';

// ─────────────────── Types ───────────────────
type BadgeVariant =
    | 'success'    // CONFIRMED, ACCEPTED
    | 'warning'    // IDENTF, OFFER LOGGED
    | 'danger'     // CANCELLED
    | 'neutral'    // CLOSED
    | 'info'       // COMMUTED
    | 'orange'     // custom
    | 'navy'       // highlight
    | 'green';     // explicit green

type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    size?: BadgeSize;
    pill?: boolean;
    dot?: boolean;
    className?: string;
}

// ─────────────────── Style maps ──────────────
const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
    success: {
        bg: 'bg-emerald-50 border border-emerald-200',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
    },
    warning: {
        bg: 'bg-amber-50 border border-amber-200',
        text: 'text-amber-700',
        dot: 'bg-amber-400',
    },
    danger: {
        bg: 'bg-red-50 border border-red-200',
        text: 'text-red-700',
        dot: 'bg-red-500',
    },
    neutral: {
        bg: 'bg-gray-100 border border-gray-200',
        text: 'text-gray-600',
        dot: 'bg-gray-400',
    },
    info: {
        bg: 'bg-sky-50 border border-sky-200',
        text: 'text-sky-700',
        dot: 'bg-sky-400',
    },
    orange: {
        bg: 'bg-orange-50 border border-orange-200',
        text: 'text-orange-700',
        dot: 'bg-orange-400',
    },
    navy: {
        bg: 'bg-navy-muted border border-navy-200',
        text: 'text-navy',
        dot: 'bg-navy',
    },
    green: {
        bg: 'bg-green-muted border border-green-200',
        text: 'text-green-dark',
        dot: 'bg-green',
    },
};

const sizeStyles: Record<BadgeSize, { padding: string; text: string; dotSize: string }> = {
    xs: { padding: 'px-1.5 py-0.5', text: 'text-2xs', dotSize: 'w-1.5 h-1.5' },
    sm: { padding: 'px-2   py-0.5', text: 'text-xs', dotSize: 'w-1.5 h-1.5' },
    md: { padding: 'px-2.5 py-1', text: 'text-xs', dotSize: 'w-2   h-2' },
};

/**
 * Maps a CONTRACT_STATUS string to the correct Badge variant.
 */
export function getStatusVariant(status: string): BadgeVariant {
    switch (status?.toUpperCase()) {
        case 'CONFIRMED': return 'success';
        case 'ACCEPTED': return 'success';
        case 'IDENTF': return 'warning';
        case 'OFFER LOGGED': return 'warning';
        case 'COMMUTED': return 'info';
        case 'CLOSED': return 'neutral';
        case 'CANCELLED': return 'danger';
        default: return 'neutral';
    }
}

/**
 * Badge — Generic pill/chip component for status, labels, counts.
 * Usage:
 *   <Badge variant="success" dot>CONFIRMED</Badge>
 *   <Badge variant={getStatusVariant(row.CONTRACT_STATUS)}>{row.CONTRACT_STATUS}</Badge>
 *   <Badge variant="navy" size="xs">Admin</Badge>
 */
export function Badge({
    children,
    variant = 'neutral',
    size = 'sm',
    pill = true,
    dot = false,
    className = '',
}: BadgeProps) {
    const vs = variantStyles[variant];
    const ss = sizeStyles[size];
    return (
        <span
            className={[
                'inline-flex items-center gap-1 font-semibold leading-none select-none',
                vs.bg,
                vs.text,
                ss.padding,
                ss.text,
                pill ? 'rounded-full' : 'rounded',
                className,
            ].filter(Boolean).join(' ')}
        >
            {dot && (
                <span
                    className={`${ss.dotSize} ${vs.dot} rounded-full flex-shrink-0 animate-pulse`}
                    aria-hidden="true"
                />
            )}
            {children}
        </span>
    );
}

/**
 * StatusBadge — Convenience wrapper that maps CONTRACT_STATUS → Badge.
 */
export function StatusBadge({
    status,
    size = 'sm',
    dot = false,
}: {
    status: string;
    size?: BadgeSize;
    dot?: boolean;
}) {
    return (
        <Badge variant={getStatusVariant(status)} size={size} dot={dot}>
            {status}
        </Badge>
    );
}

export default Badge;
