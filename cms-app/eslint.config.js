// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import vitest from "eslint-plugin-vitest";

export default [
  // 1) What to ignore
  {
    ignores: [
      "node_modules",
      "dist",
      "build",
      "coverage",
      ".next",
      "out"
    ],
  },

   {
    files: ["src/tests/**/*.js", "src/tests/**/*.jsx"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },

  // 2) Base JS rules
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...vitest.environments.env.globals,
        // Add Jest globals here to avoid eslint-env
        jest: "readonly",
        describe: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      vitest,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error", "log"] }], // allow console.log too
    },
    settings: {
      react: { version: "detect" },
    },
  },

  // 3) Test files overrides (optional, more explicit)
  {
    files: ["src/tests/**/*.{js,jsx}"],
    languageOptions: {
      globals: {
        jest: "readonly",
        describe: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
  },
];