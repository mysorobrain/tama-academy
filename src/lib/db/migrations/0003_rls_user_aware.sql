-- ============================================================================
-- 0003_rls_user_aware.sql
--
-- Active les policies RLS USER-AWARE pour le role `authenticated` (= JWT Clerk
-- validé par Supabase 3PA, role claim = "authenticated", sub claim = clerk_id).
--
-- Préserve les policies service_role full access (admin / webhook / cron /
-- scripts d'administration), juste renommées sans changement de logique pour
-- cohérence visuelle avec les nouvelles policies authenticated.
--
-- Préfixe nommage policies : `<table>_<role>_<operation>` (ex.
-- users_authenticated_select). Permet de lister facilement en pg_policies
-- et de DROP individuellement sans collision.
--
-- IMPORTANT : la table `users` n'a PAS de policy INSERT pour authenticated.
-- Les rows users sont créées EXCLUSIVEMENT via le webhook Clerk user.created
-- (service_role bypass). Idem DELETE : suppression de compte = endpoint
-- dédié /api/account/delete (service_role). Cela rend impossible un
-- « DROP my own account » SQL direct depuis l'app, qui doit toujours passer
-- par le flow audité.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REVOKE défensif sur `anon` — ces 4 tables ne sont jamais accessibles
-- ----------------------------------------------------------------------------
-- Defense in depth : même si une policy pour anon était créée par erreur
-- plus tard, le REVOKE table-level bloquerait quand même. Et ça évite que
-- des tentatives de bruteforce anon polluent les logs PG.
REVOKE ALL ON public.users              FROM anon;
REVOKE ALL ON public.children           FROM anon;
REVOKE ALL ON public.parental_consents  FROM anon;
REVOKE ALL ON public.user_events        FROM anon;

-- ----------------------------------------------------------------------------
-- 2. Renommage des policies service_role pour cohérence nommage
-- ----------------------------------------------------------------------------
-- (Aucun changement de logique, juste rename : `<table>_service_role_all`)
DROP POLICY IF EXISTS users_service_role_full_access              ON public.users;
DROP POLICY IF EXISTS children_service_role_full_access           ON public.children;
DROP POLICY IF EXISTS parental_consents_service_role_full_access  ON public.parental_consents;
DROP POLICY IF EXISTS user_events_service_role_full_access        ON public.user_events;

CREATE POLICY users_service_role_all              ON public.users              FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY children_service_role_all           ON public.children           FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY parental_consents_service_role_all  ON public.parental_consents  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY user_events_service_role_all        ON public.user_events        FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 3. Policies USER-AWARE pour `users` (le user voit/édite son propre row)
-- ----------------------------------------------------------------------------
-- Pas d'INSERT (webhook only), pas de DELETE (endpoint audité).

CREATE POLICY users_authenticated_select
  ON public.users FOR SELECT TO authenticated
  USING (clerk_id = (auth.jwt() ->> 'sub'));

CREATE POLICY users_authenticated_update
  ON public.users FOR UPDATE TO authenticated
  USING      (clerk_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (clerk_id = (auth.jwt() ->> 'sub'));

-- Anti-élévation de privilèges : on REVOKE UPDATE table-level puis on
-- GRANT UPDATE colonne par colonne, en excluant `id`, `clerk_id`, `role`
-- et les timestamps. Ainsi même si la policy laisse passer, un user ne
-- peut JAMAIS modifier son rôle (parent → admin) ni son clerk_id (vol
-- d'identité). Pattern documenté Supabase + standard Postgres.
REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (email, full_name, mbti_profile, locale, data_json)
  ON public.users TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. Policies USER-AWARE pour `children` (le parent voit/gère ses enfants)
-- ----------------------------------------------------------------------------
-- Toutes les policies utilisent le même sous-pattern : `parent_id IN
-- (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')`. On
-- pourrait factoriser via une fonction `current_user_id()` SECURITY
-- DEFINER, mais Sprint 0 : on garde la version inline lisible. Optim
-- prévue plus tard si benchmark le justifie (index unique sur clerk_id
-- déjà en place donc la sous-requête est rapide).

CREATE POLICY children_authenticated_select
  ON public.children FOR SELECT TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY children_authenticated_insert
  ON public.children FOR INSERT TO authenticated
  WITH CHECK (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY children_authenticated_update
  ON public.children FOR UPDATE TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY children_authenticated_delete
  ON public.children FOR DELETE TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
  );

-- ----------------------------------------------------------------------------
-- 5. Policies USER-AWARE pour `parental_consents`
-- ----------------------------------------------------------------------------
-- Pas de DELETE pour authenticated : un consent ne se supprime jamais, il
-- se révoque via UPDATE (revoked_at = now()). Audit trail RGPD préservé.
--
-- UPDATE renforcé (ajustement 1 de Samir) : on contrôle aussi child_id IN
-- (enfants du parent). Empêche un parent de re-pointer son consent vers
-- l'enfant d'un autre parent (pollution audit trail). Même check sur
-- USING (avant l'UPDATE : la ligne courante doit déjà être conforme) et
-- sur WITH CHECK (après l'UPDATE : la ligne réécrite doit aussi l'être).

CREATE POLICY parental_consents_authenticated_select
  ON public.parental_consents FOR SELECT TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY parental_consents_authenticated_insert
  ON public.parental_consents FOR INSERT TO authenticated
  WITH CHECK (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
    AND child_id IN (
      SELECT c.id FROM public.children c
      WHERE c.parent_id IN (
        SELECT u.id FROM public.users u WHERE u.clerk_id = (auth.jwt() ->> 'sub')
      )
    )
  );

CREATE POLICY parental_consents_authenticated_update
  ON public.parental_consents FOR UPDATE TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
    AND child_id IN (
      SELECT c.id FROM public.children c
      WHERE c.parent_id IN (
        SELECT u.id FROM public.users u WHERE u.clerk_id = (auth.jwt() ->> 'sub')
      )
    )
  )
  WITH CHECK (
    parent_id IN (
      SELECT id FROM public.users WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
    AND child_id IN (
      SELECT c.id FROM public.children c
      WHERE c.parent_id IN (
        SELECT u.id FROM public.users u WHERE u.clerk_id = (auth.jwt() ->> 'sub')
      )
    )
  );

REVOKE DELETE ON public.parental_consents FROM authenticated;

-- ----------------------------------------------------------------------------
-- 6. Policies USER-AWARE pour `user_events` (audit trail append-only)
-- ----------------------------------------------------------------------------
-- Append-only par design : pas d'UPDATE, pas de DELETE pour authenticated.
-- Le service_role peut purger (RGPD droit à l'oubli endpoint /api/account/delete).

CREATE POLICY user_events_authenticated_select
  ON public.user_events FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY user_events_authenticated_insert
  ON public.user_events FOR INSERT TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_id = (auth.jwt() ->> 'sub')
    )
  );

REVOKE UPDATE ON public.user_events FROM authenticated;
REVOKE DELETE ON public.user_events FROM authenticated;

-- ============================================================================
-- FIN migration 0003. 14 policies créées (4 service_role rename + 10 user-aware),
-- 4 REVOKE table-level sur anon, 2 REVOKE granulaires + 1 GRANT colonnes sur
-- users, 2 REVOKE sur parental_consents+user_events. Aucune modification de
-- schéma (les types Drizzle TypeScript ne bougent pas, snapshot identique).
-- ============================================================================
