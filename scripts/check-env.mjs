// 작업 환경 점검. 사람이 처음 한 번, 그리고 무언가 안 될 때 실행한다: pnpm check:env
// .env.local 을 읽는다. 값은 출력하지 않는다.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  ROOT,
  VERCEL_REGION_BY_AWS,
  isProjectRef,
  readJson,
  readProjects,
  readText,
  supabaseBin,
} from "./lib.mjs";

const results = [];
const check = (ok, title, fix) => results.push({ ok, title, fix });
const run = (command, args) =>
  spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

const wantedNode = readText(join(ROOT, ".nvmrc"))
  .trim()
  .replace(/^v/, "")
  .split(".")[0];
const actualNode = process.versions.node.split(".")[0];
check(
  wantedNode === "" || wantedNode === actualNode,
  `Node ${actualNode}`,
  `Node ${wantedNode} 를 설치한다(.nvmrc)`,
);

const packageJson = readJson(join(ROOT, "package.json")) ?? {};
const wantedPnpm = String(packageJson.packageManager ?? "")
  .replace(/^pnpm@/, "")
  .split(".")[0];
check(
  /^pnpm@\d+\.\d+\.\d+$/.test(String(packageJson.packageManager ?? "")),
  "package.json 의 packageManager",
  '"packageManager": "pnpm@《버전》" 을 적는다. 없으면 Vercel 이 lockfile 만 보고 pnpm 9·10 으로 설치해 pnpm-workspace.yaml 의 공급망 설정이 적용되지 않을 수 있다',
);
const enginesNode = String(packageJson.engines?.node ?? "");
check(
  wantedNode === "" || enginesNode.startsWith(wantedNode),
  `package.json 의 engines.node(${enginesNode || "없음"})`,
  `"engines": { "node": "${wantedNode || "24"}.x" } 를 적는다(.nvmrc 와 같은 버전. Vercel 이 이 버전을 쓴다)`,
);
const actualPnpm = (run("pnpm", ["--version"]).stdout ?? "").trim();
check(
  actualPnpm !== "" &&
    (wantedPnpm === "" || actualPnpm.split(".")[0] === wantedPnpm),
  `pnpm ${actualPnpm || "없음"}`,
  `pnpm ${wantedPnpm} 을 설치한다: corepack enable`,
);

check(
  existsSync(join(ROOT, "node_modules")),
  "패키지 설치",
  "pnpm install --frozen-lockfile",
);

const projects = readProjects();
check(
  isProjectRef(projects.dev.ref) && projects.dev.name !== "",
  "개발 프로젝트 정보",
  "supabase/project-refs.json 의 dev 에 ref 와 name 을 적는다",
);
const hasProd = projects.prod.ref !== "" || projects.prod.name !== "";
check(
  !hasProd || (isProjectRef(projects.prod.ref) && projects.prod.name !== ""),
  hasProd
    ? "운영 프로젝트 정보"
    : "운영 프로젝트 정보(아직 없음. 운영 프로젝트를 만들면 적는다)",
  "supabase/project-refs.json 의 prod 에 ref 와 name 을 적는다",
);
check(
  projects.dev.ref === "" || projects.dev.ref !== projects.prod.ref,
  "개발과 운영이 다른 프로젝트",
  "개발용과 운영용 Supabase 프로젝트를 따로 만든다",
);

const siteName = String(readJson(join(ROOT, "project.config.json"))?.name ?? "");
check(
  siteName !== "" && !/《/.test(siteName),
  `project.config.json 의 name(${siteName || "없음"})`,
  "서비스 이름을 적는다. 헤더·로그인 화면·탭 제목에 쓰인다",
);

const vercel = readJson(join(ROOT, "vercel.json")) ?? {};
const regions = Array.isArray(vercel.regions) ? vercel.regions.map(String) : [];
const supabaseRegion = projects.prod.region || projects.dev.region;
const wantedRegion = VERCEL_REGION_BY_AWS[supabaseRegion] ?? "";
check(
  regions.length > 0,
  `vercel.json 의 함수 리전(${regions.join(", ") || "없음"})`,
  'vercel.json 에 "regions": ["icn1"] 처럼 Supabase 프로젝트와 같은 곳의 리전을 적는다. 없으면 워싱턴(iad1)에서 실행돼 DB 왕복마다 느리다',
);
check(
  supabaseRegion === "" ||
    wantedRegion === "" ||
    regions.includes(wantedRegion),
  supabaseRegion === ""
    ? "Supabase 리전(project-refs.json 에 region 을 적으면 vercel.json 과 대조한다)"
    : `vercel.json 의 리전이 Supabase 리전(${supabaseRegion} → ${wantedRegion || "?"})과 같다`,
  `vercel.json 의 regions 에 ${wantedRegion || "Supabase 프로젝트와 같은 리전"} 을 넣는다`,
);

const env = readText(join(ROOT, ".env.local"));
const url = env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1]?.trim() ?? "";
const key =
  env.match(/^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)$/m)?.[1]?.trim() ?? "";
check(
  env !== "",
  ".env.local 파일",
  ".env.example 을 .env.local 로 복사하고 값을 넣는다",
);
check(
  url !== "" && (projects.dev.ref === "" || url.includes(projects.dev.ref)),
  ".env.local 의 주소가 개발 프로젝트",
  "NEXT_PUBLIC_SUPABASE_URL 에 개발 프로젝트의 주소를 넣는다. 운영 주소는 Vercel 환경 변수에만 넣는다",
);
check(
  key.startsWith("sb_publishable_"),
  ".env.local 의 키가 publishable 키",
  "대시보드 Settings › API Keys 의 Publishable key 를 넣는다. sb_secret_ 으로 시작하는 키는 넣지 않는다",
);
check(
  !/sb_secret_/.test(env) || /^SUPABASE_SECRET_KEY=/m.test(env),
  "secret 키의 변수 이름",
  "secret 키는 SUPABASE_SECRET_KEY 에만 넣는다(admin-api 확장을 켰을 때)",
);

const linked = readText(join(ROOT, "supabase", ".temp", "project-ref")).trim();
check(
  linked === "" || linked !== projects.prod.ref,
  "Supabase CLI 가 운영에 연결돼 있지 않다",
  `개발로 되돌린다: pnpm supabase link --project-ref ${projects.dev.ref || "《개발 Project ID》"}`,
);
check(
  process.env.SUPABASE_PROJECT_ID === undefined,
  "SUPABASE_PROJECT_ID 환경 변수 없음",
  "이 환경 변수는 연결 정보보다 먼저 쓰인다. 지운다",
);

const login = run(supabaseBin(), [
  "projects",
  "list",
  "--output-format",
  "json",
]);
check(login.status === 0, "Supabase 로그인", "pnpm supabase login");

console.log("[작업 환경 점검]");
for (const { ok, title, fix } of results)
  console.log(ok ? `  ✔ ${title}` : `  ✖ ${title}\n      → ${fix}`);
const failed = results.filter((result) => !result.ok).length;
console.log(
  failed === 0 ? "\n모두 갖췄다." : `\n${failed}건을 고친 뒤 다시 실행한다.`,
);
process.exit(failed === 0 ? 0 : 1);
