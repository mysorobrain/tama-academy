-- ============================================================================
-- reconcile-supabase-schema-migrations.sql — Tama Academy PI-002
--
-- TRACKER-ONLY reconciliation : aligne `supabase_migrations.schema_migrations`
-- avec `drizzle.__drizzle_migrations` (source-of-truth opérationnelle).
--
-- AUCUN DDL n'est ré-exécuté. AUCUNE table/policy/index modifiée. Seul le
-- tracker miroir Supabase est mis à jour pour que `list_migrations` (MCP) et
-- le dashboard Supabase reflètent les 7 migrations Drizzle 0000→0006.
--
-- ----------------------------------------------------------------------------
-- Contexte (cf. docs/post-sprint0-todo.md §PI-002)
-- ----------------------------------------------------------------------------
-- Audit Claude pré-J2 du 2026-05-22 : deux pipelines d'application coexistent
-- sans sync du tracker miroir Supabase :
--
--   pnpm db:migrate     → drizzle.__drizzle_migrations           ✅ (0000→0006)
--   apply_migration MCP → supabase_migrations.schema_migrations  ⚠️ (0004 seul)
--
-- État avant réconciliation (snapshot Étape 0) :
--
--   drizzle.__drizzle_migrations : 7 entrées (id 1→7, hashes 9db…→870…)
--   supabase_migrations.schema_migrations : 1 ligne
--     version=20260519224539  name=perf_rls_initplan_and_fk_indexes
--     stmt_count=1  created_by=mysorobrain@gmail.com  idempotency_key=NULL
--
-- ----------------------------------------------------------------------------
-- Mode d'exécution OBLIGATOIRE
-- ----------------------------------------------------------------------------
-- Discipline PI-002 stricte : exécution via psql DIRECT, JAMAIS via MCP
-- `apply_migration` (qui créerait une 8ᵉ entrée tracker — la dette qu'on solde).
--
--   psql "$DATABASE_DIRECT_URL" -v ON_ERROR_STOP=1 \
--     -f scripts/reconcile-supabase-schema-migrations.sql
--
-- ----------------------------------------------------------------------------
-- Idempotence
-- ----------------------------------------------------------------------------
-- INSERT : `ON CONFLICT (version) DO NOTHING` → ré-exécution safe, aucun
--          doublon ne sera créé si une entrée existe déjà à cette version.
-- UPDATE : `WHERE version = '20260519224539' AND name = 'perf_…'` → si la
--          ligne a déjà été réalignée (version='20260523184539'), 0 row touché.
--
-- Donc ce script peut être ré-exécuté autant de fois que nécessaire en cas
-- d'exception MCP future (cf. règle préventive PI-002).
--
-- ----------------------------------------------------------------------------
-- Choix des `version`
-- ----------------------------------------------------------------------------
-- Format `YYYYMMDDHHMMSS` dérivé du champ `when` (ms epoch) du Drizzle
-- _journal.json. Garantit ordre lexicographique = ordre pédagogique.
--
--   0000_init                          when=1779195425395 → 20260519125705
--   0001_triggers_updated_at           when=1779195515459 → 20260519125835
--   0002_harden_trigger_function       when=1779203948944 → 20260519151908
--   0003_rls_user_aware                when=1779559200000 → 20260523180000
--   0004_perf_rls_initplan…            when=1779576339000 → 20260523184539 (UPDATE)
--   0005_pedagogy_core                 when=1779788400000 → 20260526094000
--   0006_rename_children_belt_to_level when=1779789000000 → 20260526095000
--
-- ----------------------------------------------------------------------------
-- Choix `statements` = placeholder commenté
-- ----------------------------------------------------------------------------
-- Décision Claude Q1 : on stocke un placeholder commenté pointant vers le
-- fichier repo + l'id Drizzle correspondant. On évite ainsi une 3ᵉ copie
-- divergente du SQL (les 2 sources existantes sont déjà le fichier
-- `XXXX.sql` du repo + le snapshot Drizzle dans `meta/XXXX_snapshot.json`).
--
-- ----------------------------------------------------------------------------
-- Choix `idempotency_key` = NULL
-- ----------------------------------------------------------------------------
-- ⚠️ Contrainte UNIQUE sur `idempotency_key` (vérifiée 2026-05-22). On laisse
-- NULL sur les 6 INSERT — multiple NULLs autorisés en Postgres par défaut.
-- Ne JAMAIS mettre un placeholder commun type 'pi-002' sur les 6 lignes
-- (violation UNIQUE garantie).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. INSERT des 6 entrées manquantes (0000, 0001, 0002, 0003, 0005, 0006)
-- ----------------------------------------------------------------------------
INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
VALUES
  (
    '20260519125705',
    'init',
    ARRAY['-- tracker reconciliation (PI-002): applied via pnpm db:migrate from src/lib/db/migrations/0000_init.sql. See drizzle.__drizzle_migrations id=1, hash prefix 9db874d69cb8d022. Snapshot: src/lib/db/migrations/meta/0000_snapshot.json.'],
    'reconciliation-pi-002'
  ),
  (
    '20260519125835',
    'triggers_updated_at',
    ARRAY['-- tracker reconciliation (PI-002): applied via pnpm db:migrate from src/lib/db/migrations/0001_triggers_updated_at.sql. See drizzle.__drizzle_migrations id=2, hash prefix 98d1e8d82752db95. Snapshot: src/lib/db/migrations/meta/0001_snapshot.json.'],
    'reconciliation-pi-002'
  ),
  (
    '20260519151908',
    'harden_trigger_function',
    ARRAY['-- tracker reconciliation (PI-002): applied via pnpm db:migrate from src/lib/db/migrations/0002_harden_trigger_function.sql. See drizzle.__drizzle_migrations id=3, hash prefix cd48b64b0d4ae0ff. Snapshot: src/lib/db/migrations/meta/0002_snapshot.json.'],
    'reconciliation-pi-002'
  ),
  (
    '20260523180000',
    'rls_user_aware',
    ARRAY['-- tracker reconciliation (PI-002): applied via pnpm db:migrate from src/lib/db/migrations/0003_rls_user_aware.sql. See drizzle.__drizzle_migrations id=4, hash prefix dc4051bf50d19b48. Snapshot: src/lib/db/migrations/meta/0003_snapshot.json.'],
    'reconciliation-pi-002'
  ),
  (
    '20260526094000',
    'pedagogy_core',
    ARRAY['-- tracker reconciliation (PI-002): applied via pnpm db:migrate from src/lib/db/migrations/0005_pedagogy_core.sql. See drizzle.__drizzle_migrations id=6, hash prefix 783b3a2703c44081. Snapshot: src/lib/db/migrations/meta/0005_snapshot.json.'],
    'reconciliation-pi-002'
  ),
  (
    '20260526095000',
    'rename_children_belt_to_level',
    ARRAY['-- tracker reconciliation (PI-002): applied via pnpm db:migrate from src/lib/db/migrations/0006_rename_children_belt_to_level.sql. See drizzle.__drizzle_migrations id=7, hash prefix 870fcae729d8e163. Snapshot: src/lib/db/migrations/meta/0006_snapshot.json.'],
    'reconciliation-pi-002'
  )
ON CONFLICT (version) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. UPDATE Option A — réaligne la version de 0004 sur le journal Drizzle
-- ----------------------------------------------------------------------------
-- Sans cet UPDATE, l'ordre lexicographique des versions placerait 0004
-- (`20260519224539`) entre 0002 et 0003 → `list_migrations` afficherait un
-- ordre incohérent vs ordre pédagogique réel.
--
-- Réalignement sur la valeur dérivée du journal Drizzle :
--   when=1779576339000 → 2026-05-23 18:45:39 UTC → version='20260523184539'
--
-- L'UPDATE de la PK `version` est safe ici : aucune FK ne pointe vers cette
-- table. Idempotent : si déjà réaligné (run précédent), 0 row touché.
UPDATE supabase_migrations.schema_migrations
SET
  version    = '20260523184539',
  created_by = COALESCE(created_by, 'reconciliation-pi-002')
WHERE version = '20260519224539'
  AND name    = 'perf_rls_initplan_and_fk_indexes';

-- ============================================================================
-- FIN script PI-002. 6 INSERT idempotents + 1 UPDATE idempotent.
-- Aucune modification de schéma. Tracker miroir Supabase aligné sur Drizzle.
--
-- Vérification post-exécution attendue :
--   SELECT COUNT(*) FROM supabase_migrations.schema_migrations;  -- 7
--   SELECT COUNT(*) FROM drizzle.__drizzle_migrations;            -- 7
--   SELECT version, name FROM supabase_migrations.schema_migrations
--     ORDER BY version;
--   → ordre lexicographique = ordre pédagogique 0000→0006.
-- ============================================================================
