import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthContext } from '../lib/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { getUserTournaments } from '../services/tournaments'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import type { Tournament } from '../types'
import { ArrowRight, Trophy } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-gray-500/20 text-gray-300 border border-gray-500/30' },
  active: { label: 'En cours', className: 'bg-green-500/20 text-green-300 border border-green-500/30' },
  completed: { label: 'Terminé', className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
}

const FORMAT_LABELS: Record<string, string> = {
  league: 'Ligue',
  swiss: 'Suisse',
  single_elimination: 'Élimination Simple',
  double_elimination: 'Double Élimination',
}

function TournamentMiniCard({ tournament }: { tournament: Tournament }) {
  const { user } = useAuthContext()
  const isAdmin = tournament.admin_id === user?.id
  const status = STATUS_LABELS[tournament.status] || STATUS_LABELS.draft
  const formatLabel = FORMAT_LABELS[tournament.format] || 'Tournoi'

  return (
    <Link to={`/tournaments/${tournament.id}`}>
      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-200 group-hover:text-white truncate transition-colors">
              {tournament.name}
            </span>
            {isAdmin && (
              <span className="text-[10px] text-violet-400 font-medium shrink-0 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                Admin
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Trophy className="w-3 h-3" /> {formatLabel}
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${status.className} ml-2`}>
          {status.label}
        </span>
      </div>
    </Link>
  )
}

export function DashboardPage() {
  const { user } = useAuthContext()
  const { profile } = useProfile()

  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['tournaments', user?.id],
    queryFn: () => getUserTournaments(user!.id),
    enabled: !!user?.id,
  })

  const activeTournaments = tournaments?.filter(t => t.status === 'active') || []
  const draftTournaments = tournaments?.filter(t => t.status === 'draft') || []

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          Tableau de bord
        </h1>
        {/* 'Créer un tournoi' button removed */}
      </div>

      <Card className="bg-gradient-to-br from-violet-900/40 to-violet-900/10 border-violet-500/20">
        <h2 className="text-lg font-semibold text-white mb-2">
          Bienvenue, <span className="text-violet-400">{profile?.username || user?.email?.split('@')[0]}</span> !
        </h2>
        <p className="text-gray-400 text-sm">
          Prêt pour la compétition ? Gère tes tournois et tes pronostics ici.
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tournois en cours */}
        <Card>
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 box-shadow-green"></span>
              Tournois en cours
            </h3>
            <span className="text-sm text-gray-400 bg-white/5 px-2 py-0.5 rounded">
              {activeTournaments.length}
            </span>
          </div>

          {isLoading ? (
            <p className="text-gray-500 text-sm animate-pulse">Chargement...</p>
          ) : activeTournaments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm mb-4">
                Aucun tournoi actif pour le moment.
              </p>
              <Link to="/tournaments">
                <Button variant="ghost" size="sm">Chercher un tournoi</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {activeTournaments.slice(0, 5).map((tournament) => (
                <TournamentMiniCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </Card>

        {/* Brouillons */}
        <Card>
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-500"></span>
              Mes brouillons
            </h3>
            <span className="text-sm text-gray-400 bg-white/5 px-2 py-0.5 rounded">
              {draftTournaments.length}
            </span>
          </div>

          {isLoading ? (
            <p className="text-gray-500 text-sm animate-pulse">Chargement...</p>
          ) : draftTournaments.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">
              Aucun brouillon.
            </p>
          ) : (
            <div className="space-y-1">
              {draftTournaments.slice(0, 5).map((tournament) => (
                <TournamentMiniCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Actions rapides */}
      <div className="flex justify-center pt-4">
        <Link to="/tournaments">
          <span className="flex items-center gap-1 text-violet-400 hover:text-violet-300 font-medium text-sm transition-colors cursor-pointer hover:underline underline-offset-4 decoration-violet-500/30">
            Voir tous mes tournois <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </div>
    </div>
  )
}
