/**
 * Tests E2E de Row Level Security (defense in depth).
 *
 * Attaque le backend Supabase directement avec l'anon key (sans passer par
 * notre app Next.js). Vérifie que même un attaquant qui contourne notre
 * proxy/middleware ne peut accéder à aucune donnée enfant.
 *
 * Les 4 tables critiques (users, children, parental_consents, user_events)
 * ont fait l'objet d'un REVOKE ALL FROM anon en PR #3 migration 0003, et
 * aucune policy RLS pour anon n'existe. Conséquences attendues côté REST :
 * - SELECT anon → erreur 401/403/4xx OU data vide (selon le filtrage REST
 *   Supabase). Aucun row leaké.
 * - INSERT anon → erreur 401/403/4xx. Aucune création.
 *
 * Note : Playwright ne charge pas automatiquement .env.local. On utilise
 * dotenv explicitement. Si les variables sont absentes, le test skip avec
 * un message explicite (pas de faux verts).
 */

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

test.describe("@critical RLS enforcement contre attaquant anon", () => {
  test.beforeAll(() => {
    if (!url || !anonKey) {
      test.skip(
        true,
        "NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY requis (vérifier .env.local).",
      );
    }
  });

  const anonClient = () =>
    createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

  test("anon ne peut pas SELECT users (REVOKE + aucune policy anon)", async () => {
    const { data, error } = await anonClient().from("users").select("*");
    expect(error || data?.length === 0).toBeTruthy();
    expect(data ?? []).toHaveLength(0);
  });

  test("anon ne peut pas SELECT children", async () => {
    const { data, error } = await anonClient().from("children").select("*");
    expect(error || data?.length === 0).toBeTruthy();
    expect(data ?? []).toHaveLength(0);
  });

  test("anon ne peut pas SELECT parental_consents", async () => {
    const { data, error } = await anonClient().from("parental_consents").select("*");
    expect(error || data?.length === 0).toBeTruthy();
    expect(data ?? []).toHaveLength(0);
  });

  test("anon ne peut pas INSERT user (tentative escalade rôle admin)", async () => {
    const { data, error } = await anonClient()
      .from("users")
      .insert({
        clerk_id: "test_anon_attack_" + Date.now(),
        email: "attack@test-rls.example.com",
        role: "admin",
        full_name: "Anon Attacker",
        locale: "fr",
      });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
