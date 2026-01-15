import { supabase } from '../lib/supabase'
import type { Tournament, TournamentInsert, TournamentUpdate, Match } from '../types'

export async function createTournament(data: TournamentInsert): Promise<Tournament> {
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert(data)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return tournament as Tournament
}

export async function getTournament(id: string): Promise<Tournament> {
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select()
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return tournament as Tournament
}

export async function getTournamentWithMatches(id: string): Promise<{
  tournament: Tournament
  matches: Match[]
}> {
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select()
    .eq('id', id)
    .single()

  if (tournamentError) {
    throw new Error(tournamentError.message)
  }

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select()
    .eq('tournament_id', id)
    .order('round', { ascending: true })
    .order('created_at', { ascending: true })

  if (matchesError) {
    throw new Error(matchesError.message)
  }

  return {
    tournament: tournament as Tournament,
    matches: matches as Match[],
  }
}

export async function getUserTournaments(userId: string): Promise<Tournament[]> {
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      participants!inner(user_id)
    `)
    .eq('participants.user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return tournaments as Tournament[]
}

export async function updateTournament(
  id: string,
  data: TournamentUpdate
): Promise<Tournament> {
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return tournament as Tournament
}

export async function deleteTournament(id: string): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Calcule le nombre de matchs attendu pour une ligue
 */
export function calculateExpectedMatches(teamCount: number, homeAndAway: boolean): number {
  if (teamCount < 2) return 0
  const oneWay = (teamCount * (teamCount - 1)) / 2
  return homeAndAway ? oneWay * 2 : oneWay
}

/**
 * Trouver un tournoi par son code d'invitation
 */
export async function getTournamentByInviteCode(inviteCode: string): Promise<Tournament | null> {
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select()
    .eq('invite_code', inviteCode.toLowerCase().trim())
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    throw new Error(error.message)
  }

  return tournament as Tournament
}

/**
 * Vérifier si un utilisateur est déjà participant
 */
export async function isUserParticipant(tournamentId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('participants')
    .select('tournament_id')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return false
    }
    throw new Error(error.message)
  }

  return !!data
}

/**
 * Rejoindre un tournoi
 */
export async function joinTournament(tournamentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('participants')
    .insert({
      tournament_id: tournamentId,
      user_id: userId,
    })

  if (error) {
    if (error.code === '23505') {
      throw new Error('Tu participes déjà à ce tournoi')
    }
    throw new Error(error.message)
  }
}

/**
 * Exclure un participant d'un tournoi (admin only)
 * Supprime ses pronostics et son entrée participant
 */
export async function removeParticipant(tournamentId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_tournament_participant', {
    p_tournament_id: tournamentId,
    p_user_id: userId,
  })

  if (error) {
    throw new Error(error.message)
  }
}
