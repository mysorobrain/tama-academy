import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * Discriminated union typée pour `user_events.data`. Pattern data_json.kind
 * (cf. Rule 01) : nouveaux events ajoutés ici sans migration BDD. Le champ
 * scalaire `kind` (dénormalisé depuis `data.kind`) sert d'index pour filtrer
 * rapidement.
 *
 * Au Sprint 0, cette table est créée mais aucune écriture. Elle sert
 * d'exemple canonique pour les futurs events (formula_completed,
 * level_passed, seal_unlocked etc. au Sprint 1+).
 */
export type UserEventData =
  | {
      kind: "profile_updated";
      field: string;
      oldValue: string;
      newValue: string;
    }
  | { kind: "consent_granted"; consentType: string }
  | { kind: "consent_revoked"; consentType: string };

export type UserEventKind = UserEventData["kind"];

/**
 * Table `user_events` — log événementiel append-only par utilisateur.
 * Pas d'UPDATE, pas de DELETE (immutable). Index composite (user_id, kind,
 * created_at DESC) pour les queries de type "derniers events de tel kind
 * pour cet user".
 */
export const userEvents = pgTable(
  "user_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Discriminator dénormalisé pour indexer/filtrer sans parser le JSONB. */
    kind: text("kind").notNull(),
    data: jsonb("data").$type<UserEventData>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_events_user_kind_created_idx").on(table.userId, table.kind, table.createdAt),
  ],
);

export type UserEvent = typeof userEvents.$inferSelect;
export type NewUserEvent = typeof userEvents.$inferInsert;
