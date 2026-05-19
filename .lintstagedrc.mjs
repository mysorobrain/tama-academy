/**
 * lint-staged — exécute ESLint/Prettier seulement sur les fichiers stagés.
 * Référence : https://github.com/lint-staged/lint-staged
 */
const config = {
  "*.{ts,tsx,js,jsx,mjs,cjs}": ["eslint --fix", "prettier --write"],
  "*.{json,md,mdx,css,yml,yaml}": ["prettier --write"],
};

export default config;
