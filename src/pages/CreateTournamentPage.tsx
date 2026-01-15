import { useState, useMemo } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthContext } from '../lib/AuthContext'
import { createTournament, calculateExpectedMatches } from '../services/tournaments'
import { generateBracket, nextPowerOf2 } from '../services/brackets'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { ScoringRules, Team, TournamentFormat, MatchFormat } from '../types'
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
  Plus
} from 'lucide-react'

type FormErrors = {
  name?: string
  teams?: string
  correctWinnerPoints?: string
  exactScoreBonus?: string
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
  const [teamInputs, setTeamInputs] = useState<TeamInput[]>([
    { id: crypto.randomUUID(), name: '', logo: '' },
    { id: crypto.randomUUID(), name: '', logo: '' },
  ])
  const [correctWinnerPoints, setCorrectWinnerPoints] = useState('1')
  const [exactScoreBonus, setExactScoreBonus] = useState('1')

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

  // Vérifier si le format est elimination
  const isElimination = format === 'single_elimination' || format === 'double_elimination'

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
    } else if (format === 'league' && teams.length > 30) {
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

      const tournament = await createTournament({
        name: name.trim(),
        admin_id: user.id,
        format,
        scoring_rules: scoringRules,
        teams: teams,
        home_and_away: !isElimination && homeAndAway,
      })

      // Si c'est un format elimination, générer le bracket vide
      // Les équipes seront assignées manuellement par l'admin
      if (isElimination) {
        const actualBracketSize = nextPowerOf2(teams.length)
        await generateBracket(
          tournament.id,
          actualBracketSize,
          format,
          defaultMatchFormat
        )
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/5">
            <p className="text-sm text-gray-400">
              <strong className="text-white">Exemple :</strong> Bon vainqueur + score exact ={' '}
              <strong className="text-violet-400 font-mono">
                {(parseInt(correctWinnerPoints) || 0) + (parseInt(exactScoreBonus) || 0)} points
              </strong>
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
