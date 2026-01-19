-- ============================================
-- MIGRATION: Add bonus points to participants
-- Purpose: Allow manual adjustment of points (e.g. for late joining compensation)
-- ============================================

-- 1. Add bonus_points column to participants table
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS bonus_points INTEGER NOT NULL DEFAULT 0;

-- 2. Update the trigger function to include bonus_points in calculation
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
        -- Formula: Sum of prediction points + bonus_points
        UPDATE participants p
        SET total_points = (
            SELECT COALESCE(SUM(pr.points_earned), 0)
            FROM predictions pr
            JOIN matches m ON pr.match_id = m.id
            WHERE m.tournament_id = NEW.tournament_id
            AND pr.user_id = p.user_id
        ) + p.bonus_points
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

-- 3. Recalculate total points immediately to include the new column (initially 0)
-- This ensures that if we manually update bonus_points later, we don't need a trigger to see the effect immediately? 
-- actually, changing bonus_points won't trigger this function because this function triggers on MATCHES update.
-- We need a separate trigger or we just need to manual update total_points when we update bonus_points.

-- Let's create a trigger specifically for updating bonus_points to keep total_points in sync
CREATE OR REPLACE FUNCTION update_participant_total_on_bonus_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate total_points for this specific participant
    NEW.total_points = (
        SELECT COALESCE(SUM(pr.points_earned), 0)
        FROM predictions pr
        JOIN matches m ON pr.match_id = m.id
        WHERE m.tournament_id = NEW.tournament_id
        AND pr.user_id = NEW.user_id
    ) + NEW.bonus_points;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid errors on re-run
DROP TRIGGER IF EXISTS trigger_update_total_on_bonus ON participants;

CREATE TRIGGER trigger_update_total_on_bonus
    BEFORE UPDATE OF bonus_points ON participants
    FOR EACH ROW
    EXECUTE FUNCTION update_participant_total_on_bonus_change();

-- 4. Initial recalculation (just in case)
UPDATE participants p
SET total_points = (
    SELECT COALESCE(SUM(pr.points_earned), 0)
    FROM predictions pr
    JOIN matches m ON pr.match_id = m.id
    WHERE m.tournament_id = p.tournament_id
    AND pr.user_id = p.user_id
) + p.bonus_points;
