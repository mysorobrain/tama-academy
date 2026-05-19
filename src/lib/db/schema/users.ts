import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Rôle dans la plateforme. `parent` par défaut (création via webhook Clerk
 * user.created). Les rôles `instructor` et `admin` sont attribués manuellement
 * par un admin existant (jamais via UPDATE self — verrouillé par la policy
 * UPDATE WITH CHECK en PR #3).
 */
export const userRoleEnum = pgEnum("user_role", ["parent", "instructor", "admin"]);

/**
 * Table `users` — un compte par humain authentifié (Clerk). Les enfants ont
 * leur propre table `children` (pas d'auth Clerk pour eux, JWT custom via
 * `child_session` cookie en PR #3).
 *
 * Identité : `clerk_id` (text, indexed unique) = `auth.jwt() ->> 'sub'`.
 * Ne JAMAIS écrire de policy avec `auth.uid()` (retourne null avec JWKS
 * Clerk, cf. docs/clerk-supabase-jwt-checklist.md).
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").unique().notNull(),
  role: userRoleEnum("role").notNull().default("parent"),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  /** Profil MBTI parent détecté au funnel d'inscription stage (PR #4). */
  mbtiProfile: text("mbti_profile"),
  /** Locale UI par défaut. FR seul au Sprint 0 (cf. brief §10). */
  locale: text("locale").notNull().default("fr"),
  /** Extensions flexibles. Pattern data_json.kind documenté dans Rule 01. */
  dataJson: jsonb("data_json").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
