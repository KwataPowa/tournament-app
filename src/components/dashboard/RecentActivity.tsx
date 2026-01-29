import { TrendingUp } from 'lucide-react'
import type { RecentActivityItem } from '../../services/dashboard'
import { Card } from '../ui/Card'

export function RecentActivity({ activities }: { activities: RecentActivityItem[] }) {
    if (activities.length === 0) {
        return (
            <Card className="h-full">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    Activité Récente
                </h2>
                <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                        Aucune activité récente. Les résultats de tes pronostics apparaîtront ici.
                    </p>
                </div>
            </Card>
        )
    }

    return (
        <Card>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Activité Récente
            </h2>

            <div className="relative border-l border-white/10 ml-3 space-y-6">
                {activities.map((activity) => {
                    const points = activity.prediction?.points_earned || 0
                    const isWin = points > 0

                    return (
                        <div key={activity.id} className="relative pl-6">
                            {/* Timeline dot */}
                            <div
                                className={`
                  absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#0f0e17]
                  ${isWin ? 'bg-cyan-500' : 'bg-gray-600'}
                `}
                            />

                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400 font-medium">
                                        {activity.tournament.name}
                                    </span>
                                    <span
                                        className={`
                      text-xs font-bold px-1.5 py-0.5 rounded
                      ${isWin ? 'text-cyan-400 bg-cyan-400/10' : 'text-gray-500 bg-gray-500/10'}
                    `}
                                    >
                                        {isWin ? `+${points} pts` : '0 pt'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-gray-200">
                                    <span className={activity.result?.winner === 'team_a' ? 'font-bold text-white' : ''}>
                                        {activity.team_a}
                                    </span>
                                    <span className="text-gray-500 text-xs px-1 bg-white/5 rounded border border-white/5">
                                        {activity.result?.score}
                                    </span>
                                    <span className={activity.result?.winner === 'team_b' ? 'font-bold text-white' : ''}>
                                        {activity.team_b}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-gray-500">
                                        Ton prono : {activity.prediction?.predicted_winner === 'team_a' ? activity.team_a : (activity.prediction?.predicted_winner === 'team_b' ? activity.team_b : 'Nul')} ({activity.prediction?.predicted_score})
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}
