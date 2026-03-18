// 🎨 STYLE UPDATED — Input & Select glass-style avec label flotant optionnel


/* ───────────────────────────────────────────────
   Input
   ─────────────────────────────────────────────── */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    containerClassName?: string;
}

/**
 * Input — Glass-style input with optional label, icon, hint and error state.
 */
export function Input({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    containerClassName = '',
    className = '',
    id,
    ...props
}: InputProps) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
        <div className={`flex flex-col gap-1 ${containerClassName}`}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="text-xs font-semibold text-gray-600 tracking-wide uppercase"
                >
                    {label}
                </label>
            )}
            <div className="relative flex items-center">
                {leftIcon && (
                    <span className="absolute left-3 text-gray-400 pointer-events-none flex-shrink-0">
                        {leftIcon}
                    </span>
                )}
                <input
                    id={inputId}
                    className={[
                        'input-dark',
                        leftIcon ? 'pl-9' : '',
                        rightIcon ? 'pr-9' : '',
                        error ? 'border-danger focus:box-shadow-none !border-danger' : '',
                        className,
                    ].filter(Boolean).join(' ')}
                    style={error
                        ? { borderColor: 'var(--color-red)', boxShadow: '0 0 0 3px var(--color-red-muted)' }
                        : undefined}
                    {...props}
                />
                {rightIcon && (
                    <span className="absolute right-3 text-gray-400 pointer-events-none flex-shrink-0">
                        {rightIcon}
                    </span>
                )}
            </div>
            {error && (
                <p className="text-xs text-danger font-medium mt-0.5">{error}</p>
            )}
            {hint && !error && (
                <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
            )}
        </div>
    );
}

/* ───────────────────────────────────────────────
   Select
   ─────────────────────────────────────────────── */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    hint?: string;
    options: { value: string | number; label: string }[];
    placeholder?: string;
    containerClassName?: string;
}

/**
 * Select — Glass-style native select with optional label and error state.
 */
export function Select({
    label,
    error,
    hint,
    options,
    placeholder,
    containerClassName = '',
    className = '',
    id,
    ...props
}: SelectProps) {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
        <div className={`flex flex-col gap-1 ${containerClassName}`}>
            {label && (
                <label
                    htmlFor={selectId}
                    className="text-xs font-semibold text-gray-600 tracking-wide uppercase"
                >
                    {label}
                </label>
            )}
            <select
                id={selectId}
                className={[
                    'input-dark appearance-none pr-8 cursor-pointer',
                    error ? '!border-danger' : '',
                    className,
                ].filter(Boolean).join(' ')}
                style={error
                    ? { borderColor: 'var(--color-red)', boxShadow: '0 0 0 3px var(--color-red-muted)' }
                    : undefined}
                {...props}
            >
                {placeholder && (
                    <option value="" disabled>{placeholder}</option>
                )}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && (
                <p className="text-xs text-danger font-medium mt-0.5">{error}</p>
            )}
            {hint && !error && (
                <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
            )}
        </div>
    );
}

export default Input;
