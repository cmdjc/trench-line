import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/", "legacy/", "node_modules/"] },
  js.configs.recommended,
  // Empty catch: meta/storage recovery deliberately swallows failures (prototype parity).
  { rules: { "no-empty": ["error", { allowEmptyCatch: true }] } },
  // The simulation must stay DOM-free: browser globals are only granted to
  // the UI layer, the entry point and the storage adapter — never sim/data/core.
  { files: ["src/ui/**/*.js", "src/main.js", "src/storage.js"], languageOptions: { globals: globals.browser } },
  { files: ["tests/**/*.js", "*.config.js", "scripts/**/*.{js,mjs}"], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
];
