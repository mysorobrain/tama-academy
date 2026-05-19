-- =============================================================================
-- 0000_init.sql — Tama Academy Sprint 0
-- =============================================================================
-- Crée les 4 tables fondamentales + active Row Level Security sur chacune.
--
-- Politique RLS PR #2 : service_role full access uniquement.
--   - service_role bypasse déjà RLS nativement dans Supabase
--   - Les policies explicites "service_role full access" sont ajoutées pour
--     documenter l'intention (audit-friendly) et pour ne PAS dépendre d'un
--     comportement implicite Supabase
--   - Conséquence : anon + authenticated → ZÉRO accès (RLS activée, aucune
--     policy ne les autorise). Toute requête côté browser via la
--     publishable key échouera proprement
--   - Les policies user-aware (auth.jwt() ->> 'sub') arrivent en PR #3 une
--     fois Clerk wiré côté JWKS Supabase
--
-- Idempotence : DROP IF EXISTS sur les policies pour permettre de rejouer
-- la migration sans casser (drizzle-kit migrate skip si déjà appliquée via
-- son tracking dans drizzle.__drizzle_migrations, mais on garde la ceinture
-- ET les bretelles).
-- =============================================================================

CREATE TYPE "public"."user_role" AS ENUM('parent', 'instructor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('account_creation', 'camera_capture', 'video_recording', 'analytics', 'marketing');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"role" "user_role" DEFAULT 'parent' NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"mbti_profile" text,
	"locale" text DEFAULT 'fr' NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_initial" text NOT NULL,
	"birth_date" date NOT NULL,
	"belt_code" text DEFAULT 'NP1' NOT NULL,
	"zen_mode" boolean DEFAULT false NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parental_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"consent_type" "consent_type" NOT NULL,
	"granted" boolean NOT NULL,
	"granted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"evidence_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parental_consents" ADD CONSTRAINT "parental_consents_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parental_consents" ADD CONSTRAINT "parental_consents_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_events" ADD CONSTRAINT "user_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "parental_consents_active_unique_idx" ON "parental_consents" USING btree ("parent_id","child_id","consent_type") WHERE "parental_consents"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "user_events_user_kind_created_idx" ON "user_events" USING btree ("user_id","kind","created_at");--> statement-breakpoint

-- =============================================================================
-- Row Level Security : activation sur les 4 tables
-- =============================================================================
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "children" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "parental_consents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- =============================================================================
-- Policies : service_role full access (anon + authenticated denied par défaut)
-- =============================================================================
-- users
DROP POLICY IF EXISTS "users_service_role_full_access" ON "users";--> statement-breakpoint
CREATE POLICY "users_service_role_full_access" ON "users"
	AS PERMISSIVE FOR ALL
	TO service_role
	USING (true)
	WITH CHECK (true);--> statement-breakpoint

-- children
DROP POLICY IF EXISTS "children_service_role_full_access" ON "children";--> statement-breakpoint
CREATE POLICY "children_service_role_full_access" ON "children"
	AS PERMISSIVE FOR ALL
	TO service_role
	USING (true)
	WITH CHECK (true);--> statement-breakpoint

-- parental_consents
DROP POLICY IF EXISTS "parental_consents_service_role_full_access" ON "parental_consents";--> statement-breakpoint
CREATE POLICY "parental_consents_service_role_full_access" ON "parental_consents"
	AS PERMISSIVE FOR ALL
	TO service_role
	USING (true)
	WITH CHECK (true);--> statement-breakpoint

-- user_events
DROP POLICY IF EXISTS "user_events_service_role_full_access" ON "user_events";--> statement-breakpoint
CREATE POLICY "user_events_service_role_full_access" ON "user_events"
	AS PERMISSIVE FOR ALL
	TO service_role
	USING (true)
	WITH CHECK (true);
