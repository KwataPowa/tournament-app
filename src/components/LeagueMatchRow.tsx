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
    const isByeName = match.team_a === 'BYE' || match.team_b === 'BYE'

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
        : (!isBye && !isByeName && !isTBD && !isPredictionLocked && !!onPredict)

    // Actions available
    const canPredict = !isTBD && !isBye && !isByeName && !isPredictionLocked && onPredict

    const handleRowClick = () => {
        if (isBye || isByeName) return

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
        group relative flex flex-col w-full gap-4 p-4 rounded-lg border
        transition-all duration-200
        ${isBye ? 'border-dashed border-white/10 bg-white/[0.02]' : 'border-white/5 bg-white/5'}
        ${isClickable ? 'hover:bg-white/10 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-900/10' : ''}
        ${hasResult ? 'border-green-500/10 bg-green-500/[0.02]' : ''}
      `}
        >
            {/* --- MOBILE VIEW --- */}
            <div className="flex min-[1320px]:hidden flex-col w-full gap-3">
                {/* Header: Time & Format */}
                <div className="flex items-center justify-between text-xs text-gray-500 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                        {match.start_time && (
                            <span className="font-mono text-cyan-400">
                                {new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">
                            {match.match_format || 'BO3'}
                        </span>
                    </div>
                    {isStarted && !hasResult && (
                        <span className="text-[10px] uppercase font-bold text-red-400 animate-pulse whitespace-nowrap">En cours</span>
                    )}
                    {hasResult && <span className="text-[10px] uppercase font-bold text-green-400">Terminé</span>}
                </div>

                {/* Teams */}
                <div className="flex flex-col gap-2 py-1">
                    {/* Team A */}
                    <div className={`flex items-center justify-between ${teamAWon ? 'text-green-400 font-bold' : 'text-gray-300'}`}>
                        <div className="flex items-center gap-3">
                            {renderTeamLogo(match.team_a)}
                            <span className="text-sm">{match.team_a === 'TBD' ? 'À définir' : match.team_a}</span>
                        </div>
                        {hasResult && match.result?.score && (
                            <span className="font-mono text-lg">{match.result.score.split('-')[0]?.trim()}</span>
                        )}
                    </div>
                    {/* Team B */}
                    <div className={`flex items-center justify-between ${teamBWon ? 'text-green-400 font-bold' : 'text-gray-300'}`}>
                        <div className="flex items-center gap-3">
                            {renderTeamLogo(match.team_b)}
                            <span className="text-sm">{match.team_b === 'TBD' ? 'À définir' : match.team_b}</span>
                        </div>
                        {hasResult && match.result?.score && (
                            <span className="font-mono text-lg">{match.result.score.split('-')[1]?.trim()}</span>
                        )}
                    </div>
                </div>

                {/* Prediction / Actions */}
                <div className="pt-2 border-t border-white/5">
                    {prediction ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                if (!isPredictionLocked && onPredict) onPredict(match)
                            }}
                            disabled={isPredictionLocked}
                            className={`w-full px-3 py-2 rounded text-xs font-medium border flex items-center justify-between transition-all ${hasResult
                                ? predictionCorrect
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 cursor-pointer'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                {getTeamLogo(prediction.predicted_winner) ? (
                                    <div className="flex items-center gap-2">
                                        <img
                                            src={getTeamLogo(prediction.predicted_winner)}
                                            alt={prediction.predicted_winner}
                                            className="w-5 h-5 object-contain"
                                        />
                                        <span>({prediction.predicted_score})</span>
                                    </div>
                                ) : (
                                    <span>Votre prono : {prediction.predicted_winner} ({prediction.predicted_score})</span>
                                )}
                            </div>
                            {hasResult && (
                                <span className={predictionCorrect ? 'font-bold' : ''}>
                                    {predictionCorrect ? `+${prediction.points_earned ?? 0} pts` : '0 pts'}
                                </span>
                            )}
                        </button>
                    ) : (
                        (!hasResult && !isTBD && canPredict) && (
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
                                className="w-full py-2 text-xs font-medium rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-center"
                            >
                                Pronostiquer
                            </button>
                        )
                    )}
                    {!hasResult && !isTBD && !canPredict && (
                        <div className="flex items-center justify-center gap-2 text-gray-500 text-xs py-1">
                            <Lock className="w-3 h-3" />
                            <span>{(isByeName || isBye) ? 'Exempté' : (isStarted ? 'Verrouillé' : 'Bientôt disponible')}</span>
                        </div>
                    )}
                    {hasResult && !prediction && (
                        <div className="text-center text-xs text-gray-500 py-1">Match terminé</div>
                    )}
                </div>
            </div>


            {/* --- DESKTOP VIEW --- */}
            <div className="hidden min-[1320px]:grid min-[1320px]:grid-cols-[1fr_minmax(300px,2fr)_1fr] w-full items-center gap-4">
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
                            <div className={`px-2 py-1 rounded text-[11px] font-medium border flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${hasResult
                                ? predictionCorrect
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                <div className="flex items-center gap-1.5">
                                    {getTeamLogo(prediction.predicted_winner) ? (
                                        <img
                                            src={getTeamLogo(prediction.predicted_winner)}
                                            alt={prediction.predicted_winner}
                                            className="w-4 h-4 object-contain"
                                            title={prediction.predicted_winner}
                                        />
                                    ) : (
                                        <span>{prediction.predicted_winner}</span>
                                    )}
                                    <span>({prediction.predicted_score})</span>
                                </div>
                                {/* Simplified at md/lg, full at xl */}
                                {hasResult && (
                                    <>
                                        <span className="hidden xl:inline mx-1">➜</span>
                                        <span className={`hidden xl:inline ${predictionCorrect ? 'text-green-400 font-bold' : 'text-red-400'}`}>
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
            </div>

            {isBye && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] rounded-lg">
                    <span className="text-sm text-amber-500 font-bold tracking-widest border border-amber-500/40 px-4 py-1 rounded bg-amber-900/20">BYE</span>
                </div>
            )}
        </div>

    )
}
