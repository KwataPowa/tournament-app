// Database types matching Supabase schema

export type TournamentFormat = 'league' | 'swiss' | 'single_elimination' | 'double_elimination'
export type TournamentStatus = 'draft' | 'active' | 'completed'
export type MatchFormat = 'BO1' | 'BO3' | 'BO5' | 'BO7'

export type ScoringRules = {
  correct_winner_points: number
  exact_score_bonus: number
}

export type MatchResult = {
  winner: string
  score: string
}

export type BracketSide = 'winners' | 'losers' | 'grand_final'

export type Team = {
  name: string
  logo?: string
}

/**
 * Normalise les équipes: convertit string[] en Team[] pour la rétrocompatibilité
 * Gère aussi les strings JSON qui doivent être parsées
 */
export function normalizeTeams(teams: (string | Team)[] | undefined): Team[] {
  if (!teams) return []
  return teams.map((team) => {
    if (typeof team === 'string') {
      // Essayer de parser si c'est un JSON stringifié
      if (team.startsWith('{')) {
        try {
          const parsed = JSON.parse(team) as Team
          return parsed
        } catch {
          // Si le parsing échoue, traiter comme un nom simple
          return { name: team }
        }
      }
      return { name: team }
    }
    return team
  })
}

export type Database = {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string
          name: string
          admin_id: string
          format: TournamentFormat
          status: TournamentStatus
          scoring_rules: ScoringRules
          invite_code: string
          teams: Team[]
          home_and_away: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          admin_id: string
          format?: TournamentFormat
          status?: TournamentStatus
          scoring_rules?: ScoringRules
          invite_code?: string
          teams: Team[]
          home_and_away: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          admin_id?: string
          format?: TournamentFormat
          status?: TournamentStatus
          scoring_rules?: ScoringRules
          invite_code?: string
          teams?: Team[]
          home_and_away?: boolean
          created_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          tournament_id: string
          team_a: string
          team_b: string
          match_format: MatchFormat
          result: MatchResult | null
          round: number
          locked_at: string | null
          played_at: string | null
          created_at: string
          // Bracket fields
          bracket_position: number | null
          bracket_side: BracketSide | null
          next_match_id: string | null
          next_loser_match_id: string | null
          is_bye: boolean
        }
        Insert: {
          id?: string
          tournament_id: string
          team_a: string
          team_b: string
          match_format?: MatchFormat
          result?: MatchResult | null
          round?: number
          locked_at?: string | null
          played_at?: string | null
          created_at?: string
          // Bracket fields
          bracket_position?: number | null
          bracket_side?: BracketSide | null
          next_match_id?: string | null
          next_loser_match_id?: string | null
          is_bye?: boolean
        }
        Update: {
          id?: string
          tournament_id?: string
          team_a?: string
          team_b?: string
          match_format?: MatchFormat
          result?: MatchResult | null
          round?: number
          locked_at?: string | null
          played_at?: string | null
          created_at?: string
          // Bracket fields
          bracket_position?: number | null
          bracket_side?: BracketSide | null
          next_match_id?: string | null
          next_loser_match_id?: string | null
          is_bye?: boolean
        }
      }
      predictions: {
        Row: {
          id: string
          match_id: string
          user_id: string
          predicted_winner: string
          predicted_score: string
          points_earned: number | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          user_id: string
          predicted_winner: string
          predicted_score: string
          points_earned?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          user_id?: string
          predicted_winner?: string
          predicted_score?: string
          points_earned?: number | null
          created_at?: string
        }
      }
      participants: {
        Row: {
          tournament_id: string
          user_id: string
          total_points: number
          rank: number | null
          joined_at: string
        }
        Insert: {
          tournament_id: string
          user_id: string
          total_points?: number
          rank?: number | null
          joined_at?: string
        }
        Update: {
          tournament_id?: string
          user_id?: string
          total_points?: number
          rank?: number | null
          joined_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Convenience types
export type Tournament = Database['public']['Tables']['tournaments']['Row']
export type TournamentInsert = Database['public']['Tables']['tournaments']['Insert']
export type TournamentUpdate = Database['public']['Tables']['tournaments']['Update']

export type Match = Database['public']['Tables']['matches']['Row']
export type MatchInsert = Database['public']['Tables']['matches']['Insert']
export type MatchUpdate = Database['public']['Tables']['matches']['Update']

export type Prediction = Database['public']['Tables']['predictions']['Row']
export type PredictionInsert = Database['public']['Tables']['predictions']['Insert']
export type PredictionUpdate = Database['public']['Tables']['predictions']['Update']

export type Participant = Database['public']['Tables']['participants']['Row']
export type ParticipantInsert = Database['public']['Tables']['participants']['Insert']
export type ParticipantUpdate = Database['public']['Tables']['participants']['Update']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

// Bracket-specific types
export type BracketMatch = Match & {
  bracket_position: number
  bracket_side: BracketSide
  next_match_id: string | null
}

export type BracketRound = {
  roundNumber: number
  roundName: string // "Finale", "Demi-finales", etc.
  matches: Match[]
}

export type BracketData = {
  rounds: BracketRound[]
  totalRounds: number
  champion: string | null
}
