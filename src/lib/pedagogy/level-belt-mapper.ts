import { TamaAcademyError } from "@/lib/errors";

import type { BeltCode } from "@/lib/db/schema/pedagogy-belts";
import type { LevelCode } from "@/lib/db/schema/pedagogy-levels";

/**
 * Helper de présentation niveau → ceinture (Méthode Tama).
 *
 * Source-of-truth :
 *   - rule 02 §"Mapping codes BDD ↔ Ceintures"
 *   - docs/sprint-1/format-formules-acm.md §6
 *   - docs/decisions-acm-sprint-1.md §ACM-1 point #5 (M4 = M5 = noire_1er_dan)
 *
 * Décision verrouillée : il y a 10 niveaux distincts (`pedagogy_levels`) mais
 * SEULEMENT 9 ceintures distinctes (`pedagogy_belts`) côté UI. Les niveaux
 * M4 et M5 partagent tous deux la même `noire_1er_dan` ; la distinction
 * "Maître Soroban" (M5) est exposée au runtime via un badge UI dédié, pas
 * via une 10ᵉ ceinture en BDD.
 *
 * Pourquoi un helper et pas un JOIN BDD :
 *   - La table `pedagogy_levels` contient la FK `belt_code`, le JOIN est
 *     possible. Mais 99% des composants UI affichent juste "Ceinture XXX"
 *     à partir du `level_code` du `children` — faire un JOIN à chaque rendu
 *     serait du gaspillage. Le helper évite l'allers-retours BDD et garantit
 *     une UI cohérente même si le seed n'a pas encore tourné.
 *   - Toute désynchronisation future entre ce helper et la table sera
 *     détectée par les tests d'intégration (Sprint 1 J3 post-seed).
 */
const LEVEL_TO_BELT: Readonly<Record<LevelCode, BeltCode>> = Object.freeze({
  NP1: "blanche",
  NP2: "jaune",
  NV1: "orange",
  NV2: "verte",
  NV3: "bleue",
  M1: "violette",
  M2: "marron",
  M3: "rouge",
  M4: "noire_1er_dan",
  M5: "noire_1er_dan",
});

/**
 * Mappe un code de niveau (NP1…M5) vers son code de ceinture UI.
 *
 * @throws {TamaAcademyError} `INVALID_INPUT` si le code n'est pas reconnu —
 *   garde-fou défensif (ne devrait jamais arriver via TypeScript strict, mais
 *   se déclenche si la BDD est désynchronisée du code TS — typiquement après
 *   un seed qui aurait introduit un nouveau niveau sans patcher ce mapping).
 *
 * @example
 *   formatLevelAsBelt('NP1') // → 'blanche'
 *   formatLevelAsBelt('M4')  // → 'noire_1er_dan'
 *   formatLevelAsBelt('M5')  // → 'noire_1er_dan' (cas Maître Soroban)
 */
export function formatLevelAsBelt(code: LevelCode): BeltCode {
  const belt = LEVEL_TO_BELT[code];
  if (!belt) {
    throw new TamaAcademyError(
      "INVALID_INPUT",
      "Niveau non reconnu.",
      `formatLevelAsBelt: unknown level code '${String(code)}'. Expected one of NP1, NP2, NV1, NV2, NV3, M1, M2, M3, M4, M5.`,
    );
  }
  return belt;
}

/**
 * Vue immuable du mapping complet, utile pour générer des listes UI
 * (ex. composant `<BeltLegend />`) sans dupliquer la table de correspondance.
 */
export const LEVEL_BELT_MAPPING = LEVEL_TO_BELT;
