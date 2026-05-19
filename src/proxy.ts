/**
 * Proxy Next.js 16 — protection des routes via Clerk (espace adultes) ET
 * via JWT enfant custom (espace enfants /eleve/*).
 *
 * Successeur de `middleware.ts` (déprécié en Next 16). Détecté
 * automatiquement par le framework au chemin `src/proxy.ts`.
 *
 * Stratégie d'auth à 2 niveaux :
 *
 * 1. /eleve/* (espace enfants)
 *    - Les enfants n'ont PAS de compte Clerk (règle absolue sécurité enfants,
 *      RGPD < 13 ans + UX inadaptée du sign-in Clerk)
 *    - Auth via JWT HS256 custom (cf. `lib/auth/child-session`) déposé en
 *      cookie httpOnly `tama_child_session` par un Server Action côté parent
 *    - Cookie absent ou JWT invalide / expiré → redirect vers / (la landing
 *      proposera le flow de reconnexion via le parent — pas /sign-in qui
 *      mènerait à un sign-up Clerk inadapté)
 *
 * 2. /parent/*, /admin/*, et toutes les autres routes non publiques
 *    - Auth Clerk (parents, instructors, admins)
 *    - `auth.protect()` redirige automatiquement vers `/sign-in` avec
 *      `?redirect_url=...` préservé
 *
 * Routes publiques (whitelist explicite) :
 * - `/`                  : landing page
 * - `/sign-in(.*)`       : flow Clerk sign-in (catch-all SSO/MFA)
 * - `/sign-up(.*)`       : flow Clerk sign-up
 * - `/api/clerk/webhook` : POST signé svix, DOIT accepter sans session Clerk
 * - `/api/health`        : healthcheck CI / Vercel / monitoring externe
 *
 * Vérification du rôle (parent / instructor / admin) PAS faite ici. Le JWT
 * Clerk ne contient pas notre colonne `users.role` (qui vit en BDD). Cette
 * vérif aura lieu dans chaque layout d'espace (server component qui lookup
 * la table `users` via getSupabaseClerkClient + RLS).
 *
 * Runtime : edge par défaut (Vercel CDN-deployable). Jose et crypto.subtle
 * sont edge-compatibles, donc verifyChildToken fonctionne sans switch de
 * runtime. Pas de Pino ici (Node natifs requis) — les redirections sont
 * tracées par Vercel/Sentry au niveau plateforme.
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { CHILD_SESSION_COOKIE_NAME, verifyChildToken } from "@/lib/auth/child-session";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/clerk/webhook",
  "/api/health",
]);

const isChildRoute = createRouteMatcher(["/eleve(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return undefined;
  }

  if (isChildRoute(req)) {
    const cookie = req.cookies.get(CHILD_SESSION_COOKIE_NAME);
    if (!cookie?.value) {
      // TODO[sprint-4]: rediriger vers /eleve/login (page dédiée qui propose
      // le flow de reconnexion via QR code parent) plutôt que la landing /.
      return NextResponse.redirect(new URL("/", req.url));
    }
    const payload = await verifyChildToken(cookie.value);
    if (!payload) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    // TODO[sprint-3-4]: ajouter un check de scope ici (si pathname commence
    // par /eleve/arena et payload.scope !== 'arena' → rediriger vers la
    // route /eleve/<scope>). Pour Sprint 0, on laisse passer tout scope sur
    // toute route /eleve/* — les pages elles-mêmes feront le check fin.
    return undefined;
  }

  await auth.protect();
  return undefined;
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
