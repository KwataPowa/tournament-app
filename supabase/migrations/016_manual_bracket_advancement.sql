-- ============================================
-- Migration: Manual Bracket Advancement
-- Supprime l'auto-avancement des equipes dans les brackets.
-- L'admin assigne manuellement les equipes aux matchs des rounds suivants.
-- ============================================

CREATE OR REPLACE FUNCTION update_match_result_recursive(
    p_match_id UUID,
    p_new_winner TEXT,
    p_new_score TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match RECORD;
    v_tournament RECORD;
    v_scoring JSONB;
BEGIN
    -- 1. Recuperer le match actuel
    SELECT * INTO v_match FROM matches WHERE id = p_match_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found: %', p_match_id;
    END IF;

    -- 2. Recuperer le tournoi et resoudre le scoring (stage > tournament)
    SELECT * INTO v_tournament FROM tournaments WHERE id = v_match.tournament_id;
    SELECT COALESCE(s.scoring_rules, v_tournament.scoring_rules) INTO v_scoring
    FROM tournaments t
    LEFT JOIN stages s ON s.id = v_match.stage_id
    WHERE t.id = v_match.tournament_id;

    -- 3. Mettre a jour le resultat du match source
    UPDATE matches
    SET result = jsonb_build_object('winner', p_new_winner, 'score', p_new_score),
        played_at = COALESCE(played_at, NOW())
    WHERE id = p_match_id;

    -- 4. Recalculer les points des pronostics sur CE match (avec match_format)
    UPDATE predictions
    SET points_earned = calculate_prediction_points(
        predicted_winner,
        predicted_score,
        p_new_winner,
        p_new_score,
        v_scoring,
        v_match.match_format::TEXT
    )
    WHERE match_id = p_match_id;

    -- PAS D'AUTO-AVANCEMENT: l'admin assigne les equipes manuellement via l'UI.
    -- Les colonnes next_match_id / next_loser_match_id sont preservees
    -- pour le rendu visuel du bracket mais ne servent plus a propager les equipes.

    -- 5. Recalculer les totaux des participants
    UPDATE participants p
    SET total_points = (
        SELECT COALESCE(SUM(pr.points_earned), 0)
        FROM predictions pr
        JOIN matches m ON pr.match_id = m.id
        WHERE m.tournament_id = v_match.tournament_id
        AND pr.user_id = p.user_id
    ) + p.bonus_points
    WHERE p.tournament_id = v_match.tournament_id;

    -- 6. Recalculer les rangs
    WITH ranked AS (
        SELECT
            user_id,
            RANK() OVER (ORDER BY total_points DESC) as new_rank
        FROM participants
        WHERE tournament_id = v_match.tournament_id
    )
    UPDATE participants p
    SET rank = r.new_rank
    FROM ranked r
    WHERE p.tournament_id = v_match.tournament_id
    AND p.user_id = r.user_id;
END;
$$ LANGUAGE plpgsql;
