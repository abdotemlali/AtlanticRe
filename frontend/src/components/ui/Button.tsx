// 🎨 STYLE UPDATED — Button Premium avec variantes primary/secondary/accent/danger/ghost + sizes

import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    danger: 'btn-danger',
    ghost: [
        'bg-transparent text-gray-600 border border-transparent',
        'hover:bg-gray-100 hover:text-navy transition-all duration-250',
        'rounded-md font-semibold font-sans cursor-pointer',
        'inline-flex items-center gap-1.5',
    ].join(' '),
};

const sizeClass: Record<ButtonSize, string> = {
    xs: 'text-xs  px-2.5 py-1.5 gap-1',
    sm: 'text-sm  px-3   py-2   gap-1.5',
    md: 'text-sm  px-5   py-2.5 gap-1.5',
    lg: 'text-base px-6  py-3   gap-2',
};

/**
 * Button — Premium button following the Antigravity design system.
 * Usage:
 *   <Button variant="primary">Save</Button>
 *   <Button variant="accent" loading={isLoading} leftIcon={<Download size={14}/>}>Export</Button>
 *   <Button variant="danger" size="sm">Delete</Button>
 */
export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children,
    disabled,
    className = '',
    ...props
}: ButtonProps) {
    const isDisabled = disabled || loading;
    return (
        <button
            disabled={isDisabled}
            className={[
                variantClass[variant],
                sizeClass[size],
                fullWidth ? 'w-full justify-center' : '',
                loading ? 'opacity-70 cursor-wait' : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
            {...props}
        >
            {loading ? (
                <Loader2 size={13} className="animate-spin flex-shrink-0" />
            ) : (
                leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
            )}
            {children}
            {rightIcon && !loading && (
                <span className="flex-shrink-0">{rightIcon}</span>
            )}
        </button>
    );
}

export default Button;
