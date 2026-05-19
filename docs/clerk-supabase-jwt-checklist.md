# Checklist — JWT Clerk ↔ Supabase (Samir)

Objectif : que **chaque requête Supabase** exécutée côté client ou serveur avec le client **utilisateur** utilise un JWT **émis par Clerk**, vérifié par Supabase via le pattern **Third-Party JWT (JWKS asymétrique RS256)**, avec des policies RLS basées **exclusivement** sur `auth.jwt() ->> 'sub'`.

> ⚠️ **Règle non-négociable verrouillée pour Sprint 0 :** dans ce pattern (JWKS Clerk, pas Supabase Auth), `auth.uid()` retourne **`null`**. Toute policy qui utilise `auth.uid()` bloquera silencieusement (0 ligne). Voir §4.

Références utiles (à garder ouvert pendant la config) :

- [Supabase — Auth Clerk (JWT tiers)](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Clerk — JWT templates](https://clerk.com/docs/backend-requests/jwt-templates)

---

## 0. Pré-requis (avant de cliquer partout)

- [ ] Projet Supabase **dev** et **prod** identifiés (ne pas mélanger les URLs / clés).
- [ ] Instance Clerk **dev** et **prod** (ou environnements Clerk) alignés avec les projets Supabase.
- [ ] **Chaîne d'identité comprise et validée** (cf. brief Sprint 0 v2 §4) :

  ```
  JWT.sub  (Clerk user ID, text — ex. "user_2abc...")
     ↓
  users.clerk_id   (text, UNIQUE, indexé)
     ↓
  users.id         (uuid, PK interne)
     ↓
  children.parent_id  (uuid, FK → users.id)
     ↓
  events.child_id     (uuid, FK → children.id)
  ```

  Les policies RLS **ne joignent jamais** directement `*_user_id = sub` : elles passent par `users.clerk_id` (voir §4 pour les exemples). Il n'y a **pas** de raccourci.

- [ ] Accès admin Supabase + admin Clerk pour la même session (évite les allers-retours).

---

## 1. Clerk — JWT Template « supabase »

| Étape | Détail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Fait |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1   | Dashboard Clerk → **JWT Templates** → **New template**. Nom exact : `supabase` (réutilisé tel quel dans `getToken({ template: 'supabase' })` et dans `CLERK_JWT_TEMPLATE_SUPABASE`).                                                                                                                                                                                                                                                                                                                | [ ]  |
| 1.2   | **Signing algorithm : RS256 obligatoire** (pattern JWKS asymétrique, brief v2 §5). **Ne PAS** activer un champ « Custom signing key » avec un secret HS256 partagé : cette voie est désalignée avec Third-Party JWT (Supabase devrait vérifier le JWT via JWKS Clerk, pas via un secret commun). Si Clerk propose HS256 par défaut quelque part, c'est le mauvais champ.                                                                                                                            | [ ]  |
| 1.3   | **Claims du template** — copier ce JSON tel quel : <br><br><pre>{<br> "aud": "authenticated",<br> "role": "authenticated",<br> "sub": "{{user.id}}"<br>}</pre><br>⚠️ Référence : brief Sprint 0 du 19/05/2026 + [doc Supabase × Clerk](https://supabase.com/docs/guides/auth/third-party/clerk). Si la convention officielle a évolué depuis cette date (par ex. `aud` différent, claim `role` renommé), **stopper et prévenir Claude** avant de continuer — ne **pas** improviser un autre format. | [ ]  |
| 1.4   | **Ne pas ajouter** d'autres claims (email, téléphone, métadonnées) en Sprint 0 — privacy by design. Si on doit enrichir plus tard, on le décide explicitement, on documente, et on revérifie les RLS.                                                                                                                                                                                                                                                                                               | [ ]  |
| 1.5   | Générer un JWT de test depuis le dashboard et le décoder sur [jwt.io](https://jwt.io) **sans coller le token dans un chat public ou un LLM tiers** : vérifier `iss` (= issuer Clerk attendu en §2), `aud=authenticated`, `role=authenticated`, `sub` (Clerk user ID texte), `exp`.                                                                                                                                                                                                                  | [ ]  |

**Point de contrôle :** si `sub` n'est pas l'ID Clerk attendu (par ex. un id externe, un email, un uuid Supabase), **toutes** les policies RLS basées sur `clerk_id = auth.jwt() ->> 'sub'` échoueront silencieusement.

---

## 2. Supabase — faire confiance au JWT Clerk (Third-Party JWT)

| Étape | Détail                                                                                                                                                                                                          | Fait |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 2.1   | **Supabase Dashboard** → **Authentication** → section dédiée à **Clerk** / **Third-Party Auth** / **JWT** comme décrit dans [la doc Supabase × Clerk](https://supabase.com/docs/guides/auth/third-party/clerk). | [ ]  |
| 2.2   | Renseigner l'**Issuer Clerk** (format `https://...clerk.accounts.dev` ou domaine personnalisé — **pas de slash final en trop**, match exact avec le `iss` du JWT vu en §1.5).                                   | [ ]  |
| 2.3   | Si la doc demande un **JWKS URL** : le copier depuis Clerk (`{issuer}/.well-known/jwks.json` ou valeur indiquée par Clerk). C'est la clé asymétrique qui valide la signature **RS256** — pas de secret partagé. | [ ]  |
| 2.4   | **Une seule source de vérité** : si l'ancien projet a un « JWT Secret » custom HS256, le retirer / ne pas le configurer en parallèle du provider Clerk Third-Party.                                             | [ ]  |
| 2.5   | Attendre la propagation (parfois quelques minutes après sauvegarde).                                                                                                                                            | [ ]  |

**Point de contrôle :** une erreur d'`issuer` ou de JWKS donne typiquement `401` / `JWT invalid` côté client Supabase alors que `anon` / `service_role` fonctionnent encore.

---

## 3. Application — relier Clerk et Supabase dans le code

| Étape | Détail                                                                                                                                                                       | Fait |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 3.1   | Client Supabase créé avec `accessToken: async () => (await getToken({ template: process.env.CLERK_JWT_TEMPLATE_SUPABASE })) ?? null` — nom du template **identique** à §1.1. | [ ]  |
| 3.2   | Ne **jamais** exposer `service_role` dans le navigateur ; réservé au **serveur**, migrations CI, scripts admin.                                                              | [ ]  |
| 3.3   | Vérifier les clients **Server** vs **Browser** : même logique de token, pas de duplication incohérente.                                                                      | [ ]  |
| 3.4   | Logs côté serveur : **métadonnées non-PII uniquement** (`token_present: boolean`, `clerk_user_id` interne — pas d'email, pas de prénom enfant).                              | [ ]  |

---

## 4. Postgres / RLS — règle dure

### 4.1 — Activation

- [ ] Chaque table métier : `ALTER TABLE x ENABLE ROW LEVEL SECURITY;` **dans la même migration** que le `CREATE TABLE`. Pas de follow-up.

### 4.2 — Helpers : `auth.jwt() ->> 'sub'` uniquement

> **Avec le pattern Third-Party JWT (JWKS Clerk), `auth.uid()` retourne `null`** parce qu'aucune session Supabase Auth n'existe. Toute policy basée sur `auth.uid()` bloquera silencieusement (0 ligne retournée, pas d'erreur explicite). **À bannir dans toutes les policies** tant qu'on est sur ce pattern.

**Exemple CORRECT** — table `users` (lecture de sa propre fiche) :

```sql
CREATE POLICY users_select_self ON users
  FOR SELECT
  USING (clerk_id = auth.jwt() ->> 'sub');
```

**Exemple CORRECT** — table `children` (lecture des enfants dont je suis le parent, via jointure sur `users`) :

```sql
CREATE POLICY children_select_own ON children
  FOR SELECT
  USING (
    parent_id IN (
      SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
    )
  );
```

**Exemple INCORRECT** (silencieux, 0 ligne, bug invisible) :

```sql
-- ❌ NE PAS UTILISER avec JWKS Clerk : auth.uid() est null.
CREATE POLICY users_select_self ON users
  FOR SELECT
  USING (id = auth.uid());
```

### 4.3 — Anti-patterns à refuser en revue

- [ ] **Pas de `USING (true)`** sauf table explicitement publique ET review sécu tracée.
- [ ] **Pas de policy `FOR ALL`** sans clause `WITH CHECK` distincte si la table accepte des INSERT / UPDATE depuis l'utilisateur.
- [ ] **Pas d'UPDATE auto-élévation** : un utilisateur ne doit pas pouvoir modifier son propre champ `role` (voir §5 scénario _escalade de privilèges_). La policy UPDATE doit explicitement **exclure** les colonnes de privilège ou être complétée par un trigger / colonne en `GENERATED ALWAYS` côté serveur.

### 4.4 — Tests

- [ ] Test **SELECT / INSERT / UPDATE / DELETE** pour un cas autorisé et un cas refusé (voir `CONTRIBUTING.md` → _Tester la RLS_).

---

## 5. Validation bout-en-bout (Definition of Done)

- [ ] **SELECT propres données :** Utilisateur A connecté via Clerk lit **uniquement** ses lignes (`users`, `children`, `events`...).
- [ ] **Isolement croisé :** Utilisateur B (navigation privée / autre session) **ne lit pas** les lignes de A. Pas de fuite, même partielle.
- [ ] **Escalade de privilèges bloquée** (brief v2 §14, critère 13) : A **ne peut pas** se promouvoir admin via UPDATE sur sa propre ligne `users` (ex. `UPDATE users SET role = 'admin' WHERE clerk_id = '<sub A>'` → refusé ou ignoré). Couvert par un test E2E `@security` distinct.
- [ ] **Token expiré / absent :** pas d'accès aux données privées ; UX gère la reconnection Clerk.
- [ ] **Aucune régression `service_role` :** migrations / webhooks serveur fonctionnent et **ne sont pas** la voie normale des sessions utilisateur.

---

## 6. Erreurs fréquentes (tri rapide)

| Symptôme                                | Piste                                                                                                                                                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « Invalid JWT » / 401 Supabase          | Issuer / JWKS URL / algorithme (doit être **RS256**, pas HS256) ; `aud` ou `role` manquants dans le template Clerk §1.3.                                                                                  |
| 0 ligne alors que les données existent  | **Cause n°1 :** policy basée sur `auth.uid()` au lieu de `auth.jwt() ->> 'sub'` (`auth.uid()` est `null` avec JWKS). **Cause n°2 :** template Clerk pas appliqué (token sans `sub` Clerk, ou pas envoyé). |
| Données d'un autre utilisateur visibles | **Incident sévérité max** : policy manquante, `USING (true)`, bypass `service_role` côté client, jointure laxe. Bloquer la PR, ouvrir un incident.                                                        |
| Escalade : un user devient admin        | Policy UPDATE trop permissive (ex. `WITH CHECK (true)`) ; colonne `role` modifiable côté user. Patcher + test `@security` immédiat.                                                                       |

---

## 7. Après merge PR #1 (Sprint 0)

- [ ] Recopier cette checklist dans le ticket / PR « Auth + RLS smoke ».
- [ ] Ajouter / vérifier les E2E RLS dans CI (voir `CONTRIBUTING.md`) pour figer la non-régression.
- [ ] Si la doc officielle Clerk × Supabase évolue, ouvrir un ticket pour mettre à jour cette checklist **avant** de modifier les templates en prod.
