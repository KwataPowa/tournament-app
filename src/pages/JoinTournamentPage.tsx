import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthContext } from '../lib/AuthContext'
import {
  getTournamentByInviteCode,
  isUserParticipant,
  joinTournament,
} from '../services/tournaments'
import type { Tournament } from '../types'
import { normalizeTeams } from '../types'
import { ArrowLeft, Search, Trophy, Calendar, CheckCircle, AlertCircle, Users, Hash } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export function JoinTournamentPage() {
  const navigate = useNavigate()
  const { user } = useAuthContext()

  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [foundTournament, setFoundTournament] = useState<Tournament | null>(null)
  const [alreadyParticipant, setAlreadyParticipant] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim() || !user) return

    setLoading(true)
    setError(null)
    setFoundTournament(null)
    setAlreadyParticipant(false)

    try {
      const tournament = await getTournamentByInviteCode(inviteCode)

      if (!tournament) {
        setError('Aucun tournoi trouvé avec ce code')
        return
      }

      setFoundTournament(tournament)

      // Check if already participant
      const isParticipant = await isUserParticipant(tournament.id, user.id)
      setAlreadyParticipant(isParticipant)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la recherche')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!foundTournament || !user) return

    setLoading(true)
    setError(null)

    try {
      await joinTournament(foundTournament.id, user.id)
      navigate(`/tournaments/${foundTournament.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'inscription')
    } finally {
      setLoading(false)
    }
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

  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/tournaments"
          className="text-gray-400 hover:text-white text-sm flex items-center gap-2 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour aux tournois
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2 text-glow">
          Rejoindre un tournoi
        </h1>
        <p className="text-gray-400">
          Saisissez le code d'invitation pour participer à une compétition.
        </p>
      </div>

      <Card className="relative overflow-hidden border-violet-500/20">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-600/20 rounded-full blur-[64px]" />

        <form onSubmit={handleSearch} className="relative z-10 space-y-4">
          <div>
            <label
              htmlFor="inviteCode"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Code d'invitation
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Ex: a1b2c3d4"
                  className="w-full h-[46px] bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 font-mono transition-all"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !inviteCode.trim()}
                variant="primary"
                className="h-[46px] min-w-[120px]"
                icon={!loading ? <Search className="w-4 h-4" /> : undefined}
              >
                {loading ? 'Recherche...' : 'Chercher'}
              </Button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {foundTournament && (
          <div className="mt-8 pt-8 border-t border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {foundTournament.name}
                </h2>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {normalizeTeams(foundTournament.teams as (string | { name: string; logo?: string })[]).length} participants
                  </span>
                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                  <span className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" />
                    {{
                      league: 'Championnat',
                      swiss: 'Suisse',
                      single_elimination: 'Élimination Simple',
                      double_elimination: 'Double Élimination',
                    }[foundTournament.format] || 'Tournoi'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {foundTournament.home_and_away ? 'Aller-retour' : 'Aller simple'}
                  </span>
                </div>
              </div>
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full border ${statusColors[foundTournament.status]}`}
              >
                {statusLabels[foundTournament.status]}
              </span>
            </div>

            <div className="bg-black/20 rounded-xl p-4 mb-6 border border-white/5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Règles du tournoi
              </h3>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-gray-500 block text-xs mb-0.5">Vainqueur</span>
                  <span className="font-mono text-violet-400 font-bold">
                    {foundTournament.scoring_rules.correct_winner_points} pts
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs mb-0.5">Score exact</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    +{foundTournament.scoring_rules.exact_score_bonus} pts
                  </span>
                </div>
              </div>
            </div>

            {alreadyParticipant ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Vous participez déjà à ce tournoi !</p>
                    <p className="text-xs opacity-80 mt-0.5">Cliquez ci-dessous pour y accéder</p>
                  </div>
                </div>
                <Link to={`/tournaments/${foundTournament.id}`} className="block">
                  <Button variant="secondary" className="w-full">
                    Accéder au tournoi
                  </Button>
                </Link>
              </div>
            ) : (
              <Button
                onClick={handleJoin}
                disabled={loading}
                variant="primary"
                className="w-full"
              >
                {loading ? 'Inscription en cours...' : 'Rejoindre la compétition'}
              </Button>
            )}
          </div>
        )}

        {!foundTournament && !error && (
          <div className="mt-8 pt-8 border-t border-white/5 text-center px-4">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-gray-500">
              Demandez le code d'invitation à l'organisateur du tournoi pour rejoindre la compétition.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
