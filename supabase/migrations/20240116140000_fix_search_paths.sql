-- Migration: Fix Function Search Paths
-- Addresses Supabase warnings about mutable search_path in SECURITY DEFINER functions

-- 1. get_bracket_match_count
ALTER FUNCTION public.get_bracket_match_count(INTEGER, tournament_format) SET search_path = public;

-- 2. handle_new_user
-- Note: Assuming standard trigger function signature (no args)
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 3. is_tournament_participant
ALTER FUNCTION public.is_tournament_participant(UUID, UUID) SET search_path = public;

-- 4. is_tournament_admin
ALTER FUNCTION public.is_tournament_admin(UUID, UUID) SET search_path = public;

-- 5. is_match_locked
ALTER FUNCTION public.is_match_locked(UUID) SET search_path = public;

-- 6. calculate_prediction_points
ALTER FUNCTION public.calculate_prediction_points(TEXT, TEXT, TEXT, TEXT, JSONB) SET search_path = public;

-- 7. add_admin_as_participant
ALTER FUNCTION public.add_admin_as_participant() SET search_path = public;

-- 8. update_profile_updated_at
ALTER FUNCTION public.update_profile_updated_at() SET search_path = public;
