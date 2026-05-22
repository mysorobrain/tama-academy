// Re-export agrégé de tous les schémas Drizzle de Tama Academy.
// Chaque domaine vit dans son propre fichier src/lib/db/schema/<domain>.ts
// (cf. CONTRIBUTING.md "Ajouter une table BDD"). Le client Drizzle et
// drizzle-kit pointent uniquement sur ce fichier.

// Identité & comptes
export * from "./users";
export * from "./students";
export * from "./consents";
export * from "./events";

// Pédagogie (catalogue immuable read-only, cf. Sprint 1 J1 — PR #5)
export * from "./pedagogy-belts";
export * from "./pedagogy-levels";
export * from "./pedagogy-pairs";
export * from "./pedagogy-formulas";
export * from "./pedagogy-sceaux";
