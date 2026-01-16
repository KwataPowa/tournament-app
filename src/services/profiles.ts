import { supabase } from '../lib/supabase'
import type { Profile, ProfileInsert, ProfileUpdate } from '../types'

/**
 * Crée un profil pour un utilisateur
 */
export async function createProfile(profile: ProfileInsert): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Profile
}

/**
 * Récupère un profil par son ID (user_id)
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    throw new Error(error.message)
  }

  return data as Profile
}

/**
 * Récupère plusieurs profils par leurs IDs
 */
export async function getProfiles(userIds: string[]): Promise<Profile[]> {
  if (userIds.length === 0) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds)

  if (error) {
    throw new Error(error.message)
  }

  return data as Profile[]
}

/**
 * Met à jour un profil
 */
export async function updateProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Profile
}

/**
 * Vérifie si un pseudo est disponible
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned = username is available
      return true
    }
    throw new Error(error.message)
  }

  return data === null
}
