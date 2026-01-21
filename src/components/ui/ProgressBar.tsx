

interface ProgressBarProps {
    value: number;
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'primary' | 'success' | 'warning' | 'danger';
    showLabel?: boolean;
    className?: string;
}

export function ProgressBar({
    value,
    max = 100,
    size = 'md',
    variant = 'primary',
    showLabel = false,
    className = '',
}: ProgressBarProps) {
    const percentage = Math.min((value / max) * 100, 100);

    const sizes = {
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4',
    };

    const variants = {
        primary: 'bg-gradient-to-r from-primary-600 to-accent-500 glow-primary',
        success: 'bg-gradient-to-r from-success-500 to-success-400 glow-success',
        warning: 'bg-gradient-to-r from-warning-500 to-warning-400 glow-warning',
        danger: 'bg-gradient-to-r from-danger-500 to-danger-400 glow-danger',
    };

    return (
        <div className={`w-full ${className}`}>
            {showLabel && (
                <div className="flex justify-between text-sm text-text-secondary mb-2">
                    <span>Progress</span>
                    <span>{Math.round(percentage)}%</span>
                </div>
            )}
            <div className={`progress-bar ${sizes[size]}`}>
                <div
                    className={`
                        progress-bar-fill ${variants[variant]}
                        ${size === 'lg' ? 'rounded-lg' : 'rounded-md'}
                    `}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}