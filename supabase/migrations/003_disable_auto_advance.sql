-- ============================================
-- Migration: Disable Auto-Advance Bracket Winner
-- L'admin doit maintenant assigner manuellement les vainqueurs au prochain round
-- ============================================

-- Désactive le trigger d'avancement automatique
DROP TRIGGER IF EXISTS trigger_advance_bracket_winner ON matches;

-- Note: La fonction advance_bracket_winner() reste en place mais n'est plus appelée.
-- Elle pourra être réactivée si besoin avec:
-- CREATE TRIGGER trigger_advance_bracket_winner
--     AFTER UPDATE ON matches
--     FOR EACH ROW
--     WHEN (OLD.result IS NULL AND NEW.result IS NOT NULL)
--     EXECUTE FUNCTION advance_bracket_winner();
