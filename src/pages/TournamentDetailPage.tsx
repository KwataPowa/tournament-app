import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../lib/AuthContext'
import { getTournamentWithMatches, updateTournament, deleteTournament } from '../services/tournaments'
import { createMatch, updateMatch, deleteMatch, enterMatchResult } from '../services/matches'
import { assignTeamToMatch, removeTeamFromMatch } from '../services/brackets'
import { getUserPredictionsForTournament, createOrUpdatePrediction } from '../services/predictions'
import { getLeaderboard, type LeaderboardEntry } from '../services/leaderboard'
import { useTournamentRealtime } from '../hooks/useTournamentRealtime'
import { MatchEditModal } from '../components/MatchEditModal'
import { MatchResultModal } from '../components/MatchResultModal'
import { PredictionModal } from '../components/PredictionModal'
import { TeamAssignModal } from '../components/TeamAssignModal'
import { LeaderboardTable } from '../components/LeaderboardTable'
import { LeagueStandingsTable } from '../components/LeagueStandingsTable'
import { LeagueMatchRow } from '../components/LeagueMatchRow'
import { BracketView } from '../components/bracket'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import type { Tournament, Match, MatchFormat, MatchResult, Prediction } from '../types'
import { normalizeTeams } from '../types'
import {
  ScrollText,
  Link as LinkIcon,
  Copy,
  Settings,
  Trash2,
  Trophy,
  Medal,
  Users,
  Calendar,
  Plus,
  ArrowLeft
} from 'lucide-react'

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthContext()
  const navigate = useNavigate()

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Modal state
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [isAddingMatch, setIsAddingMatch] = useState(false)
  const [addingToRound, setAddingToRound] = useState<number>(1)
  const [resultMatch, setResultMatch] = useState<Match | null>(null)
  const [predictionMatch, setPredictionMatch] = useState<Match | null>(null)

  // Bracket team assignment modal state
  const [assignMatch, setAssignMatch] = useState<Match | null>(null)
  const [assignSlot, setAssignSlot] = useState<'team_a' | 'team_b'>('team_a')

  // Round date editing state
  const [editingRoundDate, setEditingRoundDate] = useState<number | null>(null)

  // Predictions state
  const [predictions, setPredictions] = useState<Prediction[]>([])

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  // Map match_id -> prediction for quick lookup
  const predictionsByMatch = useMemo(() => {
    const map: Record<string, Prediction> = {}
    predictions.forEach((p) => {
      map[p.match_id] = p
    })
    return map
  }, [predictions])

  const isAdmin = tournament?.admin_id === user?.id

  // Déterminer si c'est un format bracket (elimination)
  const isBracketFormat = tournament?.format === 'single_elimination' || tournament?.format === 'double_elimination'

  // Grouper les matchs par journée
  const matchesByRound = useMemo(() => {
    const grouped: Record<number, Match[]> = {}
    matches.forEach((match) => {
      if (!grouped[match.round]) {
        grouped[match.round] = []
      }
      grouped[match.round].push(match)
    })
    return grouped
  }, [matches])

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b)

  const maxRound = rounds.length > 0 ? Math.max(...rounds) : 0

  // Utiliser les équipes du tournoi (normalisées pour rétrocompatibilité)
  const teams = normalizeTeams(tournament?.teams as (string | { name: string; logo?: string })[])

  const currentMatches = matches.length


  // Pour les brackets: calculer les équipes déjà assignées dans un round donné
  const getAssignedTeamsInRound = (round: number, bracketSide: string | null) => {
    const assigned = new Set<string>()
    matches
      .filter((m) => m.round === round && m.bracket_side === bracketSide && m.bracket_position !== null)
      .forEach((m) => {
        if (m.team_a !== 'TBD') assigned.add(m.team_a)
        if (m.team_b !== 'TBD') assigned.add(m.team_b)
      })
    return Array.from(assigned)
  }

  // Calcule les équipes disponibles pour assignation au round d'un match donné
  const getAvailableTeamsForRound = (match: Match | null): typeof teams => {
    if (!match) return []

    // 1. Initial Round (Winners Bracket Round 1): toutes les équipes du tournoi
    if (match.round === 1 && match.bracket_side === 'winners') {
      return teams
    }

    // 2. Feeder Logic (Pour tous les autres rounds)
    // Trouver les matchs qui alimentent ce match (Winner -> Next, Loser -> Drop)
    const feeders = matches.filter(m =>
      m.next_match_id === match.id ||
      m.next_loser_match_id === match.id
    )

    const candidates = new Set<string>()

    feeders.forEach(feeder => {
      // Cas A: Le vainqueur avance (Winner Bracket ou progression normale)
      if (feeder.next_match_id === match.id) {
        if (feeder.is_bye) {
          // Si BYE, l'équipe A avance automatiquement
          if (feeder.team_a && feeder.team_a !== 'TBD') {
            candidates.add(feeder.team_a)
          }
        }
        else if (feeder.result?.winner) {
          candidates.add(feeder.result.winner)
        }
      }

      // Cas B: Le perdant descend (Drop vers Losers Bracket)
      if (feeder.next_loser_match_id === match.id) {
        if (feeder.result?.winner) {
          // Identifier le perdant
          const loser = feeder.result.winner === feeder.team_a ? feeder.team_b : feeder.team_a
          if (loser && loser !== 'TBD' && loser !== 'BYE') {
            candidates.add(loser)
          }
        }
      }
    })

    return Array.from(candidates).map(name => {
      const existingTeam = teams.find(t => t.name === name)
      return existingTeam || { name }
    })
  }

  useEffect(() => {
    loadTournament()
  }, [id])

  // Fonction pour charger le leaderboard
  const loadLeaderboard = useCallback(async () => {
    if (!id) return
    setLeaderboardLoading(true)
    try {
      const entries = await getLeaderboard(id, user?.id)
      setLeaderboard(entries)
    } catch (err) {
      console.error('Erreur chargement leaderboard:', err)
    } finally {
      setLeaderboardLoading(false)
    }
  }, [id, user?.id])

  // Charger le leaderboard quand le tournoi est actif ou terminé
  useEffect(() => {
    if (!id || !tournament) return
    if (tournament.status === 'draft') return
    loadLeaderboard()
  }, [id, tournament?.status, loadLeaderboard])

  // Callbacks pour les mises à jour en temps réel
  const handleMatchUpdate = useCallback((updatedMatch: Match) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m))
    )
  }, [])

  const handlePredictionUpdate = useCallback((updatedPrediction: Prediction) => {
    // Mettre à jour seulement si c'est une prédiction de l'utilisateur courant
    if (updatedPrediction.user_id === user?.id) {
      setPredictions((prev) => {
        const exists = prev.find((p) => p.id === updatedPrediction.id)
        if (exists) {
          return prev.map((p) => (p.id === updatedPrediction.id ? updatedPrediction : p))
        }
        return [...prev, updatedPrediction]
      })
    }
  }, [user?.id])

  // Souscrire aux mises à jour en temps réel du tournoi
  useTournamentRealtime(
    tournament?.status !== 'draft' ? id : undefined,
    {
      onMatchUpdate: handleMatchUpdate,
      onPredictionUpdate: handlePredictionUpdate,
      onLeaderboardUpdate: loadLeaderboard,
    }
  )

  async function loadTournament() {
    if (!id) return

    try {
      const data = await getTournamentWithMatches(id)
      setTournament(data.tournament)
      setMatches(data.matches)

      // Load user predictions if logged in
      if (user?.id) {
        const userPredictions = await getUserPredictionsForTournament(id, user.id)
        setPredictions(userPredictions)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }


  const handleDeleteTournament = async () => {
    if (!tournament || !isAdmin) return

    const confirmed = window.confirm(
      `Supprimer le tournoi "${tournament.name}" ? Cette action est irréversible.`
    )
    if (!confirmed) return

    setActionLoading(true)
    try {
      await deleteTournament(tournament.id)
      navigate('/tournaments')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression')
      setActionLoading(false)
    }
  }

  const handleSaveMatch = async (data: {
    team_a: string
    team_b: string
    round: number
    match_format: MatchFormat
    start_time?: string | null
  }) => {
    if (!tournament) return

    if (editingMatch) {
      const updated = await updateMatch(editingMatch.id, data)
      setMatches((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      )
    } else {
      const newMatch = await createMatch({
        tournament_id: tournament.id,
        ...data,
      })
      setMatches((prev) => [...prev, newMatch])
    }
  }

  const handleDeleteMatch = async () => {
    if (!editingMatch) return
    await deleteMatch(editingMatch.id)
    setMatches((prev) => prev.filter((m) => m.id !== editingMatch.id))
  }

  const openAddMatch = (round: number) => {
    setAddingToRound(round)
    setEditingMatch(null)
    setIsAddingMatch(true)
  }

  const openEditMatch = (match: Match) => {
    setEditingMatch(match)
    setIsAddingMatch(true)
  }

  const closeModal = () => {
    setIsAddingMatch(false)
    setEditingMatch(null)
  }

  const handleSaveResult = async (result: MatchResult) => {
    if (!resultMatch) return
    const updated = await enterMatchResult(resultMatch.id, result)
    setMatches((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m))
    )
    // Recharger le leaderboard après saisie du résultat (les points sont mis à jour)
    loadLeaderboard()
  }

  const handleSavePrediction = async (data: {
    predicted_winner: string
    predicted_score: string
  }) => {
    if (!predictionMatch || !user?.id) return
    const prediction = await createOrUpdatePrediction(
      predictionMatch.id,
      user.id,
      data.predicted_winner,
      data.predicted_score
    )
    setPredictions((prev) => {
      const existing = prev.find((p) => p.match_id === predictionMatch.id)
      if (existing) {
        return prev.map((p) => (p.match_id === predictionMatch.id ? prediction : p))
      }
      return [...prev, prediction]
    })
  }

  // Bracket: ouvrir le modal d'assignation d'équipe
  const handleOpenAssignTeam = (match: Match, slot: 'team_a' | 'team_b') => {
    setAssignMatch(match)
    setAssignSlot(slot)
  }

  // Bracket: assigner une équipe
  const handleAssignTeam = async (teamName: string, startTime?: string | null) => {
    if (!assignMatch) return

    // 1. Assign team
    let updated = await assignTeamToMatch(assignMatch.id, assignSlot, teamName)

    // 2. Update start_time if provided/changed
    if (startTime !== undefined && startTime !== assignMatch.start_time) {
      updated = await updateMatch(assignMatch.id, { start_time: startTime })
    }

    setMatches((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m))
    )
  }

  const handleSaveRoundDate = async (round: number, dateStr: string) => {
    if (!tournament) return
    setEditingRoundDate(null)

    // Parse dateStr (coming from input type="date")
    // If empty/cleared, delete the entry
    const newDates = { ...(tournament.round_dates || {}) }
    if (dateStr) {
      newDates[round] = dateStr
    } else {
      delete newDates[round]
    }

    // Optimistic update
    setTournament({ ...tournament, round_dates: newDates })

    try {
      await updateTournament(tournament.id, { round_dates: newDates })
    } catch (err) {
      console.error('Erreur sauvegarde date:', err)
      // Revert if needed, but skipping for brevity
    }
  }

  // Bracket: retirer une équipe
  const handleRemoveTeam = async () => {
    if (!assignMatch) return
    const updated = await removeTeamFromMatch(assignMatch.id, assignSlot)
    setMatches((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m))
    )
  }

  // Bracket: changer le format de match (BO)
  const handleChangeFormat = async (match: Match, format: MatchFormat) => {
    try {
      const updated = await updateMatch(match.id, { match_format: format })
      setMatches((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      )
    } catch (err) {
      console.error('Erreur changement format:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400 animate-pulse">Chargement du tournoi...</p>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <Card className="border-red-500/20 bg-red-900/10">
        <h2 className="text-lg font-semibold text-red-500 mb-2">Erreur</h2>
        <p className="text-red-400">{error || 'Tournoi non trouvé'}</p>
        <Link to="/tournaments">
          <Button variant="ghost" className="mt-4 text-red-400 hover:text-red-300 gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour aux tournois
          </Button>
        </Link>
      </Card>
    )
  }

  const statusLabels = {
    draft: 'Brouillon',
    active: 'En cours',
    completed: 'Terminé',
  }

  const statusColors = {
    draft: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    active: 'bg-green-500/20 text-green-300 border-green-500/30',
    completed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  }

  const playedMatches = matches.filter((m) => m.result !== null).length

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center gap-2 mb-4">
        <Link to="/tournaments" className="text-gray-400 hover:text-white transition-colors">
          Tournois
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-violet-400 font-medium">{tournament.name}</span>
      </div>

      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-[64px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white text-glow">
                {tournament.name}
              </h1>
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusColors[tournament.status]}`}>
                {statusLabels[tournament.status]}
              </span>
            </div>
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <span>{teams.length > 0 ? `${teams.length} équipes` : `${matches.filter(m => m.round === 1).length * 2} slots`}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span>
                {isBracketFormat
                  ? (tournament.format === 'single_elimination' ? 'Élimination Simple' : 'Double Élimination')
                  : (tournament.home_and_away ? 'Aller-retour' : 'Aller simple')
                }
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span>Créé le {new Date(tournament.created_at).toLocaleDateString('fr-FR')}</span>
            </p>
          </div>
          {isAdmin && (
            <span className="px-3 py-1 bg-violet-500/10 text-violet-300 border border-violet-500/20 text-xs font-medium rounded-full">
              Mode Admin
            </span>
          )}
        </div>
      </Card>


      {/* 
        =======================================================================
        UNIFIED DASHBOARD BAR (Shared across all formats)
        Rules | Invite | Admin/Status
        =======================================================================
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Règles */}
        <Card className="flex-1">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-gray-400" /> Règles
          </h2>
          <div className="flex items-center gap-4 text-sm h-9">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Vainqueur:</span>
              <span className="font-mono text-violet-400 font-bold">{tournament.scoring_rules.correct_winner_points} pts</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Score Exact:</span>
              <span className="font-mono text-cyan-400 font-bold">{tournament.scoring_rules.exact_score_bonus} pts</span>
            </div>
          </div>
        </Card>

        {/* Card 2: Invitation */}
        <Card className="flex-1">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-gray-400" /> Invitation
          </h2>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-white bg-black/30 px-3 py-1.5 rounded border border-white/10 flex-1 text-center select-all">
              {tournament.invite_code}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigator.clipboard.writeText(tournament.invite_code)}
              title="Copier"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {isAdmin ? (
          <Card className="border-violet-500/20 flex-1">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-violet-400" /> Administration
            </h2>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-400 flex-1 flex flex-col items-center justify-center">
                {tournament.status === 'active' && (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    En cours ({playedMatches}/{currentMatches})
                  </span>
                )}
                {tournament.status === 'completed' && (
                  <span className="flex items-center gap-2 text-blue-400">
                    <Trophy className="w-3 h-3" /> Terminé
                  </span>
                )}
              </div>

              <Button
                onClick={handleDeleteTournament}
                disabled={actionLoading}
                variant="danger"
                size="sm"
                title="Supprimer le tournoi"
                className="flex-1"
                icon={<Trash2 className="w-4 h-4" />}
              >
                Supprimer
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="flex-1 border-white/5 opacity-80">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gray-400" /> Mon statut
            </h2>
            <div className="text-sm text-gray-400">
              {predictions.length} pronostic(s) réalisé(s)
            </div>
          </Card>
        )}
      </div>

      {/* 
        =======================================================================
        MAIN CONTENT AREA
        Bracket Format -> Stacked (Leaderboard -> Bracket)
        League Format -> Grid (Leaderboard [Col 1] -> Matches [Col 2])
        =======================================================================
      */}
      {isBracketFormat ? (
        /* VUE BRACKET */
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" /> Classement
            </h2>
            <div className="overflow-hidden rounded-lg border border-white/5 bg-black/20">
              <LeaderboardTable entries={leaderboard} loading={leaderboardLoading} />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Medal className="w-5 h-5 text-cyan-400" /> Bracket
            </h2>
            <BracketView
              matches={matches}
              predictions={predictions}
              tournament={tournament}
              isAdmin={isAdmin}
              onAssignTeam={handleOpenAssignTeam}
              onEnterResult={(match) => setResultMatch(match)}
              onPredict={(match) => setPredictionMatch(match)}
              onChangeFormat={handleChangeFormat}
              teams={teams}
            />
          </Card>
        </div>
      ) : (
        /* VUE LIGUE */
        <div className="space-y-6">
          {/* Section 1: Classement Joueurs (Full Width) */}
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" /> Classement des joueurs
            </h2>
            <div className="overflow-hidden rounded-lg border border-white/5 bg-black/20">
              <LeaderboardTable entries={leaderboard} loading={leaderboardLoading} />
            </div>
          </Card>

          {/* Section 2: Classement Équipes (Full Width) */}
          {/* Section 3: Matchs (Full Width in Card) */}
          {/* Grid Layout: Team Standings (Left) & Matches (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne Gauche: Classement Équipes */}
            <div className="space-y-6">
              <Card>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-400" /> Classement des équipes
                </h2>
                <LeagueStandingsTable teams={teams} matches={matches} />
              </Card>
            </div>

            {/* Colonne Droite: Matchs */}
            <div className="lg:col-span-2">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-400" /> Matchs
                  </h2>
                  {isAdmin && (
                    <button
                      onClick={() => openAddMatch(1)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/30 hover:text-white transition-all shadow-sm shadow-violet-900/10"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter un match
                    </button>
                  )}
                </div>

                {rounds.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-white/5 rounded-lg border border-dashed border-gray-700">
                    Aucun match planifié.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {rounds.map((round) => (
                      <div key={round} className="space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="h-px bg-white/10 flex-1"></div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-violet-400 uppercase tracking-wider">Journée {round}</span>

                            {/* Edit Round Date */}
                            {editingRoundDate === round ? (
                              <div className="flex items-center gap-1 bg-white/10 rounded px-1 animate-in fade-in zoom-in-95 duration-200">
                                <input
                                  type="date"
                                  autoFocus
                                  className="bg-transparent text-white text-xs border-none focus:ring-0 p-1 font-mono [color-scheme:dark] outline-none"
                                  defaultValue={tournament.round_dates?.[round.toString()] || ''}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRoundDate(round, e.currentTarget.value)
                                    if (e.key === 'Escape') setEditingRoundDate(null)
                                  }}
                                  onBlur={(e) => handleSaveRoundDate(round, e.target.value)}
                                />
                              </div>
                            ) : (
                              <>
                                {tournament.round_dates?.[round.toString()] && (
                                  <span className="text-xs text-gray-400 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 font-mono">
                                    <Calendar className="w-3 h-3 text-cyan-400" />
                                    {new Date(tournament.round_dates[round.toString()]).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                                {isAdmin && tournament.status === 'draft' && (
                                  <button
                                    onClick={() => setEditingRoundDate(round)}
                                    className="p-1.5 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors"
                                    title="Changer la date"
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                          <div className="h-px bg-white/10 flex-1"></div>
                        </div>

                        <div className="space-y-3">
                          {matchesByRound[round].map((match) => (
                            <LeagueMatchRow
                              key={match.id}
                              match={match}
                              prediction={predictionsByMatch[match.id]}
                              isAdmin={isAdmin}
                              teams={teams}
                              tournamentStatus={tournament.status}
                              onEdit={openEditMatch}
                              onEnterResult={setResultMatch}
                              onPredict={setPredictionMatch}
                              onChangeFormat={handleChangeFormat}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isAddingMatch && (
        <MatchEditModal
          match={editingMatch}
          teams={teams.map(t => t.name)}
          maxRound={maxRound}
          defaultRound={addingToRound}
          existingMatches={matches}
          homeAndAway={tournament.home_and_away}
          onSave={handleSaveMatch}
          onDelete={editingMatch ? handleDeleteMatch : undefined}
          onClose={closeModal}
        />
      )}

      {resultMatch && (
        <MatchResultModal
          match={resultMatch}
          onSave={handleSaveResult}
          onClose={() => setResultMatch(null)}
        />
      )}

      {predictionMatch && (
        <PredictionModal
          match={predictionMatch}
          existingPrediction={predictionsByMatch[predictionMatch.id] || null}
          onSave={handleSavePrediction}
          onClose={() => setPredictionMatch(null)}
        />
      )}

      {assignMatch && (
        <TeamAssignModal
          match={assignMatch}
          slot={assignSlot}
          availableTeams={getAvailableTeamsForRound(assignMatch)}
          assignedTeams={getAssignedTeamsInRound(assignMatch.round, assignMatch.bracket_side)}
          onAssign={handleAssignTeam}
          onRemove={handleRemoveTeam}
          onClose={() => setAssignMatch(null)}
        />
      )}
    </div>
  )
}
