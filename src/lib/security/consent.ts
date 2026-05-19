/**
 * Vérification du consentement parental — deux modes explicites.
 *
 * Règle absolue 04 §"Règle absolue n°4" : tout enfant < 16 ans (RGPD FR/UE)
 * doit avoir un consentement parental actif et tracé en BDD avant l'activation
 * d'une fonctionnalité sensible (création compte, capture photo/vidéo,
 * analytics individualisé, marketing). Aucune fonctionnalité ne doit
 * contourner ce check.
 *
 * Deux paires de fonctions, nommées explicitement pour éviter toute
 * confusion à l'appel :
 *
 * 1. *AsParent (client Supabase user-aware injecté)
 *    À utiliser depuis un Server Component ou Server Action APPELÉ PAR UN
 *    PARENT AUTHENTIFIÉ Clerk. Le client Supabase porte le JWT Clerk,
 *    donc les policies RLS user-aware (PR #3 migration 0003) filtrent
 *    automatiquement sur parent_id. Si le caller utilise un client d'un
 *    autre parent par accident → 0 row retourné → consent absent (fail safe).
 *
 *    Pattern :
 *      const client = await getSupabaseClerkClient();
 *      const ok = await verifyParentalConsentAsParent(client, childId, type);
 *
 * 2. *System (Drizzle service_role bypass)
 *    À utiliser DEPUIS LES CONTEXTES SYSTÈME UNIQUEMENT — webhook Clerk,
 *    Vercel Cron, scripts admin, jobs background. Ces contextes n'ont
 *    pas de session Clerk donc pas de JWT user-aware, donc on bypass RLS
 *    via Drizzle (DATABASE_URL = role postgres, BYPASSRLS).
 *
 *    Pattern :
 *      const ok = await verifyParentalConsentSystem(childId, type);
 *
 *    DANGER : n'utilise JAMAIS *System depuis un Server Action côté parent.
 *    Cela contournerait silencieusement la vérif RLS user-aware, ce qui
 *    pourrait permettre à un parent de lire les consents d'un autre via
 *    un bug logique côté caller. Discipline obligatoire.
 *
 * Returns true si :
 * - Un row parental_consents existe pour (childId, consentType)
 * - granted = true
 * - revoked_at IS NULL
 *
 * Returns false sinon (aucun row, ou révoqué, ou granted=false).
 */

import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { parentalConsents } from "@/lib/db/schema";
import { TamaAcademyError } from "@/lib/errors";

import type { consentTypeEnum } from "@/lib/db/schema";
import type { SupabaseClient } from "@supabase/supabase-js";

type ConsentType = (typeof consentTypeEnum.enumValues)[number];

// ============================================================================
// Mode 1 : *AsParent — client Supabase user-aware injecté
// ============================================================================

export async function verifyParentalConsentAsParent(
  client: SupabaseClient,
  childId: string,
  consentType: ConsentType,
): Promise<boolean> {
  const { data, error } = await client
    .from("parental_consents")
    .select("id")
    .eq("child_id", childId)
    .eq("consent_type", consentType)
    .eq("granted", true)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    throw new TamaAcademyError(
      "INTERNAL",
      "Impossible de vérifier le consentement parental.",
      `Supabase error verifying consent for child=${childId} type=${consentType}: ${error.message}`,
    );
  }

  return Boolean(data);
}

export async function requireParentalConsentAsParent(
  client: SupabaseClient,
  childId: string,
  consentType: ConsentType,
): Promise<void> {
  const ok = await verifyParentalConsentAsParent(client, childId, consentType);
  if (!ok) {
    throw new TamaAcademyError(
      "FORBIDDEN",
      "Le consentement parental requis pour cette action est manquant ou a été révoqué.",
      `Missing or revoked parental_consent for child=${childId} type=${consentType} (AsParent)`,
    );
  }
}

// ============================================================================
// Mode 2 : *System — Drizzle service_role bypass
// ============================================================================

export async function verifyParentalConsentSystem(
  childId: string,
  consentType: ConsentType,
): Promise<boolean> {
  const consent = await db.query.parentalConsents.findFirst({
    where: and(
      eq(parentalConsents.childId, childId),
      eq(parentalConsents.consentType, consentType),
      eq(parentalConsents.granted, true),
      isNull(parentalConsents.revokedAt),
    ),
    columns: { id: true },
  });
  return Boolean(consent);
}

export async function requireParentalConsentSystem(
  childId: string,
  consentType: ConsentType,
): Promise<void> {
  const ok = await verifyParentalConsentSystem(childId, consentType);
  if (!ok) {
    throw new TamaAcademyError(
      "FORBIDDEN",
      "Le consentement parental requis pour cette action est manquant ou a été révoqué.",
      `Missing or revoked parental_consent for child=${childId} type=${consentType} (System)`,
    );
  }
}
