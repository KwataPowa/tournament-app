-- ============================================
-- Migration: Add Secure Predictions Access
-- Creates an RPC function to fetch predictions only if match has a result
-- ============================================

CREATE OR REPLACE FUNCTION get_match_predictions(p_match_id UUID)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    predicted_winner TEXT,
    predicted_score TEXT,
    points_earned INTEGER,
    created_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if match exists and has a result
    -- The user requested to see predictions "after a match has a result"
    IF NOT EXISTS (
        SELECT 1 FROM matches 
        WHERE id = p_match_id AND result IS NOT NULL
    ) THEN
        -- If no result, return empty set (effectively hiding predictions)
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        p.user_id,
        prof.username,
        prof.avatar_url,
        p.predicted_winner,
        p.predicted_score,
        p.points_earned,
        p.created_at
    FROM predictions p
    JOIN profiles prof ON p.user_id = prof.id
    WHERE p.match_id = p_match_id
    ORDER BY p.points_earned DESC NULLS LAST, p.created_at ASC;
END;
$$ LANGUAGE plpgsql;
