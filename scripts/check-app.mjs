// 앱 코드의 모양을 검사한다. 실행: pnpm check:app
// 화면 폴더의 파일마다 빠지면 안 되는 것을 본다. ESLint 가 보지 못하는 것(파일 사이의 약속)을 맡는다.
// 규칙의 원본은 AGENTS.md §3·§4 와 .claude/rules/data-access.md, ui.md 다.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT, finish, lineOf, readText, show, walk } from "./lib.mjs";

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOR_CLASS = new RegExp(
  `(?<![\\w-])(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|decoration|shadow|accent|caret|placeholder)-(?:${PALETTE})-\\d{2,3}(?:/\\d+)?(?![\\w-])`,
  "g",
);
const IMPURE_IMPORT =
  /^import\s+(?!type\b)[^;]*?from\s+["'](next\/[^"']+|react|@\/lib\/auth|@\/lib\/supabase\/(?:server|client|admin|proxy)|server-only)["']/m;

const isCode = (path) =>
  /\.(ts|tsx)$/.test(path) && !/(\.d\.ts|\.test\.tsx?)$/.test(path);
const files = [
  ...walk(join(ROOT, "app"), isCode),
  ...walk(join(ROOT, "features"), isCode),
  ...walk(
    join(ROOT, "components"),
    (path) => isCode(path) && !/[\\/]components[\\/]ui[\\/]/.test(path),
  ),
];
const problems = [];
const add = (path, what, next, line) =>
  problems.push({
    where: `${show(path)}${line === undefined ? "" : `:${line}`}`,
    what,
    next,
  });

for (const path of files) {
  const shown = show(path);
  const text = readText(path);
  const name = shown.split("/").at(-1);
  const isClient = /^\s*["']use client["']/m.test(text);
  const inApp = shown.startsWith("app/(app)/");
  const inAuth = shown.startsWith("app/(auth)/");

  if (shown.includes("\\")) {
    add(
      path,
      "경로에 역슬래시가 들어 있다. 셸에서 괄호를 잘못 감싼 흔적이다.",
      "이 폴더를 지우고 올바른 경로(app/(app)/…)에 파일이 있는지 확인한다",
    );
    continue;
  }

  if (
    name === "page.tsx" &&
    inApp &&
    !/\brequire(User|Permission)\(/.test(text)
  ) {
    add(
      path,
      "페이지가 로그인을 확인하지 않는다.",
      "조회보다 먼저 requireUser() 또는 requirePermission('대상.동작') 을 부른다",
    );
  }
  if (
    name === "page.tsx" &&
    inApp &&
    /\/\[[^\]/]+\]\/page\.tsx$/.test(shown) &&
    !/\bnotFound\(/.test(text)
  ) {
    add(
      path,
      "주소에 ID 를 받는 페이지가 notFound() 를 부르지 않는다. 없는 행과 볼 수 없는 행을 본문 문구로만 알리면 응답이 200 이다.",
      "조회 결과가 없으면 next/navigation 의 notFound() 를 부른다. 정책이 막은 행도 0행으로 오므로 같은 길로 처리된다",
    );
  }
  if (
    name === "page.tsx" &&
    !/^app\/(\((app|auth)\)\/|health\/|page\.tsx$)/.test(shown)
  ) {
    add(
      path,
      "화면이 app/(app)/, app/(auth)/ 밖에 있다. 블록을 넣을 때 딸려 온 예제 페이지이거나 뼈대 밖의 화면이다.",
      "예제 페이지면 폴더째 지운다(/add-block 5단계). 실제 화면이면 app/(app)/《화면》/ 으로 옮긴다",
    );
  }
  if (/cdn\.shadcnstudio\.com|shadcn\/studio|Shadcn Studio/.test(text)) {
    add(
      path,
      "shadcn studio 블록의 예제 내용(외부 이미지 주소나 상표 문구)이 남아 있다.",
      "예제 이미지·문구를 지우고 우리 내용으로 채운다(/add-block 6단계)",
    );
  }
  if (inApp && /<main\b/.test(text)) {
    add(
      path,
      "화면이 <main> 을 만든다. app/(app)/layout.tsx 의 SidebarInset 이 이미 <main> 이고 본문 폭·여백도 거기서 정한다(겹치면 <main> 이 둘이 되고 여백이 두 번 들어간다).",
      "<main> 을 <div> 나 조각(<>…</>)으로 바꾸고 폭·여백 클래스를 지운다. loading.tsx, error.tsx 도 같다",
    );
  }
  if (name === "loading.tsx" && inApp && !/Skeleton\b/.test(text)) {
    add(
      path,
      "loading.tsx 가 자리 표시(Skeleton)를 쓰지 않는다. 문구만 띄우면 화면이 바뀔 때 배치가 흔들린다.",
      "components/page-skeleton.tsx 의 PageSkeleton 을 돌려준다(return <PageSkeleton />)",
    );
  }
  if (name === "error.tsx" && inApp && !/<ErrorState\b/.test(text)) {
    add(
      path,
      "error.tsx 가 공용 오류 상태를 쓰지 않는다. 화면마다 오류 모양이 달라진다.",
      "components/error-state.tsx 의 ErrorState 를 돌려준다(title 과 reset 을 넘긴다)",
    );
  }
  if (name === "queries.ts" && /===\s*null\s*\)\s*\{?\s*throw\b/.test(text)) {
    add(
      path,
      "조회 결과가 없을 때 예외를 던진다. 없는 행이 「일시적인 오류」 화면(error.tsx)으로 보인다.",
      "행이 없으면 null 을 돌려주고, page.tsx 가 notFound() 를 부른다. 예외는 조회 자체가 실패했을 때(error !== null)만 던진다",
    );
  }
  if (name === "page.tsx" && inApp && !/<PageHeader\b/.test(text)) {
    add(
      path,
      "화면이 PageHeader 로 시작하지 않는다. 화면마다 제목 모양이 달라진다.",
      "components/page-header.tsx 의 PageHeader 를 쓴다(title, description, actions). <main> 은 app/(app)/layout.tsx 가 그린다",
    );
  }
  if (name === "page.tsx" && isClient) {
    add(
      path,
      "페이지가 클라이언트 컴포넌트다.",
      "페이지는 서버 컴포넌트로 두고 상호작용이 있는 조각만 《이름》-form.tsx 로 나눈다",
    );
  }

  if (name === "route.ts") {
    const mutating = [
      ...text.matchAll(
        /^export\s+(?:async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b/gm,
      ),
    ].map((match) => match[1]);
    const verified = /\bisSameOrigin\(|\bCRON_SECRET\b|signature/i.test(text);
    if (mutating.length > 0 && !verified) {
      add(
        path,
        `Route Handler 의 ${mutating.join("·")} 가 요청의 출처를 확인하지 않는다. 서버 액션과 달리 Next.js 가 확인해 주지 않는다.`,
        "화면이 부르는 주소면 첫 줄에서 lib/request-origin.ts 의 isSameOrigin(request) 를 확인한다. 외부 서비스가 부르는 주소면 서명이나 비밀 값을 확인한다. 화면이 부르는 변경은 서버 액션으로 하는 편이 낫다",
      );
    }
  }

  if (name === "queries.ts" && !/^import\s+["']server-only["']/m.test(text)) {
    add(
      path,
      'import "server-only" 가 없다.',
      '첫 줄에 import "server-only"; 를 더한다',
    );
  }

  if (name === "actions.ts") {
    if (!/^\s*["']use server["']/m.test(text))
      add(path, '"use server" 가 없다.', '첫 줄에 "use server"; 를 더한다');
    if (!inAuth) {
      const parts = text.split(/^export\s+async\s+function\s+/m).slice(1);
      for (const part of parts) {
        const functionName = part.match(/^(\w+)/)?.[1] ?? "?";
        if (!/\brequire(User|Permission)\(/.test(part)) {
          add(
            path,
            `서버 액션 ${functionName} 이 로그인을 확인하지 않는다. 서버 액션은 누구나 부를 수 있는 주소다.`,
            "첫 줄에서 requireUser() 를 부른다",
          );
        }
        for (const problem of checkActionBody(part)) {
          add(path, `서버 액션 ${functionName}: ${problem.what}`, problem.next);
        }
        if (/formData/.test(part) && !/\.safeParse\(/.test(part)) {
          add(
            path,
            `서버 액션 ${functionName} 이 입력을 검증하지 않는다.`,
            "schema.ts 의 Zod 스키마로 safeParse 한다",
          );
        }
      }
    }
  }

  if (name === "rules.ts") {
    if (!/^export\s+(function|const)\s/m.test(text)) {
      add(
        path,
        "내보내는 규칙이 없다.",
        "상태 전이·계산 규칙이 없으면 rules.ts 를 만들지 않는다. 이 파일을 지운다",
      );
    }
    const impure = text.match(IMPURE_IMPORT);
    if (impure !== null) {
      add(
        path,
        `규칙 파일이 ${impure[1]} 을 불러온다. 규칙은 순수 함수여야 테스트할 수 있다.`,
        "필요한 값은 인자로 받는다. 타입만 필요하면 import type 을 쓴다",
        lineOf(text, impure.index),
      );
    }
    if (!existsSync(join(dirname(path), "rules.test.ts"))) {
      add(
        path,
        "rules.test.ts 가 없다.",
        "규칙 문장 하나에 테스트 하나를 쓴다. 테스트 이름은 docs/rules.md 의 문장을 그대로 쓴다",
      );
    }
  }

  if (
    isClient &&
    /^import\s+(?!type\b)[^;]*?from\s+["'](?:\.{1,2}\/|@\/)[^"']*\bqueries["']/m.test(
      text,
    )
  ) {
    add(
      path,
      "클라이언트 컴포넌트가 queries.ts 를 불러온다.",
      "조회는 서버 컴포넌트가 하고 결과만 속성으로 넘긴다",
    );
  }

  for (const problem of checkInjection(text)) {
    add(path, problem.what, problem.next, lineOf(text, problem.index));
  }

  if (path.endsWith(".tsx")) {
    for (const match of text.matchAll(COLOR_CLASS)) {
      add(
        path,
        `색을 직접 지정했다: ${match[0]}`,
        "app/globals.css 의 변수로 된 클래스를 쓴다(예: bg-muted, text-muted-foreground, border-destructive, text-destructive)",
        lineOf(text, match.index),
      );
    }
    for (const match of text.matchAll(
      /(?:className|class)=[^>]*?#[0-9a-fA-F]{3,8}\b|\bstyle=\{\{/g,
    )) {
      add(
        path,
        "색·간격 값을 직접 적었다.",
        "Tailwind 클래스와 app/globals.css 의 변수를 쓴다",
        lineOf(text, match.index),
      );
    }
  }
}

finish("앱 코드 검사", problems);

/** 밖에서 온 값이 그대로 흘러 들어가는 자리를 찾는다. */
function checkInjection(text) {
  const found = [];
  for (const match of text.matchAll(/\bdangerouslySetInnerHTML\b/g)) {
    found.push({
      index: match.index,
      what: "dangerouslySetInnerHTML 을 쓴다. 사용자가 쓴 글이 들어가면 스크립트가 실행된다.",
      next: "글은 {value} 로 넣는다(React 가 이스케이프한다). HTML 을 꼭 보여 줘야 하면 계획에서 정제 방법을 사용자에게 승인받는다",
    });
  }
  for (const match of text.matchAll(
    /\.(or|filter|not)\(\s*(`[^`]*\$\{|["'][^"']*["']\s*\+)/g,
  )) {
    found.push({
      index: match.index,
      what: `.${match[1]}() 의 필터 문자열에 값을 끼워 넣는다. 쉼표·괄호가 든 입력으로 조건을 바꿀 수 있다.`,
      next: "값을 인자로 받는 메서드를 쓴다: .eq(), .ilike(), .in(). 여러 조건의 OR 가 꼭 필요하면 값을 허용 목록과 대조한 뒤에 넣는다",
    });
  }
  for (const match of text.matchAll(
    /\.(i?like)\(\s*[^,()]+,\s*(`[^`]*\$\{|["'][^"']*["']\s*\+|[\w.]+\s*\+\s*["'`])/g,
  )) {
    found.push({
      index: match.index,
      what: `.${match[1]}() 의 패턴에 검색어를 그대로 끼워 넣는다. 검색어의 %, _ 가 와일드카드로 쓰이고 길이 제한이 없다.`,
      next: "lib/search.ts 의 toContainsPattern(검색어) 가 돌려준 패턴을 넘긴다. 빈 문자열이면 검색 조건을 붙이지 않는다",
    });
  }
  for (const match of text.matchAll(
    /\bredirect\(\s*(?:String\()?(next|returnTo|returnUrl|redirectTo|callbackUrl|url|searchParams|formData)\b/g,
  )) {
    // 같은 파일에서 safeRedirectPath() 로 확인해 둔 값은 넘어간다.
    const checked = new RegExp(
      `\\b(?:const|let)\\s+${match[1]}\\s*=\\s*safeRedirectPath\\(`,
    );
    if (checked.test(text)) continue;
    found.push({
      index: match.index,
      what: `밖에서 온 값(${match[1]})으로 redirect() 를 부른다. 다른 사이트로 보내는 데 쓰일 수 있다.`,
      next: "lib/safe-redirect.ts 의 safeRedirectPath() 로 내부 경로인지 확인한 값을 넘긴다",
    });
  }
  return found;
}

/** 서버 액션 하나의 본문을 본다. 빠뜨리면 사고가 나는 것만 본다. */
function checkActionBody(body) {
  const found = [];
  if (/\brequirePermission\(/.test(body)) {
    found.push({
      what: "requirePermission() 은 페이지용이다(권한이 없으면 404 화면을 띄운다).",
      next: "서버 액션에서는 requireUser() 뒤에 if (!(await hasPermission('대상.동작'))) return DENIED; 를 쓴다",
    });
  }
  for (const block of blocksAfter(body, /\btry\s*\{/g)) {
    if (/\b(requireUser|requirePermission|redirect|notFound)\(/.test(block)) {
      found.push({
        what: "try 안에서 requireUser()·redirect() 를 부른다. 이 함수들은 예외로 화면을 옮기는데 catch 가 삼킨다.",
        next: "try/catch 로 액션 전체를 감싸지 않는다. Supabase 호출은 예외를 던지지 않으니 error 값을 검사한다",
      });
      break;
    }
  }
  const mutations = [...body.matchAll(/\.(update|upsert|delete)\(/g)];
  for (const match of mutations) {
    const statement = body.slice(
      match.index,
      endOfStatement(body, match.index),
    );
    if (!/\.select\(/.test(statement)) {
      found.push({
        what: `${match[1]} 뒤에 바뀐 행을 확인하지 않는다. 정책이 막으면 오류 없이 0행이 바뀐다.`,
        next: '.select("id") 를 붙이고 data.length === 0 이면 실패로 돌려준다',
      });
    }
    const payload =
      match[1] === "update"
        ? blockFrom(body, match.index + match[0].length - 1, "(", ")")
        : "";
    if (
      /\bstatus\s*:/.test(payload) &&
      !/\.(eq|in|neq)\(\s*["']status["']/.test(statement)
    ) {
      found.push({
        what: "상태를 바꾸는데 바꾸기 전의 상태 조건이 없다. 두 사람이 동시에 누르면 둘 다 처리된다.",
        next: '읽어 둔 상태를 조건으로 붙인다: .eq("status", current.data.status)',
      });
    }
  }
  const changes = mutations.length > 0 || /\.insert\(/.test(body);
  if (changes && !/\b(revalidatePath|redirect)\(/.test(body)) {
    found.push({
      what: "데이터를 바꾼 뒤 화면을 갱신하지 않는다.",
      next: "revalidatePath('《경로》') 를 부른다",
    });
  }
  return found;
}

/** 문장의 끝(괄호 밖의 첫 세미콜론)을 찾는다. */
function endOfStatement(text, start) {
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (char === "(" || char === "{" || char === "[") depth += 1;
    if (char === ")" || char === "}" || char === "]") depth -= 1;
    if (char === ";" && depth <= 0) return index;
  }
  return text.length;
}

/** start 위치의 여는 괄호부터 짝이 맞는 닫는 괄호까지를 돌려준다. */
function blockFrom(text, start, open, close) {
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === open) depth += 1;
    if (text[index] === close) {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return text.slice(start);
}

/** 패턴(여는 중괄호로 끝난다) 뒤의 블록들을 돌려준다. */
function blocksAfter(text, pattern) {
  return [...text.matchAll(pattern)].map((match) =>
    blockFrom(text, match.index + match[0].length - 1, "{", "}"),
  );
}
