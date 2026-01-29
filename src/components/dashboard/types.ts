import type { LucideIcon } from 'lucide-react'

// Dashboard component types
export type StatCardVariant = 'primary' | 'accent' | 'amber' | 'success'
export type CardVariant = 'default' | 'glass' | 'elevated'
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
export type ButtonSize = 'sm' | 'md' | 'lg'

// Enhanced component props
export interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  variant: StatCardVariant
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glow?: 'violet' | 'cyan' | 'amber' | 'none'
  noPadding?: boolean
  variant?: CardVariant
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  icon?: React.ReactNode
}

// Dashboard layout types
export interface TournamentMiniCardProps {
  tournament: {
    id: string
    name: string
    status: string
    admin_id: string
  }
}

export interface ActivityItem {
  id: string
  tournament: {
    name: string
  }
  team_a: string
  team_b: string
  result?: {
    winner: 'team_a' | 'team_b' | null
    score: string
  }
  prediction?: {
    predicted_winner: 'team_a' | 'team_b' | null
    predicted_score: string
    points_earned: number
  }
}

export interface PendingMatch {
  id: string
  tournament_id: string
  tournament: {
    name: string
  }
  team_a: string
  team_b: string
  start_time?: string
}