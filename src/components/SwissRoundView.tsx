import { useMemo } from 'react'
import type { Match, Prediction, Team } from '../types'
import { LeagueMatchRow } from './LeagueMatchRow'
import { ChevronLeft, ChevronRight, Shuffle, CheckCircle2, Clock, Plus } from 'lucide-react'
import { Button } from './ui/Button'
import { isSwissRoundComplete } from '../services/swiss'

// Calculate team records before a specific round
function getTeamRecordsBeforeRound(
    matches: Match[],
    targetRound: number
): Record<string, { wins: number; losses: number }> {
    const records: Record<string, { wins: number; losses: number }> = {}

    // Count wins/losses from matches before the target round
    matches
        .filter(m => m.round < targetRound && m.result && !m.is_bye)
        .forEach(m => {
            const winner = m.result?.winner
            const loser = winner === m.team_a ? m.team_b : m.team_a

            if (winner) {
                records[winner] = records[winner] || { wins: 0, losses: 0 }
                records[winner].wins += 1
            }
            if (loser) {
                records[loser] = records[loser] || { wins: 0, losses: 0 }
                records[loser].losses += 1
            }
        })

    return records
}

// Get the match bucket string (e.g., "1-0 vs 1-0")
function getMatchBucket(
    match: Match,
    records: Record<string, { wins: number; losses: number }>
): string {
    const recordA = records[match.team_a] || { wins: 0, losses: 0 }
    const recordB = records[match.team_b] || { wins: 0, losses: 0 }
    return `${recordA.wins}-${recordA.losses} vs ${recordB.wins}-${recordB.losses}`
}

type SwissRoundViewProps = {
    matches: Match[]
    predictions: Prediction[]
    teams: Team[]
    currentRound: number
    totalRounds: number
    tournamentStatus: 'draft' | 'active' | 'completed'
    isAdmin: boolean
    pairingMode?: 'dutch' | 'manual'
    onRoundChange: (round: number) => void
    onGenerateNextRound?: () => void
    onAddMatch?: (round: number) => void
    onOpenPairingAssistant?: (round: number) => void
    onPredict?: (match: Match) => void
    onEditMatch?: (match: Match) => void
    isGenerating?: boolean
}

export function SwissRoundView({
    matches,
    predictions,
    teams,
    currentRound,
    totalRounds,
    tournamentStatus,
    isAdmin,
    pairingMode = 'dutch',
    onRoundChange,
    onGenerateNextRound,
    onAddMatch,
    onOpenPairingAssistant,
    onPredict,
    onEditMatch,
    isGenerating = false
}: SwissRoundViewProps) {

    const isManualMode = pairingMode === 'manual'

    // Trouver le max round actuel (rondes générées)
    const maxGeneratedRound = useMemo(() => {
        if (matches.length === 0) return 0
        return Math.max(...matches.map(m => m.round))
    }, [matches])

    // Filtrer les matchs de la ronde actuelle
    const roundMatches = useMemo(() => {
        return matches
            .filter(m => m.round === currentRound)
            .sort((a, b) => {
                // BYE matches at the end
                if (a.is_bye && !b.is_bye) return 1
                if (!a.is_bye && b.is_bye) return -1
                // Tri par ordre de création (chronologique)
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            })
    }, [matches, currentRound])

    // Calculate team records before current round (for match bucket display)
    const teamRecordsBeforeRound = useMemo(() => {
        return getTeamRecordsBeforeRound(matches, currentRound)
    }, [matches, currentRound])

    // Check if current round is complete
    const isCurrentRoundComplete = useMemo(() => {
        return isSwissRoundComplete(matches, currentRound)
    }, [matches, currentRound])

    // Can generate next round? (only in auto mode)
    const canGenerateNextRound = isAdmin
        && !isManualMode
        && isCurrentRoundComplete
        && currentRound === maxGeneratedRound
        && currentRound < totalRounds
        && onGenerateNextRound

    // Progress info
    const completedMatches = roundMatches.filter(m => m.result !== null).length
    const totalMatchesInRound = roundMatches.length

    return (
        <div className="space-y-4">
            {/* Round Navigation */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onRoundChange(currentRound - 1)}
                        disabled={currentRound <= 1}
                        className={`
                            p-2 rounded-lg transition-all duration-200
                            ${currentRound <= 1
                                ? 'text-gray-600 cursor-not-allowed'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                            }
                        `}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2">
                        <Shuffle className="w-4 h-4 text-emerald-400" />
                        <span className="font-medium text-white">
                            Ronde {currentRound}
                        </span>
                        <span className="text-gray-500">/ {totalRounds}</span>
                    </div>

                    <button
                        onClick={() => onRoundChange(currentRound + 1)}
                        disabled={isManualMode ? currentRound >= totalRounds : currentRound >= maxGeneratedRound}
                        className={`
                            p-2 rounded-lg transition-all duration-200
                            ${(isManualMode ? currentRound >= totalRounds : currentRound >= maxGeneratedRound)
                                ? 'text-gray-600 cursor-not-allowed'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                            }
                        `}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress indicator + Add match button */}
                <div className="flex items-center gap-3 text-sm">
                    {isCurrentRoundComplete ? (
                        <span className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            Ronde terminée
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-gray-400">
                            <Clock className="w-4 h-4" />
                            {completedMatches}/{totalMatchesInRound} matchs
                        </span>
                    )}

                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            {onOpenPairingAssistant && isManualMode && (
                                <button
                                    onClick={() => onOpenPairingAssistant(currentRound)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/30 hover:text-white transition-all"
                                >
                                    <Shuffle className="w-3.5 h-3.5" /> Assistant
                                </button>
                            )}
                            {onAddMatch && (
                                <button
                                    onClick={() => onAddMatch(currentRound)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 hover:text-white transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Ajouter
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Round Progress Bar */}
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(completedMatches / Math.max(totalMatchesInRound, 1)) * 100}%` }}
                />
            </div>

            {/* Match List */}
            {roundMatches.length > 0 ? (
                <div className="space-y-2">
                    {roundMatches.map(match => (
                        <LeagueMatchRow
                            key={match.id}
                            match={match}
                            prediction={predictions.find(p => p.match_id === match.id)}
                            isAdmin={isAdmin}
                            tournamentStatus={tournamentStatus}
                            teams={teams}
                            onPredict={onPredict}
                            onEdit={onEditMatch}
                            isSwiss={true}
                            matchBucket={getMatchBucket(match, teamRecordsBeforeRound)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    {isManualMode ? (
                        <div className="space-y-2">
                            <p>Aucun match dans cette ronde.</p>
                            {isAdmin && onAddMatch && (
                                <button
                                    onClick={() => onAddMatch(currentRound)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                                >
                                    <Plus className="w-4 h-4" /> Créer un match
                                </button>
                            )}
                        </div>
                    ) : currentRound > maxGeneratedRound ? (
                        "Cette ronde n'a pas encore été générée."
                    ) : (
                        "Aucun match dans cette ronde."
                    )}
                </div>
            )}

            {/* Generate Next Round Button */}
            {canGenerateNextRound && (
                <div className="pt-4 border-t border-white/10">
                    <Button
                        onClick={onGenerateNextRound}
                        disabled={isGenerating}
                        className="w-full bg-emerald-600 hover:bg-emerald-500"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                Génération en cours...
                            </>
                        ) : (
                            <>
                                <Shuffle className="w-4 h-4 mr-2" />
                                Générer la Ronde {currentRound + 1}
                            </>
                        )}
                    </Button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                        Les pairages seront basés sur le classement actuel
                    </p>
                </div>
            )}

            {/* Tournament Complete */}
            {currentRound === totalRounds && isCurrentRoundComplete && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                    <p className="text-emerald-400 font-medium">
                        Tournoi Suisse terminé !
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        Toutes les rondes ont été jouées.
                    </p>
                </div>
            )}
        </div>
    )
}
