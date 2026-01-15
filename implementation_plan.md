# Plan d'Implémentation : Administration Avancée des Tournois

Ce plan détaille l'implémentation de deux fonctionnalités administratives critiques : la correction des résultats de match avec effet "domino" propre, et la suppression de participants.

## User Review Required

> [!IMPORTANT]
> **Règle de Gestion des Pronostics**
>
> 1.  **Match modifié directement (ex: M1)** : Les équipes ne changent pas, seul le score change.
>     *   -> **Les pronostics sur ce match sont CONSERVÉS.**
>
> 2.  **Matchs suivants impactés (ex: M2, Finale...)** : Si la modification de M1 change une équipe qualifiée pour M2 (par exemple Team A remplace Team B) :
>     *   -> **Les pronostics sur ce match M2 seront SUPPRIMÉS.**
>     *   *Raison* : Le contexte du match a changé (ce n'est plus la même opposition), donc les anciens pronostics n'ont plus de sens. Les participants devront pronostiquer à nouveau.

## Proposed Changes

### Backend (Supabase)

#### [NEW] RPC: `update_match_result_recursive`
Création d'une fonction stockée pour gérer la correction de résultat.
*   **Entrée** : `match_id`, `new_winner`, `new_score`.
*   **Logique Séquentielle** :
    1.  **Update Source** : Mettre à jour le résultat du match ciblé.
    2.  **Identifier Next** : Identifier les matchs suivants (`next_match_id` et `next_loser_match_id`) ainsi que le slot cible (team_a ou team_b déterminée par `advance_bracket_winner` ou logique custom).
    3.  **Vérification de Changement** : Comparer l'ancienne équipe dans le slot cible du match suivant avec la nouvelle équipe qualifiée.
    4.  **Si l'équipe change dans le match suivant** :
        *   Mettre à jour l'équipe (`team_a` ou `team_b`).
        *   **Reset Result** : Remettre le résultat (`result`) du match suivant à `NULL`.
        *   **Delete Predictions** : `DELETE FROM predictions WHERE match_id = next_match_id`.
        *   **Récursion** : Répéter l'opération pour les matchs qui suivaient ce match suivant (car son résultat vient d'être annulé, donc les équipes vont disparaître des matchs d'après).

#### [NEW] RPC: `remove_tournament_participant`
Fonction pour exclure un utilisateur.
*   **Entrée** : `tournament_id`, `user_id`.
*   **Logique** :
    1.  Supprimer les pronostics de cet utilisateur sur ce tournoi.
    2.  Supprimer l'entrée dans la table `participants`.

### Frontend

#### `src/services/matches.ts`
*   Ajout de la méthode `updateMatchResultRecursive` appelant la nouvelle RPC.

#### `src/services/tournaments.ts`
*   Ajout de la méthode `removeParticipant` appelant la nouvelle RPC.

#### `src/components/MatchResultModal.tsx`
*   **Modification** : Si un résultat existe déjà, changer le bouton "Enregistrer" en "Corriger le résultat".
*   **Alerte** : Ajouter un petit texte d'avertissement : *"Attention : modifier ce résultat annulera les pronostics des matchs suivants si les équipes qualifiées changent."*

#### `src/pages/TournamentDetailPage.tsx`
*   **Leaderboard** : Ajouter une colonne d'action pour l'admin avec un bouton "Exclure" (poubelle rouge).
*   **Confirmation** : "Voulez-vous vraiment exclure ce joueur ? Ses pronostics seront effacés."

## Verification Plan

### Manual Verification
1.  **Test Effet Domino & Pronostics** :
    *   Configurer: M1 (A vs B) -> Vainqueur va en M2.
    *   Action 1: Mettre R1 = A. M2 devient (A vs C).
    *   Action 2: User fait prono sur M2 (Vainqueur A).
    *   **Test**: Corriger R1 = B.
    *   **Résultat attendu**:
        *   M1 affiche vainqueur B.
        *   M2 devient (B vs C).
        *   Le résultat de M2 est reset (si y'en avait un).
        *   **Le prono sur M2 est supprimé** (car A ne joue plus).

2.  **Test Exclusion** :
    *   Prendre un utilisateur avec des points.
    *   Cliquer sur "Exclure".
    *   Vérifier qu'il disparaît du classement.
