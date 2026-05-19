/**
 * Wrappers serveur autour de Clerk.
 *
 * Toutes les fonctions de ce module DOIVENT être appelées depuis un Server
 * Component, une Server Action, ou un Route Handler. Elles s'appuient sur les
 * cookies HTTP-only de la requête courante (via `@clerk/nextjs/server`).
 *
 * Règles :
 * - Pas de `redirect()` ici (laissé au `src/proxy.ts` / aux pages).
 * - Pas de logique RLS ici (séparée dans `src/lib/supabase/server.ts`).
 * - On échoue strict : un appel sans session levée renvoie `null` pour les
 *   helpers `*Optional`, ou throw `UnauthorizedError` pour les helpers stricts.
 */

import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

/** Identifiant Clerk du user authentifié (claim `sub` du JWT). */
export type ClerkUserId = string;

/** Erreur lancée par les helpers stricts si aucune session n'est active. */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Retourne le `clerk_id` (sub JWT) du user authentifié, ou `null` si la
 * requête courante n'a pas de session Clerk valide.
 *
 * À privilégier dans les Server Components qui rendent du contenu différent
 * pour invité vs authentifié, sans bloquer.
 */
export async function getClerkUserId(): Promise<ClerkUserId | null> {
  const { userId } = await auth();
  return userId ?? null;
}

/**
 * Version stricte : retourne le `clerk_id` ou throw `UnauthorizedError`.
 *
 * À utiliser dans les Server Actions et Route Handlers qui ne doivent JAMAIS
 * être atteints sans auth (le proxy a déjà filtré, mais on garde une défense
 * en profondeur — defense in depth conforme au rule 04).
 */
export async function requireClerkUserId(): Promise<ClerkUserId> {
  const userId = await getClerkUserId();
  if (!userId) {
    throw new UnauthorizedError("requireClerkUserId: no active Clerk session");
  }
  return userId;
}

/**
 * Récupère le JWT Clerk signé pour le template `supabase`.
 *
 * Ce JWT contient les claims `{ role: "authenticated", sub: <clerk_id>, ... }`
 * que Supabase Third-Party Auth valide contre la JWKS Clerk. Sans ce token,
 * `auth.jwt()` côté Postgres retourne NULL et toutes les policies RLS
 * user-aware bloquent.
 *
 * Retourne `null` si la session n'est pas active OU si le template `supabase`
 * n'est pas configuré dans le dashboard Clerk.
 */
export async function getSupabaseJwt(): Promise<string | null> {
  const { getToken } = await auth();
  const template = process.env.CLERK_JWT_TEMPLATE_SUPABASE ?? "supabase";
  const token = await getToken({ template });
  return token ?? null;
}

/**
 * Profil complet du user Clerk (email, full name, image, etc.).
 *
 * Plus coûteux que `getClerkUserId()` car implique un round-trip vers Clerk.
 * À réserver aux pages qui affichent réellement ces infos (settings, profile).
 *
 * Retourne `null` si pas de session active.
 */
export async function getClerkUser() {
  return currentUser();
}
