// 🎨 STYLE UPDATED — Glassmorphism Card avec variantes float/glass/depth (Antigravity Design)


type CardVariant = 'glass' | 'depth' | 'navy' | 'flat';

interface CardProps {
    children: React.ReactNode;
    variant?: CardVariant;
    className?: string;
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    style?: React.CSSProperties;
    onClick?: () => void;
}

const variantClasses: Record<CardVariant, string> = {
    // Glassmorphism translucent — default
    glass: 'glass-card',
    // Solid white with depth shadow — for data-heavy content
    depth: 'depth-card',
    // Dark navy glass — for headers / KPI highlight cards
    navy: 'glass-card-navy',
    // Minimal flat card
    flat: 'bg-white border border-gray-100 rounded-lg',
};

const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
};

/**
 * Card — Reusable glass/depth card following the Antigravity design system.
 * Usage:
 *   <Card variant="glass" padding="md">...</Card>
 *   <Card variant="navy" hover>...</Card>
 *   <Card variant="depth" padding="lg">...</Card>
 */
export function Card({
    children,
    variant = 'glass',
    className = '',
    hover = true,
    padding = 'md',
    style,
    onClick,
}: CardProps) {
    return (
        <div
            onClick={onClick}
            style={style}
            className={[
                variantClasses[variant],
                paddingClasses[padding],
                hover && onClick ? 'cursor-pointer' : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {children}
        </div>
    );
}

/** Convenience sub-component for card headers */
export function CardHeader({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`flex items-center justify-between mb-4 ${className}`}>
            {children}
        </div>
    );
}

/** Convenience sub-component for card titles */
export function CardTitle({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <h3
            className={`text-sm font-semibold tracking-wide text-gray-700 uppercase ${className}`}
        >
            {children}
        </h3>
    );
}

export default Card;
