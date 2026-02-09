import { useState, useMemo } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthContext } from '../lib/AuthContext'
import { createTournament, calculateExpectedMatches } from '../services/tournaments'
import { generateBracket, nextPowerOf2 } from '../services/brackets'
import { calculateSwissRounds, generateSwissPairings, generateSwissRound } from '../services/swiss'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { ScoringRules, Team, TournamentFormat, MatchFormat, FormatScoringOverride } from '../types'
import {
  Trophy,
  FileText,
  Settings,
  Check,
  Grid,
  Medal,
  Award,
  Target,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Trash2,
  AlertCircle,
  Plus,
  Shuffle
} from 'lucide-react'

type FormErrors = {
  name?: string
  teams?: string
  correctWinnerPoints?: string
  exactScoreBonus?: string
  swissRounds?: string
}

type TeamInput = {
  id: string
  name: string
  logo: string
}

export function CreateTournamentPage() {
  const navigate = useNavigate()
  const { user } = useAuthContext()

  const [name, setName] = useState('')
  const [format, setFormat] = useState<TournamentFormat>('league')
  const [homeAndAway, setHomeAndAway] = useState(false)
  const [defaultMatchFormat, setDefaultMatchFormat] = useState<MatchFormat>('BO3')
  const [seedingMode, setSeedingMode] = useState<'random' | 'manual'>('random')
  const [swissRounds, setSwissRounds] = useState(5)
  const [swissPairingMode, setSwissPairingMode] = useState<'auto' | 'manual'>('auto')
  const [swissWinsToQualify, setSwissWinsToQualify] = useState(3)
  const [swissLossesToEliminate, setSwissLossesToEliminate] = useState(3)
  const [teamInputs, setTeamInputs] = useState<TeamInput[]>([
    { id: crypto.randomUUID(), name: '', logo: '' },
    { id: crypto.randomUUID(), name: '', logo: '' },
  ])
  const [correctWinnerPoints, setCorrectWinnerPoints] = useState('1')
  const [exactScoreBonus, setExactScoreBonus] = useState('1')
  const [perFormatEnabled, setPerFormatEnabled] = useState(false)
  const [perFormatOverrides, setPerFormatOverrides] = useState<Partial<Record<MatchFormat, { winner: string; score: string }>>>({})

  const allFormats: MatchFormat[] = ['BO1', 'BO3', 'BO5', 'BO7']

  const updateFormatOverride = (fmt: MatchFormat, field: 'winner' | 'score', value: string) => {
    setPerFormatOverrides(prev => {
      const current = prev[fmt] || { winner: '', score: '' }
      const updated = { ...current, [field]: value }
      // Si les deux champs sont vides, supprimer l'override
      if (!updated.winner && !updated.score) {
        const { [fmt]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [fmt]: updated }
    })
  }

  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Filtrer les équipes valides (avec un nom)
  const validTeams = useMemo(() => {
    return teamInputs.filter((t) => t.name.trim().length > 0)
  }, [teamInputs])

  // Convertir en format Team pour l'API
  const teams: Team[] = useMemo(() => {
    return validTeams.map((t) => ({
      name: t.name.trim(),
      logo: t.logo.trim() || undefined,
    }))
  }, [validTeams])

  // Handlers pour les équipes
  const addTeam = () => {
    setTeamInputs([...teamInputs, { id: crypto.randomUUID(), name: '', logo: '' }])
  }

  const removeTeam = (id: string) => {
    if (teamInputs.length <= 2) return
    setTeamInputs(teamInputs.filter((t) => t.id !== id))
  }

  const updateTeam = (id: string, field: 'name' | 'logo', value: string) => {
    setTeamInputs(teamInputs.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
  }

  // Calculer les stats de la ligue
  const leagueStats = useMemo(() => {
    if (format !== 'league' || teams.length < 2) return null
    return {
      teams: teams.length,
      matches: calculateExpectedMatches(teams.length, homeAndAway),
    }
  }, [format, teams, homeAndAway])

  // Vérifier si le format est elimination ou swiss
  const isElimination = format === 'single_elimination' || format === 'double_elimination'
  const isSwiss = format === 'swiss'

  // Stats pour le format Swiss
  const swissStats = useMemo(() => {
    if (!isSwiss || teams.length < 2) return null
    const recommendedRounds = calculateSwissRounds(teams.length)
    return {
      teams: teams.length,
      recommendedRounds,
      totalMatches: Math.floor(teams.length / 2) * swissRounds + (teams.length % 2 === 1 ? swissRounds : 0)
    }
  }, [isSwiss, teams.length, swissRounds])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!name.trim()) {
      newErrors.name = 'Le nom du tournoi est requis'
    } else if (name.trim().length < 3) {
      newErrors.name = 'Le nom doit contenir au moins 3 caractères'
    } else if (name.trim().length > 100) {
      newErrors.name = 'Le nom ne peut pas dépasser 100 caractères'
    }

    // Validation des équipes pour tous les formats
    if (teams.length < 2) {
      newErrors.teams = 'Il faut au moins 2 équipes'
    } else if ((format === 'league' || format === 'swiss') && teams.length > 30) {
      newErrors.teams = 'Maximum 30 équipes'
    } else if (isElimination && teams.length > 32) {
      newErrors.teams = 'Maximum 32 équipes pour un bracket'
    } else {
      const uniqueTeams = new Set(teams.map((t) => t.name.toLowerCase()))
      if (uniqueTeams.size !== teams.length) {
        newErrors.teams = 'Les noms d\'équipes doivent être uniques'
      }
    }

    const winnerPts = parseInt(correctWinnerPoints, 10)
    if (isNaN(winnerPts) || winnerPts < 0) {
      newErrors.correctWinnerPoints = 'Doit être un nombre positif'
    } else if (winnerPts > 100) {
      newErrors.correctWinnerPoints = 'Maximum 100 points'
    }

    const bonusPts = parseInt(exactScoreBonus, 10)
    if (isNaN(bonusPts) || bonusPts < 0) {
      newErrors.exactScoreBonus = 'Doit être un nombre positif'
    } else if (bonusPts > 100) {
      newErrors.exactScoreBonus = 'Maximum 100 points'
    }

    // Validation Swiss config
    if (isSwiss) {
      const minRounds = swissWinsToQualify + swissLossesToEliminate - 1
      if (swissRounds < minRounds) {
        newErrors.swissRounds = `Besoin d'au moins ${minRounds} rounds pour ${swissWinsToQualify} wins / ${swissLossesToEliminate} losses`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validate()) {
      return
    }

    if (!user) {
      setSubmitError('Vous devez être connecté')
      return
    }

    setLoading(true)

    try {
      const scoringRules: ScoringRules = {
        correct_winner_points: parseInt(correctWinnerPoints, 10),
        exact_score_bonus: parseInt(exactScoreBonus, 10),
      }

      // Ajouter les overrides per-format si activees
      if (perFormatEnabled && Object.keys(perFormatOverrides).length > 0) {
        const perFormat: ScoringRules['per_format'] = {}
        for (const [fmt, vals] of Object.entries(perFormatOverrides)) {
          const override: FormatScoringOverride = {}
          if (vals.winner) override.correct_winner_points = parseInt(vals.winner, 10)
          if (vals.score) override.exact_score_bonus = parseInt(vals.score, 10)
          if (Object.keys(override).length > 0) {
            perFormat[fmt as MatchFormat] = override
          }
        }
        if (Object.keys(perFormat).length > 0) {
          scoringRules.per_format = perFormat
        }
      }

      const tournament = await createTournament({
        name: name.trim(),
        admin_id: user.id,
        format,
        status: 'active', // Active immédiatement dès la création
        scoring_rules: scoringRules,
        teams: teams,
        home_and_away: !isElimination && homeAndAway,
      })

      // Si c'est un format elimination, générer le bracket vide
      // Les équipes seront assignées manuellement par l'admin
      if (isElimination) {
        // Fetch the default stage created by trigger with retry mechanism
        // Triggers can be slightly async in propagation
        let stageId: string | null = null
        let retries = 0
        while (!stageId && retries < 5) {
          const { data: stage } = await supabase
            .from('stages')
            .select('id')
            .eq('tournament_id', tournament.id)
            .single()

          if (stage) {
            stageId = stage.id
          } else {
            // Wait 500ms
            await new Promise(resolve => setTimeout(resolve, 500))
            retries++
          }
        }

        if (!stageId) {
          console.error("Failed to retrieve default stage after creation")
          // Fallback: Continue without stage ID (will be orphaned but filtered correctly normally)
        }

        const actualBracketSize = nextPowerOf2(teams.length)

        // Préparer les équipes selon le mode de seeding
        let teamsToSeed: string[] = []
        if (seedingMode === 'random') {
          // Mélanger les équipes aléatoirement (Fisher-Yates shuffle)
          const shuffled = [...teams.map(t => t.name)]
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
          }
          teamsToSeed = shuffled
        }
        // Si mode 'manual', teamsToSeed reste vide -> matchs en TBD

        await generateBracket(
          tournament.id,
          actualBracketSize,
          format,
          defaultMatchFormat,
          teamsToSeed,
          stageId // Link to default stage
        )
      }

      // Si c'est un format Swiss, configurer le stage
      if (isSwiss) {
        // Fetch the default stage created by trigger with retry mechanism
        let stageId: string | null = null
        let retries = 0
        while (!stageId && retries < 5) {
          const { data: stage } = await supabase
            .from('stages')
            .select('id')
            .eq('tournament_id', tournament.id)
            .single()

          if (stage) {
            stageId = stage.id
          } else {
            await new Promise(resolve => setTimeout(resolve, 500))
            retries++
          }
        }

        if (stageId) {
          // Mettre à jour les settings du stage avec la config Swiss
          // current_round = 1 si auto (Round 1 sera généré), 0 si manuel (aucun match)
          await supabase
            .from('stages')
            .update({
              settings: {
                swiss_config: {
                  total_rounds: swissRounds,
                  current_round: swissPairingMode === 'auto' ? 1 : 0,
                  pairing_method: swissPairingMode === 'auto' ? 'dutch' : 'manual',
                  wins_to_qualify: swissWinsToQualify,
                  losses_to_eliminate: swissLossesToEliminate
                },
                selected_teams: teams.map(t => t.name),
                opponent_history: {}
              }
            })
            .eq('id', stageId)

          // Générer Round 1 seulement si mode automatique
          if (swissPairingMode === 'auto') {
            const initialStandings = teams.map(t => ({
              team: t.name,
              points: 0,
              wins: 0,
              losses: 0,
              draws: 0,
              buchholz: 0,
              opponentHistory: [] as string[],
              status: 'active' as const,
              record: '0-0'
            }))

            // Mélanger pour Round 1
            const shuffled = [...initialStandings]
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }

            const round1Pairings = generateSwissPairings(shuffled, {})
            await generateSwissRound(
              tournament.id,
              stageId,
              1,
              round1Pairings,
              defaultMatchFormat
            )
          }
        }
      }

      navigate(`/tournaments/${tournament.id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-scale">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to="/tournaments"
          className="text-gray-400 hover:text-violet-400 text-sm transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux tournois
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          Créer un tournoi
        </h1>
        <p className="text-gray-400">
          Configure ton tournoi avec le format, les règles et les participants.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" data-stagger>
        {/* Nom du tournoi */}
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            Informations générales
          </h2>

          <Input
            label="Nom du tournoi"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            placeholder="Ex : LEC Winter 2026"
          />
        </Card>

        {/* Format du tournoi */}
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-400" />
            Format du tournoi
          </h2>

          <div className="space-y-6">
            {/* Sélection du format */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Type de tournoi
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => setFormat('league')}
                  className={`
                    relative p-4 rounded-xl border-2 text-left transition-all duration-300
                    ${format === 'league'
                      ? 'bg-violet-500/10 border-violet-500 shadow-lg shadow-violet-500/20'
                      : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                    }
                  `}
                >
                  {format === 'league' && (
                    <span className="absolute top-3 right-3 text-violet-400"><Check className="w-4 h-4" /></span>
                  )}
                  <span className="mb-2 block"><Grid className={`w-8 h-8 ${format === 'league' ? 'text-violet-400' : 'text-gray-400'}`} /></span>
                  <span className={`font-semibold block mb-1 ${format === 'league' ? 'text-violet-400' : 'text-white'}`}>
                    Ligue
                  </span>
                  <span className="text-xs text-gray-400">
                    Round-robin, tous contre tous
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('swiss')}
                  className={`
                    relative p-4 rounded-xl border-2 text-left transition-all duration-300
                    ${format === 'swiss'
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/20'
                      : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                    }
                  `}
                >
                  {format === 'swiss' && (
                    <span className="absolute top-3 right-3 text-emerald-400"><Check className="w-4 h-4" /></span>
                  )}
                  <span className="mb-2 block"><Shuffle className={`w-8 h-8 ${format === 'swiss' ? 'text-emerald-400' : 'text-gray-400'}`} /></span>
                  <span className={`font-semibold block mb-1 ${format === 'swiss' ? 'text-emerald-400' : 'text-white'}`}>
                    Suisse
                  </span>
                  <span className="text-xs text-gray-400">
                    Pairages par niveau
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('single_elimination')}
                  className={`
                    relative p-4 rounded-xl border-2 text-left transition-all duration-300
                    ${format === 'single_elimination'
                      ? 'bg-cyan-500/10 border-cyan-500 shadow-lg shadow-cyan-500/20'
                      : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                    }
                  `}
                >
                  {format === 'single_elimination' && (
                    <span className="absolute top-3 right-3 text-cyan-400"><Check className="w-4 h-4" /></span>
                  )}
                  <span className="mb-2 block"><Medal className={`w-8 h-8 ${format === 'single_elimination' ? 'text-cyan-400' : 'text-gray-400'}`} /></span>
                  <span className={`font-semibold block mb-1 ${format === 'single_elimination' ? 'text-cyan-400' : 'text-white'}`}>
                    Élimination Simple
                  </span>
                  <span className="text-xs text-gray-400">
                    Bracket, une défaite = éliminé
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('double_elimination')}
                  className={`
                    relative p-4 rounded-xl border-2 text-left transition-all duration-300
                    ${format === 'double_elimination'
                      ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/20'
                      : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                    }
                  `}
                >
                  {format === 'double_elimination' && (
                    <span className="absolute top-3 right-3 text-amber-400"><Check className="w-4 h-4" /></span>
                  )}
                  <span className="mb-2 block"><Award className={`w-8 h-8 ${format === 'double_elimination' ? 'text-amber-400' : 'text-gray-400'}`} /></span>
                  <span className={`font-semibold block mb-1 ${format === 'double_elimination' ? 'text-amber-400' : 'text-white'}`}>
                    Double Élimination
                  </span>
                  <span className="text-xs text-gray-400">
                    Bracket avec losers bracket
                  </span>
                </button>
              </div>
            </div>

            {/* Options spécifiques au format Ligue */}
            {format === 'league' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Type de ligue
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setHomeAndAway(false)}
                    className={`
                      relative p-4 rounded-xl border-2 text-left transition-all duration-300
                      ${!homeAndAway
                        ? 'bg-violet-500/10 border-violet-500 shadow-lg shadow-violet-500/20'
                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                      }
                    `}
                  >
                    {!homeAndAway && (
                      <span className="absolute top-3 right-3 text-violet-400"><Check className="w-4 h-4" /></span>
                    )}
                    <span className={`font-semibold block mb-1 ${!homeAndAway ? 'text-violet-400' : 'text-white'}`}>
                      Aller simple
                    </span>
                    <span className="text-xs text-gray-400">
                      Chaque équipe joue une fois contre chaque autre
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHomeAndAway(true)}
                    className={`
                      relative p-4 rounded-xl border-2 text-left transition-all duration-300
                      ${homeAndAway
                        ? 'bg-violet-500/10 border-violet-500 shadow-lg shadow-violet-500/20'
                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                      }
                    `}
                  >
                    {homeAndAway && (
                      <span className="absolute top-3 right-3 text-violet-400"><Check className="w-4 h-4" /></span>
                    )}
                    <span className={`font-semibold block mb-1 ${homeAndAway ? 'text-violet-400' : 'text-white'}`}>
                      Aller-retour
                    </span>
                    <span className="text-xs text-gray-400">
                      Chaque équipe joue deux fois contre chaque autre
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Options spécifiques au format Swiss */}
            {isSwiss && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Nombre de rondes
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <input
                        type="number"
                        min={swissStats?.recommendedRounds || 1}
                        max={teams.length > 1 ? teams.length - 1 : 10}
                        value={swissRounds}
                        onChange={(e) => setSwissRounds(parseInt(e.target.value) || 5)}
                        className="w-24 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono
                          transition-all duration-300 hover:bg-white/[0.07] hover:border-white/15
                          focus:outline-none focus:bg-white/[0.08] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
                          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    {swissStats && (
                      <span className="text-sm text-gray-400">
                        Recommandé: <span className="text-emerald-400 font-medium">{swissStats.recommendedRounds}</span> rondes pour {swissStats.teams} équipes
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Format des matchs
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {(['BO1', 'BO3', 'BO5', 'BO7'] as MatchFormat[]).map((mf) => (
                      <button
                        key={mf}
                        type="button"
                        onClick={() => setDefaultMatchFormat(mf)}
                        className={`
                          py-3 px-4 rounded-xl border-2 font-mono transition-all duration-300
                          ${defaultMatchFormat === mf
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : 'bg-white/5 border-white/10 text-white hover:border-white/20'
                          }
                        `}
                      >
                        {mf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Qualification criteria */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Critères de qualification
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-emerald-400 font-medium">Wins to Qualify</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={swissWinsToQualify}
                        onChange={(e) => setSwissWinsToQualify(parseInt(e.target.value) || 3)}
                        className="w-full px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-emerald-400 text-center font-mono font-bold
                          transition-all duration-300 hover:bg-emerald-500/10 hover:border-emerald-500/30
                          focus:outline-none focus:bg-emerald-500/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-red-400 font-medium">Losses to Eliminate</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={swissLossesToEliminate}
                        onChange={(e) => setSwissLossesToEliminate(parseInt(e.target.value) || 3)}
                        className="w-full px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 text-center font-mono font-bold
                          transition-all duration-300 hover:bg-red-500/10 hover:border-red-500/30
                          focus:outline-none focus:bg-red-500/10 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      />
                    </div>
                  </div>
                  {errors.swissRounds && (
                    <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                      {errors.swissRounds}
                    </div>
                  )}
                  <div className="mt-2 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg text-xs text-gray-400">
                    Teams need <span className="text-emerald-400 font-bold">{swissWinsToQualify} wins</span> to qualify or
                    <span className="text-red-400 font-bold"> {swissLossesToEliminate} losses</span> to be eliminated.
                  </div>
                </div>

                {/* Mode de génération des pairages */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Génération des pairages
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setSwissPairingMode('auto')}
                      className={`
                        relative p-4 rounded-xl border-2 text-left transition-all duration-300
                        ${swissPairingMode === 'auto'
                          ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/20'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                        }
                      `}
                    >
                      {swissPairingMode === 'auto' && (
                        <span className="absolute top-3 right-3 text-emerald-400"><Check className="w-4 h-4" /></span>
                      )}
                      <span className={`font-semibold block mb-1 ${swissPairingMode === 'auto' ? 'text-emerald-400' : 'text-white'}`}>
                        Automatique
                      </span>
                      <span className="text-xs text-gray-400">
                        Les pairages sont générés selon le classement
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSwissPairingMode('manual')}
                      className={`
                        relative p-4 rounded-xl border-2 text-left transition-all duration-300
                        ${swissPairingMode === 'manual'
                          ? 'bg-violet-500/10 border-violet-500 shadow-lg shadow-violet-500/20'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                        }
                      `}
                    >
                      {swissPairingMode === 'manual' && (
                        <span className="absolute top-3 right-3 text-violet-400"><Check className="w-4 h-4" /></span>
                      )}
                      <span className={`font-semibold block mb-1 ${swissPairingMode === 'manual' ? 'text-violet-400' : 'text-white'}`}>
                        Manuel
                      </span>
                      <span className="text-xs text-gray-400">
                        Tu crées les matchs toi-même à chaque ronde
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Options spécifiques aux formats Elimination */}
            {isElimination && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Format des matchs par défaut
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {(['BO1', 'BO3', 'BO5', 'BO7'] as MatchFormat[]).map((mf) => (
                    <button
                      key={mf}
                      type="button"
                      onClick={() => setDefaultMatchFormat(mf)}
                      className={`
                        py-3 px-4 rounded-xl border-2 font-mono transition-all duration-300
                        ${defaultMatchFormat === mf
                          ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                          : 'bg-white/5 border-white/10 text-white hover:border-white/20'
                        }
                      `}
                    >
                      {mf}
                    </button>
                  ))}
                </div>

                {/* Mode de placement des équipes */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Placement des équipes
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setSeedingMode('random')}
                      className={`
                        relative p-4 rounded-xl border-2 text-left transition-all duration-300
                        ${seedingMode === 'random'
                          ? 'bg-cyan-500/10 border-cyan-500 shadow-lg shadow-cyan-500/20'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                        }
                      `}
                    >
                      {seedingMode === 'random' && (
                        <span className="absolute top-3 right-3 text-cyan-400"><Check className="w-4 h-4" /></span>
                      )}
                      <span className={`font-semibold block mb-1 ${seedingMode === 'random' ? 'text-cyan-400' : 'text-white'}`}>
                        🎲 Aléatoire
                      </span>
                      <span className="text-xs text-gray-400">
                        Les équipes sont placées au hasard dans le bracket
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeedingMode('manual')}
                      className={`
                        relative p-4 rounded-xl border-2 text-left transition-all duration-300
                        ${seedingMode === 'manual'
                          ? 'bg-violet-500/10 border-violet-500 shadow-lg shadow-violet-500/20'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                        }
                      `}
                    >
                      {seedingMode === 'manual' && (
                        <span className="absolute top-3 right-3 text-violet-400"><Check className="w-4 h-4" /></span>
                      )}
                      <span className={`font-semibold block mb-1 ${seedingMode === 'manual' ? 'text-violet-400' : 'text-white'}`}>
                        ✏️ Manuel
                      </span>
                      <span className="text-xs text-gray-400">
                        Tu places les équipes toi-même après la création
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Teams list - Pour tous les formats */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Équipes participantes
              </label>

              <div className="space-y-3">
                {teamInputs.map((team, index) => (
                  <div
                    key={team.id}
                    className={`
                      group relative p-4 bg-white/5 border rounded-xl
                      transition-all duration-300 hover:bg-white/[0.07]
                      ${errors.teams ? 'border-red-500/30' : 'border-white/10 hover:border-white/20'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Logo preview */}
                      <div className="flex-shrink-0">
                        {team.logo ? (
                          <img
                            src={team.logo}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover bg-white/10 border border-white/10"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                                ; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center ${team.logo ? 'hidden' : ''}`}>
                          <span className="text-lg text-gray-500">#{index + 1}</span>
                        </div>
                      </div>

                      {/* Fields */}
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={team.name}
                          onChange={(e) => updateTeam(team.id, 'name', e.target.value)}
                          placeholder="Nom de l'équipe"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm transition-all duration-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 hover:bg-white/[0.07]"
                        />
                        <input
                          type="url"
                          value={team.logo}
                          onChange={(e) => updateTeam(team.id, 'logo', e.target.value)}
                          placeholder="URL du logo (optionnel)"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-xs transition-all duration-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 hover:bg-white/[0.07]"
                        />
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeTeam(team.id)}
                        disabled={teamInputs.length <= 2}
                        className={`
                          flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                          transition-all duration-200
                          ${teamInputs.length <= 2
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                          }
                        `}
                        title={teamInputs.length <= 2 ? 'Minimum 2 équipes' : 'Supprimer'}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add team button */}
              <button
                type="button"
                onClick={addTeam}
                disabled={teamInputs.length >= 30}
                className={`
                  mt-3 w-full py-3 px-4 rounded-xl border-2 border-dashed
                  flex items-center justify-center gap-2
                  transition-all duration-300
                  ${teamInputs.length >= 30
                    ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                    : 'border-white/10 text-gray-400 hover:border-violet-500/50 hover:text-violet-400 hover:bg-violet-500/5'
                  }
                `}
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Ajouter une équipe</span>
              </button>

              {errors.teams && (
                <p className="mt-3 text-sm text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {errors.teams}
                </p>
              )}

              <p className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                <span className="text-violet-400 font-medium">{validTeams.length}</span> équipe{validTeams.length > 1 ? 's' : ''} configurée{validTeams.length > 1 ? 's' : ''}
                {format === 'league' && teamInputs.length >= 30 && <span className="text-amber-400">• Maximum atteint</span>}
                {isElimination && teams.length > 0 && (
                  <span className="text-cyan-400">• Bracket de {nextPowerOf2(teams.length)} slots</span>
                )}
              </p>
            </div>

            {/* League stats preview */}
            {leagueStats && (
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl animate-slide-up">
                <p className="text-sm text-cyan-400 flex items-center gap-2">
                  <Grid className="w-5 h-5" />
                  <strong>{leagueStats.teams} équipes</strong>
                  <ArrowRight className="w-4 h-4 text-cyan-500" />
                  tu devras créer <strong>{leagueStats.matches} matchs</strong> pour compléter la ligue
                </p>
              </div>
            )}

            {/* Swiss stats preview */}
            {swissStats && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-slide-up">
                <p className="text-sm text-emerald-400 flex items-center gap-2">
                  <Shuffle className="w-5 h-5" />
                  <strong>{swissStats.teams} équipes</strong>
                  <ArrowRight className="w-4 h-4 text-emerald-500" />
                  <strong>{swissRounds} rondes</strong> avec matchs générés automatiquement
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Règles de scoring */}
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-gray-400" />
            Règles de scoring
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Points pour le bon vainqueur
              </label>
              <div className="relative group">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={correctWinnerPoints}
                  onChange={(e) => setCorrectWinnerPoints(e.target.value)}
                  className={`
                    w-full px-4 py-3 bg-white/5 border rounded-xl text-white font-mono
                    transition-all duration-300
                    hover:bg-white/[0.07] hover:border-white/15
                    focus:outline-none focus:bg-white/[0.08]
                    focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                    pr-10
                    ${errors.correctWinnerPoints ? 'border-red-500/50' : 'border-white/10'}
                  `}
                />
                <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseInt(correctWinnerPoints) || 0;
                      if (val < 100) setCorrectWinnerPoints(String(val + 1));
                    }}
                    className="flex-1 px-3 hover:bg-white/10 text-gray-400 hover:text-violet-400 transition-colors rounded-tr-xl flex items-center justify-center"
                    tabIndex={-1}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseInt(correctWinnerPoints) || 0;
                      if (val > 0) setCorrectWinnerPoints(String(val - 1));
                    }}
                    className="flex-1 px-3 hover:bg-white/10 text-gray-400 hover:text-violet-400 transition-colors border-t border-white/10 rounded-br-xl flex items-center justify-center"
                    tabIndex={-1}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {errors.correctWinnerPoints && (
                <p className="mt-2 text-sm text-red-400">{errors.correctWinnerPoints}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bonus score exact
              </label>
              <div className="relative group">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={exactScoreBonus}
                  onChange={(e) => setExactScoreBonus(e.target.value)}
                  className={`
                    w-full px-4 py-3 bg-white/5 border rounded-xl text-white font-mono
                    transition-all duration-300
                    hover:bg-white/[0.07] hover:border-white/15
                    focus:outline-none focus:bg-white/[0.08]
                    focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                    pr-10
                    ${errors.exactScoreBonus ? 'border-red-500/50' : 'border-white/10'}
                  `}
                />
                <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseInt(exactScoreBonus) || 0;
                      if (val < 100) setExactScoreBonus(String(val + 1));
                    }}
                    className="flex-1 px-3 hover:bg-white/10 text-gray-400 hover:text-violet-400 transition-colors rounded-tr-xl flex items-center justify-center"
                    tabIndex={-1}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseInt(exactScoreBonus) || 0;
                      if (val > 0) setExactScoreBonus(String(val - 1));
                    }}
                    className="flex-1 px-3 hover:bg-white/10 text-gray-400 hover:text-violet-400 transition-colors border-t border-white/10 rounded-br-xl flex items-center justify-center"
                    tabIndex={-1}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {errors.exactScoreBonus && (
                <p className="mt-2 text-sm text-red-400">{errors.exactScoreBonus}</p>
              )}
            </div>
          </div>

          {/* Toggle per-format */}
          <div className="mt-6">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={perFormatEnabled}
                  onChange={(e) => {
                    setPerFormatEnabled(e.target.checked)
                    if (!e.target.checked) setPerFormatOverrides({})
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/10 rounded-full peer-checked:bg-violet-600 transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                Personnaliser les points par format (BO1, BO3, BO5, BO7)
              </span>
            </label>
          </div>

          {/* Per-format overrides */}
          {perFormatEnabled && (
            <div className="mt-4 space-y-3 p-4 bg-white/[0.03] rounded-xl border border-white/5">
              <p className="text-xs text-gray-500 mb-3">
                Laissez vide pour utiliser les valeurs par defaut ci-dessus.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allFormats.map(fmt => {
                  const override = perFormatOverrides[fmt]
                  const effectiveWinner = override?.winner || correctWinnerPoints
                  const effectiveScore = override?.score || exactScoreBonus
                  const hasOverride = override?.winner || override?.score
                  return (
                    <div
                      key={fmt}
                      className={`p-3 rounded-lg border transition-colors ${hasOverride ? 'border-violet-500/30 bg-violet-500/5' : 'border-white/5 bg-white/[0.02]'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-semibold ${hasOverride ? 'text-violet-400' : 'text-gray-400'}`}>
                          {fmt}
                        </span>
                        <span className="text-xs text-gray-600 font-mono">
                          max {(parseInt(effectiveWinner) || 0) + (parseInt(effectiveScore) || 0)} pts
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Vainqueur</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder={correctWinnerPoints}
                            value={override?.winner ?? ''}
                            onChange={(e) => updateFormatOverride(fmt, 'winner', e.target.value)}
                            className="w-full mt-0.5 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono text-center focus:outline-none focus:border-violet-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-600"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Score exact</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder={exactScoreBonus}
                            value={override?.score ?? ''}
                            onChange={(e) => updateFormatOverride(fmt, 'score', e.target.value)}
                            className="w-full mt-0.5 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono text-center focus:outline-none focus:border-violet-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-600"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/5">
            <p className="text-sm text-gray-400">
              <strong className="text-white">Exemple :</strong> Bon vainqueur + score exact ={' '}
              <strong className="text-violet-400 font-mono">
                {(parseInt(correctWinnerPoints) || 0) + (parseInt(exactScoreBonus) || 0)} points
              </strong>
              {perFormatEnabled && Object.entries(perFormatOverrides).some(([, v]) => v?.winner || v?.score) && (
                <span className="block mt-1 text-xs text-gray-500">
                  {Object.entries(perFormatOverrides).filter(([, v]) => v?.winner || v?.score).map(([fmt, v]) => {
                    const w = parseInt(v?.winner || correctWinnerPoints) || 0
                    const s = parseInt(v?.score || exactScoreBonus) || 0
                    return `${fmt}: ${w + s} pts`
                  }).join(' / ')}
                </span>
              )}
            </p>
          </div>
        </Card>

        {/* Erreur de soumission */}
        {submitError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-slide-up">
            <p className="text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> {submitError}
            </p>
          </div>
        )}



        {/* Boutons */}
        <div className="flex gap-4">
          <Button
            type="submit"
            isLoading={loading}
            className="flex-1"
            size="lg"
          >
            {format === 'league' ? 'Créer la ligue' : 'Créer le tournoi'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/tournaments')}
            size="lg"
          >
            Annuler
          </Button>
        </div>
      </form>
    </div >
  )
}
