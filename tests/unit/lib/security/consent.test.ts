/**
 * Tests unitaires pour les helpers de consentement parental.
 *
 * Couvre les 2 modes (*AsParent / *System) sur chacun :
 * - consent présent + granted + not revoked → true
 * - consent absent → false
 * - consent révoqué → false (revoked_at != null)
 * - consent granted=false → false
 * - require*: throw FORBIDDEN si verify retourne false
 *
 * Mocks :
 * - db (Drizzle) mockée pour les tests *System
 * - SupabaseClient mocké (chain builder) pour les tests *AsParent
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { TamaAcademyError, isTamaAcademyError } from "@/lib/errors";

// Mock Drizzle db avant les imports
vi.mock("@/lib/db/client", () => ({
  db: {
    query: {
      parentalConsents: {
        findFirst: vi.fn(),
      },
    },
  },
}));

const { db } = await import("@/lib/db/client");
const {
  verifyParentalConsentAsParent,
  verifyParentalConsentSystem,
  requireParentalConsentAsParent,
  requireParentalConsentSystem,
} = await import("@/lib/security/consent");

const mockDbFindFirst = db.query.parentalConsents.findFirst as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Helpers Supabase mock (chain builder)
// ============================================================================

type MaybeSingleResult = {
  data: { id: string } | null;
  error: { message: string } | null;
};

function mockSupabaseClient(result: MaybeSingleResult) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  };
}

// ============================================================================
// *AsParent (client Supabase user-aware)
// ============================================================================

describe("verifyParentalConsentAsParent", () => {
  it("retourne true si consent présent (data != null)", async () => {
    const client = mockSupabaseClient({ data: { id: "consent-1" }, error: null });
    const ok = await verifyParentalConsentAsParent(client as never, "child-1", "account_creation");
    expect(ok).toBe(true);
    expect(client.from).toHaveBeenCalledWith("parental_consents");
    expect(client._chain.eq).toHaveBeenCalledWith("child_id", "child-1");
    expect(client._chain.eq).toHaveBeenCalledWith("consent_type", "account_creation");
    expect(client._chain.eq).toHaveBeenCalledWith("granted", true);
    expect(client._chain.is).toHaveBeenCalledWith("revoked_at", null);
  });

  it("retourne false si consent absent (data null)", async () => {
    const client = mockSupabaseClient({ data: null, error: null });
    const ok = await verifyParentalConsentAsParent(client as never, "child-1", "camera_capture");
    expect(ok).toBe(false);
  });

  it("throws TamaAcademyError(INTERNAL) si Supabase remonte une erreur", async () => {
    const client = mockSupabaseClient({
      data: null,
      error: { message: "connection failed" },
    });
    await expect(
      verifyParentalConsentAsParent(client as never, "child-1", "analytics"),
    ).rejects.toMatchObject({
      code: "INTERNAL",
      name: "TamaAcademyError",
    });
  });
});

describe("requireParentalConsentAsParent", () => {
  it("ne throw pas si verify retourne true", async () => {
    const client = mockSupabaseClient({ data: { id: "consent-1" }, error: null });
    await expect(
      requireParentalConsentAsParent(client as never, "child-1", "account_creation"),
    ).resolves.toBeUndefined();
  });

  it("throws TamaAcademyError(FORBIDDEN) si verify retourne false", async () => {
    const client = mockSupabaseClient({ data: null, error: null });
    try {
      await requireParentalConsentAsParent(client as never, "child-1", "camera_capture");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(isTamaAcademyError(err)).toBe(true);
      if (isTamaAcademyError(err)) {
        expect(err.code).toBe("FORBIDDEN");
        expect(err.technicalMessage).toContain("(AsParent)");
      }
    }
  });
});

// ============================================================================
// *System (Drizzle service_role bypass)
// ============================================================================

describe("verifyParentalConsentSystem", () => {
  it("retourne true si Drizzle retourne un row", async () => {
    mockDbFindFirst.mockResolvedValueOnce({ id: "consent-1" });
    const ok = await verifyParentalConsentSystem("child-1", "account_creation");
    expect(ok).toBe(true);
    expect(mockDbFindFirst).toHaveBeenCalledOnce();
  });

  it("retourne false si Drizzle retourne undefined (consent absent OU révoqué)", async () => {
    mockDbFindFirst.mockResolvedValueOnce(undefined);
    const ok = await verifyParentalConsentSystem("child-1", "camera_capture");
    expect(ok).toBe(false);
  });

  it("propage l'erreur si Drizzle throw (DB down)", async () => {
    mockDbFindFirst.mockRejectedValueOnce(new Error("connection refused"));
    await expect(verifyParentalConsentSystem("child-1", "marketing")).rejects.toThrow(
      /connection refused/,
    );
  });
});

describe("requireParentalConsentSystem", () => {
  it("ne throw pas si verify retourne true", async () => {
    mockDbFindFirst.mockResolvedValueOnce({ id: "consent-1" });
    await expect(
      requireParentalConsentSystem("child-1", "account_creation"),
    ).resolves.toBeUndefined();
  });

  it("throws TamaAcademyError(FORBIDDEN) si verify retourne false", async () => {
    mockDbFindFirst.mockResolvedValueOnce(undefined);
    try {
      await requireParentalConsentSystem("child-1", "video_recording");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(isTamaAcademyError(err)).toBe(true);
      if (isTamaAcademyError(err)) {
        expect(err.code).toBe("FORBIDDEN");
        expect(err.technicalMessage).toContain("(System)");
      }
    }
  });
});

// ============================================================================
// Garde-fou TamaAcademyError instance
// ============================================================================

describe("TamaAcademyError shape (sanity)", () => {
  it("le throw FORBIDDEN est bien une instance TamaAcademyError", async () => {
    mockDbFindFirst.mockResolvedValueOnce(undefined);
    await expect(requireParentalConsentSystem("child-1", "analytics")).rejects.toBeInstanceOf(
      TamaAcademyError,
    );
  });
});
