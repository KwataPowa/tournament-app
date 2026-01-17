import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getMatchPredictions } from '../services/predictions'
import type { MatchPredictionWithUser } from '../services/predictions'
import type { Match } from '../types'
import { X, Trophy, User } from 'lucide-react'
import { AvatarDisplay } from './AvatarDisplay'

type PredictionsListModalProps = {
    match: Match
    onClose: () => void
}

export function PredictionsListModal({ match, onClose }: PredictionsListModalProps) {
    const [predictions, setPredictions] = useState<MatchPredictionWithUser[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadPredictions()
    }, [match.id])

    async function loadPredictions() {
        setLoading(true)
        try {
            const data = await getMatchPredictions(match.id)
            setPredictions(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur')
        } finally {
            setLoading(false)
        }
    }

    // Calculate winner for highlighting
    const realWinner = match.result?.winner

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 modal-backdrop modal-backdrop-enter" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md glass-modal rounded-2xl overflow-hidden modal-enter flex flex-col max-h-[80vh] bg-[#13111C] border border-white/10 shadow-2xl">
                {/* Header */}
                <div className="relative px-6 py-5 border-b border-white/10 flex-shrink-0 bg-white/5">
                    <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-violet-400" />
                        Pronostics des joueurs
                    </h2>
                    <div className="mt-1 text-xs text-gray-400 flex items-center gap-2">
                        <span className={match.result?.winner === match.team_a ? "text-green-400 font-bold" : ""}>{match.team_a}</span>
                        <span className="text-gray-600 font-bold">VS</span>
                        <span className={match.result?.winner === match.team_b ? "text-green-400 font-bold" : ""}>{match.team_b}</span>
                        {match.result?.score && <span className="ml-2 font-mono bg-black/30 px-2 py-0.5 rounded text-white">{match.result.score}</span>}
                    </div>
                </div>

                {/* Content */}
                <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-3">
                            <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                            Chargement...
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-400">{error}</div>
                    ) : predictions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">Aucun pronostic visible pour ce match.</div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {predictions.map((p) => {
                                const isCorrectWinner = p.predicted_winner === realWinner
                                const isExactScore = p.predicted_score === match.result?.score

                                return (
                                    <div key={p.user_id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <AvatarDisplay avatar={p.avatar_url} fallbackText={p.username.charAt(0).toUpperCase()} className="w-8 h-8 rounded-full bg-white/5 text-sm" />
                                            <div>
                                                <div className="text-sm font-medium text-white">{p.username}</div>
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    a prédit <span className={isCorrectWinner ? "text-green-400 font-bold" : "text-gray-300"}>{p.predicted_winner}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            <div className={`
                                        px-2 py-1 rounded border font-mono text-sm font-bold
                                        ${isCorrectWinner
                                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                    : 'bg-red-500/10 text-red-400 border-red-500/20'}
                                    `}>
                                                {p.predicted_score}
                                            </div>
                                            {p.points_earned !== null && p.points_earned > 0 && (
                                                <span className="text-xs text-amber-400 font-bold flex items-center gap-1 animate-in fade-in zoom-in">
                                                    +{p.points_earned} pts
                                                    {isExactScore && <Trophy className="w-3 h-3 text-cyan-400 ml-0.5" />}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
