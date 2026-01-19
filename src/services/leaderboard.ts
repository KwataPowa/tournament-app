import { supabase } from '../lib/supabase'
import type { Participant, Profile } from '../types'

export type LeaderboardEntry = Participant & {
  username: string
  avatar_url: string | null
  isCurrentUser: boolean
  bonus_points: number
}

/**
 * Récupère le classement d'un tournoi avec les profils des participants
 */
export async function getLeaderboard(
  tournamentId: string,
  currentUserId: string | undefined
): Promise<LeaderboardEntry[]> {
  const { data: participants, error } = await supabase
    .from('participants')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('total_points', { ascending: false })
    .order('joined_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  if (!participants || participants.length === 0) {
    return []
  }

  // Récupérer les profils de tous les participants
  const userIds = participants.map((p) => p.user_id)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds)

  if (profilesError) {
    throw new Error(profilesError.message)
  }

  // Créer un map des profils par user_id
  const profilesMap = new Map<string, Profile>()
  if (profiles) {
    for (const profile of profiles as Profile[]) {
      profilesMap.set(profile.id, profile)
    }
  }

  // Mapper les participants avec leur profil et rang
  return (participants as Participant[]).map((participant, index) => {
    const profile = profilesMap.get(participant.user_id)
    const isCurrentUser = participant.user_id === currentUserId

    return {
      ...participant,
      rank: index + 1,
      username: profile?.username ?? `Joueur ${participant.user_id.slice(0, 8)}`,
      avatar_url: profile?.avatar_url ?? null,
      isCurrentUser,
      bonus_points: participant.bonus_points
    }
  })
}
