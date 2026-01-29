import { Link } from 'react-router-dom'
import { Calendar, Clock, Trophy } from 'lucide-react'
import type { PendingPredictionMatch } from '../../services/dashboard'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function PendingPredictions({ matches }: { matches: PendingPredictionMatch[] }) {
    if (matches.length === 0) {
        return (
            <Card className="flex flex-col justify-center items-center text-center p-8 bg-white/5 border-dashed border-white/10">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <Trophy className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Tout est à jour !</h3>
                <p className="text-gray-400 text-sm max-w-xs">
                    Tu as pronostiqué sur tous les matchs disponibles. Reviens plus tard pour les prochains.
                </p>
            </Card>
        )
    }

    return (
        <Card>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    À pronostiquer
                </h2>
                <span className="bg-amber-500/10 text-amber-400 text-xs font-bold px-2 py-1 rounded-full border border-amber-500/20">
                    {matches.length} en attente
                </span>
            </div>

            <div className={`space-y-3 ${matches.length > 5 ? 'max-h-[400px] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
                {matches.map((match) => (
                    <div
                        key={match.id}
                        className="group relative p-3 bg-white/5 border border-white/5 hover:border-violet-500/30 hover:bg-white/[0.07] rounded-lg transition-all duration-300"
                    >
                        {/* Compact Header */}
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 truncate max-w-[60%]">
                                <Trophy className="w-3 h-3 text-violet-400" />
                                {match.tournament.name}
                            </span>
                            {match.start_time && (
                                <span className="text-[10px] text-gray-500 flex items-center gap-1 whitespace-nowrap">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(match.start_time).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                </span>
                            )}
                        </div>

                        {/* Teams & Action - Single Grid/Flex Row */}
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
                                <span className="text-sm font-semibold text-white truncate text-right flex-1">
                                    {match.team_a}
                                </span>
                                <span className="text-[10px] font-bold text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">VS</span>
                                <span className="text-sm font-semibold text-white truncate text-left flex-1">
                                    {match.team_b}
                                </span>
                            </div>

                            <Link to={`/tournaments/${match.tournament_id}`} className="shrink-0">
                                <Button size="sm" className="h-7 px-3 text-xs bg-violet-500/10 text-violet-300 hover:bg-violet-500 hover:text-white border border-violet-500/20">
                                    Pronostiquer
                                </Button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </Card >
    )
}
