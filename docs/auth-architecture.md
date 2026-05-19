# Architecture auth — PR #3 (Sprint 0)

Document de référence pour la chaîne d'authentification / autorisation **adultes (Clerk)** + **enfants (JWT custom)** + **RLS Postgres user-aware**. À lire avant toute modification de `src/proxy.ts`, `src/lib/auth/*`, `src/lib/supabase/*` ou des policies RLS.

> Référence externe verrouillée : [docs/clerk-supabase-jwt-checklist.md](./clerk-supabase-jwt-checklist.md) §0 (chaîne d'identité) et §4 (`auth.uid()` interdit).

---

## 1. Vue d'ensemble

```
┌────────────────────────────────────────────────────────────────────────┐
│                              Navigateur                                │
│  parent / Sensei / admin (Clerk)         enfant (cookie httpOnly)      │
└──────────────────────────┬───────────────────────────┬─────────────────┘
                           │                           │
                           ▼                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       src/proxy.ts (Edge)                            │
│  - isPublicRoute()  → bypass                                         │
│  - isChildRoute()   → verifyChildToken(cookie) ou redirect "/"       │
│  - sinon            → clerkMiddleware → auth.protect() ou handshake  │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ requête passée
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│         Server Component / Server Action / Route Handler             │
│                                                                      │
│  ┌──────────────────────────────┐  ┌────────────────────────────┐    │
│  │  Identité Clerk              │  │  JWT enfant (jose)         │    │
│  │  src/lib/auth/clerk.ts       │  │  src/lib/auth/child-       │    │
│  │  - getClerkUserId()          │  │    session.ts              │    │
│  │  - requireClerkUserId()      │  │  - signChildToken()        │    │
│  │  - getSupabaseJwt()          │  │  - verifyChildToken()      │    │
│  └──────────────┬───────────────┘  └────────────────────────────┘    │
│                 │                                                    │
│                 ▼                                                    │
│  ┌──────────────────────────────┐  ┌────────────────────────────┐    │
│  │  Client Supabase user-aware  │  │  Client Supabase admin     │    │
│  │  src/lib/supabase/server.ts  │  │  src/lib/supabase/server.ts│    │
│  │  - getSupabaseClerkClient()  │  │  - getSupabaseServiceRole  │    │
│  │    (injecte JWT Clerk)       │  │    Client() (BYPASS RLS)   │    │
│  └──────────────┬───────────────┘  └────────────┬───────────────┘    │
└─────────────────┼────────────────────────────────┼────────────────────┘
                  │                                │
                  ▼                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Postgres (Supabase)                               │
│  - Third-Party Auth Clerk active (JWKS RS256)                        │
│  - Policies RLS user-aware : auth.jwt() ->> 'sub' = users.clerk_id   │
│  - service_role = BYPASSRLS (Drizzle webhook / cron / scripts)       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Deux mondes, deux mécanismes

### 2.1 Adultes (parents, Sensei, admin) → Clerk

- Auth via `@clerk/nextjs` (sign-in hébergé Clerk en dev).
- `clerkMiddleware` dans `src/proxy.ts` appelle `auth.protect()` sur toutes les routes non publiques et non enfant.
- Pour parler à Supabase avec **leur** identité (RLS user-aware), le code serveur passe par `getSupabaseClerkClient()` qui :
  1. Demande à Clerk le JWT signé pour le template `supabase` (`getToken({ template: "supabase" })`).
  2. Crée un `SupabaseClient` avec `Authorization: Bearer <jwt>` dans les headers globaux.
  3. La requête arrive sur Postgres → Supabase valide le JWT via JWKS Clerk → `auth.jwt() ->> 'sub'` retourne le Clerk user ID → les policies RLS filtrent.

> **Règle absolue** : ne jamais utiliser `getSupabaseServiceRoleClient()` dans une Server Action / Server Component utilisateur. Cette fonction est réservée aux webhooks Clerk, aux Vercel Cron, et aux scripts admin manuels.

### 2.2 Enfants (< 13 ans) → JWT custom HS256

- Les enfants **n'ont pas** de compte Clerk (RGPD + UX).
- Un parent authentifié Clerk crée son enfant via Server Action. Une seconde Server Action (à venir Sprint 4) appelle `signChildToken({ childId, parentClerkId, scope })` et dépose le JWT en cookie httpOnly `tama_child_session`.
- Le proxy intercepte `/eleve/*`, lit le cookie, appelle `verifyChildToken(cookie.value)`. Si invalide ou absent → redirect `/`.
- Cookie : `httpOnly`, `secure` en prod, `sameSite=lax`, `path=/eleve`.
- Algorithme : **HS256** (clé symétrique partagée serveur ; on n'a pas besoin de JWKS pour des tokens consommés uniquement par notre propre proxy).
- Max age **par défaut 1h**, cap dur **2h** (`MAX_AGE_HARD_CAP_SECONDS` dans `child-session.ts`). Tradeoff stateless V1 : pas de liste de révocation ; révocation globale = rotation du secret `JWT_CHILD_SECRET`.

---

## 3. RLS user-aware

Migration : `src/lib/db/migrations/0003_rls_user_aware.sql`.

- Sur les 4 tables `users`, `children`, `parental_consents`, `user_events` :
  - `REVOKE ALL ... FROM anon` (défense en profondeur).
  - Policies `<table>_authenticated_<verb>` filtrées par `auth.jwt() ->> 'sub'`.
  - `parental_consents_authenticated_update` ré-impose `child_id IN (children of own user)` pour bloquer la pollution d'audit trail RGPD.
  - `users` : colonnes `role` et `clerk_id` non modifiables (`GRANT UPDATE` colonne par colonne, escalade rôle bloquée).
  - `user_events` : append-only (UPDATE/DELETE révoqués).
- `service_role` garde une policy `_service_role_all` (utilisée par Drizzle via `DATABASE_URL` = utilisateur Postgres avec `BYPASSRLS`).

> **Anti-régression** : un test E2E `@critical` dans `tests/e2e/rls.spec.ts` vérifie qu'un attaquant avec le `NEXT_PUBLIC_SUPABASE_ANON_KEY` ne peut SELECT/INSERT sur aucune des tables sensibles. À étendre Sprint 1 avec un second compte Clerk pour les tests croisés A↔B.

---

## 4. Garde-fous transverses

- **Erreurs typées** : `TamaAcademyError` (`src/lib/errors.ts`) avec `userMessage` (français, montrable) vs `technicalMessage` (technique, log uniquement).
- **Logger Pino** (`src/lib/logger.ts`) : 15 paths PII auto-redactés (`email`, `password`, `phone`, `firstName`, `lastName`, `birthDate`, etc.). JSON en prod, pino-pretty en dev. Sentinel `server-only` (Node runtime uniquement).
- **Redaction PII** (`src/lib/security/redaction.ts`) : `redactPII(text)` matche emails / téléphones FR/internationaux / JWT triple-segment. `redactStudent(student, level)` projette un sous-ensemble selon `public | authenticated | owner`.
- **Validation Zod** : `validateInput(schema, input, context)` — wrapper qui throw `TamaAcademyError("INVALID_INPUT")` avec message générique côté user et erreurs détaillées côté log.
- **Consentement parental** : refactoré en deux paires explicites pour éviter les pièges d'élévation de privilège :
  - `verifyParentalConsentAsParent(client, ...)` / `requireParentalConsentAsParent` : prend un `SupabaseClient` injecté (user-aware via Clerk JWT).
  - `verifyParentalConsentSystem(...)` / `requireParentalConsentSystem` : utilise Drizzle (BYPASSRLS) — **uniquement** webhook / cron / admin.

---

## 5. Checklist avant d'ajouter une route protégée

- [ ] Route adulte ? → couverte automatiquement par `auth.protect()` (rien à faire dans le proxy).
- [ ] Route publique nécessaire ? → ajouter à `isPublicRoute` dans `src/proxy.ts` (whitelist explicite, jamais de wildcard).
- [ ] Route enfant `/eleve/*` ? → couverte automatiquement par `isChildRoute` + cookie vérifié.
- [ ] Server Component / Action lit Supabase ? → `getSupabaseClerkClient()` (jamais service role).
- [ ] Server Component / Action écrit dans une table avec PII enfant ? → vérifier consentement avec `requireParentalConsentAsParent`.
- [ ] Nouvelle table ? → checklist [CONTRIBUTING § "Ajouter une table BDD"](../CONTRIBUTING.md).
- [ ] Webhook ou cron qui doit bypasser RLS ? → documenter pourquoi dans le code, utiliser `getSupabaseServiceRoleClient()` ou Drizzle direct.

---

## 6. Fichiers de référence

| Fichier                                         | Rôle                                                 |
| ----------------------------------------------- | ---------------------------------------------------- |
| `src/proxy.ts`                                  | Routage Clerk + JWT enfant                           |
| `src/lib/auth/clerk.ts`                         | Identity helpers Clerk (server-only)                 |
| `src/lib/auth/child-session.ts`                 | Sign / verify JWT enfant (HS256, jose)               |
| `src/lib/supabase/server.ts`                    | Clients Supabase user-aware + service-role           |
| `src/lib/security/consent.ts`                   | Verify / require parental consent (parent vs system) |
| `src/lib/security/redaction.ts`                 | `redactPII` + `redactStudent` 3 niveaux              |
| `src/lib/security/validation.ts`                | `validateInput` (wrapper Zod)                        |
| `src/lib/errors.ts`                             | `TamaAcademyError` + typeguard                       |
| `src/lib/logger.ts`                             | Pino + redaction paths                               |
| `src/app/api/clerk/webhook/route.ts`            | Webhook `user.created` → Drizzle insert              |
| `src/lib/db/migrations/0003_rls_user_aware.sql` | Policies RLS user-aware (4 tables)                   |
| `tests/e2e/rls.spec.ts`                         | RLS contre attaquant anon (4 scénarios)              |
| `tests/e2e/auth-redirect.spec.ts`               | Redirections proxy (5 scénarios)                     |
| `tests/unit/lib/auth/child-session.test.ts`     | JWT enfant (19 tests)                                |
| `tests/unit/lib/security/*.test.ts`             | Security helpers (29 tests cumulés)                  |
