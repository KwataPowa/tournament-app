# Supabase Database Setup

Instructions pour configurer la base de données Supabase pour le Tournament Betting Platform.

## Prérequis

1. Un compte Supabase (https://supabase.com)
2. Un projet Supabase créé

## Setup

### 1. Créer les tables

1. Va dans ton projet Supabase → **SQL Editor**
2. Copie le contenu de `schema.sql`
3. Exécute le script

Ce script crée :
- Les types ENUM (`tournament_format`, `tournament_status`, `match_format`)
- Les 4 tables principales (`tournaments`, `matches`, `predictions`, `participants`)
- Les index pour optimiser les requêtes
- Les fonctions helper (`is_tournament_participant`, `is_tournament_admin`, etc.)
- Les triggers pour le calcul automatique des points

### 2. Activer les RLS Policies

1. Dans **SQL Editor**, copie le contenu de `policies.sql`
2. Exécute le script

### 3. Activer l'authentification Email

1. Va dans **Authentication** → **Providers**
2. Active **Email** (devrait être activé par défaut)
3. Configure les options :
   - ✅ Enable Email Signup
   - ⚠️ Désactive "Confirm email" pour le dev local (optionnel)

### 4. Récupérer les credentials

1. Va dans **Settings** → **API**
2. Copie :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

3. Crée un fichier `.env` à la racine du projet :
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Structure des tables

### tournaments
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Nom du tournoi |
| admin_id | UUID | Créateur du tournoi (FK → auth.users) |
| format | ENUM | 'league', 'swiss', 'single_elimination', 'double_elimination' |
| status | ENUM | 'draft', 'active', 'completed' |
| scoring_rules | JSONB | `{correct_winner_points: 1, exact_score_bonus: 1}` |
| invite_code | TEXT | Code unique pour rejoindre (8 chars) |
| created_at | TIMESTAMPTZ | Date de création |

### matches
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Primary key |
| tournament_id | UUID | FK → tournaments |
| team_a | TEXT | Équipe A |
| team_b | TEXT | Équipe B |
| match_format | ENUM | 'BO1', 'BO3', 'BO5', 'BO7' |
| result | JSONB | `{winner: "Team A", score: "2-1"}` (null si pas joué) |
| round | INTEGER | Numéro du round |
| locked_at | TIMESTAMPTZ | Heure de verrouillage des pronostics |
| played_at | TIMESTAMPTZ | Date du match |

### predictions
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Primary key |
| match_id | UUID | FK → matches |
| user_id | UUID | FK → auth.users |
| predicted_winner | TEXT | Équipe prédite gagnante |
| predicted_score | TEXT | Score prédit ("2-1") |
| points_earned | INTEGER | Points gagnés (calculé auto) |
| created_at | TIMESTAMPTZ | Date du pronostic |

### participants
| Colonne | Type | Description |
|---------|------|-------------|
| tournament_id | UUID | PK, FK → tournaments |
| user_id | UUID | PK, FK → auth.users |
| total_points | INTEGER | Points totaux |
| rank | INTEGER | Classement |
| joined_at | TIMESTAMPTZ | Date d'inscription |

## RLS Policies résumé

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| tournaments | Participant ou Admin | Authenticated | Admin | Admin |
| matches | Participant ou Admin | Admin | Admin | Admin |
| predictions | Own ou après résultat | Participant (avant lock) | Own (avant lock) | Own (avant lock) |
| participants | Même tournoi | Self | Admin | Self ou Admin |

## Fonctionnalités automatiques

### Calcul des points
Quand un admin entre le résultat d'un match (`matches.result`), le trigger :
1. Calcule les points pour chaque prediction
2. Met à jour `predictions.points_earned`
3. Met à jour `participants.total_points`
4. Recalcule `participants.rank`

### Admin auto-participant
Quand un tournoi est créé, l'admin est automatiquement ajouté comme participant.

### Code d'invitation
Un code unique de 8 caractères est généré automatiquement pour chaque tournoi.

## Test rapide

Pour tester dans le SQL Editor :

```sql
-- Créer un tournoi (remplace l'UUID par ton user id)
INSERT INTO tournaments (name, admin_id, format)
VALUES ('Test League', 'ton-user-uuid', 'league');

-- Voir les tournois
SELECT * FROM tournaments;

-- Voir les participants (l'admin devrait être ajouté auto)
SELECT * FROM participants;
```
