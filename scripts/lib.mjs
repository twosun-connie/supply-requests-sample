// 검사 스크립트 공용 함수. 의존성 없이 Node 만으로 돈다.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const ROOT = process.cwd();
export const MIGRATIONS = join(ROOT, "supabase", "migrations");
export const PUSHED_RECORD = join(ROOT, "supabase", ".pushed");
export const APP_DIRS = ["app", "features", "lib", "components"];

/** 확장 이름과 한 줄 설명. check-extensions 와 report-scale 이 같이 쓴다. */
export const EXTENSIONS = {
  storage: "파일 첨부(Supabase Storage)",
  email: "메일 발송",
  excel: "엑셀 내보내기·업로드",
  "db-functions": "DB 함수·트리거",
  "scheduled-jobs": "예약 작업",
  "edge-functions": "Supabase Edge Functions",
  "admin-api": "secret 키를 쓰는 관리자 기능",
  "multi-org": "여러 조직",
  realtime: "Realtime",
};

export function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

export function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** project.config.json 을 읽는다. 없으면 기본값. */
export function readConfig() {
  const config = readJson(join(ROOT, "project.config.json")) ?? {};
  return {
    extensions: Array.isArray(config.extensions)
      ? config.extensions.map(String)
      : [],
    anonReadableTables: Array.isArray(config.db?.anonReadableTables)
      ? config.db.anonReadableTables.map(String)
      : [],
  };
}

/** 마이그레이션 파일 이름을 적용 순서대로 돌려준다. */
export function migrationFiles() {
  if (!existsSync(MIGRATIONS)) return [];
  return readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

/** 이미 커밋했거나 DB 에 적용한 마이그레이션인지 본다. 이런 파일은 고칠 수 없으므로 검사하지 않는다. */
export function isApplied(name) {
  if (readText(PUSHED_RECORD).split(/\r?\n/).includes(name)) return true;
  try {
    execFileSync(
      "git",
      ["-C", MIGRATIONS, "ls-files", "--error-unmatch", "--", name],
      { stdio: "ignore" },
    );
    return true;
  } catch {
    return false;
  }
}

/** 폴더 아래의 파일을 모은다. node_modules 와 숨김 폴더는 건너뛴다. */
export function walk(dir, accept) {
  const found = [];
  if (!existsSync(dir)) return found;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...walk(path, accept));
    else if (accept(path)) found.push(path);
  }
  return found;
}

/** 앱 코드 파일(app, features, lib, components 아래의 ts·tsx). 생성물과 테스트는 뺀다. */
export function appFiles() {
  const accept = (path) =>
    /\.(ts|tsx)$/.test(path) &&
    !/(\.d\.ts|\.test\.tsx?|database\.types\.ts)$/.test(path);
  return APP_DIRS.flatMap((dir) => walk(join(ROOT, dir), accept));
}

/** supabase/project-refs.json 에서 개발·운영 프로젝트를 읽는다. ref 는 소문자 20자, region 은 AWS 리전 이름(예: ap-northeast-2)이다. */
export function readProjects() {
  const refs = readJson(join(ROOT, "supabase", "project-refs.json")) ?? {};
  const pick = (entry) => ({
    ref: typeof entry?.ref === "string" ? entry.ref.trim() : "",
    name: typeof entry?.name === "string" ? entry.name.trim() : "",
    region: typeof entry?.region === "string" ? entry.region.trim() : "",
  });
  return { dev: pick(refs.dev), prod: pick(refs.prod) };
}

/** Supabase(AWS) 리전 → Vercel 함수 리전. 출처: vercel.com/docs/regions 의 표. */
export const VERCEL_REGION_BY_AWS = {
  "ap-northeast-2": "icn1",
  "ap-northeast-1": "hnd1",
  "ap-northeast-3": "kix1",
  "ap-southeast-1": "sin1",
  "ap-southeast-2": "syd1",
  "ap-south-1": "bom1",
  "ap-east-1": "hkg1",
  "us-east-1": "iad1",
  "us-east-2": "cle1",
  "us-west-1": "sfo1",
  "us-west-2": "pdx1",
  "ca-central-1": "yul1",
  "eu-west-1": "dub1",
  "eu-west-2": "lhr1",
  "eu-west-3": "cdg1",
  "eu-central-1": "fra1",
  "eu-north-1": "arn1",
  "sa-east-1": "gru1",
  "af-south-1": "cpt1",
};

export function isProjectRef(value) {
  return /^[a-z]{20}$/.test(value);
}

/** Supabase CLI 실행 파일. 테스트는 SUPABASE_BIN 으로 가짜 CLI 를 넣는다. */
export function supabaseBin() {
  return (
    process.env.SUPABASE_BIN ?? join(ROOT, "node_modules", ".bin", "supabase")
  );
}

/** 출력에 쓰는 경로. 저장소 기준 상대 경로이고 구분자는 / 다. */
export function show(path) {
  return relative(ROOT, path).split(sep).join("/");
}

/** SQL 에서 주석을 지운다. 줄 수는 유지한다. */
export function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/--[^\n]*/g, (line) => " ".repeat(line.length));
}

/** SQL 에서 작은따옴표 문자열의 내용을 지운다. 줄 수는 유지한다. */
export function stripSqlStrings(sql) {
  return sql.replace(
    /'(?:[^']|'')*'/g,
    (text) => `'${text.slice(1, -1).replace(/[^\n]/g, " ")}'`,
  );
}

export function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

/**
 * 결과를 출력하고 종료한다. 문제마다 다음에 할 일을 함께 적는다.
 * notices 는 알리기만 한다. 종료 코드를 바꾸지 않는다.
 */
export function finish(title, problems, notices = []) {
  for (const notice of notices) {
    console.log(
      `\nℹ ${notice.where}\n  ${notice.what}\n  확인: ${notice.next}`,
    );
  }
  if (problems.length === 0) {
    console.log(`${title}: 통과`);
    process.exit(0);
  }
  console.error(`${title}: ${problems.length}건`);
  for (const problem of problems) {
    console.error(
      `\n✖ ${problem.where}\n  ${problem.what}\n  다음: ${problem.next}`,
    );
  }
  process.exit(1);
}
