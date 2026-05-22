import { describe, expect, it } from "vitest";

import { redactPII, redactStudent } from "@/lib/security/redaction";

describe("redactPII", () => {
  it("masque un email", () => {
    expect(redactPII("contact samir@example.com please")).toBe("contact [REDACTED_EMAIL] please");
  });

  it("masque plusieurs emails", () => {
    expect(redactPII("a@b.co et c@d.net")).toBe("[REDACTED_EMAIL] et [REDACTED_EMAIL]");
  });

  it("masque un numéro de téléphone FR", () => {
    expect(redactPII("call +33 6 12 34 56 78")).toBe("call [REDACTED_PHONE]");
  });

  it("masque un numéro de téléphone MA", () => {
    expect(redactPII("contact +212 6 12 34 56 78")).toBe("contact [REDACTED_PHONE]");
  });

  it("masque un JWT (3 segments base64url)", () => {
    expect(
      redactPII(
        "token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
      ),
    ).toBe("token=[REDACTED_JWT]");
  });

  it("ne touche pas à du texte sans PII", () => {
    expect(redactPII("aucune donnée sensible ici")).toBe("aucune donnée sensible ici");
  });

  it("est idempotent (les placeholders ne sont pas re-matchés)", () => {
    const once = redactPII("user a@b.co");
    const twice = redactPII(once);
    expect(twice).toBe(once);
  });

  it("retourne la string telle quelle si vide", () => {
    expect(redactPII("")).toBe("");
  });

  it("masque emails + JWT + phone dans une même string", () => {
    const input =
      "user a@b.co token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U phone +33 6 12 34 56 78";
    const out = redactPII(input);
    expect(out).toContain("[REDACTED_EMAIL]");
    expect(out).toContain("[REDACTED_JWT]");
    expect(out).toContain("[REDACTED_PHONE]");
    expect(out).not.toContain("a@b.co");
    expect(out).not.toContain("+33");
  });
});

describe("redactStudent", () => {
  const fullStudent = {
    id: "child-uuid-123",
    firstName: "Léo",
    lastInitial: "A",
    birthDate: new Date("2019-05-12"),
    levelCode: "NP1" as const,
    parentId: "parent-uuid-456",
  };

  it("public : retourne uniquement id, initiale prénom, levelCode", () => {
    const out = redactStudent(fullStudent, "public");
    expect(out).toEqual({
      id: "child-uuid-123",
      firstName: "L.",
      levelCode: "NP1",
    });
    expect(out).not.toHaveProperty("birthDate");
    expect(out).not.toHaveProperty("parentId");
  });

  it("authenticated : ajoute lastInitial", () => {
    const out = redactStudent(fullStudent, "authenticated");
    expect(out).toEqual({
      id: "child-uuid-123",
      firstName: "L.",
      lastInitial: "A",
      levelCode: "NP1",
    });
    expect(out).not.toHaveProperty("birthDate");
  });

  it("owner : retourne tout (sans modification)", () => {
    const out = redactStudent(fullStudent, "owner");
    expect(out).toEqual(fullStudent);
  });

  it("gère les champs absents (firstName undefined)", () => {
    const partial: {
      id?: string;
      firstName?: string;
      lastInitial?: string;
      birthDate?: Date;
      levelCode?: string;
      parentId?: string;
    } = { id: "abc", levelCode: "NP1" };
    const out = redactStudent(partial, "public");
    expect(out).toEqual({ id: "abc", levelCode: "NP1" });
    expect(out.firstName).toBeUndefined();
  });
});
