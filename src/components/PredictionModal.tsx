import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { FormEvent } from 'react'
import type { Match, MatchFormat, Prediction } from '../types'
import { Button } from './ui/Button'

type PredictionModalProps = {
  match: Match
  existingPrediction: Prediction | null
  onSave: (prediction: { predicted_winner: string; predicted_score: string }) => Promise<void>
  onClose: () => void
  roundDate?: string
  teams?: { name: string; logo?: string }[]
}

// Generates possible scores for a given format
function getPossibleScores(format: MatchFormat, winner: 'team_a' | 'team_b'): string[] {
  const winsNeeded: Record<MatchFormat, number> = {
    BO1: 1,
    BO3: 2,
    BO5: 3,
    BO7: 4,
  }

  const wins = winsNeeded[format]
  const scores: string[] = []

  // The winner always has the needed wins
  // The loser has 0 to (wins - 1) wins
  for (let loserWins = 0; loserWins < wins; loserWins++) {
    if (winner === 'team_a') {
      scores.push(`${wins}-${loserWins}`)
    } else {
      scores.push(`${loserWins}-${wins}`)
    }
  }

  return scores
}

export function PredictionModal({
  match,
  existingPrediction,
  onSave,
  onClose,
  roundDate,
  teams,
}: PredictionModalProps) {
  const initialWinner = existingPrediction?.predicted_winner === match.team_a
    ? 'team_a'
    : existingPrediction?.predicted_winner === match.team_b
      ? 'team_b'
      : ''

  const [winner, setWinner] = useState<'team_a' | 'team_b' | ''>(initialWinner)
  const [score, setScore] = useState(existingPrediction?.predicted_score || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const possibleScores = winner ? getPossibleScores(match.match_format, winner) : []

  // Reset score when winner changes
  const handleWinnerChange = (newWinner: 'team_a' | 'team_b') => {
    setWinner(newWinner)
    const newPossibleScores = getPossibleScores(match.match_format, newWinner)
    // Auto-select first score option
    setScore(newPossibleScores[0] || '')
  }

  const getTeamLogo = (teamName: string) => {
    return teams?.find(t => t.name === teamName)?.logo
  }

  // Check lock status in real-time
  const currentNow = new Date()
  const currentEffectiveTime = match.start_time
    ? new Date(match.start_time)
    : roundDate
      ? new Date(roundDate)
      : null
  const currentIsStarted = currentEffectiveTime ? currentNow >= currentEffectiveTime : false
  const isLocked = match.result !== null || currentIsStarted

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!winner) {
      setError('Sélectionne le vainqueur')
      return
    }

    if (isLocked) {
      setError('Le match a commencé, les pronostics sont verrouillés.')
      return
    }

    if (match.is_bye || match.team_a === 'BYE' || match.team_b === 'BYE') {
      setError('Impossible de pronostiquer sur un match exempté.')
      return
    }

    if (!score) {
      setError('Sélectionne le score')
      return
    }

    setLoading(true)
    try {
      await onSave({
        predicted_winner: winner === 'team_a' ? match.team_a : match.team_b,
        predicted_score: score,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  // Prevent Body Scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const isEditing = existingPrediction !== null

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop - Fixed */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm modal-backdrop modal-backdrop-enter"
        onClick={onClose}
      />

      {/* Scroll Wrapper */}
      <div
        className="fixed inset-0 z-10 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        onClick={onClose}
      >
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Modal */}
          <div
            className="relative w-full max-w-md glass-modal rounded-2xl modal-enter my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-violet-600/20 blur-[60px] pointer-events-none" />

            {/* Header */}
            <div className="relative px-6 py-5 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                  <span className="text-lg">🎯</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {isEditing ? 'Modifier mon pronostic' : 'Faire un pronostic'}
                  </h2>
                  <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                    {getTeamLogo(match.team_a) ? (
                      <img src={getTeamLogo(match.team_a)} alt={match.team_a} className="w-5 h-5 object-contain" />
                    ) : (
                      <span>{match.team_a}</span>
                    )}
                    <span className="text-gray-600 font-bold">vs</span>
                    {getTeamLogo(match.team_b) ? (
                      <img src={getTeamLogo(match.team_b)} alt={match.team_b} className="w-5 h-5 object-contain" />
                    ) : (
                      <span>{match.team_b}</span>
                    )}
                    <span className="ml-2 px-2 py-0.5 text-xs bg-white/10 rounded-full">{match.match_format}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content - Scrollable Area */}
            <div className="overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSubmit} className="relative p-6 space-y-6">
                {/* Winner selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Qui va gagner ?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleWinnerChange('team_a')}
                      className={`
                  group relative py-4 px-4 rounded-xl font-semibold transition-all duration-300 overflow-hidden flex flex-col items-center justify-center gap-2
                  ${winner === 'team_a'
                          ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-2 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20'
                          : 'bg-white/5 border-2 border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/10'
                        }
                `}
                    >
                      {winner === 'team_a' && (
                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent" />
                      )}

                      {getTeamLogo(match.team_a) ? (
                        <img src={getTeamLogo(match.team_a)} alt={match.team_a} className="w-12 h-12 object-contain" />
                      ) : (
                        <span className="relative text-lg">{match.team_a}</span>
                      )}

                      {getTeamLogo(match.team_a) && (
                        <span className="relative text-xs opacity-70">{match.team_a}</span>
                      )}

                      {winner === 'team_a' && (
                        <span className="absolute top-2 right-2 text-emerald-400 text-sm">✓</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWinnerChange('team_b')}
                      className={`
                  group relative py-4 px-4 rounded-xl font-semibold transition-all duration-300 overflow-hidden flex flex-col items-center justify-center gap-2
                  ${winner === 'team_b'
                          ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-2 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20'
                          : 'bg-white/5 border-2 border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/10'
                        }
                `}
                    >
                      {winner === 'team_b' && (
                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent" />
                      )}

                      {getTeamLogo(match.team_b) ? (
                        <img src={getTeamLogo(match.team_b)} alt={match.team_b} className="w-12 h-12 object-contain" />
                      ) : (
                        <span className="relative text-lg">{match.team_b}</span>
                      )}

                      {getTeamLogo(match.team_b) && (
                        <span className="relative text-xs opacity-70">{match.team_b}</span>
                      )}

                      {winner === 'team_b' && (
                        <span className="absolute top-2 right-2 text-emerald-400 text-sm">✓</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Score selection */}
                {winner && (
                  <div className="animate-slide-up">
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Avec quel score ?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {possibleScores.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setScore(s)}
                          className={`
                      py-2.5 px-5 rounded-lg font-mono font-bold text-lg transition-all duration-200
                      ${score === s
                              ? 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-2 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-500/20'
                              : 'bg-white/5 border-2 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
                            }
                    `}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-slide-up">
                    <p className="text-sm text-red-400 flex items-center gap-2">
                      <span>⚠️</span> {error}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={loading || !winner || !score || isLocked}
                    isLoading={loading}
                    className="flex-1"
                  >
                    {isLocked ? 'Verrouillé' : (isEditing ? 'Modifier' : 'Valider le pronostic')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
