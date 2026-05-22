-- ============================================================================
-- 0006_rename_children_belt_to_level.sql — Tama Academy Sprint 1 J1 (PR #5)
--
-- Corrige une dette sémantique introduite en Sprint 0 : la colonne
-- `children.belt_code` contient en réalité des CODES DE NIVEAUX (NP1, NP2,
-- NV1…M5 — 10 valeurs distinctes), pas des codes de ceintures (qui sont
-- maintenant 9 valeurs distinctes dans `pedagogy_belts`, M4 et M5 partageant
-- `noire_1er_dan` — cf. ACM-1 point #5).
--
-- Cette migration :
--   1. Renomme la colonne `belt_code → level_code` (ALTER ... RENAME COLUMN,
--      pas DROP+CREATE — préserve la default value, les constraints et les
--      données éventuelles).
--   2. Ajoute une FK `level_code → pedagogy_levels(code) ON DELETE RESTRICT`
--      pour garantir l'intégrité référentielle au seed J3 et empêcher la
--      suppression accidentelle d'un niveau qui aurait des enfants associés.
--   3. Ajoute l'index `children_level_code_idx` couvrant la FK (lint 0001
--      `unindexed_foreign_keys`, cf. 0004 §5).
--
-- ----------------------------------------------------------------------------
-- Impact TypeScript
-- ----------------------------------------------------------------------------
-- Le type `BeltCode` historique (10 valeurs NP1…M5) défini dans
-- `src/lib/db/schema/students.ts` est renommé en `LevelCode` et déplacé dans
-- `src/lib/db/schema/pedagogy-levels.ts`. Un nouveau type `BeltCode` propre
-- (9 valeurs : blanche, jaune, …, noire_1er_dan) vit dans
-- `pedagogy-belts.ts`. La transformation N→B se fait via le helper
-- `formatLevelAsBelt(LevelCode): BeltCode` (`src/lib/pedagogy/level-belt-mapper.ts`),
-- avec mapping M4 = M5 = 'noire_1er_dan'.
--
-- ----------------------------------------------------------------------------
-- Pourquoi RENAME plutôt que DROP+CREATE
-- ----------------------------------------------------------------------------
-- (a) Préserve la valeur par défaut 'NP1' et la contrainte NOT NULL sans
--     avoir à les redéclarer (équivalent fonctionnel mais plus lisible).
-- (b) Si des données existaient (zéro en prod Sprint 0, mais on raisonne
--     défensif), un DROP les perdrait silencieusement. Le RENAME préserve.
-- (c) Drizzle-kit en mode non-interactif proposait DROP+CREATE par défaut
--     (cf. tentative pnpm db:generate du 2026-05-22). On écrit le SQL à la
--     main et on régénère le snapshot a posteriori (cf. méthode commit).
--
-- ----------------------------------------------------------------------------
-- Prérequis : 0005 appliquée (pedagogy_levels existe pour la FK).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Rename column belt_code → level_code
-- ----------------------------------------------------------------------------
ALTER TABLE "children" RENAME COLUMN "belt_code" TO "level_code";
--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 2. FK level_code → pedagogy_levels(code)
-- ----------------------------------------------------------------------------
-- ON DELETE RESTRICT : on ne peut pas supprimer un niveau s'il a des enfants
-- liés (protection métier — un niveau supprimé indique un changement de
-- pédagogie majeur qui doit être migré manuellement avec ACM).
ALTER TABLE "children"
  ADD CONSTRAINT "children_level_code_pedagogy_levels_code_fk"
  FOREIGN KEY ("level_code")
  REFERENCES "public"."pedagogy_levels"("code")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 3. Index FK (lint 0001_unindexed_foreign_keys, cf. 0004 §5)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "children_level_code_idx" ON "children" ("level_code");

-- ============================================================================
-- FIN migration 0006. 1 rename de colonne, 1 FK ajoutée, 1 index FK ajouté.
-- Aucune perte de donnée (RENAME). Snapshot Drizzle 0006_snapshot.json
-- construit à la main à partir de 0005_snapshot.json (cf. commit message).
--
-- Lints Supabase attendus après migration :
--   - 0 nouveau lint `auth_rls_initplan` (pas de policy modifiée).
--   - 0 nouveau lint `unindexed_foreign_keys` (la nouvelle FK a son index).
--   - Effet de bord attendu : 1 INFO `unused_index` initial sur
--     `children_level_code_idx` (normal, à réévaluer post-Sprint 1 quand
--     les premières queries dashboard arriveront).
-- ============================================================================
