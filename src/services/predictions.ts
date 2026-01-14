import { supabase } from '../lib/supabase'
import type { Prediction, PredictionInsert } from '../types'

export async function createPrediction(data: PredictionInsert): Promise<Prediction> {
  const { data: prediction, error } = await supabase
    .from('predictions')
    .insert(data)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return prediction as Prediction
}

export async function updatePrediction(
  id: string,
  data: { predicted_winner: string; predicted_score: string }
): Promise<Prediction> {
  const { data: prediction, error } = await supabase
    .from('predictions')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return prediction as Prediction
}

export async function getUserPrediction(
  matchId: string,
  userId: string
): Promise<Prediction | null> {
  const { data: prediction, error } = await supabase
    .from('predictions')
    .select()
    .eq('match_id', matchId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return prediction as Prediction | null
}

export async function getUserPredictionsForTournament(
  tournamentId: string,
  userId: string
): Promise<Prediction[]> {
  const { data: predictions, error } = await supabase
    .from('predictions')
    .select(`
      *,
      matches!inner(tournament_id)
    `)
    .eq('matches.tournament_id', tournamentId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }

  return predictions as Prediction[]
}

export async function createOrUpdatePrediction(
  matchId: string,
  userId: string,
  predictedWinner: string,
  predictedScore: string
): Promise<Prediction> {
  // Check if prediction already exists
  const existing = await getUserPrediction(matchId, userId)

  if (existing) {
    return updatePrediction(existing.id, {
      predicted_winner: predictedWinner,
      predicted_score: predictedScore,
    })
  }

  return createPrediction({
    match_id: matchId,
    user_id: userId,
    predicted_winner: predictedWinner,
    predicted_score: predictedScore,
  })
}

// Check if a match is locked for predictions
export function isMatchLocked(match: { locked_at: string | null; result: unknown }): boolean {
  // Match is locked if it has a result
  if (match.result !== null) {
    return true
  }

  // Match is locked if locked_at is set and in the past
  if (match.locked_at) {
    return new Date(match.locked_at) <= new Date()
  }

  return false
}
