-- Ajout support des règles de points par phase (Stage)

-- 1. Ajout de la colonne scoring_rules JSONB à la table stages
ALTER TABLE stages ADD COLUMN IF NOT EXISTS scoring_rules JSONB DEFAULT NULL;

-- 2. Mise à jour de la fonction de calcul des points pour prendre en compte les règles de phase
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
        
        -- Récupérer les règles de scoring
        -- Priorité : 1. Règles du Stage (si définies) -> 2. Règles du Tournoi (fallback)
        SELECT COALESCE(s.scoring_rules, t.scoring_rules) INTO scoring
        FROM tournaments t
        LEFT JOIN stages s ON s.id = NEW.stage_id
        WHERE t.id = NEW.tournament_id;

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
