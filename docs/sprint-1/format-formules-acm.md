# Format JSON des 26 Formules — Support Checkpoint ACM J1

> **Objectif du checkpoint (15 min synchrone)** : faire valider à ACM (a) le format JSON cible des 26 formules, (b) le schema des 5 tables BDD `pedagogy_*`, (c) le mapping niveau → ceinture (10 → 9 avec M4=M5).
>
> **Toute décision actée pendant le checkpoint** doit être notée dans `docs/decisions-acm-sprint-1.md` avec date + raison + impact. Si ACM corrige un champ, on ré-export ce doc à jour.
>
> **Source-of-truth pédagogique** : rule 02 (Méthode Tama) + brief Sprint 1 §J1.

---

## 1. Récap vocabulaire (validation à blanc)

| Famille               | Définition                                                              | Paires concernées  | Nombre de formules |
| --------------------- | ----------------------------------------------------------------------- | ------------------ | ------------------ |
| **Petits Amis de 5**  | Décompositions où la quinaire (5) sert d'intermédiaire (+5−x ou −5+x)   | P1 (1↔4), P2 (2↔3) | 8                  |
| **Grands Amis de 10** | Décompositions où la dizaine (10) sert d'intermédiaire (+10−x ou −10+x) | G1–G5              | 18                 |
| **Total**             |                                                                         | 7 paires           | **26**             |

⚠️ **Décision verrouillée rule 02** : il n'existe **PAS** de catégorie "Formules Doublées". Les enchaînements Grand Ami + Petit Ami (cf. Règle 4 du resolver J2) sont gérés à la volée par le moteur, pas par une formule pré-listée. À reconfirmer ACM.

---

## 2. Liste des 26 formules (à valider ligne par ligne)

### Petits Amis de 5 (8 formules)

| Paire | Amis  | Formule    | ID JSON proposé  | `applies_when_current_value_in` proposé |
| ----- | ----- | ---------- | ---------------- | --------------------------------------- |
| P1    | 1 ↔ 4 | +1 = +5 −4 | `P1-add-plus-1`  | `[4]`                                   |
| P1    | 1 ↔ 4 | +4 = +5 −1 | `P1-add-plus-4`  | `[1, 2, 3, 4]`                          |
| P1    | 1 ↔ 4 | −1 = −5 +4 | `P1-sub-minus-1` | `[5]`                                   |
| P1    | 1 ↔ 4 | −4 = −5 +1 | `P1-sub-minus-4` | `[5, 6, 7, 8]`                          |
| P2    | 2 ↔ 3 | +2 = +5 −3 | `P2-add-plus-2`  | `[3, 4]`                                |
| P2    | 2 ↔ 3 | +3 = +5 −2 | `P2-add-plus-3`  | `[2, 3, 4]`                             |
| P2    | 2 ↔ 3 | −2 = −5 +3 | `P2-sub-minus-2` | `[5, 6]`                                |
| P2    | 2 ↔ 3 | −3 = −5 +2 | `P2-sub-minus-3` | `[5, 6, 7]`                             |

### Grands Amis de 10 (18 formules)

| Paire               | Amis      | Formule         | ID JSON proposé      | `applies_when_current_value_in`   |
| ------------------- | --------- | --------------- | -------------------- | --------------------------------- |
| G1                  | 1 ↔ 9     | +1 = +10 −9     | `G1-add-plus-1`      | `[9]`                             |
| G1                  | 1 ↔ 9     | +9 = +10 −1     | `G1-add-plus-9`      | `[1, 2, 3, 4, 5, 6, 7, 8, 9]`     |
| G1                  | 1 ↔ 9     | −1 = −10 +9     | `G1-sub-minus-1`     | `[0]` _(multi-colonnes)_          |
| G1                  | 1 ↔ 9     | −9 = −10 +1     | `G1-sub-minus-9`     | `[0, 1, 2, 3, 4, 5, 6, 7, 8]`     |
| G2                  | 2 ↔ 8     | +2 = +10 −8     | `G2-add-plus-2`      | `[8, 9]`                          |
| G2                  | 2 ↔ 8     | +8 = +10 −2     | `G2-add-plus-8`      | `[2, 3, 4, 5, 6, 7, 8, 9]`        |
| G2                  | 2 ↔ 8     | −2 = −10 +8     | `G2-sub-minus-2`     | `[0, 1]` _(multi-colonnes)_       |
| G2                  | 2 ↔ 8     | −8 = −10 +2     | `G2-sub-minus-8`     | `[0, 1, 2, 3, 4, 5, 6, 7]`        |
| G3                  | 3 ↔ 7     | +3 = +10 −7     | `G3-add-plus-3`      | `[7, 8, 9]`                       |
| G3                  | 3 ↔ 7     | +7 = +10 −3     | `G3-add-plus-7`      | `[3, 4, 5, 6, 7, 8, 9]`           |
| G3                  | 3 ↔ 7     | −3 = −10 +7     | `G3-sub-minus-3`     | `[0, 1, 2]` _(multi-colonnes)_    |
| G3                  | 3 ↔ 7     | −7 = −10 +3     | `G3-sub-minus-7`     | `[0, 1, 2, 3, 4, 5, 6]`           |
| G4                  | 4 ↔ 6     | +4 = +10 −6     | `G4-add-plus-4`      | `[6, 7, 8, 9]`                    |
| G4                  | 4 ↔ 6     | +6 = +10 −4     | `G4-add-plus-6`      | `[4, 5, 6, 7, 8, 9]`              |
| G4                  | 4 ↔ 6     | −4 = −10 +6     | `G4-sub-minus-4`     | `[0, 1, 2, 3]` _(multi-colonnes)_ |
| G4                  | 4 ↔ 6     | −6 = −10 +4     | `G4-sub-minus-6`     | `[0, 1, 2, 3, 4, 5]`              |
| **G5 (cas miroir)** | **5 ↔ 5** | **+5 = +10 −5** | **`G5-add-plus-5`**  | **`[5, 6, 7, 8, 9]`**             |
| **G5 (cas miroir)** | **5 ↔ 5** | **−5 = −10 +5** | **`G5-sub-minus-5`** | **`[0, 1, 2, 3, 4]`**             |

**Total : 8 + 18 = 26 ✓**

### §2bis — Sémantique de `applies_when_current_value_in` (décision Claude, audit Cursor 2026-05-22)

> **`applies_when_current_value_in` = plage complète des `currentValue` où la formule est le POINT D'ENTRÉE de la résolution, sans exclusion.**

Conséquences :

1. **Le caractère "chained" (Règle 4 ACM) n'est PAS une propriété de la formule.** C'est le couple `(formule, currentValue)` qui détermine si un enchaînement Petit Ami est nécessaire pour la sous-étape (ex. `+9` sur `5` = `+10` puis `-1` qui nécessite un sous-`-5+4` Petit Ami P1).
2. **Le resolver J2 calcule mécaniquement** si la sous-étape déclenche la Règle 4, à partir de l'état du soroban (quinaire active ? unaires libres ?). Le seed BDD reste donc minimaliste : 26 formules, pas 26+N variantes chaînées.
3. **Une formule n'est jamais "non applicable"** sur une valeur courante de sa plage : elle est soit applicable directement (Règle 3 simple), soit applicable via enchaînement (Règle 4 chained). Les deux relèvent du même `applies_when` côté BDD.
4. **Point à valider ACM en live** : pédagogiquement, l'enfant doit-il voir explicitement la distinction "simple vs enchaîné" dans la voix Tama (copy `narrative_*`) ? Si oui, c'est un travail Phase 4 (UI/copy), pas un attribut BDD.

Cette sémantique simplifie le J2 resolver (lookup `applies_when` puis calcul mécanique chained à la volée) et préserve la flexibilité de copy adapté par registre.

⚠️ **Valeurs `applies_when_current_value_in` ci-dessus** : calculées par Cursor selon les 4 règles ACM (Direct → Petit Ami → Grand Ami → Chained, ordre strict rule 02). À reconfirmer ACM en live sur 3-4 cas représentatifs (P1-add-plus-1, G3-add-plus-7, G5-add-plus-5).

**Note multi-colonnes** : les lignes marquées _(multi-colonnes)_ ne s'appliquent qu'à partir du niveau NV2 (Ceinture Verte, dizaines disponibles). En single-column (NP1/NP2), ces formules ne sont jamais déclenchées (l'opération est invalide : résultat négatif).

---

## 3. Format JSON cible (contrat de données)

```json
{
  "version": "1.0",
  "method": "Méthode Tama",
  "validated_by_acm_at": "2026-05-XX",
  "formulas": [
    {
      "id": "P1-add-plus-1",
      "family": "petit_ami",
      "pair_code": "P1",
      "amis": [1, 4],
      "operation": "addition",
      "operand": 1,
      "complement": 4,
      "formula_short": "+1 = +5 -4",
      "narrative_kids": "...",
      "narrative_academy": "...",
      "applies_when_current_value_in": [4],
      "order": 1
    }
  ]
}
```

### Conventions de nommage des champs (BDD ↔ JSON)

| Champ JSON                      | Colonne BDD                         | Type BDD         | Notes                                                                    |
| ------------------------------- | ----------------------------------- | ---------------- | ------------------------------------------------------------------------ |
| `id`                            | `id`                                | `VARCHAR(40)`    | Pattern `<pair>-<add\|sub>-<plus\|minus>-<n>`                            |
| `family`                        | _déduit de `pair_code` via JOIN_    | —                | `'petit_ami' \| 'grand_ami'`                                             |
| `pair_code`                     | `pair_code`                         | `VARCHAR(2)`     | FK → `pedagogy_pairs(code)`                                              |
| `amis`                          | _stocké dans `pedagogy_pairs.amis`_ | —                | `INTEGER[]` (ex. `[1, 4]`, ou `[5, 5]` pour G5)                          |
| `operation`                     | `operation`                         | `VARCHAR(20)`    | `'addition' \| 'soustraction'`                                           |
| `operand`                       | `operand`                           | `INTEGER`        | 1–9                                                                      |
| `complement`                    | `complement`                        | `INTEGER`        | 1–9                                                                      |
| `formula_short`                 | `formula_short`                     | `TEXT`           | Forme humaine "+1 = +5 -4"                                               |
| `narrative_kids`                | `narrative_kids`                    | `TEXT`           | Voix Tama registre Kids (5-7 ans)                                        |
| `narrative_academy`             | `narrative_academy`                 | `TEXT`           | Voix Tama registre Academy (8+)                                          |
| `applies_when_current_value_in` | `applies_when_current_value_in`     | `INTEGER[]`      | Plage des `currentValue` où la formule est le point d'entrée (cf. §2bis) |
| `order`                         | `display_order`                     | `INTEGER UNIQUE` | Ordre pédagogique d'introduction (1–26)                                  |

---

## 4. Trois exemples annotés (les plus représentatifs)

### 4.1 Exemple Petit Ami typique — P1-add-plus-1

```json
{
  "id": "P1-add-plus-1",
  "family": "petit_ami",
  "pair_code": "P1",
  "amis": [1, 4],
  "operation": "addition",
  "operand": 1,
  "complement": 4,
  "formula_short": "+1 = +5 -4",
  "narrative_kids": "Pour ajouter 1 quand y'a plus de place, on appelle son ami 4 : on monte la perle du haut (+5) et on rend 4 perles du bas (-4). 1 et 4, copains de 5 !",
  "narrative_academy": "+1 décomposé en +5 -4 via le Petit Ami P1 (paire 1↔4). Cas type : valeur courante = 4, les 4 unaires sont actives, la quinaire est libre.",
  "applies_when_current_value_in": [4],
  "order": 1
}
```

**Pourquoi `applies_when_current_value_in: [4]`** : c'est la seule valeur 0-9 où `+1 direct` est impossible (4 unaires actives, 0 libre) ET où le Petit Ami fonctionne (quinaire libre). Sur valeur 9, on a besoin d'un Grand Ami.

### 4.2 Exemple Grand Ami typique — G3-add-plus-3

```json
{
  "id": "G3-add-plus-3",
  "family": "grand_ami",
  "pair_code": "G3",
  "amis": [3, 7],
  "operation": "addition",
  "operand": 3,
  "complement": 7,
  "formula_short": "+3 = +10 -7",
  "narrative_kids": "Pour ajouter 3 quand y'a plus la place du tout, on prend 10 dans la colonne d'à côté et on rend 7. 3 et 7, copains de 10 !",
  "narrative_academy": "+3 décomposé en +10 -7 via le Grand Ami G3 (paire 3↔7). Cas type : valeur courante ∈ [7, 8, 9], aucun unaire libre côté +3 → passage à la dizaine.",
  "applies_when_current_value_in": [7, 8, 9],
  "order": 17
}
```

**Pourquoi `[7, 8, 9]`** : sur ces valeurs, +3 direct est impossible (résultat ≥ 10), ET désactiver 7 (= -5 quinaire + -2 unaires) est possible sans blocage (quinaire active sur ces 3 valeurs, ≥ 2 unaires actives).

### 4.3 Exemple Grand Ami cas miroir — G5-add-plus-5

```json
{
  "id": "G5-add-plus-5",
  "family": "grand_ami",
  "pair_code": "G5",
  "amis": [5, 5],
  "operation": "addition",
  "operand": 5,
  "complement": 5,
  "formula_short": "+5 = +10 -5",
  "narrative_kids": "Pour ajouter 5 quand la quinaire est déjà prise, on emprunte 10 à la colonne d'à côté et on rend 5 (la perle du haut). 5 et 5, jumeaux de 10 !",
  "narrative_academy": "+5 décomposé en +10 -5 via le Grand Ami G5 (paire 5↔5, cas miroir). La pair G5 est la seule où amis[0] == amis[1], il n'y a qu'une seule formule par sens (+5 et -5).",
  "applies_when_current_value_in": [5, 6, 7, 8, 9],
  "order": 25
}
```

**Cas particulier G5** : la paire 5↔5 est miroir (les deux "amis" sont égaux). Conséquences :

- `amis: [5, 5]` (doublon assumé) — note pour Zod validation : il faut une règle spécifique qui accepte le doublon pour G5 uniquement.
- Pas de `G5-add-plus-X` distinct pour X≠5 : on a juste +5 et -5.
- Total G5 : 2 formules au lieu de 4 → c'est ce qui fait que la famille Grand Ami a 18 formules (4×4 + 2) et non pas 20 (5×4).

⚠️ **À valider ACM** : (a) confirmer pattern `amis: [5, 5]` en BDD ou bien `amis: [5]` simple ? (b) confirmer que pas de formule `G5-add-plus-10` ou similaire dans la famille Grand Ami.

---

## 5. Récap schema BDD `pedagogy_*` (5 tables)

### Vue d'ensemble FK

```
pedagogy_pairs (7 lignes) ──┬── pedagogy_formulas (26 lignes, FK pair_code)
                            └── pedagogy_sceaux (7 lignes, 1:1 via pair_code UNIQUE)

pedagogy_belts (9 lignes) ────── pedagogy_levels (10 lignes, FK belt_code)
```

### Détail colonnes

| Table               | Lignes | Clé primaire       | FK / Index notables                                        |
| ------------------- | ------ | ------------------ | ---------------------------------------------------------- |
| `pedagogy_pairs`    | 7      | `code VARCHAR(2)`  | `display_order UNIQUE`, `amis INTEGER[]`                   |
| `pedagogy_formulas` | 26     | `id VARCHAR(40)`   | `pair_code → pedagogy_pairs(code)`, `display_order UNIQUE` |
| `pedagogy_sceaux`   | 7      | `code VARCHAR(2)`  | `pair_code UNIQUE → pedagogy_pairs(code)` (1:1)            |
| `pedagogy_belts`    | 9      | `code VARCHAR(20)` | `display_order UNIQUE`, `color_hex VARCHAR(7)`             |
| `pedagogy_levels`   | 10     | `code VARCHAR(10)` | `belt_code → pedagogy_belts(code)`, `display_order UNIQUE` |

### RLS (politique unique : catalogue read-only)

Les 5 tables `pedagogy_*` sont du **contenu pédagogique propriétaire immuable** côté front. Donc :

- `authenticated` : SELECT seul, pas d'INSERT/UPDATE/DELETE.
- `service_role` : ALL (pour le script seed J3 + back-office futur).
- `anon` : `REVOKE ALL` table-level (defense in depth, alignement pattern 0003).
- Wrap `(SELECT auth.jwt())` systématique (alignement 0004, anti-régression `auth_rls_initplan`).

→ 10 policies au total (5 tables × 2 rôles).

---

## 6. Mapping niveau → ceinture (10 → 9 avec M4=M5)

| Code niveau (`pedagogy_levels.code`) | Display name           | Code ceinture (`pedagogy_belts.code`) | Display ceinture           | Color hex     |
| ------------------------------------ | ---------------------- | ------------------------------------- | -------------------------- | ------------- |
| `NP1`                                | Niveau Petit 1         | `blanche`                             | Ceinture Blanche           | `#F8FAFC`     |
| `NP2`                                | Niveau Petit 2         | `jaune`                               | Ceinture Jaune             | `#FCD34D`     |
| `NV1`                                | Niveau Vert 1          | `orange`                              | Ceinture Orange            | `#FB923C`     |
| `NV2`                                | Niveau Vert 2          | `verte`                               | Ceinture Verte             | `#22C55E`     |
| `NV3`                                | Niveau Vert 3          | `bleue`                               | Ceinture Bleue             | `#3B82F6`     |
| `M1`                                 | Maître 1               | `violette`                            | Ceinture Violette          | `#A855F7`     |
| `M2`                                 | Maître 2               | `marron`                              | Ceinture Marron            | `#A16207`     |
| `M3`                                 | Maître 3               | `rouge`                               | Ceinture Rouge             | `#DC2626`     |
| **`M4`**                             | **Maître 4 — 1er Dan** | **`noire_1er_dan`**                   | **Ceinture Noire 1er Dan** | **`#0F172A`** |
| **`M5`**                             | **Maître 5 — Soroban** | **`noire_1er_dan`**                   | **Ceinture Noire 1er Dan** | **`#0F172A`** |

⚠️ **Écart explicite vs rule 02** : la rule 02 mentionne pour M5 "Ceinture Noire avec bande dorée (Maître Soroban)" comme 10ᵉ ceinture distincte. Le brief Sprint 1 (confirmé Claude) tranche en faveur de **9 belts en BDD** : M4 et M5 partagent `belt_code='noire_1er_dan'`. La distinction "bande dorée Maître Soroban" devient une **mention UI** au runtime (badge visuel basé sur le niveau M5, pas un belt code séparé).

**À valider ACM** :

- La distinction visuelle Maître Soroban (M5) se fait-elle via un asset SVG dédié, un overlay dynamique, ou une 10ᵉ entrée dans `pedagogy_belts` (revert décision Claude) ?
- Le `display_name` du niveau M5 (`'Maître 5 — Soroban'`) est-il le bon wording ? Anciennement (rule 02) : `'Maître Soroban'`.

---

## 7. Points ouverts à valider en checkpoint

| #   | Point                                                                                      | Décision Cursor proposée                                                                                                                                          | Réponse ACM |
| --- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Valeurs `applies_when_current_value_in` pour les 26 formules                               | Voir tableau §2 (plage complète point d'entrée — cf. §2bis). Reconfirmer ACM sur P1-add-plus-1, G3-add-plus-7, G5-add-plus-5 (échantillon représentatif).         | _(à acter)_ |
| 2   | Pattern ID JSON `<pair>-<add\|sub>-<plus\|minus>-<n>`                                      | `P1-add-plus-1`, `G3-add-plus-3`, `G5-add-plus-5`                                                                                                                 | _(à acter)_ |
| 3   | `amis: [5, 5]` pour G5 ou `amis: [5]` unique ?                                             | `[5, 5]` (cohérence avec autres paires en 2 éléments)                                                                                                             | _(à acter)_ |
| 4   | Existence d'une famille "Formules Doublées" en BDD ?                                       | **Non**, géré par resolver J2 (Règle 4 chained). Confirmé rule 02.                                                                                                | _(à acter)_ |
| 5   | M5 = `noire_1er_dan` partagé OU 10ᵉ belt `noire_maitre_soroban` ?                          | Partagé (brief Sprint 1)                                                                                                                                          | _(à acter)_ |
| 6   | `display_order` des 26 formules (1-26)                                                     | Petits Amis P1-P2 par sens (1-8), puis Grands Amis G1-G5 (9-26)                                                                                                   | _(à acter)_ |
| 7   | `unlock_threshold` Sceaux : 30 exos par défaut ?                                           | Oui (cohérent brief)                                                                                                                                              | _(à acter)_ |
| 8   | `narrative_kids` / `narrative_academy` : qui écrit ?                                       | ACM J3 lors de la saisie des 26 formules (3h synchrone)                                                                                                           | _(à acter)_ |
| 9   | **Sémantique `applies_when_current_value_in` (priorité haute)**                            | Les 26 formules sont des **points d'entrée**. L'enchaînement Petit Ami (Règle 4 ACM) est calculé mécaniquement par le resolver J2, pas encodé en seed. Cf. §2bis. | _(à acter)_ |
| 10  | Si ACM veut une distinction explicite "simple vs enchaîné" côté UI (voix Tama), c'est où ? | **Pas en BDD.** Travail Phase 4 (copy `narrative_*` ou flag UI calculé à la volée par le resolver). Aucun impact sur le schema seed.                              | _(à acter)_ |

---

## 8. Décisions post-checkpoint à acter

À l'issue du checkpoint (~15 min), je crée/mets à jour `docs/decisions-acm-sprint-1.md` avec :

```markdown
## Décision ACM-1 (2026-05-20) — Format JSON 26 formules

- Statut : VALIDÉ / VALIDÉ AVEC AJUSTEMENTS / REJETÉ
- Ajustements demandés ACM : <liste>
- Impact : <fichiers / migrations / tests touchés>
- Référence : docs/sprint-1/format-formules-acm.md §<X>
```

Idem pour le mapping niveau→ceinture et le schema des 5 tables.
