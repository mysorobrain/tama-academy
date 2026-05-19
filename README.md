# Tama Academy

Plateforme d'apprentissage du soroban (boulier japonais) pour enfants de 5 ans et plus, fondée sur la **Méthode Tama** validée par l'autorité pédagogique ACM.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript strict**
- **Tailwind v4** + **shadcn/ui** + **motion@12**
- **Supabase** (Postgres + RLS + Realtime + Storage)
- **Clerk** (auth parents, Sensei, admin) — JWT Third-Party vers Supabase (JWKS RS256)
- **Drizzle ORM** + migrations
- **Vercel** (hosting, Cron, Edge / Fluid Compute)
- Stripe, Resend, Sentry, PostHog (intégrations sprint ultérieur)

## Démarrage rapide

```bash
pnpm install
cp .env.example .env.local
# Remplir .env.local (voir commentaires + docs/clerk-supabase-jwt-checklist.md)
pnpm dev
```

## Documentation

- [CONTRIBUTING](./CONTRIBUTING.md) — règles équipe (RLS, ajout de table, next-intl × cache, etc.)
- [Checklist JWT Clerk ↔ Supabase](./docs/clerk-supabase-jwt-checklist.md) — configuration Third-Party JWT
- [.env.example](./.env.example) — toutes les variables d'environnement, dont celles différées

## Statut

Repo en **Sprint 0 — Foundation** (scaffold initial). PRs successives :

| PR | Branche | Objet |
|---|---|---|
| #1 | `scaffold-foundation` | Sprint 0 prep kit + infra (configs, lint, tests, design tokens) |
| #2 | _à venir_ | Drizzle setup + schemas modulaires (users, children, consents, events) + RLS |
| #3 | _à venir_ | Auth Clerk + proxy.ts + smoke RLS |
| #4 | _à venir_ | Design system tokens + composants UI de base |
| #5 | _à venir_ | i18n (next-intl) + locales fr/en/ar/es |
| #6 | _à venir_ | CI GitHub Actions + branch protection + dashboards Sentry/PostHog |

## Repo annexe

Le contenu pédagogique (seeds extraits des manuels papier validés ACM) vit dans le repo séparé `tama-academy-pedagogy-vault` (décision #19).

## Licence

Privée — © Tama Academy / Sorobrain SAS. Tous droits réservés.
