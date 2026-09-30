// 규칙 대응표. 실행: pnpm report:rules
// docs/rules.md 의 「업무 규칙」 표에 있는 문장마다 같은 이름의 테스트(it·test) 또는 테스트 묶음(describe)이 있는지 본다.
// 알리기만 한다. 종료 코드는 항상 0 이다. 아직 만들지 않은 화면의 규칙은 테스트가 없는 것이 맞다.
// 이번 작업의 범위에 드는 규칙에 테스트가 없으면 빠뜨린 것이다. 보고의 「하지 않은 것」과 대조한다.
import { join } from "node:path";
import { ROOT, readText, walk } from "./lib.mjs";

const section = readText(join(ROOT, "docs", "rules.md"))
  .split(/^## /m)
  .find((part) => /^\d+\.\s*업무 규칙/.test(part));
if (section === undefined) {
  console.log(
    "[규칙 대응표] docs/rules.md 에 「업무 규칙」 절이 없다. /write-docs 로 만든다.",
  );
  process.exit(0);
}

const rules = section
  .split("\n")
  .filter((line) => line.trim().startsWith("|"))
  .map((line) =>
    line
      .trim()
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim()),
  )
  .slice(2)
  .filter((cells) => (cells[0] ?? "") !== "" && !/^《/.test(cells[0]))
  .map((cells) => ({ sentence: cells[0], enforcedBy: cells[1] ?? "" }));

const isTest = (path) => /\.test\.tsx?$/.test(path);
const tests = ["app", "features", "lib", "test"]
  .flatMap((dir) => walk(join(ROOT, dir), isTest))
  .flatMap((path) =>
    [
      ...readText(path).matchAll(
        /\b(?:it|test|describe)\(\s*(["'`])((?:(?!\1).)+)\1/g,
      ),
    ].map((match) => normalize(match[2])),
  );

const missing = rules.filter(
  (rule) => !tests.some((name) => name.includes(normalize(rule.sentence))),
);

console.log(
  `[규칙 대응표] 규칙 ${rules.length}개 가운데 같은 이름의 테스트가 있는 것 ${rules.length - missing.length}개`,
);
for (const rule of missing)
  console.log(`- 테스트 없음: ${rule.sentence} (강제: ${rule.enforcedBy})`);
if (missing.length > 0) {
  console.log(
    "이번 작업의 범위에 드는 규칙이면 구현과 테스트를 더한다. 테스트(it) 또는 묶음(describe)의 이름에 규칙 문장을 그대로 쓴다.",
  );
  console.log(
    "강제가 서버 액션이면 rules.test.ts, 입력 검증이면 schema.test.ts, 정책·DB 제약이면 test/db/ 에 쓴다.",
  );
}
process.exit(0);

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}
