# Contribuer à Tama Academy

Ce dépôt suit une stack **Next.js 16 (App Router)**, **TypeScript strict**, **Supabase (Postgres + RLS)**, **Clerk**, **Drizzle**, **Tailwind v4**.

## Prérequis

- **Node.js 22 LTS** (Active LTS au 19/05/2026 ; Node 20 entre en maintenance). Le `package.json` du dépôt verrouille `engines.node` à `>=22.11.0`.
- **pnpm** comme gestionnaire de paquets.
- Accès aux projets **Clerk** et **Supabase** (dev).

## Installation

```bash
pnpm install
cp .env.example .env.local
# Renseigner .env.local (voir commentaires dans .env.example)
pnpm dev
```

## Qualité du code

- **Lint :** `pnpm lint`
- **Types :** `pnpm typecheck`
- Avant un merge : respect du **pre-commit** (lint-staged, tests liés, etc.) selon la configuration du dépôt.

### next-intl × Cache Components (Next.js 16) — gotcha à connaître

Avec **Next.js 16**, les directives `use cache`, `cacheLife`, `cacheTag` créent un cache **par segment / clé**. Si la clé n'inclut pas la **locale**, on a un bug invisible.

**Piège typique :**

```tsx
// app/[locale]/marketing/page.tsx
"use cache";

import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("marketing");
  return <h1>{t("hero.title")}</h1>;
}
```

Sans précaution, le premier visiteur **FR** met le contenu FR en cache pour la clé du segment, et un visiteur **EN** suivant voit **le contenu FR sans aucune erreur** (pas de crash, pas de log, juste du contenu dans la mauvaise langue).

**Mitigations acceptées dans le dépôt :**

1. **`cacheTag` localisé** sur chaque route cachée :

   ```ts
   "use cache";
   import { cacheTag } from "next/cache";

   export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
     const { locale } = await params;
     cacheTag(`locale-${locale}`);
     // ...
   }
   ```

2. **Désactivation explicite du cache** pour les routes localisées dynamiques, avec un commentaire qui justifie pourquoi (PR review obligatoire si la perf en souffre).

**Règle d'équipe (bloquante en review) :**

- Toute page / layout **mis en cache** dont le contenu dépend de la locale doit être **testée manuellement sur au moins 2 locales** (ex. `fr` et `en`) avant merge.
- Documenter dans la PR la stratégie retenue (`cacheTag`, désactivation, ou cache OK car contenu non localisé).

## Tester la RLS (obligatoire)

La **Row Level Security** est une exigence **non négociable** : toute nouvelle table exposée via le client Supabase **doit** avoir RLS activé et des policies testées.

### Principes

1. **Défense en profondeur :** le code applicatif filtre aussi par ownership, mais la dernière ligne de défense reste Postgres.
2. **`service_role` réservé serveur** (migrations, webhooks, scripts admin). **Jamais** dans le bundle client ni dans une Server Action ouverte à l'utilisateur final sans garde-fou.
3. **Pas de contournement par défaut :** interdit de merger une migration qui **désactive** RLS ou ajoute `USING (true)` sur des données enfants / parents sans revue sécu explicite.
4. **`auth.uid()` est interdit** dans les policies tant qu'on est sur le pattern **Third-Party JWT (JWKS Clerk)** : il retourne `null`. Utiliser **exclusivement** `auth.jwt() ->> 'sub'` (cf. [docs/clerk-supabase-jwt-checklist.md](./docs/clerk-supabase-jwt-checklist.md) §4.2). Une policy avec `auth.uid()` passe la review parce qu'elle compile, et bloque silencieusement la prod.

### Stratégie de test

| Couche      | Outil                                                    | Rôle                                                                            |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Rapide      | **Vitest + 2 clients Supabase** (session A vs session B) | Vérifier qu'une policy refuse bien l'accès croisé                               |
| Bloquant CI | **Playwright E2E** (`@critical`, `@security`)            | Parcours réaliste : utilisateur A ne voit pas / ne modifie pas les données de B |

### Jeu de données minimal

1. Créer **deux comptes Clerk** : **Parent A** et **Parent B**.
2. Pour chaque parent, créer **un enfant** rattaché à `users.id` via `children.parent_id` (cf. chaîne d'identité dans la checklist JWT §0).
3. Obtenir un **JWT Supabase valide** pour A et pour B via `getToken({ template: 'supabase' })`.

### Scénarios à couvrir (checklist)

Pour chaque table sensible :

- [ ] **SELECT croisé :** A voit ses lignes ; A **ne voit pas** les lignes de B.
- [ ] **INSERT forcé :** A ne peut pas créer une ligne en forçant l'identité de B (ex. `parent_id` = users.id de B). Si la policy `WITH CHECK` est correcte, l'INSERT est rejeté.
- [ ] **UPDATE croisé :** A ne peut pas modifier une ligne appartenant à B.
- [ ] **DELETE croisé :** A ne peut pas supprimer une ligne appartenant à B.
- [ ] **Escalade de privilèges (`@security`) :** A **ne peut pas** se promouvoir admin via `UPDATE users SET role = 'admin' WHERE clerk_id = '<sub A>'`. Test distinct, marqué `@security`, bloquant CI. Référence : brief Sprint 0 v2 §14 critère 13.

### Requêtes SQL utiles (Supabase SQL Editor — **dev only**)

Utiliser uniquement sur un projet de **développement** ; ne pas copier de PII dans des outils tiers.

```sql
-- Tables sans RLS (à corriger avant merge)
select c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname = 'public'
  and not c.relrowsecurity;

-- RLS activé mais aucune policy (accès bloqué pour le rôle authentifié via RLS)
select c.relname, count(p.polname) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where c.relkind = 'r'
  and n.nspname = 'public'
  and c.relrowsecurity
group by c.oid, c.relname
having count(p.polname) = 0;

-- Policies qui utilisent auth.uid() (toutes silencieusement cassées avec JWKS Clerk)
select schemaname, tablename, policyname, qual, with_check
from pg_policies
where schemaname = 'public'
  and (qual like '%auth.uid()%' or with_check like '%auth.uid()%');
```

### Définir une E2E RLS

Convention du dépôt :

- Attributs **`data-test`** stables pour les éléments critiques (pas de sélecteurs CSS fragiles).
- Tag **`@security`** ou **`@critical`** sur les tests qui doivent bloquer un merge si la RLS régresse.

Barre minimale de succès :

> Parent A ouvre `/eleve` → voit son enfant. Session B ouvre la même page → **ne voit pas** l'enfant de A. Parent A essaie de `UPDATE` son rôle pour `admin` → refusé.

### En cas d'échec

1. Vérifier le **JWT** (`sub`, `aud`, `role`, `iss`) — checklist Clerk ↔ Supabase §1.5.
2. Vérifier qu'**aucune policy** n'utilise `auth.uid()` (requête SQL ci-dessus). C'est le bug n°1 silencieux sur le pattern JWKS.
3. Vérifier la chaîne `JWT.sub → users.clerk_id → users.id → children.parent_id`. Une jointure manquante = 0 ligne.
4. **Ne pas** « corriger » en élargissant une policy (`USING (true)` ou `WITH CHECK (true)`) sans revue sécu.

## Ajouter une table BDD

Checklist pour ajouter une nouvelle table (à cocher dans la PR description) :

- [ ] Fichier schema modulaire dans `src/lib/db/schema/<domain>.ts` (jamais un mega-`schema.ts`).
- [ ] `ALTER TABLE <x> ENABLE ROW LEVEL SECURITY;` **dans la même migration** que le `CREATE TABLE`. Pas de follow-up.
- [ ] Policies **SELECT / INSERT / UPDATE / DELETE** explicites dans la **même PR** (pas en suivi), utilisant `auth.jwt() ->> 'sub'` — jamais `auth.uid()`.
- [ ] Trigger `tama_set_updated_at()` ajouté si la table a une colonne `updated_at`.
- [ ] Au moins **1 test E2E `@security`** qui prouve qu'un user A ne lit pas / ne modifie pas les données d'un user B.
- [ ] Si la table contient des données enfants / PII : ajouter une entrée dans la routine de suppression RGPD (`POST /api/account/delete`).
- [ ] Ligne ajoutée dans le `CHANGELOG.md` du sprint (nom de la table, finalité, sprint d'origine).

## Ressources internes

- Checklist JWT : [docs/clerk-supabase-jwt-checklist.md](./docs/clerk-supabase-jwt-checklist.md)
- Variables d'environnement : [.env.example](./.env.example)
