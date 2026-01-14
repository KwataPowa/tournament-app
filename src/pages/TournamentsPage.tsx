import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUserTournaments, deleteTournament } from '../services/tournaments'
import { useAuthContext } from '../lib/AuthContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import type { Tournament } from '../types'
import { normalizeTeams } from '../types'
import { useState } from 'react'
import { Users, Trash2, Loader2, Trophy, Shield, Swords } from 'lucide-react'

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

function TournamentCard({ tournament, onDelete, isDeleting }: { tournament: Tournament; onDelete: (id: string, name: string) => void; isDeleting: boolean }) {
  const { user } = useAuthContext()
  const isAdmin = tournament.admin_id === user?.id
  const status = STATUS_LABELS[tournament.status] || STATUS_LABELS.draft
  const teamCount = normalizeTeams(tournament.teams as (string | { name: string; logo?: string })[]).length
  const formatLabel = FORMAT_LABELS[tournament.format] || 'Tournoi'

  return (
    <Link to={`/tournaments/${tournament.id}`} className="block h-full">
      <div className="group h-full glass-panel p-5 rounded-xl hover:bg-white/10 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-900/20 transition-all duration-300 flex flex-col relative overflow-hidden">
        {/* Glow effect on hover */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 group-hover:bg-violet-600/20 transition-colors pointer-events-none" />

        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-bold text-lg text-white truncate group-hover:text-violet-300 transition-colors">
              {tournament.name}
            </h3>
            <p className="text-gray-400 text-sm mt-0.5 flex items-center gap-2">
              <span className="text-violet-300 font-medium">{formatLabel}</span>
              {tournament.format === 'league' && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                  <span>{tournament.home_and_away ? 'Aller-retour' : 'Aller simple'}</span>
                </>
              )}
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Users className="w-4 h-4" />
            <span>{teamCount} équipe{teamCount > 1 ? 's' : ''}</span>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-violet-400/80 font-medium px-2 py-1 rounded bg-violet-500/10 border border-violet-500/10">
                Admin
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDelete(tournament.id, tournament.name)
                }}
                disabled={isDeleting}
                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-wait"
                title="Supprimer"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

export function TournamentsPage() {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  const { data: tournaments, isLoading, error } = useQuery({
    queryKey: ['tournaments', user?.id],
    queryFn: () => getUserTournaments(user!.id),
    enabled: !!user?.id,
  })

  // Separate tournaments
  const adminTournaments = tournaments?.filter(t => t.admin_id === user?.id) || []
  const participantTournaments = tournaments?.filter(t => t.admin_id !== user?.id) || []

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Supprimer le tournoi "${name}" ? Cette action est irréversible.`
    )
    if (!confirmed) return

    setDeleteLoading(id)
    try {
      await deleteTournament(id)
      queryClient.invalidateQueries({ queryKey: ['tournaments', user?.id] })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setDeleteLoading(null)
    }
  }

  const renderSection = (title: string, icon: React.ReactNode, items: Tournament[], emptyMessage: string) => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
        {icon} {title}
        <span className="text-sm font-normal text-gray-500 ml-2">({items.length})</span>
      </h2>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              onDelete={handleDelete}
              isDeleting={deleteLoading === tournament.id}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-xl bg-white/5 border border-white/5 border-dashed text-center">
          <p className="text-gray-500 text-sm">{emptyMessage}</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white text-glow mb-2">Mes Tournois</h1>
          <p className="text-gray-400">Gère tes compétitions et consulte tes historiques.</p>
        </div>
        {/* Removed 'Create Tournament' button */}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-white/5 animate-pulse border border-white/5" />
          ))}
        </div>
      )}

      {error && (
        <Card className="border-red-500/20 bg-red-900/10 mb-6">
          <p className="text-red-400">
            Erreur lors du chargement des tournois : {(error as Error).message}
          </p>
        </Card>
      )}

      {!isLoading && !error && (
        <>
          {/* Section: Tournois que j'organise (Admin) */}
          {renderSection(
            "Tournois que j'organise",
            <Shield className="w-5 h-5 text-violet-400" />,
            adminTournaments,
            "Vous n'avez créé aucun tournoi pour le moment."
          )}

          {/* Section: Tournois auxquels je participe */}
          {renderSection(
            "Tournois rejoints",
            <Swords className="w-5 h-5 text-cyan-400" />,
            participantTournaments,
            "Vous n'avez rejoint aucun tournoi pour le moment."
          )}
        </>
      )}
    </div>
  )
}
