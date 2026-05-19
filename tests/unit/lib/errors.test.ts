import { describe, expect, it } from "vitest";

import { TamaAcademyError, isTamaAcademyError } from "@/lib/errors";

describe("TamaAcademyError", () => {
  it("construit une erreur avec code, userMessage, technicalMessage", () => {
    const err = new TamaAcademyError(
      "NOT_FOUND",
      "Élève introuvable.",
      "student id=abc not found or not accessible by user xyz",
    );
    expect(err.code).toBe("NOT_FOUND");
    expect(err.userMessage).toBe("Élève introuvable.");
    expect(err.technicalMessage).toBe("student id=abc not found or not accessible by user xyz");
    expect(err.name).toBe("TamaAcademyError");
    expect(err.message).toBe("student id=abc not found or not accessible by user xyz");
  });

  it("hérite de Error", () => {
    const err = new TamaAcademyError("INTERNAL", "Oups", "boom");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(TamaAcademyError);
  });

  it("supporte tous les codes définis", () => {
    const codes = [
      "NOT_FOUND",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "INVALID_INPUT",
      "PEDAGOGY_VIOLATION",
      "INTERNAL",
    ] as const;
    for (const code of codes) {
      const err = new TamaAcademyError(code, "user", "tech");
      expect(err.code).toBe(code);
    }
  });
});

describe("isTamaAcademyError", () => {
  it("retourne true pour une TamaAcademyError", () => {
    expect(isTamaAcademyError(new TamaAcademyError("INTERNAL", "u", "t"))).toBe(true);
  });

  it("retourne false pour une Error standard", () => {
    expect(isTamaAcademyError(new Error("boom"))).toBe(false);
  });

  it("retourne false pour autre chose (string, null, undefined)", () => {
    expect(isTamaAcademyError("boom")).toBe(false);
    expect(isTamaAcademyError(null)).toBe(false);
    expect(isTamaAcademyError(undefined)).toBe(false);
    expect(isTamaAcademyError({ code: "NOT_FOUND" })).toBe(false);
  });
});
