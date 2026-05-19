/**
 * Redaction PII — outils pour masquer les données personnelles avant log,
 * envoi externe (Sentry, Posthog), ou affichage à un tiers non autorisé.
 *
 * Règle absolue 04 §"Aucun PII dans les logs" : les helpers ici sont un
 * filet de sécurité. La discipline première reste de ne PAS passer d'objets
 * PII en clair à un logger ou à un service externe.
 *
 * Patterns détectés (Sprint 0, sera enrichi au fil des sprints) :
 * - Emails (RFC 5322 simplifié, suffisant pour 99% des cas)
 * - Numéros de téléphone (FR/MA — formats +33, +212, 0X XX XX XX XX, etc.)
 * - Tokens JWT (3 segments base64url séparés par des points)
 *
 * Out of scope C8 (Sprint ultérieur si besoin) :
 * - Numéros de carte (Stripe gère tout, donc on ne devrait jamais voir
 *   passer un PAN dans nos logs)
 * - Adresses postales (pas encore collectées côté Tama)
 * - Noms d'enfants (cas par cas via redactStudent côté caller)
 */

import "server-only";

/**
 * Email regex pragmatique. N'attrape pas tous les cas exotiques de RFC 5322
 * mais couvre 99% du web. Suffisant pour la redaction.
 */
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Numéros de téléphone internationaux courants. Captures volontairement
 * larges pour ne rien laisser passer (false positives acceptables sur
 * du texte de log — un faux match remplace un nombre par [REDACTED_PHONE]).
 */
const PHONE_REGEX = /\+?\d[\d\s().-]{7,}\d/g;

/**
 * JWT : 3 segments base64url séparés par des points, chaque segment >= 8 chars.
 * Lui aussi pragmatique — n'est pas une validation, juste une détection.
 */
const JWT_REGEX = /\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;

/**
 * Remplace les PII détectées par des placeholders neutres. Idempotent (le
 * placeholder n'est jamais matché par les regex).
 */
export function redactPII(text: string): string {
  if (!text) return text;
  return text
    .replace(JWT_REGEX, "[REDACTED_JWT]")
    .replace(EMAIL_REGEX, "[REDACTED_EMAIL]")
    .replace(PHONE_REGEX, "[REDACTED_PHONE]");
}

/**
 * Niveaux de visibilité d'un objet utilisateur/student/etc.
 *
 * - public        : info exposable à n'importe qui (id opaque, première
 *                   lettre du prénom, ceinture actuelle pour leaderboards)
 * - authenticated : info exposable à un user Clerk authentifié non-owner
 *                   (idem public + données agrégées sans PII)
 * - owner         : info complète exposable au parent propriétaire
 *                   (prénom complet, date de naissance, etc.)
 */
export type RedactionLevel = "public" | "authenticated" | "owner";

/**
 * Filtre les champs PII d'un objet selon le niveau d'accès. Ce helper est
 * volontairement défensif : tout champ non whitelisté est supprimé du retour.
 *
 * Pour Sprint 0, on gère uniquement le pattern Student. D'autres types
 * (User, Stage, etc.) seront ajoutés dans des sprints ultérieurs avec leur
 * propre whitelist explicite.
 */
export function redactStudent<
  T extends {
    id?: string;
    firstName?: string;
    lastInitial?: string;
    birthDate?: string | Date;
    beltCode?: string;
    parentId?: string;
  },
>(student: T, level: RedactionLevel): Partial<T> {
  switch (level) {
    case "public":
      return {
        id: student.id,
        firstName: student.firstName ? student.firstName.charAt(0) + "." : undefined,
        beltCode: student.beltCode,
      } as Partial<T>;
    case "authenticated":
      return {
        id: student.id,
        firstName: student.firstName ? student.firstName.charAt(0) + "." : undefined,
        lastInitial: student.lastInitial,
        beltCode: student.beltCode,
      } as Partial<T>;
    case "owner":
      return { ...student };
  }
}
