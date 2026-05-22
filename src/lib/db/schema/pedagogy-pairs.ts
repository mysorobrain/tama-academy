import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Les 7 paires de la Méthode Tama : 2 Petits Amis (P1, P2) + 5 Grands Amis (G1-G5).
 *
 * `amis` est un INTEGER[] à 2 éléments représentant les compléments :
 *   - P1 : [1, 4] (Petit Ami de 5)
 *   - P2 : [2, 3] (Petit Ami de 5)
 *   - G1 : [1, 9] (Grand Ami de 10)
 *   - G2 : [2, 8] (Grand Ami de 10)
 *   - G3 : [3, 7] (Grand Ami de 10)
 *   - G4 : [4, 6] (Grand Ami de 10)
 *   - G5 : [5, 5] (Grand Ami de 10, cas miroir — décision ACM-1 point #3)
 *
 * Source-of-truth pédagogique : rule 02 + docs/sprint-1/format-formules-acm.md §2.
 */
export const pairCodes = ["P1", "P2", "G1", "G2", "G3", "G4", "G5"] as const;
export type PairCode = (typeof pairCodes)[number];

export const pairFamilies = ["petit_ami", "grand_ami"] as const;
export type PairFamily = (typeof pairFamilies)[number];

export const pedagogyPairs = pgTable("pedagogy_pairs", {
  code: varchar("code", { length: 2, enum: pairCodes }).primaryKey(),
  family: varchar("family", { length: 20, enum: pairFamilies }).notNull(),
  /** Compléments arithmétiques, INTEGER[] à 2 éléments. */
  amis: integer("amis").array().notNull(),
  /** Ordre pédagogique 1-7 (P1=1, P2=2, G1=3, …, G5=7), UNIQUE. */
  displayOrder: integer("display_order").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PedagogyPair = typeof pedagogyPairs.$inferSelect;
export type NewPedagogyPair = typeof pedagogyPairs.$inferInsert;
