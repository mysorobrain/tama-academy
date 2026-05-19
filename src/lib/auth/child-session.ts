/**
 * Session enfant — JWT HS256 custom signé serveur, déposé en cookie httpOnly.
 *
 * Les enfants n'ont PAS de compte Clerk (règle absolue de sécurité enfants —
 * RGPD < 13 ans + UX). Le flow est :
 *
 *   1. Parent (authentifié Clerk) ouvre /parent/eleves/[id]/connexion
 *   2. Server Action appelle signChildToken({ childId, parentClerkId, scope })
 *   3. Server Action dépose le JWT en cookie httpOnly + secure + sameSite=lax
 *      scopé à /eleve (et non à /, pour éviter qu'il soit envoyé sur les
 *      routes parent)
 *   4. L'enfant accède à /eleve/dojo, /eleve/arena, etc.
 *   5. Le proxy (src/proxy.ts) appelle verifyChildToken sur chaque requête
 *      /eleve/* et redirige vers / si le token est absent ou invalide
 *   6. À l'expiration (max_age 1h par défaut), l'enfant est redirigé sur la
 *      page d'accueil enfant (publique) qui propose de se reconnecter via
 *      le parent (flow QR code ou similaire — out of scope C7)
 *
 * Modèle de menace :
 * - Algorithm confusion : jwtVerify est appelé avec `algorithms: ['HS256']`
 *   explicite, ce qui empêche un token forgé en alg=none de passer
 * - Audience/issuer mismatch : le payload doit avoir les bons claims, sinon
 *   verifyChildToken retourne null (pas d'erreur leakée)
 * - Pas de PII dans le payload : seuls childId (UUID interne), parentClerkId
 *   (string Clerk), scope (enum). Aucun nom, email, date de naissance, etc.
 *
 * Tradeoff stateless V1 (Sprint 0 → ~Sprint 3-4) :
 * Le JWT n'est pas révocable individuellement. Si un cookie enfant est
 * volé ou compromis (ex. tablette familiale partagée), il reste valide
 * jusqu'à expiration naturelle (1h par défaut, plafond 2h). Compensations :
 *   - durée courte (max 2h, défaut 1h)
 *   - cookie httpOnly + secure (en prod) + sameSite=lax + scopé à /eleve
 *   - pas de PII dans le payload, donc fuite a un faible impact si compromis
 *   - le secret JWT_CHILD_SECRET peut être tourné en cas d'incident → tous
 *     les tokens en circulation deviennent immédiatement invalides
 *     (révocation globale par rotation, pas individuelle)
 * Si la révocation per-token devient un requirement (ex. parent clique
 * « déconnecter cet enfant »), on basculera vers un mode stateful en
 * stockant un session_id en BDD avec un statut revoked_at (out of scope C7).
 *
 * Variables d'env consommées (cf. .env.example) :
 * - JWT_CHILD_SECRET             : secret HS256 (base64 / hex, ≥ 256 bits)
 * - JWT_CHILD_ISSUER             : 'tama-academy' par défaut
 * - JWT_CHILD_AUDIENCE           : 'tama-child-session' par défaut
 * - JWT_CHILD_MAX_AGE_SECONDS    : 3600 (1h) par défaut
 *
 * Pas de "server-only" sentinel ici parce que ce module est consommé par
 * src/proxy.ts qui tourne en edge runtime — server-only force le runtime
 * Node, ce qu'on ne veut pas. Le module est de facto serveur (jose + secret
 * env), pas d'export client.
 */

import { SignJWT, jwtVerify, errors as joseErrors } from "jose";

/**
 * Nom du cookie httpOnly qui porte le JWT enfant. Scopé à /eleve par le
 * Server Action qui le dépose.
 */
export const CHILD_SESSION_COOKIE_NAME = "tama_child_session";

/**
 * Algorithme imposé pour la signature. HS256 parce qu'on n'a qu'un seul
 * service qui sign et verify (le serveur Next.js). Pas besoin de RS/ES
 * (asymétrique) qui sont utiles uniquement quand le verifier est externe.
 */
const JWT_ALGORITHM = "HS256" as const;

const DEFAULT_ISSUER = "tama-academy";
const DEFAULT_AUDIENCE = "tama-child-session";

/**
 * Durée de vie d'un token enfant. Plafond dur à 2h pour limiter la fenêtre
 * d'exposition en cas de cookie compromis (sécurité enfants > confort).
 * Défaut 1h = compromis raisonnable entre UX (pas trop de re-login pendant
 * un stage de 2h) et sécurité.
 */
const DEFAULT_MAX_AGE_SECONDS = 3600;
const MAX_AGE_HARD_CAP_SECONDS = 7200;

/**
 * Champs du payload JWT enfant. Pas de PII : que des identifiants opaques
 * et le scope d'accès accordé (dojo libre, arena compétition, stage live).
 */
export type ChildSessionPayload = {
  /** UUID de la row `children` en BDD. */
  childId: string;
  /** Clerk user ID du parent qui a ouvert la session (audit trail). */
  parentClerkId: string;
  /**
   * Périmètre fonctionnel autorisé. Permet au handler d'une page enfant de
   * refuser une navigation hors scope (ex. un enfant en mode dojo qui tente
   * d'accéder à l'arena compétitive).
   */
  scope: "dojo" | "arena" | "stage";
};

function getSecret(): Uint8Array {
  const secret = process.env.JWT_CHILD_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_CHILD_SECRET environment variable is required (min 32 chars). " +
        "Generate one with `openssl rand -base64 64`.",
    );
  }
  return new TextEncoder().encode(secret);
}

function getIssuer(): string {
  return process.env.JWT_CHILD_ISSUER ?? DEFAULT_ISSUER;
}

function getAudience(): string {
  return process.env.JWT_CHILD_AUDIENCE ?? DEFAULT_AUDIENCE;
}

function getMaxAgeSeconds(): number {
  const raw = process.env.JWT_CHILD_MAX_AGE_SECONDS;
  if (!raw) return DEFAULT_MAX_AGE_SECONDS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`JWT_CHILD_MAX_AGE_SECONDS must be a positive integer, got: ${raw}`);
  }
  if (parsed > MAX_AGE_HARD_CAP_SECONDS) {
    throw new Error(
      `JWT_CHILD_MAX_AGE_SECONDS exceeds hard cap (${MAX_AGE_HARD_CAP_SECONDS}s = 2h) for child session safety. Got: ${parsed}s.`,
    );
  }
  return parsed;
}

/**
 * Signe un JWT enfant. À appeler depuis un Server Action côté parent.
 * Throws si JWT_CHILD_SECRET absent ou trop court.
 */
export async function signChildToken(payload: ChildSessionPayload): Promise<string> {
  const secret = getSecret();
  const issuer = getIssuer();
  const audience = getAudience();
  const maxAge = getMaxAgeSeconds();

  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(secret);
}

/**
 * Vérifie un JWT enfant. Retourne le payload si valide, null sinon.
 * NE THROW JAMAIS sur input invalide — le proxy doit pouvoir traiter
 * un cookie absent / corrompu / expiré sans crash. Throws uniquement
 * sur erreur de configuration (JWT_CHILD_SECRET absent).
 */
export async function verifyChildToken(token: string): Promise<ChildSessionPayload | null> {
  if (!token) return null;

  const secret = getSecret();
  const issuer = getIssuer();
  const audience = getAudience();

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer,
      audience,
      algorithms: [JWT_ALGORITHM],
    });

    if (
      typeof payload.childId === "string" &&
      typeof payload.parentClerkId === "string" &&
      (payload.scope === "dojo" || payload.scope === "arena" || payload.scope === "stage")
    ) {
      return {
        childId: payload.childId,
        parentClerkId: payload.parentClerkId,
        scope: payload.scope,
      };
    }

    return null;
  } catch (err) {
    if (
      err instanceof joseErrors.JOSEError ||
      err instanceof joseErrors.JWTInvalid ||
      err instanceof joseErrors.JWTExpired ||
      err instanceof joseErrors.JWTClaimValidationFailed ||
      err instanceof joseErrors.JWSSignatureVerificationFailed
    ) {
      return null;
    }
    throw err;
  }
}
