import { boolean, date, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * Codes ceintures (BDD) ↔ noms UI mappés via formatLevelAsBelt (helper PR #5).
 * Cf. rule 02 (Méthode Tama) §"Mapping codes BDD ↔ Ceintures".
 */
export const beltCodes = ["NP1", "NP2", "NV1", "NV2", "NV3", "M1", "M2", "M3", "M4", "M5"] as const;
export type BeltCode = (typeof beltCodes)[number];

/**
 * Table `children` — un enfant par ligne. Le parent (Clerk-authentifié) crée
 * et possède ses enfants via `parent_id`. Pas d'authentification Clerk pour
 * l'enfant (auth via JWT custom en cookie httpOnly, PR #3).
 *
 * IMPORTANT : `register` ('kids' | 'academy') n'est PAS stocké. Il est calculé
 * à la volée par `getRegister(birth_date)` (helper PR #5) — évite un bug de
 * bascule à minuit le jour des 8 ans + évite une migration si on change le
 * seuil. Décision verrouillée brief §4.
 *
 * `birth_date` en mode 'string' : Drizzle retourne et accepte une date ISO
 * (YYYY-MM-DD) plutôt qu'un Date JS (évite les timezones drama).
 */
export const children = pgTable("children", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  /** Initiale du nom de famille uniquement (RGPD : privacy enfant). */
  lastInitial: text("last_initial").notNull(),
  birthDate: date("birth_date", { mode: "string" }).notNull(),
  beltCode: text("belt_code", { enum: beltCodes }).notNull().default("NP1"),
  /** Mode zen activé par le parent : pas de leaderboards, pas de compétition. */
  zenMode: boolean("zen_mode").notNull().default(false),
  dataJson: jsonb("data_json").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Child = typeof children.$inferSelect;
export type NewChild = typeof children.$inferInsert;
