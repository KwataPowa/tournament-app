import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '../lib/AuthContext'
import { getProfile } from '../services/profiles'

export function useProfile() {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null
      return getProfile(user.id)
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  })

  // Helper to force update cache from other components
  const invalidateProfile = () => {
    return queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
  }

  return {
    profile: profile || null,
    loading: isLoading,
    hasProfile: !!profile,
    refetch,
    invalidateProfile
  }
}
