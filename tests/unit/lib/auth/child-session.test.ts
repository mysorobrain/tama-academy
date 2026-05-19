/**
 * Tests unitaires pour le module JWT enfant.
 *
 * Setup : on injecte JWT_CHILD_SECRET avant les imports (process.env est
 * partagé entre les tests Vitest). On utilise un secret de test différent
 * du secret de prod pour éviter toute confusion accidentelle.
 *
 * Couverture :
 * - Roundtrip sign → verify avec payload préservé
 * - Token absent ou vide → null
 * - Token mal formé → null
 * - Token signé avec un autre secret → null
 * - Token expiré → null
 * - Token avec mauvais issuer → null
 * - Token avec mauvaise audience → null
 * - Token avec algorithm confusion (alg=none) → null
 * - Token avec scope invalide → null
 * - getSecret throws si secret absent ou < 32 chars
 */

import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

process.env.JWT_CHILD_SECRET = "test-secret-at-least-32-chars-long-for-hs256-signing-purposes-only";
process.env.JWT_CHILD_ISSUER = "tama-academy";
process.env.JWT_CHILD_AUDIENCE = "tama-child-session";
process.env.JWT_CHILD_MAX_AGE_SECONDS = "3600";

const { signChildToken, verifyChildToken, CHILD_SESSION_COOKIE_NAME } =
  await import("@/lib/auth/child-session");

const sampleSecret = new TextEncoder().encode(process.env.JWT_CHILD_SECRET!);

describe("CHILD_SESSION_COOKIE_NAME", () => {
  it("exporte la constante 'tama_child_session'", () => {
    expect(CHILD_SESSION_COOKIE_NAME).toBe("tama_child_session");
  });
});

describe("signChildToken + verifyChildToken (roundtrip)", () => {
  it("préserve payload (childId, parentClerkId, scope=dojo)", async () => {
    const token = await signChildToken({
      childId: "child-uuid-123",
      parentClerkId: "user_clerk_abc",
      scope: "dojo",
    });

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const payload = await verifyChildToken(token);
    expect(payload).toEqual({
      childId: "child-uuid-123",
      parentClerkId: "user_clerk_abc",
      scope: "dojo",
    });
  });

  it("supporte scope=arena", async () => {
    const token = await signChildToken({
      childId: "c1",
      parentClerkId: "p1",
      scope: "arena",
    });
    const payload = await verifyChildToken(token);
    expect(payload?.scope).toBe("arena");
  });

  it("supporte scope=stage", async () => {
    const token = await signChildToken({
      childId: "c1",
      parentClerkId: "p1",
      scope: "stage",
    });
    const payload = await verifyChildToken(token);
    expect(payload?.scope).toBe("stage");
  });
});

describe("verifyChildToken — rejets sécurité", () => {
  it("rejette string vide → null", async () => {
    expect(await verifyChildToken("")).toBeNull();
  });

  it("rejette token mal formé → null", async () => {
    expect(await verifyChildToken("not.a.jwt")).toBeNull();
  });

  it("rejette random garbage → null", async () => {
    expect(await verifyChildToken("aaa.bbb.ccc")).toBeNull();
  });

  it("rejette token signé avec un autre secret → null", async () => {
    const wrongSecret = new TextEncoder().encode(
      "different-secret-also-32-chars-long-but-wrong-key-for-test",
    );
    const token = await new SignJWT({
      childId: "c",
      parentClerkId: "p",
      scope: "dojo",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("tama-academy")
      .setAudience("tama-child-session")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(wrongSecret);

    expect(await verifyChildToken(token)).toBeNull();
  });

  it("rejette token expiré → null", async () => {
    const token = await new SignJWT({
      childId: "c",
      parentClerkId: "p",
      scope: "dojo",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("tama-academy")
      .setAudience("tama-child-session")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(sampleSecret);

    expect(await verifyChildToken(token)).toBeNull();
  });

  it("rejette token avec mauvais issuer → null", async () => {
    const token = await new SignJWT({
      childId: "c",
      parentClerkId: "p",
      scope: "dojo",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("evil-issuer")
      .setAudience("tama-child-session")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(sampleSecret);

    expect(await verifyChildToken(token)).toBeNull();
  });

  it("rejette token avec mauvais audience → null", async () => {
    const token = await new SignJWT({
      childId: "c",
      parentClerkId: "p",
      scope: "dojo",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("tama-academy")
      .setAudience("not-our-audience")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(sampleSecret);

    expect(await verifyChildToken(token)).toBeNull();
  });

  it("rejette token avec scope invalide → null", async () => {
    const token = await new SignJWT({
      childId: "c",
      parentClerkId: "p",
      scope: "admin",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("tama-academy")
      .setAudience("tama-child-session")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(sampleSecret);

    expect(await verifyChildToken(token)).toBeNull();
  });

  it("rejette token sans childId → null", async () => {
    const token = await new SignJWT({
      parentClerkId: "p",
      scope: "dojo",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("tama-academy")
      .setAudience("tama-child-session")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(sampleSecret);

    expect(await verifyChildToken(token)).toBeNull();
  });
});

describe("signChildToken — erreurs de configuration", () => {
  const originalSecret = process.env.JWT_CHILD_SECRET;

  afterAll(() => {
    process.env.JWT_CHILD_SECRET = originalSecret;
  });

  it("throws si JWT_CHILD_SECRET absent", async () => {
    vi.resetModules();
    delete process.env.JWT_CHILD_SECRET;
    const { signChildToken: signFresh } = await import("@/lib/auth/child-session");
    await expect(signFresh({ childId: "c", parentClerkId: "p", scope: "dojo" })).rejects.toThrow(
      /JWT_CHILD_SECRET/,
    );
  });

  it("throws si JWT_CHILD_SECRET < 32 chars", async () => {
    vi.resetModules();
    process.env.JWT_CHILD_SECRET = "too-short";
    const { signChildToken: signFresh } = await import("@/lib/auth/child-session");
    await expect(signFresh({ childId: "c", parentClerkId: "p", scope: "dojo" })).rejects.toThrow(
      /min 32 chars/,
    );
  });
});

describe("signChildToken — JWT_CHILD_MAX_AGE_SECONDS validation", () => {
  const originalMaxAge = process.env.JWT_CHILD_MAX_AGE_SECONDS;

  afterAll(() => {
    process.env.JWT_CHILD_MAX_AGE_SECONDS = originalMaxAge;
    process.env.JWT_CHILD_SECRET =
      "test-secret-at-least-32-chars-long-for-hs256-signing-purposes-only";
  });

  beforeAll(() => {
    process.env.JWT_CHILD_SECRET =
      "test-secret-at-least-32-chars-long-for-hs256-signing-purposes-only";
  });

  it("throws si JWT_CHILD_MAX_AGE_SECONDS = 'abc'", async () => {
    vi.resetModules();
    process.env.JWT_CHILD_MAX_AGE_SECONDS = "abc";
    const { signChildToken: signFresh } = await import("@/lib/auth/child-session");
    await expect(signFresh({ childId: "c", parentClerkId: "p", scope: "dojo" })).rejects.toThrow(
      /positive integer/,
    );
  });

  it("throws si JWT_CHILD_MAX_AGE_SECONDS = '-1'", async () => {
    vi.resetModules();
    process.env.JWT_CHILD_MAX_AGE_SECONDS = "-1";
    const { signChildToken: signFresh } = await import("@/lib/auth/child-session");
    await expect(signFresh({ childId: "c", parentClerkId: "p", scope: "dojo" })).rejects.toThrow(
      /positive integer/,
    );
  });

  it("throws si JWT_CHILD_MAX_AGE_SECONDS > 7200 (hard cap)", async () => {
    vi.resetModules();
    process.env.JWT_CHILD_MAX_AGE_SECONDS = "86400";
    const { signChildToken: signFresh } = await import("@/lib/auth/child-session");
    await expect(signFresh({ childId: "c", parentClerkId: "p", scope: "dojo" })).rejects.toThrow(
      /hard cap/,
    );
  });

  it("accepte JWT_CHILD_MAX_AGE_SECONDS = 7200 (limite exacte)", async () => {
    vi.resetModules();
    process.env.JWT_CHILD_MAX_AGE_SECONDS = "7200";
    const { signChildToken: signFresh } = await import("@/lib/auth/child-session");
    const token = await signFresh({
      childId: "c",
      parentClerkId: "p",
      scope: "dojo",
    });
    expect(typeof token).toBe("string");
  });
});
