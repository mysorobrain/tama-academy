-- ============================================================================
-- 0004_perf_rls_initplan_and_fk_indexes.sql — Tama Academy post-Sprint 0
--
-- Fix des 13 lints Supabase Database Linter remontés sur le projet
-- `mrioviqfnkcqqnwxwlqn` après la mise en place de 0003 (RLS user-aware) :
--   - 11 WARN auth_rls_initplan : chaque appel à `auth.jwt()` dans les
--     policies USING/WITH CHECK était ré-évalué pour chaque ligne scannée
--     (11 policies authenticated user-aware = 2 users + 4 children + 3
--     parental_consents + 2 user_events ; les 4 policies service_role créées
--     en 0003 §2 `<table>_service_role_all` ne sont PAS touchées ici car
--     `USING (true)` ne déclenche pas `auth_rls_initplan`).
--   - 2 INFO unindexed_foreign_keys : `children.parent_id` et
--     `parental_consents.child_id` n'avaient pas d'index couvrant.
--
-- ----------------------------------------------------------------------------
-- Pourquoi c'est important avant Sprint 1
-- ----------------------------------------------------------------------------
-- Le Stage de Vacances (cf. user rule 05) est un pic de charge :
-- 6 enfants × ~200 events/min/groupe = 72 000 évaluations JWT/minute à
-- l'INSERT user_events. Avec le pattern actuel, chaque évaluation parse le
-- JWT côté Postgres → coûteux. Le wrap `(SELECT auth.jwt())` force Postgres
-- à évaluer 1× par requête, pas 1× par ligne (init plan).
--   Ref : https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--   Lint : 0003_auth_rls_initplan
--
-- ----------------------------------------------------------------------------
-- Pourquoi DROP + CREATE plutôt que ALTER
-- ----------------------------------------------------------------------------
-- Postgres ne permet pas `ALTER POLICY ... USING (...)` directement sans
-- recréer. Le pattern DROP IF EXISTS + CREATE est idempotent et lisible, et
-- conserve la convention de nommage et les commentaires de 0003. Aucun
-- changement de logique métier — seule l'optimisation interne change.
--
-- ----------------------------------------------------------------------------
-- Snapshot Drizzle non modifié
-- ----------------------------------------------------------------------------
-- Cette migration ne touche ni au schéma TypeScript ni aux types Drizzle :
-- pas de CREATE/DROP TABLE, pas de CREATE/DROP COLUMN. On ne génère donc pas
-- de snapshot 0004. Le `_journal.json` est mis à jour à la main avec une
-- entrée 0004 (tag identique au nom de fichier).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE users — recreate select + update avec init plan
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS users_authenticated_select ON public.users;
CREATE POLICY users_authenticated_select
  ON public.users FOR SELECT TO authenticated
  USING (clerk_id = ((SELECT auth.jwt()) ->> 'sub'));

DROP POLICY IF EXISTS users_authenticated_update ON public.users;
CREATE POLICY users_authenticated_update
  ON public.users FOR UPDATE TO authenticated
  USING      (clerk_id = ((SELECT auth.jwt()) ->> 'sub'))
  WITH CHECK (clerk_id = ((SELECT auth.jwt()) ->> 'sub'));

-- ----------------------------------------------------------------------------
-- 2. TABLE children — recreate SELECT / INSERT / UPDATE / DELETE
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS children_authenticated_select ON public.children;
CREATE POLICY children_authenticated_select
  ON public.children FOR SELECT TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = ((SELECT auth.jwt()) ->> 'sub')
    )
  );

DROP POLICY IF EXISTS children_authenticated_insert ON public.children;
CREATE POLICY children_authenticated_insert
  ON public.children FOR INSERT TO authenticated
  WITH CHECK (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = ((SELECT auth.jwt()) ->> 'sub')
    )
  );

DROP POLICY IF EXISTS children_authenticated_update ON public.children;
CREATE POLICY children_authenticated_update
  ON public.children FOR UPDATE TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = ((SELECT auth.jwt()) ->> 'sub')
    )
  )
  WITH CHECK (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = ((SELECT auth.jwt()) ->> 'sub')
    )
  );

DROP POLICY IF EXISTS children_authenticated_delete ON public.children;
CREATE POLICY children_authenticated_delete
  ON public.children FOR DELETE TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = ((SELECT auth.jwt()) ->> 'sub')
    )
  );

-- ----------------------------------------------------------------------------
-- 3. TABLE parental_consents — SELECT / INSERT / UPDATE (pas de DELETE,
--    audit trail RGPD préservé)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS parental_consents_authenticated_select ON public.parental_consents;
CREATE POLICY parental_consents_authenticated_select
  ON public.parental_consents FOR SELECT TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = ((SELECT auth.jwt()) ->> 'sub')
    )
  );

DROP POLICY IF EXISTS parental_consents_authenticated_insert ON public.parental_consents;
CREATE POLICY parental_consents_authenticated_insert
  ON public.parental_consents FOR INSERT TO authenticated
  WITH CHECK (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = ((SELECT auth.jwt()) ->> 'sub')
    )
    AND child_id IN (
      SELECT c.id FROM public.children c
      WHERE c.parent_id IN (
        SELECT u.id FROM public.users u WHERE u.clerk_id = ((SELECT auth.jwt()) ->> 'sub')
      )
    )
  );

DROP POLICY IF EXISTS parental_consents_authenticated_update ON public.parental_consents;
CREATE POLICY parental_consents_authenticated_update
  ON public.parental_consents FOR UPDATE TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = ((SELECT auth.jwt()) ->> 'sub')
    )
    AND child_id IN (
      SELECT c.id FROM public.children c
      WHERE c.parent_id IN (
        SELECT u.id FROM public.users u WHERE u.clerk_id = ((SELECT auth.jwt()) ->> 'sub')
      )
    )
  )
  WITH CHECK (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = ((SELECT auth.jwt()) ->> 'sub')
    )
    AND child_id IN (
      SELECT c.id FROM public.children c
      WHERE c.parent_id IN (
        SELECT u.id FROM public.users u WHERE u.clerk_id = ((SELECT auth.jwt()) ->> 'sub')
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 4. TABLE user_events — SELECT / INSERT (append-only)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS user_events_authenticated_select ON public.user_events;
CREATE POLICY user_events_authenticated_select
  ON public.user_events FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = ((SELECT auth.jwt()) ->> 'sub')
    )
  );

DROP POLICY IF EXISTS user_events_authenticated_insert ON public.user_events;
CREATE POLICY user_events_authenticated_insert
  ON public.user_events FOR INSERT TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = ((SELECT auth.jwt()) ->> 'sub')
    )
  );

-- ----------------------------------------------------------------------------
-- 5. Index FK manquants (lint 0001_unindexed_foreign_keys)
-- ----------------------------------------------------------------------------
-- Sans index sur les FK, Postgres fait un seq scan à chaque vérification de
-- contrainte (CASCADE / RESTRICT). Sur des tables qui vont grossir vite
-- (children, parental_consents, user_events), c'est un coût d'écriture.
-- IF NOT EXISTS = idempotent (utile en preview/staging réutilisable).
CREATE INDEX IF NOT EXISTS children_parent_id_idx
  ON public.children (parent_id);

CREATE INDEX IF NOT EXISTS parental_consents_child_id_idx
  ON public.parental_consents (child_id);

CREATE INDEX IF NOT EXISTS parental_consents_parent_id_idx
  ON public.parental_consents (parent_id);

CREATE INDEX IF NOT EXISTS user_events_user_id_idx
  ON public.user_events (user_id);

-- ============================================================================
-- FIN migration 0004. 11 policies authenticated recréées (perf init plan),
-- 4 index FK ajoutés. Aucun changement de schéma logique — snapshot Drizzle
-- inchangé. Les 4 policies service_role (`<table>_service_role_all` créées
-- en 0003 §2) restent en place, non touchées par cette migration.
-- Advisor `auth_rls_initplan` doit passer de 11 WARN à 0.
-- Effet de bord attendu : 4 nouvelles INFO `unused_index` apparaissent (les
-- nouveaux index FK n'ont pas encore été utilisés en read query) — c'est
-- normal pour de nouveaux indexes. Re-évaluer après Sprint 1 si certains
-- restent unused car redondants avec un composite index existant (ex.
-- `user_events_user_id_idx` vs `user_events_user_kind_created_idx`).
-- ============================================================================
