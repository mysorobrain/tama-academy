-- =============================================================================
-- 0001_triggers_updated_at.sql — Tama Academy Sprint 0
-- =============================================================================
-- Auto-update du champ updated_at sur les tables qui en ont un (users +
-- children). Décision verrouillée brief §4 : trigger Postgres, pas
-- middleware Drizzle (le middleware ne couvre pas les UPDATE faits via
-- Supabase Studio, psql direct, ou batch SQL).
--
-- Convention de nommage de la fonction : tama_set_updated_at (préfixe tama_
-- pour éviter collision avec extensions Supabase). Idempotent via
-- CREATE OR REPLACE FUNCTION.
--
-- Triggers : DROP IF EXISTS avant CREATE pour permettre de rejouer la
-- migration sans casser. Drizzle-kit migrate skip si déjà appliquée, mais
-- ceinture + bretelles.
--
-- parental_consents : pas de updated_at (table immutable, audit trail).
-- user_events : pas de updated_at (append-only).
-- =============================================================================

CREATE OR REPLACE FUNCTION tama_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at := now();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS tama_users_updated_at ON "users";--> statement-breakpoint
CREATE TRIGGER tama_users_updated_at
	BEFORE UPDATE ON "users"
	FOR EACH ROW
	EXECUTE FUNCTION tama_set_updated_at();
--> statement-breakpoint

DROP TRIGGER IF EXISTS tama_children_updated_at ON "children";--> statement-breakpoint
CREATE TRIGGER tama_children_updated_at
	BEFORE UPDATE ON "children"
	FOR EACH ROW
	EXECUTE FUNCTION tama_set_updated_at();
