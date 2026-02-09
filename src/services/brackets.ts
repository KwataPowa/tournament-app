import { supabase } from '../lib/supabase'
import type {
  Match,
  MatchInsert,
  TournamentFormat,
  MatchFormat,
  BracketSide,
  BracketRound,
  BracketData,
} from '../types'

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate the next power of 2 >= n
 */
export function nextPowerOf2(n: number): number {
  if (n <= 1) return 2
  return Math.pow(2, Math.ceil(Math.log2(n)))
}

/**
 * Calculate number of byes needed for a bracket
 */
export function calculateByes(teamCount: number): number {
  return nextPowerOf2(teamCount) - teamCount
}

/**
 * Calculate total number of rounds for a bracket
 */
export function calculateTotalRounds(bracketSize: number): number {
  return Math.log2(bracketSize)
}

/**
 * Calculate total matches for a single elimination bracket
 */
export function calculateBracketMatches(
  bracketSize: number,
  format: TournamentFormat
): number {
  if (format === 'single_elimination') {
    return bracketSize - 1
  } else if (format === 'double_elimination') {
    // Winners bracket: bracketSize - 1
    // Losers bracket: bracketSize - 1
    // Grand final: 1 (or 2 with bracket reset)
    return 2 * (bracketSize - 1) + 1
  }
  return 0
}

/**
 * Get the display name for a round
 */
export function getRoundName(
  roundNumber: number,
  totalRounds: number,
  bracketSide: BracketSide = 'winners'
): string {
  const remainingRounds = totalRounds - roundNumber + 1

  if (bracketSide === 'grand_final') {
    return 'Grande Finale'
  }

  const prefix = bracketSide === 'losers' ? 'L ' : ''

  switch (remainingRounds) {
    case 1:
      return bracketSide === 'losers' ? 'Finale Losers' : 'Finale'
    case 2:
      return `${prefix}Demi-finales`
    case 3:
      return `${prefix}Quarts de finale`
    case 4:
      return `${prefix}Huitièmes`
    case 5:
      return `${prefix}16èmes`
    default:
      return `${prefix}Tour ${roundNumber}`
  }
}

// ============================================
// BRACKET GENERATION
// ============================================

/**
 * Generate a single elimination bracket
 * Creates all matches linked via next_match_id
 * If teams are provided, places them in the first round matches
 */
export async function generateSingleEliminationBracket(
  tournamentId: string,
  bracketSize: number,
  defaultMatchFormat: MatchFormat = 'BO3',
  teams: string[] = [],
  stageId?: string | null
): Promise<Match[]> {
  const totalRounds = calculateTotalRounds(bracketSize)
  const matchesToCreate: MatchInsert[] = []

  // Generate matches from final to first round
  // This way we can set next_match_id correctly
  const matchIdsByRound: Map<number, string[]> = new Map()

  // First, generate all match IDs
  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round)
    const ids: string[] = []
    for (let pos = 0; pos < matchesInRound; pos++) {
      ids.push(crypto.randomUUID())
    }
    matchIdsByRound.set(round, ids)
  }

  // Now create match data with proper links
  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round)
    const roundIds = matchIdsByRound.get(round)!
    const nextRoundIds = matchIdsByRound.get(round + 1)

    for (let pos = 0; pos < matchesInRound; pos++) {
      const nextMatchId = nextRoundIds ? nextRoundIds[Math.floor(pos / 2)] : null

      // Use BO5 for finals, default format otherwise
      const matchFormat =
        round === totalRounds ? 'BO5' : defaultMatchFormat

      // For round 1, assign teams if provided
      let team_a = 'TBD'
      let team_b = 'TBD'
      let is_bye = false

      if (round === 1 && teams.length > 0) {
        const teamIndexA = pos * 2
        const teamIndexB = pos * 2 + 1

        // Assign team A if available
        if (teamIndexA < teams.length) {
          team_a = teams[teamIndexA]
        }

        // Assign team B if available, otherwise it's a bye
        if (teamIndexB < teams.length) {
          team_b = teams[teamIndexB]
        } else {
          // This is a bye match - team_a auto-advances
          team_b = 'BYE'
          is_bye = true
        }
      }

      matchesToCreate.push({
        id: roundIds[pos],
        tournament_id: tournamentId,
        team_a,
        team_b,
        round,
        bracket_position: pos,
        bracket_side: 'winners',
        next_match_id: nextMatchId,
        is_bye,
        match_format: matchFormat,
        stage_id: stageId
      })
    }
  }

  // Insert all matches
  const { data: createdMatches, error } = await supabase
    .from('matches')
    .insert(matchesToCreate)
    .select()

  if (error) {
    throw new Error(`Failed to create bracket: ${error.message}`)
  }

  return createdMatches as Match[]
}

/**
 * Generate a double elimination bracket
 * Creates winners bracket, losers bracket, and grand final
 * If teams are provided, places them in the first round matches
 */
/**
 * Generate a double elimination bracket
 * Creates winners bracket, losers bracket, and grand final
 * If teams are provided, places them in the first round matches
 */
export async function generateDoubleEliminationBracket(
  tournamentId: string,
  bracketSize: number,
  defaultMatchFormat: MatchFormat = 'BO3',
  teams: string[] = [],
  stageId?: string | null
): Promise<Match[]> {
  const totalWinnersRounds = calculateTotalRounds(bracketSize)
  // Losers bracket has more rounds: 2 * (totalWinnersRounds - 1)
  const totalLosersRounds = 2 * (totalWinnersRounds - 1)

  const matchesToCreate: MatchInsert[] = []

  // Maps to store match IDs by round and side
  const winnersMatchIds: Map<number, string[]> = new Map()
  const losersMatchIds: Map<number, string[]> = new Map()
  const grandFinalId = crypto.randomUUID()

  // Generate winners bracket match IDs
  for (let round = 1; round <= totalWinnersRounds; round++) {
    const matchesInRound = Math.pow(2, totalWinnersRounds - round)
    const ids: string[] = []
    for (let pos = 0; pos < matchesInRound; pos++) {
      ids.push(crypto.randomUUID())
    }
    winnersMatchIds.set(round, ids)
  }

  // Generate losers bracket match IDs
  for (let round = 1; round <= totalLosersRounds; round++) {
    // Number of matches in LB rounds follows a pattern:
    // N/4, N/4, N/8, N/8, ..., 1, 1
    // Rounds 1 & 2: N/4 matches
    // Rounds 3 & 4: N/8 matches
    // ...
    const power = Math.ceil(round / 2) + 1
    const matchesInRound = bracketSize / Math.pow(2, power)

    // Safety check mostly for the final round calc
    const count = Math.max(1, matchesInRound)

    const ids: string[] = []
    for (let pos = 0; pos < count; pos++) {
      ids.push(crypto.randomUUID())
    }
    losersMatchIds.set(round, ids)
  }

  // ==========================================
  // CREATE WINNERS BRACKET
  // ==========================================
  for (let round = 1; round <= totalWinnersRounds; round++) {
    const roundIds = winnersMatchIds.get(round)!
    const nextRoundIds = winnersMatchIds.get(round + 1)

    for (let pos = 0; pos < roundIds.length; pos++) {
      const matchId = roundIds[pos]

      // 1. Advance to Next Winners Match
      // -------------------------------
      let nextMatchId: string | null = null
      let targetSlotWinner: 'team_a' | 'team_b' | null = null

      if (round < totalWinnersRounds) {
        // Standard bracket progression: 2 matches -> 1 match
        nextMatchId = nextRoundIds![Math.floor(pos / 2)]
        targetSlotWinner = (pos % 2 === 0) ? 'team_a' : 'team_b'
      } else {
        // Winners Final -> Grand Final (Slot A)
        nextMatchId = grandFinalId
        targetSlotWinner = 'team_a'
      }

      // 2. Drop to Losers Bracket
      // -------------------------
      let nextLoserMatchId: string | null = null
      let targetSlotLoser: 'team_a' | 'team_b' | null = null

      if (round === 1) {
        // Round 1 Losers -> LB Round 1
        // 4 matches -> 2 matches (Merge)
        const lbRoundIds = losersMatchIds.get(1)!
        nextLoserMatchId = lbRoundIds[Math.floor(pos / 2)]
        targetSlotLoser = (pos % 2 === 0) ? 'team_a' : 'team_b'
      }
      else if (round === totalWinnersRounds) {
        // Winners Final Loser -> Losers Final (Last LB Round)
        // 1 match -> 1 match
        const lbRoundIds = losersMatchIds.get(totalLosersRounds)!
        nextLoserMatchId = lbRoundIds[0]
        targetSlotLoser = 'team_a' // Usually takes top slot against LB winner
      }
      else {
        // Intermediate Rounds (e.g. Quarter Finals)
        // Losers drop to even LB rounds: 2, 4, 6...
        // Formula: Drop to LB Round (round - 1) * 2
        const lbTargetRound = (round - 1) * 2
        const lbRoundIds = losersMatchIds.get(lbTargetRound)!

        // In these rounds, matches correspond 1-to-1 (Both have N matches)
        // To avoid immediate rematches, we strictly swap or reverse.
        // Simple strategy: Reverse order (Top WB goes to Bottom LB match)
        // pos 0 -> last LB match, pos 1 -> 2nd last...
        const lbPos = lbRoundIds.length - 1 - pos
        nextLoserMatchId = lbRoundIds[lbPos]
        targetSlotLoser = 'team_a' // Consistently take Slot A (Drop-in slot)
      }

      // 3. Teams & Format
      // -----------------
      const matchFormat = round === totalWinnersRounds ? 'BO5' : defaultMatchFormat
      let team_a = 'TBD'
      let team_b = 'TBD'
      let is_bye = false

      if (round === 1 && teams.length > 0) {
        const teamIndexA = pos * 2
        const teamIndexB = pos * 2 + 1
        if (teamIndexA < teams.length) team_a = teams[teamIndexA]
        if (teamIndexB < teams.length) team_b = teams[teamIndexB]
        else {
          team_b = 'BYE'
          is_bye = true
        }
      }

      matchesToCreate.push({
        id: matchId,
        tournament_id: tournamentId,
        team_a,
        team_b,
        round,
        bracket_position: pos,
        bracket_side: 'winners',
        next_match_id: nextMatchId,
        next_loser_match_id: nextLoserMatchId,
        target_slot_winner: targetSlotWinner,
        target_slot_loser: targetSlotLoser,
        is_bye,

        match_format: matchFormat,
        stage_id: stageId
      })
    }
  }

  // ==========================================
  // CREATE LOSERS BRACKET
  // ==========================================
  for (let round = 1; round <= totalLosersRounds; round++) {
    const roundIds = losersMatchIds.get(round)!
    const nextRoundIds = losersMatchIds.get(round + 1)

    for (let pos = 0; pos < roundIds.length; pos++) {
      const matchId = roundIds[pos]

      let nextMatchId: string | null = null
      let targetSlotWinner: 'team_a' | 'team_b' | null = null

      if (round < totalLosersRounds) {
        if (round % 2 !== 0) {
          // ODD ROUNDS (1, 3, 5...)
          // These are "pure" LB matches or have just been fed by WB R1.
          // Winners advance to NEXT round (Even), which is a Drop-in round.
          // Pattern: 1-to-1 mapping into specific slot (Slot B, as A is taken by WB drop).
          nextMatchId = nextRoundIds![pos]
          targetSlotWinner = 'team_b'
        } else {
          // EVEN ROUNDS (2, 4...)
          // These are Drop-in rounds (LB Winner + WB Loser).
          // Winners advance to NEXT round (Odd), which is a consolidation round.
          // Pattern: Match merge (2 -> 1).
          nextMatchId = nextRoundIds![Math.floor(pos / 2)]
          targetSlotWinner = (pos % 2 === 0) ? 'team_a' : 'team_b'
        }
      } else {
        // LOSERS FINAL -> Grand Final (Slot B)
        nextMatchId = grandFinalId
        targetSlotWinner = 'team_b'
      }

      const matchFormat = (round === totalLosersRounds) ? 'BO5' : defaultMatchFormat

      matchesToCreate.push({
        id: matchId,
        tournament_id: tournamentId,
        team_a: 'TBD',
        team_b: 'TBD',
        round,
        bracket_position: pos,
        bracket_side: 'losers',
        next_match_id: nextMatchId,
        target_slot_winner: targetSlotWinner,
        is_bye: false,
        match_format: matchFormat,
        stage_id: stageId
      })
    }
  }

  // ==========================================
  // CREATE GRAND FINAL
  // ==========================================
  matchesToCreate.push({
    id: grandFinalId,
    tournament_id: tournamentId,
    team_a: 'TBD',
    team_b: 'TBD',
    round: 1,
    bracket_position: 0,
    bracket_side: 'grand_final',
    next_match_id: null,
    is_bye: false,
    match_format: 'BO5',
    stage_id: stageId
  })

  // Insert all matches
  const { data: createdMatches, error } = await supabase
    .from('matches')
    .insert(matchesToCreate)
    .select()

  if (error) {
    throw new Error(`Failed to create bracket: ${error.message}`)
  }

  return createdMatches as Match[]
}

/**
 * Main function to generate a bracket based on format
 * @param teams - Optional array of team names to place in the first round
 */
export async function generateBracket(
  tournamentId: string,
  bracketSize: number,
  format: TournamentFormat,
  defaultMatchFormat: MatchFormat = 'BO3',
  teams: string[] = [],
  stageId?: string | null
): Promise<Match[]> {
  if (format === 'single_elimination') {
    return generateSingleEliminationBracket(
      tournamentId,
      bracketSize,
      defaultMatchFormat,
      teams,
      stageId
    )
  } else if (format === 'double_elimination') {
    return generateDoubleEliminationBracket(
      tournamentId,
      bracketSize,
      defaultMatchFormat,
      teams,
      stageId
    )
  }

  throw new Error(`Unsupported format: ${format}`)
}

// ============================================
// TEAM ASSIGNMENT
// ============================================

/**
 * Assign a team to a match slot (team_a or team_b)
 */
export async function assignTeamToMatch(
  matchId: string,
  slot: 'team_a' | 'team_b',
  teamName: string
): Promise<Match> {
  const { data: match, error } = await supabase
    .from('matches')
    .update({ [slot]: teamName })
    .eq('id', matchId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to assign team: ${error.message}`)
  }

  return match as Match
}

/**
 * Remove a team from a match slot (set back to TBD)
 */
export async function removeTeamFromMatch(
  matchId: string,
  slot: 'team_a' | 'team_b'
): Promise<Match> {
  return assignTeamToMatch(matchId, slot, 'TBD')
}

/**
 * Get all teams already assigned in a bracket's first round
 */
export async function getAssignedTeams(tournamentId: string): Promise<string[]> {
  const { data: matches, error } = await supabase
    .from('matches')
    .select('team_a, team_b')
    .eq('tournament_id', tournamentId)
    .eq('round', 1)
    .not('bracket_position', 'is', null)

  if (error) {
    throw new Error(error.message)
  }

  const teams = new Set<string>()
  matches.forEach((m) => {
    if (m.team_a && m.team_a !== 'TBD') teams.add(m.team_a)
    if (m.team_b && m.team_b !== 'TBD') teams.add(m.team_b)
  })

  return Array.from(teams)
}

// ============================================
// BRACKET DATA RETRIEVAL
// ============================================

/**
 * Get bracket matches organized by rounds
 */
export async function getBracketData(
  tournamentId: string
): Promise<BracketData> {
  const { data: matches, error } = await supabase
    .from('matches')
    .select()
    .eq('tournament_id', tournamentId)
    .not('bracket_position', 'is', null)
    .order('round', { ascending: true })
    .order('bracket_position', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  if (!matches || matches.length === 0) {
    return { rounds: [], totalRounds: 0, champion: null }
  }

  // Separate by bracket side
  const winnersMatches = matches.filter(
    (m) => m.bracket_side === 'winners'
  ) as Match[]
  const losersMatches = matches.filter(
    (m) => m.bracket_side === 'losers'
  ) as Match[]
  const grandFinal = matches.find(
    (m) => m.bracket_side === 'grand_final'
  ) as Match | undefined

  // Group winners by round
  const winnersRounds = groupMatchesByRound(winnersMatches, 'winners')
  const losersRounds = groupMatchesByRound(losersMatches, 'losers')

  // Combine rounds (winners first, then losers, then grand final)
  const allRounds = [...winnersRounds]

  if (losersRounds.length > 0) {
    allRounds.push(...losersRounds)
  }

  if (grandFinal) {
    allRounds.push({
      roundNumber: 0, // Special round
      roundName: 'Grande Finale',
      matches: [grandFinal],
    })
  }

  // Determine champion
  let champion: string | null = null
  const finalMatch = grandFinal || winnersMatches[winnersMatches.length - 1]
  if (finalMatch?.result) {
    champion = finalMatch.result.winner
  }

  const totalRounds = Math.max(
    ...winnersMatches.map((m) => m.round),
    0
  )

  return {
    rounds: allRounds,
    totalRounds,
    champion,
  }
}

/**
 * Get only winners bracket data (for single elimination display)
 */
export async function getWinnersBracketData(
  tournamentId: string
): Promise<BracketRound[]> {
  const { data: matches, error } = await supabase
    .from('matches')
    .select()
    .eq('tournament_id', tournamentId)
    .eq('bracket_side', 'winners')
    .not('bracket_position', 'is', null)
    .order('round', { ascending: true })
    .order('bracket_position', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return groupMatchesByRound(matches as Match[], 'winners')
}

/**
 * Helper function to group matches by round
 */
function groupMatchesByRound(
  matches: Match[],
  bracketSide: BracketSide
): BracketRound[] {
  const roundMap = new Map<number, Match[]>()

  matches.forEach((match) => {
    const round = match.round
    if (!roundMap.has(round)) {
      roundMap.set(round, [])
    }
    roundMap.get(round)!.push(match)
  })

  const totalRounds = Math.max(...Array.from(roundMap.keys()), 0)

  const rounds: BracketRound[] = []
  roundMap.forEach((roundMatches, roundNumber) => {
    rounds.push({
      roundNumber,
      roundName: getRoundName(roundNumber, totalRounds, bracketSide),
      matches: roundMatches,
    })
  })

  // Sort by round number
  rounds.sort((a, b) => a.roundNumber - b.roundNumber)

  return rounds
}

// ============================================
// BRACKET VALIDATION
// ============================================

/**
 * Check if all first round matches have both teams assigned
 */
export async function isBracketReady(tournamentId: string): Promise<boolean> {
  const { data: matches, error } = await supabase
    .from('matches')
    .select('team_a, team_b, is_bye')
    .eq('tournament_id', tournamentId)
    .eq('round', 1)
    .not('bracket_position', 'is', null)

  if (error) {
    throw new Error(error.message)
  }

  // All non-bye matches must have both teams
  return matches.every(
    (m) => m.is_bye || (m.team_a !== 'TBD' && m.team_b !== 'TBD')
  )
}

/**
 * Get progress of bracket setup (assigned / total slots)
 */
export async function getBracketSetupProgress(
  tournamentId: string
): Promise<{ assigned: number; total: number }> {
  const { data: matches, error } = await supabase
    .from('matches')
    .select('team_a, team_b, is_bye')
    .eq('tournament_id', tournamentId)
    .eq('round', 1)
    .not('bracket_position', 'is', null)

  if (error) {
    throw new Error(error.message)
  }

  let assigned = 0
  let total = 0

  matches.forEach((m) => {
    if (!m.is_bye) {
      total += 2
      if (m.team_a !== 'TBD') assigned++
      if (m.team_b !== 'TBD') assigned++
    }
  })

  return { assigned, total }
}
