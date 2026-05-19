import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env.local" });
loadEnv();

const directUrl = process.env.DATABASE_DIRECT_URL;
if (!directUrl) {
  throw new Error(
    "DATABASE_DIRECT_URL est requis pour drizzle-kit (connexion directe port 5432, pas pooler).",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/index.ts",
  out: "./src/lib/db/migrations",
  dbCredentials: {
    url: directUrl,
  },
  strict: true,
  verbose: true,
  casing: "snake_case",
});
