/**
 * Conventional Commits + ajustements Tama Academy.
 * Référence : https://commitlint.js.org
 */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "chore",
        "refactor",
        "test",
        "docs",
        "ci",
        "perf",
        "style",
        "build",
        "revert",
      ],
    ],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [0, "always"],
    "footer-max-line-length": [0, "always"],
    "subject-case": [0],
  },
};

export default config;
