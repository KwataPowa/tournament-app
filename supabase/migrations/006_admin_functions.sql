-- ============================================
-- Migration: Admin Functions for Result Correction & Participant Removal
-- ============================================

-- ============================================
-- FUNCTION: update_match_result_recursive
-- Corrige un résultat de match avec effet domino propre sur les matchs suivants
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
    v_old_winner TEXT;
    v_new_loser TEXT;
    v_next_match RECORD;
    v_loser_match RECORD;
    v_current_team_in_next TEXT;
    v_scoring JSONB;
BEGIN
    -- 1. Récupérer le match actuel
    SELECT * INTO v_match FROM matches WHERE id = p_match_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found: %', p_match_id;
    END IF;

    -- 2. Récupérer le tournoi
    SELECT * INTO v_tournament FROM tournaments WHERE id = v_match.tournament_id;
    v_scoring := v_tournament.scoring_rules;

    -- 3. Sauvegarder l'ancien vainqueur (si existait)
    v_old_winner := v_match.result->>'winner';

    -- 4. Déterminer le nouveau perdant
    IF p_new_winner = v_match.team_a THEN
        v_new_loser := v_match.team_b;
    ELSE
        v_new_loser := v_match.team_a;
    END IF;

    -- 5. Mettre à jour le résultat du match source
    UPDATE matches
    SET result = jsonb_build_object('winner', p_new_winner, 'score', p_new_score),
        played_at = COALESCE(played_at, NOW())
    WHERE id = p_match_id;

    -- 6. Recalculer les points des pronostics sur CE match (pas supprimés car équipes inchangées)
    UPDATE predictions
    SET points_earned = calculate_prediction_points(
        predicted_winner,
        predicted_score,
        p_new_winner,
        p_new_score,
        v_scoring
    )
    WHERE match_id = p_match_id;

    -- 7. Traiter l'effet domino sur le match suivant (winner bracket)
    IF v_match.next_match_id IS NOT NULL THEN
        SELECT * INTO v_next_match FROM matches WHERE id = v_match.next_match_id;

        -- Déterminer dans quel slot l'ancien vainqueur était
        IF v_match.target_slot_winner = 'team_a' OR
           (v_match.target_slot_winner IS NULL AND (v_match.bracket_position % 2) = 0) THEN
            v_current_team_in_next := v_next_match.team_a;
        ELSE
            v_current_team_in_next := v_next_match.team_b;
        END IF;

        -- Si l'équipe dans le slot suivant change
        IF v_old_winner IS NOT NULL AND v_current_team_in_next IS DISTINCT FROM p_new_winner THEN
            -- Mettre à jour l'équipe dans le match suivant
            IF v_match.target_slot_winner = 'team_a' OR
               (v_match.target_slot_winner IS NULL AND (v_match.bracket_position % 2) = 0) THEN
                UPDATE matches SET team_a = p_new_winner WHERE id = v_match.next_match_id;
            ELSE
                UPDATE matches SET team_b = p_new_winner WHERE id = v_match.next_match_id;
            END IF;

            -- Si le match suivant avait un résultat, le reset et propager récursivement
            IF v_next_match.result IS NOT NULL THEN
                -- Supprimer les pronostics du match suivant (contexte changé)
                DELETE FROM predictions WHERE match_id = v_match.next_match_id;

                -- Reset le résultat du match suivant
                UPDATE matches SET result = NULL, played_at = NULL WHERE id = v_match.next_match_id;

                -- TODO: On pourrait propager récursivement ici, mais pour simplifier
                -- on laisse l'admin corriger manuellement les matchs suivants
            ELSE
                -- Le match suivant n'a pas de résultat, juste supprimer les pronostics
                -- car le contexte (équipes) a changé
                DELETE FROM predictions WHERE match_id = v_match.next_match_id;
            END IF;
        ELSIF v_old_winner IS NULL THEN
            -- Premier résultat: avancer normalement
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

        -- Déterminer dans quel slot l'ancien perdant était
        IF v_match.target_slot_loser = 'team_a' OR
           (v_match.target_slot_loser IS NULL AND (v_match.bracket_position % 2) = 0) THEN
            v_current_team_in_next := v_loser_match.team_a;
        ELSE
            v_current_team_in_next := v_loser_match.team_b;
        END IF;

        -- Si l'équipe dans le slot change
        IF v_old_winner IS NOT NULL AND v_current_team_in_next IS DISTINCT FROM v_new_loser THEN
            -- Mettre à jour l'équipe dans le loser match
            IF v_match.target_slot_loser = 'team_a' OR
               (v_match.target_slot_loser IS NULL AND (v_match.bracket_position % 2) = 0) THEN
                UPDATE matches SET team_a = v_new_loser WHERE id = v_match.next_loser_match_id;
            ELSE
                UPDATE matches SET team_b = v_new_loser WHERE id = v_match.next_loser_match_id;
            END IF;

            -- Si le loser match avait un résultat, le reset
            IF v_loser_match.result IS NOT NULL THEN
                DELETE FROM predictions WHERE match_id = v_match.next_loser_match_id;
                UPDATE matches SET result = NULL, played_at = NULL WHERE id = v_match.next_loser_match_id;
            ELSE
                DELETE FROM predictions WHERE match_id = v_match.next_loser_match_id;
            END IF;
        ELSIF v_old_winner IS NULL THEN
            -- Premier résultat: avancer le perdant normalement
            IF v_match.target_slot_loser = 'team_a' OR
               (v_match.target_slot_loser IS NULL AND (v_match.bracket_position % 2) = 0) THEN
                UPDATE matches SET team_a = v_new_loser WHERE id = v_match.next_loser_match_id;
            ELSE
                UPDATE matches SET team_b = v_new_loser WHERE id = v_match.next_loser_match_id;
            END IF;
        END IF;
    END IF;

    -- 9. Recalculer les totaux des participants
    UPDATE participants p
    SET total_points = (
        SELECT COALESCE(SUM(pr.points_earned), 0)
        FROM predictions pr
        JOIN matches m ON pr.match_id = m.id
        WHERE m.tournament_id = v_match.tournament_id
        AND pr.user_id = p.user_id
    )
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


-- ============================================
-- FUNCTION: remove_tournament_participant
-- Exclut un utilisateur d'un tournoi et supprime ses pronostics
-- ============================================
CREATE OR REPLACE FUNCTION remove_tournament_participant(
    p_tournament_id UUID,
    p_user_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tournament RECORD;
BEGIN
    -- 1. Vérifier que le tournoi existe
    SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tournament not found: %', p_tournament_id;
    END IF;

    -- 2. Empêcher l'exclusion de l'admin
    IF v_tournament.admin_id = p_user_id THEN
        RAISE EXCEPTION 'Cannot remove tournament admin';
    END IF;

    -- 3. Supprimer tous les pronostics de l'utilisateur pour ce tournoi
    DELETE FROM predictions
    WHERE user_id = p_user_id
    AND match_id IN (
        SELECT id FROM matches WHERE tournament_id = p_tournament_id
    );

    -- 4. Supprimer l'entrée participant
    DELETE FROM participants
    WHERE tournament_id = p_tournament_id
    AND user_id = p_user_id;

    -- 5. Recalculer les rangs des participants restants
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
