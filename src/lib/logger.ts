/**
 * Logger Pino centralisé pour Tama Academy.
 *
 * Pino est utilisé partout côté serveur (API routes, Server Actions, scripts,
 * cron) à la place de console.*. Avantages :
 * - Format JSON structuré (ingestible par Sentry, Datadog, Vercel Log Drains)
 * - Niveau configurable via LOG_LEVEL (par défaut: info en prod, debug en dev)
 * - Redaction PII automatique (cf. paths ci-dessous)
 * - Performance ~5-10x supérieure à console.* (négligeable mais c'est gratuit)
 * - Pretty print en dev via pino-pretty (lisible, coloré)
 *
 * Runtime : Node uniquement. Pino dépend de modules natifs (streams,
 * worker_threads, async_hooks) indisponibles en edge. Le proxy edge utilise
 * directement Vercel/Sentry au niveau plateforme (cf. src/proxy.ts).
 *
 * Pattern d'usage :
 *
 *   import { logger, childLogger } from "@/lib/logger";
 *
 *   // Logger global
 *   logger.info({ studentId }, "Formula completed");
 *
 *   // Logger contextualisé (mieux pour les pipelines)
 *   const log = childLogger({ feature: "clerk-webhook", svixId });
 *   log.warn({ reason }, "signature svix invalide");
 *
 * IMPORTANT — règle absolue 04 §"Aucun PII dans les logs" :
 * Les paths redact ci-dessous sont défensifs (au cas où). La vraie discipline
 * est de NE JAMAIS passer d'objets contenant des PII en clair. Préférer
 * passer `{ studentId, action }` à `{ student }`. La redaction Pino est un
 * filet de sécurité, pas un substitut.
 */

import "server-only";

import pino, { type Logger } from "pino";

const isProduction = process.env.NODE_ENV === "production";

const REDACT_PATHS = [
  "email",
  "*.email",
  "**.email",
  "password",
  "*.password",
  "**.password",
  "firstName",
  "*.firstName",
  "**.firstName",
  "lastName",
  "*.lastName",
  "**.lastName",
  "fullName",
  "*.fullName",
  "**.fullName",
  "birthDate",
  "*.birthDate",
  "**.birthDate",
  "phoneNumber",
  "*.phoneNumber",
  "**.phoneNumber",
  "headers.authorization",
  "*.headers.authorization",
  "headers.cookie",
  "*.headers.cookie",
  "*.token",
  "**.token",
];

const baseOptions = {
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
};

export const logger: Logger = pino(
  isProduction
    ? baseOptions
    : {
        ...baseOptions,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
            singleLine: false,
          },
        },
      },
);

/**
 * Crée un logger enfant avec des bindings contextuels persistants.
 * Tous les logs émis via ce child porteront automatiquement ces bindings.
 *
 * Usage typique au début d'un handler :
 *   const log = childLogger({ feature: "stage-enrollment", studentId });
 *   log.info({ stageId }, "enrollment started");
 *   log.warn("payment retry attempt");  // automatiquement tagué feature+studentId
 */
export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}
