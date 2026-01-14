import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Match, Team } from '../types'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

type TeamAssignModalProps = {
  match: Match
  slot: 'team_a' | 'team_b'
  availableTeams: Team[] // Si vide, permettre l'entrée libre
  assignedTeams: string[] // Liste des équipes déjà assignées (pour éviter les doublons)
  onAssign: (teamName: string) => Promise<void>
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
    try {
      await onAssign(trimmedName)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop modal-backdrop-enter">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

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
                  {teamsToShow.map((team) => (
                    <button
                      key={team.name}
                      type="button"
                      onClick={() => handleSelectTeam(team.name)}
                      className={`
                        group relative p-3 rounded-xl text-left transition-all duration-300 overflow-hidden
                        ${teamName === team.name
                          ? 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-2 border-cyan-500 shadow-lg shadow-cyan-500/20'
                          : 'bg-white/5 border-2 border-white/10 hover:border-white/20 hover:bg-white/10'
                        }
                      `}
                    >
                      {teamName === team.name && (
                        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent" />
                      )}
                      <div className="relative flex items-center gap-2">
                        {team.logo ? (
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
                        <span
                          className={`
                            text-sm font-medium truncate
                            ${teamName === team.name ? 'text-cyan-400' : 'text-gray-300'}
                          `}
                        >
                          {team.name}
                        </span>
                      </div>
                      {teamName === team.name && (
                        <span className="absolute top-2 right-2 text-cyan-400 text-sm">✓</span>
                      )}
                    </button>
                  ))}
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
    </div>
  )
}
