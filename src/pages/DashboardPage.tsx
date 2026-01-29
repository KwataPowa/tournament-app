import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthContext } from '../lib/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { getUserTournaments } from '../services/tournaments'
import { getDashboardStats, getPendingPredictions, getRecentActivity } from '../services/dashboard'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PendingPredictions } from '../components/dashboard/PendingPredictions'
import { RecentActivity } from '../components/dashboard/RecentActivity'
import { StatCard } from '../components/dashboard/StatCard'
import { Trophy, Users, Target, Plus, Search } from 'lucide-react'
import type { Tournament } from '../types'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    draft: { label: 'Brouillon', className: 'bg-gray-500/20 text-gray-300 border border-gray-500/30' },
    active: { label: 'En cours', className: 'bg-green-500/20 text-green-300 border border-green-500/30' },
    completed: { label: 'Terminé', className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
}

function TournamentMiniCard({ tournament }: { tournament: Tournament }) {
    const { user } = useAuthContext()
    const isAdmin = tournament.admin_id === user?.id
    const status = STATUS_LABELS[tournament.status] || STATUS_LABELS.draft

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

    // 1. Fetch Tournaments
    const { data: tournaments, isLoading: isLoadingTournaments } = useQuery({
        queryKey: ['tournaments', user?.id],
        queryFn: () => getUserTournaments(user!.id),
        enabled: !!user?.id,
    })

    // 2. Fetch Dashboard Stats
    const { data: stats } = useQuery({
        queryKey: ['dashboard-stats', user?.id],
        queryFn: () => getDashboardStats(user!.id),
        enabled: !!user?.id,
    })

    // 3. Fetch Pending Predictions
    const { data: pendingMatches, isLoading: isLoadingPending } = useQuery({
        queryKey: ['pending-predictions', user?.id],
        queryFn: () => getPendingPredictions(user!.id),
        enabled: !!user?.id,
    })

    // 4. Fetch Recent Activity
    const { data: recentActivity, isLoading: isLoadingActivity } = useQuery({
        queryKey: ['recent-activity', user?.id],
        queryFn: () => getRecentActivity(user!.id),
        enabled: !!user?.id,
    })

    const activeTournaments = tournaments?.filter(t => t.status === 'active') || []
    const draftTournaments = tournaments?.filter(t => t.status === 'draft') || []

    // Calcul du prénom ou username pour l'accueil
    const displayName = profile?.username || user?.email?.split('@')[0] || 'Joueur'

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Header Welcome */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">
                        Bonjour, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">{displayName}</span> 👋
                    </h1>
                    <p className="text-gray-400 text-sm">
                        Voici ce qui se passe dans tes compétitions.
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3">
                    <Link to="/tournaments/join">
                        <Button variant="ghost" className="gap-2">
                            <Search className="w-4 h-4" /> Rejoindre
                        </Button>
                    </Link>
                    <Link to="/tournaments/new">
                        <Button className="gap-2 bg-gradient-to-r from-violet-600 to-cyan-600 border-0 hover:opacity-90">
                            <Plus className="w-4 h-4" /> Créer un tournoi
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    label="Tournois Rejoints"
                    value={stats?.joinedCount || 0}
                    icon={Users}
                    color="text-cyan-400"
                    bg="bg-cyan-500/10"
                />
                <StatCard
                    label="Matchs Pronostiqués"
                    value={stats?.matchesWithPredictions || 0}
                    icon={Target}
                    color="text-amber-400"
                    bg="bg-amber-500/10"
                />
                <StatCard
                    label="Tournois Organisés"
                    value={stats?.organizedCount || 0}
                    icon={Trophy}
                    color="text-violet-400"
                    bg="bg-violet-500/10"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (2/3) - Pending Predictions */}
                <div className="lg:col-span-2 space-y-6">
                    {isLoadingPending ? (
                        <div className="h-64 bg-white/5 rounded-xl animate-pulse" />
                    ) : (
                        <PendingPredictions matches={pendingMatches || []} />
                    )}

                    {/* Active Tournaments (Moved here for better flow) */}
                    <Card>
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 box-shadow-green"></span>
                                Mes Tournois en cours
                            </h3>
                            <Link to="/tournaments" className="text-xs text-violet-400 hover:text-white transition-colors">
                                Voir tout
                            </Link>
                        </div>

                        {isLoadingTournaments ? (
                            <p className="text-gray-500 text-sm animate-pulse">Chargement...</p>
                        ) : activeTournaments.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-gray-500 text-sm mb-3">Aucun tournoi actif.</p>
                                <Link to="/tournaments">
                                    <Button variant="ghost" size="sm">Parcourir les tournois</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {activeTournaments.slice(0, 3).map((tournament) => (
                                    <TournamentMiniCard key={tournament.id} tournament={tournament} />
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column (1/3) - Recent Activity & Drafts */}
                <div className="space-y-6">
                    {/* Recent Activity */}
                    <div className="h-full min-h-[300px]">
                        {isLoadingActivity ? (
                            <div className="h-full bg-white/5 rounded-xl animate-pulse" />
                        ) : (
                            <RecentActivity activities={recentActivity || []} />
                        )}
                    </div>

                    {/* Conditional Drafts Section */}
                    {draftTournaments.length > 0 && (
                        <Card className="border-dashed border-gray-700 bg-gray-900/20">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                    Brouillons ({draftTournaments.length})
                                </h3>
                            </div>
                            <div className="space-y-1">
                                {draftTournaments.slice(0, 3).map((tournament) => (
                                    <TournamentMiniCard key={tournament.id} tournament={tournament} />
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}