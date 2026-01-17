import { useState } from 'react'
import type { Match, Prediction, MatchFormat } from '../types'
import { ChevronDown, Lock, Eye } from 'lucide-react'
import { PredictionsListModal } from './PredictionsListModal'

type LeagueMatchRowProps = {
    match: Match
    prediction?: Prediction
    isAdmin: boolean
    tournamentStatus: 'draft' | 'active' | 'completed'
    teams?: { name: string; logo?: string }[]
    onPredict?: (match: Match) => void
    onEdit?: (match: Match) => void
    onChangeFormat?: (match: Match, format: MatchFormat) => void
    roundDate?: string
}

const FORMAT_OPTIONS: MatchFormat[] = ['BO1', 'BO3', 'BO5', 'BO7']

export function LeagueMatchRow({
    match,
    prediction,
    isAdmin,
    tournamentStatus,
    teams,
    onPredict,
    onEdit,
    onChangeFormat,
    roundDate,
}: LeagueMatchRowProps) {
    const [showFormatMenu, setShowFormatMenu] = useState(false)
    const [showPredictions, setShowPredictions] = useState(false)

    const isTBD = match.team_a === 'TBD' || match.team_b === 'TBD'
    const hasResult = match.result !== null
    const isBye = match.is_bye

    // Locking logic
    const now = new Date()
    const effectiveStartTime = match.start_time
        ? new Date(match.start_time)
        : roundDate
            ? new Date(roundDate)
            : null

    const isStarted = effectiveStartTime ? now >= effectiveStartTime : false
    const isPredictionLocked = hasResult || isStarted

    // Clickable for edit in draft, or prediction in active
    const isClickable = isAdmin
        ? true
        : (!isBye && !isTBD && !isPredictionLocked && !!onPredict)

    // Actions available
    const canPredict = !isTBD && !isBye && !isPredictionLocked && onPredict

    const handleRowClick = () => {
        if (isBye) return

        // L'admin peut toujours éditer le match (équipes, format, résultat, etc.)
        if (isAdmin && onEdit) {
            onEdit(match)
            return
        }

        if (isTBD) return

        // Check lock status in real-time
        const currentNow = new Date()
        const currentEffectiveTime = match.start_time
            ? new Date(match.start_time)
            : roundDate
                ? new Date(roundDate)
                : null
        const currentIsStarted = currentEffectiveTime ? currentNow >= currentEffectiveTime : false
        const currentIsLocked = hasResult || currentIsStarted

        if (currentIsLocked) {
            return
        }

        // Les non-admins peuvent pronostiquer avant le résultat ET si pas verrouillé
        if (!isAdmin && !currentIsLocked && onPredict) {
            onPredict(match)
        }
    }

    // Winner highlighting
    const teamAWon = hasResult && match.result?.winner === match.team_a
    const teamBWon = hasResult && match.result?.winner === match.team_b

    // Prediction accuracy
    const predictionCorrect =
        prediction && hasResult && prediction.predicted_winner === match.result?.winner

    const getTeamLogo = (teamName: string) => {
        return teams?.find(t => t.name === teamName)?.logo
    }

    const renderTeamLogo = (teamName: string) => {
        if (teamName === 'TBD') return null
        const logo = getTeamLogo(teamName)
        if (logo) {
            return <img src={logo} alt={teamName} className="w-5 h-5 object-contain" />
        }
        return (
            <div className="w-5 h-5 rounded bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400">
                {teamName.charAt(0).toUpperCase()}
            </div>
        )
    }

    return (
        <div
            onClick={handleRowClick}
            className={`
        group relative flex flex-col md:grid md:grid-cols-[1fr_minmax(300px,2fr)_1fr] items-center gap-4 p-4 rounded-lg border
        transition-all duration-200
        ${isBye ? 'border-dashed border-white/10 bg-white/[0.02]' : 'border-white/5 bg-white/5'}
        ${isClickable ? 'hover:bg-white/10 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-900/10' : ''}
        ${hasResult ? 'border-green-500/10 bg-green-500/[0.02]' : ''}
      `}
        >
            {/* LEFT: Format Info */}
            <div className="flex items-center gap-2 justify-self-start w-full md:w-auto">
                {tournamentStatus === 'draft' && isAdmin && onChangeFormat ? (
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setShowFormatMenu(!showFormatMenu)
                            }}
                            className="flex items-center gap-1 text-xs font-bold font-mono px-2 py-1 rounded bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors cursor-pointer"
                        >
                            {match.match_format || 'BO3'} <ChevronDown className="w-3 h-3" />
                        </button>
                        {showFormatMenu && (
                            <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 min-w-[80px]">
                                {FORMAT_OPTIONS.map((fmt) => (
                                    <button
                                        key={fmt}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onChangeFormat(match, fmt)
                                            setShowFormatMenu(false)
                                        }}
                                        className={`
                          block w-full px-3 py-1.5 text-xs font-mono text-left transition-colors
                          ${match.match_format === fmt ? 'bg-violet-500/20 text-violet-400' : 'text-gray-300 hover:bg-white/10'}
                        `}
                                    >
                                        {fmt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-xs font-bold font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">
                        {match.match_format || 'BO3'}
                    </span>
                )}

                {/* Time Display */}
                {match.start_time && (
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 whitespace-nowrap">
                        {new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>

            {/* CENTER: Teams Display */}
            <div className="flex items-center gap-4 w-full justify-self-center">
                {/* Team A */}
                <div className={`flex items-center justify-end gap-3 flex-1 transition-colors ${teamAWon ? 'text-green-400 font-semibold' : 'text-gray-200'}`}>
                    <span className="truncate text-right">{match.team_a === 'TBD' ? 'À définir' : match.team_a}</span>
                    {renderTeamLogo(match.team_a)}
                    {hasResult && match.result?.score && (
                        <span className="font-mono text-xl font-bold ml-2">
                            {match.result.score.split('-')[0]?.trim()}
                        </span>
                    )}
                </div>

                <span className="text-sm font-bold text-gray-600 px-2 py-1 rounded bg-white/5 mx-auto">VS</span>

                {/* Team B */}
                <div className={`flex items-center justify-start gap-3 flex-1 transition-colors ${teamBWon ? 'text-green-400 font-semibold' : 'text-gray-200'}`}>
                    {hasResult && match.result?.score && (
                        <span className="font-mono text-xl font-bold mr-2">
                            {match.result.score.split('-')[1]?.trim()}
                        </span>
                    )}
                    {renderTeamLogo(match.team_b)}
                    <span className="truncate text-left">{match.team_b === 'TBD' ? 'À définir' : match.team_b}</span>
                </div>
            </div>

            {showPredictions && (
                <PredictionsListModal match={match} onClose={() => setShowPredictions(false)} />
            )}

            {/* RIGHT: Actions, Scores, Predictions */}
            <div className="flex items-center gap-4 justify-self-end w-full md:w-auto justify-end">

                {/* Prediction Badge */}
                {prediction && (
                    <div className={`hidden md:flex flex-col items-end`}>
                        <div className={`px-2 py-1 rounded text-[11px] font-medium border flex items-center gap-1 ${hasResult
                            ? predictionCorrect
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                            <span>{prediction.predicted_winner} ({prediction.predicted_score})</span>
                            {hasResult && (
                                <>
                                    <span className="mx-1">➜</span>
                                    <span className={predictionCorrect ? 'text-green-400 font-bold' : 'text-red-400'}>
                                        {predictionCorrect ? `${prediction.points_earned ?? 0}` : '0'} pts
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* View Predictions Button (After Result) */}
                {hasResult && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setShowPredictions(true)
                        }}
                        className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-white/5"
                        title="Voir les pronostics des joueurs"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                )}


                {/* Actions when no result */}
                {!hasResult && (
                    <div className="flex items-center gap-2">

                        {/* Actions */}
                        {canPredict && !prediction && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    // Check lock status in real-time
                                    const currentNow = new Date()
                                    const currentEffectiveTime = match.start_time
                                        ? new Date(match.start_time)
                                        : roundDate
                                            ? new Date(roundDate)
                                            : null
                                    const currentIsStarted = currentEffectiveTime ? currentNow >= currentEffectiveTime : false
                                    if (currentIsStarted || hasResult) {
                                        alert("Le match a commencé ou est terminé, les pronostics sont verrouillés.")
                                        return
                                    }
                                    onPredict!(match)
                                }}
                                className="px-3 py-1.5 text-xs font-medium rounded-md bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors border border-cyan-500/20 cursor-pointer"
                            >
                                Pronostiquer
                            </button>
                        )}

                        {canPredict && prediction && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    // Check lock status in real-time
                                    const currentNow = new Date()
                                    const currentStartTime = match.start_time ? new Date(match.start_time) : null
                                    const currentIsStarted = currentStartTime ? currentNow >= currentStartTime : false
                                    if (currentIsStarted || hasResult) {
                                        alert("Le match a commencé ou est terminé, les pronostics sont verrouillés.")
                                        return
                                    }
                                    onPredict!(match)
                                }}
                                className="px-3 py-1.5 text-xs font-medium rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                Modifier
                            </button>
                        )}

                        {!hasResult && !isTBD && !canPredict && (
                            <div className="flex items-center gap-1.5 text-gray-500 bg-white/5 px-2 py-1 rounded">
                                <Lock className="w-3 h-3" />
                                <span className="text-[10px] uppercase font-medium">
                                    {isStarted ? 'Verrouillé' : 'À venir'}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isBye && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] rounded-lg">
                    <span className="text-sm text-amber-500 font-bold tracking-widest border border-amber-500/40 px-4 py-1 rounded bg-amber-900/20">BYE</span>
                </div>
            )}
        </div>

    )
}
