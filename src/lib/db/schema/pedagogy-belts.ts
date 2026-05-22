import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Catalogue immuable des ceintures (Méthode Tama) — 9 valeurs distinctes.
 *
 * Décision verrouillée (cf. docs/decisions-acm-sprint-1.md §ACM-1 point #5) :
 * les niveaux M4 et M5 partagent tous deux `belt_code='noire_1er_dan'`. La
 * distinction "Maître Soroban" (M5) est exposée au runtime via un badge UI
 * basé sur le `level_code`, pas via une 10ᵉ ceinture distincte en BDD.
 *
 * Source-of-truth pédagogique : rule 02 + docs/sprint-1/format-formules-acm.md §6.
 */
export const beltCodes = [
  "blanche",
  "jaune",
  "orange",
  "verte",
  "bleue",
  "violette",
  "marron",
  "rouge",
  "noire_1er_dan",
] as const;
export type BeltCode = (typeof beltCodes)[number];

export const pedagogyBelts = pgTable("pedagogy_belts", {
  code: varchar("code", { length: 20, enum: beltCodes }).primaryKey(),
  displayName: text("display_name").notNull(),
  /** Couleur principale (palette officielle, cf. rule 02 §"Mapping codes BDD ↔ Ceintures"). */
  colorHex: varchar("color_hex", { length: 7 }).notNull(),
  /** Ordre pédagogique 1-9 (blanche=1 → noire_1er_dan=9), UNIQUE pour rendu déterministe. */
  displayOrder: integer("display_order").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PedagogyBelt = typeof pedagogyBelts.$inferSelect;
export type NewPedagogyBelt = typeof pedagogyBelts.$inferInsert;
