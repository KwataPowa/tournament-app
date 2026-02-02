import { useMemo } from 'react'
import type { Match, Team, SwissConfig } from '../types'
import { calculateSwissStandingsWithStatus, groupTeamsByRecord } from '../services/swiss'
import { Trophy, X, Minus } from 'lucide-react'

type SwissBracketViewProps = {
  teams: Team[]
  matches: Match[]
  opponentHistory: Record<string, string[]>
  swissConfig: SwissConfig
  currentRound: number
  compact?: boolean // For sidebar display
}

export function SwissBracketView({
  teams,
  matches,
  opponentHistory,
  swissConfig,
  currentRound: _currentRound,
  compact = false
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'qualified': return <Trophy className="w-3 h-3 text-emerald-400" />
      case 'eliminated': return <X className="w-3 h-3 text-red-400" />
      case 'active': return <Minus className="w-3 h-3 text-cyan-400" />
      default: return null
    }
  }

  const qualifiedCount = standings.filter(s => s.status === 'qualified').length
  const activeCount = standings.filter(s => s.status === 'active').length
  const eliminatedCount = standings.filter(s => s.status === 'eliminated').length

  // Compact sidebar view
  if (compact) {
    return (
      <div className="space-y-3">
        {/* Compact Summary - Inline */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-emerald-400 font-bold">{qualifiedCount}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span className="text-cyan-400 font-bold">{activeCount}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-red-400 font-bold">{eliminatedCount}</span>
          </span>
        </div>

        {/* Compact Buckets */}
        <div className="space-y-2">
          {buckets.map((bucket) => (
            <div
              key={bucket.record}
              className={`
                p-2 rounded-lg border
                ${bucket.isQualified
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : bucket.isEliminated
                    ? 'bg-red-500/5 border-red-500/30'
                    : 'bg-white/5 border-white/10'
                }
              `}
            >
              {/* Record Header */}
              <div className="flex items-center justify-between mb-1.5">
                <span className={`font-mono text-sm font-bold ${bucket.isQualified
                    ? 'text-emerald-400'
                    : bucket.isEliminated
                      ? 'text-red-400'
                      : 'text-cyan-400'
                  }`}>
                  {bucket.record}
                </span>
                <span className="text-[10px] text-gray-500">
                  {bucket.teams.length} équipe{bucket.teams.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Teams - Vertical List */}
              <div className="space-y-1">
                {bucket.teams.map(team => (
                  <div
                    key={team.team}
                    className="flex items-center gap-2 text-xs"
                  >
                    {getTeamLogo(team.team) ? (
                      <img
                        src={getTeamLogo(team.team)}
                        alt=""
                        className="w-4 h-4 object-contain flex-shrink-0"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded bg-white/10 flex-shrink-0" />
                    )}
                    <span className="text-gray-300 truncate flex-1">{team.team}</span>
                    {getStatusIcon(team.status)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Full view (non-compact)
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
      <div className="space-y-2">
        {buckets.map((bucket) => (
          <div
            key={bucket.record}
            className={`
              p-3 rounded-lg border
              ${bucket.isQualified
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : bucket.isEliminated
                  ? 'bg-red-500/5 border-red-500/30'
                  : 'bg-white/5 border-white/10'
              }
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`font-mono font-bold ${bucket.isQualified
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
            <div className="flex flex-wrap gap-1.5">
              {bucket.teams.map(team => (
                <div
                  key={team.team}
                  className={`
                    flex items-center gap-1.5 px-2 py-1 rounded text-xs
                    ${team.status === 'qualified'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : team.status === 'eliminated'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-white/10 text-gray-300'
                    }
                  `}
                >
                  {getTeamLogo(team.team) && (
                    <img src={getTeamLogo(team.team)} alt="" className="w-4 h-4 object-contain" />
                  )}
                  <span className="truncate max-w-[100px]">{team.team}</span>
                  {getStatusIcon(team.status)}
                </div>
              ))}
            </div>
          </div>
        ))}
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
