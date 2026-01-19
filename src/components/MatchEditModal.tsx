import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { FormEvent } from 'react'
import type { Match, MatchFormat, MatchResult } from '../types'
import { Button } from './ui/Button'
import { Trophy } from 'lucide-react'

type MatchEditModalProps = {
  match: Match | null // null = création
  teams: { name: string; logo?: string }[]
  maxRound: number
  defaultRound?: number
  existingMatches: Match[]
  homeAndAway: boolean
  tournamentStatus?: 'draft' | 'active' | 'completed'
  /** Mode bracket: équipes en lecture seule (gérées automatiquement) */
  isBracket?: boolean
  /** Bracket: can teams be edited (phase logic) */
  canEditTeams?: boolean
  /** Bracket: available teams for slot A (excluding already assigned in this round) */
  availableTeamsForSlotA?: { name: string; logo?: string }[]
  /** Bracket: available teams for slot B (excluding already assigned in this round) */
  availableTeamsForSlotB?: { name: string; logo?: string }[]
  roundDates?: Record<string, string>
  onSave: (data: {
    team_a: string
    team_b: string
    round: number
    match_format: MatchFormat
    start_time?: string | null
  }) => Promise<void>
  onSaveResult?: (result: MatchResult) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

const MATCH_FORMATS: { value: MatchFormat; label: string }[] = [
  { value: 'BO1', label: 'BO1' },
  { value: 'BO3', label: 'BO3' },
  { value: 'BO5', label: 'BO5' },
  { value: 'BO7', label: 'BO7' },
]

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

  for (let loserWins = 0; loserWins < wins; loserWins++) {
    if (winner === 'team_a') {
      scores.push(`${wins}-${loserWins}`)
    } else {
      scores.push(`${loserWins}-${wins}`)
    }
  }

  return scores
}

// Custom Select Component for Teams with Logos
function TeamSelect({
  value,
  onChange,
  teams,
  placeholder = "Sélectionner..."
}: {
  value: string
  onChange: (value: string) => void
  teams: { name: string; logo?: string }[]
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.team-select-container')) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const selectedTeam = teams.find(t => t.name === value)

  return (
    <div className="relative team-select-container">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-left flex items-center justify-between transition-all duration-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 hover:bg-white/10"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selectedTeam ? (
            <>
              {selectedTeam.logo && (
                <img
                  src={selectedTeam.logo}
                  alt={selectedTeam.name}
                  className="w-5 h-5 object-contain flex-shrink-0"
                />
              )}
              <span className="text-white truncate">{selectedTeam.name}</span>
            </>
          ) : (
            <span className="text-gray-400 truncate">{value || placeholder}</span>
          )}
        </div>
        <div className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#1a1625] border border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
          <div className="p-1">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${value === '' ? 'bg-violet-500/20 text-violet-300' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
            >
              {placeholder}
            </button>
            {teams.map((team) => (
              <button
                key={team.name}
                type="button"
                onClick={() => {
                  onChange(team.name)
                  setIsOpen(false)
                }}
                className={`w-full px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${value === team.name ? 'bg-violet-500/20 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
              >
                {team.logo ? (
                  <img src={team.logo} alt={team.name} className="w-6 h-6 object-contain" />
                ) : (
                  <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-[10px] font-bold">
                    {team.name.charAt(0)}
                  </div>
                )}
                <span className="truncate">{team.name}</span>
                {value === team.name && (
                  <span className="ml-auto text-violet-400">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function MatchEditModal({
  match,
  teams,
  maxRound,
  defaultRound = 1,
  existingMatches,
  homeAndAway,
  tournamentStatus = 'draft',
  isBracket = false,
  canEditTeams = false,
  availableTeamsForSlotA = [],
  availableTeamsForSlotB = [],
  roundDates = {},
  onSave,
  onSaveResult,
  onDelete,
  onClose,
}: MatchEditModalProps) {
  const [teamA, setTeamA] = useState(match?.team_a || '')
  const [teamB, setTeamB] = useState(match?.team_b || '')
  const [round, setRound] = useState(match?.round || defaultRound)
  const [matchFormat, setMatchFormat] = useState<MatchFormat>(match?.match_format || 'BO3')

  // Helper: Extract HH:mm from ISO
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const [timeValue, setTimeValue] = useState(formatTime(match?.start_time))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // État pour le résultat
  const [resultWinner, setResultWinner] = useState<'team_a' | 'team_b' | ''>(
    match?.result?.winner === match?.team_a ? 'team_a' :
      match?.result?.winner === match?.team_b ? 'team_b' : ''
  )
  const [resultScore, setResultScore] = useState(match?.result?.score || '')

  const isEdit = match !== null
  const canEditResult = tournamentStatus === 'active' && isEdit && onSaveResult && teamA && teamB

  // Scores possibles basés sur le format et le vainqueur
  const possibleScores = resultWinner ? getPossibleScores(matchFormat, resultWinner) : []

  // Helpers to get logos
  const getLogo = (name: string) => teams.find(t => t.name === name)?.logo

  useEffect(() => {
    if (match) {
      setTeamA(match.team_a)
      setTeamB(match.team_b)
      setRound(match.round)
      setMatchFormat(match.match_format)
      setTimeValue(formatTime(match.start_time))
      // Résultat
      setResultWinner(
        match.result?.winner === match.team_a ? 'team_a' :
          match.result?.winner === match.team_b ? 'team_b' : ''
      )
      setResultScore(match.result?.score || '')
    }
  }, [match])

  // Reset score quand le vainqueur change
  const handleWinnerChange = (winner: 'team_a' | 'team_b') => {
    setResultWinner(winner)
    const newScores = getPossibleScores(matchFormat, winner)
    setResultScore(newScores[0] || '')
  }

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

    // Calculate Final Start Time
    let finalStartTime: string | null = null
    if (timeValue) {
      const [hours, minutes] = timeValue.split(':').map(Number)

      // Determine Base Date
      // 1. Round Date (Global)
      const roundDateStr = roundDates[round.toString()]
      let baseDate: Date

      if (roundDateStr) {
        baseDate = new Date(roundDateStr)
      } else if (match?.start_time) {
        // 2. Existing Match Date (fallback)
        baseDate = new Date(match.start_time)
      } else {
        // 3. Today (fallback)
        baseDate = new Date()
      }

      // Apply time
      baseDate.setHours(hours, minutes, 0, 0)
      finalStartTime = baseDate.toISOString()
    }

    // Pour les brackets: validation différente
    if (isBracket) {
      setLoading(true)
      try {
        // En mode bracket, on ne modifie QUE le format et la date via onSave
        // Les équipes sont gérées automatiquement par la progression
        await onSave({
          team_a: teamA, // Inchangé car readonly
          team_b: teamB, // Inchangé car readonly
          round,
          match_format: matchFormat,
          start_time: finalStartTime,
        })

        // Sauvegarder le résultat si rempli
        if (canEditResult && resultWinner && resultScore && onSaveResult) {
          await onSaveResult({
            winner: resultWinner === 'team_a' ? teamA : teamB,
            score: resultScore,
          })
        }

        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur')
      } finally {
        setLoading(false)
      }
      return
    }

    // Mode ligue: validation normale
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
      // Sauvegarder les infos du match
      await onSave({
        team_a: teamA,
        team_b: teamB,
        round,
        match_format: matchFormat,
        start_time: finalStartTime,
      })

      // Sauvegarder le résultat si rempli
      if (canEditResult && resultWinner && resultScore && onSaveResult) {
        await onSaveResult({
          winner: resultWinner === 'team_a' ? teamA : teamB,
          score: resultScore,
        })
      }

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
  const availableTeamsA = teams.filter(t => t.name !== teamB)
  const availableTeamsB = teams.filter(t => t.name !== teamA)

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 modal-backdrop modal-backdrop-enter">
      {/* Backdrop click to close */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

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
          {/* Teams display */}
          {isEdit && isBracket ? (
            /* Mode Édition: Affichage simple des équipes VS */
            <div className="flex items-center justify-center gap-4 py-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl text-white">{teamA}</span>
                {getLogo(teamA) && <img src={getLogo(teamA)} alt={teamA} className="w-6 h-6 object-contain" />}
              </div>
              <span className="text-violet-400 font-bold text-lg">VS</span>
              <div className="flex items-center gap-2">
                {getLogo(teamB) && <img src={getLogo(teamB)} alt={teamB} className="w-6 h-6 object-contain" />}
                <span className="font-bold text-xl text-white">{teamB}</span>
              </div>
            </div>
          ) : (
            /* Mode Création: Sélection des équipes */
            isBracket ? (
              /* Mode Bracket: équipes éditables si canEditTeams=true, sinon lecture seule */
              <div className="grid grid-cols-2 gap-4">
                {/* Équipe A */}
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                    Équipe A
                  </label>
                  {canEditTeams && (teamA === 'TBD' || teamA === '') ? (
                    <TeamSelect
                      value={teamA === 'TBD' ? '' : teamA}
                      onChange={(val) => setTeamA(val || 'TBD')}
                      teams={availableTeamsForSlotA.filter(t => t.name !== teamB)}
                    />
                  ) : (
                    <div className={`px-4 py-3 rounded-xl border ${teamA === 'TBD' || teamA === ''
                      ? 'bg-white/5 border-white/10 text-gray-500 italic'
                      : 'bg-white/10 border-white/20 text-white font-semibold'
                      }`}>
                      {teamA === 'TBD' || teamA === '' ? 'À définir' : teamA}
                    </div>
                  )}
                </div>

                {/* VS */}
                <div className="col-span-2 flex justify-center -my-2">
                  <span className="text-violet-400 font-bold text-lg">VS</span>
                </div>

                {/* Équipe B */}
                <div className="col-start-2 -mt-4">
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                    Équipe B
                  </label>
                  {canEditTeams && (teamB === 'TBD' || teamB === '') ? (
                    <TeamSelect
                      value={teamB === 'TBD' ? '' : teamB}
                      onChange={(val) => setTeamB(val || 'TBD')}
                      teams={availableTeamsForSlotB.filter(t => t.name !== teamA)}
                    />
                  ) : (
                    <div className={`px-4 py-3 rounded-xl border ${teamB === 'TBD' || teamB === ''
                      ? 'bg-white/5 border-white/10 text-gray-500 italic'
                      : 'bg-white/10 border-white/20 text-white font-semibold'
                      }`}>
                      {teamB === 'TBD' || teamB === '' ? 'À définir' : teamB}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Mode Ligue: équipes modifiables */
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Équipe A
                  </label>
                  {teams.length > 0 ? (
                    <TeamSelect
                      value={teamA}
                      onChange={setTeamA}
                      teams={availableTeamsA}
                    />
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
                    <TeamSelect
                      value={teamB}
                      onChange={setTeamB}
                      teams={availableTeamsB}
                    />
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
            )
          )}

          {/* VS indicator (ligue seulement, creation only) */}
          {!isBracket && teamA && teamB && (
            <div className="flex items-center justify-center gap-4 py-2 animate-slide-up">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10" />
              <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getLogo(teamA) && <img src={getLogo(teamA)} alt={teamA} className="w-5 h-5 object-contain" />}
                  <span className="font-semibold text-gray-300">{teamA}</span>
                </div>
                <span className="text-violet-400 font-bold">VS</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-300">{teamB}</span>
                  {getLogo(teamB) && <img src={getLogo(teamB)} alt={teamB} className="w-5 h-5 object-contain" />}
                </div>
              </div>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10" />
            </div>
          )}

          {/* Round (ligue) and Format - Readonly in Edit */}
          {isEdit && isBracket ? (
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-lg text-sm text-gray-400">
              <span>Journée {round}</span>
              <span>Format {matchFormat}</span>
            </div>
          ) : (
            <div className={`grid gap-4 ${isBracket ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {!isBracket && (
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
              )}

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
          )}

          {/* Time Only (Date is derived from Round) */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Horaire du match
              </label>
              <span className="text-xs text-cyan-400 font-mono">
                {roundDates[round.toString()]
                  ? new Date(roundDates[round.toString()]).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                  : match?.start_time
                    ? new Date(match.start_time).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                    : "Date non définie"
                }
              </span>
            </div>
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono transition-all duration-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 [color-scheme:dark]"
            />
          </div>

          {/* Section Résultat (seulement en mode actif) */}
          {canEditResult && (
            <div className="border-t border-white/10 pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Résultat du match</h3>
                {match?.result && (
                  <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                    Déjà joué
                  </span>
                )}
              </div>

              {/* Sélection du vainqueur */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Vainqueur
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleWinnerChange('team_a')}
                    className={`
                      py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex flex-col items-center justify-center gap-2
                      ${resultWinner === 'team_a'
                        ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                        : 'bg-white/5 border-2 border-white/10 text-gray-300 hover:border-white/20'
                      }
                    `}
                  >
                    {getLogo(teamA) ? (
                      <div className="flex flex-col items-center">
                        <img src={getLogo(teamA)} alt={teamA} className="w-8 h-8 object-contain mb-1" />
                        <span>{teamA}</span>
                      </div>
                    ) : (
                      teamA
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWinnerChange('team_b')}
                    className={`
                      py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex flex-col items-center justify-center gap-2
                      ${resultWinner === 'team_b'
                        ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                        : 'bg-white/5 border-2 border-white/10 text-gray-300 hover:border-white/20'
                      }
                    `}
                  >
                    {getLogo(teamB) ? (
                      <div className="flex flex-col items-center">
                        <img src={getLogo(teamB)} alt={teamB} className="w-8 h-8 object-contain mb-1" />
                        <span>{teamB}</span>
                      </div>
                    ) : (
                      teamB
                    )}
                  </button>
                </div>
              </div>

              {/* Sélection du score */}
              {resultWinner && (
                <div className="animate-slide-up">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Score
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {possibleScores.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setResultScore(s)}
                        className={`
                          py-2 px-4 rounded-lg font-mono font-bold transition-all duration-200
                          ${resultScore === s
                            ? 'bg-amber-500/20 border-2 border-amber-500 text-amber-400'
                            : 'bg-white/5 border-2 border-white/10 text-gray-400 hover:border-white/20'
                          }
                        `}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
    </div>,
    document.body
  )
}
