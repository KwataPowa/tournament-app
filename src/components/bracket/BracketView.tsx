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
    if (lastRound && lastRound[0]?.result) {
      return lastRound[0].result.winner
    }
    return null
  }, [bracketData])

  // Calcule si un round peut être configuré (assignation d'équipes)
  // Round 1: toujours en draft
  // Round N > 1: si tous les matchs du round N-1 sont terminés
  const canAssignRound = (roundNum: number, side: 'winners' | 'losers'): boolean => {
    const roundsMap = side === 'winners' ? bracketData.winnersRounds : bracketData.losersRounds

    if (roundNum === 1) {
      // Round 1: configurable en draft
      return tournament.status === 'draft'
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
            className="bracket-grid flex gap-8 min-w-max"
            style={{ alignItems: 'stretch' }}
          >
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
                    onAssignTeam={onAssignTeam}
                    onEnterResult={onEnterResult}
                    onPredict={onPredict}
                    onChangeFormat={onChangeFormat}
                    teams={teams}
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


