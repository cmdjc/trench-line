import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/", "legacy/", "node_modules/"] },
  js.configs.recommended,
  // The simulation must stay DOM-free: no browser globals inside sim/data/core.
  { files: ["src/sim/**/*.js", "src/data/**/*.js", "src/core/**/*.js"], languageOptions: { globals: {} } },
  { files: ["src/**/*.js"], languageOptions: { globals: globals.browser } },
  { files: ["tests/**/*.js", "*.config.js", "scripts/**/*.js"], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
];
