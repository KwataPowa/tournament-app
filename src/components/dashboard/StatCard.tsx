import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
    label: string
    value: number
    icon: LucideIcon
    color: string // e.g., "text-violet-400"
    bg: string // e.g., "bg-violet-500/10"
}

export function StatCard({ label, value, icon: Icon, color, bg }: StatCardProps) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
        </div>
    )
}
