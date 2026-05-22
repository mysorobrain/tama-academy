import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { beltCodes, pedagogyBelts } from "./pedagogy-belts";

/**
 * Catalogue immuable des 10 niveaux (Méthode Tama) — NP1 → M5.
 *
 * Mapping niveau → ceinture (cf. docs/sprint-1/format-formules-acm.md §6) :
 *   NP1=blanche, NP2=jaune, NV1=orange, NV2=verte, NV3=bleue,
 *   M1=violette, M2=marron, M3=rouge, M4=noire_1er_dan, M5=noire_1er_dan.
 *
 * Le helper `formatLevelAsBelt(levelCode)` (cf. src/lib/pedagogy/level-belt-mapper.ts)
 * encapsule cette correspondance côté TypeScript.
 *
 * Source-of-truth pédagogique : rule 02 + docs/sprint-1/brief.md §J1.1.
 */
export const levelCodes = [
  "NP1",
  "NP2",
  "NV1",
  "NV2",
  "NV3",
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
] as const;
export type LevelCode = (typeof levelCodes)[number];

export const pedagogyLevels = pgTable("pedagogy_levels", {
  code: varchar("code", { length: 10, enum: levelCodes }).primaryKey(),
  displayName: text("display_name").notNull(),
  beltCode: varchar("belt_code", { length: 20, enum: beltCodes })
    .notNull()
    .references(() => pedagogyBelts.code, { onDelete: "restrict" }),
  /** Ordre pédagogique 1-10 (NP1=1 → M5=10), UNIQUE pour rendu déterministe. */
  displayOrder: integer("display_order").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PedagogyLevel = typeof pedagogyLevels.$inferSelect;
export type NewPedagogyLevel = typeof pedagogyLevels.$inferInsert;
