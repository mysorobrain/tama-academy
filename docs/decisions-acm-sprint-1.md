# Décisions ACM — Sprint 1

Ce fichier est le **registre auditable** des décisions pédagogiques prises avec Anne-Charlotte (ACM) pendant Sprint 1.

Toute décision est notée avec : statut, date, ajustements demandés (le cas échéant), impact (fichiers / migrations / tests touchés), référence support.

Si ACM revient ultérieurement sur une décision actée, **on n'écrase pas** : on ajoute une nouvelle entrée `ACM-X.bis` (rectification) avec la nouvelle date et la raison du changement. L'historique pédagogique reste traçable.

---

## Décision ACM-1 — Format JSON des 26 formules + schema BDD `pedagogy_*` + mapping niveau→ceinture

- **Statut** : ✅ **VALIDÉ sans correction**
- **Date** : 2026-05-22
- **Support du checkpoint** : `docs/sprint-1/format-formules-acm.md` (commit `5ec5a23`)
- **Format** : 15 min synchrone (Samir × ACM), revue ligne par ligne du tableau §2 + format JSON §3 + récap schema §5 + mapping §6 + tableau points ouverts §7.
- **Ajustements demandés ACM** : **aucun**. Les 10 points du tableau §7 sont actés tels que proposés par Cursor (audit pré-checkpoint pour validation rule 02 + sémantique Option B).

### Détail des 10 points actés

| #   | Point                                                        | Décision actée                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Valeurs `applies_when_current_value_in` pour les 26 formules | **Validé tel que tableau §2**. Audit Cursor vs 4 règles ACM confirmé (Direct → Petit Ami → Grand Ami → Chained).                                                                                                                                                                                               |
| 2   | Pattern ID JSON `<pair>-<add\|sub>-<plus\|minus>-<n>`        | **Validé**. `P1-add-plus-1`, `G3-add-plus-3`, `G5-add-plus-5`.                                                                                                                                                                                                                                                 |
| 3   | `amis: [5, 5]` pour G5 (cas miroir)                          | **Validé**. Cohérence avec autres paires `INTEGER[]` à 2 éléments — Zod validation autorise le doublon uniquement pour G5.                                                                                                                                                                                     |
| 4   | Existence d'une famille "Formules Doublées" en BDD           | **NON**. Confirmé : les enchaînements Grand Ami + Petit Ami sont calculés par le resolver J2 (Règle 4 ACM), pas pré-listés en BDD. Décision verrouillée rule 02.                                                                                                                                               |
| 5   | M5 = `noire_1er_dan` partagé OU 10ᵉ belt distinct            | **Partagé**. M4 et M5 référencent tous deux `belt_code='noire_1er_dan'`. La distinction "Maître Soroban" devient une mention UI runtime (badge basé sur le `level_code='M5'`), pas un belt code BDD séparé.                                                                                                    |
| 6   | `display_order` des 26 formules (1–26)                       | **Validé**. Petits Amis P1-P2 par sens (1–8), puis Grands Amis G1-G5 (9–26).                                                                                                                                                                                                                                   |
| 7   | `unlock_threshold` des Sceaux : 30 exos par défaut           | **Validé**. Cohérent avec le brief Sprint 1. Ajustable par Sceau si ACM identifie un cas spécifique en Phase 4 (copy + ergonomie).                                                                                                                                                                             |
| 8   | `narrative_kids` / `narrative_academy` : qui écrit ?         | **ACM J3** lors de la session synchrone (3h) de saisie des 26 formules. Cursor prépare les emplacements vides, ACM remplit.                                                                                                                                                                                    |
| 9   | **Sémantique `applies_when_current_value_in`**               | **Validé Option B (LARGE)**. Les 26 formules sont des **points d'entrée**. L'enchaînement Petit Ami (Règle 4 ACM) est calculé mécaniquement par le resolver J2 à partir du couple `(formule, currentValue)` et de l'état du soroban. Le seed BDD reste minimaliste : 26 formules, pas N+26 variantes chaînées. |
| 10  | Distinction "simple vs enchaîné" côté UI (voix Tama)         | **NON encodé en BDD**. Si ACM juge pédagogiquement utile d'exposer le caractère "enchaîné" dans la voix Tama (copy `narrative_*`), c'est un travail **Phase 4** (copy ou flag UI calculé à la volée par le resolver J2). Aucun impact sur le schema seed.                                                      |

### Impact — fichiers / migrations / tests touchés (Phase C J1)

- **Migrations BDD**
  - `src/lib/db/migrations/0005_pedagogy_core.sql` : 5 tables `pedagogy_*` + RLS read-only authenticated + service_role all + REVOKE anon + wrap `(SELECT auth.jwt())` + indexes FK.
  - `src/lib/db/migrations/0006_rename_children_belt_to_level.sql` : `ALTER TABLE children RENAME COLUMN belt_code TO level_code` + FK vers `pedagogy_levels(code)` + index `idx_children_level_code`. Justifié par la sémantique : la colonne contenait des codes de niveaux (NP1…M5), pas des codes de ceintures.
- **Schemas Drizzle** : 5 fichiers modulaires `src/lib/db/schema/pedagogy-*.ts` + re-export dans `index.ts`.
- **Types TypeScript** : rename `BeltCode → LevelCode` dans `schema/students.ts`. Création d'un type `BeltCode` propre (9 valeurs) dans `pedagogy-belts.ts`.
- **Helper pédagogique** : `src/lib/pedagogy/level-belt-mapper.ts` exposant `formatLevelAsBelt(code: LevelCode): BeltCode` avec M4 et M5 mappés tous deux sur `noire_1er_dan`.
- **Tests Vitest** : `tests/unit/lib/pedagogy/level-belt-mapper.test.ts` (10 niveaux mappés + cas M4/M5 explicite + code inconnu).

### Référence support visuel

`docs/sprint-1/format-formules-acm.md` est conservé en l'état comme **archive du checkpoint**. Aucune modification post-validation : tout amendement futur passe par une nouvelle décision `ACM-X.bis` dans ce registre.

### Ce qui reste à valider plus tard avec ACM (hors scope J1)

- Décision ACM-2 (J3) : revue des `narrative_kids` / `narrative_academy` rédigés par ACM pour les 26 formules.
- Décision ACM-3 (J4-J5) : revue des Sceaux narratifs (description, déblocage, asset visuel).
- Décision ACM-X (Phase 4 future) : si flag UI `isChained` doit être exposé à l'enfant via la voix Tama (cf. point #10).

---

_Ce fichier est append-only. Nouvelle décision = nouvelle section `## Décision ACM-N`._
