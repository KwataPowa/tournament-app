import { useMemo, useState, useEffect } from 'react'
import type { Match, Prediction, Tournament, MatchFormat } from '../../types'
import { BracketRound } from './BracketRound'
import { BracketMobileView } from './BracketMobileView'
import { getRoundName } from '../../services/brackets'

const MOBILE_BREAKPOINT = 768

type BracketViewProps = {
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

export function BracketView({
  matches,
  predictions,
  tournament,
  isAdmin,
  onEnterResult,
  onPredict,
  onChangeFormat,
  onEdit,
  teams,
}: BracketViewProps) {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Create prediction lookup map
  const predictionsByMatch = useMemo(() => {
    const map: Record<string, Prediction> = {}
    predictions.forEach((p) => {
      map[p.match_id] = p
    })
    return map
  }, [predictions])

  // Organize matches by bracket side and round
  const bracketData = useMemo(() => {
    const bracketMatches = matches.filter((m) => m.bracket_position !== null)

    const winnersMatches = bracketMatches.filter((m) => m.bracket_side === 'winners')
    const losersMatches = bracketMatches.filter((m) => m.bracket_side === 'losers')
    const grandFinal = bracketMatches.find((m) => m.bracket_side === 'grand_final')

    // Group by round
    const winnersRounds = groupByRound(winnersMatches)
    const losersRounds = groupByRound(losersMatches)

    const totalWinnersRounds = Math.max(...winnersMatches.map((m) => m.round), 0)
    const totalLosersRounds = Math.max(...losersMatches.map((m) => m.round), 0)

    return {
      winnersRounds,
      losersRounds,
      grandFinal,
      totalWinnersRounds,
      totalLosersRounds,
      hasLosers: losersMatches.length > 0,
    }
  }, [matches])

  function groupByRound(matches: Match[]): Map<number, Match[]> {
    const map = new Map<number, Match[]>()
    matches.forEach((m) => {
      if (!map.has(m.round)) {
        map.set(m.round, [])
      }
      map.get(m.round)!.push(m)
    })
    map.forEach((roundMatches) => {
      roundMatches.sort((a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0))
    })
    return map
  }

  // Calculate spacing factors for proper alignment
  const { factors, paddingOverrides } = useMemo(() => {
    const factors = new Map<string, number>()
    const paddingOverrides = new Map<string, number>()

    // Winners Bracket: 1, 2, 4, 8...
    let currentFactor = 1
    const winnersRounds = Array.from(bracketData.winnersRounds.keys()).sort((a, b) => a - b)

    winnersRounds.forEach((roundNum) => {
      factors.set(`winners-${roundNum}`, currentFactor)
      const currentCount = bracketData.winnersRounds.get(roundNum)?.length || 0
      const nextCount = bracketData.winnersRounds.get(roundNum + 1)?.length
      if (nextCount && nextCount * 2 === currentCount) {
        currentFactor *= 2
      }
    })

    // Losers Bracket: 1, 1, 2, 2, 4, 4...
    // Start with a factor that aligns visual height with the winners bracket
    let wR1 = bracketData.winnersRounds.get(1)?.length || 0
    let lR1 = bracketData.losersRounds.get(1)?.length || 0
    currentFactor = (lR1 > 0 && wR1 > 0) ? Math.max(1, Math.floor(wR1 / lR1)) : 1

    // Specific Override for 8-team Double Elim (Winners 4 matches, Losers 2 matches)
    // We want Losers R1 to look like slots 0 and 3 of a 4-slot grid.
    if (wR1 === 4 && lR1 === 2) {
      // Round 1: Factor 3 (Gap of 3 units), Padding 0 (Top aligned)
      currentFactor = 3
    }

    const losersRounds = Array.from(bracketData.losersRounds.keys()).sort((a, b) => a - b)

    losersRounds.forEach((roundNum) => {
      // Apply overrides if we are in the specific 4/2 scenario
      if (wR1 === 4 && lR1 === 2) {
        if (roundNum === 1) {
          paddingOverrides.set(`losers-${roundNum}`, 0)
        }
        if (roundNum === 2) {
          // Round 2 (Quarters): Needs to be centered between the "Ghost" slots
          // Factor 2 places them at 0.5 and 2.5
          currentFactor = 2
        }
      }

      factors.set(`losers-${roundNum}`, currentFactor)

      const currentCount = bracketData.losersRounds.get(roundNum)?.length || 0
      const nextCount = bracketData.losersRounds.get(roundNum + 1)?.length

      if (nextCount && nextCount * 2 === currentCount) {
        currentFactor *= 2
      } else if (nextCount && nextCount < currentCount) {
        currentFactor *= 2
      }
    })

    return { factors, paddingOverrides }
  }, [bracketData])

  const winnersRoundNumbers = Array.from(bracketData.winnersRounds.keys()).sort((a, b) => a - b)
  const losersRoundNumbers = Array.from(bracketData.losersRounds.keys()).sort((a, b) => a - b)

  // Determine champion
  const champion = useMemo(() => {
    if (bracketData.grandFinal?.result) {
      return bracketData.grandFinal.result.winner
    }
    const lastRound = bracketData.winnersRounds.get(bracketData.totalWinnersRounds)
    if (lastRound && lastRound[0]?.result && !bracketData.hasLosers) {
      return lastRound[0].result.winner
    }
    return null
  }, [bracketData])

  // Check if rounds can be assigned


  // Mobile view with round navigation
  if (isMobile) {
    return (
      <BracketMobileView
        matches={matches}
        predictions={predictions}
        tournament={tournament}
        isAdmin={isAdmin}
        onEnterResult={onEnterResult}
        onPredict={onPredict}
        onChangeFormat={onChangeFormat}
        onEdit={onEdit}
        teams={teams}
      />
    )
  }

  return (
    <div className="bracket-container">
      {/* Champion banner */}
      {champion && (
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/30 rounded-xl text-center">
          <p className="text-amber-400 text-sm mb-1">Champion</p>
          <p className="text-2xl font-bold text-white">{champion}</p>
        </div>
      )}

      {/* Winners Bracket */}
      <div className="mb-8">
        {bracketData.hasLosers && (
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-cyan-400">W</span>
            Winners Bracket
          </h3>
        )}

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-8 min-w-max">
            {winnersRoundNumbers.map((roundNum) => {
              const roundMatches = bracketData.winnersRounds.get(roundNum) || []
              return (
                <BracketRound
                  key={`winners-${roundNum}`}
                  roundNumber={roundNum}
                  roundName={getRoundName(roundNum, bracketData.totalWinnersRounds, 'winners')}
                  matches={roundMatches}
                  predictions={predictionsByMatch}
                  isAdmin={isAdmin}
                  tournamentStatus={tournament.status}
                  totalRounds={bracketData.totalWinnersRounds}
                  onEnterResult={onEnterResult}
                  onPredict={onPredict}
                  onChangeFormat={onChangeFormat}
                  onEdit={onEdit}
                  teams={teams}
                  spacingFactor={factors.get(`winners-${roundNum}`)}
                />
              )
            })}

            {/* Grand Final */}
            {bracketData.grandFinal && (
              <BracketRound
                roundNumber={1}
                roundName="Grande Finale"
                matches={[bracketData.grandFinal]}
                predictions={predictionsByMatch}
                isAdmin={isAdmin}
                tournamentStatus={tournament.status}
                totalRounds={1}
                onEnterResult={onEnterResult}
                onPredict={onPredict}
                onChangeFormat={onChangeFormat}
                onEdit={onEdit}
                teams={teams}
                spacingFactor={factors.get(`winners-${bracketData.totalWinnersRounds}`)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Losers Bracket */}
      {bracketData.hasLosers && losersRoundNumbers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-red-400">L</span>
            Losers Bracket
          </h3>

          <div className="overflow-x-auto pb-4">
            <div className="flex gap-8 min-w-max">
              {losersRoundNumbers.map((roundNum) => {
                const roundMatches = bracketData.losersRounds.get(roundNum) || []
                return (
                  <BracketRound
                    key={`losers-${roundNum}`}
                    roundNumber={roundNum}
                    roundName={getRoundName(roundNum, bracketData.totalLosersRounds, 'losers')}
                    matches={roundMatches}
                    predictions={predictionsByMatch}
                    isAdmin={isAdmin}
                    tournamentStatus={tournament.status}
                    totalRounds={bracketData.totalLosersRounds}
                    onEnterResult={onEnterResult}
                    onPredict={onPredict}
                    onChangeFormat={onChangeFormat}
                    onEdit={onEdit}
                    teams={teams}
                    spacingFactor={factors.get(`losers-${roundNum}`)}
                    customPaddingY={paddingOverrides.get(`losers-${roundNum}`)}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
