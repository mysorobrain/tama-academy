# Brief Sprint 1 — Tama Academy

> **Source-of-truth versionnée** du brief Sprint 1, sauvegardée en début de Phase A J1 le 2026-05-20.
> Toute déviation par rapport à ce brief doit être tracée dans `docs/decisions-acm-sprint-1.md` avec date + raison + impact.
> Référence : ce brief a été produit par Claude le 2026-05-20 après le wrap-up Sprint 0.

## Objectif Sprint 1

Poser les fondations pédagogiques (BDD, contenu, moteur de calcul) + l'auth UI parent + l'onboarding + MBTI maximal + dashboard 7 Sceaux. À la fin du Sprint 1, un parent peut s'inscrire, faire son onboarding MBTI, créer son premier enfant, et voir le dashboard avec les 7 Sceaux verrouillés.

**Durée prévue** : 7 à 10 jours. Pas de deadline arbitraire. Sprint clos quand tous les critères d'acceptation sont validés ACM + tests verts + reviewé par Claude.

**Branches** : 1 PR par jour, chacune mergée avant J+1. Discipline branche courte non négociable.

---

## Décisions de design verrouillées (mode senior)

### Nommage BDD vs TypeScript

**Tables BDD** : préfixe `pedagogy_*` (neutre). Permet de renommer la méthode commerciale sans migration. Tables Sprint 1 :

- `pedagogy_formulas` (26 lignes)
- `pedagogy_pairs` (7 lignes, P1/P2/G1-G5)
- `pedagogy_sceaux` (7 lignes, 1:1 avec pairs)
- `pedagogy_belts` (9 lignes, Blanche → Noire) — M4 et M5 partagent `belt_code='noire_1er_dan'`
- `pedagogy_levels` (10 lignes, NP1 → M5) — **correction Claude 2026-05-20 : 10 lignes, pas 9**
- `mbti_profiles` (extension de la table `users`, pas une table dédiée)

**TypeScript user-facing** : `MethodeTama` pour les types/classes/namespaces exposés au front. Exemple : `MethodeTama.Formula`, `MethodeTama.Sceau`, `methodeTama.resolveFormula(...)`.

**Constantes user-facing** : `METHODE_TAMA` (UPPER_SNAKE) pour les enums et constantes systèmes. Exemple : `METHODE_TAMA.PAIR_CODES = ['P1', 'P2', 'G1', 'G2', 'G3', 'G4', 'G5']`.

### Codes Sceaux/Pairs

Stockés en BDD comme `varchar(2)` (P1/P2/G1-G5). Validation runtime via Zod enum strict :

```typescript
const PairCode = z.enum(["P1", "P2", "G1", "G2", "G3", "G4", "G5"]);
type PairCode = z.infer<typeof PairCode>;
```

Pas d'enum Postgres natif (rigide à modifier, contraignant pour les migrations).

### MBTI maximal — scope ferme

4 profils : `Gardien | Ideal | Stratege | Donneur` (sans accents en code, avec accents en copy user-facing). Stockés dans `users.mbti_profile` (nullable jusqu'à complétion du quiz).

**Périmètre MBTI Sprint 1** :

- Quiz 4 questions sur l'onboarding (1 question = 4 réponses → 1 profil)
- Profil stocké en BDD + timestamp `mbti_completed_at`
- Helper `getMBTICopy(profile: MBTIProfile, context: CopyContext): string` qui retourne le bon copy par profil/contexte
- 4 templates Resend complets (welcome email × 4 variantes)
- Variantes dashboard parent (4 versions du message d'accueil + 4 versions du CTA principal)

**Hors scope Sprint 1** (différé à Sprint marketing dédié post-beta) : landing pages adaptatives, copy marketing externe, A/B testing MBTI, segmentation campagnes ads.

---

## Préalable J0 — Création vault + format JSON cible

Avant tout : créer le repo annexe `tama-academy-pedagogy-vault` (private, voir décisions hier soir).

```bash
gh repo create mysorobrain/tama-academy-pedagogy-vault \
  --private \
  --description "Tama Academy — Contenu pédagogique propriétaire (Méthode Tama)" \
  --clone
```

**Structure dossiers** :

```
tama-academy-pedagogy-vault/
├── README.md
├── COPYRIGHT.md           # © 2026 Tama Academy / Samir Lkhadre
├── seeds/
│   ├── formulas.json      # 26 formules (saisi avec ACM J3)
│   ├── pairs.json         # 7 paires
│   └── sceaux.json        # 7 Sceaux
├── manuels/               # PDFs ACM (vide pour Sprint 1, à remplir post-beta)
└── scripts/               # Pipelines d'extraction futurs
```

**Format JSON formules — contrat de données** (à valider ACM J1 matin avant tout) :

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
      "narrative_kids": "Pour ajouter 1, on appelle l'ami 4. Hop, 1 et 4 sont copains de 5 !",
      "narrative_academy": "+1 décomposé en +5 -4 via le Petit Ami P1 (paire 1↔4)",
      "applies_when_current_value_in": [4],
      "order": 1
    }
  ]
}
```

**Champs critiques expliqués** :

- `applies_when_current_value_in` : array des valeurs courantes (0-9) pour lesquelles cette formule est la solution. Utilisé par le resolver pour matcher input → formule.
- `narrative_kids` / `narrative_academy` : copy adapté par registre, utilisé dans les screens Phase 4 Pas-à-Pas.
- `order` : ordre pédagogique d'introduction (1 à 26, défini par ACM).

**26 formules attendues** :

- 8 Petits Amis : P1 (1↔4) × {+1, +4, −1, −4} + P2 (2↔3) × {+2, +3, −2, −3}
- 18 Grands Amis : G1-G4 × {+, −} × 2 sens chacune (16) + G5 (5↔5) × {+5, −5} (2) = 18
- Total **8 + 18 = 26** ✓

---

## J1 — Schema Drizzle pedagogy + types TS

**PR** : `feat(db/pedagogy): schema formulas/pairs/sceaux/belts/levels + migration 0005`

### Étape 1.1 — Migration 0005

**Fichier** : `src/lib/db/migrations/0005_pedagogy_core.sql`

**Tables à créer** :

```sql
CREATE TABLE public.pedagogy_pairs (
  code VARCHAR(2) PRIMARY KEY,             -- 'P1' | 'P2' | 'G1' | ... | 'G5'
  family VARCHAR(20) NOT NULL,             -- 'petit_ami' | 'grand_ami'
  amis INTEGER[] NOT NULL,                 -- [1, 4]
  display_order INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pedagogy_formulas (
  id VARCHAR(40) PRIMARY KEY,              -- 'P1-add-plus-1'
  pair_code VARCHAR(2) NOT NULL REFERENCES public.pedagogy_pairs(code),
  operation VARCHAR(20) NOT NULL,          -- 'addition' | 'soustraction'
  operand INTEGER NOT NULL,                -- 1-9
  complement INTEGER NOT NULL,             -- 1-9
  formula_short TEXT NOT NULL,             -- '+1 = +5 -4'
  narrative_kids TEXT NOT NULL,
  narrative_academy TEXT NOT NULL,
  applies_when_current_value_in INTEGER[] NOT NULL,
  display_order INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pedagogy_sceaux (
  code VARCHAR(2) PRIMARY KEY,             -- 'P1' | ... (1:1 avec pairs)
  pair_code VARCHAR(2) NOT NULL UNIQUE REFERENCES public.pedagogy_pairs(code),
  name_fr TEXT NOT NULL,                   -- 'Sceau de la Paire 1↔4'
  glyph_svg_url TEXT,                      -- URL CDN, NULL en Sprint 1
  unlock_threshold INTEGER DEFAULT 30,     -- Nombre exos pour débloquer
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pedagogy_belts (
  code VARCHAR(20) PRIMARY KEY,            -- 'blanche' | 'jaune' | ... | 'noire_1er_dan'
  display_name TEXT NOT NULL,
  color_hex VARCHAR(7) NOT NULL,           -- '#F8FAFC'
  display_order INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.pedagogy_levels (
  code VARCHAR(10) PRIMARY KEY,            -- 'NP1' | 'NP2' | ... | 'M5'
  display_name TEXT NOT NULL,
  belt_code VARCHAR(20) NOT NULL REFERENCES public.pedagogy_belts(code),
  display_order INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS** :

- 4 tables `pedagogy_*` : **read-only authenticated + full service_role**. Pas d'INSERT/UPDATE/DELETE depuis `authenticated` (le contenu pédagogique est immuable côté front).
- Pattern identique 0003 avec wrap `(SELECT auth.jwt())`.

**Index** :

- `idx_pedagogy_formulas_pair_code` sur `pedagogy_formulas(pair_code)`
- `idx_pedagogy_formulas_display_order` sur `pedagogy_formulas(display_order)`

### Étape 1.2 — Schema Drizzle TS

**Fichiers à créer dans `src/lib/db/schema/`** :

- `pedagogy-pairs.ts`
- `pedagogy-formulas.ts`
- `pedagogy-sceaux.ts`
- `pedagogy-belts.ts`
- `pedagogy-levels.ts`

Re-export propre dans `src/lib/db/schema/index.ts`. Aucun monolithe.

### Étape 1.3 — Helper formatLevelAsBelt

**Fichier** : `src/lib/pedagogy/level-belt-mapper.ts`

```typescript
export function formatLevelAsBelt(levelCode: string): BeltCode {
  // NP1 → 'blanche', NP2 → 'jaune', NV1 → 'orange', NV2 → 'verte',
  // NV3 → 'bleue', M1 → 'violette', M2 → 'marron', M3 → 'rouge',
  // M4/M5 → 'noire_1er_dan'
}
```

Tests Vitest exhaustifs : **10 niveaux** mappés correctement + cas d'erreur (code inconnu). M4 et M5 doivent tous deux retourner `'noire_1er_dan'` — cas couvert explicitement par 2 tests distincts.

### Checkpoint ACM J1 (15 min synchrone)

Tu présentes à ACM en live :

- Le format JSON cible (un exemple complet, et un exemple G5 pour le cas spécial)
- Le schema des 5 tables `pedagogy_*`
- Le mapping niveau → ceinture
- La structure des 26 formules (8 Petits Amis + 18 Grands Amis)

Tu actes en live tout ajustement. Note tout dans `docs/decisions-acm-sprint-1.md` avec date + raison + impact.

### Critères d'acceptation J1

- Migration 0005 appliquée via `pnpm db:migrate` (pas via MCP, discipline post-Sprint 0 / PI-001)
- 5 tables `pedagogy_*` créées avec RLS user-aware + service_role
- Schema Drizzle modulaire (5 fichiers, 0 monolithe)
- Helper `formatLevelAsBelt` + tests Vitest verts
- ACM valide format JSON + schema en live
- PR mergée sur `main`

---

## J2 — Formula-resolver (cœur métier)

_(scope J2, voir brief complet — détaillé après merge J1)_

**PR** : `feat(pedagogy/resolver): formula-resolver avec 4 règles ACM + 30+ tests`

Signature TypeScript principale :

```typescript
export function resolveFormula(input: ResolveInput): ResolvePath;
```

Algorithme des 4 règles ACM (Petit Ami → Grand Ami → Chained) implémenté dans `src/lib/pedagogy/formula-resolver.ts`. 30+ tests Vitest co-construits avec ACM en checkpoint synchrone 30 min.

---

## J3 à J7

J3 — Vault + saisie 26 formules + script import
J4 — Auth UI + onboarding parent
J5 — MBTI quiz + helper getMBTICopy
J6 — 4 templates Resend MBTI
J7 — 7 Sceaux UI + dashboard parent

_(détails dans le brief Claude complet, repris jour par jour quand on attaque chaque PR)_

---

## Checkpoints ACM précis (résumé)

| Jour          | Checkpoint                                 | Durée  | Livrable                                |
| ------------- | ------------------------------------------ | ------ | --------------------------------------- |
| J1 matin      | Format JSON formules + schema BDD          | 15 min | `docs/decisions-acm-sprint-1.md` updaté |
| J2 matin      | Construction 30+ cas-limites resolver      | 30 min | `docs/test-cases-resolver-acm.md`       |
| J3 après-midi | Saisie 26 formules + 7 paires + 7 sceaux   | 3h     | `seeds/*.json` dans vault tagués v1     |
| J5 matin      | Co-construction 4 questions MBTI           | 1h     | `MBTI_QUESTIONS` validé                 |
| J5 après-midi | Co-construction copy 4 profils × 4 ctxs    | 1h     | `MBTI_COPY` validé                      |
| J7 fin        | Validation rendu dashboard + Sceaux + copy | 30 min | Sign-off ACM                            |

**Total temps ACM Sprint 1** : ~6h synchrone, étalées sur 7 jours.

---

## Discipline non négociable (rappel)

- 1 PR par jour, mergée avant J+1
- `pnpm db:migrate` first, jamais MCP Supabase pour appliquer une migration (cf. PI-001)
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` doit passer avant chaque commit
- Tests E2E couvrent au moins le critère d'acceptation principal du jour

## Récap state final Sprint 1

Quand Sprint 1 est clos, on doit pouvoir démontrer en live :

1. Un parent signup avec un email réel
2. Il fait le quiz MBTI 4 questions → profil détecté
3. Il crée son enfant (prénom + date de naissance)
4. Il reçoit un email welcome adapté à son profil MBTI
5. Il accède au dashboard et voit :
   - Welcome message adapté MBTI
   - Ceinture Blanche, niveau NP1 ou NP2 selon âge enfant
   - Grille des 7 Sceaux tous verrouillés
   - CTA principal adapté MBTI
6. La BDD contient : 1 user avec profil MBTI, 1 child avec register, 1 parental_consent vide pour l'instant (Sprint 2), 26 formules + 7 paires + 7 sceaux + 9 ceintures + 10 niveaux seedés
