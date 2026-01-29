import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { FormEvent } from 'react'
import type { Match, Team } from '../types'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Trophy } from 'lucide-react'

type TeamAssignModalProps = {
  match: Match
  slot: 'team_a' | 'team_b'
  availableTeams: Team[] // Si vide, permettre l'entrée libre
  assignedTeams: string[] // Liste des équipes déjà assignées (pour éviter les doublons)
  onAssign: (teamName: string, startTime?: string | null) => Promise<void>
  onRemove: () => Promise<void>
  onClose: () => void
}

export function TeamAssignModal({
  match,
  slot,
  availableTeams,
  assignedTeams,
  onAssign,
  onRemove,
  onClose,
}: TeamAssignModalProps) {
  const currentTeam = slot === 'team_a' ? match.team_a : match.team_b
  const hasTeam = currentTeam !== 'TBD'

  const [teamName, setTeamName] = useState(hasTeam ? currentTeam : '')

  // Helper to format date for input (YYYY-MM-DDTHH:mm)
  const formatForInput = (isoString?: string | null) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const offset = date.getTimezoneOffset()
    const localDate = new Date(date.getTime() - (offset * 60 * 1000))
    return localDate.toISOString().slice(0, 16)
  }

  const [startTime, setStartTime] = useState(formatForInput(match.start_time))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mode sélection si availableTeams est fourni, sinon mode entrée libre
  const isSelectionMode = availableTeams.length > 0

  // Filter out already assigned teams (but include current team if editing)
  const teamsToShow = isSelectionMode
    ? availableTeams.filter(
      (team) => !assignedTeams.includes(team.name) || team.name === currentTeam
    )
    : []

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedName = teamName.trim()

    if (!trimmedName) {
      setError("Le nom de l'équipe est requis")
      return
    }

    if (trimmedName.length < 2) {
      setError("Le nom doit contenir au moins 2 caractères")
      return
    }

    // Vérifier les doublons (sauf si c'est l'équipe actuelle)
    if (trimmedName !== currentTeam && assignedTeams.includes(trimmedName)) {
      setError("Cette équipe est déjà assignée à un autre match")
      return
    }

    setLoading(true)
    setLoading(true)
    try {
      await onAssign(trimmedName, startTime ? new Date(startTime).toISOString() : null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    setLoading(true)
    setError(null)
    try {
      await onRemove()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTeam = (name: string) => {
    setTeamName(name)
    setError(null)
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 modal-backdrop modal-backdrop-enter">
      {/* Backdrop click to close */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-modal rounded-2xl overflow-hidden modal-enter">
        {/* Decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-cyan-600/20 blur-[60px] pointer-events-none" />

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-white font-bold">
              {slot === 'team_a' ? '1' : '2'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {hasTeam ? "Modifier l'équipe" : 'Assigner une équipe'}
              </h2>
              <p className="text-sm text-gray-400">
                Match {(match.bracket_position ?? 0) + 1} - Slot {slot === 'team_a' ? 'A (haut)' : 'B (bas)'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="relative p-6 space-y-6">
          {/* Mode entrée libre */}
          {!isSelectionMode && (
            <div>
              <Input
                label="Nom de l'équipe"
                type="text"
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value)
                  setError(null)
                }}
                placeholder="Ex: Team Liquid"
                error={error || undefined}
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500">
                Entrez le nom de l'équipe pour ce slot. Les doublons ne sont pas autorisés.
              </p>
            </div>
          )}

          {/* Date and Time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date et Heure du match
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono transition-all duration-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 [color-scheme:dark]"
            />
            <p className="mt-2 text-xs text-gray-500">
              Définissez quand ce match aura lieu (optionnel).
            </p>
          </div>

          {/* Mode sélection */}
          {isSelectionMode && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Sélectionne une équipe
              </label>

              {teamsToShow.length === 0 ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-sm text-amber-400 text-center">
                    Toutes les équipes sont déjà assignées
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                  {teamsToShow.map((team) => {
                    const isBye = team.name === 'BYE'
                    return (
                      <button
                        key={team.name}
                        type="button"
                        onClick={() => handleSelectTeam(team.name)}
                        className={`
                          group relative p-3 rounded-xl text-left transition-all duration-300 overflow-hidden
                          ${teamName === team.name
                            ? isBye
                              ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20'
                              : 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-2 border-cyan-500 shadow-lg shadow-cyan-500/20'
                            : isBye
                              ? 'bg-emerald-500/5 border-2 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/10'
                              : 'bg-white/5 border-2 border-white/10 hover:border-white/20 hover:bg-white/10'
                          }
                        `}
                      >
                        {teamName === team.name && (
                          <div className={`absolute inset-0 bg-gradient-to-t ${isBye ? 'from-emerald-500/10' : 'from-cyan-500/10'} to-transparent`} />
                        )}
                        <div className="relative flex items-center gap-2">
                          {isBye ? (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/40 to-green-500/40 flex items-center justify-center">
                              <Trophy className="w-4 h-4 text-emerald-400" />
                            </div>
                          ) : team.logo ? (
                            <img
                              src={team.logo}
                              alt={team.name}
                              className="w-8 h-8 rounded-lg object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center text-xs font-bold text-white/60">
                              {team.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span
                              className={`
                                text-sm font-medium truncate
                                ${teamName === team.name
                                  ? isBye ? 'text-emerald-400' : 'text-cyan-400'
                                  : isBye ? 'text-emerald-400' : 'text-gray-300'
                                }
                              `}
                            >
                              {isBye ? 'Passage Auto' : team.name}
                            </span>
                            {isBye && (
                              <span className="text-[10px] text-emerald-500/70">Avance directement</span>
                            )}
                          </div>
                        </div>
                        {teamName === team.name && (
                          <span className={`absolute top-2 right-2 text-sm ${isBye ? 'text-emerald-400' : 'text-cyan-400'}`}>✓</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Error message (for selection mode) */}
          {isSelectionMode && error && (
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
              disabled={loading || !teamName.trim()}
              isLoading={loading}
              className="flex-1"
            >
              {hasTeam ? 'Modifier' : 'Assigner'}
            </Button>
            {hasTeam && (
              <Button
                type="button"
                variant="danger"
                onClick={handleRemove}
                disabled={loading}
              >
                Retirer
              </Button>
            )}
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
