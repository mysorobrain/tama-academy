/**
 * Tests E2E des redirections d'authentification (proxy.ts).
 *
 * Ne passe pas par un browser (utilise Playwright `request` fixture directe-
 * ment) parce qu'on teste uniquement le comportement HTTP du proxy/middleware.
 * Plus rapide, plus déterministe.
 *
 * Couverture :
 * 1. Espace parent (Clerk protégé) sans session → redirect vers sign-in
 * 2. Espace enfant /eleve/* sans cookie → redirect vers /
 *
 * Note : en dev mode, Clerk redirige vers son UI hostée
 * (https://<instance>.accounts.dev/sign-in?redirect_url=...). On vérifie
 * uniquement que c'est un 3xx redirect et que le redirect_url préserve la
 * route demandée, pas la cible exacte.
 */

import { expect, test } from "@playwright/test";

test.describe("@critical Auth redirects", () => {
  test("anon GET /parent → 3xx (Clerk sign-in redirect)", async ({ request }) => {
    const response = await request.get("/parent", { maxRedirects: 0 });
    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);

    const location = response.headers()["location"];
    expect(location).toBeTruthy();
    expect(location).toMatch(/sign-in/);
    expect(decodeURIComponent(location ?? "")).toContain("/parent");
  });

  test("anon GET /eleve/dojo sans cookie → 307 / (landing)", async ({ request }) => {
    const response = await request.get("/eleve/dojo", { maxRedirects: 0 });
    expect(response.status()).toBe(307);

    const location = response.headers()["location"];
    expect(location).toBeTruthy();
    // Next.js peut renvoyer un location absolu (http://host/) ou relatif (/).
    expect(location).toMatch(/^(?:https?:\/\/[^/]+)?\/$/);
  });

  test("anon GET /eleve/dojo avec cookie INVALIDE → 307 /", async ({ request }) => {
    const response = await request.get("/eleve/dojo", {
      maxRedirects: 0,
      headers: { cookie: "tama_child_session=invalid.garbage.token" },
    });
    expect(response.status()).toBe(307);

    const location = response.headers()["location"];
    expect(location).toBeTruthy();
    expect(location).toMatch(/^(?:https?:\/\/[^/]+)?\/$/);
  });

  test("public route / répond 200", async ({ request }) => {
    const response = await request.get("/");
    expect(response.status()).toBe(200);
  });

  test("public route /api/health n'est pas bloquée par le proxy", async ({ request }) => {
    // On vérifie que le proxy laisse passer la route (pas de 3xx redirect),
    // pas que la BDD répond. En CI, DATABASE_URL est un placeholder et le
    // SELECT 1 échoue → la route renvoie 503 (handler exécuté = proxy OK).
    // En local avec une vraie BDD → 200. Les deux prouvent que la route est
    // publique.
    const response = await request.get("/api/health", { maxRedirects: 0 });
    expect([200, 503]).toContain(response.status());
  });
});
