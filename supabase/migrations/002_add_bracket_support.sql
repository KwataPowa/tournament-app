-- ============================================
-- Migration: Add Bracket Support
-- Adds columns and trigger for elimination tournaments
-- ============================================

-- ============================================
-- NEW COLUMNS FOR MATCHES
-- ============================================

-- Position in the bracket (0-indexed within round)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS bracket_position INTEGER DEFAULT NULL;

-- Which side of the bracket (for double elimination)
-- 'winners' = winners bracket, 'losers' = losers bracket, 'grand_final' = grand final
ALTER TABLE matches ADD COLUMN IF NOT EXISTS bracket_side TEXT DEFAULT NULL;

-- Reference to the next match (winner advances to)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS next_match_id UUID REFERENCES matches(id) ON DELETE SET NULL DEFAULT NULL;

-- For losers bracket: reference to the losers match (loser goes to)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS next_loser_match_id UUID REFERENCES matches(id) ON DELETE SET NULL DEFAULT NULL;

-- Flag for bye matches (auto-advance, no prediction needed)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_bye BOOLEAN DEFAULT FALSE;

-- ============================================
-- INDEX FOR BRACKET QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_matches_bracket
ON matches(tournament_id, round, bracket_position)
WHERE bracket_position IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_next_match
ON matches(next_match_id)
WHERE next_match_id IS NOT NULL;

-- ============================================
-- TRIGGER: ADVANCE BRACKET WINNER
-- Automatically places winner in next match when result is entered
-- ============================================

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

        -- Determine if this match feeds into top slot (team_a) or bottom slot (team_b)
        -- Even bracket_position -> team_a, Odd -> team_b
        is_top_slot := (NEW.bracket_position % 2) = 0;

        IF is_top_slot THEN
            UPDATE matches
            SET team_a = winner_team
            WHERE id = NEW.next_match_id;
        ELSE
            UPDATE matches
            SET team_b = winner_team
            WHERE id = NEW.next_match_id;
        END IF;
    END IF;

    -- For double elimination: send loser to losers bracket
    IF tournament_rec.format = 'double_elimination' AND NEW.next_loser_match_id IS NOT NULL THEN
        SELECT * INTO loser_match FROM matches WHERE id = NEW.next_loser_match_id;

        -- Similar logic for losers bracket
        is_top_slot := (NEW.bracket_position % 2) = 0;

        IF is_top_slot THEN
            UPDATE matches
            SET team_a = loser_team
            WHERE id = NEW.next_loser_match_id;
        ELSE
            UPDATE matches
            SET team_b = loser_team
            WHERE id = NEW.next_loser_match_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists to update)
DROP TRIGGER IF EXISTS trigger_advance_bracket_winner ON matches;

CREATE TRIGGER trigger_advance_bracket_winner
    AFTER UPDATE ON matches
    FOR EACH ROW
    WHEN (OLD.result IS NULL AND NEW.result IS NOT NULL)
    EXECUTE FUNCTION advance_bracket_winner();

-- ============================================
-- HELPER FUNCTION: Get bracket match count
-- Returns number of matches needed for a bracket size
-- ============================================

CREATE OR REPLACE FUNCTION get_bracket_match_count(
    bracket_size INTEGER,
    format tournament_format
)
RETURNS INTEGER AS $$
BEGIN
    IF format = 'single_elimination' THEN
        -- Single elimination: n-1 matches for n teams
        RETURN bracket_size - 1;
    ELSIF format = 'double_elimination' THEN
        -- Double elimination: 2*(n-1) + 1 matches (winners + losers + grand final)
        RETURN 2 * (bracket_size - 1) + 1;
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
