import { useMemo } from 'react'
import type { Match, Team, SwissConfig } from '../types'
import { calculateSwissStandingsWithStatus, groupTeamsByRecord } from '../services/swiss'
import { Trophy, X, Minus, ChevronRight } from 'lucide-react'

type SwissBracketViewProps = {
  teams: Team[]
  matches: Match[]
  opponentHistory: Record<string, string[]>
  swissConfig: SwissConfig
  currentRound: number
}

export function SwissBracketView({
  teams,
  matches,
  opponentHistory,
  swissConfig,
  currentRound: _currentRound
}: SwissBracketViewProps) {

  const standings = useMemo(() => {
    return calculateSwissStandingsWithStatus(
      teams.map(t => t.name),
      matches,
      opponentHistory,
      swissConfig.wins_to_qualify,
      swissConfig.losses_to_eliminate
    )
  }, [teams, matches, opponentHistory, swissConfig])

  const buckets = useMemo(() => {
    return groupTeamsByRecord(
      standings,
      swissConfig.wins_to_qualify,
      swissConfig.losses_to_eliminate
    )
  }, [standings, swissConfig])

  const getTeamLogo = (teamName: string) => {
    return teams.find(t => t.name === teamName)?.logo
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'qualified': return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
      case 'eliminated': return 'bg-red-500/20 border-red-500/50 text-red-400'
      case 'active': return 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
      default: return 'bg-white/10 border-white/20 text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'qualified': return <Trophy className="w-3 h-3" />
      case 'eliminated': return <X className="w-3 h-3" />
      case 'active': return <Minus className="w-3 h-3" />
      default: return null
    }
  }

  const getPotentialColor = (potential: string) => {
    switch (potential) {
      case 'qualification': return 'text-emerald-400'
      case 'elimination': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const qualifiedCount = standings.filter(s => s.status === 'qualified').length
  const activeCount = standings.filter(s => s.status === 'active').length
  const eliminatedCount = standings.filter(s => s.status === 'eliminated').length

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="text-2xl font-bold text-emerald-400">
            {qualifiedCount}
          </div>
          <div className="text-sm text-gray-400">Qualified</div>
        </div>
        <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
          <div className="text-2xl font-bold text-cyan-400">
            {activeCount}
          </div>
          <div className="text-sm text-gray-400">Active</div>
        </div>
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div className="text-2xl font-bold text-red-400">
            {eliminatedCount}
          </div>
          <div className="text-sm text-gray-400">Eliminated</div>
        </div>
      </div>

      {/* Swiss Bracket Tree */}
      <div className="overflow-x-auto pb-4">
        {/* Desktop View */}
        <div className="hidden md:block min-w-max space-y-3">
          {buckets.map((bucket) => (
            <div
              key={bucket.record}
              className={`
                flex items-center gap-4 p-4 rounded-xl border transition-all
                ${bucket.isQualified
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : bucket.isEliminated
                    ? 'bg-red-500/5 border-red-500/30'
                    : 'bg-white/5 border-white/10'
                }
              `}
            >
              {/* Record Badge */}
              <div className={`
                flex-shrink-0 w-20 text-center py-2 px-3 rounded-lg font-mono font-bold
                ${bucket.isQualified
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : bucket.isEliminated
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-cyan-500/20 text-cyan-400'
                }
              `}>
                {bucket.record}
              </div>

              {/* Teams in this bucket */}
              <div className="flex-1 flex flex-wrap gap-2">
                {bucket.teams.map((team) => (
                  <div
                    key={team.team}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg border
                      ${getStatusColor(team.status)}
                    `}
                  >
                    {getTeamLogo(team.team) && (
                      <img
                        src={getTeamLogo(team.team)}
                        alt=""
                        className="w-5 h-5 object-contain"
                      />
                    )}
                    <span className="font-medium text-sm">{team.team}</span>
                    <span className="opacity-70">
                      {getStatusIcon(team.status)}
                    </span>

                    {/* Next match indicator */}
                    {team.status === 'active' && team.nextMatchPotential !== 'neutral' && (
                      <span className={`text-xs font-medium flex items-center gap-1 ${getPotentialColor(team.nextMatchPotential)}`}>
                        <ChevronRight className="w-3 h-3" />
                        {team.nextMatchPotential === 'qualification' ? 'Match Point' : 'Elimination Match'}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Bucket status badge */}
              {bucket.isQualified && (
                <div className="flex-shrink-0 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                  Qualified
                </div>
              )}
              {bucket.isEliminated && (
                <div className="flex-shrink-0 px-3 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
                  Eliminated
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile View - Compact */}
        <div className="md:hidden space-y-2">
          {buckets.map((bucket) => (
            <div key={bucket.record} className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className={`font-mono font-bold ${
                  bucket.isQualified
                    ? 'text-emerald-400'
                    : bucket.isEliminated
                      ? 'text-red-400'
                      : 'text-cyan-400'
                }`}>
                  {bucket.record}
                </span>
                {bucket.isQualified && <Trophy className="w-4 h-4 text-emerald-400" />}
                {bucket.isEliminated && <X className="w-4 h-4 text-red-400" />}
              </div>
              <div className="space-y-1">
                {bucket.teams.map(team => (
                  <div key={team.team} className="text-sm text-gray-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTeamLogo(team.team) && (
                        <img src={getTeamLogo(team.team)} alt="" className="w-4 h-4 object-contain" />
                      )}
                      <span>{team.team}</span>
                    </div>
                    {getStatusIcon(team.status)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500"></div>
          <span className="text-gray-400">Qualified</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-cyan-500"></div>
          <span className="text-gray-400">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-gray-400">Eliminated</span>
        </div>
      </div>
    </div>
  )
}
