import { useEffect, useState, useMemo, useCallback, useRef, useLayoutEffect } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthContext } from '../lib/AuthContext'
import { getTournamentWithMatches, updateTournament, deleteTournament, removeParticipant, updateParticipantBonus, createStage, updateStage, deleteStage } from '../services/tournaments'
import { createMatch, updateMatch, deleteMatch, enterMatchResult, updateMatchResultRecursive, recalculateTournamentPoints } from '../services/matches'
import { getUserPredictionsForTournament, createOrUpdatePrediction } from '../services/predictions'
import { getLeaderboard, type LeaderboardEntry } from '../services/leaderboard'
import { useTournamentRealtime } from '../hooks/useTournamentRealtime'
import { MatchEditModal } from '../components/MatchEditModal'
import { MatchResultModal } from '../components/MatchResultModal'
import { PredictionModal } from '../components/PredictionModal'
import { LeaderboardTable } from '../components/LeaderboardTable'
import { LeagueStandingsTable } from '../components/LeagueStandingsTable'
import { LeagueMatchRow } from '../components/LeagueMatchRow'
import { StageCreateModal } from '../components/StageCreateModal'
import { StageSettingsModal } from '../components/StageSettingsModal'
import { StageSeedingModal } from '../components/StageSeedingModal'
import { BracketView } from '../components/bracket'
import { generateBracket, nextPowerOf2 } from '../services/brackets'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import type { Tournament, Match, MatchFormat, MatchResult, Prediction, Stage, TournamentFormat, ScoringRules } from '../types'
import { normalizeTeams } from '../types'
import {
  ScrollText,
  Link as LinkIcon,
  Copy,
  Settings,
  Trash2,
  Trophy,
  Medal,
  Users,
  Calendar,
  Plus,
  ArrowLeft,
  Play,
  Check,
  X,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  List,
  GitMerge
} from 'lucide-react'

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Deep link params - read once and track if we've handled them
  const deepLinkHandledRef = useRef(false)
  const urlRound = searchParams.get('round')
  const urlMatchId = searchParams.get('matchId')
  const hasDeepLink = !!(urlRound || urlMatchId)

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Stages state
  const [stages, setStages] = useState<Stage[]>([])
  const [activeStageId, setActiveStageId] = useState<string | null>(null)

  // Invitation copy state
  const [isCopied, setIsCopied] = useState(false)

  const handleCopyInvite = () => {
    if (!tournament) return
    navigator.clipboard.writeText(tournament.invite_code)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const activeStage = useMemo(() =>
    stages.find(s => s.id === activeStageId) || stages[0] || null
    , [stages, activeStageId])

  // Filter matches for current stage
  const stageMatches = useMemo(() => {
    // FIX: If no stages exist (legacy tournaments or simple leagues), show all matches
    if (!activeStage) return matches
    // If migration hasn't run yet or mixed data, detailed check:
    // Ideally all matches have stage_id. If not, maybe show all?
    // Let's assume matches have stage_id if stages exist.
    // FIX: Include orphaned matches (null stage_id) if we are in the main stage (sequence 1)
    // This handles legacy matches and race conditions during creation.
    return matches.filter(m => m.stage_id === activeStage?.id || (activeStage.sequence_order === 1 && m.stage_id == null))
  }, [matches, activeStage])

  // Modal state
  // Modal state
  const [isAddingStage, setIsAddingStage] = useState(false)
  const [isEditingStageSettings, setIsEditingStageSettings] = useState(false)
  const [isSeedingStage, setIsSeedingStage] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [isAddingMatch, setIsAddingMatch] = useState(false)
  const [addingToRound, setAddingToRound] = useState<number>(1)
  const [resultMatch, setResultMatch] = useState<Match | null>(null)
  const [predictionMatch, setPredictionMatch] = useState<Match | null>(null)



  // Round date editing state
  const [editingRoundDate, setEditingRoundDate] = useState<number | null>(null)

  // Points editing state
  const [isEditingPoints, setIsEditingPoints] = useState(false)
  const [pointsForm, setPointsForm] = useState({ correct_winner_points: 0, exact_score_bonus: 0 })

  // Predictions state
  const [predictions, setPredictions] = useState<Prediction[]>([])

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  // Map match_id -> prediction for quick lookup
  const predictionsByMatch = useMemo(() => {
    const map: Record<string, Prediction> = {}
    predictions.forEach((p) => {
      map[p.match_id] = p
    })
    return map
  }, [predictions])

  const isAdmin = tournament?.admin_id === user?.id

  // Déterminer si c'est un format bracket (elimination)
  // Basé sur le stage actif si disponible, sinon sur le tournoi (legacy/fallback)
  const isBracketFormat = activeStage
    ? (activeStage.type === 'single_elimination' || activeStage.type === 'double_elimination')
    : (tournament?.format === 'single_elimination' || tournament?.format === 'double_elimination')

  // Grouper les matchs par journée (pour l'affichage Ligue)
  const matchesByRound = useMemo(() => {
    const grouped: Record<number, Match[]> = {}
    stageMatches.forEach((match) => {
      if (!grouped[match.round]) {
        grouped[match.round] = []
      }
      grouped[match.round].push(match)
    })

    // Trier les matchs par horaire dans chaque journée
    Object.keys(grouped).forEach((key) => {
      const round = Number(key)
      grouped[round].sort((a, b) => {
        // Les matchs avec horaire passent en premier
        if (a.start_time && !b.start_time) return -1
        if (!a.start_time && b.start_time) return 1
        if (!a.start_time && !b.start_time) return 0

        // Tri horaire (HH:MM) uniquement, pour éviter les soucis de dates différentes
        const dateA = new Date(a.start_time!)
        const dateB = new Date(b.start_time!)

        const timeA = dateA.getHours() * 60 + dateA.getMinutes()
        const timeB = dateB.getHours() * 60 + dateB.getMinutes()

        return timeA - timeB
      })
    })

    return grouped
  }, [stageMatches])

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b)


  const maxRound = rounds.length > 0 ? Math.max(...rounds) : 0

  // State for selected round (League view)
  const [selectedRound, setSelectedRound] = useState<number>(1)
  // State for mobile tabs (matches vs standings vs infos)
  const [mobileTab, setMobileTab] = useState<'matches' | 'standings' | 'infos'>('matches')
  const tabsRef = useRef<HTMLDivElement>(null)

  // Ref for the round selector container
  const roundsScrollRef = useRef<HTMLDivElement>(null)



  // Auto-center selected round ONCE after initial round selection
  const initialRoundCenteredRef = useRef(false)
  const prevSelectedRoundRef = useRef(selectedRound)
  // Track if round has been initialized (to prevent resetting user selection)
  const roundInitializedRef = useRef(false)

  useEffect(() => {
    // Skip if already centered or still loading
    if (initialRoundCenteredRef.current || loading || matches.length === 0) return

    // Only center if selectedRound changed from the default (1) to something else
    // OR if it stayed at 1 but matches are loaded (meaning 1 is the real value)
    const roundWasUpdated = prevSelectedRoundRef.current !== selectedRound || matches.length > 0
    prevSelectedRoundRef.current = selectedRound

    if (!roundWasUpdated) return

    const centerSelectedRound = () => {
      if (roundsScrollRef.current) {
        const container = roundsScrollRef.current
        const selectedButton = container.querySelector(`[data-round="${selectedRound}"]`) as HTMLElement

        if (selectedButton) {
          const containerCenter = container.offsetWidth / 2
          const buttonCenter = selectedButton.offsetWidth / 2
          const scrollLeft = selectedButton.offsetLeft - containerCenter + buttonCenter

          container.scrollTo({ left: scrollLeft, behavior: 'instant' })
          initialRoundCenteredRef.current = true
        }
      }
    }

    // Delay to ensure DOM and round selection are ready
    const timer = setTimeout(centerSelectedRound, 200)
    return () => clearTimeout(timer)
  }, [selectedRound, loading, matches.length])

  // useLayoutEffect runs after DOM updates but before paint
  // We use a dedicated anchor element to calculate precise scroll position, bypassing sticky/offset complexities
  const scrollAnchorRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    // Skip if we have deep link params (let the deep link handler manage scroll)
    if (hasDeepLink && !deepLinkHandledRef.current) return

    if (scrollAnchorRef.current) {
      if (!isBracketFormat) {
        // Get absolute position of the anchor on the page
        const anchorRect = scrollAnchorRef.current.getBoundingClientRect()
        const absoluteAnchorTop = anchorRect.top + window.scrollY

        // Header is ~80px. We want to land just below it.
        const headerOffset = 85
        const targetScroll = absoluteAnchorTop - headerOffset

        // Only scroll up if we are currently "below" the tabs (plus a small buffer)
        // We check if current scroll is significantly deeper than the target
        if (window.scrollY > targetScroll + 10) {
          window.scrollTo({ top: targetScroll, behavior: 'auto' })
        }
      }
    }
  }, [mobileTab, isBracketFormat, hasDeepLink])

  // Initialize selectedRound from URL params or first round with unplayed matches
  // This should only run ONCE when matches are first loaded
  useEffect(() => {
    // Skip if already initialized (user has manually selected a round)
    if (roundInitializedRef.current) return

    if (matches.length > 0 && !isBracketFormat && !deepLinkHandledRef.current) {
      // Priority 1: URL param
      if (urlRound) {
        const roundNum = parseInt(urlRound, 10)
        if (!isNaN(roundNum) && rounds.includes(roundNum)) {
          setSelectedRound(roundNum)
          roundInitializedRef.current = true
          return
        }
      }

      // Priority 2: Find first round with at least one unplayed match
      const activeRound = rounds.find(r =>
        matchesByRound[r]?.some(m => m.result === null)
      )

      if (activeRound) {
        setSelectedRound(activeRound)
      } else {
        // If all played, show the last round
        setSelectedRound(maxRound || 1)
      }

      // Mark as initialized to prevent future resets
      roundInitializedRef.current = true
    }
  }, [matches.length, isBracketFormat, maxRound, urlRound, rounds, matchesByRound])

  // Handle deep link: scroll to specific match after round is set
  useEffect(() => {
    if (!hasDeepLink || deepLinkHandledRef.current || loading || matches.length === 0) return

    // Poll for the element instead of fixed delay (faster response)
    let attempts = 0
    const maxAttempts = 20
    const pollInterval = 50 // Check every 50ms

    const checkAndScroll = () => {
      attempts++
      const matchElement = urlMatchId ? document.querySelector(`[data-match-id="${urlMatchId}"]`) : null

      if (matchElement) {
        matchElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Add highlight effect - ring directly on element
        matchElement.classList.add('ring-2', 'ring-violet-500')
        setTimeout(() => {
          matchElement.classList.remove('ring-2', 'ring-violet-500')
        }, 2000)
        deepLinkHandledRef.current = true
        setSearchParams({}, { replace: true })
      } else if (attempts < maxAttempts) {
        setTimeout(checkAndScroll, pollInterval)
      } else {
        // Timeout - mark as handled anyway
        deepLinkHandledRef.current = true
        setSearchParams({}, { replace: true })
      }
    }

    // Start polling after a minimal delay for initial render
    const timer = setTimeout(checkAndScroll, 100)
    return () => clearTimeout(timer)
  }, [hasDeepLink, loading, matches.length, selectedRound, urlMatchId, setSearchParams])

  // Utiliser les équipes du tournoi (normalisées pour rétrocompatibilité)
  const teams = normalizeTeams(tournament?.teams as (string | { name: string; logo?: string })[])

  // Équipes présentes dans les matchs de la phase active (pour les brackets multi-phases)
  const stageTeams = useMemo(() => {
    if (!activeStage) return teams

    // 1. D'abord vérifier si des équipes sont sélectionnées dans les settings de la phase
    const selectedTeamsFromSettings = activeStage.settings?.selected_teams as string[] | undefined
    if (selectedTeamsFromSettings && selectedTeamsFromSettings.length > 0) {
      return teams.filter(t => selectedTeamsFromSettings.includes(t.name))
    }

    // 2. Sinon, extraire les équipes des matchs de la phase
    if (stageMatches.length === 0) return teams

    const teamNamesInStage = new Set<string>()
    stageMatches.forEach(m => {
      if (m.team_a && m.team_a !== 'TBD' && m.team_a !== 'BYE') {
        teamNamesInStage.add(m.team_a)
      }
      if (m.team_b && m.team_b !== 'TBD' && m.team_b !== 'BYE') {
        teamNamesInStage.add(m.team_b)
      }
    })

    // Si aucune équipe trouvée dans les matchs, retourner toutes les équipes (phase vide)
    if (teamNamesInStage.size === 0) return teams

    // Retourner les équipes du tournoi qui sont présentes dans cette phase
    return teams.filter(t => teamNamesInStage.has(t.name))
  }, [activeStage, stageMatches, teams])

  const currentMatches = matches.length

  // Bracket: Vérifie si on peut éditer les équipes pour un match donné (logique phase-par-phase)
  const canEditTeamsForMatch = useCallback((match: Match | null): boolean => {
    if (!match || !isAdmin || !isBracketFormat) return false
    if (match.result !== null) return false // Match déjà joué

    // Winners Round 1: toujours éditable si pas de résultat
    if (match.round === 1 && match.bracket_side === 'winners') {
      return tournament?.status === 'draft' || tournament?.status === 'active'
    }

    // Losers Round 1: éditable si Winners Round 1 terminé
    if (match.round === 1 && match.bracket_side === 'losers') {
      const winnersR1 = matches.filter(m => m.round === 1 && m.bracket_side === 'winners')
      const allComplete = winnersR1.every(m => m.result !== null || m.is_bye)
      return allComplete && tournament?.status === 'active'
    }

    // Grand Final: éditable si Winners Final et Losers Final terminés
    if (match.bracket_side === 'grand_final') {
      const winnersMatches = matches.filter(m => m.bracket_side === 'winners')
      const losersMatches = matches.filter(m => m.bracket_side === 'losers')
      const maxWR = Math.max(...winnersMatches.map(m => m.round), 0)
      const maxLR = Math.max(...losersMatches.map(m => m.round), 0)
      const winnersFinal = winnersMatches.filter(m => m.round === maxWR)
      const losersFinal = losersMatches.filter(m => m.round === maxLR)
      const allComplete = winnersFinal.every(m => m.result !== null) && losersFinal.every(m => m.result !== null)
      return allComplete && tournament?.status === 'active'
    }

    // Autres rounds: round précédent doit être terminé
    const bracketMatches = matches.filter(m => m.bracket_side === match.bracket_side)
    const prevRoundMatches = bracketMatches.filter(m => m.round === match.round - 1)
    if (prevRoundMatches.length === 0) return false

    const allComplete = prevRoundMatches.every(m => m.result !== null || m.is_bye)
    return allComplete && tournament?.status === 'active'
  }, [matches, isAdmin, isBracketFormat, tournament?.status])



  // Pour les brackets: calculer les équipes déjà assignées dans un round donné
  const getAssignedTeamsInRound = (round: number, bracketSide: string | null, stageId: string | null) => {
    const assigned = new Set<string>()
    matches
      .filter((m) =>
        m.round === round &&
        m.bracket_side === bracketSide &&
        m.bracket_position !== null &&
        m.stage_id === stageId
      )
      .forEach((m) => {
        if (m.team_a !== 'TBD') assigned.add(m.team_a)
        if (m.team_b !== 'TBD') assigned.add(m.team_b)
      })
    return Array.from(assigned)
  }

  // Calcule les équipes disponibles pour assignation au round d'un match donné
  const getAvailableTeamsForRound = (match: Match | null): typeof teams => {
    if (!match) return []

    // 1. Initial Round (Winners Bracket Round 1): équipes de cette phase uniquement
    if (match.round === 1 && match.bracket_side === 'winners') {
      return stageTeams
    }

    // 2. Feeder Logic (Pour tous les autres rounds)
    // Trouver les matchs qui alimentent ce match (Winner -> Next, Loser -> Drop)
    const feeders = matches.filter(m =>
      m.next_match_id === match.id ||
      m.next_loser_match_id === match.id
    )

    const candidates = new Set<string>()

    feeders.forEach(feeder => {
      // Cas A: Le vainqueur avance (Winner Bracket ou progression normale)
      if (feeder.next_match_id === match.id) {
        if (feeder.is_bye) {
          // Si BYE, l'équipe A avance automatiquement
          if (feeder.team_a && feeder.team_a !== 'TBD') {
            candidates.add(feeder.team_a)
          }
        }
        else if (feeder.result?.winner) {
          candidates.add(feeder.result.winner)
        }
      }

      // Cas B: Le perdant descend (Drop vers Losers Bracket)
      if (feeder.next_loser_match_id === match.id) {
        if (feeder.result?.winner) {
          // Identifier le perdant
          const loser = feeder.result.winner === feeder.team_a ? feeder.team_b : feeder.team_a
          if (loser && loser !== 'TBD' && loser !== 'BYE') {
            candidates.add(loser)
          }
        }
      }
    })

    return Array.from(candidates).map(name => {
      const existingTeam = teams.find(t => t.name === name)
      return existingTeam || { name }
    })
  }

  // Bracket: Calcule les équipes disponibles pour un slot, excluant celles déjà dans le même round
  const getAvailableTeamsForSlot = (match: Match | null, slot: 'team_a' | 'team_b'): typeof teams => {
    if (!match) return []

    const baseTeams = getAvailableTeamsForRound(match)
    const assignedInRound = getAssignedTeamsInRound(match.round, match.bracket_side, match.stage_id)

    // Exclure les équipes déjà assignées dans ce round (sauf celle actuellement dans CE match pour CE slot)
    const currentTeam = slot === 'team_a' ? match.team_a : match.team_b
    const otherSlotTeam = slot === 'team_a' ? match.team_b : match.team_a

    const filteredTeams = baseTeams.filter(t => {
      // Toujours garder l'équipe actuellement assignée à ce slot
      if (t.name === currentTeam && currentTeam !== 'TBD') return true
      // Exclure l'équipe de l'autre slot de ce match
      if (t.name === otherSlotTeam && otherSlotTeam !== 'TBD') return false
      // Exclure les équipes déjà assignées ailleurs dans ce round
      return !assignedInRound.includes(t.name)
    })

    // Pour le Round 1 du Winners Bracket, ajouter BYE comme option
    // Permet de configurer les passages automatiques (ex: bracket de 8 avec 6 équipes)
    if (match.round === 1 && match.bracket_side === 'winners') {
      // Calculer le nombre de BYE autorisés
      const numTeams = stageTeams.length
      const bracketSize = nextPowerOf2(numTeams)
      const maxByes = bracketSize - numTeams // Ex: 8 - 6 = 2 BYEs max

      // Compter les BYE déjà assignés dans ce round (excluant le slot courant)
      const round1Matches = stageMatches.filter(
        m => m.round === 1 && m.bracket_side === 'winners'
      )
      let currentByeCount = 0
      round1Matches.forEach(m => {
        // Ne pas compter le BYE du slot qu'on est en train d'éditer
        if (m.id === match.id) {
          // Seulement compter le BYE de l'autre slot
          if (slot === 'team_a' && m.team_b === 'BYE') currentByeCount++
          if (slot === 'team_b' && m.team_a === 'BYE') currentByeCount++
        } else {
          if (m.team_a === 'BYE') currentByeCount++
          if (m.team_b === 'BYE') currentByeCount++
        }
      })

      // Ne pas ajouter BYE si:
      // - L'autre slot a déjà BYE
      // - Limite de BYE atteinte
      // - Ce slot a déjà BYE (il sera dans filteredTeams via currentTeam)
      const hasByeInOtherSlot = otherSlotTeam === 'BYE'
      const byeLimitReached = currentByeCount >= maxByes
      const currentSlotHasBye = currentTeam === 'BYE'

      if (!hasByeInOtherSlot && !byeLimitReached && !currentSlotHasBye && !filteredTeams.some(t => t.name === 'BYE')) {
        return [...filteredTeams, { name: 'BYE' }]
      }

      // Si le slot courant a déjà BYE, s'assurer qu'il reste dans la liste
      if (currentSlotHasBye && !filteredTeams.some(t => t.name === 'BYE')) {
        return [...filteredTeams, { name: 'BYE' }]
      }
    }

    return filteredTeams
  }

  useEffect(() => {
    loadTournament()
  }, [id])

  // Fonction pour charger le leaderboard
  const loadLeaderboard = useCallback(async () => {
    if (!id) return
    setLeaderboardLoading(true)
    try {
      const entries = await getLeaderboard(id, user?.id)
      setLeaderboard(entries)
    } catch (err) {
      console.error('Erreur chargement leaderboard:', err)
    } finally {
      setLeaderboardLoading(false)
    }
  }, [id, user?.id])

  // Charger le leaderboard quand le tournoi est actif ou terminé
  useEffect(() => {
    if (!id || !tournament) return
    if (tournament.status === 'draft') return
    loadLeaderboard()
  }, [id, tournament?.status, loadLeaderboard])

  // Callbacks pour les mises à jour en temps réel
  const handleMatchUpdate = useCallback((updatedMatch: Match) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m))
    )
  }, [])

  const handlePredictionUpdate = useCallback((updatedPrediction: Prediction) => {
    // Mettre à jour seulement si c'est une prédiction de l'utilisateur courant
    if (updatedPrediction.user_id === user?.id) {
      setPredictions((prev) => {
        const exists = prev.find((p) => p.id === updatedPrediction.id)
        if (exists) {
          return prev.map((p) => (p.id === updatedPrediction.id ? updatedPrediction : p))
        }
        return [...prev, updatedPrediction]
      })
    }
  }, [user?.id])

  // Souscrire aux mises à jour en temps réel du tournoi
  useTournamentRealtime(
    tournament?.status !== 'draft' ? id : undefined,
    {
      onMatchUpdate: handleMatchUpdate,
      onPredictionUpdate: handlePredictionUpdate,
      onLeaderboardUpdate: loadLeaderboard,
    }
  )

  async function loadTournament() {
    if (!id) return

    try {
      const data = await getTournamentWithMatches(id)
      setTournament(data.tournament)
      setMatches(data.matches)
      setStages(data.stages)

      // Auto-select active stage if none selected
      if (data.stages.length > 0 && !activeStageId) {
        // Sort stages by sequence
        const sortedStages = [...data.stages].sort((a, b) => a.sequence_order - b.sequence_order)

        // Find the first stage that is "active" (empty or has unplayed matches)
        const activeStage = sortedStages.find(stage => {
          const stageMatches = data.matches.filter(m =>
            m.stage_id === stage.id ||
            (stage.sequence_order === 1 && m.stage_id === null)
          )

          // Case 1: Stage has no matches yet (needs seeding/setup) -> It's the active one
          if (stageMatches.length === 0) return true

          // Case 2: Stage has unplayed matches -> It's the current one
          const hasUnplayed = stageMatches.some(m => m.result === null)
          return hasUnplayed
        })

        // Default to found active stage, or the last stage if all are completed
        setActiveStageId(activeStage ? activeStage.id : sortedStages[sortedStages.length - 1].id)
      }

      // Load user predictions if logged in
      if (user?.id) {
        const userPredictions = await getUserPredictionsForTournament(id, user.id)
        setPredictions(userPredictions)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }


  const handleDeleteTournament = async () => {
    if (!tournament || !isAdmin) return

    const confirmed = window.confirm(
      `Supprimer le tournoi "${tournament.name}" ? Cette action est irréversible.`
    )
    if (!confirmed) return

    setActionLoading(true)
    try {
      await deleteTournament(tournament.id)
      navigate('/tournaments')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression')
      setActionLoading(false)
    }
  }

  // Activer un tournoi en draft pour permettre les pronostics
  const handleActivateTournament = async () => {
    if (!tournament || !isAdmin) return

    setActionLoading(true)
    try {
      const updated = await updateTournament(tournament.id, { status: 'active' })
      setTournament(updated)
      // Charger le leaderboard maintenant que le tournoi est actif
      loadLeaderboard()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'activation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateStage = async (name: string, type: TournamentFormat, rules: ScoringRules) => {
    if (!tournament) return
    const newStage = await createStage({
      tournament_id: tournament.id,
      name,
      type,
      sequence_order: stages.length + 1,
      scoring_rules: rules
    })
    setStages([...stages, newStage])
    setActiveStageId(newStage.id)
    setIsAddingStage(false)
  }

  const handleUpdateStage = async (stageId: string, updates: Partial<Stage>) => {
    // @ts-ignore - StageUpdate type mismatch workaround if needed, but should be fine
    const updated = await updateStage(stageId, updates)
    setStages(prev => prev.map(s => s.id === stageId ? updated : s))
    setIsEditingStageSettings(false)
  }

  const handleDeleteStage = async (stageId: string) => {
    // Cas spécial: Dernière phase -> Suppression du tournoi
    if (stages.length <= 1) {
      if (window.confirm("Attention : Cette phase est la seule du tournoi. Sa suppression entraînera la suppression définitive du tournoi entier. Voulez-vous continuer ?")) {
        setActionLoading(true)
        try {
          if (tournament) await deleteTournament(tournament.id)
          navigate('/tournaments')
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Erreur lors de la suppression du tournoi')
          setActionLoading(false)
        }
      }
      return
    }

    // Suppression classique d'une phase
    try {
      await deleteStage(stageId)
      // Remove from state
      const remaining = stages.filter(s => s.id !== stageId)
      setStages(remaining)
      // If active was deleted, switch to first available
      if (activeStageId === stageId) {
        setActiveStageId(remaining.length > 0 ? remaining[0].id : null)
      }
      setIsEditingStageSettings(false)
    } catch (err) {
      console.error("Erreur suppression phase:", err)
      alert("Erreur lors de la suppression de la phase")
    }
  }

  const handleSeeding = async (selectedTeams: { name: string, logo?: string }[], generationMode: 'auto' | 'manual') => {
    if (!activeStage || !tournament) return
    setActionLoading(true)
    try {
      const teamNames = selectedTeams.map(t => t.name)

      // Sauvegarder les équipes sélectionnées dans les settings de la phase
      const updatedStage = await updateStage(activeStage.id, {
        settings: {
          ...activeStage.settings,
          selected_teams: teamNames
        }
      })
      setStages(prev => prev.map(s => s.id === activeStage.id ? updatedStage : s))

      // 1. Bracket Generation
      if (activeStage.type === 'single_elimination' || activeStage.type === 'double_elimination') {
        const bracketSize = nextPowerOf2(teamNames.length)

        // Préparer les équipes selon le mode de génération
        let teamsToSeed: string[] = []
        if (generationMode === 'auto') {
          // Mélanger les équipes aléatoirement (Fisher-Yates shuffle)
          const shuffled = [...teamNames]
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
          }
          teamsToSeed = shuffled
        }
        // Si mode 'manual', teamsToSeed reste vide -> matchs en TBD

        const newMatches = await generateBracket(
          tournament.id,
          bracketSize,
          activeStage.type,
          'BO3', // Default format, maybe make configurable?
          teamsToSeed,
          activeStage.id
        )
        setMatches(prev => [...prev, ...newMatches])
      }
      // 2. League Generation (Simple Round Robin)
      else if (activeStage.type === 'league') {
        // Generate Round Robin matches for selected teams
        // Simple Implementation: just 1 round for now or 2 if global home_and_away is set? 
        // Let's defer strict round robin logic for now and just add empty matches or better,
        // warn user that league auto-generation is basic.
        // Actually, let's skip auto-generation for League for now to keep it safe, 
        // or implement a basic one.

        // For now, let's just alert
        alert("La génération automatique pour le championnat n'est pas encore active. Vous pouvez ajouter les matchs manuellement.")
      }

      setIsSeedingStage(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur seeding')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveMatch = async (data: {
    team_a: string
    team_b: string
    round: number
    match_format: MatchFormat
    start_time?: string | null
  }) => {
    if (!tournament) return

    if (editingMatch) {
      const updated = await updateMatch(editingMatch.id, data)
      setMatches((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      )
    } else {
      const newMatch = await createMatch({
        tournament_id: tournament.id,
        ...data,
      })
      setMatches((prev) => [...prev, newMatch])
    }
  }

  const handleDeleteMatch = async () => {
    if (!editingMatch) return
    await deleteMatch(editingMatch.id)
    setMatches((prev) => prev.filter((m) => m.id !== editingMatch.id))
  }

  const openAddMatch = (round: number) => {
    setAddingToRound(round)
    setEditingMatch(null)
    setIsAddingMatch(true)
  }

  const openEditMatch = (match: Match) => {
    setEditingMatch(match)
    setIsAddingMatch(true)
  }

  const closeModal = () => {
    setIsAddingMatch(false)
    setEditingMatch(null)
  }

  const handleSaveResult = async (result: MatchResult, matchOverride?: Match) => {
    // Utiliser le match passé en paramètre ou resultMatch
    const targetMatch = matchOverride || resultMatch || editingMatch
    if (!targetMatch) return

    // Pour les brackets: utiliser la RPC avec effet domino (pour première entrée ET corrections)
    // Le trigger auto-advance est désactivé (003_disable_auto_advance.sql), donc on utilise la RPC
    if (isBracketFormat) {
      await updateMatchResultRecursive(targetMatch.id, result.winner, result.score)
      // Recharger tous les matchs car plusieurs peuvent avoir changé
      const data = await getTournamentWithMatches(tournament!.id)
      setMatches(data.matches)
      // Recharger aussi les predictions car certaines ont pu être supprimées
      if (user?.id) {
        const userPredictions = await getUserPredictionsForTournament(tournament!.id, user.id)
        setPredictions(userPredictions)
      }
    } else {
      const updated = await enterMatchResult(targetMatch.id, result)
      setMatches((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      )
    }

    // Recharger le leaderboard après saisie du résultat (les points sont mis à jour)
    loadLeaderboard()
  }

  // Exclure un participant (admin only)
  const handleRemoveParticipant = async (userId: string) => {
    if (!tournament) return
    await removeParticipant(tournament.id, userId)
    // Recharger le leaderboard
    loadLeaderboard()
  }

  // Mettre à jour les points bonus (admin only)
  const handleUpdateBonus = async (userId: string, bonus: number) => {
    if (!tournament || !isAdmin) return
    await updateParticipantBonus(tournament.id, userId, bonus)
    await loadLeaderboard()
  }

  const handleSavePrediction = async (data: {
    predicted_winner: string
    predicted_score: string
  }) => {
    if (!predictionMatch || !user?.id) return
    const prediction = await createOrUpdatePrediction(
      predictionMatch.id,
      user.id,
      data.predicted_winner,
      data.predicted_score
    )
    setPredictions((prev) => {
      const existing = prev.find((p) => p.match_id === predictionMatch.id)
      if (existing) {
        return prev.map((p) => (p.match_id === predictionMatch.id ? prediction : p))
      }
      return [...prev, prediction]
    })
  }



  const handleSaveRoundDate = async (round: number, dateStr: string) => {
    if (!tournament) return
    setEditingRoundDate(null)

    // Parse dateStr (coming from input type="date")
    // If empty/cleared, delete the entry
    const newDates = { ...(tournament.round_dates || {}) }
    if (dateStr) {
      newDates[round] = dateStr
    } else {
      delete newDates[round]
    }

    // Optimistic update
    setTournament({ ...tournament, round_dates: newDates })

    try {
      await updateTournament(tournament.id, { round_dates: newDates })
    } catch (err) {
      console.error('Erreur sauvegarde date:', err)
      // Revert if needed, but skipping for brevity
    }
  }



  // Bracket: changer le format de match (BO)
  const handleChangeFormat = async (match: Match, format: MatchFormat) => {
    try {
      const updated = await updateMatch(match.id, { match_format: format })
      setMatches((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      )
    } catch (err) {
      console.error('Erreur changement format:', err)
    }
  }

  const handleSavePoints = async () => {
    if (!tournament) return
    setActionLoading(true)
    try {
      // 1. Update tournament rules
      const updated = await updateTournament(tournament.id, {
        scoring_rules: pointsForm
      })
      setTournament(updated)

      // 2. Recalculate all points
      await recalculateTournamentPoints(tournament.id)

      // 3. Refresh data
      await loadLeaderboard()
      if (user?.id) {
        const userPredictions = await getUserPredictionsForTournament(tournament.id, user.id)
        setPredictions(userPredictions)
      }

      setIsEditingPoints(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur sauvegarde points')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400 animate-pulse">Chargement du tournoi...</p>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <Card className="border-red-500/20 bg-red-900/10">
        <h2 className="text-lg font-semibold text-red-500 mb-2">Erreur</h2>
        <p className="text-red-400">{error || 'Tournoi non trouvé'}</p>
        <Link to="/tournaments">
          <Button variant="ghost" className="mt-4 text-red-400 hover:text-red-300 gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour aux tournois
          </Button>
        </Link>
      </Card>
    )
  }

  const statusLabels = {
    draft: 'Brouillon',
    active: 'En cours',
    completed: 'Terminé',
  }

  const statusColors = {
    draft: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    active: 'bg-green-500/20 text-green-300 border-green-500/30',
    completed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  }

  const playedMatches = matches.filter((m) => m.result !== null).length

  // Effective Rules Calculation
  const effectiveRules = activeStage?.scoring_rules || tournament.scoring_rules

  return (
    <div className="space-y-8 overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center gap-2 mb-4">
        <Link to="/tournaments" className="text-gray-400 hover:text-white transition-colors">
          Tournois
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-violet-400 font-medium">{tournament.name}</span>
      </div>

      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-[64px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white text-glow">
                {tournament.name}
              </h1>
              <span className={`px-3 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${statusColors[tournament.status]}`}>
                {statusLabels[tournament.status]}
              </span>
            </div>
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <span>{teams.length > 0 ? `${teams.length} équipes` : `${matches.filter(m => m.round === 1).length * 2} slots`}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span>
                {isBracketFormat
                  ? (tournament.format === 'single_elimination' ? 'Élimination Simple' : 'Double Élimination')
                  : (tournament.home_and_away ? 'Aller-retour' : 'Aller simple')
                }
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span>Créé le {new Date(tournament.created_at).toLocaleDateString('fr-FR')}</span>
            </p>
          </div>
          {isAdmin && (
            <span className="px-3 py-1 bg-violet-500/10 text-violet-300 border border-violet-500/20 text-xs font-medium rounded-full">
              Mode Admin
            </span>
          )}
        </div>
      </Card>

      {/* STAGE SELECTOR (Multi-Stage Navigation) */}
      {stages.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-1.5 border border-white/5">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {stages.map((stage) => {
              // Format icon based on stage type
              const FormatIcon = stage.type === 'league' || stage.type === 'swiss'
                ? List
                : stage.type === 'double_elimination'
                  ? GitMerge
                  : Trophy

              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStageId(stage.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap
                    ${activeStageId === stage.id
                      ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-500/25'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <FormatIcon className={`w-4 h-4 ${activeStageId === stage.id ? 'text-violet-200' : 'text-gray-500'}`} />
                  {stage.name}
                </button>
              )
            })}

            {/* Admin Add Stage Button */}
            {isAdmin && (
              <>
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button
                  onClick={() => setIsAddingStage(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all border border-dashed border-white/10 hover:border-violet-500/30"
                  title="Ajouter une phase"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-xs font-medium hidden sm:inline">Phase</span>
                </button>


              </>
            )}
          </div>
        </div>
      )}


      {/* 
        =======================================================================
        UNIFIED DASHBOARD BAR (Shared across all formats)
        Rules | Invite | Admin/Status
        =======================================================================
      */}
      {/* Mobile Tabs Navigation (Global) */}
      {/* Scroll Anchor: Invisible marker to calculate precise scroll position */}
      <div ref={scrollAnchorRef} className="absolute w-full h-px -mt-px opacity-0 pointer-events-none" />
      <div
        ref={tabsRef}
        className="min-[1320px]:hidden flex p-1 bg-white/5 rounded-lg border border-white/5 mb-6 sticky top-[6.5rem] z-30 backdrop-blur-md transition-all duration-300"
      >
        <button
          onClick={() => setMobileTab('matches')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mobileTab === 'matches'
            ? 'bg-violet-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-white'
            }`}
        >
          Matchs
        </button>
        <button
          onClick={() => setMobileTab('standings')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mobileTab === 'standings'
            ? 'bg-violet-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-white'
            }`}
        >
          Classements
        </button>
        <button
          onClick={() => setMobileTab('infos')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mobileTab === 'infos'
            ? 'bg-violet-600 text-white shadow-lg'
            : 'text-gray-400 hover:text-white'
            }`}
        >
          Infos
        </button>
      </div>

      {/* 
        =======================================================================
        UNIFIED DASHBOARD BAR (Shared across all formats)
        Rules | Invite | Admin/Status
        =======================================================================
      */}
      {/* 
        =======================================================================
        UNIFIED DASHBOARD BAR (Shared across all formats)
        Rules | Invite | Admin/Status
        =======================================================================
      */}
      <div className={`grid grid-cols-1 min-[1320px]:grid-cols-2 lg:grid-cols-3 gap-4 ${mobileTab === 'infos' ? 'block' : 'hidden min-[1320px]:grid'}`}>
        {/* Card 1: Règles */}
        <Card className={`flex-1 ${isEditingPoints ? 'border-violet-500/50 bg-violet-500/5' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-gray-400" /> {activeStage ? "Règle de la phase" : "Règles"}
            </h2>
            {isAdmin && !isEditingPoints && (
              <button
                onClick={() => {
                  if (activeStage) {
                    // Edit stage rules
                    setPointsForm(activeStage.scoring_rules || tournament.scoring_rules)
                    setIsEditingPoints(true)
                  } else {
                    // Edit tournament rules
                    setPointsForm(tournament.scoring_rules)
                    setIsEditingPoints(true)
                  }
                }}
                className={`transition-colors p-1 text-blue-400 hover:text-blue-300`}
                title={activeStage ? "Modifier les règles de la phase" : "Modifier les points globaux"}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {isAdmin && isEditingPoints && (
              <div className="flex items-center gap-1">
                <button
                  onClick={async () => {
                    if (activeStage) {
                      // Save Stage Rules
                      setActionLoading(true)
                      try {
                        const updated = await updateStage(activeStage.id, { scoring_rules: pointsForm })
                        setStages(prev => prev.map(s => s.id === activeStage.id ? updated : s))
                        await recalculateTournamentPoints(tournament.id)
                        loadLeaderboard()
                        setIsEditingPoints(false)
                      } catch (err) {
                        alert("Erreur sauvegarde règles phase")
                      } finally {
                        setActionLoading(false)
                      }
                    } else {
                      // Save Tournament Rules
                      handleSavePoints()
                    }
                  }}
                  disabled={actionLoading}
                  className="p-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                  title="Sauvegarder"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsEditingPoints(false)}
                  disabled={actionLoading}
                  className="p-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                  title="Annuler"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm">
            {isEditingPoints ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">Vainqueur:</span>
                  <div className="relative">
                    <input
                      type="number"
                      value={pointsForm.correct_winner_points}
                      onChange={(e) => setPointsForm(prev => ({ ...prev, correct_winner_points: parseInt(e.target.value) || 0 }))}
                      className="w-16 bg-black/30 border border-white/10 rounded-xl px-2 py-2.5 pr-7 text-center font-mono text-violet-400 text-lg font-bold focus:border-violet-500/50 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      autoFocus
                    />
                    <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-white/10">
                      <button
                        type="button"
                        onClick={() => setPointsForm(prev => ({ ...prev, correct_winner_points: prev.correct_winner_points + 1 }))}
                        className="flex-1 px-2 hover:bg-white/10 text-gray-400 hover:text-violet-400 transition-colors rounded-tr-xl flex items-center justify-center"
                        tabIndex={-1}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPointsForm(prev => ({ ...prev, correct_winner_points: Math.max(0, prev.correct_winner_points - 1) }))}
                        className="flex-1 px-2 hover:bg-white/10 text-gray-400 hover:text-violet-400 transition-colors border-t border-white/10 rounded-br-xl flex items-center justify-center"
                        tabIndex={-1}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">Score Exact:</span>
                  <div className="relative">
                    <input
                      type="number"
                      value={pointsForm.exact_score_bonus}
                      onChange={(e) => setPointsForm(prev => ({ ...prev, exact_score_bonus: parseInt(e.target.value) || 0 }))}
                      className="w-16 bg-black/30 border border-white/10 rounded-xl px-2 py-2.5 pr-7 text-center font-mono text-cyan-400 text-lg font-bold focus:border-cyan-500/50 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-white/10">
                      <button
                        type="button"
                        onClick={() => setPointsForm(prev => ({ ...prev, exact_score_bonus: prev.exact_score_bonus + 1 }))}
                        className="flex-1 px-2 hover:bg-white/10 text-gray-400 hover:text-cyan-400 transition-colors rounded-tr-xl flex items-center justify-center"
                        tabIndex={-1}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPointsForm(prev => ({ ...prev, exact_score_bonus: Math.max(0, prev.exact_score_bonus - 1) }))}
                        className="flex-1 px-2 hover:bg-white/10 text-gray-400 hover:text-cyan-400 transition-colors border-t border-white/10 rounded-br-xl flex items-center justify-center"
                        tabIndex={-1}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Vainqueur:</span>
                  <span className="font-mono font-bold text-violet-400">
                    {effectiveRules.correct_winner_points} pts
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Score Exact:</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {effectiveRules.exact_score_bonus} pts
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>



        {/* Card 2: Invitation (Or Middle Spacer if needed) */}
        <Card className="flex-1">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-gray-400" /> Invitation
          </h2>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-white bg-black/30 px-3 py-1.5 rounded border border-white/10 flex-1 text-center select-all">
              {tournament.invite_code}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyInvite}
              title={isCopied ? "Copié !" : "Copier"}
              className={isCopied ? "text-green-400 bg-green-400/10 border-green-400/20" : ""}
            >
              {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </Card>

        {/* Card 3: Administration OR Phase Settings */}
        {activeStage ? (
          // MODE PHASE: "Paramètre de la phase"
          <Card className="border-violet-500/20 flex-1">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" /> Paramètre de la phase
            </h2>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-400 flex-1 flex flex-col items-center justify-center">
                {(() => {
                  const total = stageMatches.length
                  const played = stageMatches.filter(m => m.result !== null).length
                  const isCompleted = total > 0 && played === total

                  return isCompleted ? (
                    <span className="flex items-center gap-2 text-blue-400">
                      <Trophy className="w-3 h-3" /> Terminé ({played}/{total})
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      En cours ({played}/{total})
                    </span>
                  )
                })()}
              </div>

              {isAdmin && (
                <Button
                  onClick={() => {
                    if (window.confirm(`Supprimer la phase "${activeStage.name}" ?`)) {
                      handleDeleteStage(activeStage.id)
                    }
                  }}
                  disabled={actionLoading}
                  variant="danger"
                  size="sm"
                  title="Supprimer la phase"
                  className="flex-1"
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Supprimer
                </Button>
              )}
            </div>
          </Card>
        ) : (
          // MODE TOURNOI: "Administration"
          isAdmin ? (
            <Card className="border-violet-500/20 flex-1">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-violet-400" /> Administration
              </h2>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-400 flex-1 flex flex-col items-center justify-center">
                  {tournament.status === 'draft' && (
                    <span className="flex items-center gap-2 text-amber-400">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Brouillon
                    </span>
                  )}
                  {tournament.status === 'active' && (
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      En cours ({playedMatches}/{currentMatches})
                    </span>
                  )}
                  {tournament.status === 'completed' && (
                    <span className="flex items-center gap-2 text-blue-400">
                      <Trophy className="w-3 h-3" /> Terminé
                    </span>
                  )}
                </div>

                {tournament.status === 'draft' && (
                  <Button
                    onClick={handleActivateTournament}
                    disabled={actionLoading}
                    variant="primary"
                    size="sm"
                    title="Lancer le tournoi"
                    className="flex-1"
                    icon={<Play className="w-4 h-4" />}
                  >
                    Lancer
                  </Button>
                )}

                <Button
                  onClick={handleDeleteTournament}
                  disabled={actionLoading}
                  variant="danger"
                  size="sm"
                  title="Supprimer le tournoi"
                  className="flex-1"
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Supprimer
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="flex-1 border-white/5 opacity-80">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-gray-400" /> Mon statut
              </h2>
              <div className="text-sm text-gray-400">
                {predictions.length} pronostic(s) réalisé(s)
              </div>
            </Card>
          )
        )}
      </div>

      {/* 
        =======================================================================
        MAIN CONTENT AREA
        Bracket Format -> Stacked (Leaderboard -> Bracket)
        League Format -> Grid (Leaderboard [Col 1] -> Matches [Col 2])
        =======================================================================
      */}
      {isBracketFormat ? (
        /* VUE BRACKET */
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Medal className="w-5 h-5 text-cyan-400" /> Bracket
            </h2>

            {stageMatches.length === 0 && isAdmin ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-lg border border-dashed border-white/10 space-y-4">
                <div className="p-4 bg-violet-500/10 rounded-full">
                  <Users className="w-8 h-8 text-violet-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-white">Cette phase est vide</h3>
                  <p className="text-gray-400 text-sm max-w-sm mt-1">Sélectionnez les équipes participantes pour générer l'arbre automatiquement.</p>
                </div>
                <Button onClick={() => setIsSeedingStage(true)}>
                  Configurer les participants
                </Button>
              </div>
            ) : (
              <BracketView
                matches={stageMatches}
                predictions={predictions}
                tournament={tournament}
                isAdmin={isAdmin}
                onEnterResult={(match) => setResultMatch(match)}
                onPredict={(match) => setPredictionMatch(match)}
                onChangeFormat={handleChangeFormat}
                onEdit={openEditMatch}
                teams={teams}
              />
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" /> Classement
            </h2>
            <LeaderboardTable
              entries={leaderboard}
              loading={leaderboardLoading}
              isAdmin={isAdmin}
              adminId={tournament?.admin_id}
              onRemoveParticipant={handleRemoveParticipant}
              onUpdateBonus={handleUpdateBonus}
            />
          </Card>
        </div>
      ) : (
        /* VUE LIGUE */
        <div className="space-y-6 overflow-hidden">

          {/* Grid Layout: Matches (Main) & Standings Sidebar (Right) */}
          <div className="grid grid-cols-1 min-[1320px]:grid-cols-3 gap-6">
            {/* Zone Principale: Matchs (2/3) */}
            <div className={`min-[1320px]:col-span-2 min-[1320px]:order-1 ${mobileTab === 'matches' ? 'block' : 'hidden min-[1320px]:block'}`}>
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-400" /> Matchs
                  </h2>
                  {isAdmin && (
                    <button
                      onClick={() => openAddMatch(selectedRound)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/30 hover:text-white transition-all shadow-sm shadow-violet-900/10"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter un match
                    </button>
                  )}
                </div>

                {rounds.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-white/5 rounded-lg border border-dashed border-gray-700">
                    Aucun match planifié.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Round Selector */}


                    {/* 
                        ROUND SELECTOR (Refactored for Mobile) 
                        - Desktop: Keep scroll view (if large enough) but we can use the same logic or hide this on desktop if table handles it.
                        - Mobile: Prev | Toggle Dropdown | Next
                      */}
                    {/* Round Selector (Simplified: Arrows Only) */}
                    {/* Round Selector (Simplified: Mobile Only) */}
                    <div className="relative z-30 min-[1320px]:hidden">
                      <div className="flex items-center justify-between bg-black/20 rounded-lg p-2 border border-white/5">
                        <button
                          onClick={() => setSelectedRound(prev => Math.max(1, prev - 1))}
                          disabled={selectedRound <= 1}
                          className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-400" />
                        </button>

                        {/* Center Display (Styled) */}
                        <div className="flex-1 flex items-center justify-center -mx-2">
                          <span className="px-6 py-1.5 rounded-md bg-violet-600 text-white text-sm font-medium shadow-lg">
                            Journée {selectedRound}
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedRound(prev => Math.min(maxRound, prev + 1))}
                          disabled={selectedRound >= maxRound}
                          className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>
                    </div>

                    {/* Round Selector (Scrollable: Desktop Only) */}
                    <div className="hidden min-[1320px]:flex relative z-30 items-center justify-between gap-4 max-w-2xl mx-auto">
                      <button
                        onClick={() => setSelectedRound(prev => Math.max(1, prev - 1))}
                        disabled={selectedRound <= 1}
                        className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-400" />
                      </button>

                      <div
                        ref={roundsScrollRef}
                        className="flex overflow-x-auto gap-2 px-2 py-1 md:max-w-xl snap-x snap-mandatory scrollbar-hide"
                      >
                        {Array.from({ length: maxRound }, (_, i) => i + 1).map((r) => (
                          <button
                            key={r}
                            data-round={r}
                            onClick={() => setSelectedRound(r)}
                            className={`
                               snap-center flex-shrink-0 px-4 py-1.5 rounded-md font-medium text-sm transition-all duration-200 whitespace-nowrap
                               ${selectedRound === r
                                ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                              }
                             `}
                          >
                            Journée {r}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setSelectedRound(prev => Math.min(maxRound, prev + 1))}
                        disabled={selectedRound >= maxRound}
                        className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>

                    {/* Selected Round Matches */}
                    <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300" key={selectedRound}>
                      <div className="flex items-center gap-4">
                        <div className="h-px bg-white/10 flex-1"></div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-violet-400 uppercase tracking-wider">Journée {selectedRound}</span>

                          {/* Edit Round Date */}
                          {editingRoundDate === selectedRound ? (
                            <div className="flex items-center gap-1 bg-white/10 rounded px-1 animate-in fade-in zoom-in-95 duration-200">
                              <input
                                type="date"
                                autoFocus
                                className="bg-transparent text-white text-xs border-none focus:ring-0 p-1 font-mono [color-scheme:dark] outline-none"
                                defaultValue={tournament.round_dates?.[selectedRound.toString()] || ''}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRoundDate(selectedRound, e.currentTarget.value)
                                  if (e.key === 'Escape') setEditingRoundDate(null)
                                }}
                                onBlur={(e) => handleSaveRoundDate(selectedRound, e.target.value)}
                              />
                            </div>
                          ) : (
                            <>
                              {tournament.round_dates?.[selectedRound.toString()] ? (
                                <span
                                  onClick={() => isAdmin && setEditingRoundDate(selectedRound)}
                                  className={`text-xs text-cyan-400 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 font-mono ${isAdmin ? 'cursor-pointer hover:bg-white/10 transition-colors' : ''}`}
                                  title={isAdmin ? "Modifier la date" : undefined}
                                >
                                  {new Date(tournament.round_dates[selectedRound.toString()]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                                </span>
                              ) : (
                                isAdmin && (
                                  <button
                                    onClick={() => setEditingRoundDate(selectedRound)}
                                    className="p-1.5 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors"
                                    title="Définir la date"
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                            </>
                          )}
                        </div>
                        <div className="h-px bg-white/10 flex-1"></div>
                      </div>

                      <div className="space-y-3">
                        {matchesByRound[selectedRound]?.map((match) => (
                          <div key={match.id} data-match-id={match.id} className="rounded-lg transition-all duration-300">
                            <LeagueMatchRow
                              match={match}
                              prediction={predictionsByMatch[match.id]}
                              isAdmin={isAdmin}
                              teams={teams}
                              tournamentStatus={tournament.status}
                              onEdit={openEditMatch}
                              onPredict={setPredictionMatch}
                              onChangeFormat={handleChangeFormat}
                              roundDate={tournament.round_dates?.[match.round.toString()]}
                            />
                          </div>
                        )) || (
                            <div className="text-center py-8 text-gray-500 italic">
                              Aucun match dans cette journée.
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar: Deux cards de classements empilées (1/3) */}
            <div className={`min-[1320px]:order-2 min-[1320px]:self-start space-y-4 ${mobileTab === 'standings' ? 'block' : 'hidden min-[1320px]:block'}`}>
              {/* Card Classement Joueurs */}
              <Card>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" /> Classement Joueurs
                </h2>
                <LeaderboardTable
                  entries={leaderboard}
                  loading={leaderboardLoading}
                  isAdmin={isAdmin}
                  adminId={tournament?.admin_id}
                  onRemoveParticipant={handleRemoveParticipant}
                  onUpdateBonus={handleUpdateBonus}
                  compact
                />
              </Card>

              {/* Card Classement Équipes */}
              <Card>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" /> Classement Équipes
                </h2>
                <LeagueStandingsTable teams={teams} matches={stageMatches} />
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isAddingMatch && (
        <MatchEditModal
          match={editingMatch}
          teams={teams}
          maxRound={maxRound}
          defaultRound={addingToRound}
          existingMatches={stageMatches}
          homeAndAway={tournament.home_and_away}
          tournamentStatus={tournament.status}
          isBracket={isBracketFormat}
          canEditTeams={canEditTeamsForMatch(editingMatch)}
          availableTeamsForSlotA={getAvailableTeamsForSlot(editingMatch, 'team_a')}
          availableTeamsForSlotB={getAvailableTeamsForSlot(editingMatch, 'team_b')}
          roundDates={tournament?.round_dates || {}}
          onSave={handleSaveMatch}
          onSaveResult={handleSaveResult}
          onDelete={editingMatch && !isBracketFormat ? handleDeleteMatch : undefined}
          onClose={closeModal}
        />
      )}

      {resultMatch && (
        <MatchResultModal
          match={resultMatch}
          onSave={handleSaveResult}
          onClose={() => setResultMatch(null)}
          isBracket={isBracketFormat}
        />
      )}

      {predictionMatch && (
        <PredictionModal
          match={predictionMatch}
          existingPrediction={predictionsByMatch[predictionMatch.id] || null}
          onSave={handleSavePrediction}
          onClose={() => setPredictionMatch(null)}
          roundDate={tournament.round_dates?.[predictionMatch.round.toString()]}
          teams={teams}
        />
      )}

      {isAddingStage && (
        <StageCreateModal
          onSave={handleCreateStage}
          onClose={() => setIsAddingStage(false)}
          defaultRules={
            stages.length > 0
              ? stages[stages.length - 1].scoring_rules ?? undefined
              : tournament?.scoring_rules ?? undefined
          }
        />
      )}

      {isEditingStageSettings && activeStage && tournament && (
        <StageSettingsModal
          stage={activeStage}
          onSave={handleUpdateStage}
          onDelete={handleDeleteStage}
          onClose={() => setIsEditingStageSettings(false)}
        />
      )}

      {isSeedingStage && activeStage && (
        <StageSeedingModal
          stage={activeStage}
          allTeams={teams} // All teams available in tournament
          onSave={handleSeeding}
          onClose={() => setIsSeedingStage(false)}
        />
      )}
    </div>
  )
}
