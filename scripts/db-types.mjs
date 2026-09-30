// 개발 DB 에서 TypeScript 타입을 만들어 lib/supabase/database.types.ts 에 쓴다. 실행: pnpm db:types
// 사용자가 pnpm db:push 를 끝낸 뒤에 실행한다. DB 를 읽기만 한다. Supabase 로그인(supabase login)이 필요하다.
// 실패하면 기존 파일을 그대로 둔다.
import { spawnSync } from "node:child_process";
import { renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, isProjectRef, readProjects, supabaseBin } from "./lib.mjs";

const OUTPUT = join(ROOT, "lib", "supabase", "database.types.ts");
const { dev } = readProjects();

if (!isProjectRef(dev.ref)) {
  console.error(
    "✖ supabase/project-refs.json 의 dev.ref 가 비어 있다. 사용자에게 개발 프로젝트의 Project ID 를 적어 달라고 요청한다.",
  );
  process.exit(1);
}

const result = spawnSync(
  supabaseBin(),
  [
    "gen",
    "types",
    "--lang=typescript",
    "--project-id",
    dev.ref,
    "--schema",
    "public",
  ],
  {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === "win32",
  },
);
if (
  result.status !== 0 ||
  !/export type Database\b/.test(result.stdout ?? "")
) {
  console.error(
    `✖ 타입을 만들지 못했다. 기존 파일은 그대로다.\n${(result.stderr ?? "").trim().slice(-2000)}`,
  );
  console.error(
    "다음: 사용자에게 pnpm supabase login 과 pnpm db:push 를 끝냈는지 확인한다.",
  );
  process.exit(1);
}

writeFileSync(`${OUTPUT}.tmp`, result.stdout);
renameSync(`${OUTPUT}.tmp`, OUTPUT);
console.log(
  `lib/supabase/database.types.ts 를 다시 만들었다(${dev.name || dev.ref}). 다음: pnpm typecheck`,
);
