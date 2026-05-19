/**
 * Validation d'input via Zod.
 *
 * À utiliser systématiquement à l'entrée des Server Actions, API routes
 * et webhooks. Le pattern est :
 *
 *   const Schema = z.object({ ... });
 *
 *   export async function myAction(raw: unknown) {
 *     const input = validateInput(Schema, raw, "myAction");
 *     // input est maintenant typé et garanti conforme
 *   }
 *
 * Bénéfice : on transforme tout `unknown` en type sûr OU en erreur typée
 * `TamaAcademyError(INVALID_INPUT)`, ce qui simplifie la gestion d'erreur
 * en amont (les API routes catchent TamaAcademyError → 400 user message).
 *
 * Le context (3e param) est inclus dans le technicalMessage pour faciliter
 * le debug en logs : "Validation failed for stageEnrollment: { ... }".
 *
 * Note importante : le message user-facing est volontairement générique
 * pour éviter de leaker la structure interne d'un schéma. Si on veut
 * remonter les détails à l'utilisateur (ex. formulaire avec messages par
 * champ), c'est au caller de faire schema.safeParse() lui-même et de
 * formatter result.error.format() pour l'UI — validateInput est pour le
 * cas générique server-to-server.
 */

import "server-only";

import { TamaAcademyError } from "@/lib/errors";

import type { ZodType } from "zod";

export function validateInput<T>(schema: ZodType<T>, input: unknown, context = "input"): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new TamaAcademyError(
      "INVALID_INPUT",
      "Données invalides. Vérifie les champs et réessaie.",
      `Validation failed for ${context}: ${JSON.stringify(result.error.issues)}`,
    );
  }
  return result.data;
}
