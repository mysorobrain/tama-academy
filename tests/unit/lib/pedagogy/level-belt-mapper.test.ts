import { describe, expect, it } from "vitest";

import { isTamaAcademyError } from "@/lib/errors";
import { LEVEL_BELT_MAPPING, formatLevelAsBelt } from "@/lib/pedagogy/level-belt-mapper";

// Note : ces tests sont la garde-fou principale du mapping niveau → ceinture
// (cf. docs/decisions-acm-sprint-1.md §ACM-1 point #5, M4 = M5 = noire_1er_dan).
// Si on touche ce mapping, ces tests DOIVENT être mis à jour en synchro avec
// le seed des tables pedagogy_belts et pedagogy_levels (J3).

describe("formatLevelAsBelt", () => {
  describe("mapping des 10 niveaux vers leur ceinture", () => {
    it("NP1 → blanche", () => {
      expect(formatLevelAsBelt("NP1")).toBe("blanche");
    });

    it("NP2 → jaune", () => {
      expect(formatLevelAsBelt("NP2")).toBe("jaune");
    });

    it("NV1 → orange", () => {
      expect(formatLevelAsBelt("NV1")).toBe("orange");
    });

    it("NV2 → verte", () => {
      expect(formatLevelAsBelt("NV2")).toBe("verte");
    });

    it("NV3 → bleue", () => {
      expect(formatLevelAsBelt("NV3")).toBe("bleue");
    });

    it("M1 → violette", () => {
      expect(formatLevelAsBelt("M1")).toBe("violette");
    });

    it("M2 → marron", () => {
      expect(formatLevelAsBelt("M2")).toBe("marron");
    });

    it("M3 → rouge", () => {
      expect(formatLevelAsBelt("M3")).toBe("rouge");
    });
  });

  describe("cas spécial M4 et M5 partagent noire_1er_dan", () => {
    it("M4 → noire_1er_dan (1er Dan classique)", () => {
      expect(formatLevelAsBelt("M4")).toBe("noire_1er_dan");
    });

    it("M5 → noire_1er_dan (Maître Soroban — même ceinture, badge UI distinct)", () => {
      expect(formatLevelAsBelt("M5")).toBe("noire_1er_dan");
    });

    it("M4 et M5 retournent strictement la même valeur (anti-régression ACM-1 #5)", () => {
      expect(formatLevelAsBelt("M4")).toBe(formatLevelAsBelt("M5"));
    });
  });

  describe("garde-fou défensif", () => {
    it("throws TamaAcademyError(INVALID_INPUT) si le code est inconnu", () => {
      // Bypass TypeScript pour simuler une désynchro runtime (BDD ahead du code).
      expect(() => formatLevelAsBelt("UNKNOWN" as never)).toThrow();
      try {
        formatLevelAsBelt("UNKNOWN" as never);
        expect.unreachable("formatLevelAsBelt should have thrown");
      } catch (err) {
        expect(isTamaAcademyError(err)).toBe(true);
        if (isTamaAcademyError(err)) {
          expect(err.code).toBe("INVALID_INPUT");
          expect(err.userMessage).toBe("Niveau non reconnu.");
          expect(err.technicalMessage).toContain("UNKNOWN");
        }
      }
    });

    it("throws aussi sur chaîne vide", () => {
      expect(() => formatLevelAsBelt("" as never)).toThrow();
    });

    it("throws aussi sur null/undefined castés", () => {
      expect(() => formatLevelAsBelt(null as never)).toThrow();
      expect(() => formatLevelAsBelt(undefined as never)).toThrow();
    });
  });

  describe("LEVEL_BELT_MAPPING export", () => {
    it("contient exactement les 10 niveaux Méthode Tama", () => {
      const keys = Object.keys(LEVEL_BELT_MAPPING).sort();
      expect(keys).toEqual(
        ["M1", "M2", "M3", "M4", "M5", "NP1", "NP2", "NV1", "NV2", "NV3"].sort(),
      );
    });

    it("n'expose que 9 ceintures distinctes (M4=M5)", () => {
      const beltsDistinct = new Set(Object.values(LEVEL_BELT_MAPPING));
      expect(beltsDistinct.size).toBe(9);
    });

    it("est figé (Object.freeze)", () => {
      expect(Object.isFrozen(LEVEL_BELT_MAPPING)).toBe(true);
    });

    it("reflète strictement le mapping du helper formatLevelAsBelt", () => {
      for (const [level, belt] of Object.entries(LEVEL_BELT_MAPPING)) {
        expect(formatLevelAsBelt(level as never)).toBe(belt);
      }
    });
  });
});
