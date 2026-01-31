import { useState } from 'react'
import type { Match, Prediction, MatchFormat } from '../../types'
import { Eye, Trophy } from 'lucide-react'
import { PredictionsListModal } from '../PredictionsListModal'

type BracketMatchCardProps = {
  match: Match
  prediction?: Prediction
  isAdmin: boolean
  tournamentStatus: 'draft' | 'active' | 'completed'
  onEnterResult?: (match: Match) => void
  onPredict?: (match: Match) => void
  onChangeFormat?: (match: Match, format: MatchFormat) => void
  /** Ouvre le modal d'édition unifié (format, date, résultat, équipes) */
  onEdit?: (match: Match) => void
  teams?: { name: string; logo?: string }[]
}



export function BracketMatchCard({
  match,
  prediction,
  isAdmin,

  onPredict,
  onEdit,
  teams,
}: BracketMatchCardProps) {
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

  const isClickable = (!isBye && !isByeName && !isTBD) || isAdmin

  const handleCardClick = () => {
    if (isBye || isByeName) return

    // L'admin peut éditer le match (format, date, résultat) en cliquant
    if (isAdmin && onEdit) {
      onEdit(match)
      return
    }

    // Si le match est terminé, on peut cliquer pour voir les stats/pronos (sauf si admin qui édite déjà)
    if (hasResult && !isAdmin) {
      // Optionnel : rendre tout le match cliquable pour voir les pronos ?
      // Pour l'instant on garde le bouton dédié pour être explicite
    }

    // Check lock status in real-time
    const currentNow = new Date()
    const currentStartTime = match.start_time ? new Date(match.start_time) : null
    const currentIsStarted = currentStartTime ? currentNow >= currentStartTime : false
    const currentIsLocked = hasResult || currentIsStarted

    if (currentIsLocked && !isAdmin) return

    // Les utilisateurs non-admin peuvent pronostiquer avant le résultat ET avant le début du match
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

  return (
    <div
      className={`
        bracket-match relative rounded-xl border flex overflow-hidden
        transition-all duration-200 min-w-[200px] min-h-24
        backdrop-blur-sm
        ${isBye || isByeName
          ? 'border-dashed border-white/10 bg-white/[0.02]'
          : 'border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02]'
        }
        ${isClickable ? 'hover:border-violet-500/40 hover:bg-white/[0.08] hover:shadow-lg hover:shadow-violet-500/5 cursor-pointer' : ''}
        ${hasResult ? 'border-green-500/30 shadow-sm shadow-green-500/10' : ''}
      `}
      onClick={handleCardClick}
    >
      {/* LEFT SIDEBAR: Match Info & Format */}
      <div className="w-10 bg-black/30 border-r border-white/5 flex flex-col items-center justify-between py-2.5">
        <span className="text-[10px] text-violet-400/80 font-mono font-bold">
          M{(match.bracket_position ?? 0) + 1}
        </span>

        {/* Format badge (BO) */}
        <span className="text-[9px] font-bold font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
          {match.match_format || 'BO3'}
        </span>
      </div>

      {/* RIGHT CONTENT: Date & Teams */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Date Header */}
        <div className="px-3 py-1.5 border-b border-white/5 flex items-center justify-center bg-black/20 h-7">
          {match.start_time ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-cyan-400 font-medium">
                {new Date(match.start_time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
              <span className="text-[10px] text-cyan-300 font-mono bg-cyan-500/10 px-1.5 py-0.5 rounded">
                {new Date(match.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ) : (
            isBye || isByeName ? (
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <Trophy className="w-3 h-3" /> Passage Auto
              </span>
            ) : (
              <span className="text-[10px] text-gray-600 font-mono">À planifier</span>
            )
          )}
        </div>


        {/* Team A */}
        <div
          className={`
            px-3 py-2 flex items-center justify-between gap-2
            ${teamAWon ? 'bg-green-500/15' : 'hover:bg-white/[0.02]'}
            ${match.team_a === 'BYE' ? 'bg-emerald-500/10' : ''}
            transition-colors
          `}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {teams?.find(t => t.name === match.team_a)?.logo ? (
              <img
                src={teams.find(t => t.name === match.team_a)?.logo}
                alt={match.team_a}
                className="w-5 h-5 object-contain flex-shrink-0"
              />
            ) : match.team_a !== 'TBD' && match.team_a !== 'BYE' ? (
              <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-gray-400">{match.team_a.charAt(0)}</span>
              </div>
            ) : null}
            <span
              className={`
                text-sm font-medium truncate
                ${match.team_a === 'TBD' ? 'text-gray-500 italic' : ''}
                ${teamAWon ? 'text-green-400 font-semibold' : 'text-gray-200'}
                ${teamBWon ? 'text-gray-500' : ''}
                ${match.team_a === 'BYE' ? 'text-emerald-400 italic' : ''}
              `}
            >
              {match.team_a === 'TBD' ? 'À définir' : match.team_a === 'BYE' ? 'Exempté' : match.team_a}
            </span>
          </div>

          {/* Score */}
          {hasResult && scoreA !== null && (
            <span className={`font-mono font-bold text-base ${teamAWon ? 'text-green-400' : 'text-gray-500'}`}>
              {scoreA}
            </span>
          )}
        </div>

        {/* Separator */}
        <div className="h-px bg-white/5 mx-3" />

        {/* Team B */}
        <div
          className={`
            px-3 py-2 flex items-center justify-between gap-2
            ${teamBWon ? 'bg-green-500/15' : 'hover:bg-white/[0.02]'}
            ${match.team_b === 'BYE' ? 'bg-emerald-500/10' : ''}
            transition-colors
          `}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            {teams?.find(t => t.name === match.team_b)?.logo ? (
              <img
                src={teams.find(t => t.name === match.team_b)?.logo}
                alt={match.team_b}
                className="w-5 h-5 object-contain flex-shrink-0"
              />
            ) : match.team_b !== 'TBD' && match.team_b !== 'BYE' ? (
              <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-gray-400">{match.team_b.charAt(0)}</span>
              </div>
            ) : null}
            <span
              className={`
                text-sm font-medium truncate
                ${match.team_b === 'TBD' ? 'text-gray-500 italic' : ''}
                ${teamBWon ? 'text-green-400 font-semibold' : 'text-gray-200'}
                ${teamAWon ? 'text-gray-500' : ''}
                ${match.team_b === 'BYE' ? 'text-emerald-400 italic' : ''}
              `}
            >
              {match.team_b === 'TBD' ? 'À définir' : match.team_b === 'BYE' ? 'Exempté' : match.team_b}
            </span>
          </div>

          {/* Score */}
          {hasResult && scoreB !== null && (
            <span className={`font-mono font-bold text-base ${teamBWon ? 'text-green-400' : 'text-gray-500'}`}>
              {scoreB}
            </span>
          )}
        </div>

        {/* Action buttons (pronostic seulement, avant résultat) */}
        {/* Action buttons (pronostic seulement, avant résultat) */}
        {onPredict && !isBye && !hasResult && (
          <div className="px-2 py-1.5 border-t border-white/5 flex gap-1">
            {/* Bouton pronostiquer */}
            {!prediction && (
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
                  if (!isTBD && !isByeName) onPredict(match)
                }}
                disabled={isTBD || isPredictionLocked || isByeName}
                className={`
                  flex-1 px-2 py-1 text-[10px] font-medium rounded transition-colors
                  ${isTBD
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                    : (isPredictionLocked || isByeName)
                      ? 'bg-white/5 text-gray-500 cursor-not-allowed' // Locked state
                      : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 cursor-pointer'}
                `}
              >
                {isByeName ? 'Exempté' : (isPredictionLocked ? 'Verrouillé' : 'Pronostiquer')}
              </button>
            )}
            {/* Bouton modifier pronostic */}
            {prediction && (
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
                className={`
                  flex-1 px-2 py-1 text-[10px] font-medium rounded transition-colors h-auto whitespace-normal text-center leading-tight
                  ${isPredictionLocked
                    ? 'bg-white/5 text-gray-400 cursor-default'
                    : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 cursor-pointer'}
                `}
                title={isPredictionLocked ? 'Pronostic verrouillé' : `Modifier: ${prediction.predicted_winner} (${prediction.predicted_score})`}
                disabled={isPredictionLocked}
              >
                <span className="block">{prediction.predicted_winner}</span>
                <span className="text-cyan-300 font-mono">({prediction.predicted_score})</span>
              </button>
            )}
          </div>
        )}

        {/* Prediction result (après que le résultat soit entré) */}
        {prediction && hasResult && (
          <div
            className={`
            px-3 py-1 border-t text-center
            ${predictionExact ? 'bg-green-500/10 border-green-500/20' : ''}
            ${predictionCorrect && !predictionExact ? 'bg-amber-500/10 border-amber-500/20' : ''}
            ${!predictionCorrect ? 'bg-red-500/10 border-red-500/20' : ''}
          `}
          >
            <span
              className={`
              text-[10px]
              ${predictionExact ? 'text-green-400' : ''}
              ${predictionCorrect && !predictionExact ? 'text-amber-400' : ''}
              ${!predictionCorrect ? 'text-red-400' : ''}
            `}
            >
              {prediction.predicted_winner} ({prediction.predicted_score}) → {predictionCorrect ? `+${prediction?.points_earned ?? 0}` : '0'} pts
            </span>
          </div>
        )}

        {/* View Predictions Button (After Result, regardless of if user predicted) */}
        {hasResult && !isBye && (
          <div className="px-2 py-1.5 border-t border-white/5 flex gap-1 justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowPredictions(true)
              }}
              className="flex text-[10px] items-center gap-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <Eye className="w-3 h-3" />
              Voir les pronos
            </button>
          </div>
        )}

        {showPredictions && (
          <PredictionsListModal match={match} onClose={() => setShowPredictions(false)} />
        )}

        {/* Bye indicator handled in header or subtle styling */}
      </div>
    </div>
  )
}
