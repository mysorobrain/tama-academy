/**
 * Proxy Next.js 16 — protection des routes via Clerk (espace adultes).
 *
 * Successeur de `middleware.ts` (déprécié en Next 16). Détecté
 * automatiquement par le framework au chemin `src/proxy.ts`.
 *
 * SCOPE DU COMMIT 6 : Clerk uniquement (parents, instructors, admins).
 * La protection enfant (`/eleve/*`) arrive au commit 7 via un JWT
 * HS256 custom signé serveur, déposé en cookie httpOnly `tama_child_session`.
 * Les enfants n'ont PAS de compte Clerk (règle absolue de sécurité enfants
 * — RGPD < 13 ans + UX). En attendant le commit 7, `/eleve/*` est listé
 * en route publique pour éviter qu'un enfant qui ouvre son dojo soit
 * redirigé vers un sign-in Clerk inadapté. Au commit 7, cette entrée
 * disparaîtra et sera remplacée par un appel `verifyChildToken(...)`
 * dans le handler principal.
 *
 * Stratégie : tout est protégé sauf liste explicite de routes publiques.
 * C'est une posture defense-in-depth : oublier d'ajouter une nouvelle route
 * à la liste protégée serait dangereux. Oublier d'ajouter une nouvelle route
 * à la liste publique cause un sign-in flow inattendu mais zéro fuite de
 * données.
 *
 * Routes publiques :
 * - `/`                       : landing page
 * - `/sign-in(.*)`            : flow Clerk sign-in (catch-all pour SSO/MFA)
 * - `/sign-up(.*)`            : flow Clerk sign-up
 * - `/api/clerk/webhook`      : POST signé svix, DOIT être accessible sans
 *                               session Clerk (sinon Clerk reçoit 401 et ne
 *                               peut jamais nous pousser de user.created)
 * - `/api/health`             : healthcheck CI / Vercel / monitoring externe.
 *                               Pas de donnée sensible (cf. PR #2 health
 *                               route avec PII redaction).
 * - `/eleve(.*)`              : TEMPORAIRE C6 → C7. Cf. SCOPE ci-dessus.
 *
 * Routes protégées :
 * Tout le reste. `auth.protect()` redirige vers `/sign-in` avec un
 * `?redirect_url=...` préservé automatiquement par Clerk.
 *
 * Vérification du rôle (parent / instructor / admin) PAS faite ici. Le JWT
 * Clerk ne contient pas notre colonne `users.role` (qui vit en BDD). Cette
 * vérif aura lieu dans chaque layout d'espace (server component qui lookup
 * la table `users` via getSupabaseClerkClient + RLS). Le proxy se limite à
 * « tu as une session Clerk valide » → pass, sinon redirect sign-in.
 *
 * Pas de logger Pino ici : le proxy s'exécute en runtime edge par défaut
 * sur Vercel (rapide, distribué, déployable au CDN). Pino dépend de modules
 * Node natifs (streams, worker_threads) indisponibles en edge. Les seules
 * erreurs intéressantes ici sont les redirections, déjà tracées par
 * Vercel/Sentry au niveau plateforme.
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/clerk/webhook",
  "/api/health",
  // TODO[commit-7] : remplacer cette entrée par une protection dédiée via
  // verifyChildToken(req.cookies.get('tama_child_session')) HS256 dans le
  // handler. /eleve/* NE DOIT PAS être protégé par Clerk — les enfants
  // n'ont pas de compte Clerk (règle absolue sécurité enfants, RGPD).
  "/eleve(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return;
  }
  await auth.protect();
});

export const config = {
  matcher: [
    /**
     * Skip Next.js internals et fichiers statiques (images, fonts, CSS, JS
     * de page, manifest, favicons). Pattern issu de la doc Clerk + adapté
     * pour exclure également .ico et .webmanifest.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:html?|css|js(?:on)?|jpe?g|png|webp|gif|svg|ttf|woff2?|ico|webmanifest)).*)",
    /**
     * Toujours run pour les routes API et tRPC, même celles avec extensions
     * dans le path (ex. /api/foo.json).
     */
    "/(api|trpc)(.*)",
  ],
};
