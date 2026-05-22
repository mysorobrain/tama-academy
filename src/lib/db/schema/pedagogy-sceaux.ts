import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { pairCodes, pedagogyPairs } from "./pedagogy-pairs";

/**
 * Catalogue immuable des 7 Sceaux (Méthode Tama) — 1:1 avec les paires.
 *
 * Chaque Sceau correspond à une paire (P1/P2/G1-G5) et représente l'atteinte
 * de la maîtrise par l'enfant (déblocage après `unlock_threshold` exercices
 * réussis sur la paire correspondante, défaut 30 — décision ACM-1 point #7).
 *
 * `glyph_svg_url` reste NULL au Sprint 1 (assets Phase 4 / design system).
 *
 * Source-of-truth pédagogique : rule 02 + docs/sprint-1/brief.md §J7.
 */
export const sceauCodes = pairCodes; // 1:1 mapping avec les paires
export type SceauCode = (typeof sceauCodes)[number];

export const pedagogySceaux = pgTable("pedagogy_sceaux", {
  code: varchar("code", { length: 2, enum: sceauCodes }).primaryKey(),
  pairCode: varchar("pair_code", { length: 2, enum: pairCodes })
    .notNull()
    .unique()
    .references(() => pedagogyPairs.code, { onDelete: "restrict" }),
  nameFr: text("name_fr").notNull(),
  /** URL CDN du glyph SVG (NULL au Sprint 1, rempli Phase 4). */
  glyphSvgUrl: text("glyph_svg_url"),
  /** Nombre d'exercices réussis pour débloquer le Sceau. Défaut 30 (ACM-1 #7). */
  unlockThreshold: integer("unlock_threshold").notNull().default(30),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PedagogySceau = typeof pedagogySceaux.$inferSelect;
export type NewPedagogySceau = typeof pedagogySceaux.$inferInsert;
