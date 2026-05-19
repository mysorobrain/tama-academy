/**
 * Stub `server-only` pour Vitest.
 *
 * Le package npm `server-only` est un sentinel qui throw à l'import depuis
 * un client component. Vitest ne distingue pas server/client, donc l'import
 * casse les tests. Cet alias remplace le module par un export vide, ce qui
 * permet aux modules `import "server-only"` d'être chargés en environnement
 * de test sans changement de leur code.
 *
 * Configuré via resolve.alias dans vitest.config.ts.
 */
export {};
