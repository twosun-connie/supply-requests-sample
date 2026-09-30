// PreToolUse(Edit|Write|NotebookEdit): 생성물, 비밀 값 파일, 보호 장치, 이미 적용한 마이그레이션의 수정을 막는다.
// 서브에이전트별 제한도 여기서 건다. 프로젝트 설정의 훅은 서브에이전트 안에서도 실행되고 입력에 agent_type 이 실린다.
// 종료 코드 2 = 차단(표준 오류가 Claude 에게 전달된다). 0 = 판단하지 않음.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { block, hasSegment, readInput, targetPath } from "./lib.mjs";

const READ_ONLY_AGENTS = ["security-reviewer", "code-reviewer"];
const PUSHED_RECORD = ".pushed"; // scripts/db-push.mjs 가 supabase/.pushed 에 적용한 파일 이름을 적는다

const input = await readInput();
if (input === null) block("protect-paths: 입력을 해석하지 못했다. 다음: 같은 수정을 다시 시도한다.");

const file = targetPath(input);
const agent = typeof input.agent_type === "string" ? input.agent_type : "";
if (file === "") {
  if (READ_ONLY_AGENTS.includes(agent)) block(`차단: ${agent} 의 파일 쓰기 대상을 알 수 없다.`);
  process.exit(0);
}

const base = posix.basename(file);
const deny = (why, next) => block(`차단: ${file} — ${why}\n다음: ${next}`);

if (READ_ONLY_AGENTS.includes(agent)) {
  deny(`${agent} 는 파일을 고치지 않는다.`, "찾은 문제를 파일:줄과 함께 보고만 한다.");
}
if (file.endsWith("/lib/supabase/database.types.ts")) {
  deny("DB 에서 만든 타입이다.", "마이그레이션을 고치고, 사용자가 pnpm db:push 를 끝낸 뒤 pnpm db:types 로 다시 만든다.");
}
if ((base === ".env" || base.startsWith(".env.")) && base !== ".env.example") {
  deny("비밀 값 파일이다.", "변수 이름만 .env.example 에 적고, 값은 사용자가 넣게 안내한다.");
}
if (file.endsWith("/.claude/settings.json") || hasSegment(file, "/.claude/hooks/")) {
  deny("보호 장치 설정이다. 사람이 고친다.", "바꿀 내용과 이유를 사용자에게 제안한다.");
}
if (hasSegment(file, "/test/db/support/")) {
  deny("DB 테스트의 기반(Supabase 흉내, 구조 검사)이다. 테스트를 통과시키려고 고치지 않는다.", "실패한 검사가 가리키는 마이그레이션이나 정책을 고친다.");
}
if (hasSegment(file, "/supabase/migrations/") && (isTracked(file) || isPushed(file))) {
  deny(
    "이미 커밋했거나 DB 에 적용한 마이그레이션이다.",
    "새 파일로 바로잡는다: pnpm supabase migration new 《이름》",
  );
}
process.exit(0);

/** git 이 추적하는 파일인지 본다. 폴더가 아직 없으면 새 파일이다. */
function isTracked(path) {
  const dir = posix.dirname(path);
  if (!existsSync(dir)) return false;
  try {
    execFileSync("git", ["-C", dir, "ls-files", "--error-unmatch", "--", posix.basename(path)], { stdio: "ignore" });
    return true;
  } catch {
    return false; // 추적하지 않는 파일이거나 저장소 밖이다
  }
}

/** 적용 기록(supabase/.pushed)에 있는 파일인지 본다. 커밋 전에 push 한 파일을 잡는다. */
function isPushed(path) {
  const record = `${path.slice(0, path.lastIndexOf("/supabase/migrations/"))}/supabase/${PUSHED_RECORD}`;
  if (!existsSync(record)) return false;
  try {
    return readFileSync(record, "utf8").split(/\r?\n/).includes(posix.basename(path));
  } catch {
    return false;
  }
}
