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
import { Trophy, Users, Target, Search, Gamepad2, ChevronRight, Check, Clock, FileEdit } from 'lucide-react'
import type { Tournament } from '../types'
import type { PendingPredictionMatch } from '../services/dashboard'

type TournamentWithPending = Tournament & {
    pendingCount: number
}

function TournamentCard({ tournament, isAdmin }: { tournament: TournamentWithPending; isAdmin: boolean }) {
    const hasPending = tournament.pendingCount > 0

    return (
        <Link to={`/tournaments/${tournament.id}`} className="block group">
            <div className="flex rounded-xl border border-white/5 overflow-hidden transition-all duration-200 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 bg-white/[0.02]">
                {/* Left indicator - pending count */}
                <div className={`
                    w-14 shrink-0 flex flex-col items-center justify-center py-3 border-r border-white/5
                    ${hasPending ? 'bg-amber-500/10' : 'bg-green-500/5'}
                `}>
                    {hasPending ? (
                        <>
                            <span className="text-lg font-bold text-amber-400">{tournament.pendingCount}</span>
                            <Clock className="w-3 h-3 text-amber-500/70" />
                        </>
                    ) : (
                        <>
                            <Check className="w-5 h-5 text-green-500" />
                            <span className="text-[9px] text-green-600 font-medium">OK</span>
                        </>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 flex items-center justify-between p-3 min-w-0 gap-3">
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-medium text-gray-200 group-hover:text-white truncate transition-colors">
                            {tournament.name}
                        </span>
                        <span className="text-[10px] text-gray-500">
                            {tournament.teams?.length || 0} équipes • {tournament.format === 'league' ? 'Ligue' : tournament.format === 'single_elimination' ? 'Bracket' : tournament.format}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {isAdmin && (
                            <span className="text-[9px] text-violet-400 font-bold bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                                ADMIN
                            </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                </div>
            </div>
        </Link>
    )
}

function DraftTournamentCard({ tournament }: { tournament: Tournament }) {
    return (
        <Link to={`/tournaments/${tournament.id}`} className="block group">
            <div className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-white/10 hover:border-gray-500/30 hover:bg-white/[0.02] transition-all">
                <div className="w-8 h-8 rounded-lg bg-gray-500/10 flex items-center justify-center shrink-0">
                    <FileEdit className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-400 group-hover:text-gray-200 truncate block transition-colors">
                        {tournament.name}
                    </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
            </div>
        </Link>
    )
}

// Helper to count pending matches per tournament
function countPendingByTournament(pendingMatches: PendingPredictionMatch[]): Record<string, number> {
    return pendingMatches.reduce((acc, match) => {
        acc[match.tournament_id] = (acc[match.tournament_id] || 0) + 1
        return acc
    }, {} as Record<string, number>)
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

    // Count pending matches per tournament
    const pendingByTournament = countPendingByTournament(pendingMatches || [])

    // Enrich tournaments with pending count
    const activeTournaments: TournamentWithPending[] = (tournaments?.filter(t => t.status === 'active') || [])
        .map(t => ({ ...t, pendingCount: pendingByTournament[t.id] || 0 }))
        .sort((a, b) => b.pendingCount - a.pendingCount) // Trier par matchs à prono (plus urgent en premier)

    const draftTournaments = tournaments?.filter(t => t.status === 'draft') || []

    // Calcul du prénom ou username pour l'accueil
    const displayName = profile?.username || user?.email?.split('@')[0] || 'Joueur'

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Header Welcome */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                    Bonjour, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">{displayName}</span> 👋
                </h1>
                <p className="text-gray-400 text-sm">
                    Voici ce qui se passe dans tes compétitions.
                </p>
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

                    {/* Active Tournaments */}
                    <Card>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-green-500/10">
                                    <Gamepad2 className="w-5 h-5 text-green-400" />
                                </div>
                                <h2 className="text-lg font-bold text-white">Mes Tournois en cours</h2>
                            </div>
                            {activeTournaments.length > 0 && (
                                <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2.5 py-1 rounded-full">
                                    {activeTournaments.length}
                                </span>
                            )}
                        </div>

                        {isLoadingTournaments ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : activeTournaments.length === 0 ? (
                            <div className="flex flex-col justify-center items-center text-center py-8">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <Gamepad2 className="w-6 h-6 text-gray-600" />
                                </div>
                                <p className="text-gray-500 text-sm mb-4">Aucun tournoi actif pour le moment.</p>
                                <Link to="/tournaments/join">
                                    <Button variant="ghost" size="sm" className="gap-2">
                                        <Search className="w-4 h-4" /> Rejoindre un tournoi
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className={`space-y-2 ${activeTournaments.length > 4 ? 'max-h-[280px] overflow-y-auto custom-scrollbar pr-2' : ''}`}>
                                {activeTournaments.map((tournament) => (
                                    <TournamentCard
                                        key={tournament.id}
                                        tournament={tournament}
                                        isAdmin={tournament.admin_id === user?.id}
                                    />
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column (1/3) - Recent Activity & Drafts */}
                <div className="space-y-6">
                    {/* Recent Activity */}
                    {isLoadingActivity ? (
                        <div className="h-80 bg-white/5 rounded-xl animate-pulse" />
                    ) : (
                        <RecentActivity activities={recentActivity || []} />
                    )}

                    {/* Conditional Drafts Section */}
                    {draftTournaments.length > 0 && (
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-gray-500/10">
                                        <FileEdit className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-400">Brouillons</h3>
                                </div>
                                <span className="text-[10px] text-gray-600 font-medium">
                                    {draftTournaments.length}
                                </span>
                            </div>
                            <div className={`space-y-2 ${draftTournaments.length > 3 ? 'max-h-[180px] overflow-y-auto custom-scrollbar pr-1' : ''}`}>
                                {draftTournaments.map((tournament) => (
                                    <DraftTournamentCard key={tournament.id} tournament={tournament} />
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
