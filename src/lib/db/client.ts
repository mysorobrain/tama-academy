import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL est requis (pooler transaction mode port 6543 pour le runtime app).",
  );
}

// IMPORTANT : { prepare: false } est obligatoire avec le pooler Supabase en
// mode transaction (port 6543). Le pooler ne supporte pas les prepared
// statements partagés entre transactions. Sans cette option, les requêtes
// échouent silencieusement après quelques appels concurrents.
// Voir : https://supabase.com/docs/guides/database/postgres/connection-management
const client = postgres(url, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema, casing: "snake_case" });

export type Database = typeof db;
