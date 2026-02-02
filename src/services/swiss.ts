import { supabase } from '../lib/supabase'
import type { Match, MatchFormat, MatchInsert, SwissTeamStatus } from '../types'

// Types pour le système suisse
export type SwissStanding = {
  team: string
  points: number
  wins: number
  losses: number
  draws: number
  buchholz: number // Somme des points des adversaires (départage)
  opponentHistory: string[]
  status: SwissTeamStatus
  record: string // "3-0", "2-1", etc.
}

export type SwissPairing = {
  team_a: string
  team_b: string | null // null = BYE
  is_bye: boolean
}

/**
 * Calcule le nombre de rondes recommandé pour un tournoi suisse
 * Formule: ceil(log2(n)) garantit un vainqueur clair
 */
export function calculateSwissRounds(teamCount: number): number {
  if (teamCount <= 1) return 0
  if (teamCount === 2) return 1
  return Math.ceil(Math.log2(teamCount))
}

/**
 * Vérifie si deux équipes se sont déjà affrontées
 */
function hasPlayed(teamA: string, teamB: string, opponentHistory: Record<string, string[]>): boolean {
  const historyA = opponentHistory[teamA] || []
  return historyA.includes(teamB)
}

/**
 * Calcule les standings suisses à partir des matchs joués
 */
export function calculateSwissStandings(
  teams: string[],
  matches: Match[],
  opponentHistory: Record<string, string[]>
): SwissStanding[] {
  // Initialiser les standings
  const standingsMap = new Map<string, SwissStanding>()

  teams.forEach(team => {
    standingsMap.set(team, {
      team,
      points: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      buchholz: 0,
      opponentHistory: opponentHistory[team] || [],
      status: 'active', // Valeur par défaut
      record: '0-0' // Valeur par défaut, sera mis à jour
    })
  })

  // Compter les résultats
  matches.forEach(match => {
    if (!match.result?.winner) return

    const teamA = match.team_a
    const teamB = match.team_b
    const winner = match.result.winner

    // BYE match - team_b is "BYE" or null
    if (!teamB || teamB === 'BYE') {
      const standing = standingsMap.get(teamA)
      if (standing) {
        standing.points += 1
        standing.wins += 1
      }
      return
    }

    const standingA = standingsMap.get(teamA)
    const standingB = standingsMap.get(teamB)

    if (winner === teamA) {
      if (standingA) {
        standingA.points += 1
        standingA.wins += 1
      }
      if (standingB) {
        standingB.losses += 1
      }
    } else if (winner === teamB) {
      if (standingB) {
        standingB.points += 1
        standingB.wins += 1
      }
      if (standingA) {
        standingA.losses += 1
      }
    }
  })

  // Calculer Buchholz (somme des points des adversaires) et record
  const standings = Array.from(standingsMap.values())
  standings.forEach(standing => {
    standing.buchholz = calculateBuchholz(standing.team, opponentHistory, standingsMap)
    standing.record = `${standing.wins}-${standing.losses}`
  })

  return standings
}

/**
 * Calcule le score Buchholz (somme des points de tous les adversaires)
 */
function calculateBuchholz(
  team: string,
  opponentHistory: Record<string, string[]>,
  standingsMap: Map<string, SwissStanding>
): number {
  const opponents = opponentHistory[team] || []
  return opponents.reduce((sum, opponent) => {
    const opponentStanding = standingsMap.get(opponent)
    return sum + (opponentStanding?.points || 0)
  }, 0)
}

/**
 * Génère les pairages pour une ronde suisse (Algorithme Dutch)
 *
 * 1. Trier les équipes par points (desc), puis Buchholz (desc)
 * 2. Grouper par score
 * 3. Dans chaque groupe: top moitié vs bottom moitié
 * 4. Éviter les rematches
 * 5. BYE pour l'équipe impaire (plus bas score sans BYE)
 */
export function generateSwissPairings(
  standings: SwissStanding[],
  opponentHistory: Record<string, string[]>,
  teamsWithBye: Set<string> = new Set()
): SwissPairing[] {
  const pairings: SwissPairing[] = []
  const paired = new Set<string>()

  // Trier par points (desc), puis Buchholz (desc)
  const sorted = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    return b.buchholz - a.buchholz
  })

  // Gérer le BYE d'abord si nombre impair
  if (sorted.length % 2 === 1) {
    // Trouver l'équipe la plus basse qui n'a pas encore eu de BYE
    for (let i = sorted.length - 1; i >= 0; i--) {
      const team = sorted[i]
      if (!teamsWithBye.has(team.team)) {
        pairings.push({
          team_a: team.team,
          team_b: null,
          is_bye: true
        })
        paired.add(team.team)
        break
      }
    }

    // Si toutes les équipes ont eu un BYE, prendre la dernière
    if (pairings.length === 0 && sorted.length > 0) {
      const lastTeam = sorted[sorted.length - 1]
      pairings.push({
        team_a: lastTeam.team,
        team_b: null,
        is_bye: true
      })
      paired.add(lastTeam.team)
    }
  }

  // Pool global des équipes non pairées
  let unpairedPool = sorted.filter(s => !paired.has(s.team))

  while (unpairedPool.length >= 2) {
    // Prendre la meilleure équipe non pairée
    const teamA = unpairedPool[0]
    paired.add(teamA.team)

    // Trouver le meilleur adversaire valide
    let teamB: SwissStanding | null = null

    for (let i = 1; i < unpairedPool.length; i++) {
      const candidate = unpairedPool[i]
      if (!hasPlayed(teamA.team, candidate.team, opponentHistory)) {
        teamB = candidate
        break
      }
    }

    // Si aucun adversaire sans rematch, prendre le premier disponible
    if (!teamB && unpairedPool.length > 1) {
      teamB = unpairedPool[1]
    }

    if (teamB) {
      paired.add(teamB.team)
      pairings.push({
        team_a: teamA.team,
        team_b: teamB.team,
        is_bye: false
      })
    }

    // Mettre à jour le pool
    unpairedPool = unpairedPool.filter(s => !paired.has(s.team))
  }

  return pairings
}

/**
 * Crée les matchs pour une ronde suisse dans la base de données
 */
export async function generateSwissRound(
  tournamentId: string,
  stageId: string | null,
  roundNumber: number,
  pairings: SwissPairing[],
  matchFormat: MatchFormat = 'BO3'
): Promise<Match[]> {
  const matchInserts: MatchInsert[] = pairings.map(pairing => ({
    tournament_id: tournamentId,
    stage_id: stageId,
    team_a: pairing.team_a,
    team_b: pairing.team_b || 'BYE',
    round: roundNumber,
    match_format: matchFormat,
    is_bye: pairing.is_bye,
    // Pour les BYE, on peut auto-compléter le résultat
    result: pairing.is_bye ? { winner: pairing.team_a, score: 'BYE' } : null
  }))

  const { data, error } = await supabase
    .from('matches')
    .insert(matchInserts)
    .select()

  if (error) {
    throw new Error(`Erreur lors de la création des matchs: ${error.message}`)
  }

  return data as Match[]
}

/**
 * Vérifie si tous les matchs d'une ronde sont terminés
 */
export function isSwissRoundComplete(matches: Match[], round: number): boolean {
  const roundMatches = matches.filter(m => m.round === round)
  if (roundMatches.length === 0) return false
  return roundMatches.every(m => m.result !== null)
}

/**
 * Met à jour l'historique des adversaires après une ronde
 */
export function updateOpponentHistory(
  currentHistory: Record<string, string[]>,
  matches: Match[]
): Record<string, string[]> {
  const newHistory = { ...currentHistory }

  matches.forEach(match => {
    if (match.is_bye || !match.team_b || match.team_b === 'BYE') return

    const teamA = match.team_a
    const teamB = match.team_b

    // Ajouter B à l'historique de A
    if (!newHistory[teamA]) newHistory[teamA] = []
    if (!newHistory[teamA].includes(teamB)) {
      newHistory[teamA].push(teamB)
    }

    // Ajouter A à l'historique de B
    if (!newHistory[teamB]) newHistory[teamB] = []
    if (!newHistory[teamB].includes(teamA)) {
      newHistory[teamB].push(teamA)
    }
  })

  return newHistory
}

/**
 * Récupère les équipes qui ont déjà eu un BYE
 */
export function getTeamsWithBye(matches: Match[]): Set<string> {
  const teamsWithBye = new Set<string>()

  matches.forEach(match => {
    if (match.is_bye || !match.team_b || match.team_b === 'BYE') {
      teamsWithBye.add(match.team_a)
    }
  })

  return teamsWithBye
}

/**
 * Calcule le statut d'une équipe basé sur ses victoires et défaites
 */
export function calculateTeamStatus(
  wins: number,
  losses: number,
  winsToQualify: number,
  lossesToEliminate: number
): SwissTeamStatus {
  if (wins >= winsToQualify) return 'qualified'
  if (losses >= lossesToEliminate) return 'eliminated'
  return 'active'
}

/**
 * Détermine ce qui est en jeu au prochain match
 */
function calculateNextMatchPotential(
  wins: number,
  losses: number,
  winsToQualify: number,
  lossesToEliminate: number
): 'qualification' | 'elimination' | 'neutral' {
  if (wins === winsToQualify - 1) return 'qualification'
  if (losses === lossesToEliminate - 1) return 'elimination'
  return 'neutral'
}

/**
 * Groupe les équipes par leur record (W-L) en buckets
 */
export function groupTeamsByRecord(
  standings: SwissStanding[],
  winsToQualify: number,
  lossesToEliminate: number
): import('../types').SwissBucket[] {
  const bucketMap = new Map<string, import('../types').SwissTeamRecord[]>()

  // Grouper par record
  standings.forEach(s => {
    const record = `${s.wins}-${s.losses}`
    if (!bucketMap.has(record)) {
      bucketMap.set(record, [])
    }
    bucketMap.get(record)!.push({
      team: s.team,
      wins: s.wins,
      losses: s.losses,
      status: s.status,
      nextMatchPotential: calculateNextMatchPotential(
        s.wins,
        s.losses,
        winsToQualify,
        lossesToEliminate
      )
    })
  })

  // Trier : wins DESC, losses ASC
  const buckets: import('../types').SwissBucket[] = []
  Array.from(bucketMap.entries())
    .sort((a, b) => {
      const [wA, lA] = a[0].split('-').map(Number)
      const [wB, lB] = b[0].split('-').map(Number)
      if (wB !== wA) return wB - wA
      return lA - lB
    })
    .forEach(([record, teams]) => {
      const [wins] = record.split('-').map(Number)
      buckets.push({
        record,
        teams,
        isQualified: wins >= winsToQualify,
        isEliminated: teams.every(t => t.status === 'eliminated')
      })
    })

  return buckets
}

/**
 * Calcule les standings suisses avec statut de qualification/élimination
 */
export function calculateSwissStandingsWithStatus(
  teams: string[],
  matches: Match[],
  opponentHistory: Record<string, string[]>,
  winsToQualify: number,
  lossesToEliminate: number
): SwissStanding[] {
  const baseStandings = calculateSwissStandings(teams, matches, opponentHistory)

  return baseStandings.map(s => ({
    ...s,
    status: calculateTeamStatus(s.wins, s.losses, winsToQualify, lossesToEliminate),
    record: `${s.wins}-${s.losses}`
  }))
}
