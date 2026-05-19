/**
 * Client Supabase côté serveur, authentifié via JWT Clerk.
 *
 * Architecture :
 * - Clerk gère l'identité parents / Sensei / admin (cookies httpOnly).
 * - On extrait le JWT Clerk via le template `supabase` (claims authenticated).
 * - On le passe en header `Authorization: Bearer <jwt>` à chaque requête
 *   PostgREST → Supabase valide la signature contre la JWKS Clerk (3PA actif)
 *   → `auth.jwt() ->> 'sub'` retourne le `clerk_id` dans les policies RLS.
 *
 * Conséquence : ce client respecte automatiquement les policies RLS
 * user-aware (PR #3 migration 0003). Aucun risque de bypass involontaire.
 *
 * Pour les opérations admin (jobs, cron, webhooks), utiliser à la place
 * `getSupabaseServiceRoleClient()` qui passe la `service_role` key et
 * contourne RLS de façon explicite et auditable.
 */

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseJwt } from "@/lib/auth/clerk";

/**
 * Variables d'environnement requises côté serveur Supabase.
 * On lit en lazy (à l'appel) plutôt qu'au load du module pour éviter de
 * crasher l'import en environnement de test où ces vars peuvent manquer.
 */
function readSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined");
  }
  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined");
  }
  return { url, anonKey };
}

/**
 * Client Supabase pour Server Component / Server Action / Route Handler
 * authentifié via Clerk.
 *
 * - Si la requête a une session Clerk active → JWT injecté → RLS user-aware.
 * - Si la requête n'a PAS de session → pas de JWT → toutes les policies
 *   user-aware refusent l'accès (comportement attendu, defense in depth).
 *
 * Important : ce client est créé à chaque appel (pas de cache module-level).
 * Justification : le JWT Clerk peut être rafraîchi pendant la session, et un
 * client mis en cache pourrait servir un token expiré.
 */
export async function getSupabaseClerkClient(): Promise<SupabaseClient> {
  const { url, anonKey } = readSupabaseEnv();
  const token = await getSupabaseJwt();

  return createClient(url, anonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Client Supabase admin (service_role) qui BYPASSE toutes les policies RLS.
 *
 * À réserver à :
 * - Cron jobs Vercel (rapports, nettoyage).
 * - Webhooks externes (Clerk user.created → insert dans `users`).
 * - Scripts d'administration (seed, migrations data, debug).
 *
 * JAMAIS depuis un Server Component / Server Action déclenché par un user
 * (sinon on contourne la sécurité enfant et on ouvre une porte arrière).
 *
 * La service_role key est notée `SUPABASE_SERVICE_ROLE_KEY` (sans préfixe
 * NEXT_PUBLIC_) pour qu'elle n'apparaisse JAMAIS dans le bundle navigateur.
 */
export function getSupabaseServiceRoleClient(): SupabaseClient {
  const { url } = readSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
