import { supabase } from '../lib/supabase'
import type { Match, MatchInsert, MatchUpdate } from '../types'

export async function createMatch(data: MatchInsert): Promise<Match> {
  const { data: match, error } = await supabase
    .from('matches')
    .insert(data)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return match as Match
}

export async function updateMatch(id: string, data: MatchUpdate): Promise<Match> {
  const { data: match, error } = await supabase
    .from('matches')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return match as Match
}

export async function deleteMatch(id: string): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getMatchesByTournament(tournamentId: string): Promise<Match[]> {
  const { data: matches, error } = await supabase
    .from('matches')
    .select()
    .eq('tournament_id', tournamentId)
    .order('round', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return matches as Match[]
}

export async function enterMatchResult(
  matchId: string,
  result: { winner: string; score: string }
): Promise<Match> {
  const { data: match, error } = await supabase
    .from('matches')
    .update({
      result,
      played_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return match as Match
}

/**
 * Corrige un résultat de match avec effet domino sur les matchs suivants (brackets)
 * - Met à jour le résultat du match
 * - Propage le changement aux matchs suivants si les équipes qualifiées changent
 * - Supprime les pronostics des matchs impactés (contexte changé)
 * - Recalcule les points et rangs
 */
export async function updateMatchResultRecursive(
  matchId: string,
  newWinner: string,
  newScore: string
): Promise<void> {
  const { error } = await supabase.rpc('update_match_result_recursive', {
    p_match_id: matchId,
    p_new_winner: newWinner,
    p_new_score: newScore,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function recalculateTournamentPoints(tournamentId: string): Promise<void> {
  const { error } = await supabase.rpc('recalculate_tournament_points', {
    p_tournament_id: tournamentId,
  })

  if (error) {
    throw new Error(error.message)
  }
}
