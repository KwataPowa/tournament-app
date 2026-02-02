import { useMemo } from 'react'
import type { Match, SwissConfig } from '../types'
import { Trophy, Medal, HelpCircle } from 'lucide-react'
import { calculateSwissStandings, calculateSwissStandingsWithStatus } from '../services/swiss'

type SwissStandingsTableProps = {
    teams: { name: string; logo?: string }[]
    matches: Match[]
    opponentHistory: Record<string, string[]>
    swissConfig?: SwissConfig
}

export function SwissStandingsTable({ teams, matches, opponentHistory, swissConfig }: SwissStandingsTableProps) {

    const standings = useMemo(() => {
        if (teams.length === 0) return []

        const teamNames = teams.map(t => t.name)

        // Si swissConfig fourni, calculer avec status
        const rawStandings = swissConfig
            ? calculateSwissStandingsWithStatus(
                teamNames,
                matches,
                opponentHistory,
                swissConfig.wins_to_qualify,
                swissConfig.losses_to_eliminate
            )
            : calculateSwissStandings(teamNames, matches, opponentHistory)

        // Sort: Points (desc), then Buchholz (desc), then Name (asc)
        const sorted = [...rawStandings].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points
            if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz
            return a.team.localeCompare(b.team)
        })

        // Add logo info
        return sorted.map(s => ({
            ...s,
            logo: teams.find(t => t.name === s.team)?.logo
        }))
    }, [teams, matches, opponentHistory, swissConfig])

    if (teams.length === 0) {
        return (
            <div className="text-center py-6 text-gray-500 text-sm">
                Aucune équipe dans ce tournoi.
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
                        <th className="px-3 py-2 text-center w-10 text-green-400 hidden sm:table-cell" title="Victoires">V</th>
                        <th className="px-3 py-2 text-center w-10 text-red-400 hidden sm:table-cell" title="Défaites">D</th>
                        <th className="px-3 py-2 text-center w-14 text-white font-bold" title="Points">Pts</th>
                        <th className="px-3 py-2 text-center w-14" title="Buchholz - Somme des points des adversaires">
                            <div className="flex items-center justify-center gap-1 group relative">
                                <span className="text-emerald-400">BH</span>
                                <HelpCircle className="w-3 h-3 text-gray-500 hidden md:inline cursor-help" />
                                <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 border border-white/10 text-xs text-gray-300 rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none shadow-lg">
                                    Buchholz: somme des points des adversaires
                                </span>
                            </div>
                        </th>
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
                            <tr key={team.team} className={rowClass}>
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
                                                {team.team.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className={index === 0 ? 'font-semibold text-white' : 'text-gray-300'}>
                                            {team.team}
                                        </span>
                                        {/* Status badge */}
                                        {swissConfig && team.status && (
                                            <span className={`
                                                text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide
                                                ${team.status === 'qualified'
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : team.status === 'eliminated'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : 'bg-cyan-500/20 text-cyan-400'
                                                }
                                            `}>
                                                {team.status === 'qualified' ? 'Q' : team.status === 'eliminated' ? 'E' : '·'}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-2 text-center text-green-400/80 font-mono hidden sm:table-cell">{team.wins}</td>
                                <td className="px-3 py-2 text-center text-red-400/80 font-mono hidden sm:table-cell">{team.losses}</td>
                                <td className="px-3 py-2 text-center">
                                    <span className={`font-bold font-mono ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>
                                        {team.points}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <span className="font-mono text-emerald-400/80">
                                        {team.buchholz}
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
