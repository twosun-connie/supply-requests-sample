// 이름과 주석의 약속을 검사한다. 실행: pnpm check:conventions
// 규칙의 원본은 AGENTS.md §4 「이름·주석·커밋」과 .claude/rules/conventions.md 다.
// 글자만 본다(파일 이름, 내보내는 이름, 주석의 자리와 모양). 이름이 뜻에 맞는지, 주석의 내용이 맞는지는 code-reviewer 와 사람이 본다.
// DB 의 이름과 설명(comment on)은 여기서 보지 않는다. pnpm test:db 의 구조 검사가 적용한 결과를 본다.
import { join } from "node:path";
import {
  MIGRATIONS,
  ROOT,
  finish,
  isApplied,
  lineOf,
  migrationFiles,
  readText,
  show,
  walk,
} from "./lib.mjs";

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Next.js 가 정한 설정 이름. 설명을 붙이지 않아도 된다. */
const NEXT_CONFIG_EXPORTS = new Set([
  "metadata",
  "viewport",
  "dynamic",
  "dynamicParams",
  "revalidate",
  "fetchCache",
  "runtime",
  "preferredRegion",
  "maxDuration",
  "config",
  "generateMetadata",
  "generateStaticParams",
  "generateViewport",
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);
/** 하는 일이 파일 이름으로 정해진 화면 조각. 내보내는 함수에 설명을 요구하지 않는다. */
const STATE_FILES = new Set(["loading.tsx", "error.tsx"]);
const QUERY_PREFIX = /^(get|list|count|find|search|has|is)(?=[A-Z]|$)/;
const ACTION_BANNED_PREFIX =
  /^(get|list|find|fetch|load|handle|do|process|on)(?=[A-Z]|$)/;
const RULE_PREFIX = /^(check|calc|next|is|can)(?=[A-Z]|$)/;
const MIGRATION_VERB =
  /^\d{14}_(create|add|alter|fix|drop|remove|rename|backfill|seed|enable|grant|revoke|comment)_[a-z0-9_]+\.sql$/;
// 「필요」처럼 요 로 끝나는 명사가 있어 어미를 하나씩 적는다.
const POLITE_YO =
  /(세요|해요|에요|예요|어요|아요|워요|와요|여요|져요|려요|줘요|봐요|돼요|네요|군요|까요|죠)[.!?)]*$/;
const HANGUL = /[가-힣]/;
const CODE_START =
  /^(import\b|export\b|const\b|let\b|var\b|return\b|await\b|if\s*\(|for\s*\(|while\s*\(|function\b|\}|<\/?[A-Za-z])/;

const isCode = (path) =>
  /\.(ts|tsx)$/.test(path) &&
  !/(\.d\.ts|\.test\.tsx?|database\.types\.ts)$/.test(path);
const isOurs = (path) =>
  !/[\\/]components[\\/]ui[\\/]/.test(path) &&
  !/[\\/]lib[\\/]utils\.ts$/.test(path);
const allFiles = ["app", "features", "components", "lib"].flatMap((dir) =>
  walk(join(ROOT, dir), (path) => isOurs(path)),
);
const codeFiles = allFiles.filter(isCode);

const problems = [];
const add = (where, what, next, line) =>
  problems.push({
    where: `${where}${line === undefined ? "" : `:${line}`}`,
    what,
    next,
  });

// 1) 파일·폴더 이름
const seenSegments = new Set();
for (const path of allFiles) {
  const shown = show(path);
  const segments = shown.split("/");
  segments.forEach((segment, index) => {
    const key = segments.slice(0, index + 1).join("/");
    if (seenSegments.has(key)) return;
    seenSegments.add(key);
    const isFile = index === segments.length - 1;
    if (!isKebabSegment(segment, isFile)) {
      add(
        key,
        `${isFile ? "파일" : "폴더"} 이름이 kebab-case 가 아니다: ${segment}`,
        "소문자와 숫자를 - 로 잇는다(예: request-form.tsx, user-roles/). 컴포넌트 이름은 PascalCase 로 두고 파일 이름만 바꾼다",
      );
    }
  });
}

for (const path of codeFiles) {
  const shown = show(path);
  const text = readText(path);
  const name = shown.split("/").at(-1);

  // 2) 내보내는 것의 설명과 이름
  for (const item of exportsOf(text)) {
    const needsDoc =
      !NEXT_CONFIG_EXPORTS.has(item.name) && !STATE_FILES.has(name);
    if (needsDoc && !item.hasDoc) {
      add(
        shown,
        `내보내는 ${item.kindLabel} ${item.name} 위에 설명(/** … */)이 없다.`,
        "바로 위에 /** 무엇을 하는지 한 문장. 왜 필요한지·주의할 것(권한, 없을 때 돌려주는 값, 단위)이 있으면 이어서 */ 를 쓴다. 이름을 되풀이하지 않는다",
        item.line,
      );
    }
    if (item.kind !== "function" && item.kind !== "const") continue;
    if (name === "queries.ts" && item.isFunction) {
      if (!QUERY_PREFIX.test(item.name)) {
        add(
          shown,
          `조회 함수 이름이 약속과 다르다: ${item.name}`,
          "하나를 읽으면 get《대상》, 여러 개면 list《대상》, 개수면 count《대상》 으로 시작한다(예: getRequestDetail, listRequests, countRequestsByStatus)",
          item.line,
        );
      }
    }
    if (name === "actions.ts" && item.isFunction) {
      if (ACTION_BANNED_PREFIX.test(item.name)) {
        add(
          shown,
          `서버 액션 이름이 하는 일을 말하지 않는다: ${item.name}`,
          "업무의 동사 + 대상으로 짓는다(예: createRequest, approveRequest, changeUserRole). get·handle·do·process·on 으로 시작하지 않는다",
          item.line,
        );
      }
    }
    if (name === "rules.ts" && item.isFunction) {
      if (!RULE_PREFIX.test(item.name)) {
        add(
          shown,
          `규칙 함수 이름이 약속과 다르다: ${item.name}`,
          "되는지 확인하면 check《규칙》(안 되면 문장, 되면 null), 계산이면 calc《값》, 다음 상태면 next《대상》, 참·거짓이면 is·can 으로 시작한다",
          item.line,
        );
      }
    }
    if (
      name === "schema.ts" &&
      item.kind === "const" &&
      item.isZod &&
      !/Schema$/.test(item.name)
    ) {
      add(
        shown,
        `Zod 스키마 이름이 Schema 로 끝나지 않는다: ${item.name}`,
        "《동작》《대상》Schema 로 짓는다(예: createRequestSchema). 입력 타입은 《동작》《대상》Input",
        item.line,
      );
    }
  }
  const defaultName = text.match(
    /^export\s+default\s+(?:async\s+)?function\s+(\w+)/m,
  )?.[1];
  if (defaultName !== undefined) {
    const suffix = { "page.tsx": "Page", "layout.tsx": "Layout" }[name];
    if (suffix !== undefined && !defaultName.endsWith(suffix)) {
      add(
        shown,
        `${name} 의 컴포넌트 이름이 ${suffix} 로 끝나지 않는다: ${defaultName}`,
        `《화면 이름》${suffix} 로 짓는다(예: RequestDetail${suffix}). 오류 추적과 React 개발 도구에 이 이름이 보인다`,
      );
    }
  }

  // 3) 주석의 모양
  for (const comment of commentsOf(text)) {
    const body = comment.text;
    if (/\b(TODO|FIXME|HACK|XXX)\b(?!\()/.test(body)) {
      add(
        shown,
        "근거 없는 TODO 다. 누가 언제 하는지 알 수 없다.",
        "지금 하거나 지운다. 남겨야 하면 TODO(《작업 기록 파일 이름 또는 담당자》): 《할 일》 로 쓰고 작업 기록의 「하지 않은 것」에도 적는다",
        comment.line,
      );
    }
    if (isPolite(body.trim())) {
      add(
        shown,
        `주석이 존댓말이다: ${body.trim().slice(0, 40)}`,
        "주석은 한국어 평서문으로 쓴다(「~한다」, 「~이다」). 존댓말은 사용자에게 보이는 화면 문구에만 쓴다",
        comment.line,
      );
    }
    if (
      comment.isLine &&
      !HANGUL.test(body) &&
      CODE_START.test(body.trim()) &&
      /[;{})>]\s*$/.test(body)
    ) {
      add(
        shown,
        `주석 처리한 코드가 남아 있다: ${body.trim().slice(0, 40)}`,
        "지운다. 옛 코드는 git 기록에 있다. 나중에 할 일이면 작업 기록의 「하지 않은 것」에 적는다",
        comment.line,
      );
    }
  }
}

// 4) 마이그레이션 파일(아직 적용하지 않은 것만. 적용한 파일은 고칠 수 없다)
for (const fileName of migrationFiles()) {
  if (isApplied(fileName)) continue;
  const where = `supabase/migrations/${fileName}`;
  if (!MIGRATION_VERB.test(fileName)) {
    add(
      where,
      "마이그레이션 파일 이름이 무엇을 하는지 말하지 않는다.",
      "《시각》_《동사》_《대상》.sql 로 짓는다. 동사는 create·add·alter·fix·drop·remove·rename·backfill·seed·enable·grant·revoke·comment 가운데 하나(예: create_requests, add_requests_needed_by, fix_policy_requests). 파일은 pnpm supabase migration new 《이름》 으로 만든다",
    );
  }
  const sql = readText(join(MIGRATIONS, fileName));
  const firstLine = sql.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";
  if (!/^\s*--\s*\S/.test(firstLine)) {
    add(
      where,
      "파일의 첫 줄에 왜 이 변경이 필요한지 적은 주석이 없다.",
      "첫 줄에 -- 《왜 필요한가 한 문장. 근거 문서가 있으면 docs/… 경로》 를 쓴다. 무엇을 하는지는 SQL 이 말한다",
      1,
    );
  }
}

finish("이름·주석 검사", problems);

/**
 * 존댓말로 끝나는지 본다. 「~ㅂ니다」는 「니다」 앞 글자의 받침이 ㅂ 인 것으로 가린다.
 * 그래서 평서문 「~가 아니다」(받침 없음)는 걸리지 않는다.
 */
function isPolite(text) {
  if (POLITE_YO.test(text)) return true;
  const match = text.match(/([가-힣])니다[.!)]*$/);
  if (match === null) return false;
  const FINAL_BIEUP = 17;
  return (match[1].charCodeAt(0) - 0xac00) % 28 === FINAL_BIEUP;
}

/** 경로의 한 조각이 kebab-case 인지 본다. Next.js 의 묶음 (…), 주소 변수 […], 슬롯 @…, 비공개 _… 표기는 벗기고 본다. */
function isKebabSegment(segment, isFile) {
  if (isFile) {
    const parts = segment.split(".");
    parts.pop();
    return parts.length > 0 && parts.every((part) => KEBAB.test(part));
  }
  const group = segment.match(/^\((.+)\)$/);
  if (group !== null) return KEBAB.test(group[1].replace(/^\.+/, ""));
  // 주소 변수는 코드에서 params.《이름》 으로 읽으므로 camelCase 를 허용한다.
  if (/^\[{1,2}(\.\.\.)?[a-z][A-Za-z0-9]*\]{1,2}$/.test(segment)) return true;
  return KEBAB.test(segment.replace(/^[@_]/, ""));
}

/** 파일이 내보내는 선언을 돌려준다(다시 내보내기 export { … } from 은 뺀다). */
function exportsOf(text) {
  const found = [];
  const pattern =
    /^export\s+(default\s+)?(?:(async\s+)?(function)\s*\*?\s*(\w+)|(const|let)\s+(\w+)|(type|interface|class|enum)\s+(\w+))/gm;
  for (const match of text.matchAll(pattern)) {
    const kind = match[3] ?? match[5] ?? match[7];
    const name = match[4] ?? match[6] ?? match[8];
    const rest = text.slice(
      match.index + match[0].length,
      match.index + match[0].length + 200,
    );
    const isArrow =
      kind === "const" &&
      /^[^=]*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>/.test(rest);
    found.push({
      name,
      kind: kind === "let" ? "const" : kind,
      kindLabel:
        {
          function: "함수",
          const: "값",
          let: "값",
          type: "타입",
          interface: "타입",
          class: "클래스",
          enum: "열거형",
        }[kind] ?? "선언",
      isFunction: kind === "function" || isArrow,
      isZod: kind === "const" && /^[^=]*=\s*z\s*\./.test(rest),
      line: lineOf(text, match.index),
      hasDoc: hasDocAbove(text, match.index),
    });
  }
  return found;
}

/** 선언 바로 위(빈 줄 없이)에 내용이 있는 JSDoc 블록이 있는지 본다. */
function hasDocAbove(text, index) {
  const before = text.slice(0, index);
  const block = before.match(/\/\*\*((?:(?!\*\/)[\s\S])*)\*\/[ \t]*\r?\n$/);
  if (block === null) return false;
  const content = block[1]
    .split("\n")
    .map((line) => line.replace(/^\s*\*?\s?/, "").trim())
    .filter((line) => line !== "" && !line.startsWith("@"))
    .join(" ");
  return content.length >= 5;
}

/** 주석을 한 줄씩 돌려준다. 문자열 안의 // 는 주소(https://)일 수 있어 앞 글자가 : 이면 건너뛴다. */
function commentsOf(text) {
  const found = [];
  const lines = text.split("\n");
  let inBlock = false;
  lines.forEach((raw, index) => {
    const line = index + 1;
    if (inBlock) {
      const end = raw.indexOf("*/");
      const body = (end === -1 ? raw : raw.slice(0, end)).replace(
        /^\s*\*?\s?/,
        "",
      );
      if (body.trim() !== "") found.push({ text: body, line, isLine: false });
      if (end !== -1) inBlock = false;
      return;
    }
    const blockStart = raw.match(/^\s*\/\*\*?(.*)$/);
    if (blockStart !== null) {
      const end = blockStart[1].indexOf("*/");
      const body = end === -1 ? blockStart[1] : blockStart[1].slice(0, end);
      if (body.trim() !== "") found.push({ text: body, line, isLine: false });
      if (end === -1) inBlock = true;
      return;
    }
    const jsx = raw.match(/\{\/\*(.*?)\*\/\}/);
    if (jsx !== null) found.push({ text: jsx[1], line, isLine: false });
    const lineComment = raw.match(/(^|[^:"'`\w])\/\/(.*)$/);
    if (lineComment !== null) {
      found.push({
        text: lineComment[2],
        line,
        isLine: /^\s*\/\//.test(raw),
      });
    }
  });
  return found;
}
