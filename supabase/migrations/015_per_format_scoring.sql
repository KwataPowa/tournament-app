-- ============================================
-- Migration: Per-Format Scoring Rules
-- Permet de configurer des points differents par format de match (BO1/BO3/BO5/BO7)
-- ============================================

-- 1. Supprimer l'ancienne version (5 params) pour eviter la surcharge ambigue
DROP FUNCTION IF EXISTS calculate_prediction_points(TEXT, TEXT, TEXT, TEXT, JSONB);

-- 2. Creer la nouvelle version avec match_format
CREATE OR REPLACE FUNCTION calculate_prediction_points(
    p_predicted_winner TEXT,
    p_predicted_score TEXT,
    p_actual_winner TEXT,
    p_actual_score TEXT,
    p_scoring_rules JSONB,
    p_match_format TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    points INTEGER := 0;
    winner_points INTEGER;
    score_bonus INTEGER;
BEGIN
    -- Resoudre les points : per_format override > defaut
    IF p_match_format IS NOT NULL
       AND p_scoring_rules->'per_format' IS NOT NULL
       AND p_scoring_rules->'per_format'->p_match_format IS NOT NULL THEN
        winner_points := COALESCE(
            (p_scoring_rules->'per_format'->p_match_format->>'correct_winner_points')::INTEGER,
            (p_scoring_rules->>'correct_winner_points')::INTEGER,
            1
        );
        score_bonus := COALESCE(
            (p_scoring_rules->'per_format'->p_match_format->>'exact_score_bonus')::INTEGER,
            (p_scoring_rules->>'exact_score_bonus')::INTEGER,
            1
        );
    ELSE
        winner_points := COALESCE((p_scoring_rules->>'correct_winner_points')::INTEGER, 1);
        score_bonus := COALESCE((p_scoring_rules->>'exact_score_bonus')::INTEGER, 1);
    END IF;

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

-- 3. Mise a jour du trigger pour passer match_format
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

        -- Recuperer les regles de scoring
        -- Priorite : 1. Regles du Stage (si definies) -> 2. Regles du Tournoi (fallback)
        SELECT COALESCE(s.scoring_rules, t.scoring_rules) INTO scoring
        FROM tournaments t
        LEFT JOIN stages s ON s.id = NEW.stage_id
        WHERE t.id = NEW.tournament_id;

        -- Update all predictions for this match (avec match_format)
        UPDATE predictions
        SET points_earned = calculate_prediction_points(
            predicted_winner,
            predicted_score,
            NEW.result->>'winner',
            NEW.result->>'score',
            scoring,
            NEW.match_format
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

-- 4. Mise a jour de recalculate_tournament_points pour passer match_format
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
    v_scoring JSONB;
BEGIN
    -- 1. Get tournament info including scoring rules
    SELECT * INTO v_tournament
    FROM tournaments
    WHERE id = p_tournament_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tournament not found: %', p_tournament_id;
    END IF;

    -- 2. Recalculate points for ALL predictions in this tournament
    FOR v_match IN
        SELECT m.id, m.result, m.match_format, m.stage_id
        FROM matches m
        WHERE m.tournament_id = p_tournament_id
        AND m.result IS NOT NULL
    LOOP
        -- Resoudre scoring : stage > tournament
        SELECT COALESCE(s.scoring_rules, v_tournament.scoring_rules) INTO v_scoring
        FROM tournaments t
        LEFT JOIN stages s ON s.id = v_match.stage_id
        WHERE t.id = p_tournament_id;

        UPDATE predictions
        SET points_earned = calculate_prediction_points(
            predicted_winner,
            predicted_score,
            v_match.result->>'winner',
            v_match.result->>'score',
            v_scoring,
            v_match.match_format
        )
        WHERE match_id = v_match.id;
    END LOOP;

    -- 3. Recalculate total points for all participants
    -- Formula: Sum of prediction points + bonus_points
    UPDATE participants p
    SET total_points = (
        SELECT COALESCE(SUM(pr.points_earned), 0)
        FROM predictions pr
        JOIN matches m ON pr.match_id = m.id
        WHERE m.tournament_id = p_tournament_id
        AND pr.user_id = p.user_id
    ) + p.bonus_points
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

-- 5. Mise a jour de update_match_result_recursive pour passer match_format
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
    v_old_winner TEXT;
    v_new_loser TEXT;
    v_next_match RECORD;
    v_loser_match RECORD;
    v_current_team_in_next TEXT;
    v_scoring JSONB;
BEGIN
    -- 1. Recuperer le match actuel
    SELECT * INTO v_match FROM matches WHERE id = p_match_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found: %', p_match_id;
    END IF;

    -- 2. Recuperer le tournoi
    SELECT * INTO v_tournament FROM tournaments WHERE id = v_match.tournament_id;
    v_scoring := v_tournament.scoring_rules;

    -- 3. Sauvegarder l'ancien vainqueur (si existait)
    v_old_winner := v_match.result->>'winner';

    -- 4. Determiner le nouveau perdant
    IF p_new_winner = v_match.team_a THEN
        v_new_loser := v_match.team_b;
    ELSE
        v_new_loser := v_match.team_a;
    END IF;

    -- 5. Mettre a jour le resultat du match source
    UPDATE matches
    SET result = jsonb_build_object('winner', p_new_winner, 'score', p_new_score),
        played_at = COALESCE(played_at, NOW())
    WHERE id = p_match_id;

    -- 6. Recalculer les points des pronostics sur CE match (avec match_format)
    UPDATE predictions
    SET points_earned = calculate_prediction_points(
        predicted_winner,
        predicted_score,
        p_new_winner,
        p_new_score,
        v_scoring,
        v_match.match_format
    )
    WHERE match_id = p_match_id;

    -- 7. Traiter l'effet domino sur le match suivant (winner bracket)
    IF v_match.next_match_id IS NOT NULL THEN
        SELECT * INTO v_next_match FROM matches WHERE id = v_match.next_match_id;

        -- Determiner dans quel slot l'ancien vainqueur etait
        IF v_match.target_slot_winner = 'team_a' OR
           (v_match.target_slot_winner IS NULL AND (v_match.bracket_position % 2) = 0) THEN
            v_current_team_in_next := v_next_match.team_a;
        ELSE
            v_current_team_in_next := v_next_match.team_b;
        END IF;

        -- Si l'equipe dans le slot suivant change
        IF v_old_winner IS NOT NULL AND v_current_team_in_next IS DISTINCT FROM p_new_winner THEN
            -- Mettre a jour l'equipe dans le match suivant
            IF v_match.target_slot_winner = 'team_a' OR
               (v_match.target_slot_winner IS NULL AND (v_match.bracket_position % 2) = 0) THEN
                UPDATE matches SET team_a = p_new_winner WHERE id = v_match.next_match_id;
            ELSE
                UPDATE matches SET team_b = p_new_winner WHERE id = v_match.next_match_id;
            END IF;

            -- Si le match suivant avait un resultat, le reset et propager recursivement
            IF v_next_match.result IS NOT NULL THEN
                DELETE FROM predictions WHERE match_id = v_match.next_match_id;
                UPDATE matches SET result = NULL, played_at = NULL WHERE id = v_match.next_match_id;
            ELSE
                DELETE FROM predictions WHERE match_id = v_match.next_match_id;
            END IF;
        ELSIF v_old_winner IS NULL THEN
            -- Premier resultat: avancer normalement
            IF v_match.target_slot_winner = 'team_a' OR
               (v_match.target_slot_winner IS NULL AND (v_match.bracket_position % 2) = 0) THEN
                UPDATE matches SET team_a = p_new_winner WHERE id = v_match.next_match_id;
            ELSE
                UPDATE matches SET team_b = p_new_winner WHERE id = v_match.next_match_id;
            END IF;
        END IF;
    END IF;

    -- 8. Traiter l'effet domino sur le loser bracket (double elimination)
    IF v_match.next_loser_match_id IS NOT NULL AND v_tournament.format = 'double_elimination' THEN
        SELECT * INTO v_loser_match FROM matches WHERE id = v_match.next_loser_match_id;

        IF v_match.target_slot_loser = 'team_a' OR
           (v_match.target_slot_loser IS NULL AND (v_match.bracket_position % 2) = 0) THEN
            v_current_team_in_next := v_loser_match.team_a;
        ELSE
            v_current_team_in_next := v_loser_match.team_b;
        END IF;

        IF v_old_winner IS NOT NULL AND v_current_team_in_next IS DISTINCT FROM v_new_loser THEN
            IF v_match.target_slot_loser = 'team_a' OR
               (v_match.target_slot_loser IS NULL AND (v_match.bracket_position % 2) = 0) THEN
                UPDATE matches SET team_a = v_new_loser WHERE id = v_match.next_loser_match_id;
            ELSE
                UPDATE matches SET team_b = v_new_loser WHERE id = v_match.next_loser_match_id;
            END IF;

            IF v_loser_match.result IS NOT NULL THEN
                DELETE FROM predictions WHERE match_id = v_match.next_loser_match_id;
                UPDATE matches SET result = NULL, played_at = NULL WHERE id = v_match.next_loser_match_id;
            ELSE
                DELETE FROM predictions WHERE match_id = v_match.next_loser_match_id;
            END IF;
        ELSIF v_old_winner IS NULL THEN
            IF v_match.target_slot_loser = 'team_a' OR
               (v_match.target_slot_loser IS NULL AND (v_match.bracket_position % 2) = 0) THEN
                UPDATE matches SET team_a = v_new_loser WHERE id = v_match.next_loser_match_id;
            ELSE
                UPDATE matches SET team_b = v_new_loser WHERE id = v_match.next_loser_match_id;
            END IF;
        END IF;
    END IF;

    -- 9. Recalculer les totaux des participants
    -- Formula: Sum of prediction points + bonus_points
    UPDATE participants p
    SET total_points = (
        SELECT COALESCE(SUM(pr.points_earned), 0)
        FROM predictions pr
        JOIN matches m ON pr.match_id = m.id
        WHERE m.tournament_id = v_match.tournament_id
        AND pr.user_id = p.user_id
    ) + p.bonus_points
    WHERE p.tournament_id = v_match.tournament_id;

    -- 10. Recalculer les rangs
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
