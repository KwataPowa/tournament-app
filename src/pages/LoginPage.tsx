import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../lib/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import {
  Trophy,
  Gamepad2,
  Hand,
  AlertTriangle,
  CheckCircle2,
  User,
  Ghost,
  Swords,
  Target,
  Zap,
  Crown,
  Skull,
  Rocket,
  Flame,
  Cat
} from 'lucide-react'

type Mode = 'login' | 'signup'

const AVATAR_OPTIONS = [
  { id: 'user', icon: User },
  { id: 'ghost', icon: Ghost },
  { id: 'gamepad', icon: Gamepad2 },
  { id: 'cat', icon: Cat },
  { id: 'swords', icon: Swords },
  { id: 'trophy', icon: Trophy },
  { id: 'target', icon: Target },
  { id: 'zap', icon: Zap },
  { id: 'crown', icon: Crown },
  { id: 'skull', icon: Skull },
  { id: 'rocket', icon: Rocket },
  { id: 'flame', icon: Flame },
]

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0].id)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const { signIn, signUp } = useAuthContext()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        } else {
          navigate('/')
        }
      } else {
        if (username.length < 3) {
          setError('Le pseudo doit contenir au moins 3 caractères')
          setLoading(false)
          return
        }
        if (username.length > 20) {
          setError('Le pseudo ne doit pas dépasser 20 caractères')
          setLoading(false)
          return
        }

        const { error } = await signUp({
          email,
          password,
          username,
          avatar_url: selectedAvatar,
        })
        if (error) {
          setError(error.message)
        } else {
          setMessage('Vérifie tes emails pour confirmer ton compte !')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050208]">
      {/* Background Atmosphere - Enhanced for login */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-20" />

        {/* Animated gradient orbs */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full animate-gradient"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 60%)',
            top: '-300px',
            left: '10%',
            animationDuration: '15s',
          }}
        />
        <div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, transparent 60%)',
            bottom: '-200px',
            right: '5%',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(167, 139, 250, 0.2) 0%, transparent 60%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Additional accent orbs */}
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-50"
          style={{
            background: 'radial-gradient(circle, rgba(251, 146, 60, 0.1) 0%, transparent 60%)',
            top: '20%',
            right: '20%',
          }}
        />

        {/* Noise texture */}
        <div className="absolute inset-0 bg-noise opacity-50" />
      </div>

      {/* Content */}
      <div className="w-full max-w-md px-4 z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up" style={{ animationDelay: '0s' }}>
          <div className="relative inline-block mb-4">
            <div className="absolute -inset-4 bg-violet-500/20 rounded-full blur-2xl animate-pulse-glow" />
            <span className="relative inline-block animate-float">
              <Trophy className="w-20 h-20 text-yellow-400" />
            </span>
          </div>
          <h1 className="text-5xl font-bold text-gradient mb-2">
            Pronostics
          </h1>
          <p className="text-gray-400 text-lg">
            La plateforme eSport pour tes tournois entre amis
          </p>
        </div>

        {/* Login Card */}
        <Card
          className="border-violet-500/20 shadow-2xl shadow-violet-900/30 animate-slide-up"
          style={{ animationDelay: '0.15s' }}
        >
          {/* Tab Switcher */}
          <div className="flex gap-1 mb-6 p-1 bg-white/5 rounded-xl">
            <button
              onClick={() => setMode('login')}
              className={`
                flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300
                ${mode === 'login'
                  ? 'bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-lg shadow-violet-900/50'
                  : 'text-gray-400 hover:text-white'
                }
              `}
            >
              Connexion
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`
                flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300
                ${mode === 'signup'
                  ? 'bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-lg shadow-violet-900/50'
                  : 'text-gray-400 hover:text-white'
                }
              `}
            >
              Inscription
            </button>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2">
            {mode === 'login' ? <><Hand className="w-6 h-6 text-yellow-400" /> Bon retour parmi nous !</> : <><Gamepad2 className="w-6 h-6 text-violet-400" /> Crée ton profil joueur</>}
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-5 animate-slide-up">
                <Input
                  id="username"
                  label="Pseudo"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={20}
                  placeholder="GamerTag123"
                />

                {/* Avatar Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3 ml-1">
                    Choisis ton avatar
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATAR_OPTIONS.map((option, index) => {
                      const Icon = option.icon
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedAvatar(option.id)}
                          className={`
                            aspect-square rounded-xl flex items-center justify-center
                            transition-all duration-300 border-2
                            ${selectedAvatar === option.id
                              ? 'bg-violet-500/20 border-violet-500 ring-2 ring-violet-400/50 shadow-lg shadow-violet-500/20 scale-110'
                              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                            }
                          `}
                          style={{ animationDelay: `${index * 0.03}s` }}
                          title={option.id}
                        >
                          <Icon className={`w-6 h-6 ${selectedAvatar === option.id ? 'text-violet-300' : 'text-gray-400'}`} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="gamer@example.com"
            />

            <Input
              id="password"
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-slide-up">
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </p>
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-slide-up">
                <p className="text-sm text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  {message}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              isLoading={loading}
              className="w-full mt-6"
              size="lg"
            >
              {mode === 'login' ? "Entrer dans l'arène" : 'Rejoindre la partie'}
            </Button>
          </form>
        </Card>

        {/* Footer */}
        <p
          className="text-center text-gray-500 text-sm mt-6 animate-slide-up"
          style={{ animationDelay: '0.3s' }}
        >
          Pronostics entre amis • Tournois eSport • Scores en temps réel
        </p>
      </div>
    </div>
  )
}
