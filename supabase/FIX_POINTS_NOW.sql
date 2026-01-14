-- =============================================
-- EXÉCUTER CE SCRIPT DANS SUPABASE SQL EDITOR
-- Corrige le problème des points à 0
-- =============================================

-- 1. Recréer le trigger avec SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_prediction_points()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    scoring JSONB;
BEGIN
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

        -- Update participant total points
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

-- 2. Recalculer les points pour TOUS les matchs existants avec résultat
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT m.id as match_id, m.tournament_id, m.result, t.scoring_rules
        FROM matches m
        JOIN tournaments t ON m.tournament_id = t.id
        WHERE m.result IS NOT NULL
    LOOP
        UPDATE predictions
        SET points_earned = calculate_prediction_points(
            predicted_winner,
            predicted_score,
            r.result->>'winner',
            r.result->>'score',
            r.scoring_rules
        )
        WHERE match_id = r.match_id;
    END LOOP;
END $$;

-- 3. Recalculer les total_points de tous les participants
UPDATE participants p
SET total_points = (
    SELECT COALESCE(SUM(pr.points_earned), 0)
    FROM predictions pr
    JOIN matches m ON pr.match_id = m.id
    WHERE m.tournament_id = p.tournament_id
    AND pr.user_id = p.user_id
);

-- 4. Recalculer les rangs
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

-- 5. Vérification - affiche les points calculés
SELECT
    t.name as tournoi,
    p.user_id,
    p.total_points,
    p.rank
FROM participants p
JOIN tournaments t ON p.tournament_id = t.id
ORDER BY t.name, p.rank;
