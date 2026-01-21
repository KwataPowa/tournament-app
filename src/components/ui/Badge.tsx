import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'draft' | 'active' | 'completed' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md' | 'lg';
}

export function Badge({
    className = '',
    variant = 'info',
    size = 'md',
    children,
    ...props
}: BadgeProps) {
    const variants = {
        draft: 'badge-draft',
        active: 'badge-active',
        completed: 'badge-completed',
        success: 'bg-success-500/10 text-success-400 border-success-500/20',
        warning: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
        danger: 'bg-danger-500/10 text-danger-400 border-danger-500/20',
        info: 'bg-info-500/10 text-info-400 border-info-500/20',
    };

    const sizes = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base',
    };

    return (
        <div
            className={`
                badge ${variants[variant]} ${sizes[size]}
                ${className}
            `}
            {...props}
        >
            {children}
        </div>
    );
}