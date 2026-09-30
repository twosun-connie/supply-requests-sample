// 커밋 메시지, 브랜치 이름, PR 제목·본문의 형식을 검사한다.
// 형식은 Conventional Commits 1.0.0(https://www.conventionalcommits.org/ko/v1.0.0/)이다. 규칙의 원본은 .claude/rules/git.md.
// 실행
//   node scripts/check-commit.mjs --file 《메시지 파일》 --branch   커밋할 때(.husky/commit-msg)
//   node scripts/check-commit.mjs --message "《메시지》"            손으로 확인할 때(pnpm check:commit)
//   node scripts/check-commit.mjs --pr                             PR 에서(.github/workflows/pr-format.yml).
//     PR_TITLE, PR_BODY, PR_AUTHOR, PR_BRANCH 환경 변수를 읽는다.
import { execFileSync } from "node:child_process";
import { finish, readText } from "./lib.mjs";

const TYPES = {
  feat: "새 기능(사용자가 할 수 있는 일이 늘어난다)",
  fix: "결함 수정",
  docs: "문서만",
  style: "동작이 같은 모양 변경(포맷, 세미콜론)",
  refactor: "동작이 같은 구조 변경",
  perf: "성능 개선",
  test: "테스트만",
  build: "빌드·의존성(package.json, 잠금 파일)",
  ci: "CI 설정(.github/)",
  chore: "그 밖의 잡일(설정, 템플릿 반영)",
  revert: "되돌리기",
};
const TYPE_NAMES = Object.keys(TYPES);
const MAX_HEADER = 72;
const MAX_BODY_LINE = 100;
const HEADER = new RegExp(
  `^(${TYPE_NAMES.join("|")})(\\(([^)]*)\\))?(!)?: (.*)$`,
);
const SCOPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** git 이 스스로 만드는 메시지. 형식을 요구하지 않는다. */
const GENERATED = /^(Merge |Revert "|fixup! |squash! |amend! |Initial commit)/;
/** 무엇을 했는지 말하지 않는 요약. */
const VAGUE =
  /^(수정|변경|업데이트|작업|테스트|반영|수정함|버그 수정|오류 수정|코드 수정|fix|fixes|update|updates|wip|test|temp|tmp|changes?)$/i;
const BRANCH = new RegExp(
  `^(${TYPE_NAMES.join("|")}|hotfix|release)/[a-z0-9]+(?:[-.][a-z0-9]+)*$`,
);
/** 형식을 요구하지 않는 브랜치: 기본 브랜치, 도구가 만든 브랜치. */
const BRANCH_EXEMPT =
  /^(main|master|develop|dev|staging|HEAD)$|^(dependabot|renovate|worktree|claude)[-/]/;
const PR_SECTIONS = [
  "무엇을, 왜",
  "확인 방법",
  "검증",
  "DB 변경",
  "하지 않은 것과 남은 것",
];
const EXAMPLE =
  "feat(requests): 신청 상세에 승인·반려 버튼 추가  /  fix(auth): 공개 경로를 경로 단위로 판정";

const args = process.argv.slice(2);
const valueOf = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};
const problems = [];
const notices = [];
const add = (where, what, next) => problems.push({ where, what, next });

if (args.includes("--pr")) {
  checkPullRequest();
} else {
  const file = valueOf("--file");
  const message =
    file !== undefined ? readText(file) : (valueOf("--message") ?? "");
  if (file !== undefined || args.includes("--message")) {
    checkMessage(cleanMessage(message), "커밋 메시지");
  }
  if (args.includes("--branch")) {
    const branch = currentBranch();
    if (branch !== "") checkBranch(branch, true);
  }
}
finish("커밋·PR 형식 검사", problems, notices);

/** git 이 넣은 안내 줄(# …)과 가위표 아래(커밋 -v 의 diff)를 지운다. */
function cleanMessage(message) {
  const lines = [];
  for (const line of message.split(/\r?\n/)) {
    if (/^# -+ >8 -+/.test(line)) break;
    if (line.startsWith("#")) continue;
    lines.push(line);
  }
  return lines.join("\n").trim();
}

function checkMessage(message, where) {
  const lines = message.split("\n");
  const header = lines[0] ?? "";
  if (GENERATED.test(header)) return;
  if (!checkHeader(header, where)) return;
  if (lines.length > 1 && lines[1].trim() !== "") {
    add(
      where,
      "제목과 본문 사이에 빈 줄이 없다.",
      "둘째 줄을 비운다. git 과 GitHub 가 첫 줄만 제목으로 읽는다",
    );
  }
  lines.slice(2).forEach((line, index) => {
    if ([...line].length > MAX_BODY_LINE && !/:\/\//.test(line)) {
      add(
        `${where} ${index + 3}번째 줄`,
        `본문 한 줄이 ${MAX_BODY_LINE}자를 넘는다(${[...line].length}자).`,
        "문장 단위로 줄을 바꾼다. 본문에는 무엇을·왜 바꿨는지를 쓴다. 어떻게는 코드가 말한다",
      );
    }
  });
}

/** 제목 줄을 본다. 형식이 맞으면 true. */
function checkHeader(header, where) {
  const match = header.match(HEADER);
  if (match === null) {
    add(
      where,
      `제목이 「종류(범위): 요약」 형식이 아니다: ${header.slice(0, 60) || "(빈 메시지)"}`,
      `종류는 ${TYPE_NAMES.join("·")} 가운데 하나. 범위는 생략할 수 있다. 콜론 뒤에 한 칸을 띄운다. 예: ${EXAMPLE}`,
    );
    return false;
  }
  const [, type, , scope, , subject] = match;
  if (scope !== undefined && !SCOPE.test(scope)) {
    add(
      where,
      `범위가 kebab-case 가 아니다: (${scope})`,
      "화면·영역 이름을 소문자와 - 로 쓴다(예: requests, admin-users, auth, db, ui, deps). 여러 곳이면 범위를 생략한다",
    );
  }
  if ([...header].length > MAX_HEADER) {
    add(
      where,
      `제목이 ${MAX_HEADER}자를 넘는다(${[...header].length}자).`,
      "요약은 한 줄로 줄이고 나머지는 본문에 쓴다. 50자 안쪽이 읽기 좋다",
    );
  }
  const summary = subject.trim();
  if (subject !== summary || summary === "") {
    add(
      where,
      "요약이 비었거나 앞뒤에 공백이 있다.",
      `콜론 뒤에 한 칸, 그 뒤에 요약을 쓴다. 예: ${EXAMPLE}`,
    );
  } else if (/[.。!]$/.test(summary)) {
    add(where, "요약이 마침표로 끝난다.", "제목에는 마침표를 찍지 않는다");
  } else if (VAGUE.test(summary) || [...summary].length < 5) {
    add(
      where,
      `요약이 무엇을 했는지 말하지 않는다: ${summary}`,
      `무엇이 달라지는지를 쓴다(「${type === "fix" ? "없는 신청을 열면 오류 화면이 뜨던 것을 고침" : "신청 목록에 상태 필터 추가"}」). 「수정」「변경」만 쓰지 않는다`,
    );
  }
  return true;
}

function checkBranch(branch, blocking) {
  if (BRANCH_EXEMPT.test(branch) || BRANCH.test(branch)) return;
  const entry = {
    where: `브랜치 ${branch}`,
    what: "브랜치 이름이 「종류/짧은-이름」 형식이 아니다.",
    next: `${blocking ? "git branch -m 《종류》/《짧은-이름》 으로 바꾼다" : "열린 PR 의 브랜치는 바꾸지 않는다(바꾸면 PR 이 닫힌다). 다음 브랜치부터 맞춘다"}(예: feat/request-detail, fix/login-redirect). 종류는 ${TYPE_NAMES.join("·")}·hotfix·release`,
  };
  if (blocking) problems.push(entry);
  else notices.push(entry);
}

function currentBranch() {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function checkPullRequest() {
  const author = process.env.PR_AUTHOR ?? "";
  // 도구가 만든 PR(Dependabot 등)은 형식을 요구하지 않는다.
  if (/\[bot\]$/.test(author)) return;
  const title = (process.env.PR_TITLE ?? "").trim();
  const body = (process.env.PR_BODY ?? "").replace(/<!--[\s\S]*?-->/g, "");
  const branch = (process.env.PR_BRANCH ?? "").trim();

  // 합칠 때(squash) PR 제목이 main 의 커밋 제목이 된다. 그래서 커밋과 같은 형식으로 본다.
  checkHeader(title, "PR 제목");
  // 이미 열린 PR 의 브랜치 이름은 바꿀 수 없다(바꾸면 PR 이 닫힌다). 알리기만 한다.
  if (branch !== "") checkBranch(branch, false);

  const sections = sectionsOf(body);
  for (const name of PR_SECTIONS) {
    const content = sections.get(name);
    if (content === undefined) {
      add(
        "PR 본문",
        `「## ${name}」 절이 없다.`,
        ".github/pull_request_template.md 의 양식을 지우지 않고 채운다. 해당 없으면 「없음」이라고 쓴다",
      );
    } else if (content.trim() === "") {
      add(
        "PR 본문",
        `「## ${name}」 절이 비어 있다.`,
        "내용을 쓴다. 해당 없으면 「없음」이라고 쓴다",
      );
    }
  }
  if (/《[^》]*》/.test(body)) {
    add(
      "PR 본문",
      "채우지 않은 자리(《…》)가 남아 있다.",
      "자리마다 실제 내용을 쓰거나 그 줄을 지운다",
    );
  }
}

/** 본문을 「## 제목」 단위로 나눈다. */
function sectionsOf(body) {
  const sections = new Map();
  let current = null;
  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading !== null) {
      current = heading[1];
      sections.set(current, "");
    } else if (current !== null) {
      sections.set(current, `${sections.get(current)}${line}\n`);
    }
  }
  return sections;
}
