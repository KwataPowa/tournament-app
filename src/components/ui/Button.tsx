import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    icon?: React.ReactNode;
}

export function Button({
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    icon,
    children,
    ...props
}: ButtonProps) {
    const baseStyles = `
        relative inline-flex items-center justify-center font-semibold
        transition-all duration-300 rounded-xl
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0a1e]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        active:scale-[0.98]
    `;

    const variants = {
        primary: `
            bg-gradient-to-r from-violet-600 via-violet-600 to-fuchsia-600
            hover:from-violet-500 hover:via-violet-500 hover:to-fuchsia-500
            text-white font-semibold
            shadow-lg shadow-violet-600/30
            hover:shadow-xl hover:shadow-violet-600/40
            hover:scale-[1.02]
            focus-visible:ring-violet-500
            before:absolute before:inset-0 before:rounded-xl
            before:bg-gradient-to-r before:from-white/10 before:to-transparent
            before:opacity-0 hover:before:opacity-100
            before:transition-opacity before:duration-300
        `,
        secondary: `
            bg-white/5 hover:bg-white/10
            text-white border border-white/10 hover:border-white/20
            backdrop-blur-sm
            hover:shadow-lg hover:shadow-white/5
            focus-visible:ring-white/50
        `,
        ghost: `
            text-gray-400 hover:text-white
            hover:bg-white/5
            focus-visible:ring-white/30
        `,
        danger: `
            bg-red-500/10 text-red-400
            border border-red-500/20 hover:border-red-500/40
            hover:bg-red-500/20 hover:text-red-300
            focus-visible:ring-red-500
        `,
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm gap-1.5',
        md: 'px-5 py-2.5 text-base gap-2',
        lg: 'px-7 py-3.5 text-lg gap-2.5',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? (
                <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            ) : icon ? (
                <span className="flex-shrink-0">{icon}</span>
            ) : null}
            <span className="relative">{children}</span>
        </button>
    );
}
