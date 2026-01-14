import type { Match, Prediction, MatchFormat } from '../../types'
import { BracketMatchCard } from './BracketMatchCard'

type BracketRoundProps = {
  roundNumber: number
  roundName: string
  matches: Match[]
  predictions: Record<string, Prediction>
  isAdmin: boolean
  tournamentStatus: 'draft' | 'active' | 'completed'
  totalRounds: number
  canAssignTeams?: boolean // True si ce round peut être configuré
  onAssignTeam?: (match: Match, slot: 'team_a' | 'team_b') => void
  onEnterResult?: (match: Match) => void
  onPredict?: (match: Match) => void
  onChangeFormat?: (match: Match, format: MatchFormat) => void
  teams?: { name: string; logo?: string }[]
}

export function BracketRound({
  roundNumber,
  roundName,
  matches,
  predictions,
  isAdmin,
  tournamentStatus,
  // totalRounds is part of the interface but not used in current implementation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  totalRounds: _totalRounds,
  canAssignTeams,
  onAssignTeam,
  onEnterResult,
  onPredict,
  onChangeFormat,
  teams,
}: BracketRoundProps) {
  // Calculate spacing multiplier based on round
  // First round: normal spacing, subsequent rounds: exponentially more spacing
  const spacingMultiplier = Math.pow(2, roundNumber - 1)

  return (
    <div className="bracket-round flex flex-col min-w-[180px]">
      {/* Round header */}
      <div className="mb-4 text-center">
        <h3 className="text-sm font-medium text-gray-400">{roundName}</h3>
        <p className="text-xs text-gray-600">
          {matches.length} match{matches.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Matches */}
      <div
        className="flex flex-col flex-1 justify-around"
        style={{
          gap: `${spacingMultiplier * 1}rem`,
          paddingTop: `${(spacingMultiplier - 1) * 2}rem`,
          paddingBottom: `${(spacingMultiplier - 1) * 2}rem`,
        }}
      >
        {matches.map((match) => (
          <BracketMatchCard
            key={match.id}
            match={match}
            prediction={predictions[match.id]}
            isAdmin={isAdmin}
            tournamentStatus={tournamentStatus}
            canAssignTeams={canAssignTeams}
            onAssignTeam={onAssignTeam}
            onEnterResult={onEnterResult}
            onPredict={onPredict}
            onChangeFormat={onChangeFormat}
            teams={teams}
          />
        ))}
      </div>
    </div>
  )
}
