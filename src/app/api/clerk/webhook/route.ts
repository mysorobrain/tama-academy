/**
 * Webhook Clerk → sync table `users`.
 *
 * Endpoint POST /api/clerk/webhook
 *
 * Pipeline :
 * 1. Vérifier la signature svix (HMAC sur le body avec CLERK_WEBHOOK_SECRET).
 *    En cas d'échec → 401, l'event est rejoué côté Clerk plus tard.
 * 2. Parser le payload typé via @clerk/nextjs/server::WebhookEvent.
 * 3. Router sur `event.type`. Seul `user.created` est géré au commit 4 ;
 *    `user.updated` et `user.deleted` arriveront dans un sprint ultérieur
 *    (soft delete RGPD, sync profile, etc.).
 * 4. Pour `user.created` : INSERT idempotent dans `users` via Drizzle (rôle
 *    `parent` par défaut, le rôle peut être promu manuellement par un admin).
 * 5. Réponse 200 dès que l'event est traité (ou ignoré proprement). Clerk
 *    retry uniquement sur 5xx → on n'utilise 5xx que pour des erreurs serveur
 *    transitoires (DB down, secret manquant), pas pour des payloads partiels.
 *
 * Runtime : Node.js (svix dépend de `crypto` natif Node, pas compatible Edge).
 * Cache   : dynamic forcé (route mutative).
 *
 * TODO[commit-8] : les `console.*` ci-dessous (avec eslint-disable scopé) sont
 * volontairement temporaires. Le commit 8 introduit le logger Pino centralisé
 * (PII redaction, contextes scoped, niveaux configurables via LOG_LEVEL) et
 * remplacera tous les `console.*` de ce fichier. Le disable est nominatif
 * pour qu'on ne l'oublie pas — il sera retiré au commit 8.
 */

/* eslint-disable no-console -- TODO[commit-8] : migration vers logger Pino. */

import "server-only";

import { Webhook } from "svix";

import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

import type { UserJSON, WebhookEvent } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Headers svix obligatoires pour validation. */
const SVIX_HEADERS = ["svix-id", "svix-timestamp", "svix-signature"] as const;

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET non configuré");
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const headers: Record<string, string> = {};
  for (const name of SVIX_HEADERS) {
    const value = req.headers.get(name);
    if (!value) {
      return Response.json({ error: `Missing required header: ${name}` }, { status: 400 });
    }
    headers[name] = value;
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  let event: WebhookEvent;
  try {
    event = wh.verify(body, headers) as WebhookEvent;
  } catch (err) {
    console.warn("[clerk-webhook] signature svix invalide", {
      svixId: headers["svix-id"],
      reason: err instanceof Error ? err.message : "unknown",
    });
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    switch (event.type) {
      case "user.created":
        await handleUserCreated(event.data);
        break;
      default:
        console.info("[clerk-webhook] event ignoré (non géré)", {
          type: event.type,
          svixId: headers["svix-id"],
        });
        break;
    }
  } catch (err) {
    console.error("[clerk-webhook] erreur traitement event", {
      type: event.type,
      svixId: headers["svix-id"],
      reason: err instanceof Error ? err.message : "unknown",
    });
    return Response.json({ error: "Internal error" }, { status: 500 });
  }

  return Response.json({ received: true }, { status: 200 });
}

/**
 * Insère un nouveau user `parent` dans la table `users`.
 *
 * Idempotent via `onConflictDoNothing(clerk_id)` : si Clerk renvoie le même
 * event (retry après un timeout transient), le second appel ne fait rien.
 *
 * Fallbacks défensifs :
 * - email manquant : on skip l'insert et on log warn. Cas rare (OAuth provider
 *   sans scope email) qu'on traite à la main pour l'instant.
 * - full_name manquant : on fallback sur "Parent" (ré-éditable depuis settings).
 *
 * Defense in depth : ce handler bypasse RLS (Drizzle via DATABASE_URL =
 * connexion role `postgres` avec BYPASSRLS). C'est légitime car le webhook
 * n'a pas de session Clerk (pas d'auth.jwt() ->> 'sub' disponible), mais le
 * payload est cryptographiquement signé donc la confiance vient de svix.
 */
async function handleUserCreated(data: UserJSON): Promise<void> {
  const primaryEmailId = data.primary_email_address_id;
  const primaryEmail = data.email_addresses?.find((e) => e.id === primaryEmailId)?.email_address;

  if (!primaryEmail) {
    console.warn("[clerk-webhook] user.created sans email primaire, skipped", {
      clerkId: data.id,
    });
    return;
  }

  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || "Parent";

  await db
    .insert(users)
    .values({
      clerkId: data.id,
      role: "parent",
      email: primaryEmail,
      fullName,
      locale: "fr",
    })
    .onConflictDoNothing({ target: users.clerkId });

  console.info("[clerk-webhook] user créé (ou déjà existant)", {
    clerkId: data.id,
  });
}
