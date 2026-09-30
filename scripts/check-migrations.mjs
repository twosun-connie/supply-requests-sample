// 아직 적용하지 않은 마이그레이션 파일에서 되돌릴 수 없는 변경을 찾는다. 실행: pnpm check:migrations
// 막는 것은 "한 번에 하는" 파괴적 변경이다. 열을 지우거나 이름을 바꿔야 하면 여러 단계로 나눈다(.claude/rules/database.md).
// 마지막 제거 단계의 파일은 첫 줄에 `-- destructive-ok: 《사유》` 를 적으면 통과한다.
// 암호화해 저장해야 하는 정보(주민등록번호 등)의 열도 여기서 막는다. 사용자가 저장 방법을 정했으면 `-- sensitive-ok: 《사유》` 를 적는다.
// RLS·정책·grant 같은 구조는 여기서 보지 않는다. pnpm test 의 구조 검사가 DB 에 적용한 결과를 본다.
import { join } from "node:path";
import {
  MIGRATIONS,
  finish,
  isApplied,
  lineOf,
  migrationFiles,
  readText,
  stripSqlComments,
  stripSqlStrings,
} from "./lib.mjs";

const FILE_NAME = /^\d{14}_[a-z0-9_]+\.sql$/;
const MARKER = /^\s*--\s*destructive-ok:\s*(.*)$/m;
const MIN_REASON_LENGTH = 10;
const SENSITIVE_MARKER = /^\s*--\s*sensitive-ok:\s*(.*)$/m;
const STAGED =
  "여러 단계로 나눈다(새 열 추가 → 값 복사 → 코드 전환 → 옛 열 제거). 절차는 .claude/rules/database.md";

const DESTRUCTIVE = [
  [/\bdrop\s+table\b/gi, "테이블 삭제(drop table)", STAGED],
  [/\bdrop\s+column\b/gi, "열 삭제(drop column)", STAGED],
  [/\bdrop\s+(type|schema)\b/gi, "타입·스키마 삭제", STAGED],
  [/\brename\s+(to|column|value|constraint)\b/gi, "이름 변경(rename)", STAGED],
  [
    /\balter\s+column\s+\S+\s+(set\s+data\s+)?type\b/gi,
    "열의 종류 변경",
    STAGED,
  ],
  [
    /\btruncate\b/gi,
    "전체 행 삭제(truncate)",
    "지워야 하는 행의 조건을 적은 delete 문으로 바꾸고 사용자에게 확인을 받는다",
  ],
];
const ALWAYS = [
  [
    /\bdisable\s+row\s+level\s+security\b/gi,
    "RLS 끄기",
    "RLS 는 끄지 않는다. 정책이 틀렸으면 drop policy if exists 뒤에 새 정책을 만든다",
  ],
  [
    /\bto\s+service_role\b[^;]*\busing\s*\(\s*true\s*\)/gi,
    "service_role 대상 정책",
    "service_role 은 RLS 를 우회한다. 정책이 필요 없다",
  ],
];

// 열 이름으로 본다. 이름을 다르게 지으면 놓친다. 사람이 docs/security-checklist.md 로 확인한다.
const SENSITIVE_COLUMNS = [
  [
    /(^|_)(rrn|jumin|ssn)(_|$)|resident_?(reg(istration)?_?)?(no|num|number|id)(_|$)|social_?security|(^|_)national_?id|주민/,
    "주민등록번호",
  ],
  [/passport|여권/, "여권번호"],
  [/driv(er|ing)s?_?licen[sc]e|운전면허/, "운전면허번호"],
  [/(foreigner|alien)_?(reg|registration)|외국인등록/, "외국인등록번호"],
  [/account_?(no|num|number)(_|$)|bank_?account|계좌/, "계좌번호"],
  [/card_?(no|num|number)(_|$)|credit_?card|카드번호/, "카드번호"],
  [
    /fingerprint|biometric|face_?(template|encoding|vector)|(^|_)iris(_|$)|지문|생체/,
    "생체인식정보",
  ],
];
const PERSONAL_COLUMNS =
  /(^|_)(phone|mobile|tel|email|e_mail|address|addr|birth|birthday|birthdate|dob)(_|$)|전화|휴대폰|이메일|주소|생년/;
const TABLE_CONSTRAINT =
  /^(constraint|primary|unique|check|foreign|exclude|like)$/i;

const problems = [];
const notices = [];
for (const name of migrationFiles()) {
  if (isApplied(name)) continue;
  const where = (line) =>
    `supabase/migrations/${name}${line === undefined ? "" : `:${line}`}`;
  const raw = readText(join(MIGRATIONS, name));

  if (!FILE_NAME.test(name)) {
    problems.push({
      where: where(),
      what: "파일 이름이 《14자리 시각》_《영문 소문자·숫자·밑줄》.sql 형태가 아니다.",
      next: "파일을 지우고 pnpm supabase migration new 《이름》 으로 다시 만든다",
    });
  }

  const marker = raw.match(MARKER);
  const reason = marker?.[1]?.trim() ?? "";
  const allowed = reason.length >= MIN_REASON_LENGTH;
  if (marker !== null && !allowed) {
    problems.push({
      where: where(),
      what: "destructive-ok 의 사유가 너무 짧다.",
      next: "왜 지워도 되는지 한 문장으로 적는다",
    });
  }

  const noComments = stripSqlComments(raw);
  const sql = stripSqlStrings(noComments);
  for (const [pattern, what, next] of [
    ...(allowed ? [] : DESTRUCTIVE),
    ...ALWAYS,
  ]) {
    for (const match of sql.matchAll(pattern))
      problems.push({
        where: where(lineOf(sql, match.index)),
        what: `${what}.`,
        next,
      });
  }

  for (const match of sql.matchAll(
    /\badd\s+column\s+(?:if\s+not\s+exists\s+)?(\S+)([^,;]*)/gi,
  )) {
    if (
      /\bnot\s+null\b/i.test(match[2]) &&
      !/\b(default|generated)\b/i.test(match[2])
    ) {
      problems.push({
        where: where(lineOf(sql, match.index)),
        what: `새 열 ${match[1]} 이 not null 인데 기본값이 없다. 이미 있는 행 때문에 적용에 실패한다.`,
        next: "default 를 주거나 not null 을 뺀다",
      });
    }
  }

  const sensitiveReason = raw.match(SENSITIVE_MARKER)?.[1]?.trim();
  if (
    sensitiveReason !== undefined &&
    sensitiveReason.length < MIN_REASON_LENGTH
  ) {
    problems.push({
      where: where(),
      what: "sensitive-ok 의 사유가 너무 짧다.",
      next: "사용자가 정한 저장 방법(암호화, 접근 권한, 보관 기간)을 한 문장으로 적는다",
    });
  }
  for (const column of newColumns(sql)) {
    const label = `${column.table}.${column.name}`;
    const kind = SENSITIVE_COLUMNS.find(([pattern]) =>
      pattern.test(column.name.toLowerCase()),
    )?.[1];
    if (kind !== undefined) {
      if (sensitiveReason !== undefined) continue;
      problems.push({
        where: where(lineOf(sql, column.index)),
        what: `${kind}로 보이는 열을 만든다: ${label}. 암호화해 저장해야 하는 정보다. 평문 열로 두면 읽기 정책이 허용하는 모든 사용자가 읽는다.`,
        next: "이 열을 빼고 멈춘 뒤 사용자에게 알린다(.claude/rules/security.md §6). 꼭 필요한지, 뒤 몇 자리만으로 되는지 묻는다. 사용자가 저장 방법을 정한 뒤에만 파일 첫 줄에 -- sensitive-ok: 《사유》 를 적는다",
      });
    } else if (PERSONAL_COLUMNS.test(column.name.toLowerCase())) {
      notices.push({
        where: where(lineOf(sql, column.index)),
        what: `개인정보로 보이는 열을 더한다: ${label}.`,
        next: `${column.table} 의 select 정책이 누구에게 이 열을 보여 주는지 본다. 모든 로그인 사용자가 읽는 테이블이면 본인·권한으로 읽는 별도 테이블에 둔다. docs/schema.md 의 그 열에 "개인정보"라고 적는다`,
      });
    }
  }

  // 새 enum 값은 같은 트랜잭션에서 쓸 수 없다. 파일 하나가 트랜잭션 하나다.
  for (const match of noComments.matchAll(
    /\balter\s+type\s+\S+\s+add\s+value\s+(?:if\s+not\s+exists\s+)?'([^']+)'/gi,
  )) {
    const rest =
      noComments.slice(0, match.index) +
      noComments.slice(match.index + match[0].length);
    if (rest.includes(`'${match[1]}'`)) {
      problems.push({
        where: where(lineOf(noComments, match.index)),
        what: `enum 값 '${match[1]}' 을 더한 파일에서 그 값을 바로 쓴다. 적용할 때 오류가 난다.`,
        next: "값을 더하는 파일과 그 값을 쓰는 파일(role_permissions 행 추가, 정책)을 나눈다",
      });
    }
  }
}
finish("마이그레이션 검사", problems, notices);

/** 새로 만드는 열을 돌려준다(create table 의 열, alter table … add column). */
function newColumns(sql) {
  const found = [];
  const unquote = (name) => name.replace(/^"|"$/g, "");
  const pushColumn = (table, definition, index) => {
    const leading = definition.length - definition.trimStart().length;
    const name =
      definition.trimStart().match(/^("[^"]+"|[^\s"(,]+)/)?.[1] ?? "";
    if (name === "" || TABLE_CONSTRAINT.test(name)) return;
    found.push({
      table: unquote(table),
      name: unquote(name),
      index: index + leading,
    });
  };
  for (const match of sql.matchAll(
    /\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?([^\s(]+)\s*\(/gi,
  )) {
    let start = match.index + match[0].length;
    let depth = 0;
    for (let index = start; index < sql.length; index += 1) {
      const char = sql[index];
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
      if ((char === "," && depth === 0) || depth < 0) {
        pushColumn(match[1], sql.slice(start, index), start);
        start = index + 1;
      }
      if (depth < 0) break;
    }
  }
  for (const match of sql.matchAll(
    /\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([^\s;]+)([^;]*)/gi,
  )) {
    const offset = match.index + match[0].length - match[2].length;
    for (const added of match[2].matchAll(
      /\badd\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?(?="|[^\s"])/gi,
    )) {
      const start = added.index + added[0].length;
      pushColumn(match[1], match[2].slice(start), offset + start);
    }
  }
  return found;
}
