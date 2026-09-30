// 규모 지표. 실행: pnpm report:scale
// 알리기만 한다. 종료 코드는 항상 0 이다. 검증(pnpm verify)을 실패시키지 않는다.
// 아래 신호는 "구조를 다시 볼 때가 됐다"는 뜻이지 "더 만들면 안 된다"는 뜻이 아니다. 판단은 사람이 한다.
import { join } from "node:path";
import {
  EXTENSIONS,
  MIGRATIONS,
  ROOT,
  appFiles,
  migrationFiles,
  readConfig,
  readText,
  show,
  stripSqlComments,
  walk,
} from "./lib.mjs";

const sql = migrationFiles()
  .map((name) => stripSqlComments(readText(join(MIGRATIONS, name))))
  .join("\n");
const count = (pattern) => [...sql.matchAll(pattern)].length;
const sources = appFiles().map((path) => ({
  path: show(path),
  lines: readText(path).split("\n").length,
}));
const largest = [...sources].sort((a, b) => b.lines - a.lines)[0];
const config = readConfig();

const tables = count(/\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?public\./gi);
const screens = walk(join(ROOT, "app"), (path) =>
  /[\\/]page\.tsx$/.test(path),
).length;
const policies = count(/\bcreate\s+policy\b/gi);
const functions = count(/\bcreate\s+(?:or\s+replace\s+)?function\b/gi);

console.log("[규모 지표]");
console.log(
  `- 테이블 ${tables}개, 정책 ${policies}개, DB 함수 ${functions}개, 마이그레이션 ${migrationFiles().length}개`,
);
console.log(`- 화면 ${screens}개, 앱 코드 파일 ${sources.length}개`);
if (largest !== undefined)
  console.log(`- 가장 큰 파일: ${largest.path} (${largest.lines}줄)`);
console.log(
  `- 켠 확장: ${config.extensions.length === 0 ? "없음" : config.extensions.map((name) => `${name}(${EXTENSIONS[name] ?? "?"})`).join(", ")}`,
);

const notes = [];
if (tables > 10)
  notes.push(
    `테이블이 10개를 넘었다(${tables}개). docs/schema.md 를 업무 영역별 절로 나눈다.`,
  );
if (screens > 15)
  notes.push(
    `화면이 15개를 넘었다(${screens}개). 여러 화면이 같이 쓰는 조회·규칙을 features/ 로 옮겼는지 확인한다.`,
  );
if (largest !== undefined && largest.lines > 300)
  notes.push(
    `${largest.path} 가 300줄을 넘었다. 조회·액션·화면 조각으로 나눈다.`,
  );
if (config.extensions.includes("multi-org"))
  notes.push("여러 조직이 쓴다. 조직 간 격리를 DB 테스트로 확인했는지 본다.");
if (config.extensions.length >= 4)
  notes.push(
    "확장을 4개 이상 켰다. 별도 백엔드(유형 C)가 더 맞는지 한 번 검토한다. README 의 「커졌을 때」 절.",
  );

if (notes.length > 0) {
  console.log("\n[알림] 개발을 멈출 필요는 없다. 아래를 확인한다.");
  for (const note of notes) console.log(`- ${note}`);
}
process.exit(0);
