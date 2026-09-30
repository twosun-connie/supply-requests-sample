import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // server-only 는 서버 번들 밖에서 불러오면 오류를 던진다. 테스트에서는 빈 모듈로 바꾼다.
      "server-only": fileURLToPath(
        new URL("./test/db/support/empty.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["{app,features,lib,components,test}/**/*.test.{ts,tsx}"],
    // DB 테스트는 파일마다 PGlite(메모리 안의 PostgreSQL)를 하나 띄운다. 동시에 여러 개를 띄우면 메모리가 모자란다.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
