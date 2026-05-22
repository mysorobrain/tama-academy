import { boolean, date, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { levelCodes, pedagogyLevels } from "./pedagogy-levels";
import { users } from "./users";

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
 *
 * `level_code` — anciennement `belt_code` (legacy Sprint 0). Renommé en
 * Sprint 1 J1 (migration 0006) car la colonne contient des codes de niveaux
 * (NP1…M5), pas des codes de ceintures (cf. decision ACM-1, mapping 10 → 9
 * via formatLevelAsBelt). FK vers pedagogy_levels(code) pour intégrité
 * référentielle au seed J3.
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
  levelCode: text("level_code", { enum: levelCodes })
    .notNull()
    .default("NP1")
    .references(() => pedagogyLevels.code, { onDelete: "restrict" }),
  /** Mode zen activé par le parent : pas de leaderboards, pas de compétition. */
  zenMode: boolean("zen_mode").notNull().default(false),
  dataJson: jsonb("data_json").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Child = typeof children.$inferSelect;
export type NewChild = typeof children.$inferInsert;

// Re-export `LevelCode` pour rétro-compatibilité des imports historiques qui
// pointaient sur students.ts. Le type est défini dans pedagogy-levels.ts.
export { type LevelCode } from "./pedagogy-levels";
