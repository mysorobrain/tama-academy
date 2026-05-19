/**
 * Erreur typée Tama Academy.
 *
 * Sépare le message destiné à l'utilisateur final (FR, court, actionnable)
 * du message technique destiné aux logs et à Sentry. Permet d'éviter les
 * leaks d'information serveur dans les réponses HTTP (ex. "SQLSTATE 23505
 * unique constraint" → message tech ; "Cet email est déjà utilisé" → user).
 *
 * Codes :
 * - NOT_FOUND          : ressource inexistante ou non accessible (RLS = 404)
 * - UNAUTHORIZED       : auth absente ou invalide
 * - FORBIDDEN          : auth présente mais privilège insuffisant
 * - INVALID_INPUT      : validation Zod échouée
 * - PEDAGOGY_VIOLATION : règle pédagogique violée (cf. rule 02)
 * - INTERNAL           : erreur serveur transitoire / bug
 *
 * Convention : le helper Response côté API/Server Action consomme `code` pour
 * choisir le statut HTTP et `userMessage` pour le body. `technicalMessage`
 * va dans le logger Pino et Sentry (cf. lib/logger).
 */

export type TamaAcademyErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "PEDAGOGY_VIOLATION"
  | "INTERNAL";

export class TamaAcademyError extends Error {
  public readonly code: TamaAcademyErrorCode;
  public readonly userMessage: string;
  public readonly technicalMessage: string;

  constructor(code: TamaAcademyErrorCode, userMessage: string, technicalMessage: string) {
    super(technicalMessage);
    this.name = "TamaAcademyError";
    this.code = code;
    this.userMessage = userMessage;
    this.technicalMessage = technicalMessage;
  }
}

/**
 * Helper de discrimination — utile pour les blocs catch génériques.
 */
export function isTamaAcademyError(err: unknown): err is TamaAcademyError {
  return err instanceof TamaAcademyError;
}
