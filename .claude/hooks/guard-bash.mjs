// PreToolUse(Bash): 검증을 우회하는 명령과 사람이 실행해야 하는 명령을 막고, 서브에이전트가 쓸 수 있는 명령을 제한한다.
// Bash 권한 규칙은 명령 문자열을 대조하므로 `git commit -n` 이나 띄어쓰기가 다른 표기를 놓친다. 이 훅이 보완한다.
// 모든 우회를 막지는 못한다. 마지막 방어선은 커밋 전 검사와 CI 의 같은 검사다.
import { block, readInput } from "./lib.mjs";

const READ_ONLY_AGENTS = ["security-reviewer", "code-reviewer"];

const input = await readInput();
if (input === null) block("guard-bash: 입력을 해석하지 못했다. 다음: 같은 명령을 다시 시도한다.");

const agent = typeof input.agent_type === "string" ? input.agent_type : "";
const restricted = READ_ONLY_AGENTS.includes(agent);
const command = typeof input.tool_input?.command === "string" ? input.tool_input.command.trim() : "";
if (command === "") {
  if (restricted) block(`차단: ${agent} 의 명령을 해석하지 못했다.`);
  process.exit(0);
}

// 따옴표 안의 글자(커밋 메시지 등)는 판정에서 뺀다.
const bare = command.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""');

const BYPASS = [
  [/--no-verify\b/, "--no-verify"],
  [/\bgit\s+(?:-\S+\s+(?:[^-\s]\S*\s+)?)*commit\b[^;&|]*\s-[a-zA-Z]*n[a-zA-Z]*(\s|$)/, "git commit -n"],
  [/\bHUSKY=0\b/, "HUSKY=0"],
  [/core\.hooksPath/, "core.hooksPath"],
];
for (const [pattern, label] of BYPASS) {
  if (pattern.test(bare)) {
    block(`차단: ${label} — 커밋 전 검사를 건너뛰지 않는다.\n다음: 검사가 실패한 원인을 고친다. 고칠 수 없으면 실패 내용을 그대로 보고한다.`);
  }
}

// 원격 DB 와 배포에 닿는 명령은 사람이 실행한다.
const HUMAN_ONLY = [
  [/\bsupabase\b[^;&|]*\bdb\s+(push|reset)\b/, "supabase db push·reset", "사용자에게 실행을 요청한다: pnpm db:push"],
  [/\bpnpm\s+(run\s+)?db:push\b|\bdb-push\.mjs\b/, "pnpm db:push", "사용자에게 실행을 요청한다. 적용 대상은 사람이 확인한다."],
  [/\bsupabase\b[^;&|]*\s(link|unlink)\b/, "supabase link", "사용자에게 실행을 요청한다. 연결 대상을 바꾸는 것은 사람이 한다."],
  [/\bsupabase\b[^;&|]*\bmigration\s+(repair|squash)\b/, "supabase migration repair·squash", "적용 기록을 고치는 명령이다. 필요한 이유와 명령을 사용자에게 제시한다."],
  [/\bsupabase\b[^;&|]*\bsecrets\s+(set|unset)\b/, "supabase secrets", "비밀 값은 사용자가 넣는다. 변수 이름만 알려 준다."],
  [/\bsupabase\b[^;&|]*\bfunctions\s+(deploy|delete)\b/, "supabase functions deploy", "배포는 사용자가 한다. 명령만 제시한다."],
  [/\bvercel\b[^;&|]*\s(deploy|--prod|promote|rollback|env\s+(add|rm|pull))\b/, "vercel 배포·환경 변수", "배포와 환경 변수는 사용자가 한다. 명령만 제시한다."],
  [/\bgit\s+(?:-\S+\s+(?:[^-\s]\S*\s+)?)*push\b/, "git push", "push 는 사용자가 한다. 명령만 제시한다."],
];
for (const [pattern, label, next] of HUMAN_ONLY) {
  if (pattern.test(bare)) block(`차단: ${label} — 사람이 실행하는 명령이다.\n다음: ${next}`);
}

// 내려받은 코드를 바로 실행하는 명령은 이름이 정해진 도구만 지나간다. 지나간 명령은 권한 규칙(ask)이 사용자에게 묻는다.
// 이름이 한 글자만 달라도 다른 패키지다(예: shadcn 과 shadcn-ui).
const REMOTE_RUN = /(?:^|[\s;&|(])(pnpm\s+dlx|pnpx|npx|yarn\s+dlx|bunx)\s+((?:-\S+\s+)*)([^\s;&|]+)/g;
const REMOTE_ALLOWED = /^shadcn(@[\w.-]+)?$/;
for (const match of bare.matchAll(REMOTE_RUN)) {
  if (REMOTE_ALLOWED.test(match[3])) continue;
  block(
    `차단: ${match[1].replace(/\s+/g, " ")} ${match[3]} — 내려받은 코드를 바로 실행한다. 승인된 이름이 아니다.\n` +
      "다음: shadcn/ui 컴포넌트는 pnpm dlx shadcn@latest add 《이름》 을 쓴다. 설치된 도구는 pnpm exec 《도구》 로 실행한다. 그 밖의 도구는 이름·이유·공식 문서 주소를 제시하고 사용자가 실행하게 한다.",
  );
}
if (!restricted) process.exit(0);

// 아래는 읽기 전용 서브에이전트 전용이다. 해석하지 못하는 명령은 막는다.
if (/[;&|<>`$\n\\]/.test(command)) {
  block(`차단: ${agent} 는 명령을 잇거나 출력을 돌리지 않는다. 명령 하나만 실행한다.`);
}
const tokens = command.split(/\s+/);
const readOnlyGit =
  tokens[0] === "git" &&
  ["diff", "status", "log", "show"].includes(tokens[1] ?? "") &&
  !tokens.some((token) => /^(--output|--ext-diff|--textconv|--no-index)/.test(token));
if (readOnlyGit) process.exit(0);

block(`차단: ${agent} 의 Bash 는 git diff·status·log·show 만 쓴다. 파일은 Read·Grep·Glob 으로 읽는다.`);
