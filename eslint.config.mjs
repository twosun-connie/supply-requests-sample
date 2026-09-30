import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { projectRules } from "./eslint.rules.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...projectRules,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "lib/supabase/database.types.ts",
  ]),
]);

export default eslintConfig;
