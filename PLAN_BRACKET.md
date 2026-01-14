# Plan d'implémentation : Tournois à Élimination Directe

## Résumé
Ajouter le support des tournois Single Elimination (et préparer Double Elimination) avec :
- Génération d'un bracket vide que l'admin remplit manuellement
- Visualisation en arbre du bracket
- Avancement automatique des vainqueurs
- Support des byes automatiques

---

## Phase 1 : Schéma de Base de Données

### 1.1 Nouvelles colonnes pour `matches`
```sql
ALTER TABLE matches ADD COLUMN bracket_position INTEGER DEFAULT NULL;
ALTER TABLE matches ADD COLUMN bracket_side TEXT DEFAULT NULL; -- 'winners', 'losers', 'grand_final'
ALTER TABLE matches ADD COLUMN next_match_id UUID REFERENCES matches(id) DEFAULT NULL;
ALTER TABLE matches ADD COLUMN is_bye BOOLEAN DEFAULT FALSE;
```

### 1.2 Trigger d'avancement automatique
Créer un trigger `advance_bracket_winner()` qui :
- Se déclenche après UPDATE sur matches (quand result passe de NULL à une valeur)
- Trouve le match suivant via `next_match_id`
- Place le vainqueur dans le bon slot (team_a ou team_b selon bracket_position)

**Fichier** : `supabase/migrations/xxx_add_bracket_support.sql`

---

## Phase 2 : Types TypeScript

### 2.1 Mettre à jour `src/types/database.ts`

```typescript
// Ajouter au type Match
bracket_position: number | null
bracket_side: 'winners' | 'losers' | 'grand_final' | null
next_match_id: string | null
is_bye: boolean

// Nouveau type pour le bracket
export type BracketMatch = Match & {
  bracket_position: number
  bracket_side: 'winners' | 'losers' | 'grand_final'
  next_match_id: string | null
}

// Type pour la structure du bracket
export type BracketRound = {
  roundNumber: number
  roundName: string  // "Finale", "Demi-finales", etc.
  matches: BracketMatch[]
}
```

---

## Phase 3 : Service de Génération de Bracket

### 3.1 Créer `src/services/brackets.ts`

Fonctions utilitaires :
- `nextPowerOf2(n)` - Calcule la prochaine puissance de 2
- `calculateByes(teamCount)` - Nombre de byes nécessaires
- `calculateTotalRounds(bracketSize)` - Nombre de rounds
- `getRoundName(round, totalRounds)` - "Finale", "Demi-finales", etc.

Fonctions principales :
- `generateEmptyBracket(tournamentId, bracketSize, format)` - Génère tous les matchs vides avec les liens next_match_id
- `assignTeamToMatch(matchId, slot, teamName)` - Assigne une équipe à team_a ou team_b
- `getBracketData(tournamentId)` - Récupère et structure les matchs en rounds

**Logique de génération** :
1. Calculer le nombre de rounds : `log2(bracketSize)`
2. Générer les matchs de la finale vers le premier tour
3. Relier chaque match au suivant via `next_match_id`
4. Pour Double Elimination : générer aussi le losers bracket

---

## Phase 4 : Page de Création de Tournoi

### 4.1 Modifier `src/pages/CreateTournamentPage.tsx`

Changements :
1. Ajouter un sélecteur de format (League / Single Elimination / Double Elimination)
2. Pour les formats elimination :
   - Masquer l'option "aller-retour"
   - Ajouter un sélecteur de taille du bracket (4, 8, 16, 32)
   - Ajouter le match format par défaut (BO1, BO3, etc.)
3. À la création :
   - Format league : comportement actuel
   - Format elimination : appeler `generateEmptyBracket()`

### 4.2 Validation spécifique
- Minimum 2 équipes (comme avant)
- Pour elimination : vérifier que bracketSize >= nombre d'équipes

---

## Phase 5 : Composants de Visualisation du Bracket

### 5.1 Créer `src/components/bracket/BracketView.tsx`
Composant principal avec CSS Grid :
- Colonnes = rounds (de gauche à droite vers la finale)
- Lignes = matchs espacés verticalement
- Connecteurs visuels entre les matchs

### 5.2 Créer `src/components/bracket/BracketRound.tsx`
Une colonne du bracket :
- Header avec le nom du round
- Liste des matchs avec espacement calculé

### 5.3 Créer `src/components/bracket/BracketMatchCard.tsx`
Carte d'un match dans le bracket :
- Affiche team_a vs team_b (ou "À définir" si vide)
- Indicateur de résultat ou de prédiction
- Clic pour assigner équipe (admin en draft) ou prédire (user en active)
- Style spécial pour les byes

### 5.4 Créer `src/components/bracket/BracketConnectors.css`
Lignes de connexion entre les matchs :
- Lignes horizontales + verticales en CSS
- Couleur violet semi-transparent

---

## Phase 6 : Modal d'Assignation d'Équipe

### 6.1 Créer `src/components/TeamAssignModal.tsx`
Modal pour assigner une équipe à un slot :
- Dropdown avec les équipes du tournoi
- Filtre les équipes déjà assignées (pas de doublons)
- Bouton pour confirmer l'assignation

---

## Phase 7 : Page de Détail du Tournoi

### 7.1 Modifier `src/pages/TournamentDetailPage.tsx`

Changements :
1. Conditionner l'affichage selon `tournament.format` :
   - `league` : affichage actuel par journées
   - `single_elimination` / `double_elimination` : composant BracketView

2. En mode draft pour elimination :
   - Afficher le bracket avec les slots vides
   - Permettre d'assigner les équipes
   - Bouton "Lancer" actif quand tous les matchs du round 1 ont leurs équipes

3. En mode active :
   - Bracket en lecture pour les users
   - Admin peut entrer les résultats

4. Masquer le bouton "Ajouter un match" pour les formats elimination

---

## Phase 8 : Intégration des Prédictions

Les prédictions existantes fonctionnent déjà :
- Un match avec team_a et team_b définis peut recevoir des prédictions
- Le trigger de scoring calcule les points automatiquement

Adaptations :
- Ne pas permettre de prédiction sur les matchs "TBD"
- Ne pas permettre de prédiction sur les byes
- Afficher les prédictions dans BracketMatchCard

---

## Ordre d'Implémentation

### Étape 1 : Base de données et Types ✅
1. Migration SQL pour les nouvelles colonnes
2. Mise à jour des types TypeScript

### Étape 2 : Service de Bracket
1. Créer `src/services/brackets.ts`
2. Implémenter la génération de bracket vide
3. Implémenter l'assignation d'équipes

### Étape 3 : Création de Tournoi
1. Ajouter le sélecteur de format
2. Options spécifiques pour elimination
3. Appel à `generateEmptyBracket` à la création

### Étape 4 : Composants UI du Bracket
1. BracketMatchCard
2. BracketRound
3. BracketView
4. CSS connecteurs

### Étape 5 : Modal d'Assignation
1. TeamAssignModal
2. Intégration dans TournamentDetailPage

### Étape 6 : Page Tournoi
1. Affichage conditionnel bracket/league
2. Mode draft avec assignation
3. Mode active avec résultats

### Étape 7 : Tests et Polish
1. Tester avec 4, 8, 16 équipes
2. Tester les byes
3. Responsive mobile (scroll horizontal)

---

## Fichiers à Créer/Modifier

### Nouveaux Fichiers
- `supabase/migrations/xxx_add_bracket_support.sql`
- `src/services/brackets.ts`
- `src/components/bracket/BracketView.tsx`
- `src/components/bracket/BracketRound.tsx`
- `src/components/bracket/BracketMatchCard.tsx`
- `src/components/bracket/BracketConnectors.css`
- `src/components/TeamAssignModal.tsx`

### Fichiers à Modifier
- `src/types/database.ts` - Ajouter champs bracket
- `src/pages/CreateTournamentPage.tsx` - Sélection format + options
- `src/pages/TournamentDetailPage.tsx` - Affichage conditionnel
- `src/index.css` - Import des styles bracket

---

## Vérification

### Tests Manuels
1. Créer un tournoi Single Elimination avec 8 équipes
2. Vérifier que le bracket vide est généré avec 7 matchs (4+2+1)
3. Assigner les 8 équipes dans les 4 matchs du round 1
4. Lancer le tournoi
5. Entrer un résultat → vérifier que le vainqueur avance
6. Faire des prédictions sur les matchs disponibles
7. Terminer le tournoi → vérifier le scoring

### Cas Limites
- 6 équipes (bracket de 8 avec 2 byes)
- 3 équipes (bracket de 4 avec 1 bye)
- Double clic sur assignation (pas de doublon)
