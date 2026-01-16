-- ============================================
-- Migration: Recalculate Tournament Points
-- Adds RPC to recalculate all scores when rules change
-- ============================================

CREATE OR REPLACE FUNCTION recalculate_tournament_points(
    p_tournament_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tournament RECORD;
    v_match RECORD;
BEGIN
    -- 1. Get tournament info including NEW scoring rules
    SELECT * INTO v_tournament
    FROM tournaments
    WHERE id = p_tournament_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tournament not found: %', p_tournament_id;
    END IF;

    -- 2. Recalculate points for ALL predictions in this tournament
    -- We join matches to ensure we only touch predictions for this tournament
    -- and we only touch matches that have a result
    FOR v_match IN
        SELECT m.id, m.result
        FROM matches m
        WHERE m.tournament_id = p_tournament_id
        AND m.result IS NOT NULL
    LOOP
        UPDATE predictions
        SET points_earned = calculate_prediction_points(
            predicted_winner,
            predicted_score,
            v_match.result->>'winner',
            v_match.result->>'score',
            v_tournament.scoring_rules
        )
        WHERE match_id = v_match.id;
    END LOOP;

    -- 3. Recalculate total points for all participants
    UPDATE participants p
    SET total_points = (
        SELECT COALESCE(SUM(pr.points_earned), 0)
        FROM predictions pr
        JOIN matches m ON pr.match_id = m.id
        WHERE m.tournament_id = p_tournament_id
        AND pr.user_id = p.user_id
    )
    WHERE p.tournament_id = p_tournament_id;

    -- 4. Recalculate ranks
    WITH ranked AS (
        SELECT
            user_id,
            RANK() OVER (ORDER BY total_points DESC) as new_rank
        FROM participants
        WHERE tournament_id = p_tournament_id
    )
    UPDATE participants p
    SET rank = r.new_rank
    FROM ranked r
    WHERE p.tournament_id = p_tournament_id
    AND p.user_id = r.user_id;

END;
$$ LANGUAGE plpgsql;
