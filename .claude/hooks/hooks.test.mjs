// 훅 단위 테스트. 실행: node --test .claude/hooks/hooks.test.mjs
// 임시 폴더에 저장소와 워크트리를 만들어 훅을 실제로 실행하고 종료 코드를 확인한다.
// 훅이나 settings.json 을 고치면 반드시 다시 돌린다. git 이 필요하다. pnpm 이 없으면 Stop 훅 테스트는 건너뛴다.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const HOOKS = dirname(fileURLToPath(import.meta.url));
const ALLOW = 0;
const BLOCK = 2;

// 비밀 값처럼 생긴 시험용 문자열. 실제 키가 아니다. 이 파일에 한 줄로 적지 않도록 나눠 만든다.
const FAKE_SECRET_KEY = ["sb", "secret", "Zk3vQ9pLmN7xR2tYw8Ha"].join("_");
const jwt = (payload) =>
  [{ alg: "HS256", typ: "JWT" }, payload, { signature: "not-a-real-signature" }]
    .map((part) => Buffer.from(JSON.stringify(part)).toString("base64url"))
    .join(".");

let repo = "";
let worktree = "";

const git = (cwd, ...args) =>
  execFileSync("git", ["-C", cwd, "-c", "user.email=test@example.com", "-c", "user.name=test", ...args], { stdio: "pipe" });
const write = (path, content = "x\n") => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
};
const runHook = (name, input, env = {}) =>
  spawnSync("node", [join(HOOKS, name)], {
    input: JSON.stringify(input),
    encoding: "utf8",
    // CLAUDE_PROJECT_DIR 은 워크트리에 들어가도 메인 체크아웃에 머문다. 그 상태를 재현한다.
    env: { ...process.env, CLAUDE_PROJECT_DIR: repo, CLAUDE_SKIP_STOP_VERIFY: "", ...env },
  });
const edit = (file, extra = {}) => runHook("protect-paths.mjs", { tool_input: { file_path: file }, cwd: repo, ...extra }).status;
const bash = (command, extra = {}) => runHook("guard-bash.mjs", { tool_input: { command }, cwd: repo, ...extra }).status;
const secrets = (file, toolInput) =>
  runHook("guard-secrets.mjs", { tool_input: { file_path: join(repo, file), ...toolInput }, cwd: repo });

before(() => {
  repo = mkdtempSync(join(tmpdir(), "claude-hooks-"));
  git(repo, "init", "-q", "-b", "main");
  write(join(repo, "supabase/migrations/20260101000001_init_schema.sql"));
  write(join(repo, "supabase/migrations/20260102000001_pushed_not_committed.sql"));
  write(join(repo, "lib/supabase/database.types.ts"));
  write(join(repo, "app/(app)/requests/actions.ts"));
  write(join(repo, "test/db/support/supabase-shim.sql"));
  write(join(repo, ".claude/settings.json"), "{}\n");
  write(join(repo, ".gitignore"), "supabase/.pushed\nsupabase/.temp\nsupabase/migrations/20260102000001_pushed_not_committed.sql\n");
  git(repo, "add", "-A");
  git(repo, "commit", "-qm", "init");
  worktree = join(repo, ".claude/worktrees/t");
  git(repo, "worktree", "add", "-q", worktree, "-b", "wt-t");
  // 커밋 전에 push 한 파일: 적용 기록에만 있다.
  write(join(repo, "supabase/.pushed"), "20260101000001_init_schema.sql\n20260102000001_pushed_not_committed.sql\n");
});
after(() => rmSync(repo, { recursive: true, force: true }));

for (const place of ["메인 체크아웃", "워크트리"]) {
  describe(`protect-paths: ${place}`, () => {
    const base = () => (place === "워크트리" ? worktree : repo);

    it("생성된 DB 타입 수정을 막는다", () => assert.equal(edit(join(base(), "lib/supabase/database.types.ts")), BLOCK));
    it("커밋된 마이그레이션 수정을 막는다", () =>
      assert.equal(edit(join(base(), "supabase/migrations/20260101000001_init_schema.sql")), BLOCK));
    it("새 마이그레이션은 허용한다", () =>
      assert.equal(edit(join(base(), "supabase/migrations/20260201000001_add_requests_memo.sql")), ALLOW));
    it("보호 장치 설정 수정을 막는다", () => {
      assert.equal(edit(join(base(), ".claude/settings.json")), BLOCK);
      assert.equal(edit(join(base(), ".claude/hooks/lib.mjs")), BLOCK);
    });
    it("개인 설정 파일은 막지 않는다", () => assert.equal(edit(join(base(), ".claude/settings.local.json")), ALLOW));
    it("DB 테스트의 기반 수정을 막는다", () => {
      assert.equal(edit(join(base(), "test/db/support/supabase-shim.sql")), BLOCK);
      assert.equal(edit(join(base(), "test/db/support/structure.test.ts")), BLOCK);
    });
    it("직접 쓰는 DB 테스트는 허용한다", () => assert.equal(edit(join(base(), "test/db/requests.rls.test.ts")), ALLOW));
    it(".env 는 막고 .env.example 은 허용한다", () => {
      assert.equal(edit(join(base(), ".env")), BLOCK);
      assert.equal(edit(join(base(), ".env.local")), BLOCK);
      assert.equal(edit(join(base(), ".env.example")), ALLOW);
    });
    it("일반 소스 파일은 허용한다", () => {
      assert.equal(edit(join(base(), "app/(app)/requests/actions.ts")), ALLOW);
      assert.equal(edit(join(base(), "lib/supabase/server.ts")), ALLOW); // 확인(ask) 규칙이 맡는다
    });
    it("상대 경로는 cwd 기준으로 해석한다", () => assert.equal(edit("lib/supabase/database.types.ts", { cwd: base() }), BLOCK));
  });
}

describe("protect-paths: 그 밖의 입력", () => {
  it("커밋 전에 DB 에 적용한 마이그레이션 수정을 막는다", () =>
    assert.equal(edit(join(repo, "supabase/migrations/20260102000001_pushed_not_committed.sql")), BLOCK));
  it("차단 문구에 다음에 할 일이 있다", () => {
    const result = runHook("protect-paths.mjs", {
      tool_input: { file_path: join(repo, "supabase/migrations/20260101000001_init_schema.sql") },
      cwd: repo,
    });
    assert.match(result.stderr, /다음: .*migration new/);
  });
  it("Windows 경로의 생성물도 막는다", () => assert.equal(edit("C:\\repo\\lib\\supabase\\database.types.ts"), BLOCK));
  it("NotebookEdit 의 notebook_path 를 읽는다", () =>
    assert.equal(runHook("protect-paths.mjs", { tool_input: { notebook_path: join(repo, ".env") } }).status, BLOCK));
  it("해석하지 못하는 입력은 막는다", () =>
    assert.equal(spawnSync("node", [join(HOOKS, "protect-paths.mjs")], { input: "not json" }).status, BLOCK));
});

describe("protect-paths: 서브에이전트", () => {
  const as = (agent_type) => ({ agent_type });

  it("code-reviewer 는 어떤 파일도 쓰지 못한다", () => {
    assert.equal(edit(join(repo, "app/(app)/requests/actions.ts"), as("code-reviewer")), BLOCK);
    assert.equal(edit(join(repo, "docs/work/2026-09-30-review.md"), as("code-reviewer")), BLOCK);
  });
  it("security-reviewer 는 어떤 파일도 쓰지 못한다", () => {
    assert.equal(edit(join(repo, "app/(app)/requests/actions.ts"), as("security-reviewer")), BLOCK);
    assert.equal(edit(join(repo, "docs/review.md"), as("security-reviewer")), BLOCK);
  });
  it("다른 서브에이전트는 제한하지 않는다", () =>
    assert.equal(edit(join(repo, "app/(app)/requests/actions.ts"), as("Explore")), ALLOW));
});

describe("guard-secrets", () => {
  const status = (file, toolInput) => secrets(file, toolInput).status;

  it("secret 키의 값은 어느 파일에서든 막는다", () => {
    assert.equal(status("lib/supabase/admin.ts", { content: `const key = "${FAKE_SECRET_KEY}";` }), BLOCK);
    assert.equal(status("docs/setup.md", { content: `키: ${FAKE_SECRET_KEY}` }), BLOCK);
    assert.equal(status(".env.example", { content: `SUPABASE_SECRET_KEY=${FAKE_SECRET_KEY}` }), BLOCK);
  });
  it("문서의 예시 값은 막지 않는다", () => {
    assert.equal(status("docs/setup.md", { content: "SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxxxxxxxxx" }), ALLOW);
    assert.equal(status(".env.example", { content: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxx" }), ALLOW);
  });
  it("service_role 토큰은 막고 다른 토큰은 막지 않는다", () => {
    assert.equal(status("lib/x.ts", { content: `const t = "${jwt({ role: "service_role", iss: "supabase" })}";` }), BLOCK);
    assert.equal(status("test/fixtures/token.ts", { content: `const t = "${jwt({ role: "authenticated", sub: "u1" })}";` }), ALLOW);
  });
  it("앱 코드에서 secret 키 변수 이름을 막는다", () => {
    assert.equal(status("app/(app)/admin/actions.ts", { new_string: "process.env.SUPABASE_SECRET_KEY" }), BLOCK);
    assert.equal(status("lib/supabase/server.ts", { new_string: "process.env.SUPABASE_SERVICE_ROLE_KEY!" }), BLOCK);
    assert.equal(status("components/user-table.tsx", { new_string: "process.env.SUPABASE_SECRET_KEY" }), BLOCK);
  });
  it("관리자 클라이언트 파일에서는 변수 이름을 허용한다", () =>
    assert.equal(status("lib/supabase/admin.ts", { content: "process.env.SUPABASE_SECRET_KEY" }), ALLOW));
  it("NEXT_PUBLIC_ 으로 시작하는 secret 변수는 관리자 클라이언트에서도 막는다", () =>
    assert.equal(status("lib/supabase/admin.ts", { content: "process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY" }), BLOCK));
  it("문서·예시·스크립트의 변수 이름은 막지 않는다", () => {
    assert.equal(status("docs/setup.md", { content: "SUPABASE_SECRET_KEY 는 서버에서만 쓴다" }), ALLOW);
    assert.equal(status(".env.example", { content: "SUPABASE_SECRET_KEY=" }), ALLOW);
    assert.equal(status("scripts/check-extensions.mjs", { content: "/SUPABASE_\\w*SECRET/" }), ALLOW);
  });
  it("publishable 키와 일반 코드는 허용한다", () => {
    assert.equal(status("lib/supabase/client.ts", { content: "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!" }), ALLOW);
    assert.equal(status("app/(app)/requests/actions.ts", { new_string: "await supabase.auth.getClaims()" }), ALLOW);
  });
  it("NotebookEdit 과 여러 조각 수정의 내용도 본다", () => {
    assert.equal(status("notes.ipynb", { new_source: FAKE_SECRET_KEY }), BLOCK);
    assert.equal(status("lib/x.ts", { edits: [{ new_string: "ok" }, { new_string: FAKE_SECRET_KEY }] }), BLOCK);
  });
  it("내용이 없으면 판단하지 않는다", () => assert.equal(status("lib/x.ts", {}), ALLOW));
  it("차단 문구에 다음에 할 일이 있다", () =>
    assert.match(secrets("app/x/actions.ts", { new_string: "SUPABASE_SECRET_KEY" }).stderr, /다음: .*add-extension admin-api/));
});

describe("guard-bash: 검증 우회", () => {
  it("--no-verify 를 막는다", () => assert.equal(bash('git commit --no-verify -m "x"'), BLOCK));
  it("git commit -n 을 막는다", () => {
    assert.equal(bash('git commit -n -m "x"'), BLOCK);
    assert.equal(bash('git commit -anm "x"'), BLOCK);
  });
  it("HUSKY=0 과 core.hooksPath 를 막는다", () => {
    assert.equal(bash('HUSKY=0 git commit -m "x"'), BLOCK);
    assert.equal(bash('git -c core.hooksPath=/dev/null commit -m "x"'), BLOCK);
  });
  it("일반 커밋은 허용한다", () => {
    assert.equal(bash('git commit -m "feat(requests): 승인 추가"'), ALLOW);
    assert.equal(bash("git commit --amend --no-edit"), ALLOW);
  });
  it("커밋 메시지 안의 글자는 판정하지 않는다", () => {
    assert.equal(bash('git commit -m "docs: --no-verify 금지 설명"'), ALLOW);
    assert.equal(bash('git commit -m "docs: supabase db push 는 사람이 한다"'), ALLOW);
  });
  it("git log -n 은 허용한다", () => assert.equal(bash("git log -n 5"), ALLOW));
});

describe("guard-bash: 사람이 실행하는 명령", () => {
  it("원격 DB 에 적용하는 명령을 막는다", () => {
    assert.equal(bash("pnpm supabase db push"), BLOCK);
    assert.equal(bash("npx supabase  db   push --include-all"), BLOCK);
    assert.equal(bash("supabase --workdir . db reset --linked"), BLOCK);
    assert.equal(bash("pnpm db:push"), BLOCK);
    assert.equal(bash("pnpm supabase config push --project-ref abc"), BLOCK);
    assert.equal(bash("pnpm supabase config diff --project-ref abc"), ALLOW);
    assert.equal(bash("pnpm run db:push"), BLOCK);
    assert.equal(bash("DB_PUSH_TEST=1 node scripts/db-push.mjs --prod"), BLOCK);
  });
  it("연결 대상과 적용 기록을 바꾸는 명령을 막는다", () => {
    assert.equal(bash("pnpm supabase link --project-ref abcd"), BLOCK);
    assert.equal(bash("pnpm supabase migration repair --status reverted 20260101000001"), BLOCK);
    assert.equal(bash("pnpm supabase secrets set KEY=value"), BLOCK);
    assert.equal(bash("pnpm supabase functions deploy notify"), BLOCK);
  });
  it("배포와 push 를 막는다", () => {
    assert.equal(bash("vercel --prod"), BLOCK);
    assert.equal(bash("pnpm dlx vercel deploy"), BLOCK);
    assert.equal(bash("git push origin main"), BLOCK);
    assert.equal(bash("git -C . push"), BLOCK);
  });
  it("차단 문구에 다음에 할 일이 있다", () =>
    assert.match(runHook("guard-bash.mjs", { tool_input: { command: "pnpm supabase db push" } }).stderr, /다음: .*pnpm db:push/));
  it("로컬에서 끝나는 명령은 허용한다", () => {
    assert.equal(bash("pnpm supabase migration new add_requests_memo"), ALLOW);
    assert.equal(bash("pnpm supabase migration list"), ALLOW);
    assert.equal(bash("pnpm db:types"), ALLOW);
    assert.equal(bash("pnpm verify"), ALLOW);
    assert.equal(bash("git status"), ALLOW);
    assert.equal(bash("pnpm report:scale"), ALLOW);
  });
});

describe("guard-bash: 내려받아 실행하는 명령", () => {
  it("승인되지 않은 이름을 막는다", () => {
    assert.equal(bash("pnpm dlx shadcn-ui@latest add dialog --yes"), BLOCK);
    assert.equal(bash("cd app && pnpm dlx create-something"), BLOCK);
    assert.equal(bash("npx --yes some-tool init"), BLOCK);
    assert.equal(bash("npx tsc --noEmit"), BLOCK);
  });
  it("막을 때 다음 할 일을 알려 준다", () =>
    assert.match(
      runHook("guard-bash.mjs", { tool_input: { command: "pnpm dlx shadcn-ui@latest add dialog" } }).stderr,
      /다음: .*pnpm dlx shadcn@latest add/,
    ));
  it("shadcn 과 설치된 도구는 지나간다", () => {
    assert.equal(bash("pnpm dlx shadcn@latest add dialog"), ALLOW);
    assert.equal(bash("pnpm dlx shadcn@4.21.0 add dialog skeleton"), ALLOW);
    assert.equal(bash("pnpm exec tsc --noEmit"), ALLOW);
    assert.equal(bash('git commit -m "npx 를 쓰지 않는다"'), ALLOW);
  });
});

describe("guard-bash: 서브에이전트", () => {
  const reviewer = { agent_type: "security-reviewer" };

  it("code-reviewer 도 읽기 전용 git 만 쓴다", () => {
    const codeReviewer = { agent_type: "code-reviewer" };
    assert.equal(bash("git diff main...HEAD --stat", codeReviewer), ALLOW);
    assert.equal(bash("pnpm verify", codeReviewer), BLOCK);
    assert.equal(bash("git status; rm x", codeReviewer), BLOCK);
  });
  it("security-reviewer 는 읽기 전용 git 만 쓴다", () => {
    assert.equal(bash("git diff", reviewer), ALLOW);
    assert.equal(bash("git diff main...HEAD -- app", reviewer), ALLOW);
    assert.equal(bash("git log --oneline -n 20", reviewer), ALLOW);
    assert.equal(bash("git status", reviewer), ALLOW);
  });
  it("security-reviewer 의 쓰기·실행 명령을 막는다", () => {
    assert.equal(bash("git checkout -- .", reviewer), BLOCK);
    assert.equal(bash("pnpm add lodash", reviewer), BLOCK);
    assert.equal(bash("cat .env.local", reviewer), BLOCK);
  });
  it("security-reviewer 의 우회 시도를 막는다", () => {
    assert.equal(bash("git diff --output=/tmp/x", reviewer), BLOCK);
    assert.equal(bash("git status; rm -rf app", reviewer), BLOCK);
    assert.equal(bash("git diff > out.txt", reviewer), BLOCK);
    assert.equal(bash("git log $(rm x)", reviewer), BLOCK);
    assert.equal(bash("git -c core.pager=less diff", reviewer), BLOCK);
  });
  it("명령이 비어 있으면 서브에이전트는 막는다", () => {
    assert.equal(runHook("guard-bash.mjs", { tool_input: {}, ...reviewer }).status, BLOCK);
    assert.equal(runHook("guard-bash.mjs", { tool_input: {} }).status, ALLOW);
  });
});

describe("format-edited", { skip: process.platform === "win32" }, () => {
  const fakeBin = (dir, name, exitCode) => {
    const path = join(dir, "node_modules/.bin", name);
    write(path, `#!/bin/sh\necho "${name} ran in $(pwd)"\nexit ${exitCode}\n`);
    execFileSync("chmod", ["+x", path]);
  };
  const format = (file) => runHook("format-edited.mjs", { tool_input: { file_path: file }, cwd: repo });

  it("린터가 없으면 건너뛰고 알린다", () => {
    const result = format(join(repo, "app/(app)/requests/actions.ts"));
    assert.equal(result.status, ALLOW);
    assert.match(result.stderr, /건너뛰었다/);
  });
  it("워크트리의 파일은 워크트리의 도구로 검사한다", () => {
    fakeBin(worktree, "eslint", 1);
    const result = format(join(worktree, "app/(app)/requests/actions.ts"));
    assert.equal(result.status, BLOCK);
    assert.match(result.stderr, /worktrees\/t/);
  });
  it("생성물과 ts 가 아닌 파일은 건너뛴다", () => {
    assert.equal(format(join(worktree, "lib/supabase/database.types.ts")).stderr, "");
    assert.equal(format(join(worktree, "supabase/migrations/20260101000001_init_schema.sql")).stderr, "");
  });
});

describe("session-start", () => {
  const start = (cwd) => runHook("session-start.mjs", { cwd });
  let project = "";

  before(() => {
    project = mkdtempSync(join(tmpdir(), "claude-start-"));
    git(project, "init", "-q");
    write(join(project, "package.json"), "{}\n");
    write(join(project, ".env.example"), "NEXT_PUBLIC_SUPABASE_URL=\n");
    write(join(project, "supabase/migrations/20260101000001_init_schema.sql"));
  });
  after(() => rmSync(project, { recursive: true, force: true }));

  it("package.json 이 없으면 아무것도 출력하지 않는다", () => assert.equal(start(repo).stdout, ""));
  it("빠진 것이 있으면 알린다", () => {
    const result = start(project);
    assert.equal(result.status, ALLOW);
    assert.match(result.stdout, /node_modules/);
    assert.match(result.stdout, /\.env\.local/);
    assert.match(result.stdout, /db:types/);
  });
  it("다 갖추면 아무것도 출력하지 않는다", () => {
    mkdirSync(join(project, "node_modules"));
    write(join(project, ".env.local"), "NEXT_PUBLIC_SUPABASE_URL=https://dev.supabase.co\n");
    write(join(project, "lib/supabase/database.types.ts"));
    assert.match(start(project).stdout, /커밋 전 검사\(\.husky\/pre-commit, \.husky\/commit-msg\)가 없다/);
    write(join(project, ".husky/pre-commit"), "pnpm run verify:quick\n");
    write(join(project, ".husky/commit-msg"), 'node scripts/check-commit.mjs --file "$1" --branch\n');
    assert.equal(start(project).stdout, "");
  });
  it("운영 프로젝트에 연결돼 있으면 알린다", () => {
    write(join(project, "supabase/project-refs.json"), JSON.stringify({ dev: { ref: "devrefdevrefdevrefde", name: "tool-dev" }, prod: { ref: "prodrefprodrefprodre", name: "tool-prod" } }));
    write(join(project, "supabase/.temp/project-ref"), "devrefdevrefdevrefde\n");
    assert.equal(start(project).stdout, "");
    write(join(project, "supabase/.temp/project-ref"), "prodrefprodrefprodre\n");
    assert.match(start(project).stdout, /운영/);
    write(join(project, "supabase/.temp/project-ref"), "devrefdevrefdevrefde\n");
  });
  it("Supabase MCP 가 읽기 전용이 아니거나 운영을 가리키면 알린다", () => {
    const mcp = (url) => write(join(project, ".mcp.json"), JSON.stringify({ mcpServers: { supabase: { url } } }));
    mcp("https://mcp.supabase.com/mcp?project_ref=devrefdevrefdevrefde&read_only=true");
    assert.equal(start(project).stdout, "");
    mcp("https://mcp.supabase.com/mcp?project_ref=devrefdevrefdevrefde");
    assert.match(start(project).stdout, /read_only=true/);
    mcp("https://mcp.supabase.com/mcp?project_ref=prodrefprodrefprodre&read_only=true");
    assert.match(start(project).stdout, /운영/);
    mcp("https://mcp.supabase.com/mcp?project_ref=devrefdevrefdevrefde&read_only=true");
  });
  it("끝나지 않은 작업 기록이 있으면 알린다", () => {
    const record = (name, status, title) =>
      write(join(project, `docs/work/${name}.md`), `# ${title}\n\n- 날짜: 2026-09-30\n- 상태: ${status}\n- 요청: 요청\n`);
    write(join(project, "docs/work/_template.md"), "# 《제목》\n\n- 상태: 진행 중\n");
    record("2026-09-29-지난-작업", "완료", "지난 작업");
    assert.equal(start(project).stdout, "");
    record("2026-09-30-신청-목록-검색", "진행 중", "신청 목록 검색");
    const result = start(project);
    assert.match(result.stdout, /끝나지 않은 작업/);
    assert.match(result.stdout, /docs\/work\/2026-09-30-신청-목록-검색\.md — 신청 목록 검색/);
    assert.doesNotMatch(result.stdout, /지난-작업|_template/);
  });
});

describe("verify-on-stop", { skip: spawnSync("pnpm", ["--version"]).status !== 0 }, () => {
  let project = "";
  const stop = (extra = {}, env = {}) => runHook("verify-on-stop.mjs", { cwd: project, ...extra }, env);
  const scripts = (body) => write(join(project, "package.json"), JSON.stringify({ name: "fixture", scripts: body }));

  before(() => {
    project = mkdtempSync(join(tmpdir(), "claude-stop-"));
    git(project, "init", "-q");
    mkdirSync(join(project, "node_modules"));
    write(join(project, ".gitignore"), "node_modules\n");
    scripts({});
    git(project, "add", "-A");
    git(project, "commit", "-qm", "init");
  });
  after(() => rmSync(project, { recursive: true, force: true }));

  it("verify:quick 이 없으면 통과한다", () => {
    write(join(project, "app/a.ts"));
    assert.equal(stop().status, ALLOW);
  });
  it("실패하면 한 번 막는다", () => {
    scripts({ "verify:quick": "node -e \"console.error('TS2322 타입 오류'); process.exit(1)\"" });
    const result = stop();
    assert.equal(result.status, BLOCK);
    assert.match(result.stderr, /TS2322/);
    assert.equal(stop({ stop_hook_active: true }).status, ALLOW);
  });
  it("계획 모드와 끄기 변수에서는 통과한다", () => {
    assert.equal(stop({ permission_mode: "plan" }).status, ALLOW);
    assert.equal(stop({}, { CLAUDE_SKIP_STOP_VERIFY: "1" }).status, ALLOW);
  });
  it("통과한 뒤 같은 상태면 다시 돌리지 않는다", () => {
    const marker = join(project, "ran.log");
    scripts({ "verify:quick": `node -e "require('fs').appendFileSync('${marker.replaceAll("\\", "/")}', 'x')"` });
    assert.equal(stop().status, ALLOW);
    assert.equal(stop().status, ALLOW);
    assert.equal(execFileSync("cat", [marker], { encoding: "utf8" }), "x");

    write(join(project, "app/a.ts"), "changed\n");
    assert.equal(stop().status, ALLOW);
    assert.equal(execFileSync("cat", [marker], { encoding: "utf8" }), "xx");
  });
  it("검증 명령의 정의가 바뀌면 같은 파일이라도 다시 돌린다", () => {
    scripts({ "verify:quick": "node -e \"process.exit(0)\"" });
    assert.equal(stop().status, ALLOW);
    scripts({ "verify:quick": "node -e \"process.exit(1)\"" });
    assert.equal(stop().status, BLOCK);
  });
  it("마이그레이션만 바뀌어도 돌린다", () => {
    git(project, "add", "-A");
    git(project, "commit", "-qm", "work");
    scripts({ "verify:quick": "node -e \"process.exit(1)\"" });
    assert.equal(stop().status, ALLOW); // 바뀐 것은 package.json 뿐이다
    write(join(project, "supabase/migrations/20260201000001_add_x.sql"));
    assert.equal(stop().status, BLOCK);
  });
});
