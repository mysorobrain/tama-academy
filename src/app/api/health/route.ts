import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db/client";

// Force dynamic : la route exécute un SELECT 1 contre la BDD à chaque appel,
// jamais de mise en cache statique. Sans ça, Next.js prerend la route au
// build (sur un placeholder DATABASE_URL en CI) et le résultat figé serait
// servi en prod.
export const dynamic = "force-dynamic";

// Runtime Node (et pas Edge) : postgres.js a besoin du runtime Node complet
// (sockets TCP, Buffer, etc.). Edge runtime ne supporte pas postgres.js.
export const runtime = "nodejs";

type HealthStatusOk = {
  status: "ok";
  db: "ok";
  timestamp: string;
};

type HealthStatusKo = {
  status: "ko";
  db: "ko";
  reason: string;
  timestamp: string;
};

type HealthResponse = HealthStatusOk | HealthStatusKo;

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const timestamp = new Date().toISOString();

  try {
    // SELECT 1 minimal — pas de table interrogée, juste vérifier que la
    // connexion pooler répond et qu'on peut exécuter du SQL.
    await db.execute(sql`SELECT 1`);

    return NextResponse.json<HealthStatusOk>(
      { status: "ok", db: "ok", timestamp },
      { status: 200 },
    );
  } catch (error) {
    // Pas de PII dans la réponse (rule 04). Le message d'erreur Postgres peut
    // contenir le user/host de la connection string → on tronque à 120 chars
    // et on ne renvoie qu'un résumé safe.
    const reason = error instanceof Error ? error.message.slice(0, 120) : "unknown database error";

    return NextResponse.json<HealthStatusKo>(
      { status: "ko", db: "ko", reason, timestamp },
      { status: 503 },
    );
  }
}
