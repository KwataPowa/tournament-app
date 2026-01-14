import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Match, Prediction, MatchFormat } from '../../types'
import { ChevronDown } from 'lucide-react'

type BracketMatchCardProps = {
  match: Match
  prediction?: Prediction
  isAdmin: boolean
  tournamentStatus: 'draft' | 'active' | 'completed'
  canAssignTeams?: boolean // Contrôlé par le parent (round précédent terminé)
  onAssignTeam?: (match: Match, slot: 'team_a' | 'team_b') => void
  onEnterResult?: (match: Match) => void
  onPredict?: (match: Match) => void
  onChangeFormat?: (match: Match, format: MatchFormat) => void
  teams?: { name: string; logo?: string }[]
}

const FORMAT_OPTIONS: MatchFormat[] = ['BO1', 'BO3', 'BO5', 'BO7']

export function BracketMatchCard({
  match,
  prediction,
  isAdmin,
  tournamentStatus,
  canAssignTeams: canAssignFromParent,
  onAssignTeam,
  onEnterResult,
  onPredict,
  onChangeFormat,
  teams,
}: BracketMatchCardProps) {
  const [showFormatMenu, setShowFormatMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleOpenMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX
      })
      setShowFormatMenu((prev) => !prev)
    }
  }


  const isTBD = match.team_a === 'TBD' || match.team_b === 'TBD'
  const hasResult = match.result !== null
  const isBye = match.is_bye
  const isClickable = (!isBye && !isTBD) || (tournamentStatus === 'draft' && isAdmin)

  // L'assignation est contrôlée par le parent (vérifie si le round précédent est terminé)
  const canAssignTeams = canAssignFromParent && isAdmin && !hasResult

  // Determine what action is available
  const handleTeamClick = (slot: 'team_a' | 'team_b') => {
    if (canAssignTeams && onAssignTeam) {
      onAssignTeam(match, slot)
    }
  }

  // Actions disponibles
  const canPredict = tournamentStatus === 'active' && !isTBD && !isBye && !hasResult && onPredict
  const canEnterResult = tournamentStatus === 'active' && !isTBD && !isBye && !hasResult && isAdmin && onEnterResult

  const handleCardClick = () => {
    if (isBye) return

    // Draft mode admin edit
    if (tournamentStatus === 'draft' && isAdmin && onEdit) {
      onEdit(match)
      return
    }

    if (isTBD) return

    // Les utilisateurs non-admin peuvent pronostiquer en cliquant sur la carte
    if (tournamentStatus === 'active' && !isAdmin && !hasResult && onPredict) {
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
        ${isClickable && tournamentStatus === 'active' ? 'hover:border-violet-500/30 hover:bg-white/[0.07]' : ''}
        ${hasResult ? 'border-green-500/20' : ''}
      `}
      onClick={handleCardClick}
    >
      {/* LEFT SIDEBAR: Match Info & Format */}
      <div className="w-9 bg-black/20 border-r border-white/5 flex flex-col items-center justify-between py-2">
        <span className="text-[10px] text-gray-500 font-mono font-medium">
          M{(match.bracket_position ?? 0) + 1}
        </span>

        {/* Format badge (BO) - clickable in draft mode for admin */}
        {tournamentStatus === 'draft' && isAdmin && onChangeFormat ? (
          <>
            <button
              ref={buttonRef}
              onClick={handleOpenMenu}
              className="flex flex-col items-center gap-0.5 w-full px-0.5 py-1 rounded hover:bg-white/5 transition-colors group cursor-pointer"
              title="Changer le format"
            >
              <span className="text-[9px] font-bold text-violet-400 group-hover:text-violet-300">
                {match.match_format || 'BO3'}
              </span>
              <ChevronDown className="w-2.5 h-2.5 text-violet-500/50 group-hover:text-violet-400" />
            </button>
            {showFormatMenu && createPortal(
              <>
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowFormatMenu(false)
                  }}
                />
                <div
                  className="absolute z-[9999] bg-gray-900 border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[80px]"
                  style={{
                    top: menuPosition.top,
                    left: menuPosition.left,
                  }}
                >
                  {FORMAT_OPTIONS.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={(e) => {
                        e.stopPropagation()
                        onChangeFormat(match, fmt)
                        setShowFormatMenu(false)
                      }}
                      className={`
                        block w-full px-4 py-2 text-sm font-mono text-left transition-colors
                        ${match.match_format === fmt ? 'bg-violet-500/20 text-violet-400' : 'text-gray-300 hover:bg-white/10'}
                      `}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </>,
              document.body
            )}
          </>
        ) : (
          <span className="text-[10px] font-bold font-mono text-gray-500">
            {match.match_format || 'BO3'}
          </span>
        )}
      </div>

      {/* RIGHT CONTENT: Date & Teams */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Date Header */}
        {(match.start_time || isBye) && (
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
              isBye && <span className="text-[9px] text-amber-500/50 font-bold tracking-wider">BYE</span>
            )}
          </div>
        )}


        {/* Team A */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            handleTeamClick('team_a')
          }}
          className={`
          px-3 py-2.5 flex items-center justify-between gap-2 border-b border-white/5
          ${teamAWon ? 'bg-green-500/10' : ''}
          ${canAssignTeams ? 'cursor-pointer hover:bg-white/5' : ''}
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
          onClick={(e) => {
            e.stopPropagation()
            handleTeamClick('team_b')
          }}
          className={`
          px-3 py-2.5 flex items-center justify-between gap-2 border-t border-transparent
          ${teamBWon ? 'bg-green-500/10' : ''}
          ${canAssignTeams ? 'cursor-pointer hover:bg-white/5' : ''}
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

        {/* Action buttons for active tournament */}
        {tournamentStatus === 'active' && !hasResult && !isTBD && !isBye && (
          <div className="px-2 py-1.5 border-t border-white/5 flex gap-1">
            {/* Bouton pronostiquer */}
            {canPredict && !prediction && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPredict!(match)
                }}
                className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors cursor-pointer"
              >
                Pronostiquer
              </button>
            )}
            {/* Bouton modifier pronostic */}
            {canPredict && prediction && (
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
            {/* Bouton résultat (admin) */}
            {canEnterResult && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEnterResult!(match)
                }}
                className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors cursor-pointer"
              >
                Résultat
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

        {/* Bye indicator handled in header or subtle styling */}
      </div>
    </div>
  )
}
