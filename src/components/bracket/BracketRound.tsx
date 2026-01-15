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

  onEnterResult?: (match: Match) => void
  onPredict?: (match: Match) => void
  onChangeFormat?: (match: Match, format: MatchFormat) => void
  onEdit?: (match: Match) => void
  teams?: { name: string; logo?: string }[]
  spacingFactor?: number
  customPaddingY?: number
}

export function BracketRound({
  roundName,
  matches,
  predictions,
  isAdmin,
  tournamentStatus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  totalRounds: _totalRounds,

  onEnterResult,
  onPredict,
  onChangeFormat,
  onEdit,
  teams,
  spacingFactor = 1,
  customPaddingY,
}: BracketRoundProps) {
  const CARD_HEIGHT = tournamentStatus === 'active' ? 9.375 : 7
  const GAP_BASE = 1

  const gapSize = (CARD_HEIGHT + GAP_BASE) * spacingFactor - CARD_HEIGHT
  const paddingY = customPaddingY !== undefined
    ? customPaddingY
    : (CARD_HEIGHT + GAP_BASE) * (spacingFactor - 1) * 0.5

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
        className="flex flex-col flex-1"
        style={{
          gap: `${gapSize}rem`,
          paddingTop: `${paddingY}rem`,
          paddingBottom: `${paddingY}rem`,
        }}
      >
        {matches.map((match) => (
          <BracketMatchCard
            key={match.id}
            match={match}
            prediction={predictions[match.id]}
            isAdmin={isAdmin}
            tournamentStatus={tournamentStatus}

            onEnterResult={onEnterResult}
            onPredict={onPredict}
            onChangeFormat={onChangeFormat}
            onEdit={onEdit}
            teams={teams}
          />
        ))}
      </div>
    </div>
  )
}
