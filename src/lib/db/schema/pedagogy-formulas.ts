import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { pairCodes, pedagogyPairs } from "./pedagogy-pairs";

/**
 * Catalogue immuable des 26 formules de la Méthode Tama (Petits Amis + Grands Amis).
 *
 * Pattern ID : `<pair_code>-<add|sub>-<plus|minus>-<n>` (cf. ACM-1 point #2).
 *   Exemples : "P1-add-plus-1", "G3-add-plus-3", "G5-add-plus-5".
 *
 * `applies_when_current_value_in` (cf. ACM-1 point #9, sémantique Option B) :
 *   plage complète des `currentValue` (0-9) où cette formule est le POINT D'ENTRÉE
 *   de la résolution. L'enchaînement Petit Ami (Règle 4 ACM) est calculé
 *   mécaniquement par le resolver J2, pas encodé en seed.
 *
 * Source-of-truth pédagogique : rule 02 + docs/sprint-1/format-formules-acm.md §2.
 */
export const formulaOperations = ["addition", "soustraction"] as const;
export type FormulaOperation = (typeof formulaOperations)[number];

export const pedagogyFormulas = pgTable("pedagogy_formulas", {
  id: varchar("id", { length: 40 }).primaryKey(),
  pairCode: varchar("pair_code", { length: 2, enum: pairCodes })
    .notNull()
    .references(() => pedagogyPairs.code, { onDelete: "restrict" }),
  operation: varchar("operation", { length: 20, enum: formulaOperations }).notNull(),
  /** Opérande 1-9. */
  operand: integer("operand").notNull(),
  /** Complément 1-9 (sauf G5 où complement == operand == 5, cas miroir). */
  complement: integer("complement").notNull(),
  /** Forme humaine "+1 = +5 -4". */
  formulaShort: text("formula_short").notNull(),
  /** Voix Tama registre Kids (5-7 ans). Rédigé ACM J3. */
  narrativeKids: text("narrative_kids").notNull(),
  /** Voix Tama registre Academy (8+). Rédigé ACM J3. */
  narrativeAcademy: text("narrative_academy").notNull(),
  /** Plage des `currentValue` où la formule est le point d'entrée (cf. §2bis). */
  appliesWhenCurrentValueIn: integer("applies_when_current_value_in").array().notNull(),
  /** Ordre pédagogique 1-26 (Petits Amis 1-8, Grands Amis 9-26), UNIQUE. */
  displayOrder: integer("display_order").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PedagogyFormula = typeof pedagogyFormulas.$inferSelect;
export type NewPedagogyFormula = typeof pedagogyFormulas.$inferInsert;
