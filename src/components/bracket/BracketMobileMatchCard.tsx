import { useState } from 'react'
import type { Match, Prediction, MatchFormat } from '../../types'
import { Eye, Trophy, Clock, Lock, Target } from 'lucide-react'
import { PredictionsListModal } from '../PredictionsListModal'

type BracketMobileMatchCardProps = {
  match: Match
  prediction?: Prediction
  isAdmin: boolean
  tournamentStatus: 'draft' | 'active' | 'completed'
  onEnterResult?: (match: Match) => void
  onPredict?: (match: Match) => void
  onChangeFormat?: (match: Match, format: MatchFormat) => void
  onEdit?: (match: Match) => void
  teams?: { name: string; logo?: string }[]
}

export function BracketMobileMatchCard({
  match,
  prediction,
  isAdmin,
  onPredict,
  onEdit,
  teams,
}: BracketMobileMatchCardProps) {
  const [showPredictions, setShowPredictions] = useState(false)

  const isTBD = match.team_a === 'TBD' || match.team_b === 'TBD'
  const hasResult = match.result !== null
  const isBye = match.is_bye
  const isByeName = match.team_a === 'BYE' || match.team_b === 'BYE'

  // Locking logic
  const now = new Date()
  const startTime = match.start_time ? new Date(match.start_time) : null
  const isStarted = startTime ? now >= startTime : false
  const isPredictionLocked = hasResult || isStarted

  const handleCardClick = () => {
    if (isBye || isByeName) return

    if (isAdmin && onEdit) {
      onEdit(match)
      return
    }

    const currentNow = new Date()
    const currentStartTime = match.start_time ? new Date(match.start_time) : null
    const currentIsStarted = currentStartTime ? currentNow >= currentStartTime : false
    const currentIsLocked = hasResult || currentIsStarted

    if (currentIsLocked && !isAdmin) return

    if (!isAdmin && !currentIsLocked && onPredict) {
      onPredict(match)
    }
  }

  // Determine winner highlighting
  const teamAWon = hasResult && match.result?.winner === match.team_a
  const teamBWon = hasResult && match.result?.winner === match.team_b

  // Prediction status
  const predictionCorrect =
    prediction && hasResult && prediction.predicted_winner === match.result?.winner
  const predictionExact =
    predictionCorrect && prediction?.predicted_score === match.result?.score

  // Score parsing
  const [scoreA, scoreB] = hasResult && match.result?.score
    ? match.result.score.split('-')
    : [null, null]

  // Team logo helper
  const getTeamLogo = (teamName: string) => teams?.find(t => t.name === teamName)?.logo

  // BYE match - simplified display
  if (isBye || isByeName) {
    const activeTeam = match.team_a === 'BYE' ? match.team_b : match.team_a
    return (
      <div className="bracket-mobile-match bg-white/[0.02] border border-dashed border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getTeamLogo(activeTeam) && (
              <img
                src={getTeamLogo(activeTeam)}
                alt={activeTeam}
                className="w-8 h-8 object-contain"
              />
            )}
            <span className="text-white font-medium">{activeTeam}</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-medium">Exempté</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bracket-mobile-match rounded-xl border overflow-hidden transition-all active:scale-[0.98] ${
        hasResult
          ? 'bg-white/5 border-green-500/20'
          : 'bg-white/5 border-white/10'
      }`}
      onClick={handleCardClick}
    >
      {/* Header: Match info + Date */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/20 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500">M{(match.bracket_position ?? 0) + 1}</span>
          <span className="text-xs font-bold font-mono text-violet-400">{match.match_format || 'BO3'}</span>
        </div>

        {match.start_time ? (
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="w-3 h-3 text-cyan-500/60" />
            <span className="text-cyan-400">
              {new Date(match.start_time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
            <span className="text-cyan-300/70 font-mono">
              {new Date(match.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-600">Date TBD</span>
        )}
      </div>

      {/* Teams */}
      <div className="p-3">
        {/* Team A */}
        <div
          className={`flex items-center justify-between p-3 rounded-lg mb-2 transition-colors ${
            teamAWon ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden flex-1">
            {getTeamLogo(match.team_a) ? (
              <img
                src={getTeamLogo(match.team_a)}
                alt={match.team_a}
                className="w-8 h-8 object-contain flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-gray-500">
                  {match.team_a === 'TBD' ? '?' : match.team_a.charAt(0)}
                </span>
              </div>
            )}
            <span
              className={`font-medium truncate ${
                match.team_a === 'TBD' ? 'text-gray-500 italic' :
                teamAWon ? 'text-green-400' :
                teamBWon ? 'text-gray-500' : 'text-white'
              }`}
            >
              {match.team_a === 'TBD' ? 'À définir' : match.team_a}
            </span>
          </div>

          {hasResult && scoreA !== null && (
            <span className={`text-lg font-bold font-mono ${teamAWon ? 'text-green-400' : 'text-gray-500'}`}>
              {scoreA}
            </span>
          )}
        </div>

        {/* VS divider */}
        <div className="flex items-center justify-center my-1">
          <div className="h-px flex-1 bg-white/5" />
          <span className="px-3 text-xs text-gray-600 font-medium">VS</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        {/* Team B */}
        <div
          className={`flex items-center justify-between p-3 rounded-lg mt-2 transition-colors ${
            teamBWon ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden flex-1">
            {getTeamLogo(match.team_b) ? (
              <img
                src={getTeamLogo(match.team_b)}
                alt={match.team_b}
                className="w-8 h-8 object-contain flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-gray-500">
                  {match.team_b === 'TBD' ? '?' : match.team_b.charAt(0)}
                </span>
              </div>
            )}
            <span
              className={`font-medium truncate ${
                match.team_b === 'TBD' ? 'text-gray-500 italic' :
                teamBWon ? 'text-green-400' :
                teamAWon ? 'text-gray-500' : 'text-white'
              }`}
            >
              {match.team_b === 'TBD' ? 'À définir' : match.team_b}
            </span>
          </div>

          {hasResult && scoreB !== null && (
            <span className={`text-lg font-bold font-mono ${teamBWon ? 'text-green-400' : 'text-gray-500'}`}>
              {scoreB}
            </span>
          )}
        </div>
      </div>

      {/* Prediction button (before result) */}
      {onPredict && !hasResult && (
        <div className="px-3 pb-3">
          {!prediction ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const currentNow = new Date()
                const currentStartTime = match.start_time ? new Date(match.start_time) : null
                const currentIsStarted = currentStartTime ? currentNow >= currentStartTime : false

                if (currentIsStarted || hasResult) {
                  alert("Le match a commencé ou est terminé, les pronostics sont verrouillés.")
                  return
                }
                if (!isTBD && !isByeName) onPredict(match)
              }}
              disabled={isTBD || isPredictionLocked}
              className={`w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                isTBD
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                  : isPredictionLocked
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                    : 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 active:scale-[0.98]'
              }`}
            >
              {isPredictionLocked ? (
                <>
                  <Lock className="w-4 h-4" />
                  Verrouillé
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  Pronostiquer
                </>
              )}
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const currentNow = new Date()
                const currentStartTime = match.start_time ? new Date(match.start_time) : null
                const currentIsStarted = currentStartTime ? currentNow >= currentStartTime : false

                if (currentIsStarted || hasResult) {
                  alert("Le match a commencé ou est terminé, les pronostics sont verrouillés.")
                  return
                }
                onPredict!(match)
              }}
              disabled={isPredictionLocked}
              className={`w-full py-3 rounded-lg text-sm flex items-center justify-center gap-3 transition-all ${
                isPredictionLocked
                  ? 'bg-white/5 text-gray-400 cursor-default'
                  : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 active:scale-[0.98]'
              }`}
            >
              <span className="font-medium flex items-center gap-1.5">
                {getTeamLogo(prediction.predicted_winner) ? (
                  <img src={getTeamLogo(prediction.predicted_winner)} alt={prediction.predicted_winner} className="w-5 h-5 object-contain" />
                ) : (
                  prediction.predicted_winner
                )}
              </span>
              <span className="font-mono text-cyan-300 bg-black/20 px-2 py-0.5 rounded">
                {prediction.predicted_score}
              </span>
              {!isPredictionLocked && (
                <span className="text-xs text-cyan-500/60">Modifier</span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Prediction result (after result) */}
      {prediction && hasResult && (
        <div
          className={`mx-3 mb-3 p-3 rounded-lg ${
            predictionExact ? 'bg-green-500/10 border border-green-500/20' :
            predictionCorrect ? 'bg-amber-500/10 border border-amber-500/20' :
            'bg-red-500/10 border border-red-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-sm flex items-center gap-1.5 ${
                predictionExact ? 'text-green-400' :
                predictionCorrect ? 'text-amber-400' : 'text-red-400'
              }`}>
                {getTeamLogo(prediction.predicted_winner) ? (
                  <img src={getTeamLogo(prediction.predicted_winner)} alt={prediction.predicted_winner} className="w-4 h-4 object-contain" />
                ) : (
                  prediction.predicted_winner
                )}
              </span>
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                predictionExact ? 'bg-green-500/20 text-green-300' :
                predictionCorrect ? 'bg-amber-500/20 text-amber-300' :
                'bg-red-500/20 text-red-300'
              }`}>
                {prediction.predicted_score}
              </span>
            </div>
            <span className={`font-bold ${
              predictionCorrect ? 'text-green-400' : 'text-red-400'
            }`}>
              {predictionCorrect ? `+${prediction?.points_earned ?? 0}` : '0'} pts
            </span>
          </div>
        </div>
      )}

      {/* View predictions button (after result) */}
      {hasResult && (
        <div className="px-3 pb-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowPredictions(true)
            }}
            className="w-full py-2.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Eye className="w-4 h-4" />
            Voir les pronostics
          </button>
        </div>
      )}

      {showPredictions && (
        <PredictionsListModal match={match} onClose={() => setShowPredictions(false)} />
      )}
    </div>
  )
}
