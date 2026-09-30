// 확장 검사. 실행: pnpm check:extensions
// 새 종류의 기능(파일 첨부, 메일, DB 함수 등)을 막지 않는다. 처음 넣는 순간을 드러내고 정해진 방식을 읽게 한다.
// project.config.json 의 extensions 에 없는 확장을 코드가 쓰고 있을 때만 실패한다. 켠 확장은 안전 조건만 본다.
// 규모(테이블 수 등)는 검사하지 않는다. pnpm report:scale 이 알리기만 한다.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  EXTENSIONS,
  MIGRATIONS,
  ROOT,
  appFiles,
  finish,
  migrationFiles,
  readConfig,
  readJson,
  readText,
  show,
  stripSqlComments,
} from "./lib.mjs";

// 시작 마이그레이션(…_rbac.sql)의 함수와 트리거는 기본 구성이다. 그 밖에서 함수·트리거를 만들면 db-functions 확장이다.
const BASE_FUNCTIONS = ["custom_access_token_hook", "authorize"];
const BASE_MIGRATION = /_rbac\.sql$/;
const ADMIN_CLIENT = "lib/supabase/admin.ts";
const SECRET_ENV = /\bSUPABASE_\w*(SECRET|SERVICE_ROLE)\w*/;

const config = readConfig();
const enabled = new Set(config.extensions);
const problems = [];

for (const name of enabled) {
  if (!(name in EXTENSIONS)) {
    problems.push({
      where: "project.config.json",
      what: `알 수 없는 확장 이름: ${name}`,
      next: `다음 가운데 하나로 고친다: ${Object.keys(EXTENSIONS).join(", ")}`,
    });
  }
}

const sources = appFiles().map((path) => ({
  path: show(path),
  text: readText(path),
}));
const migrations = migrationFiles().map((name) => ({
  path: `supabase/migrations/${name}`,
  text: stripSqlComments(readText(join(MIGRATIONS, name))),
}));
const dependencies = Object.keys({
  ...readJson(join(ROOT, "package.json"))?.dependencies,
  ...readJson(join(ROOT, "package.json"))?.devDependencies,
});
const crons = readJson(join(ROOT, "vercel.json"))?.crons;

const firstMatch = (files, pattern) =>
  files.find((file) => pattern.test(file.text))?.path;
const firstDependency = (names) =>
  names.find((name) => dependencies.includes(name));
const extraFunction = () => {
  for (const file of migrations) {
    // 시작 마이그레이션의 함수와 트리거는 기본 구성이다.
    if (BASE_MIGRATION.test(file.path)) continue;
    for (const match of file.text.matchAll(
      /\bcreate\s+(?:or\s+replace\s+)?function\s+(?:\w+\.)?"?(\w+)"?/gi,
    )) {
      if (!BASE_FUNCTIONS.includes(match[1]))
        return `${file.path} (함수 ${match[1]})`;
    }
    if (
      /\bcreate\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\b/i.test(
        file.text,
      )
    )
      return `${file.path} (트리거)`;
  }
  return undefined;
};
const edgeFunction = () => {
  const dir = join(ROOT, "supabase", "functions");
  return existsSync(dir) &&
    readdirSync(dir).some((name) => !name.startsWith("."))
    ? "supabase/functions/"
    : undefined;
};

/** 확장마다 "쓰고 있다"는 흔적을 찾는다. 찾으면 그 위치를 돌려준다. */
const USAGE = {
  storage: () =>
    firstMatch(sources, /\.storage\s*\.from\(/) ??
    firstMatch(migrations, /\bstorage\.(buckets|objects)\b/),
  email: () =>
    firstDependency(["resend", "nodemailer", "@sendgrid/mail", "postmark"])
      ? "package.json"
      : undefined,
  excel: () =>
    firstDependency(["xlsx", "exceljs"]) ? "package.json" : undefined,
  "db-functions": extraFunction,
  "scheduled-jobs": () =>
    Array.isArray(crons) && crons.length > 0
      ? "vercel.json"
      : firstMatch(migrations, /\bcron\.schedule\s*\(/),
  "edge-functions": edgeFunction,
  "admin-api": () =>
    existsSync(join(ROOT, ADMIN_CLIENT))
      ? ADMIN_CLIENT
      : firstMatch(sources, /\.auth\s*\.admin\./),
  "multi-org": () =>
    firstMatch(migrations, /\b(org_id|organization_id|tenant_id)\b/),
  realtime: () =>
    firstMatch(sources, /\.channel\s*\(/) ??
    firstMatch(migrations, /\bsupabase_realtime\b/),
};

for (const [name, find] of Object.entries(USAGE)) {
  if (enabled.has(name)) continue;
  const where = find();
  if (where !== undefined) {
    problems.push({
      where,
      what: `${EXTENSIONS[name]}을(를) 쓰고 있지만 확장 ${name} 을 켜지 않았다.`,
      next: `/add-extension ${name} 으로 시작한다. 정해진 방식을 읽고, 사용자에게 알린 뒤 project.config.json 의 extensions 에 "${name}" 을 더한다`,
    });
  }
}

// 아래는 확장을 켰는지와 관계없이 지키는 안전 조건이다.
for (const file of sources) {
  if (file.path !== ADMIN_CLIENT && SECRET_ENV.test(file.text)) {
    problems.push({
      where: file.path,
      what: "secret 키를 읽는다. secret 키는 RLS 를 우회한다.",
      next: `${ADMIN_CLIENT} 한 곳에서만 읽는다. 이 파일은 그 파일의 createAdminClient() 를 부른다`,
    });
  }
  if (/NEXT_PUBLIC_\w*(SECRET|SERVICE_ROLE)\w*/.test(file.text)) {
    problems.push({
      where: file.path,
      what: "NEXT_PUBLIC_ 으로 시작하는 변수는 브라우저에 노출된다.",
      next: "변수 이름에서 NEXT_PUBLIC_ 을 빼고 사용자에게 키를 새로 발급하라고 알린다",
    });
  }
  if (
    /^\s*["']use client["']/m.test(file.text) &&
    /from\s+["']@\/lib\/supabase\/(admin|server)["']/.test(file.text)
  ) {
    problems.push({
      where: file.path,
      what: "클라이언트 컴포넌트가 서버 전용 Supabase 클라이언트를 불러온다.",
      next: "DB 접근을 서버 컴포넌트나 서버 액션으로 옮긴다",
    });
  }
}
if (
  enabled.has("admin-api") &&
  existsSync(join(ROOT, ADMIN_CLIENT)) &&
  !/import\s+["']server-only["']/.test(readText(join(ROOT, ADMIN_CLIENT)))
) {
  problems.push({
    where: ADMIN_CLIENT,
    what: 'import "server-only" 가 없다.',
    next: '파일 첫 줄에 import "server-only"; 를 더한다',
  });
}

finish("확장 검사", problems);
