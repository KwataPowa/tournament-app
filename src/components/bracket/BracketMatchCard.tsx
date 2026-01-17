import { useState } from 'react'
import type { Match, Prediction, MatchFormat } from '../../types'
import { Eye } from 'lucide-react'
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
  const isClickable = (!isBye && !isTBD) || isAdmin



  const handleCardClick = () => {
    if (isBye) return

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

    if (isTBD) return

    // Les utilisateurs non-admin peuvent pronostiquer avant le résultat
    if (!isAdmin && !hasResult && onPredict) {
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
        bracket-match relative rounded-lg border flex overflow-hidden
        transition-all duration-200 min-w-[200px] min-h-24
        ${isBye ? 'border-dashed border-white/10 bg-white/[0.02]' : 'border-white/10 bg-white/5'}
        ${isBye ? 'border-dashed border-white/10 bg-white/[0.02]' : 'border-white/5 bg-white/5'}
        ${isClickable ? 'hover:border-violet-500/30 hover:bg-white/[0.07]' : ''}
        ${hasResult ? 'border-green-500/20' : ''}
      `}
      onClick={handleCardClick}
    >
      {/* LEFT SIDEBAR: Match Info & Format */}
      <div className="w-9 bg-black/20 border-r border-white/5 flex flex-col items-center justify-between py-2">
        <span className="text-[10px] text-gray-500 font-mono font-medium">
          M{(match.bracket_position ?? 0) + 1}
        </span>

        {/* Format badge (BO) - display only */}
        <span className="text-[10px] font-bold font-mono text-gray-500">
          {match.match_format || 'BO3'}
        </span>
      </div>

      {/* RIGHT CONTENT: Date & Teams */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Date Header */}
        {/* Date Header: Always visible for consistent height */}
        <div className="px-3 py-1 border-b border-white/5 flex items-center justify-center bg-white/[0.02] h-6">
          {match.start_time ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-cyan-400 font-medium whitespace-nowrap">
                {new Date(match.start_time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
              </span>
              <span className="text-[8px] text-cyan-600/50">•</span>
              <span className="text-[9px] text-cyan-300/90 font-mono">
                {new Date(match.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ) : (
            isBye ? <span className="text-[9px] text-amber-500/50 font-bold tracking-wider">BYE</span> : <span className="text-[9px] text-white/10 font-mono">--/--</span>
          )}
        </div>


        {/* Team A */}
        <div
          className={`
          px-3 py-2.5 flex items-center justify-between gap-2 border-b border-white/5
          ${teamAWon ? 'bg-green-500/10' : ''}
        `}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {teams?.find(t => t.name === match.team_a)?.logo && (
              <img
                src={teams.find(t => t.name === match.team_a)?.logo}
                alt={match.team_a}
                className="w-5 h-5 object-contain flex-shrink-0"
              />
            )}
            <span
              className={`
              text-sm font-medium truncate
              ${match.team_a === 'TBD' ? 'text-gray-500 italic' : ''}
              ${teamAWon ? 'text-green-400' : 'text-gray-300'}
              ${teamBWon ? 'text-gray-500' : ''}
            `}
            >
              {match.team_a === 'TBD' ? 'À définir' : match.team_a}
            </span>
          </div>

          {/* Score or Winner Indicator */}
          <div className="flex items-center gap-2">
            {hasResult && scoreA !== null && (
              <span className={`font-mono font-bold text-sm ${teamAWon ? 'text-green-400' : 'text-gray-500'}`}>
                {scoreA}
              </span>
            )}
            {teamAWon && !hasResult && (
              <span className="text-green-400 text-xs font-bold">W</span>
            )}
          </div>
        </div>

        {/* Team B */}
        <div
          className={`
          px-3 py-2.5 flex items-center justify-between gap-2 border-t border-transparent
          ${teamBWon ? 'bg-green-500/10' : ''}
        `}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {teams?.find(t => t.name === match.team_b)?.logo && (
              <img
                src={teams.find(t => t.name === match.team_b)?.logo}
                alt={match.team_b}
                className="w-5 h-5 object-contain flex-shrink-0"
              />
            )}
            <span
              className={`
              text-sm font-medium truncate
              ${match.team_b === 'TBD' ? 'text-gray-500 italic' : ''}
              ${teamBWon ? 'text-green-400' : 'text-gray-300'}
              ${teamAWon ? 'text-gray-500' : ''}
            `}
            >
              {match.team_b === 'TBD' ? 'À définir' : match.team_b}
            </span>
          </div>
          {/* Score or Winner Indicator */}
          <div className="flex items-center gap-2">
            {hasResult && scoreB !== null && (
              <span className={`font-mono font-bold text-sm ${teamBWon ? 'text-green-400' : 'text-gray-500'}`}>
                {scoreB}
              </span>
            )}
            {teamBWon && !hasResult && (
              <span className="text-green-400 text-xs font-bold">W</span>
            )}
          </div>
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
                  if (!isTBD) onPredict(match)
                }}
                disabled={isTBD}
                className={`
                  flex-1 px-2 py-1 text-[10px] font-medium rounded transition-colors
                  ${isTBD
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                    : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 cursor-pointer'}
                `}
              >
                Pronostiquer
              </button>
            )}
            {/* Bouton modifier pronostic */}
            {prediction && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPredict!(match)
                }}
                className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors h-auto whitespace-normal text-center leading-tight cursor-pointer"
                title={`Modifier: ${prediction.predicted_winner} (${prediction.predicted_score})`}
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
