// SessionStart(startup|resume): 작업 환경에 빠진 것과 끝나지 않은 작업이 있을 때만 알린다. 없으면 아무것도 출력하지 않는다(컨텍스트 비용 0).
// 끝나지 않은 작업 기록(docs/work, 상태: 진행 중)을 알려 새 세션이 앞의 맥락을 기록에서 이어받게 한다.
// 표준 출력은 Claude 의 컨텍스트에 들어간다. 프로세스를 띄우지 않는다. 파일이 있는지만 본다.
// Supabase CLI 가 운영 프로젝트에 연결돼 있으면 알린다(연결 정보: supabase/.temp/project-ref).
// pnpm db:push 는 연결을 쓰지 않고 대상을 직접 지정하므로, 이 알림은 CLI 를 직접 쓰는 경우를 위한 것이다.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { findWorkTreeRoot, normalizePath, readInput } from "./lib.mjs";

const input = await readInput();
const root = findWorkTreeRoot(normalizePath(input?.cwd ?? process.cwd()));
if (root === "" || !existsSync(`${root}/package.json`)) process.exit(0);

const has = (path) => existsSync(`${root}/${path}`);
const read = (path) => {
  try {
    return readFileSync(`${root}/${path}`, "utf8");
  } catch {
    return "";
  }
};
const notices = [];

if (!has("node_modules")) {
  notices.push("node_modules 가 없다. 사용자에게 `pnpm install --frozen-lockfile` 실행을 요청한다(패키지 설치는 사용자가 한다).");
}
if (has(".env.example") && !has(".env.local")) {
  notices.push("`.env.local` 이 없다. 사용자에게 `.env.example` 을 복사해 값을 넣으라고 안내한다. 파일을 직접 만들지 않는다.");
}
if (hasMigrations() && !has("lib/supabase/database.types.ts")) {
  notices.push("DB 타입 생성물이 없다. 사용자가 `pnpm db:push` 를 끝냈으면 `pnpm db:types` 를 실행한다.");
}
if (has(".nvmrc")) {
  const wanted = read(".nvmrc").trim().replace(/^v/, "").split(".")[0];
  const actual = process.versions.node.split(".")[0];
  if (/^\d+$/.test(wanted) && wanted !== actual) {
    notices.push(`Node ${actual} 로 실행 중이다. 이 저장소는 Node ${wanted} 를 쓴다(.nvmrc).`);
  }
}

const linked = read("supabase/.temp/project-ref").trim();
const prod = productionRef();
if (linked !== "" && prod !== "" && linked === prod) {
  notices.push("Supabase CLI 가 **운영** 프로젝트에 연결돼 있다. 작업을 시작하기 전에 사용자에게 알린다. 개발로 되돌리는 명령은 `pnpm check:env` 가 알려 준다.");
}

const mcp = supabaseMcpUrl();
if (mcp !== "") {
  if (!/[?&]read_only=true(&|$)/.test(mcp)) {
    notices.push("`.mcp.json` 의 Supabase MCP 주소에 `read_only=true` 가 없다. MCP 로 DB 를 바꾸지 않는다. 사용자에게 주소를 고쳐 달라고 알린다.");
  }
  if (prod !== "" && mcp.includes(`project_ref=${prod}`)) {
    notices.push("`.mcp.json` 의 Supabase MCP 가 **운영** 프로젝트를 가리킨다. MCP 는 개발 프로젝트에만 연결한다. 사용자에게 알린다.");
  }
}

const output = [];
if (notices.length > 0) output.push("[작업 환경 점검]", ...notices.map((notice) => `- ${notice}`));
const open = openWorkRecords();
if (open.length > 0) {
  output.push(
    "[끝나지 않은 작업]",
    ...open.map((record) => `- docs/work/${record.name} — ${record.title}`),
    "이어서 하는 작업이면 그 기록을 먼저 읽고 거기에 이어 적는다. 새 작업이면 `pnpm docs:new work 《이름》` 으로 새 기록을 만든다.",
  );
}
if (output.length > 0) console.log(output.join("\n"));
process.exit(0);

/** 상태가 「진행 중」인 작업 기록. 최근 것부터 3건. */
function openWorkRecords() {
  try {
    return readdirSync(`${root}/docs/work`)
      .filter((name) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(name))
      .sort()
      .reverse()
      .map((name) => ({ name, text: read(`docs/work/${name}`) }))
      .filter((record) => /^- +상태 *: *진행 중\s*$/m.test(record.text))
      .slice(0, 3)
      .map((record) => ({ name: record.name, title: record.text.match(/^# +(.+)$/m)?.[1]?.trim() ?? "" }));
  } catch {
    return [];
  }
}

function hasMigrations() {
  try {
    return readdirSync(`${root}/supabase/migrations`).some((name) => name.endsWith(".sql"));
  } catch {
    return false;
  }
}

/** .mcp.json 에 적힌 Supabase MCP 서버의 주소. 없으면 빈 문자열. */
function supabaseMcpUrl() {
  try {
    const servers = JSON.parse(read(".mcp.json"))?.mcpServers ?? {};
    const url = Object.values(servers)
      .map((server) => server?.url)
      .find((value) => typeof value === "string" && value.includes("mcp.supabase.com"));
    return url ?? "";
  } catch {
    return "";
  }
}

/** supabase/project-refs.json 의 운영 Project ID. 없거나 읽지 못하면 빈 문자열. */
function productionRef() {
  try {
    const ref = JSON.parse(read("supabase/project-refs.json"))?.prod?.ref;
    return typeof ref === "string" ? ref.trim() : "";
  } catch {
    return "";
  }
}
