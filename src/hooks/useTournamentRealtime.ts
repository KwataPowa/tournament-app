import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Match, Prediction } from '../types'

type RealtimeCallbacks = {
  onMatchUpdate: (match: Match) => void
  onPredictionUpdate: (prediction: Prediction) => void
  onLeaderboardUpdate: () => void
}

/**
 * Hook pour écouter les changements en temps réel d'un tournoi
 * - Résultats des matchs
 * - Points des prédictions
 * - Classement des participants
 */
export function useTournamentRealtime(
  tournamentId: string | undefined,
  callbacks: RealtimeCallbacks
) {
  const { onMatchUpdate, onPredictionUpdate, onLeaderboardUpdate } = callbacks

  useEffect(() => {
    if (!tournamentId) return

    // Canal unique pour toutes les subscriptions du tournoi
    const channel = supabase
      .channel(`tournament:${tournamentId}`)
      // Écouter les changements sur les matchs (résultats)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          console.log('Match updated:', payload.new)
          onMatchUpdate(payload.new as Match)
        }
      )
      // Écouter les changements sur les prédictions (points)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'predictions',
        },
        (payload) => {
          console.log('Prediction updated:', payload.new)
          onPredictionUpdate(payload.new as Prediction)
        }
      )
      // Écouter les nouvelles prédictions
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'predictions',
        },
        (payload) => {
          console.log('New prediction:', payload.new)
          onPredictionUpdate(payload.new as Prediction)
        }
      )
      // Écouter les changements sur les participants (leaderboard)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          console.log('Leaderboard updated')
          onLeaderboardUpdate()
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    return () => {
      console.log('Unsubscribing from tournament realtime')
      supabase.removeChannel(channel)
    }
  }, [tournamentId, onMatchUpdate, onPredictionUpdate, onLeaderboardUpdate])
}
