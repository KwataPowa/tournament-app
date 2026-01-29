import { supabase } from '../lib/supabase'
import type { Match } from '../types'

export type PendingPredictionMatch = Match & {
    tournament: {
        id: string
        name: string
        teams: { name: string; logo?: string }[]
    }
}

export type RecentActivityItem = Match & {
    tournament: {
        id: string
        name: string
    }
    prediction?: {
        predicted_winner: string
        predicted_score: string
        points_earned: number | null
    }
}

export type DashboardStats = {
    organizedCount: number
    joinedCount: number
    matchesWithPredictions: number
    totalPoints: number
}

/**
 * Récupère les matchs à venir pour lesquels l'utilisateur n'a pas encore pronostiqué
 * Limité aux tournois rejoints
 */
export async function getPendingPredictions(userId: string): Promise<PendingPredictionMatch[]> {
    // 1. Récupérer les IDs des tournois rejoints
    const { data: participations } = await supabase
        .from('participants')
        .select('tournament_id')
        .eq('user_id', userId)

    // 1b. Récupérer les IDs des tournois administrés
    const { data: adminTournaments } = await supabase
        .from('tournaments')
        .select('id')
        .eq('admin_id', userId)
        .neq('status', 'draft') // On exclut les brouillons

    const participantIds = participations?.map(p => p.tournament_id) || []
    const adminIds = adminTournaments?.map(t => t.id) || []

    // Fusionner les IDs uniques
    const tournamentIds = Array.from(new Set([...participantIds, ...adminIds]))

    if (tournamentIds.length === 0) return []

    // 2. Récupérer les IDs des matchs déjà pronostiqués
    const { data: existingPredictions } = await supabase
        .from('predictions')
        .select('match_id')
        .eq('user_id', userId)

    const predictedMatchIds = existingPredictions?.map(p => p.match_id) || []

    // 3. Récupérer les matchs ouverts de ces tournois
    // Un match "ouvert" est un match sans résultat et non verrouillé (locked_at futur ou null)
    const now = new Date().toISOString()

    const { data: matches, error } = await supabase
        .from('matches')
        .select(`
      *,
      tournament:tournaments(id, name, teams)
    `)
        .in('tournament_id', tournamentIds)
        .is('result', null) // Match non joué
        .or(`locked_at.is.null,locked_at.gt.${now}`) // Non verrouillé manuellement
        .or(`start_time.is.null,start_time.gt.${now}`) // Pas commencé ou heure non définie
        .neq('team_a', 'TBD') // Pas de placeholder TBD
        .neq('team_b', 'TBD')
        .neq('is_bye', true) // Pas de match exempté/bye
        .neq('team_a', 'BYE')
        .neq('team_b', 'BYE')
        .order('start_time', { ascending: true }) // Les plus proches d'abord
        .limit(20)

    if (error) throw new Error(error.message)

    // 4. Filtrer ceux déjà pronostiqués (Supabase ne supporte pas facilement le "NOT IN" sur une sous-requête cross-table)
    const pendingMatches = (matches as unknown as PendingPredictionMatch[]).filter(
        m => !predictedMatchIds.includes(m.id)
    )

    return pendingMatches
}

/**
 * Récupère les derniers matchs terminés avec le prono de l'utilisateur
 */
export async function getRecentActivity(userId: string): Promise<RecentActivityItem[]> {
    // Récupérer les pronostics de l'utilisateur sur des matchs terminés
    const { data: predictions, error } = await supabase
        .from('predictions')
        .select(`
      predicted_winner,
      predicted_score,
      points_earned,
      match:matches!inner(
        *,
        tournament:tournaments(id, name)
      )
    `)
        .eq('user_id', userId)
        .not('match.result', 'is', null) // Match terminé
        .order('match(played_at)', { ascending: false }) // Du plus récent au plus ancien
        .limit(10)

    if (error) throw new Error(error.message)

    // Transformer la structure pour aplatir
    return predictions.map((p: any) => ({
        ...p.match,
        prediction: {
            predicted_winner: p.predicted_winner,
            predicted_score: p.predicted_score,
            points_earned: p.points_earned
        }
    }))
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
    // Tournois organisés
    const { count: organizedCount } = await supabase
        .from('tournaments')
        .select('*', { count: 'exact', head: true })
        .eq('admin_id', userId)

    // Tournois rejoints (hors admin si on veut distinguer, ou tout inclus)
    const { count: joinedCount } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

    // Total points et matchs pronostiqués
    const { data: stats } = await supabase
        .from('participants')
        .select('total_points')
        .eq('user_id', userId)

    const totalPoints = stats?.reduce((acc, curr) => acc + (curr.total_points || 0), 0) || 0

    const { count: matchesWithPredictions } = await supabase
        .from('predictions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

    return {
        organizedCount: organizedCount || 0,
        joinedCount: joinedCount || 0,
        matchesWithPredictions: matchesWithPredictions || 0,
        totalPoints
    }
}
