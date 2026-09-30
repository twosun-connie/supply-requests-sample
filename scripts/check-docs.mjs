// 코드를 바꿨으면 문서도 함께 바뀌었는지 본다. 실행: pnpm check:docs
//   --final        올리기 전(PR 준비, CI). 이번에 바꾼 기록이 끝난 상태여야 한다
//   --staged       스테이징한 파일만 본다
//   --base 《ref》  그 지점에서 갈라진 뒤의 커밋까지 본다(CI 에서 origin/main)
// 보는 것은 "있는가"와 "양식이 맞는가"다. 내용이 사실인지는 보지 못한다. 사람과 검토자가 읽는다.
import { join } from "node:path";
import {
  DECISION_DIR,
  KINDS,
  WORK_DIR,
  changedFiles,
  checkRecord,
  contentAt,
  readRecord,
  recordNames,
} from "./docs-lib.mjs";
import { ROOT, finish, readJson, readText } from "./lib.mjs";

const args = process.argv.slice(2);
const final = args.includes("--final");
const staged = args.includes("--staged");
const baseAt = args.indexOf("--base");
const base = baseAt === -1 ? "" : (args[baseAt + 1] ?? "");

// 바뀌면 작업 기록이 필요한 파일. 문서·테스트 설정·잠금 파일은 뺀다.
const CODE =
  /^(app|features|components|lib|supabase\/migrations)\/|^(proxy\.ts|next\.config\.[a-z]+|project\.config\.json|package\.json)$/;
const GENERATED =
  /^components\/ui\/|^lib\/supabase\/database\.types\.ts$|(^|\/)README\.md$/;
const MIGRATION = /^supabase\/migrations\/[^/]+\.sql$/;
const PAGE = /^app\/(.*\/)?page\.tsx$/;
// 로그인·확인·연결 확인 화면은 템플릿의 기반이라 화면 목록에 적지 않아도 된다.
const INFRA_PAGE = /^app\/(\(auth\)|auth|health)\//;

const problems = [];
const notices = [];
const add = (where, what, next) => problems.push({ where, what, next });

const change = changedFiles({ base, staged });
if (change === null) {
  notices.push({
    where: "git",
    what: "git 저장소가 아니어서 무엇이 바뀌었는지 알 수 없다. 기록의 양식만 검사한다.",
    next: "git init 뒤에 다시 돌린다",
  });
}
const files = change?.files ?? new Map();
const changed = [...files.keys()];
const isRecord = (dir) => (path) =>
  path.startsWith(`${dir}/`) &&
  path.endsWith(".md") &&
  !path.slice(dir.length + 1).startsWith("_") &&
  !path.endsWith("/README.md") &&
  files.get(path) !== "D";
const workChanged = changed.filter(isRecord(WORK_DIR));
const decisionChanged = changed.filter(isRecord(DECISION_DIR));
const code = changed.filter((path) => CODE.test(path) && !GENERATED.test(path));

// 1. 코드를 바꿨으면 작업 기록이 있어야 한다.
if (code.length > 0 && workChanged.length === 0) {
  const sample = code.slice(0, 5).join(", ");
  add(
    WORK_DIR,
    `코드를 바꿨는데 작업 기록이 없다. 바뀐 파일 ${code.length}개: ${sample}${code.length > 5 ? " …" : ""}`,
    "pnpm docs:new work 《작업 이름》 으로 만들고 요청·계획부터 적는다. 이어서 하는 작업이면 그 작업의 기록에 이번에 한 일을 더한다",
  );
}

// 2. 기록의 양식. 이번에 바꾼 기록은 엄격하게, 나머지는 이름과 상태만 본다.
for (const [kind, touched] of [
  ["work", workChanged],
  ["decision", decisionChanged],
]) {
  const spec = KINDS[kind];
  for (const name of recordNames(kind)) {
    const path = `${spec.dir}/${name}`;
    const isTouched = change === null || touched.includes(path);
    if (!isTouched) continue;
    for (const problem of checkRecord(kind, name, readRecord(kind, name), {
      final,
    })) {
      add(path, problem.what, problem.next);
    }
  }
}

// 3. 스키마를 바꿨으면 docs/schema.md 도 바뀌어야 한다.
const migrations = changed.filter(
  (path) => MIGRATION.test(path) && files.get(path) !== "D",
);
if (migrations.length > 0 && !changed.includes("docs/schema.md")) {
  add(
    "docs/schema.md",
    `마이그레이션을 더했는데 docs/schema.md 가 그대로다: ${migrations.join(", ")}`,
    "바뀐 테이블과 열을 표에 적고 「변경 기록」에 한 줄을 더한다",
  );
}

// 3-1. docs/schema.md 를 고쳤으면 열마다 「뜻」이 있어야 한다. 고친 작업에서만 본다(옛 문서를 한꺼번에 막지 않는다).
if (changed.includes("docs/schema.md") && files.get("docs/schema.md") !== "D") {
  const blank = columnsWithoutMeaning(
    readText(join(ROOT, "docs", "schema.md")),
  );
  if (blank.length > 0) {
    add(
      "docs/schema.md",
      `열의 「뜻」이 비어 있다: ${blank.slice(0, 8).join(", ")}${blank.length > 8 ? ` 외 ${blank.length - 8}개` : ""}`,
      "마이그레이션의 comment on column 과 같은 말로 채운다. id·created_at 도 적는다(.claude/rules/conventions.md §4)",
    );
  }
}

// 4. 새 화면은 docs/screens.md 에 경로가 있어야 한다.
const screens = readText(join(ROOT, "docs", "screens.md"));
for (const path of changed) {
  if (!PAGE.test(path) || INFRA_PAGE.test(path) || files.get(path) !== "A")
    continue;
  const route = routeOf(path);
  if (route === "/" || screens.includes(`\`${route}\``)) continue;
  add(
    "docs/screens.md",
    `새 화면 ${route} 가 화면 목록에 없다(${path}).`,
    `표에 행을 더한다. 경로 칸은 \`${route}\` 그대로 적는다. 목록에 없는 화면을 만들 계획이 아니었으면 멈추고 사용자에게 묻는다`,
  );
}

// 5. 되돌리기 어려운 선택에는 결정 기록이 있어야 한다.
const decisions = [];
const since = change?.ref ?? "";
if (since !== "" && changed.includes("package.json")) {
  const before = parse(contentAt(since, "package.json"));
  const after = readJson(join(ROOT, "package.json")) ?? {};
  const names = (json) => [
    ...Object.keys(json.dependencies ?? {}),
    ...Object.keys(json.devDependencies ?? {}),
  ];
  const added = names(after).filter((name) => !names(before).includes(name));
  if (before !== null && added.length > 0)
    decisions.push(`패키지를 더했다: ${added.join(", ")}`);
}
if (since !== "" && changed.includes("project.config.json")) {
  const before = parse(contentAt(since, "project.config.json"));
  const after = readJson(join(ROOT, "project.config.json")) ?? {};
  const list = (json) =>
    Array.isArray(json?.extensions) ? json.extensions.map(String) : [];
  const added = list(after).filter((name) => !list(before).includes(name));
  if (before !== null && added.length > 0) {
    decisions.push(`확장을 켰다: ${added.join(", ")}`);
    // 방식 파일을 읽었다는 흔적으로 결정 기록에 그 경로가 있어야 한다.
    const written = decisionChanged
      .map((path) => readText(join(ROOT, path)))
      .join("\n");
    for (const name of added) {
      if (written.includes(`recipes/${name}.md`)) continue;
      add(
        DECISION_DIR,
        `확장 ${name} 의 결정 기록에 방식 파일(.claude/skills/add-extension/recipes/${name}.md)이 적혀 있지 않다.`,
        `/add-extension ${name} 으로 방식 파일을 읽고, 결정 기록의 「결정」에 그 경로와 따른 방식을 적는다`,
      );
    }
  }
}
for (const path of migrations) {
  const marker = readText(join(ROOT, path)).match(
    /^\s*--\s*(destructive-ok|sensitive-ok):/m,
  );
  if (marker !== null) decisions.push(`${path} 에 ${marker[1]} 가 있다`);
}
if (decisions.length > 0 && decisionChanged.length === 0) {
  add(
    DECISION_DIR,
    `결정 기록이 없다. ${decisions.join(". ")}.`,
    "pnpm docs:new decision 《이름》 으로 만들고 배경, 선택지, 고른 것과 이유, 영향을 적는다. 정한 사람은 사용자다. 사용자가 정하지 않았으면 상태를 「제안」으로 두고 묻는다",
  );
}

finish("문서 검사", problems, notices);

/** docs/schema.md 의 열 표(머리글의 마지막 칸이 「뜻」)에서 뜻이 빈 열을 《테이블》.《열》 로 돌려준다. */
function columnsWithoutMeaning(markdown) {
  const found = [];
  let table = "";
  let inColumns = false;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^###\s+([^\s—-]+)/);
    if (heading !== null) table = heading[1].replaceAll("`", "");
    if (!line.trim().startsWith("|")) {
      inColumns = false;
      continue;
    }
    const cells = line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim());
    if (cells[0] === "열" && cells.at(-1) === "뜻") {
      inColumns = true;
      continue;
    }
    if (!inColumns || /^:?-+:?$/.test(cells[0])) continue;
    if ((cells.at(-1) ?? "") === "") {
      found.push(`${table}.${cells[0].replaceAll("`", "")}`);
    }
  }
  return found;
}

function routeOf(path) {
  const parts = path
    .split("/")
    .slice(1, -1)
    .filter((part) => !/^\(.*\)$/.test(part) && !part.startsWith("@"));
  return `/${parts.join("/")}`;
}

function parse(text) {
  if (text === "") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
