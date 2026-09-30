// 훅 공용 함수.
// 저장소 루트를 기준으로 상대 경로를 만들지 않는다. CLAUDE_PROJECT_DIR 은 워크트리에 들어가도 메인 체크아웃에 머물기 때문이다.
// 보호 대상은 절대 경로의 구간(예: /frontend/generated/)으로 판정한다. 메인 체크아웃, 워크트리, Windows 경로에서 결과가 같다.
import { existsSync } from "node:fs";
import { posix } from "node:path";

/** 표준 입력의 JSON 을 읽는다. 해석하지 못하면 null. */
export async function readInput() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** 역슬래시를 슬래시로 바꾸고 `.`·`..` 구간을 정리한다. */
export function normalizePath(path) {
  return posix.normalize(String(path).replaceAll("\\", "/"));
}

/** 도구 입력에서 대상 파일의 절대 경로를 구한다. 없으면 빈 문자열. */
export function targetPath(input) {
  const toolInput = input?.tool_input ?? {};
  const raw = toolInput.file_path ?? toolInput.notebook_path ?? ""; // NotebookEdit 은 notebook_path
  if (typeof raw !== "string" || raw === "") return "";
  const file = normalizePath(raw);
  if (file.startsWith("/") || /^[A-Za-z]:\//.test(file)) return file;
  const cwd = normalizePath(input?.cwd ?? process.cwd());
  return posix.normalize(`${cwd}/${file}`);
}

/** 경로에 구간이 들어 있는지 본다. 구간은 `/a/b/` 형태로 준다. */
export function hasSegment(path, segment) {
  return `/${path}`.replaceAll("//", "/").includes(segment);
}

/** start 에서 위로 올라가며 predicate 를 만족하는 첫 폴더를 찾는다. 없으면 빈 문자열. */
export function findUp(start, predicate) {
  let dir = normalizePath(start);
  for (let depth = 0; depth < 64; depth += 1) {
    if (predicate(dir)) return dir;
    const parent = posix.dirname(dir);
    if (parent === dir) return "";
    dir = parent;
  }
  return "";
}

/** 작업 트리의 최상위(메인 체크아웃 또는 워크트리)를 찾는다. 워크트리의 `.git` 은 파일이다. */
export function findWorkTreeRoot(start) {
  return findUp(start, (dir) => existsSync(`${dir}/.git`));
}

/** 테스트 파일·테스트 도우미인지 본다. 테스트 설정 파일은 테스트 파일이 아니다. */
export function isTestPath(path) {
  const base = posix.basename(path);
  if (/^(vitest|playwright|stryker)[\w.-]*\.config\.[cm]?[jt]s$/.test(base)) return false;
  if (/\.(spec|test)\.tsx?$/.test(base)) return true;
  return ["/e2e/", "/test/", "/tests/", "/__tests__/"].some((segment) => hasSegment(path, segment));
}

/** 종료 코드 2 로 막는다. 표준 오류는 Claude 에게 전달된다. */
export function block(message) {
  console.error(message);
  process.exit(2);
}
