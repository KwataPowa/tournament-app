-- ============================================
-- Tournament Betting Platform - Database Schema
-- Phase 1: League Format
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE tournament_format AS ENUM ('league', 'swiss', 'single_elimination', 'double_elimination');
CREATE TYPE tournament_status AS ENUM ('draft', 'active', 'completed');
CREATE TYPE match_format AS ENUM ('BO1', 'BO3', 'BO5', 'BO7');

-- ============================================
-- TABLES
-- ============================================

-- Tournaments table
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    format tournament_format NOT NULL DEFAULT 'league',
    status tournament_status NOT NULL DEFAULT 'draft',
    scoring_rules JSONB NOT NULL DEFAULT '{"correct_winner_points": 1, "exact_score_bonus": 1}',
    invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
    teams TEXT[] NOT NULL DEFAULT '{}',
    home_and_away BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_a TEXT NOT NULL,
    team_b TEXT NOT NULL,
    match_format match_format NOT NULL DEFAULT 'BO3',
    result JSONB DEFAULT NULL, -- {"winner": "Team A", "score": "2-1"}
    round INTEGER NOT NULL DEFAULT 1,
    locked_at TIMESTAMPTZ DEFAULT NULL,
    played_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Predictions table
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    predicted_winner TEXT NOT NULL,
    predicted_score TEXT NOT NULL, -- "2-1", "3-0", etc.
    points_earned INTEGER DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One prediction per user per match
    UNIQUE(match_id, user_id)
);

-- Participants table (junction table for tournament membership)
CREATE TABLE participants (
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_points INTEGER NOT NULL DEFAULT 0,
    rank INTEGER DEFAULT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (tournament_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_tournaments_admin ON tournaments(admin_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_invite_code ON tournaments(invite_code);

CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_locked_at ON matches(locked_at);

CREATE INDEX idx_predictions_match ON predictions(match_id);
CREATE INDEX idx_predictions_user ON predictions(user_id);

CREATE INDEX idx_participants_user ON participants(user_id);
CREATE INDEX idx_participants_rank ON participants(tournament_id, rank);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to check if user is tournament participant
CREATE OR REPLACE FUNCTION is_tournament_participant(tournament_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM participants
        WHERE tournament_id = tournament_uuid AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is tournament admin
CREATE OR REPLACE FUNCTION is_tournament_admin(tournament_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tournaments
        WHERE id = tournament_uuid AND admin_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if match is locked
CREATE OR REPLACE FUNCTION is_match_locked(match_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    lock_time TIMESTAMPTZ;
BEGIN
    SELECT locked_at INTO lock_time FROM matches WHERE id = match_uuid;
    RETURN lock_time IS NOT NULL AND lock_time <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate points for a prediction
CREATE OR REPLACE FUNCTION calculate_prediction_points(
    p_predicted_winner TEXT,
    p_predicted_score TEXT,
    p_actual_winner TEXT,
    p_actual_score TEXT,
    p_scoring_rules JSONB
)
RETURNS INTEGER AS $$
DECLARE
    points INTEGER := 0;
    winner_points INTEGER;
    score_bonus INTEGER;
BEGIN
    winner_points := COALESCE((p_scoring_rules->>'correct_winner_points')::INTEGER, 1);
    score_bonus := COALESCE((p_scoring_rules->>'exact_score_bonus')::INTEGER, 1);

    -- Check if winner is correct
    IF p_predicted_winner = p_actual_winner THEN
        points := points + winner_points;

        -- Check if exact score is correct
        IF p_predicted_score = p_actual_score THEN
            points := points + score_bonus;
        END IF;
    END IF;

    RETURN points;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to auto-calculate points when match result is entered
-- SECURITY DEFINER is required to bypass RLS policies when updating predictions/participants
CREATE OR REPLACE FUNCTION update_prediction_points()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    scoring JSONB;
BEGIN
    -- Only run when result changes from NULL to a value OR when result is modified
    IF NEW.result IS NOT NULL AND (OLD.result IS NULL OR OLD.result IS DISTINCT FROM NEW.result) THEN
        -- Get tournament scoring rules
        SELECT scoring_rules INTO scoring
        FROM tournaments
        WHERE id = NEW.tournament_id;

        -- Update all predictions for this match
        UPDATE predictions
        SET points_earned = calculate_prediction_points(
            predicted_winner,
            predicted_score,
            NEW.result->>'winner',
            NEW.result->>'score',
            scoring
        )
        WHERE match_id = NEW.id;

        -- Update participant total points for ALL participants in the tournament
        UPDATE participants p
        SET total_points = (
            SELECT COALESCE(SUM(pr.points_earned), 0)
            FROM predictions pr
            JOIN matches m ON pr.match_id = m.id
            WHERE m.tournament_id = NEW.tournament_id
            AND pr.user_id = p.user_id
        )
        WHERE p.tournament_id = NEW.tournament_id;

        -- Update ranks
        WITH ranked AS (
            SELECT
                user_id,
                RANK() OVER (ORDER BY total_points DESC) as new_rank
            FROM participants
            WHERE tournament_id = NEW.tournament_id
        )
        UPDATE participants p
        SET rank = r.new_rank
        FROM ranked r
        WHERE p.tournament_id = NEW.tournament_id
        AND p.user_id = r.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_prediction_points
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_prediction_points();

-- Function to auto-add admin as participant when creating tournament
CREATE OR REPLACE FUNCTION add_admin_as_participant()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO participants (tournament_id, user_id)
    VALUES (NEW.id, NEW.admin_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_add_admin_as_participant
    AFTER INSERT ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION add_admin_as_participant();

-- ============================================
-- REALTIME
-- Enable realtime for live updates
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
