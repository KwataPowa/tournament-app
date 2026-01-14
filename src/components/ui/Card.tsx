import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
    glow?: 'violet' | 'cyan' | 'amber' | 'none';
    noPadding?: boolean;
}

export function Card({
    className = '',
    hover = false,
    glow = 'none',
    noPadding = false,
    children,
    style,
    ...props
}: CardProps) {
    const glowStyles = {
        violet: 'shadow-violet-500/10 hover:shadow-violet-500/20',
        cyan: 'shadow-cyan-500/10 hover:shadow-cyan-500/20',
        amber: 'shadow-amber-500/10 hover:shadow-amber-500/20',
        none: '',
    };

    const glowBorder = {
        violet: 'border-violet-500/20',
        cyan: 'border-cyan-500/20',
        amber: 'border-amber-500/20',
        none: '',
    };

    return (
        <div
            className={`
                glass-panel rounded-2xl
                ${noPadding ? '' : 'p-6'}
                ${hover ? 'glass-panel-hover cursor-pointer' : ''}
                ${glow !== 'none' ? `shadow-xl ${glowStyles[glow]} ${glowBorder[glow]}` : ''}
                ${className}
            `}
            style={style}
            {...props}
        >
            {children}
        </div>
    );
}
