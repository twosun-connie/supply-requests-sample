// 기록 현황. 실행: pnpm report:docs
// 끝나지 않은 작업, 사람이 아직 하지 않은 일, 정해지지 않은 결정, 「다음에 막을 것」을 모아 보여 준다.
// 알리기만 한다. 종료 코드는 항상 0 이다. 목록 파일을 만들지 않는다(여러 작업을 나란히 하면 그 파일에서 충돌한다).
//   --all   끝난 기록까지 모두 보여 준다
import { KINDS, parseRecord, readRecord, recordNames } from "./docs-lib.mjs";

const all = process.argv.includes("--all");
const LIMIT = 10;
const lines = [];

const work = recordNames("work").map((name) => ({
  name,
  ...parseRecord(readRecord("work", name)),
}));
const decisions = recordNames("decision").map((name) => ({
  name,
  ...parseRecord(readRecord("decision", name)),
}));

const open = work.filter((record) => record.meta["상태"] === "진행 중");
if (open.length > 0) {
  lines.push("끝나지 않은 작업");
  for (const record of open.slice(-LIMIT))
    lines.push(`- ${KINDS.work.dir}/${record.name} — ${record.title}`);
}

const todos = work.flatMap((record) =>
  [...(record.sections["사람이 할 일"] ?? "").matchAll(/^- \[ \] +(.+)$/gm)]
    .map((match) => match[1].trim())
    .filter((text) => !/《/.test(text))
    .map((text) => `- ${text} (${record.name})`),
);
if (todos.length > 0) {
  lines.push("사람이 아직 하지 않은 일");
  lines.push(...todos.slice(-LIMIT));
}

const proposed = decisions.filter((record) => record.meta["상태"] === "제안");
if (proposed.length > 0) {
  lines.push("정해지지 않은 결정");
  for (const record of proposed.slice(-LIMIT))
    lines.push(`- ${KINDS.decision.dir}/${record.name} — ${record.title}`);
}

const guards = work.flatMap((record) =>
  [
    ...(record.sections["다음에 막을 것"] ?? "").matchAll(
      /^- (?!\[x\])(.+)$/gim,
    ),
  ]
    .map((match) => match[1].replace(/^\[ \] +/, "").trim())
    .filter((text) => text !== "" && !/^없음/.test(text) && !/《/.test(text))
    .map((text) => `- ${text} (${record.name})`),
);
if (guards.length > 0) {
  lines.push("다음에 막을 것 — 규칙이나 검사로 옮길 후보(/retro)");
  lines.push(...guards.slice(-LIMIT));
}

if (all) {
  lines.push("모든 기록");
  for (const record of [...work, ...decisions])
    lines.push(
      `- ${record.name} [${record.meta["상태"] ?? "?"}] ${record.title}`,
    );
}

console.log(
  lines.length === 0
    ? `[기록 현황] 작업 기록 ${work.length}건, 결정 기록 ${decisions.length}건. 남은 일 없음.`
    : [
        `[기록 현황] 작업 기록 ${work.length}건, 결정 기록 ${decisions.length}건`,
        ...lines,
      ].join("\n"),
);
