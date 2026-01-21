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
        violet: 'shadow-purple-500/10 hover:shadow-purple-500/20',
        cyan: 'shadow-cyan-500/10 hover:shadow-cyan-500/20',
        amber: 'shadow-amber-500/10 hover:shadow-amber-500/20',
        none: '',
    };

    const glowBorder = {
        violet: 'border-purple-500/20',
        cyan: 'border-cyan-500/20',
        amber: 'border-amber-500/20',
        none: '',
    };

    const baseClasses = `
        bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-md border border-white/10
        ${noPadding ? '' : 'p-6'}
        ${hover ? 'hover:bg-white/10 hover:border-white/20 hover:shadow-lg transition-all duration-300 cursor-pointer' : ''}
        ${glow !== 'none' ? `shadow-xl ${glowStyles[glow]} ${glowBorder[glow]}` : ''}
        ${className}
    `;

    return (
        <div
            className={baseClasses}
            style={style}
            {...props}
        >
            {children}
        </div>
    );
}
