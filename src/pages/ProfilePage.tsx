import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../lib/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { createProfile, updateProfile } from '../services/profiles'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { AvatarPicker, ALL_AVATARS, AVATAR_MAP } from '../components/AvatarPicker'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

export function ProfilePage() {
  const { user } = useAuthContext()
  const { profile, loading: profileLoading, hasProfile, refetch } = useProfile()
  const navigate = useNavigate()

  // Default to first option
  const [username, setUsername] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(ALL_AVATARS[0].id)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Pré-remplir les champs si le profil existe
  useEffect(() => {
    if (profile) {
      setUsername(profile.username)
      // Si l'avatar du profil est valide, on l'utilise. 
      // Si c'est un ancien emoji, on le garde aussi (il sera affiché en texte si pas dans la liste)
      setSelectedAvatar(profile.avatar_url || ALL_AVATARS[0].id)
    }
  }, [profile])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!user) {
      setError('Vous devez être connecté')
      return
    }

    // Validation du pseudo
    if (username.length < 3) {
      setError('Le pseudo doit contenir au moins 3 caractères')
      return
    }
    if (username.length > 20) {
      setError('Le pseudo ne doit pas dépasser 20 caractères')
      return
    }

    setSaving(true)

    try {
      if (hasProfile) {
        // Mise à jour du profil existant
        await updateProfile(user.id, {
          username,
          avatar_url: selectedAvatar,
        })
        setSuccess('Profil mis à jour !')
        await refetch()
      } else {
        // Création d'un nouveau profil
        await createProfile({
          id: user.id,
          username,
          avatar_url: selectedAvatar,
        })
        setSuccess('Profil créé !')
        await refetch()
      }
    } catch (err) {
      if (err instanceof Error) {
        // Gérer l'erreur de pseudo déjà pris
        if (err.message.includes('username_unique') || err.message.includes('duplicate')) {
          setError('Ce pseudo est déjà pris')
        } else {
          setError(err.message)
        }
      } else {
        setError('Une erreur est survenue')
      }
    } finally {
      setSaving(false)
    }
  }

  // Helper to render the avatar (icon or emoji fallback)
  const renderAvatar = (avatarId: string, className: string = "w-full h-full") => {
    const Icon = AVATAR_MAP[avatarId]
    if (Icon) {
      return <Icon className={className} />
    }
    // Fallback for legacy emojis or direct URLs
    return <span className={className.includes('w-12') ? 'text-2xl' : 'text-4xl'}>{avatarId}</span>
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <span className="text-gray-400">Chargement...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto animate-fade-scale">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="relative inline-block mb-4 h-24 w-24 flex items-center justify-center">
          <div className="absolute -inset-3 bg-violet-500/20 rounded-full blur-xl animate-pulse-glow" />
          <div className="relative text-violet-400">
            {renderAvatar(selectedAvatar, "w-16 h-16")}
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {hasProfile ? 'Mon profil' : 'Créer mon profil'}
        </h1>
        {!hasProfile && (
          <p className="text-gray-400">
            Choisis un pseudo et un avatar pour te distinguer dans les classements !
          </p>
        )}
      </div>

      <Card glow="violet">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <Input
            label="Pseudo"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={20}
            placeholder="Ton pseudo"
          />
          <p className="text-xs text-gray-500 -mt-4 ml-1">Entre 3 et 20 caractères</p>

          {/* Avatar selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Avatar
            </label>
            <AvatarPicker
              selected={selectedAvatar}
              onSelect={setSelectedAvatar}
            />
            {/* If current avatar is not in options (legacy emoji), show it as selected */}
            {!ALL_AVATARS.some(opt => opt.id === selectedAvatar) && (
              <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10 flex items-center gap-3">
                <span className="text-sm text-gray-400">Avatar actuel (hérité) :</span>
                <span className="text-2xl">{selectedAvatar}</span>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-slide-up">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                {error}
              </p>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-slide-up">
              <p className="text-sm text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                {success}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              isLoading={saving}
              className="flex-1"
            >
              {hasProfile ? 'Enregistrer' : 'Créer mon profil'}
            </Button>
            {hasProfile && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(-1)}
              >
                Annuler
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Email info */}
      {user?.email && (
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Connecté avec <span className="text-gray-400">{user.email}</span>
          </p>
        </div>
      )}
    </div>
  )
}
