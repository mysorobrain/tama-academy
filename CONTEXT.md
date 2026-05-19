# CONTEXT — Tama Academy

État courant du projet et roadmap immédiate. **Source de vérité** : si un autre doc contredit ce fichier, c'est ce fichier qui prime ; les autres docs doivent être mis à jour en parallèle dans la même PR.

> Conventions et règles d'équipe → [CONTRIBUTING.md](./CONTRIBUTING.md)
> Variables d'environnement → [.env.example](./.env.example)
> Architecture auth → [docs/auth-architecture.md](./docs/auth-architecture.md)
> Backlog dette technique → [docs/post-sprint0-todo.md](./docs/post-sprint0-todo.md)

---

## Statut courant

**Sprint 0 — Foundation : terminé le 19 mai 2026.**
3 PRs mergées, 14 commits cumulés sur la PR #3 (la plus grosse), 0 incident bloquant.
Prochain jalon : **Sprint 1 — Onboarding + Méthode Tama** (à planifier).

---

## Sprint 0 — récap done (3 PRs)

### PR #1 — `scaffold-foundation` (J1)

Bootstrap technique : Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind v4 + ESLint flat config + Prettier + Husky + commitlint + Vitest + Playwright skeletons + CI GitHub Actions (Quality + E2E jobs) + landing FR minimal + 4 error boundaries (`error.tsx`, `not-found.tsx`, `loading.tsx`, `global-error.tsx`).

### PR #2 — `feat/drizzle-schemas` (J2 matin)

Drizzle ORM setup + 4 schémas modulaires (`users`, `children`, `parental_consents`, `user_events`) + migration unique avec `ENABLE ROW LEVEL SECURITY` + policies CRUD initiales + triggers `tama_set_updated_at()` + drizzle-kit `migrate` (jamais `push`) + smoke test RLS Vitest.

### PR #3 — `feat/auth-clerk-supabase` (J2 PM + J3, 14 commits)

Auth + RLS user-aware + security helpers. Découpée en commits atomiques :

| Commit | Sujet                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| C1     | `chore(deps)` — `@clerk/nextjs`, `svix`, `jose`, `pino`, `zod`                                                               |
| C2     | `chore(env)` — enrichir `.env.example` (Clerk + JWT enfant + Pino)                                                           |
| C3a    | `chore(deps)` — `@supabase/supabase-js`                                                                                      |
| C3b    | `feat(auth)` — `lib/auth/clerk.ts` + `lib/supabase/server.ts`                                                                |
| C4     | `feat(api)` — webhook `POST /api/clerk/webhook` + handler `user.created` (svix HMAC)                                         |
| C5     | `feat(db)` — migration `0003_rls_user_aware.sql` (policies basées sur `auth.jwt() ->> 'sub'`)                                |
| C6     | `feat(auth)` — `src/proxy.ts` (Clerk middleware sur routes adultes)                                                          |
| C7     | `feat(auth)` — JWT enfant HS256 (`signChildToken`/`verifyChildToken`) + 19 unit tests                                        |
| C8     | `feat(security)` — `TamaAcademyError` + Pino + `redactPII` + `validateInput` + `consent.*AsParent`/`*System` + 35 unit tests |
| C9     | `test(e2e)` — `rls.spec.ts` (4) + `auth-redirect.spec.ts` (5)                                                                |
| C10    | `docs` — `docs/auth-architecture.md` + README + CONTRIBUTING                                                                 |
| C11    | `ci(github-actions)` — inject Clerk + Supabase secrets dans env workflow                                                     |
| C11.1  | `fix(e2e)` — `/api/health` accepte 200 OU 503 (CI placeholder DB)                                                            |
| C12    | `docs(backlog)` — `docs/post-sprint0-todo.md` (8 items dette)                                                                |

**Total final** : 55 unit tests + 10 E2E tests, tous verts en CI.

### Reporté du plan Sprint 0 initial vers Sprint 1+

Le plan initial prévoyait aussi PR #4 (i18n + helpers Tama) et PR #5 (design tokens + 3 composants shadcn + Sentry + PostHog). PR #3 a absorbé une partie de PR #4 (logger Pino + `validateInput` + `verifyParentalConsent` + `redactPII` réel au lieu de no-op). Le reste est repoussé sans bloquer Sprint 0 :

- i18n `next-intl` FR / EN / AR / ES
- Tokens design (9 ceintures + registres Kids/Academy + 3 régions)
- 3 composants shadcn (button / card / alert)
- Sentry + PostHog EU câblés

---

## Architecture en place

| Couche                 | Fichier(s)                           | Rôle                                                             |
| ---------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| Identité adultes       | `src/lib/auth/clerk.ts`              | Clerk (`getClerkUserId`, `requireClerkUserId`, `getSupabaseJwt`) |
| Identité enfants       | `src/lib/auth/child-session.ts`      | JWT HS256 + cookie httpOnly `tama_child_session`                 |
| Routage                | `src/proxy.ts`                       | `clerkMiddleware` adultes + cookie gate `/eleve/*`               |
| Données RLS user-aware | `src/lib/supabase/server.ts`         | `getSupabaseClerkClient()` (JWT Clerk injecté)                   |
| Données admin bypass   | `src/lib/supabase/server.ts`         | `getSupabaseServiceRoleClient()` (webhook/cron uniquement)       |
| Webhook                | `src/app/api/clerk/webhook/route.ts` | `user.created` → insert `users` via Drizzle (BYPASSRLS)          |
| Consentement           | `src/lib/security/consent.ts`        | Split explicite `*AsParent` (user-aware) / `*System` (bypass)    |
| PII redaction          | `src/lib/security/redaction.ts`      | `redactPII` + `redactStudent` 3 niveaux                          |
| Validation entrée      | `src/lib/security/validation.ts`     | `validateInput<T>` wrapper Zod                                   |
| Erreurs typées         | `src/lib/errors.ts`                  | `TamaAcademyError` (userMessage vs technicalMessage)             |
| Logger                 | `src/lib/logger.ts`                  | Pino + 15 paths PII auto-redactés                                |

**RLS user-aware actif** sur 4 tables (`users`, `children`, `parental_consents`, `user_events`) via `auth.jwt() ->> 'sub'` (pattern Third-Party JWT Clerk, `auth.uid()` interdit cf. `docs/clerk-supabase-jwt-checklist.md` §4). Escalade rôle bloquée par `GRANT UPDATE` colonne par colonne sur `users`. `user_events` append-only. `REVOKE ALL FROM anon` partout (défense en profondeur).

---

## Sprint 1 — prochain jalon (à planifier)

Scope défini par Samir lors du wrap-up Sprint 0 :

- **Core auth UI** — pages sign-in / sign-up parent, sign-in enfant (`/eleve/login`), wiring complet des composants Clerk Elements.
- **Onboarding** — parcours d'inscription parent avec création de l'enfant et consentement parental tracé en BDD.
- **Funnel MBTI** — 3 questions courtes pendant l'inscription stage pour détecter le profil parent (Gardien / Idéaliste / Stratège / Donneur) et personnaliser les emails (cf. user rule 05).
- **26 formules Méthode Tama** — schéma de données + UI exercice pas-à-pas (8 Petits Amis + 18 Grands Amis, cf. user rule 02).
- **`lib/methode-tama/formula-resolver.ts`** — moteur des 4 règles de priorité (Direct → Petit Ami → Grand Ami → Enchaînement).
- **7 Sceaux** — système de progression intermédiaire dans chaque ceinture (mécanique à spécifier).
- **Seed import** — pipeline d'import des seeds pédagogiques depuis le repo séparé `tama-academy-pedagogy-vault` (décision #19).

**Dépendances à traiter en parallèle (Sprint 1 ou avant)** : i18n `next-intl`, design tokens, composants shadcn de base, observabilité (Sentry + PostHog EU) — héritage Sprint 0 reporté, non bloquant mais à séquencer pour ne pas accumuler.

---

## Dette technique tracée

`docs/post-sprint0-todo.md` — **8 items** issus de la PR #3, répartis en 3 priorités :

1. **Isolation environnements** (items 1-4) — instance Clerk dédiée Preview/staging, endpoint webhook Preview, projet Supabase staging, 3 `JWT_CHILD_SECRET` distincts. **Bloquant** avant la réactivation Vercel Preview.
2. **Infrastructure / outillage** (items 5-6) — évaluer Doppler ou Vercel env manager ; **réactiver Vercel Preview auto-deploy** (désactivée via Ignored Build Step pendant J3, date butoir fin Sprint 1).
3. **Hygiène / hardening** (items 7-8) — auditer `credentials.txt` legacy, durcir test E2E `/api/health` (raccourci 200|503 actuel à remplacer par split proxy/DB).

Chaque item résolu va dans la section "Done" du même fichier avec date + n° issue + n° PR.

---

## Pour démarrer

```bash
git clone git@github.com:mysorobrain/tama-academy.git
cd tama-academy
corepack enable
pnpm install
cp .env.example .env.local
# Renseigner .env.local (cf. docs/clerk-supabase-jwt-checklist.md)
pnpm dev
```

Hiérarchie de lecture suggérée pour un nouveau contributeur :

1. [README.md](./README.md) — pitch + stack + démarrage 30s.
2. [CONTRIBUTING.md](./CONTRIBUTING.md) — conventions code, RLS, ajout de table.
3. [docs/auth-architecture.md](./docs/auth-architecture.md) — diagramme couches auth + helpers.
4. [docs/clerk-supabase-jwt-checklist.md](./docs/clerk-supabase-jwt-checklist.md) — config Third-Party JWT.
5. Ce fichier (CONTEXT.md) pour comprendre où on en est et ce qui suit.
