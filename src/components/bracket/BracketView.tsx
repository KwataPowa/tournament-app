import { useMemo } from 'react'
import type { Match, Prediction, Tournament, MatchFormat } from '../../types'
import { BracketRound } from './BracketRound'
import { getRoundName } from '../../services/brackets'

type BracketViewProps = {
  matches: Match[]
  predictions: Prediction[]
  tournament: Tournament
  isAdmin: boolean
  onAssignTeam?: (match: Match, slot: 'team_a' | 'team_b') => void
  onEnterResult?: (match: Match) => void
  onPredict?: (match: Match) => void
  onChangeFormat?: (match: Match, format: MatchFormat) => void
  teams?: { name: string; logo?: string }[]
}

export function BracketView({
  matches,
  predictions,
  tournament,
  isAdmin,
  onAssignTeam,
  onEnterResult,
  onPredict,
  onChangeFormat,
  teams,
}: BracketViewProps) {
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
    // Filter bracket matches only
    const bracketMatches = matches.filter((m) => m.bracket_position !== null)

    // Separate by bracket side
    const winnersMatches = bracketMatches.filter(
      (m) => m.bracket_side === 'winners'
    )
    const losersMatches = bracketMatches.filter(
      (m) => m.bracket_side === 'losers'
    )
    const grandFinal = bracketMatches.find(
      (m) => m.bracket_side === 'grand_final'
    )

    // Group winners by round
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

  // Helper to group matches by round
  function groupByRound(matches: Match[]): Map<number, Match[]> {
    const map = new Map<number, Match[]>()
    matches.forEach((m) => {
      if (!map.has(m.round)) {
        map.set(m.round, [])
      }
      map.get(m.round)!.push(m)
    })
    // Sort matches within each round by bracket_position
    map.forEach((roundMatches) => {
      roundMatches.sort((a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0))
    })
    return map
  }

  // Helper to calculate spacing factors based on match progression
  const spacingFactors = useMemo(() => {
    const factors = new Map<string, number>() // key: "type-roundNum" -> factor

    // Winners Bracket factors
    // Usually standard doubling: 1, 2, 4, 8...
    // But let's calculate based on progression just in case
    let currentFactor = 1
    const winnersRounds = Array.from(bracketData.winnersRounds.keys()).sort((a, b) => a - b)

    winnersRounds.forEach((roundNum) => {
      factors.set(`winners-${roundNum}`, currentFactor)

      const currentRoundMatches = bracketData.winnersRounds.get(roundNum)?.length || 0
      const nextRoundMatches = bracketData.winnersRounds.get(roundNum + 1)?.length

      // If we know the next round, adjust factor for it
      if (nextRoundMatches) {
        if (nextRoundMatches === currentRoundMatches) {
          // 1:1 progression, maintain factor
        } else if (nextRoundMatches * 2 === currentRoundMatches) {
          // 2:1 progression (halving), double factor
          currentFactor *= 2
        } else {
          // Irregular, default to doubling as fallback for standard trees
          currentFactor *= 2
        }
      }
    })

    // Losers Bracket factors
    // More complex: 1, 1, 2, 2, 4, 4... usually
    currentFactor = 1
    const losersRounds = Array.from(bracketData.losersRounds.keys()).sort((a, b) => a - b)

    losersRounds.forEach((roundNum) => {
      factors.set(`losers-${roundNum}`, currentFactor)

      const currentRoundMatches = bracketData.losersRounds.get(roundNum)?.length || 0
      const nextRoundMatches = bracketData.losersRounds.get(roundNum + 1)?.length

      if (nextRoundMatches) {
        if (nextRoundMatches === currentRoundMatches) {
          // 1:1 progression (e.g. L-R1 -> L-R2), maintain factor
        } else if (nextRoundMatches * 2 === currentRoundMatches) {
          // 2:1 progression (e.g. L-R2 -> L-R3), double factor
          currentFactor *= 2
        } else {
          // Irregular
          // For losers bracket, often better to maintain same factor if unsure, 
          // but strictly if we merge, we double spacing.
          if (nextRoundMatches < currentRoundMatches) {
            currentFactor *= 2
          }
        }
      }
    })

    return factors
  }, [bracketData])

  // Get sorted round numbers
  const winnersRoundNumbers = Array.from(bracketData.winnersRounds.keys()).sort(
    (a, b) => a - b
  )
  const losersRoundNumbers = Array.from(bracketData.losersRounds.keys()).sort(
    (a, b) => a - b
  )

  // Determine champion
  const champion = useMemo(() => {
    if (bracketData.grandFinal?.result) {
      return bracketData.grandFinal.result.winner
    }
    // For single elimination, check last winners round
    const lastRound = bracketData.winnersRounds.get(bracketData.totalWinnersRounds)
    if (lastRound && lastRound[0]?.result && !bracketData.hasLosers) {
      return lastRound[0].result.winner
    }
    return null
  }, [bracketData])

  // Calcule si un round peut être configuré (assignation d'équipes)
  // Round 1 Winners: toujours en draft
  // Round 1 Losers: si Round 1 Winners terminé
  // Round N > 1: si tous les matchs du round N-1 sont terminés
  const canAssignRound = (roundNum: number, side: 'winners' | 'losers'): boolean => {
    const roundsMap = side === 'winners' ? bracketData.winnersRounds : bracketData.losersRounds

    if (side === 'winners' && roundNum === 1) {
      // Round 1 Winners: configurable en draft
      return tournament.status === 'draft'
    }

    if (side === 'losers' && roundNum === 1) {
      // Round 1 Losers: dépend généralement du Round 1 Winners
      // On vérifie si le round 1 winners est terminé
      const winnersRound1 = bracketData.winnersRounds.get(1)
      const winnersRound1Complete = winnersRound1?.every(m => m.result !== null || m.is_bye) ?? false
      return tournament.status === 'active' && winnersRound1Complete
    }

    // Round N > 1: vérifier que le round précédent est terminé
    const prevRoundMatches = roundsMap.get(roundNum - 1)
    if (!prevRoundMatches) return false

    const allPrevMatchesComplete = prevRoundMatches.every(m => m.result !== null || m.is_bye)
    return allPrevMatchesComplete && tournament.status === 'active'
  }

  // Vérifier si la grande finale peut être configurée
  const canAssignGrandFinal = (): boolean => {
    // Winners final terminé
    const winnersLastRound = bracketData.winnersRounds.get(bracketData.totalWinnersRounds)
    const winnersComplete = winnersLastRound?.every(m => m.result !== null) ?? false

    // Losers final terminé (si double elimination)
    if (bracketData.hasLosers) {
      const losersLastRound = bracketData.losersRounds.get(bracketData.totalLosersRounds)
      const losersComplete = losersLastRound?.every(m => m.result !== null) ?? false
      return winnersComplete && losersComplete && tournament.status === 'active'
    }

    return false // Pas de grand final en single elimination
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
          <div
            className="bracket-grid flex min-w-max"
            style={{
              gap: '64px' // Must match COL_GAP used in SVG calc
            }}
          >
            {/* SVG Lines Overlay */}

            {winnersRoundNumbers.map((roundNum) => {
              const roundMatches = bracketData.winnersRounds.get(roundNum) || []

              return (
                <BracketRound
                  key={`winners-${roundNum}`}
                  roundNumber={roundNum}
                  roundName={getRoundName(
                    roundNum,
                    bracketData.totalWinnersRounds,
                    'winners'
                  )}
                  matches={roundMatches}
                  predictions={predictionsByMatch}
                  isAdmin={isAdmin}
                  tournamentStatus={tournament.status}
                  totalRounds={bracketData.totalWinnersRounds}
                  canAssignTeams={canAssignRound(roundNum, 'winners')}
                  onAssignTeam={onAssignTeam}
                  onEnterResult={onEnterResult}
                  onPredict={onPredict}
                  onChangeFormat={onChangeFormat}
                  teams={teams}
                  spacingFactor={spacingFactors.get(`winners-${roundNum}`)}
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
                canAssignTeams={canAssignGrandFinal()}
                onAssignTeam={onAssignTeam}
                onEnterResult={onEnterResult}
                onPredict={onPredict}
                onChangeFormat={onChangeFormat}
                teams={teams}
                spacingFactor={spacingFactors.get(`winners-${bracketData.totalWinnersRounds}`)}
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
            <div
              className="bracket-grid flex gap-8 min-w-max"
              style={{ alignItems: 'stretch' }}
            >
              {/* SVG Lines Overlay for Losers */}

              {losersRoundNumbers.map((roundNum) => {
                const roundMatches = bracketData.losersRounds.get(roundNum) || []

                return (
                  <BracketRound
                    key={`losers-${roundNum}`}
                    roundNumber={roundNum}
                    roundName={getRoundName(
                      roundNum,
                      bracketData.totalLosersRounds,
                      'losers'
                    )}
                    matches={roundMatches}
                    predictions={predictionsByMatch}
                    isAdmin={isAdmin}
                    tournamentStatus={tournament.status}
                    totalRounds={bracketData.totalLosersRounds}
                    canAssignTeams={canAssignRound(roundNum, 'losers')}
                    onAssignTeam={onAssignTeam}
                    onEnterResult={onEnterResult}
                    onPredict={onPredict}
                    onChangeFormat={onChangeFormat}
                    teams={teams}
                    spacingFactor={spacingFactors.get(`losers-${roundNum}`)}
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

