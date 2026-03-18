// 🎨 STYLE UPDATED — Skeleton shimmer loaders pour KPI, tableau, graphiques


/* ─────────────────────────────────────
   Base Skeleton primitive
   ───────────────────────────────────── */
interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    rounded?: 'sm' | 'md' | 'lg' | 'full';
    style?: React.CSSProperties;
}

const roundedMap = {
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
};

export function Skeleton({
    className = '',
    width,
    height,
    rounded = 'md',
    style,
}: SkeletonProps) {
    return (
        <div
            className={`skeleton ${roundedMap[rounded]} ${className}`}
            style={{ width, height, ...style }}
            aria-hidden="true"
        />
    );
}

/* ─────────────────────────────────────
   KPI Card Skeleton
   ───────────────────────────────────── */
export function KPICardSkeleton() {
    return (
        <div className="glass-card p-5 animate-fade-in">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <Skeleton className="w-24 h-3 mb-2" />
                    <Skeleton className="w-32 h-7" />
                </div>
                <Skeleton className="w-10 h-10" rounded="lg" />
            </div>
            <Skeleton className="w-20 h-3" />
        </div>
    );
}

/* ─────────────────────────────────────
   Table Skeleton
   ───────────────────────────────────── */
interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export function TableSkeleton({ rows = 8, columns = 6 }: TableSkeletonProps) {
    return (
        <div className="w-full animate-fade-in" aria-hidden="true">
            {/* Header */}
            <div className="flex gap-3 px-4 py-3 bg-navy rounded-t-lg">
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={i} className="flex-1">
                        <Skeleton className="h-3 opacity-40 w-3/4" />
                    </div>
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div
                    key={rowIdx}
                    className={`flex gap-3 px-4 py-3 border-b border-gray-100 ${rowIdx % 2 === 1 ? 'bg-gray-50' : 'bg-white'
                        }`}
                    style={{ animationDelay: `${rowIdx * 40}ms` }}
                >
                    {Array.from({ length: columns }).map((_, colIdx) => (
                        <div key={colIdx} className="flex-1">
                            <Skeleton
                                className={`h-3.5 ${colIdx === 0 ? 'w-full' : colIdx === columns - 1 ? 'w-16' : 'w-4/5'
                                    }`}
                            />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

/* ─────────────────────────────────────
   Chart Skeleton
   ───────────────────────────────────── */
export function ChartSkeleton({ height = 280 }: { height?: number }) {
    return (
        <div className="w-full animate-fade-in" aria-hidden="true">
            <div className="flex items-end gap-2 justify-between px-4" style={{ height }}>
                {Array.from({ length: 10 }).map((_, i) => {
                    const barH = 30 + Math.round(Math.random() * 65);
                    return (
                        <div
                            key={i}
                            className="flex-1 skeleton rounded-t"
                            style={{
                                height: `${barH}%`,
                                animationDelay: `${i * 80}ms`,
                                opacity: 0.7,
                            }}
                        />
                    );
                })}
            </div>
            <div className="flex justify-between px-4 mt-2">
                {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="w-7 h-2" />
                ))}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────
   Text / Paragraph Skeleton
   ───────────────────────────────────── */
export function TextSkeleton({ lines = 3 }: { lines?: number }) {
    const widths = ['w-full', 'w-11/12', 'w-3/4', 'w-5/6', 'w-2/3'];
    return (
        <div className="flex flex-col gap-2 animate-fade-in" aria-hidden="true">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={`h-3 ${widths[i % widths.length]}`}
                    style={{ animationDelay: `${i * 60}ms` }}
                />
            ))}
        </div>
    );
}

export default Skeleton;
