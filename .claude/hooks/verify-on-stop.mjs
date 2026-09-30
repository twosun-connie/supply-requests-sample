// Stop: 코드·마이그레이션이 바뀌었으면 pnpm verify:quick(typecheck → lint → 앱 코드·마이그레이션·확장·문서 검사 → DB 테스트)을 돌린다.
// 문서 검사가 들어 있어, 코드를 바꾸고 작업 기록을 쓰지 않은 채 끝내면 여기서 한 번 막힌다.
// 실패하면 한 번 막는다. 단위 테스트와 빌드는 돌리지 않는다. 전체 검증(pnpm verify)은 완료 보고 전과 CI 가 맡는다.
// 한 번만 막는 이유: Claude 가 질문하려고 멈춘 경우에도 실패 내용을 알고 보고에 적게 하는 것이 목적이다.
// 끄는 방법: .claude/settings.local.json 의 env 에 CLAUDE_SKIP_STOP_VERIFY=1.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { findWorkTreeRoot, normalizePath, readInput } from "./lib.mjs";

const SCRIPT = "verify:quick";
const CODE_FILE = /\.(ts|tsx|css|sql)$|(^|\/)project\.config\.json$/;
const STATE_FILE = "claude-verify-quick.ok";
const TIMEOUT_MS = 240_000;

const input = await readInput();
if (input === null) process.exit(0);
if (input.stop_hook_active === true) process.exit(0); // 무한 반복 방지
if (process.env.CLAUDE_SKIP_STOP_VERIFY === "1") process.exit(0);
if (input.permission_mode === "plan") process.exit(0);

const root = findWorkTreeRoot(normalizePath(input.cwd ?? process.cwd()));
if (root === "" || !existsSync(`${root}/node_modules`)) process.exit(0);
if (readScripts(`${root}/package.json`)[SCRIPT] === undefined) process.exit(0);

const git = (args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

let changed = [];
let stateDir = "";
try {
  changed = git(["status", "--porcelain=v1", "-z", "--untracked-files=all"])
    .split("\0")
    .map((entry) => entry.slice(3))
    .filter((path) => CODE_FILE.test(path))
    .sort();
  stateDir = git(["rev-parse", "--absolute-git-dir"]).trim();
} catch {
  process.exit(0); // git 을 쓸 수 없으면 판단하지 않는다
}
if (changed.length === 0) process.exit(0);

// 지문은 git 폴더에 둔다. 작업 트리에 파일을 만들지 않는다.
const fingerprint = fingerprintOf(changed);
const statePath = `${stateDir}/${STATE_FILE}`;
if (existsSync(statePath) && readFileSync(statePath, "utf8") === fingerprint) process.exit(0);

const verify = spawnSync("pnpm", [SCRIPT], {
  cwd: root,
  encoding: "utf8",
  timeout: TIMEOUT_MS,
  shell: process.platform === "win32",
});
if (verify.error !== undefined) {
  console.error(`verify-on-stop: pnpm ${SCRIPT} 을 실행하지 못했다(${verify.error.message}). 검증하지 않았다.`);
  process.exit(0);
}
if (verify.status === 0) {
  writeFileSync(statePath, fingerprint);
  process.exit(0);
}

const tail = `${verify.stdout ?? ""}${verify.stderr ?? ""}`.trim().split("\n").slice(-40).join("\n");
console.error(
  [
    `pnpm ${SCRIPT} 실패.`,
    "원인을 고친다. 지금 고칠 수 없거나 사용자의 결정이 필요하면 실패 내용을 보고에 그대로 적는다.",
    "검사를 끄거나 건너뛰지 않는다.",
    tail,
  ].join("\n"),
);
process.exit(2);

function readScripts(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8")).scripts ?? {};
  } catch {
    return {};
  }
}

function fingerprintOf(paths) {
  const hash = createHash("sha256");
  // 검증 명령의 정의가 바뀌면 같은 파일이라도 다시 돌린다.
  hash.update(String(readScripts(`${root}/package.json`)[SCRIPT]));
  hash.update("\0");
  for (const path of paths) {
    hash.update(path);
    hash.update("\0");
    const file = `${root}/${path}`;
    hash.update(existsSync(file) ? readFileSync(file) : "deleted");
    hash.update("\0");
  }
  return hash.digest("hex");
}
