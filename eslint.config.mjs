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
    // shadcn CLI 가 만든 파일이다. 고치지 않는다.
    "hooks/use-mobile.ts",
  ]),
]);

export default eslintConfig;
