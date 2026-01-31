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
  bracketSide?: 'winners' | 'losers' | 'grand_final'

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
  bracketSide,

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

  // Determine styling based on round type
  const isFinal = roundName.toLowerCase().includes('finale')
  const isGrandFinal = roundName.toLowerCase().includes('grande')

  const getHeaderStyle = () => {
    if (isGrandFinal) return 'bg-amber-500/10 border-amber-500/30 text-amber-400'
    if (isFinal) return 'bg-violet-500/10 border-violet-500/30 text-violet-400'
    if (bracketSide === 'losers') return 'bg-red-500/5 border-red-500/20 text-red-400'
    return 'bg-white/5 border-white/10 text-gray-300'
  }

  return (
    <div className="bracket-round flex flex-col min-w-[200px]">
      {/* Round header */}
      <div className="mb-4 text-center">
        <div className={`inline-block px-4 py-1.5 rounded-lg border ${getHeaderStyle()}`}>
          <h3 className="text-sm font-semibold">{roundName}</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
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
