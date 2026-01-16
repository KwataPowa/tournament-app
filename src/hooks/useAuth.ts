import { useEffect, useState, useCallback } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { createProfile } from '../services/profiles'

type AuthState = {
  user: User | null
  session: Session | null
  loading: boolean
}

export type SignUpData = {
  email: string
  password: string
  username: string
  avatar_url?: string
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      })
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
        })
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = useCallback(
    async (data: SignUpData): Promise<{ error: AuthError | Error | null }> => {
      const { email, password, username, avatar_url } = data

      // 1. Créer le compte utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            avatar_url,
          },
        },
      })

      if (authError) {
        return { error: authError }
      }

      // 2. Créer le profil si l'utilisateur a été créé
      if (authData.user) {
        try {
          await createProfile({
            id: authData.user.id,
            username,
            avatar_url: avatar_url || null,
          })
        } catch (profileError) {
          // Si la création du profil échoue, on ne peut pas annuler l'inscription
          // mais on retourne l'erreur pour informer l'utilisateur
          return { error: profileError as Error }
        }
      }

      return { error: null }
    },
    []
  )

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: AuthError | null }> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    },
    []
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    signUp,
    signIn,
    signOut,
  }
}
