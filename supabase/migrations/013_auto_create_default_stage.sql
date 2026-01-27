-- Création d'un trigger pour auto-créer un stage par défaut
-- quand un nouveau tournoi est créé

-- Fonction trigger
CREATE OR REPLACE FUNCTION create_default_stage()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO stages (tournament_id, name, type, sequence_order)
    VALUES (NEW.id, 'Phase Principale', NEW.format, 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur la table tournaments
DROP TRIGGER IF EXISTS trg_create_default_stage ON tournaments;
CREATE TRIGGER trg_create_default_stage
    AFTER INSERT ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION create_default_stage();
