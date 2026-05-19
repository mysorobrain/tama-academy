# Sprint 0 — Plan d'exécution

Document produit en réponse au workflow §18 du brief Sprint 0 v2 (validation pré-exécution).

Date : 19 mai 2026.
Statut : validé Samir + Claude, en cours d'exécution.

---

## 1. Décisions verrouillées avant le code

| Décision                | Choix                                                                                           | Justification                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Node engine             | `>=22.11.0` (Node 22 LTS)                                                                       | Active LTS au 19/05/2026 ; CONTRIBUTING.md v2 (commit `af281fc`) |
| Package manager         | `pnpm@11.x` via Corepack                                                                        | Brief §1 + latest stable                                         |
| TypeScript              | `^5.9` (dernier 5.x)                                                                            | Compat écosystème (drizzle, ts-eslint) prime sur TS 6 récent     |
| Stratégie autres majors | Latest stables                                                                                  | Vitest 4, ESLint 10, lint-staged 17, commitlint 21, Pino 10      |
| `proxy.ts` Next.js 16   | Confirmé via `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` | Convention rebaptisée depuis `middleware.ts` (v16.0.0)           |

## 2. Versions package.json cibles (PR #1)

| Package                                              | Version                 |
| ---------------------------------------------------- | ----------------------- |
| `next`                                               | `16.2.6`                |
| `react`, `react-dom`                                 | `19.2.6`                |
| `typescript`                                         | `^5.9`                  |
| `tailwindcss`                                        | `^4.3.0`                |
| `@tailwindcss/postcss`                               | latest 4.x              |
| `drizzle-orm`                                        | `^0.45.2`               |
| `drizzle-kit`                                        | `^0.31.10` (dev)        |
| `@supabase/supabase-js`                              | `^2.106.0`              |
| `@clerk/nextjs`                                      | `^7.3.7`                |
| `jose`                                               | `^6.2.3`                |
| `zod`                                                | `^4.4.3`                |
| `next-intl`                                          | `^4.12.0`               |
| `pino`                                               | `^10.3.1`               |
| `pino-pretty`                                        | latest (dev)            |
| `motion`                                             | `^12.39.0`              |
| `@sentry/nextjs`                                     | `^10.53.1`              |
| `posthog-js`                                         | `^1.374.2`              |
| `posthog-node`                                       | `^5.34.6`               |
| `vitest`                                             | `^4.1.6` (dev)          |
| `@playwright/test`                                   | `^1.60.0` (dev)         |
| `eslint`                                             | `^10.4.0` (dev)         |
| `@typescript-eslint/*`                               | latest aligné ESLint 10 |
| `prettier`                                           | `^3.8.3` (dev)          |
| `husky`                                              | `^9.1.7` (dev)          |
| `lint-staged`                                        | `^17.0.5` (dev)         |
| `@commitlint/cli`, `@commitlint/config-conventional` | `^21.0.1` (dev)         |

## 3. Découpage en 5 PRs atomiques

| PR     | Branche                              | Jour                   | Scope principal                                                                                                                                                                                                                                                            | Tests inclus                                                      |
| ------ | ------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **#1** | `scaffold-foundation`                | J1 (~5h)               | Bootstrap : Next 16, React 19, TS strict, Tailwind v4, ESLint flat v9 (lire v10 ici), Prettier, Husky, commitlint, Vitest + Playwright skeletons, CI GitHub Actions, landing minimal, 4 error boundaries (`error.tsx`, `not-found.tsx`, `loading.tsx`, `global-error.tsx`) | 1 smoke `home.spec.ts` (rend FR)                                  |
| **#2** | `db-schemas-rls`                     | J2 matin (~4h)         | Drizzle setup + 4 schémas modulaires (`users`, `students`, `consents`, `events`) + migration unique avec `ENABLE RLS` + policies SELECT/INSERT/UPDATE/DELETE + triggers `tama_set_updated_at()` + drizzle-kit `migrate` (jamais `push`)                                    | Smoke RLS Vitest 2 clients Supabase (user A vs B)                 |
| **#3** | `auth-clerk-jwt-rls`                 | J2 PM + J3 matin (~6h) | Clerk wiring (`@clerk/nextjs` ^7.3) + JWT Template `supabase` + JWKS Supabase Third-Party + `getSupabaseClerkClient` + `proxy.ts` (Clerk + JWT enfant) + webhook `user.created` (HMAC svix) + `signChildToken`/`verifyChildToken` + `/api/health`                          | 4 tests RLS effectifs E2E (`@security`) + `auth-redirect.spec.ts` |
| **#4** | `lib-security-logger-i18n`           | J3 PM (~5h)            | `verifyParentalConsent` impl réelle + `redactPII` no-op + 4 `.todo()` + `validateInput<T>` Zod + Pino logger Node + fallback Edge + helpers Tama (`getRegister`, `formatLevelAsBelt`, `belts`, `regions`) + `next-intl` FR                                                 | 6 tests unit Vitest passants + 4 todos visibles                   |
| **#5** | `design-tokens-shadcn-observability` | J4 (~5h)               | Tokens design (`tokens.css` : 9 ceintures + Kids/Academy + 3 régions) + 3 composants shadcn (button/card/alert) + Sentry câblé + PostHog EU câblé + `.env.example` final + finitions docs + checklist 26 critères §14                                                      | 1 test Sentry event + 1 test PostHog event                        |

## 4. Synchros bloquantes avec Samir

| Avant PR | Action Samir                                                                                                           | Durée  | Réf                                    |
| -------- | ---------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------- |
| #1       | `corepack enable && corepack prepare pnpm@11 --activate` (local)                                                       | 30 s   | —                                      |
| #2       | Créer projet Supabase `tama-academy` eu-central-1, clés dans `~/Documents/tama-secrets/tama-academy.env`               | 10 min | `.env.example`                         |
| #3       | Créer projet Clerk + JWT Template `supabase` (RS256, `{ aud, role, sub }`) + Supabase Third-Party JWT (JWKS Clerk URL) | 20 min | `docs/clerk-supabase-jwt-checklist.md` |
| #5       | Créer projet Sentry + PostHog EU + clés                                                                                | 10 min | `.env.example`                         |

Si une synchro est en retard, j'arrête la PR en cours sur un commit propre et j'attends.

## 5. Critères de succès Sprint 0

- 26 critères §14 binaires cochés en fin de PR #5.
- 4 tests RLS effectifs passent en CI (preuve sécurité réelle, pas théorique).
- 0 `any`, 0 `console.log` (sauf wrapper logger Edge), 0 TODO sans owner+date.
- Samir peut `git pull && pnpm install && pnpm dev` et l'app tourne.
