// Re-export agrégé de tous les schémas Drizzle de Tama Academy.
// Chaque domaine vit dans son propre fichier src/lib/db/schema/<domain>.ts
// (cf. CONTRIBUTING.md "Ajouter une table BDD"). Le client Drizzle et
// drizzle-kit pointent uniquement sur ce fichier.

export * from "./users";
export * from "./students";
export * from "./consents";
export * from "./events";
