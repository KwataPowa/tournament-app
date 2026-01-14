import { useMemo } from 'react'
import type { Match } from '../types'
import { Trophy, Medal } from 'lucide-react'

type LeagueStandingsTableProps = {
    teams: { name: string; logo?: string }[]
    matches: Match[]
}

type TeamStats = {
    name: string
    logo?: string
    played: number
    wins: number
    losses: number
    points: number
}

export function LeagueStandingsTable({ teams, matches }: LeagueStandingsTableProps) {

    const standings = useMemo(() => {
        // Initialize stats for all teams
        const stats: Record<string, TeamStats> = {}
        teams.forEach(team => {
            stats[team.name] = {
                name: team.name,
                logo: team.logo,
                played: 0,
                wins: 0,
                losses: 0,
                points: 0
            }
        })

        // Process matches
        matches.forEach(match => {
            // Skip if no result
            if (!match.result) return

            const winner = match.result.winner
            const loser = winner === match.team_a ? match.team_b : match.team_a

            // Safety check in case teams aren't in the initial list or are TBD
            if (stats[winner]) {
                stats[winner].played += 1
                stats[winner].wins += 1
                stats[winner].points += 1
            }

            if (stats[loser]) {
                stats[loser].played += 1
                stats[loser].losses += 1
                // 0 points for loss
            }
        })

        // Convert to array and sort
        // Sort : Points (desc), then Wins (desc), then Name (asc)
        return Object.values(stats).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points
            if (b.wins !== a.wins) return b.wins - a.wins
            return a.name.localeCompare(b.name)
        })
    }, [teams, matches])

    if (teams.length === 0) {
        return (
            <div className="text-center py-6 text-gray-500 text-sm">
                Aucune équipe dans cette ligue.
            </div>
        )
    }

    return (
        <div className="overflow-hidden bg-white/5 rounded-lg border border-white/5">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-gray-400 font-medium">
                        <th className="px-3 py-2 text-left w-10">#</th>
                        <th className="px-3 py-2 text-left">Équipe</th>
                        <th className="px-3 py-2 text-center w-10" title="Joués">J</th>
                        <th className="px-3 py-2 text-center w-10 text-green-400" title="Gagnés">G</th>
                        <th className="px-3 py-2 text-center w-10 text-red-400" title="Perdus">P</th>
                        <th className="px-3 py-2 text-center w-14 text-white font-bold" title="Points">Pts</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {standings.map((team, index) => {
                        // Styling for Top 3
                        let rankIcon = null
                        let rowClass = "hover:bg-white/5 transition-colors"

                        if (index === 0) {
                            rankIcon = <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                            rowClass += " bg-yellow-500/5 hover:bg-yellow-500/10"
                        } else if (index === 1) {
                            rankIcon = <Medal className="w-3.5 h-3.5 text-gray-300" />
                        } else if (index === 2) {
                            rankIcon = <Medal className="w-3.5 h-3.5 text-amber-600" />
                        }

                        return (
                            <tr key={team.name} className={rowClass}>
                                <td className="px-3 py-2 font-mono text-gray-500 relative">
                                    <div className="flex items-center justify-center">
                                        {rankIcon || (index + 1)}
                                    </div>
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        {team.logo ? (
                                            <img src={team.logo} alt="" className="w-5 h-5 object-contain" />
                                        ) : (
                                            <div className="w-5 h-5 rounded bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                {team.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className={index === 0 ? 'font-semibold text-white' : 'text-gray-300'}>
                                            {team.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-3 py-2 text-center text-gray-400 font-mono">{team.played}</td>
                                <td className="px-3 py-2 text-center text-green-400/80 font-mono">{team.wins}</td>
                                <td className="px-3 py-2 text-center text-red-400/80 font-mono">{team.losses}</td>
                                <td className="px-3 py-2 text-center">
                                    <span className={`font-bold font-mono ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>
                                        {team.points}
                                    </span>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
