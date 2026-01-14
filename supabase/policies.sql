-- ============================================
-- Tournament Betting Platform - RLS Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TOURNAMENTS POLICIES
-- ============================================

-- Anyone authenticated can view tournaments they participate in or admin
CREATE POLICY "Users can view their tournaments"
    ON tournaments FOR SELECT
    TO authenticated
    USING (
        admin_id = auth.uid()
        OR is_tournament_participant(id, auth.uid())
    );

-- Anyone authenticated can create a tournament
CREATE POLICY "Users can create tournaments"
    ON tournaments FOR INSERT
    TO authenticated
    WITH CHECK (admin_id = auth.uid());

-- Only admin can update their tournament
CREATE POLICY "Admins can update their tournaments"
    ON tournaments FOR UPDATE
    TO authenticated
    USING (admin_id = auth.uid())
    WITH CHECK (admin_id = auth.uid());

-- Only admin can delete their tournament
CREATE POLICY "Admins can delete their tournaments"
    ON tournaments FOR DELETE
    TO authenticated
    USING (admin_id = auth.uid());

-- ============================================
-- MATCHES POLICIES
-- ============================================

-- Participants and admin can view matches
CREATE POLICY "Participants can view matches"
    ON matches FOR SELECT
    TO authenticated
    USING (
        is_tournament_admin(tournament_id, auth.uid())
        OR is_tournament_participant(tournament_id, auth.uid())
    );

-- Only tournament admin can create matches
CREATE POLICY "Admins can create matches"
    ON matches FOR INSERT
    TO authenticated
    WITH CHECK (is_tournament_admin(tournament_id, auth.uid()));

-- Only tournament admin can update matches
CREATE POLICY "Admins can update matches"
    ON matches FOR UPDATE
    TO authenticated
    USING (is_tournament_admin(tournament_id, auth.uid()))
    WITH CHECK (is_tournament_admin(tournament_id, auth.uid()));

-- Only tournament admin can delete matches
CREATE POLICY "Admins can delete matches"
    ON matches FOR DELETE
    TO authenticated
    USING (is_tournament_admin(tournament_id, auth.uid()));

-- ============================================
-- PREDICTIONS POLICIES
-- ============================================

-- Users can view their own predictions always
-- Users can view others' predictions after match is played
CREATE POLICY "Users can view predictions"
    ON predictions FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM matches m
            WHERE m.id = match_id
            AND m.result IS NOT NULL
        )
    );

-- Participants can create predictions before lock time
CREATE POLICY "Participants can create predictions"
    ON predictions FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND NOT is_match_locked(match_id)
        AND EXISTS (
            SELECT 1 FROM matches m
            WHERE m.id = match_id
            AND is_tournament_participant(m.tournament_id, auth.uid())
        )
    );

-- Users can update their own predictions before lock time
CREATE POLICY "Users can update their predictions"
    ON predictions FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        AND NOT is_match_locked(match_id)
    )
    WITH CHECK (
        user_id = auth.uid()
        AND NOT is_match_locked(match_id)
    );

-- Users can delete their own predictions before lock time
CREATE POLICY "Users can delete their predictions"
    ON predictions FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        AND NOT is_match_locked(match_id)
    );

-- ============================================
-- PARTICIPANTS POLICIES
-- ============================================

-- Participants can view other participants in same tournament
CREATE POLICY "Users can view tournament participants"
    ON participants FOR SELECT
    TO authenticated
    USING (
        is_tournament_admin(tournament_id, auth.uid())
        OR is_tournament_participant(tournament_id, auth.uid())
    );

-- Users can join tournaments (via invite code - handled in app)
CREATE POLICY "Users can join tournaments"
    ON participants FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Only system updates points/rank (via trigger)
-- Admin can remove participants
CREATE POLICY "Admins can update participants"
    ON participants FOR UPDATE
    TO authenticated
    USING (is_tournament_admin(tournament_id, auth.uid()));

-- Users can leave, admins can remove others
CREATE POLICY "Users can leave or admins can remove"
    ON participants FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR is_tournament_admin(tournament_id, auth.uid())
    );

-- ============================================
-- PUBLIC ACCESS FOR INVITE CODES
-- ============================================

-- Allow checking invite codes without being a participant
CREATE POLICY "Anyone can lookup tournament by invite code"
    ON tournaments FOR SELECT
    TO authenticated
    USING (invite_code IS NOT NULL);
