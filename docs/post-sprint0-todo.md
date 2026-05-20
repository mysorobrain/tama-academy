# Post-Sprint 0 — Backlog dette technique

Dette technique et items consciemment reportés du Sprint 0 vers les sprints suivants. **Ne pas considérer ce fichier comme un nice-to-have** : chaque item est une décision pragmatique prise pendant le Sprint 0 pour livrer la PR #3 (auth + RLS + helpers sécu) sans bloquer, mais qui crée une surface de risque ou de friction si on l'oublie.

**Convention** : quand un item est attaqué, on crée une issue GitHub référencée ici (`→ #XX`) et on la déplace dans la section "Done" en bas avec la date de résolution. Ce fichier doit rester court — si on accumule plus de 15 items, c'est qu'on évite les vraies décisions.

---

## Priorité 1 — Isolation environnements (sécurité données mineurs)

### 1. Créer instance Clerk dédiée Preview/staging

**Risque actuel** : la PR #3 utilise une seule instance Clerk dev (`exotic-snail-90.clerk.accounts.dev`) partagée entre dev local + CI GitHub Actions. Tout signup déclenché en CI (même un signup fantôme via handshake redirect) pollue le user pool dev.

**Action** :

- Créer une 2e instance Clerk "tama-academy-staging" dans le dashboard Clerk.
- Récupérer `pk_test_*` + `sk_test_*` de cette nouvelle instance.
- Remplacer les secrets GitHub Actions `CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` par les valeurs staging.
- Documenter la séparation dans `docs/clerk-supabase-jwt-checklist.md` §1 (ajouter colonne staging).

**Échéance** : avant Sprint 4 (Stage de Vacances → premiers signups parents réels).

---

### 2. Endpoint webhook Clerk dédié Preview

**Risque actuel** : aucun webhook Clerk n'est aujourd'hui ciblé vers Vercel Preview (preview désactivée temporairement, cf. item 6). Quand on réactivera Vercel Preview, chaque PR ouvrira une URL différente — sans webhook configuré dessus, les events `user.created` ne seront pas reçus côté preview, et on découvrira ça en prod.

**Action** :

- Créer un 2e webhook endpoint dans Clerk Dashboard → Webhooks ciblant `https://tama-academy-git-*.vercel.app/api/clerk/webhook` (wildcard de branche preview).
- Récupérer son `whsec_*` distinct, l'ajouter à Vercel project env vars (target = Preview uniquement).
- Tester en ouvrant une PR vide après réactivation Preview : un signup dans Clerk staging doit déclencher un insert `users` dans Supabase staging (cf. item 3).

**Échéance** : couplée avec items 1 + 3 + 6.

---

### 3. Projet Supabase staging séparé du dev

**Risque actuel** : la PR #3 utilise un seul projet Supabase pour dev local + CI + (éventuel) Preview. Aujourd'hui les tests E2E RLS sont des "tentatives d'attaquant anon qui doivent toutes échouer" → aucune écriture, aucune pollution. Mais dès qu'on ajoutera des tests E2E avec création de fixtures (Parent A + Parent B pour RLS croisé), la BDD dev sera polluée par chaque run CI.

**Action** :

- Créer un 2e projet Supabase "tama-academy-staging" dans le même org.
- Appliquer les migrations Drizzle (`0001`, `0002`, `0003`) sur ce projet.
- Configurer Third-Party Auth Clerk pointant vers l'instance Clerk staging (cf. item 1).
- Remplacer les secrets GitHub Actions `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` par les valeurs staging.
- Idem côté Vercel project env vars Preview.

**Échéance** : avant d'écrire le premier test E2E qui crée des données (Sprint 1).

---

### 4. 3 `JWT_CHILD_SECRET` distincts dev/CI/Preview documentés

**Risque actuel** : aujourd'hui 2 secrets distincts (dev local généré J3 C2, CI généré J3 C11). Quand Vercel Preview sera réactivée (cf. item 6), il faudra un 3e secret distinct pour ne pas réutiliser celui de CI dans un environnement publiquement accessible.

**Action** :

- Générer un 3e secret via `openssl rand -base64 64` (par Samir, jamais via script, jamais affiché en chat).
- L'ajouter aux Vercel project env vars (target = Preview).
- Documenter dans `docs/auth-architecture.md` §2.2 la matrice des 3 secrets (dev | CI | Preview), avec rappel : rotation secret = seul moyen de révocation globale de tous les JWT enfants émis.

**Échéance** : couplée avec item 6.

---

## Priorité 2 — Infrastructure / outillage

### 5. Évaluer Doppler/Vercel env manager pour centraliser

**Risque actuel** : la gestion des secrets est aujourd'hui distribuée entre 3 surfaces (`.env.local` symlinké vers `~/Documents/tama-secrets/tama-academy.env`, GitHub Actions secrets, Vercel project env vars). Quand on aura les 3 instances Clerk × 3 projets Supabase × 3 `JWT_CHILD_SECRET`, la matrice deviendra impossible à maintenir manuellement.

**Action** :

- Évaluer 3 options : Doppler, Vercel env manager natif (depuis 2025), Infisical.
- Critères : sync bi-directionnel (CI + dev local), audit log, RBAC, support Marketplace Vercel.
- POC sur les secrets Clerk staging + Supabase staging (les moins sensibles), 1 sprint de test.
- Décision GO/NO-GO documentée dans `docs/sprint-N-decisions.md`.

**Échéance** : Sprint 2-3 (avant que le nombre d'env vars dépasse ~30).

---

### 6. Réactiver Vercel Preview auto-deploy

**Risque actuel** : Vercel Preview est **désactivée** sur ce projet via Dashboard → Settings → Git → **Ignored Build Step** (commande `echo "skip preview" && exit 0`). Décision prise en J3 pour ne pas bloquer la PR #3 sur l'absence d'env vars Vercel Preview. **Tant que c'est désactivé, on perd la valeur "URL preview par PR" pour reviewer visuellement les changements UI**.

**Action de réactivation** :

1. Pré-requis bloquants : items 1, 2, 3, 4 traités (sinon on réactive sur des secrets dev partagés = retour au problème initial).
2. Vercel Dashboard → `tama-academy` → Settings → Git → **Ignored Build Step** → vider le champ ou décocher l'override.
3. Ouvrir une PR de test (peut être vide, juste un commit `chore: test preview`) → vérifier qu'une URL `tama-academy-git-<branch>.vercel.app` est créée et que le déploiement passe.
4. Vérifier le webhook Clerk staging (item 2) reçoit les events depuis cette URL.

**Date butoir suggérée** : **avant la fin du Sprint 1**, sinon la dette devient invisible (les contributeurs oublient l'existence du flag Ignored Build Step).

---

## Priorité 3 — Hygiène / hardening

### 7. Auditer `credentials.txt` legacy dans `~/Documents/tama-secrets/`

**Risque actuel** : le coffre-fort `~/Documents/tama-secrets/` contient un fichier `credentials.txt` (10 jours, 10880 bytes) non audité. Il provient probablement de l'époque Sorobrain et peut contenir des secrets périmés, des accès tiers oubliés, ou des PII. Sur une plateforme RGPD pour mineurs, traîner un fichier secrets non-audité long terme n'est pas une bonne hygiène.

**Action** :

- Lecture du fichier (par Samir, jamais via assistant).
- Pour chaque secret : (a) toujours utilisé → migrer vers `tama-academy.env`, (b) périmé → supprimer + révoquer côté provider si possible, (c) inconnu → enquête puis décision.
- Archive le fichier nettoyé sous `credentials.archived-YYYY-MM-DD.txt` ou supprime-le complètement après migration.

**Échéance** : avant fin Sprint 1 (pas urgent, mais à ne pas laisser traîner).

---

### 8. Durcir le test E2E `/api/health`

**Risque actuel** : le test `tests/e2e/auth-redirect.spec.ts` "public route `/api/health` n'est pas bloquée par le proxy" accepte aujourd'hui **200 OU 503** pour contourner le fait que `DATABASE_URL` est un placeholder en CI (`SELECT 1` échoue → 503). C'est un raccourci pragmatique pour J3, mais ça affaiblit la sémantique du test : on ne détecte pas une régression où le proxy laisse passer la route mais le handler renverrait toujours 503 même avec une vraie BDD.

**Deux options à arbitrer** :

- **(a) Fournir une `DATABASE_URL` factice valide en CI + assertion stricte 503** : on garantit que le SELECT échoue avec une erreur de connexion réseau, pas avec une erreur d'env. Permet de tester de manière déterministe le code path "DB indisponible".
- **(b) Splitter le test en deux** : un test "proxy ne bloque pas" qui assert `response.status() !== 307 && !== 401` (lisible côté sécurité), et un second test conditionnel qui assert `200` uniquement si `process.env.DATABASE_URL` pointe vers une vraie BDD (skip en CI, run en local + staging).

**Échéance** : Sprint dédié "hardening tests" OU couplé avec la mise en place du projet Supabase staging (item 3), parce que ce sera le moment où on pourra écrire un test `/api/health` qui hit une vraie BDD.

---

## Process incidents

Section dédiée aux **incidents de process** (pas de dette technique sur le code) — leçons apprises pendant les sprints qui doivent être mémorisées pour ne pas se reproduire. Format : date + contexte court + règle préventive à respecter strictement.

### PI-001 — Migration appliquée d'abord en BDD via MCP, réconciliée rétroactivement dans Drizzle (2026-05-19, PR #4)

**Contexte** : pendant la session d'audit post-Sprint 0 du 2026-05-19, les 11 advisors `auth_rls_initplan` et 2 advisors `unindexed_foreign_keys` remontés par le Supabase Database Linter ont été corrigés via `apply_migration` MCP **directement sur le projet `mrioviqfnkcqqnwxwlqn`**, AVANT que le SQL correspondant existe dans `src/lib/db/migrations/`. La réconciliation s'est faite rétroactivement le lendemain (création de `0004_perf_rls_initplan_and_fk_indexes.sql` + mise à jour manuelle de `meta/_journal.json` pour ajouter aussi les entrées manquantes 0002 et 0003 qui avaient déjà subi le même décalage en Sprint 0).

**Pourquoi c'est un anti-pattern** :

- Le source-of-truth Drizzle (fichier migration + `_journal.json`) ne reflète plus l'état réel de la BDD.
- Si un autre dev fait `pnpm db:generate` pendant la fenêtre de désynchronisation, il génère une migration qui réapplique ou contredit les changements MCP.
- La PR n'est plus auditable atomiquement : on commit du SQL "déjà appliqué" — l'historique git ne décrit plus la séquence réelle d'exécution.
- En cas de rollback (`git revert` du commit migration), la BDD n'est pas rollback automatiquement.
- En CI sur un projet Supabase staging/prod neuf (cf. items 1, 3 de ce backlog), `pnpm db:migrate` se base uniquement sur les fichiers migration et `_journal.json` — un fichier manquant = un état BDD divergent silencieusement.

**Règle préventive à respecter strictement post-Sprint 0** :

> **Discipline `pnpm db:migrate` first** : toute modification de schéma ou de policy RLS commence OBLIGATOIREMENT par (a) écrire le fichier `XXXX_<description>.sql` dans `src/lib/db/migrations/`, (b) tester localement avec `pnpm db:migrate` contre un projet Supabase dev, (c) committer et seulement APRÈS pousser via CI ou via `apply_migration` MCP sur staging/prod. **`apply_migration` MCP n'est jamais utilisé sur un projet partagé sans qu'un fichier source ait été commité au préalable.**

**Application** : ajouter cette règle au `CONTRIBUTING.md` §RLS et au `CLAUDE.md` workspace pour qu'elle remonte dans le contexte de toute conversation Cursor future. À faire en début de Sprint 1.

---

## Done

_(vide pour l'instant — chaque item résolu vient ici avec date + n° issue + n° PR de résolution)_
