import { TrendingUp, Trophy } from 'lucide-react'
import type { RecentActivityItem } from '../../services/dashboard'
import { Card } from '../ui/Card'

export function RecentActivity({ activities }: { activities: RecentActivityItem[] }) {
    if (activities.length === 0) {
        return (
            <Card className="h-full">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-cyan-500/10">
                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Activité Récente</h2>
                </div>
                <div className="flex flex-col justify-center items-center text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <Trophy className="w-6 h-6 text-gray-600" />
                    </div>
                    <p className="text-gray-500 text-sm max-w-xs">
                        Aucune activité récente. Les résultats de tes pronostics apparaîtront ici.
                    </p>
                </div>
            </Card>
        )
    }

    return (
        <Card className="h-full">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-cyan-500/10">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-lg font-bold text-white">Activité Récente</h2>
            </div>

            {/* Timeline */}
            <div className="relative border-l-2 border-white/10 ml-3 space-y-5">
                {activities.map((activity) => {
                    const points = activity.prediction?.points_earned || 0
                    const isWin = points > 0

                    return (
                        <div key={activity.id} className="relative pl-5">
                            {/* Timeline dot */}
                            <div
                                className={`
                                    absolute -left-[5px] top-1.5 w-2 h-2 rounded-full
                                    ${isWin ? 'bg-green-400 shadow-lg shadow-green-500/50' : 'bg-red-400 shadow-lg shadow-red-500/30'}
                                `}
                            />

                            <div className="flex flex-col gap-1.5">
                                {/* Tournament name + Points */}
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] text-gray-500 font-medium truncate">
                                        {activity.tournament.name}
                                    </span>
                                    <span
                                        className={`
                                            text-xs font-bold px-2 py-0.5 rounded-full shrink-0
                                            ${isWin ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}
                                        `}
                                    >
                                        {isWin ? `+${points} pts` : '0 pt'}
                                    </span>
                                </div>

                                {/* Match result */}
                                <div className="flex items-center gap-2 text-sm">
                                    <span className={activity.result?.winner === activity.team_a ? 'font-semibold text-white' : 'text-gray-400'}>
                                        {activity.team_a}
                                    </span>
                                    <span className="text-[10px] text-gray-600 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                                        {activity.result?.score}
                                    </span>
                                    <span className={activity.result?.winner === activity.team_b ? 'font-semibold text-white' : 'text-gray-400'}>
                                        {activity.team_b}
                                    </span>
                                </div>

                                {/* User prediction */}
                                <div className="text-[10px] text-gray-600">
                                    Ton prono : {activity.prediction?.predicted_winner} ({activity.prediction?.predicted_score})
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}
