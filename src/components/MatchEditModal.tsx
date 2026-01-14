import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { Match, MatchFormat } from '../types'
import { Button } from './ui/Button'

type MatchEditModalProps = {
  match: Match | null // null = création
  teams: string[]
  maxRound: number
  defaultRound?: number
  existingMatches: Match[]
  homeAndAway: boolean
  onSave: (data: {
    team_a: string
    team_b: string
    round: number
    match_format: MatchFormat
  }) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

const MATCH_FORMATS: { value: MatchFormat; label: string }[] = [
  { value: 'BO1', label: 'BO1' },
  { value: 'BO3', label: 'BO3' },
  { value: 'BO5', label: 'BO5' },
  { value: 'BO7', label: 'BO7' },
]

export function MatchEditModal({
  match,
  teams,
  maxRound,
  defaultRound = 1,
  existingMatches,
  homeAndAway,
  onSave,
  onDelete,
  onClose,
}: MatchEditModalProps) {
  const [teamA, setTeamA] = useState(match?.team_a || '')
  const [teamB, setTeamB] = useState(match?.team_b || '')
  const [round, setRound] = useState(match?.round || defaultRound)
  const [matchFormat, setMatchFormat] = useState<MatchFormat>(match?.match_format || 'BO3')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = match !== null

  useEffect(() => {
    if (match) {
      setTeamA(match.team_a)
      setTeamB(match.team_b)
      setRound(match.round)
      setMatchFormat(match.match_format)
    }
  }, [match])

  // Vérifie si un match est un doublon
  const isDuplicateMatch = (a: string, b: string): string | null => {
    // Exclure le match en cours d'édition
    const otherMatches = existingMatches.filter(m => m.id !== match?.id)

    for (const m of otherMatches) {
      // Match identique (A vs B existe déjà)
      if (m.team_a === a && m.team_b === b) {
        return `Le match ${a} vs ${b} existe déjà`
      }

      // En aller simple: B vs A compte aussi comme doublon
      // En aller-retour: B vs A est autorisé (match retour)
      if (!homeAndAway && m.team_a === b && m.team_b === a) {
        return `Le match ${b} vs ${a} existe déjà (même confrontation)`
      }

      // En aller-retour: vérifier qu'on n'a pas déjà les 2 matchs
      if (homeAndAway && m.team_a === b && m.team_b === a) {
        // Le match retour existe, vérifier si le match aller existe aussi
        const hasAllerMatch = otherMatches.some(
          other => other.team_a === a && other.team_b === b
        )
        if (hasAllerMatch) {
          return `Les deux matchs ${a} vs ${b} et ${b} vs ${a} existent déjà`
        }
      }
    }

    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!teamA || !teamB) {
      setError('Les deux équipes sont requises')
      return
    }

    if (teamA === teamB) {
      setError('Les équipes doivent être différentes')
      return
    }

    // Vérification des doublons
    const duplicateError = isDuplicateMatch(teamA, teamB)
    if (duplicateError) {
      setError(duplicateError)
      return
    }

    setLoading(true)
    try {
      await onSave({
        team_a: teamA,
        team_b: teamB,
        round,
        match_format: matchFormat,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete || !confirm('Supprimer ce match ?')) return

    setLoading(true)
    try {
      await onDelete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  // Filter available teams for each dropdown
  const availableTeamsA = teams.filter(t => t !== teamB)
  const availableTeamsB = teams.filter(t => t !== teamA)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop modal-backdrop-enter">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass-modal rounded-2xl overflow-hidden modal-enter">
        {/* Decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-cyan-600/20 blur-[60px] pointer-events-none" />

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <span className="text-lg">{isEdit ? '✏️' : '➕'}</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isEdit ? 'Modifier le match' : 'Ajouter un match'}
              </h2>
              <p className="text-sm text-gray-400">
                {isEdit ? 'Modifie les détails du match' : 'Configure un nouveau match'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="relative p-6 space-y-6">
          {/* Teams selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Équipe A
              </label>
              {teams.length > 0 ? (
                <div className="relative">
                  <select
                    value={teamA}
                    onChange={(e) => setTeamA(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer transition-all duration-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 hover:bg-white/10"
                  >
                    <option value="" className="bg-[#1a1625] text-gray-400">Sélectionner...</option>
                    {availableTeamsA.map((team) => (
                      <option key={team} value={team} className="bg-[#1a1625] text-white">
                        {team}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={teamA}
                  onChange={(e) => setTeamA(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  placeholder="Nom équipe"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Équipe B
              </label>
              {teams.length > 0 ? (
                <div className="relative">
                  <select
                    value={teamB}
                    onChange={(e) => setTeamB(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer transition-all duration-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 hover:bg-white/10"
                  >
                    <option value="" className="bg-[#1a1625] text-gray-400">Sélectionner...</option>
                    {availableTeamsB.map((team) => (
                      <option key={team} value={team} className="bg-[#1a1625] text-white">
                        {team}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={teamB}
                  onChange={(e) => setTeamB(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  placeholder="Nom équipe"
                />
              )}
            </div>
          </div>

          {/* VS indicator */}
          {teamA && teamB && (
            <div className="flex items-center justify-center gap-4 py-2 animate-slide-up">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10" />
              <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                <span className="font-semibold text-gray-300">{teamA}</span>
                <span className="mx-3 text-violet-400 font-bold">VS</span>
                <span className="font-semibold text-gray-300">{teamB}</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10" />
            </div>
          )}

          {/* Round and Format */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Journée
              </label>
              <input
                type="number"
                min="1"
                max={maxRound + 10}
                value={round}
                onChange={(e) => setRound(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono transition-all duration-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Format
              </label>
              <div className="flex gap-2">
                {MATCH_FORMATS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMatchFormat(value)}
                    className={`
                      flex-1 py-3 px-2 rounded-lg font-mono font-semibold text-sm transition-all duration-200
                      ${matchFormat === value
                        ? 'bg-violet-500/20 border-2 border-violet-500 text-violet-400'
                        : 'bg-white/5 border-2 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

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
              disabled={loading}
              isLoading={loading}
              className="flex-1"
            >
              {isEdit ? 'Enregistrer' : 'Ajouter le match'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Annuler
            </Button>
          </div>

          {/* Delete button */}
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="w-full py-2.5 px-4 text-red-400 hover:text-red-300 hover:bg-red-500/10 font-medium rounded-lg transition-all duration-200 text-sm border border-transparent hover:border-red-500/20"
            >
              Supprimer ce match
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
