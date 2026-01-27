-- Migration vers l'architecture Multi-Phases (Stages)

-- 1. Création de la table 'stages'
CREATE TABLE IF NOT EXISTS stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type tournament_format NOT NULL,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sécurisation de la table stages
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;

-- Policies pour stages (similaire aux tournois)
CREATE POLICY "Stages are viewable by everyone"
    ON stages FOR SELECT
    USING (true);

CREATE POLICY "Admins can insert stages"
    ON stages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tournaments
            WHERE id = stages.tournament_id
            AND admin_id = auth.uid()
        )
    );

CREATE POLICY "Admins can update stages"
    ON stages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM tournaments
            WHERE id = stages.tournament_id
            AND admin_id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete stages"
    ON stages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM tournaments
            WHERE id = stages.tournament_id
            AND admin_id = auth.uid()
        )
    );

-- 2. Modification de la table 'matches'
-- On ajoute la colonne stage_id, nullable pour l'instant
ALTER TABLE matches ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES stages(id) ON DELETE CASCADE;

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_stages_tournament ON stages(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_stage ON matches(stage_id);

-- 3. Scripts de Migration des Données
-- Pour chaque tournoi existant, on crée une "Phase Principale" qui hérite du format du tournoi
DO $$
DECLARE
    t RECORD;
    new_stage_id UUID;
BEGIN
    FOR t IN SELECT * FROM tournaments LOOP
        -- Créer le stage
        INSERT INTO stages (tournament_id, name, type, sequence_order)
        VALUES (t.id, 'Phase Principale', t.format, 1)
        RETURNING id INTO new_stage_id;

        -- Migrer les matchs de ce tournoi vers ce nouveau stage
        UPDATE matches
        SET stage_id = new_stage_id
        WHERE tournament_id = t.id;
    END LOOP;
END $$;

-- 4. Sécurisation future (Optionnel pour l'instant pour éviter de bloquer)
-- Une fois sûr que tout est migré, on pourrait mettre stage_id en NOT NULL
-- ALTER TABLE matches ALTER COLUMN stage_id SET NOT NULL;
