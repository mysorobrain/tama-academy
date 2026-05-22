-- ============================================================================
-- 0005_pedagogy_core.sql — Tama Academy Sprint 1 J1 (PR #5)
--
-- Crée les 5 tables du noyau pédagogique `pedagogy_*` (catalogue immuable
-- de la Méthode Tama, validé en checkpoint ACM-1 le 2026-05-22, statut
-- VALIDÉ sans correction — cf. docs/decisions-acm-sprint-1.md).
--
--   - pedagogy_belts     (9 lignes : 8 ceintures distinctes + 1 partagée M4/M5)
--   - pedagogy_levels    (10 lignes : NP1 → M5, FK belt_code)
--   - pedagogy_pairs     (7 lignes  : P1/P2 + G1-G5)
--   - pedagogy_formulas  (26 lignes : 8 Petits Amis + 18 Grands Amis, FK pair_code)
--   - pedagogy_sceaux    (7 lignes  : 1:1 avec pairs, UNIQUE pair_code)
--
-- ----------------------------------------------------------------------------
-- RLS — catalogue read-only
-- ----------------------------------------------------------------------------
-- Le contenu pédagogique propriétaire est en lecture seule côté front. Donc :
--   - authenticated : SELECT seul, jamais d'INSERT/UPDATE/DELETE depuis l'app.
--   - service_role  : ALL (seed initial J3, back-office futur, scripts).
--   - anon          : REVOKE ALL (defense in depth, alignement 0003).
--
-- Pattern wrap `(SELECT auth.jwt())` non requis ici : les policies SELECT
-- authenticated utilisent `USING (true)` sans accès à `auth.jwt()` (le
-- catalogue n'est pas user-scoped — tout le monde peut lire les 26 formules
-- une fois identifié). Donc pas de risque `auth_rls_initplan` (lint 0003).
--
-- Anti-tampering renforcé : REVOKE table-level des opérations d'écriture
-- pour `authenticated`, en plus de l'absence de policy d'écriture. Double
-- ceinture (policy + GRANT) cf. pattern 0003 §3 (anti-élévation de privilèges).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREATE TABLE — généré par drizzle-kit (pas de modif manuelle dans ce bloc)
-- ----------------------------------------------------------------------------
CREATE TABLE "pedagogy_belts" (
	"code" varchar(20) PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"color_hex" varchar(7) NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pedagogy_belts_display_order_unique" UNIQUE("display_order")
);
--> statement-breakpoint
CREATE TABLE "pedagogy_levels" (
	"code" varchar(10) PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"belt_code" varchar(20) NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pedagogy_levels_display_order_unique" UNIQUE("display_order")
);
--> statement-breakpoint
CREATE TABLE "pedagogy_pairs" (
	"code" varchar(2) PRIMARY KEY NOT NULL,
	"family" varchar(20) NOT NULL,
	"amis" integer[] NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pedagogy_pairs_display_order_unique" UNIQUE("display_order")
);
--> statement-breakpoint
CREATE TABLE "pedagogy_formulas" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"pair_code" varchar(2) NOT NULL,
	"operation" varchar(20) NOT NULL,
	"operand" integer NOT NULL,
	"complement" integer NOT NULL,
	"formula_short" text NOT NULL,
	"narrative_kids" text NOT NULL,
	"narrative_academy" text NOT NULL,
	"applies_when_current_value_in" integer[] NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pedagogy_formulas_display_order_unique" UNIQUE("display_order")
);
--> statement-breakpoint
CREATE TABLE "pedagogy_sceaux" (
	"code" varchar(2) PRIMARY KEY NOT NULL,
	"pair_code" varchar(2) NOT NULL,
	"name_fr" text NOT NULL,
	"glyph_svg_url" text,
	"unlock_threshold" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pedagogy_sceaux_pair_code_unique" UNIQUE("pair_code")
);
--> statement-breakpoint
ALTER TABLE "pedagogy_levels" ADD CONSTRAINT "pedagogy_levels_belt_code_pedagogy_belts_code_fk" FOREIGN KEY ("belt_code") REFERENCES "public"."pedagogy_belts"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedagogy_formulas" ADD CONSTRAINT "pedagogy_formulas_pair_code_pedagogy_pairs_code_fk" FOREIGN KEY ("pair_code") REFERENCES "public"."pedagogy_pairs"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedagogy_sceaux" ADD CONSTRAINT "pedagogy_sceaux_pair_code_pedagogy_pairs_code_fk" FOREIGN KEY ("pair_code") REFERENCES "public"."pedagogy_pairs"("code") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 2. Index FK explicites (lint 0001_unindexed_foreign_keys, cf. 0004)
-- ----------------------------------------------------------------------------
-- Drizzle-kit n'auto-génère pas les index sur les FK. On les ajoute ici :
-- ces 3 colonnes vont servir à des JOINs fréquents (formulas → pairs,
-- sceaux → pairs, levels → belts) et à des évaluations de contraintes
-- FK (CASCADE / RESTRICT). Pattern aligné sur 0004 §5.
CREATE INDEX IF NOT EXISTS "pedagogy_levels_belt_code_idx"   ON "pedagogy_levels"   ("belt_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pedagogy_formulas_pair_code_idx" ON "pedagogy_formulas" ("pair_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pedagogy_sceaux_pair_code_idx"   ON "pedagogy_sceaux"   ("pair_code");
--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 3. RLS activation + REVOKE défensif sur anon
-- ----------------------------------------------------------------------------
ALTER TABLE "pedagogy_belts"    ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pedagogy_levels"   ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pedagogy_pairs"    ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pedagogy_formulas" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pedagogy_sceaux"   ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

REVOKE ALL ON "pedagogy_belts"    FROM anon;
--> statement-breakpoint
REVOKE ALL ON "pedagogy_levels"   FROM anon;
--> statement-breakpoint
REVOKE ALL ON "pedagogy_pairs"    FROM anon;
--> statement-breakpoint
REVOKE ALL ON "pedagogy_formulas" FROM anon;
--> statement-breakpoint
REVOKE ALL ON "pedagogy_sceaux"   FROM anon;
--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 4. Anti-tampering : REVOKE INSERT/UPDATE/DELETE sur authenticated
-- ----------------------------------------------------------------------------
-- Même si aucune policy authenticated INSERT/UPDATE/DELETE n'existe (et donc
-- toute tentative serait bloquée), on REVOKE également au niveau GRANT pour
-- une défense en profondeur. Cf. 0003 §3 (REVOKE UPDATE then GRANT UPDATE
-- column-level pour users).
REVOKE INSERT, UPDATE, DELETE ON "pedagogy_belts"    FROM authenticated;
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "pedagogy_levels"   FROM authenticated;
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "pedagogy_pairs"    FROM authenticated;
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "pedagogy_formulas" FROM authenticated;
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "pedagogy_sceaux"   FROM authenticated;
--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 5. Policies — read-only authenticated + ALL service_role
-- ----------------------------------------------------------------------------
-- Convention nommage : `<table>_<role>_<operation>` (cf. 0003 §1).

-- pedagogy_belts
CREATE POLICY "pedagogy_belts_authenticated_select"
  ON "pedagogy_belts" FOR SELECT TO authenticated
  USING (true);
--> statement-breakpoint
CREATE POLICY "pedagogy_belts_service_role_all"
  ON "pedagogy_belts" FOR ALL TO service_role
  USING (true) WITH CHECK (true);
--> statement-breakpoint

-- pedagogy_levels
CREATE POLICY "pedagogy_levels_authenticated_select"
  ON "pedagogy_levels" FOR SELECT TO authenticated
  USING (true);
--> statement-breakpoint
CREATE POLICY "pedagogy_levels_service_role_all"
  ON "pedagogy_levels" FOR ALL TO service_role
  USING (true) WITH CHECK (true);
--> statement-breakpoint

-- pedagogy_pairs
CREATE POLICY "pedagogy_pairs_authenticated_select"
  ON "pedagogy_pairs" FOR SELECT TO authenticated
  USING (true);
--> statement-breakpoint
CREATE POLICY "pedagogy_pairs_service_role_all"
  ON "pedagogy_pairs" FOR ALL TO service_role
  USING (true) WITH CHECK (true);
--> statement-breakpoint

-- pedagogy_formulas
CREATE POLICY "pedagogy_formulas_authenticated_select"
  ON "pedagogy_formulas" FOR SELECT TO authenticated
  USING (true);
--> statement-breakpoint
CREATE POLICY "pedagogy_formulas_service_role_all"
  ON "pedagogy_formulas" FOR ALL TO service_role
  USING (true) WITH CHECK (true);
--> statement-breakpoint

-- pedagogy_sceaux
CREATE POLICY "pedagogy_sceaux_authenticated_select"
  ON "pedagogy_sceaux" FOR SELECT TO authenticated
  USING (true);
--> statement-breakpoint
CREATE POLICY "pedagogy_sceaux_service_role_all"
  ON "pedagogy_sceaux" FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- FIN migration 0005. 5 tables créées, 3 FK + 3 indexes FK explicites, 5 RLS
-- activées, 5 REVOKE anon, 5 REVOKE INSERT/UPDATE/DELETE authenticated, 10
-- policies (5 select authenticated + 5 all service_role).
--
-- Lints Supabase attendus après migration :
--   - 0 nouveau lint `auth_rls_initplan` (les policies SELECT authenticated
--     utilisent `USING (true)` sans `auth.jwt()` — pas de risque init plan).
--   - 0 nouveau lint `unindexed_foreign_keys` (les 3 FK ont leur index).
--   - Effet de bord attendu : 3 INFO `unused_index` initiaux sur les indexes
--     FK fraîchement créés (normal, à réévaluer post-Sprint 1).
--
-- Seed des 5 tables : J3 lors de la session ACM (3h synchrone, cf. brief J3).
-- ============================================================================
