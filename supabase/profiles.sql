-- ============================================
-- SCRIPT À EXÉCUTER DANS SUPABASE SQL EDITOR
-- Ajoute la table profiles pour pseudo + avatar
-- ============================================

-- 1. Créer la table profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Le pseudo doit être unique
    CONSTRAINT username_unique UNIQUE (username),
    -- Le pseudo doit avoir au moins 3 caractères
    CONSTRAINT username_min_length CHECK (char_length(username) >= 3),
    -- Le pseudo ne doit pas dépasser 20 caractères
    CONSTRAINT username_max_length CHECK (char_length(username) <= 20)
);

-- 2. Index pour recherche rapide par username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- 3. Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_update_profile_updated_at ON profiles;
CREATE TRIGGER trigger_update_profile_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_updated_at();

-- 4. RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les profils (pour le leaderboard)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

-- Seul l'utilisateur peut modifier son propre profil
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Permettre l'insertion lors de l'inscription (via service role ou trigger)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 5. Activer le realtime pour profiles
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- ============================================
-- IMPORTANT: La création du profil se fait
-- côté application après l'inscription
-- ============================================
