// 마이그레이션을 원격 DB 에 적용한다. 사람이 터미널에서 실행한다: pnpm db:push (개발) / pnpm db:push --prod (운영)
// AI 는 이 명령을 실행하지 않는다(.claude 의 거부 규칙과 훅이 막는다).
// supabase link 를 바꾸지 않는다. 대상은 supabase/project-refs.json 에서 읽어 --project-ref 로 넘긴다.
// 그래서 "운영에 연결한 채 되돌리기를 잊는" 사고가 생기지 않는다.
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import {
  PUSHED_RECORD,
  isProjectRef,
  migrationFiles,
  readProjects,
  readText,
  supabaseBin,
} from "./lib.mjs";

const isProd = process.argv.includes("--prod");
const target = isProd ? "prod" : "dev";
const label = isProd ? "운영" : "개발";
const project = readProjects()[target];

if (!process.stdin.isTTY && process.env.DB_PUSH_TEST !== "1") {
  stop("이 명령은 사람이 터미널에서 직접 실행한다.");
}
if (!isProjectRef(project.ref) || project.name === "") {
  stop(
    `supabase/project-refs.json 의 ${target} 에 ref(소문자 20자)와 name 을 적는다. 대시보드 Project Settings › General 에 있다.`,
  );
}

console.log(`\n대상: ${label} 프로젝트 "${project.name}" (${project.ref})\n`);

step("마이그레이션 검사", process.execPath, ["scripts/check-migrations.mjs"]);
step("DB 테스트", "pnpm", ["test"]);
step("적용될 마이그레이션 확인", supabaseBin(), [
  "db",
  "push",
  "--project-ref",
  project.ref,
  "--dry-run",
]);

const prompt = createInterface({
  input: process.stdin,
  output: process.stdout,
});
const answer = isProd
  ? await prompt.question(
      `운영 DB 에 적용한다. 되돌릴 수 없다. 계속하려면 프로젝트 이름 "${project.name}" 을 입력한다: `,
    )
  : await prompt.question("개발 DB 에 적용할까? (y/N): ");
prompt.close();
const confirmed = isProd
  ? answer.trim() === project.name
  : /^y(es)?$/i.test(answer.trim());
if (!confirmed) stop("적용하지 않았다.");

step("적용", supabaseBin(), [
  "db",
  "push",
  "--project-ref",
  project.ref,
  "--yes",
]);

// 적용한 파일을 기록한다. 이 기록에 있는 파일은 AI 가 고치지 못한다(protect-paths 훅).
const recorded = new Set(readText(PUSHED_RECORD).split(/\r?\n/));
const added = migrationFiles().filter((name) => !recorded.has(name));
if (added.length > 0) appendFileSync(PUSHED_RECORD, `${added.join("\n")}\n`);

console.log(`\n${label} DB 에 적용했다.`);
console.log(
  isProd
    ? `다음: 보안 점검을 확인한다 → pnpm supabase db advisors --linked --project-ref ${project.ref} --type security`
    : "다음: DB 타입을 다시 만든다 → pnpm db:types (AI 에게 시켜도 된다)",
);

function step(title, command, args) {
  console.log(`▶ ${title}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error !== undefined)
    stop(`${title}: 실행하지 못했다(${result.error.message}).`);
  if (result.status !== 0)
    stop(
      `${title}: 실패했다. 위의 내용을 고친 뒤 다시 실행한다. 적용하지 않았다.`,
    );
}

function stop(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}
