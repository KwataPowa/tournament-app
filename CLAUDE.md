# Tournament Betting Platform

Plateforme de pronostics eSport (League & Bracket). "Game Launcher" aesthetic.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (Dark Violet + Glassmorphism)
- **Icons**: Lucide React (Premium, consistent stroke)
- **Backend**: Supabase (Auth, DB, Realtime)
- **State**: React Query

## Database Schema
```sql
tournaments (id, name, admin_id, format, status, scoring_rules, invite_code, teams, home_and_away)
matches     (id, tournament_id, team_a, team_b, round, match_format, result, locked_at)
predictions (id, match_id, user_id, predicted_winner, predicted_score, points_earned)
profiles    (id, username, avatar_url)
```

## Architecture
```
src/
├── components/
│   ├── ui/               # Card, Button, Input (glassmorphism)
│   ├── bracket/          # BracketView, BracketMatchCard
│   ├── AvatarDisplay.tsx # Centralized avatar rendering
│   ├── LeagueMatchRow.tsx      # List row for league matches
│   ├── LeagueStandingsTable.tsx # Dynamic team standings
│   └── LeaderboardTable.tsx    # User rankings
├── pages/                # TournamentDetailPage (Hybrid Layouts), etc.
├── services/             # API layer (Supabase wrappers)
└── types/                # Shared TS definitions
```

## Design System
- **Theme**: "Dark Mode Premium eSport"
- **Colors**: Deep Slate `#0f0a1e`, Electric Violet `#7c3aed`, Cyan `#06b6d4`, Amber `#f59e0b`
- **Effects**: Glassmorphism (bg-white/5, blur), Glows (shadow-violet-500/50), Gradients
- **Typography**: Inter / Sans (Clean, modern)
- **Rules**: 
  - **NO EMOJIS**: Use `lucide-react` icons exclusively.
  - **Team Icons**: `object-contain`, transparent, no backgrounds.
  - **Avatars**: Icon-based custom picker.

## Features Status
- [x] **Auth**: Email/Password, custom modal.
- [x] **Formats**: 
  - League (Round-robin + Return legs)
  - Bracket (Single Elimination, Visual Tree)
- [x] **League View**: Hybrid Layout (Full Leaderboard Top + Split Teams/Matches Bottom)
- [x] **Bracket View**: Full-width visual tree + Integrated Leaderboard.
- [x] **Realtime**: Live updates for matches and leaderboards.
- [ ] **Format**: Swiss System (Pending)

## Commands
```bash
npm run dev    # Start dev server
npm run build  # Production build
```
