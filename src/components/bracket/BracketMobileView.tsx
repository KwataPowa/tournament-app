import { useState, useMemo, useCallback } from 'react'
import type { TouchEvent } from 'react'
import type { Match, Prediction, Tournament, MatchFormat } from '../../types'
import { BracketMobileMatchCard } from './BracketMobileMatchCard'
import { getRoundName } from '../../services/brackets'
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react'

type BracketMobileViewProps = {
  matches: Match[]
  predictions: Prediction[]
  tournament: Tournament
  isAdmin: boolean
  onEnterResult?: (match: Match) => void
  onPredict?: (match: Match) => void
  onChangeFormat?: (match: Match, format: MatchFormat) => void
  onEdit?: (match: Match) => void
  teams?: { name: string; logo?: string }[]
}

type RoundData = {
  key: string
  roundNum: number
  side: 'winners' | 'losers' | 'grand_final'
  name: string
  matches: Match[]
}

export function BracketMobileView({
  matches,
  predictions,
  tournament,
  isAdmin,
  onEnterResult,
  onPredict,
  onChangeFormat,
  onEdit,
  teams,
}: BracketMobileViewProps) {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)

  // Create prediction lookup map
  const predictionsByMatch = useMemo(() => {
    const map: Record<string, Prediction> = {}
    predictions.forEach((p) => {
      map[p.match_id] = p
    })
    return map
  }, [predictions])

  // Organize all rounds in order
  const allRounds = useMemo(() => {
    const bracketMatches = matches.filter((m) => m.bracket_position !== null)
    const rounds: RoundData[] = []

    // Winners rounds
    const winnersMatches = bracketMatches.filter((m) => m.bracket_side === 'winners')
    const winnersRoundNums = [...new Set(winnersMatches.map((m) => m.round))].sort((a, b) => a - b)
    const totalWinnersRounds = Math.max(...winnersRoundNums, 0)

    winnersRoundNums.forEach((roundNum) => {
      const roundMatches = winnersMatches
        .filter((m) => m.round === roundNum)
        .sort((a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0))

      rounds.push({
        key: `winners-${roundNum}`,
        roundNum,
        side: 'winners',
        name: getRoundName(roundNum, totalWinnersRounds, 'winners'),
        matches: roundMatches,
      })
    })

    // Grand Final (after winners)
    const grandFinal = bracketMatches.find((m) => m.bracket_side === 'grand_final')
    if (grandFinal) {
      rounds.push({
        key: 'grand_final',
        roundNum: 1,
        side: 'grand_final',
        name: 'Grande Finale',
        matches: [grandFinal],
      })
    }

    // Losers rounds (separate section)
    const losersMatches = bracketMatches.filter((m) => m.bracket_side === 'losers')
    const losersRoundNums = [...new Set(losersMatches.map((m) => m.round))].sort((a, b) => a - b)
    const totalLosersRounds = Math.max(...losersRoundNums, 0)

    losersRoundNums.forEach((roundNum) => {
      const roundMatches = losersMatches
        .filter((m) => m.round === roundNum)
        .sort((a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0))

      rounds.push({
        key: `losers-${roundNum}`,
        roundNum,
        side: 'losers',
        name: getRoundName(roundNum, totalLosersRounds, 'losers'),
        matches: roundMatches,
      })
    })

    return rounds
  }, [matches])

  // Current round data
  const currentRound = allRounds[currentRoundIndex]

  // Find index of first losers round for section indicator
  const firstLosersIndex = allRounds.findIndex((r) => r.side === 'losers')
  const hasLosers = firstLosersIndex !== -1

  // Navigation
  const goToRound = useCallback((index: number, direction: 'left' | 'right') => {
    if (index < 0 || index >= allRounds.length) return
    setSlideDirection(direction)
    setCurrentRoundIndex(index)
    setTimeout(() => setSlideDirection(null), 300)
  }, [allRounds.length])

  const goToPrev = useCallback(() => {
    goToRound(currentRoundIndex - 1, 'right')
  }, [currentRoundIndex, goToRound])

  const goToNext = useCallback(() => {
    goToRound(currentRoundIndex + 1, 'left')
  }, [currentRoundIndex, goToRound])

  // Swipe handling
  const minSwipeDistance = 50

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentRoundIndex < allRounds.length - 1) {
      goToNext()
    }
    if (isRightSwipe && currentRoundIndex > 0) {
      goToPrev()
    }
  }

  // Determine champion
  const champion = useMemo(() => {
    const grandFinal = allRounds.find((r) => r.side === 'grand_final')?.matches[0]
    if (grandFinal?.result) {
      return grandFinal.result.winner
    }
    // Single elim: check last winners round
    const winnersRounds = allRounds.filter((r) => r.side === 'winners')
    const lastWinnersRound = winnersRounds[winnersRounds.length - 1]
    if (lastWinnersRound?.matches[0]?.result && !hasLosers) {
      return lastWinnersRound.matches[0].result.winner
    }
    return null
  }, [allRounds, hasLosers])

  if (allRounds.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        Aucun match dans ce bracket
      </div>
    )
  }

  return (
    <div className="bracket-mobile">
      {/* Champion banner */}
      {champion && (
        <div className="mb-4 p-3 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/30 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <p className="text-amber-400 text-sm font-medium">Champion</p>
          </div>
          <p className="text-xl font-bold text-white">{champion}</p>
        </div>
      )}

      {/* Section indicator (Winners/Losers) */}
      {hasLosers && (
        <div className="flex justify-center gap-2 mb-3">
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              currentRound?.side !== 'losers'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-white/5 text-gray-500'
            }`}
          >
            Winners
          </span>
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              currentRound?.side === 'losers'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-white/5 text-gray-500'
            }`}
          >
            Losers
          </span>
        </div>
      )}

      {/* Round Navigation Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={goToPrev}
          disabled={currentRoundIndex === 0}
          className={`p-2 rounded-lg transition-all ${
            currentRoundIndex === 0
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-white bg-white/5 hover:bg-white/10 active:scale-95'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center flex-1">
          <h3 className="text-base font-semibold text-white">
            {currentRound?.name}
          </h3>
          <p className="text-xs text-gray-500">
            {currentRound?.matches.length} match{(currentRound?.matches.length ?? 0) > 1 ? 's' : ''}
            {' • '}
            {currentRoundIndex + 1}/{allRounds.length}
          </p>
        </div>

        <button
          onClick={goToNext}
          disabled={currentRoundIndex === allRounds.length - 1}
          className={`p-2 rounded-lg transition-all ${
            currentRoundIndex === allRounds.length - 1
              ? 'text-gray-600 cursor-not-allowed'
              : 'text-white bg-white/5 hover:bg-white/10 active:scale-95'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Round dots indicator */}
      <div className="flex justify-center gap-1.5 mb-4">
        {allRounds.map((round, idx) => (
          <button
            key={round.key}
            onClick={() => goToRound(idx, idx > currentRoundIndex ? 'left' : 'right')}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === currentRoundIndex
                ? round.side === 'losers'
                  ? 'bg-red-400 w-4'
                  : round.side === 'grand_final'
                    ? 'bg-amber-400 w-4'
                    : 'bg-cyan-400 w-4'
                : 'bg-white/20 hover:bg-white/40'
            }`}
            aria-label={`Aller au ${round.name}`}
          />
        ))}
      </div>

      {/* Matches container with swipe */}
      <div
        className="overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={`flex flex-col gap-3 transition-transform duration-300 ease-out ${
            slideDirection === 'left'
              ? 'animate-slide-in-right'
              : slideDirection === 'right'
                ? 'animate-slide-in-left'
                : ''
          }`}
        >
          {currentRound?.matches.map((match) => (
            <BracketMobileMatchCard
              key={match.id}
              match={match}
              prediction={predictionsByMatch[match.id]}
              isAdmin={isAdmin}
              tournamentStatus={tournament.status}
              onEnterResult={onEnterResult}
              onPredict={onPredict}
              onChangeFormat={onChangeFormat}
              onEdit={onEdit}
              teams={teams}
            />
          ))}
        </div>
      </div>

      {/* Swipe hint (only show initially) */}
      <p className="text-center text-xs text-gray-600 mt-4">
        Swipe ou utilisez les flèches pour naviguer
      </p>
    </div>
  )
}
