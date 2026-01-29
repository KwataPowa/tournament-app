import { Link } from 'react-router-dom'
import { Clock, Trophy, ChevronRight } from 'lucide-react'
import type { PendingPredictionMatch } from '../../services/dashboard'
import { Card } from '../ui/Card'
import { normalizeTeams } from '../../types'

export function PendingPredictions({ matches }: { matches: PendingPredictionMatch[] }) {
    if (matches.length === 0) {
        return (
            <Card>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-amber-500/10">
                        <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">À pronostiquer</h2>
                </div>
                <div className="flex flex-col justify-center items-center text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                        <Trophy className="w-6 h-6 text-green-400" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">Tout est à jour !</h3>
                    <p className="text-gray-400 text-sm max-w-xs">
                        Tu as pronostiqué sur tous les matchs disponibles. Reviens plus tard pour les prochains.
                    </p>
                </div>
            </Card>
        )
    }

    const getTeamLogo = (tournamentTeams: { name: string; logo?: string }[] | undefined, teamName: string) => {
        if (!teamName || teamName === 'TBD') return null
        const normalized = normalizeTeams(tournamentTeams)
        const team = normalized.find(t => t.name === teamName)
        return team?.logo
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return null
        const date = new Date(dateStr)
        const now = new Date()
        const isToday = date.toDateString() === now.toDateString()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const isTomorrow = date.toDateString() === tomorrow.toDateString()

        const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

        if (isToday) {
            return { day: "Auj.", time, urgent: true }
        }
        if (isTomorrow) {
            return { day: "Dem.", time, urgent: false }
        }
        return {
            day: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
            time,
            urgent: false
        }
    }

    // Grouper par tournoi
    const groupedByTournament = matches.reduce((acc, match) => {
        const tournamentId = match.tournament_id
        if (!acc[tournamentId]) {
            acc[tournamentId] = {
                tournament: match.tournament,
                matches: []
            }
        }
        acc[tournamentId].matches.push(match)
        return acc
    }, {} as Record<string, { tournament: typeof matches[0]['tournament'], matches: typeof matches }>)

    const tournamentGroups = Object.entries(groupedByTournament)

    return (
        <Card>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10">
                        <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">À pronostiquer</h2>
                </div>
                <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full">
                    {matches.length}
                </span>
            </div>

            {/* Content */}
            <div className={`space-y-5 ${matches.length > 5 ? 'max-h-[400px] overflow-y-auto custom-scrollbar pr-2' : ''}`}>
                {tournamentGroups.map(([tournamentId, { tournament, matches: tournamentMatches }]) => (
                    <div key={tournamentId} className="space-y-3">
                        {/* Tournament header */}
                        <div className="flex items-center gap-2">
                            <Trophy className="w-3.5 h-3.5 text-violet-400" />
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                {tournament.name}
                            </span>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                        </div>

                        {/* Matches */}
                        <div className="space-y-2">
                            {tournamentMatches.map((match) => {
                                const teamALogo = getTeamLogo(match.tournament.teams, match.team_a)
                                const teamBLogo = getTeamLogo(match.tournament.teams, match.team_b)
                                const dateInfo = formatDate(match.start_time)

                                return (
                                    <Link
                                        key={match.id}
                                        to={`/tournaments/${match.tournament_id}?round=${match.round}&matchId=${match.id}`}
                                        className="block group"
                                    >
                                        <div className="flex rounded-xl border border-white/5 overflow-hidden transition-all duration-200 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 bg-white/[0.02]">
                                            {/* Date sidebar */}
                                            <div className={`
                                                w-16 shrink-0 flex flex-col items-center justify-center py-3 border-r border-white/5
                                                ${dateInfo?.urgent ? 'bg-amber-500/10' : 'bg-white/[0.02]'}
                                            `}>
                                                {dateInfo ? (
                                                    <>
                                                        <span className={`text-[10px] font-bold uppercase ${dateInfo.urgent ? 'text-amber-400' : 'text-gray-500'}`}>
                                                            {dateInfo.day}
                                                        </span>
                                                        <span className={`text-sm font-mono font-medium ${dateInfo.urgent ? 'text-amber-300' : 'text-gray-400'}`}>
                                                            {dateInfo.time}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-[10px] font-bold uppercase text-gray-600">TBD</span>
                                                        <span className="text-sm font-mono text-gray-600">--:--</span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Match content */}
                                            <div className="flex-1 flex items-center gap-3 p-3 min-w-0">
                                                {/* Team A */}
                                                <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                                                    <span className="text-sm font-medium text-gray-300 truncate group-hover:text-white transition-colors">
                                                        {match.team_a}
                                                    </span>
                                                    {teamALogo ? (
                                                        <img
                                                            src={teamALogo}
                                                            alt=""
                                                            className="w-7 h-7 object-contain shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center shrink-0">
                                                            <span className="text-[9px] font-bold text-violet-300">
                                                                {match.team_a.substring(0, 2).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* VS */}
                                                <span className="text-[10px] font-bold text-gray-600 shrink-0">
                                                    VS
                                                </span>

                                                {/* Team B */}
                                                <div className="flex-1 flex items-center gap-2 min-w-0">
                                                    {teamBLogo ? (
                                                        <img
                                                            src={teamBLogo}
                                                            alt=""
                                                            className="w-7 h-7 object-contain shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 flex items-center justify-center shrink-0">
                                                            <span className="text-[9px] font-bold text-cyan-300">
                                                                {match.team_b.substring(0, 2).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-medium text-gray-300 truncate group-hover:text-white transition-colors">
                                                        {match.team_b}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Format + Arrow */}
                                            <div className="shrink-0 flex items-center gap-2 px-3 border-l border-white/5 bg-white/[0.02]">
                                                <span className="text-[10px] font-bold text-gray-500 font-mono">
                                                    {match.match_format}
                                                </span>
                                                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}
