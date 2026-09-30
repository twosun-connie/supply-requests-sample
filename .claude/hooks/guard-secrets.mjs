// PreToolUse(Edit|Write|NotebookEdit): 쓰려는 내용에 비밀 값이 들어 있으면 막는다.
// 검사하는 것은 두 가지뿐이다. (1) 비밀 값의 형태 — 모든 파일. (2) secret 키 환경 변수 이름 — 앱 코드.
// Edit 의 new_string 은 조각이라 문맥(use client 여부 등)을 볼 수 없다. 문맥이 필요한 검사는 ESLint 가 맡는다.
import { block, hasSegment, readInput, targetPath } from "./lib.mjs";

const ADMIN_CLIENT = "/lib/supabase/admin.ts"; // secret 키를 읽어도 되는 유일한 파일(admin-api 확장)
const APP_SEGMENTS = ["/app/", "/lib/", "/components/", "/features/"];
const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const input = await readInput();
if (input === null) block("guard-secrets: 입력을 해석하지 못했다. 다음: 같은 수정을 다시 시도한다.");

const file = targetPath(input);
const text = contentOf(input.tool_input ?? {});
if (text === "") process.exit(0);

const secretKey = text.match(/sb_secret_[A-Za-z0-9_-]{16,}/g)?.find((value) => !isPlaceholder(value));
if (secretKey !== undefined) {
  block(
    `차단: ${file} — Supabase secret 키의 값이 들어 있다.\n다음: 값을 지운다. 사용자에게 이 키가 노출됐으니 대시보드에서 새로 발급하라고 알린다.`,
  );
}
if (hasServiceRoleToken(text)) {
  block(
    `차단: ${file} — service_role 토큰의 값이 들어 있다.\n다음: 값을 지운다. 사용자에게 이 키가 노출됐으니 대시보드에서 새로 발급하라고 알린다.`,
  );
}

const isAppCode = CODE_FILE.test(file) && (APP_SEGMENTS.some((segment) => hasSegment(file, segment)) || /\/proxy\.ts$/.test(file));
if (isAppCode) {
  if (/NEXT_PUBLIC_\w*(SECRET|SERVICE_ROLE)\w*/.test(text)) {
    block(
      `차단: ${file} — NEXT_PUBLIC_ 으로 시작하는 변수는 브라우저에 그대로 노출된다. secret 키에 쓰지 않는다.\n다음: 변수 이름에서 NEXT_PUBLIC_ 을 빼고 서버 전용 파일에서만 읽는다.`,
    );
  }
  if (!file.endsWith(ADMIN_CLIENT) && /\bSUPABASE_\w*(SECRET|SERVICE_ROLE)\w*/.test(text)) {
    block(
      `차단: ${file} — secret 키는 lib/supabase/admin.ts 한 곳에서만 읽는다.\n다음: 관리자 기능이 필요하면 /add-extension admin-api 로 시작한다. 그렇지 않으면 lib/supabase/server.ts 의 클라이언트를 쓴다.`,
    );
  }
}
process.exit(0);

/** 도구 입력에서 새로 쓰는 글자를 모은다. Write=content, Edit=new_string, NotebookEdit=new_source. */
function contentOf(toolInput) {
  const parts = [toolInput.content, toolInput.new_string, toolInput.new_source];
  if (Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) parts.push(edit?.new_string);
  }
  return parts.filter((part) => typeof part === "string").join("\n");
}

/** 문서의 예시 값(xxxx, 《…》)은 비밀 값이 아니다. */
function isPlaceholder(value) {
  const body = value.slice("sb_secret_".length);
  return /^(.)\1+$/.test(body) || /^[xX_-]+$/.test(body);
}

/** JWT 형태의 값 가운데 role 이 service_role 인 것이 있는지 본다. */
function hasServiceRoleToken(value) {
  const tokens = value.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) ?? [];
  return tokens.some((token) => {
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
      return payload?.role === "service_role";
    } catch {
      return false;
    }
  });
}
