-- ============================================
-- Migration: Fix Bracket Advance Logic
-- Adds explicit target slots for complex bracket progression (Double Elim)
-- ============================================

-- 1. Add new columns
ALTER TABLE matches ADD COLUMN IF NOT EXISTS target_slot_winner TEXT CHECK (target_slot_winner IN ('team_a', 'team_b'));
ALTER TABLE matches ADD COLUMN IF NOT EXISTS target_slot_loser TEXT CHECK (target_slot_loser IN ('team_a', 'team_b'));

-- 2. Update the trigger function to use these columns
CREATE OR REPLACE FUNCTION advance_bracket_winner()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tournament_rec RECORD;
    next_match RECORD;
    loser_match RECORD;
    winner_team TEXT;
    loser_team TEXT;
    is_top_slot BOOLEAN;
BEGIN
    -- Only process when result changes from NULL to a value
    IF OLD.result IS NOT NULL OR NEW.result IS NULL THEN
        RETURN NEW;
    END IF;

    -- Only process bracket matches (has bracket_position)
    IF NEW.bracket_position IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get tournament info
    SELECT * INTO tournament_rec
    FROM tournaments
    WHERE id = NEW.tournament_id;

    -- Only for elimination formats
    IF tournament_rec.format NOT IN ('single_elimination', 'double_elimination') THEN
        RETURN NEW;
    END IF;

    -- Get winner and loser
    winner_team := NEW.result->>'winner';
    IF NEW.team_a = winner_team THEN
        loser_team := NEW.team_b;
    ELSE
        loser_team := NEW.team_a;
    END IF;

    -- Advance winner to next match
    IF NEW.next_match_id IS NOT NULL THEN
        SELECT * INTO next_match FROM matches WHERE id = NEW.next_match_id;
        
        -- Logic: If explicit slot is set, use it. Otherwise fall back to position-based logic.
        IF NEW.target_slot_winner IS NOT NULL THEN
            IF NEW.target_slot_winner = 'team_a' THEN
                UPDATE matches SET team_a = winner_team WHERE id = NEW.next_match_id;
            ELSE
                UPDATE matches SET team_b = winner_team WHERE id = NEW.next_match_id;
            END IF;
        ELSE
            -- Default logic (legacy/simple)
            is_top_slot := (NEW.bracket_position % 2) = 0;
            IF is_top_slot THEN
                UPDATE matches SET team_a = winner_team WHERE id = NEW.next_match_id;
            ELSE
                UPDATE matches SET team_b = winner_team WHERE id = NEW.next_match_id;
            END IF;
        END IF;
    END IF;

    -- For double elimination: send loser to losers bracket
    IF tournament_rec.format = 'double_elimination' AND NEW.next_loser_match_id IS NOT NULL THEN
        
        -- Logic: If explicit slot is set, use it. Otherwise fall back to position-based logic.
        IF NEW.target_slot_loser IS NOT NULL THEN
            IF NEW.target_slot_loser = 'team_a' THEN
                UPDATE matches SET team_a = loser_team WHERE id = NEW.next_loser_match_id;
            ELSE
                UPDATE matches SET team_b = loser_team WHERE id = NEW.next_loser_match_id;
            END IF;
        ELSE
             -- Default logic (legacy/simple)
             -- CAUTION: This logic is often flawed for Double Elim, hence the new columns.
             -- We keep it as a fallback.
            is_top_slot := (NEW.bracket_position % 2) = 0;
            IF is_top_slot THEN
                UPDATE matches SET team_a = loser_team WHERE id = NEW.next_loser_match_id;
            ELSE
                UPDATE matches SET team_b = loser_team WHERE id = NEW.next_loser_match_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
