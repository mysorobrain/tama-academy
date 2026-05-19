import { describe, expect, it } from "vitest";
import { z } from "zod";

import { TamaAcademyError, isTamaAcademyError } from "@/lib/errors";
import { validateInput } from "@/lib/security/validation";

const StudentSchema = z.object({
  firstName: z.string().min(1).max(50),
  birthDate: z.string().date(),
  beltCode: z.enum(["NP1", "NP2", "NV1"]),
});

describe("validateInput", () => {
  it("retourne le data typé si l'input est valide", () => {
    const input = {
      firstName: "Léo",
      birthDate: "2019-05-12",
      beltCode: "NP1" as const,
    };
    const result = validateInput(StudentSchema, input, "test-student");
    expect(result).toEqual(input);
  });

  it("throws TamaAcademyError(INVALID_INPUT) si l'input est invalide", () => {
    const input = { firstName: "", birthDate: "not-a-date", beltCode: "INVALID" };
    expect(() => validateInput(StudentSchema, input, "test-student")).toThrow(TamaAcademyError);
  });

  it("le message user-facing est générique (pas de leak de structure)", () => {
    try {
      validateInput(StudentSchema, { foo: "bar" }, "test-student");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(isTamaAcademyError(err)).toBe(true);
      if (isTamaAcademyError(err)) {
        expect(err.code).toBe("INVALID_INPUT");
        expect(err.userMessage).toBe("Données invalides. Vérifie les champs et réessaie.");
        // technical message contient bien les détails (pour les logs)
        expect(err.technicalMessage).toContain("test-student");
      }
    }
  });

  it("supporte les schémas avec transform", () => {
    const schema = z.object({
      age: z.number().transform((n) => n * 2),
    });
    const result = validateInput(schema, { age: 5 }, "transform");
    expect(result.age).toBe(10);
  });

  it("utilise 'input' comme contexte par défaut", () => {
    try {
      validateInput(StudentSchema, { foo: "bar" });
      expect.unreachable("should have thrown");
    } catch (err) {
      if (isTamaAcademyError(err)) {
        expect(err.technicalMessage).toContain("Validation failed for input:");
      }
    }
  });
});
