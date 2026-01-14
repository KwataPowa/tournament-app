-- ============================================
-- MIGRATION: Fix trigger RLS bypass
-- Date: 2024
-- Problem: update_prediction_points() trigger cannot update
--          predictions.points_earned and participants.total_points
--          because RLS policies block it (runs with user context)
-- Solution: Add SECURITY DEFINER to bypass RLS
-- ============================================

-- Drop and recreate the trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_prediction_points()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    scoring JSONB;
BEGIN
    -- Run when result changes from NULL to a value OR when result is modified
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

-- ============================================
-- OPTIONAL: Recalculate all points for existing matches
-- Run this if you have matches with results but points weren't calculated
-- ============================================

-- Recalculate points for all predictions with existing match results
DO $$
DECLARE
    t_record RECORD;
BEGIN
    FOR t_record IN
        SELECT m.id as match_id, m.tournament_id, m.result, t.scoring_rules
        FROM matches m
        JOIN tournaments t ON m.tournament_id = t.id
        WHERE m.result IS NOT NULL
    LOOP
        -- Update predictions for this match
        UPDATE predictions
        SET points_earned = calculate_prediction_points(
            predicted_winner,
            predicted_score,
            t_record.result->>'winner',
            t_record.result->>'score',
            t_record.scoring_rules
        )
        WHERE match_id = t_record.match_id;
    END LOOP;
END $$;

-- Recalculate total points for all participants
UPDATE participants p
SET total_points = (
    SELECT COALESCE(SUM(pr.points_earned), 0)
    FROM predictions pr
    JOIN matches m ON pr.match_id = m.id
    WHERE m.tournament_id = p.tournament_id
    AND pr.user_id = p.user_id
);

-- Recalculate ranks for all tournaments
DO $$
DECLARE
    t_id UUID;
BEGIN
    FOR t_id IN SELECT DISTINCT tournament_id FROM participants
    LOOP
        WITH ranked AS (
            SELECT
                user_id,
                RANK() OVER (ORDER BY total_points DESC) as new_rank
            FROM participants
            WHERE tournament_id = t_id
        )
        UPDATE participants p
        SET rank = r.new_rank
        FROM ranked r
        WHERE p.tournament_id = t_id
        AND p.user_id = r.user_id;
    END LOOP;
END $$;

-- ============================================
-- Verification query (run to check results)
-- ============================================
-- SELECT
--     p.user_id,
--     t.name as tournament_name,
--     p.total_points,
--     p.rank
-- FROM participants p
-- JOIN tournaments t ON p.tournament_id = t.id
-- ORDER BY t.name, p.rank;

-- ============================================
-- ENABLE REALTIME FOR TABLES
-- Required for live updates to work
-- Go to Supabase Dashboard > Database > Replication
-- Or run these commands:
-- ============================================

-- Enable realtime for matches table
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- Enable realtime for predictions table
ALTER PUBLICATION supabase_realtime ADD TABLE predictions;

-- Enable realtime for participants table (leaderboard)
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
