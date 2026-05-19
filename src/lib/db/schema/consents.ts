import { sql } from "drizzle-orm";
import { boolean, jsonb, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { children } from "./students";
import { users } from "./users";

/**
 * Types de consentement parental traçables. Tout enfant < 16 ans (RGPD FR/UE)
 * doit avoir un consentement explicite avant toute action sensible. Voir
 * rule 04 §"Règle absolue n°4" et helpers `verifyParentalConsent` (PR #3).
 */
export const consentTypeEnum = pgEnum("consent_type", [
  "account_creation",
  "camera_capture",
  "video_recording",
  "analytics",
  "marketing",
]);

/**
 * Touchpoints UX où le consentement a été demandé. Permet d'auditer si le
 * consentement a été collecté au bon moment (ex : `pre_camera` AVANT
 * d'activer la webcam, jamais après).
 */
type ConsentTouchpoint = "onboarding" | "pre_stage" | "pre_camera";

/**
 * Preuve technique du consentement (audit trail légal). IP hashée côté
 * application avant insertion (cf. rule 04 §"Aucun PII dans les logs").
 */
type ConsentEvidence = {
  ipHash: string;
  userAgent: string;
  timestamp: string;
  touchpoint: ConsentTouchpoint;
};

/**
 * Table `parental_consents` — audit trail des consentements RGPD. Immutable
 * par convention : pas de DELETE, pas d'UPDATE arbitraire. La révocation
 * passe par `revoked_at` (soft revoke) tracé en BDD.
 *
 * Index unique partial sur (parent_id, child_id, consent_type) WHERE
 * revoked_at IS NULL : interdit deux consentements actifs simultanés pour
 * le même triplet (un seul "vivant" à la fois). Révoquer puis re-consentir
 * crée une nouvelle ligne (audit préservé).
 */
export const parentalConsents = pgTable(
  "parental_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    consentType: consentTypeEnum("consent_type").notNull(),
    granted: boolean("granted").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    evidenceJson: jsonb("evidence_json").$type<ConsentEvidence>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("parental_consents_active_unique_idx")
      .on(table.parentId, table.childId, table.consentType)
      .where(sql`${table.revokedAt} IS NULL`),
  ],
);

export type ParentalConsent = typeof parentalConsents.$inferSelect;
export type NewParentalConsent = typeof parentalConsents.$inferInsert;
