import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export function Input({
    className = '',
    label,
    error,
    icon,
    ...props
}: InputProps) {
    return (
        <div className="w-full">
{label && (
                <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                        {icon}
                    </div>
                )}
<input
                    className={`
                        w-full px-4 py-3
                        ${icon ? 'pl-11' : ''}
                        bg-white/5 border border-white/10 rounded-xl
                        text-white placeholder-gray-500
                        transition-all duration-300
                        hover:bg-white/[0.07] hover:border-white/15
                        focus:outline-none focus:bg-white/[0.08]
                        focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
                        focus:shadow-lg focus:shadow-violet-500/10
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:border-white/10
                        ${error
                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20 focus:shadow-red-500/10'
                            : ''
                        }
                        ${className}
                    `}
                    {...props}
                />
                {/* Focus glow effect */}
                <div className="absolute inset-0 rounded-xl pointer-events-none opacity-0 transition-opacity duration-300 peer-focus:opacity-100">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-violet-500/0" />
                </div>
            </div>
{error && (
                <p className="mt-2 text-sm text-red-400 ml-1 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
}
