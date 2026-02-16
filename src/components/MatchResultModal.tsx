import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { FormEvent } from 'react'
import type { Match, MatchFormat, MatchResult } from '../types'
import { Button } from './ui/Button'
import { AlertTriangle } from 'lucide-react'

type MatchResultModalProps = {
  match: Match
  onSave: (result: MatchResult) => Promise<void>
  onClose: () => void
  /** Indique si c'est un match de bracket (affiche l'avertissement effet domino) */
  isBracket?: boolean
}

// Génère les scores possibles pour un format donné
function getPossibleScores(format: MatchFormat, winner: 'team_a' | 'team_b'): string[] {
  const winsNeeded: Record<MatchFormat, number> = {
    BO1: 1,
    BO3: 2,
    BO5: 3,
    BO7: 4,
  }

  const wins = winsNeeded[format]
  const scores: string[] = []

  // Le gagnant a toujours le nombre de victoires nécessaires
  // Le perdant a de 0 à (wins - 1) victoires
  for (let loserWins = 0; loserWins < wins; loserWins++) {
    if (winner === 'team_a') {
      scores.push(`${wins}-${loserWins}`)
    } else {
      scores.push(`${loserWins}-${wins}`)
    }
  }

  return scores
}

export function MatchResultModal({
  match,
  onSave,
  onClose,
  isBracket = false,
}: MatchResultModalProps) {
  const [winner, setWinner] = useState<'team_a' | 'team_b' | ''>(
    match.result?.winner === match.team_a ? 'team_a' :
      match.result?.winner === match.team_b ? 'team_b' : ''
  )
  const [score, setScore] = useState(match.result?.score || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Détecter si c'est une correction (résultat existe déjà)
  const isCorrection = match.result !== null

  const possibleScores = winner ? getPossibleScores(match.match_format, winner) : []

  // Reset score when winner changes
  const handleWinnerChange = (newWinner: 'team_a' | 'team_b') => {
    setWinner(newWinner)
    const newPossibleScores = getPossibleScores(match.match_format, newWinner)
    // Auto-select first score option
    setScore(newPossibleScores[0] || '')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!winner) {
      setError('Sélectionne le vainqueur')
      return
    }

    if (!score) {
      setError('Sélectionne le score')
      return
    }

    setLoading(true)
    try {
      await onSave({
        winner: winner === 'team_a' ? match.team_a : match.team_b,
        score,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 modal-backdrop modal-backdrop-enter">
      {/* Backdrop click to close */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-modal rounded-2xl overflow-hidden modal-enter">
        {/* Decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-amber-600/20 blur-[60px] pointer-events-none" />

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
              isCorrection
                ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-500/25'
                : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25'
            }`}>
              {isCorrection ? (
                <AlertTriangle className="w-5 h-5 text-white" />
              ) : (
                <span className="text-lg">📋</span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isCorrection ? 'Corriger le résultat' : 'Entrer le résultat'}
              </h2>
              <p className="text-sm text-gray-400">
                {match.team_a} vs {match.team_b}
                <span className="ml-2 px-2 py-0.5 text-xs bg-white/10 rounded-full">{match.match_format}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="relative p-6 space-y-6">
          {/* Sélection du vainqueur */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Vainqueur du match
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleWinnerChange('team_a')}
                className={`
                  group relative py-4 px-4 rounded-xl font-semibold transition-all duration-300 overflow-hidden
                  ${winner === 'team_a'
                    ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-2 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'bg-white/5 border-2 border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/10'
                  }
                `}
              >
                {winner === 'team_a' && (
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent" />
                )}
                <span className="relative">{match.team_a}</span>
                {winner === 'team_a' && (
                  <span className="absolute top-2 right-2 text-emerald-400 text-sm">✓</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleWinnerChange('team_b')}
                className={`
                  group relative py-4 px-4 rounded-xl font-semibold transition-all duration-300 overflow-hidden
                  ${winner === 'team_b'
                    ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-2 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'bg-white/5 border-2 border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/10'
                  }
                `}
              >
                {winner === 'team_b' && (
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent" />
                )}
                <span className="relative">{match.team_b}</span>
                {winner === 'team_b' && (
                  <span className="absolute top-2 right-2 text-emerald-400 text-sm">✓</span>
                )}
              </button>
            </div>
          </div>

          {/* Sélection du score */}
          {winner && (
            <div className="animate-slide-up">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Score final
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
                        ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/20'
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

          {/* Rappel réassignation manuelle (brackets uniquement) */}
          {isCorrection && isBracket && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg animate-slide-up">
              <p className="text-sm text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Rappel :</strong> pense à réassigner manuellement les équipes dans les matchs des rounds suivants si le résultat change l'équipe qualifiée.
                </span>
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-slide-up">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {error}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading || !winner || !score}
              isLoading={loading}
              className="flex-1"
            >
              {isCorrection ? 'Corriger le résultat' : 'Enregistrer le résultat'}
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
    </div>,
    document.body
  )
}
