// 작업 기록이나 결정 기록을 양식에서 만든다. 실행: pnpm docs:new work 《이름》 / pnpm docs:new decision 《이름》
// 날짜는 이 명령이 붙인다. 파일을 직접 만들어 날짜를 지어내지 않는다.
// 번호를 쓰지 않고 날짜를 쓰는 이유: 여러 작업을 나란히 하면 번호가 겹친다.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { KINDS, RECORD_NAME } from "./docs-lib.mjs";
import { ROOT, readText } from "./lib.mjs";

const [kind, ...words] = process.argv.slice(2);
const spec = KINDS[kind];
if (spec === undefined || words.length === 0) {
  console.error(
    "사용: pnpm docs:new work 《이름》  또는  pnpm docs:new decision 《이름》\n예: pnpm docs:new work 신청-목록-검색",
  );
  process.exit(1);
}

const slug = words
  .join("-")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9가-힣]+/g, "-")
  .replace(/^-+|-+$/g, "");
const now = new Date();
const date = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
].join("-");
const name = `${date}-${slug}.md`;
if (slug === "" || !RECORD_NAME.test(name)) {
  console.error(
    "이름에 쓸 수 있는 글자가 없다. 한글, 영문 소문자, 숫자, 붙임표(-)를 쓴다.",
  );
  process.exit(1);
}

const dir = join(ROOT, spec.dir);
const path = join(dir, name);
if (existsSync(path)) {
  console.error(
    `이미 있다: ${spec.dir}/${name}\n이어서 하는 작업이면 이 파일에 더한다. 다른 작업이면 이름을 바꾼다.`,
  );
  process.exit(1);
}
const template = readText(join(dir, "_template.md"));
if (template === "") {
  console.error(
    `양식이 없다: ${spec.dir}/_template.md\n템플릿의 scaffold/${spec.dir}/_template.md 를 복사한다.`,
  );
  process.exit(1);
}

mkdirSync(dir, { recursive: true });
writeFileSync(
  path,
  template
    .replace(/<!--[\s\S]*?-->\n?/, "")
    .replace(/《날짜》/g, date)
    .replace(/《제목》/g, words.join(" ")),
);
console.log(`${spec.dir}/${name}`);
console.log(
  kind === "work"
    ? "다음: 요청(사용자가 한 말 그대로)과 계획을 적는다. 작업이 끝나면 한 일·검증·하지 않은 것을 채우고 상태를 「완료」로 바꾼다."
    : "다음: 배경, 선택지, 고른 것과 이유, 영향을 적는다. 사용자가 정하기 전에는 상태를 「제안」으로 둔다.",
);
