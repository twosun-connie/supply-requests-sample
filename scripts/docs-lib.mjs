// 작업 기록(docs/work)과 결정 기록(docs/decisions)을 읽는 공용 함수. check-docs, new-doc, report-docs 가 같이 쓴다.
// 양식의 절 제목과 상태 값은 여기가 원본이다. docs/work/_template.md, docs/decisions/_template.md 와 같아야 한다.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, readText } from "./lib.mjs";

export const WORK_DIR = "docs/work";
export const DECISION_DIR = "docs/decisions";
export const RECORD_NAME =
  /^\d{4}-\d{2}-\d{2}-[a-z0-9가-힣][a-z0-9가-힣-]*\.md$/;

export const KINDS = {
  work: {
    dir: WORK_DIR,
    label: "작업 기록",
    statuses: ["진행 중", "완료", "중단"],
    closed: ["완료", "중단"],
    meta: ["날짜", "상태", "요청"],
    sections: [
      "계획",
      "결정",
      "한 일",
      "검증",
      "하지 않은 것",
      "사람이 할 일",
      "다음에 막을 것",
    ],
    // 끝낸 기록에서 비어 있으면 안 되는 절. 나머지는 "없음"이라고 적는다.
    filled: ["계획", "한 일", "검증", "하지 않은 것"],
  },
  decision: {
    dir: DECISION_DIR,
    label: "결정 기록",
    statuses: ["제안", "확정", "폐기"],
    closed: ["확정", "폐기"],
    meta: ["날짜", "상태", "정한 사람"],
    sections: ["배경", "선택지", "결정", "영향"],
    filled: ["배경", "선택지", "결정", "영향"],
  },
};

/** 폴더의 기록 파일 이름을 날짜순으로 돌려준다. 밑줄로 시작하는 파일(양식)과 README 는 뺀다. */
export function recordNames(kind) {
  const dir = join(ROOT, KINDS[kind].dir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(
      (name) =>
        name.endsWith(".md") && !name.startsWith("_") && name !== "README.md",
    )
    .sort();
}

/** 기록 하나를 제목, 머리 항목, 절로 나눈다. */
export function parseRecord(text) {
  const body = text.replace(/\r\n/g, "\n");
  const title = body.match(/^# +(.+)$/m)?.[1]?.trim() ?? "";
  const head = body.split(/^## /m)[0];
  const meta = {};
  for (const match of head.matchAll(/^- +([^:\n]+?) *: *(.*)$/gm)) {
    meta[match[1].trim()] = match[2].trim();
  }
  const sections = {};
  for (const part of body.split(/^## /m).slice(1)) {
    const end = part.indexOf("\n");
    const name = (end === -1 ? part : part.slice(0, end)).trim();
    sections[name] = end === -1 ? "" : part.slice(end + 1).trim();
  }
  return { title, meta, sections };
}

/** 양식에 남아 있는 안내(《…》, HTML 주석)를 뺀 글자가 있는지 본다. */
export function hasContent(text) {
  return (
    text
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/《[^》]*》/g, "")
      .replace(/^\s*\|[\s|:-]*\|\s*$/gm, "")
      .replace(/[\s|\-*[\]]/g, "") !== ""
  );
}

/** 기록의 양식을 검사한다. 문제의 문장 목록을 돌려준다. */
export function checkRecord(kind, name, text, { final = false } = {}) {
  const spec = KINDS[kind];
  const found = [];
  if (!RECORD_NAME.test(name)) {
    found.push({
      what: `파일 이름이 《날짜》-《이름》.md 형태가 아니다: ${name}`,
      next: `파일을 지우고 pnpm docs:new ${kind} 《이름》 으로 다시 만든다(날짜는 명령이 붙인다)`,
    });
  }
  const record = parseRecord(text);
  if (record.title === "" || /《/.test(record.title)) {
    found.push({
      what: "첫 줄의 제목(# …)이 없거나 양식 그대로다.",
      next: "무엇을 한 작업인지 한 줄로 적는다",
    });
  }
  for (const key of spec.meta) {
    const value = record.meta[key] ?? "";
    if (value === "" || /《/.test(value)) {
      found.push({
        what: `머리 항목 「${key}」가 비어 있다.`,
        next:
          key === "요청"
            ? "사용자가 한 말을 그대로 옮긴다"
            : `「- ${key}: …」 줄을 채운다`,
      });
    }
  }
  const status = record.meta["상태"] ?? "";
  if (status !== "" && !/《/.test(status) && !spec.statuses.includes(status)) {
    found.push({
      what: `상태 값이 「${status}」다.`,
      next: `${spec.statuses.join(", ")} 가운데 하나로 적는다`,
    });
  }
  for (const section of spec.sections) {
    if (record.sections[section] === undefined) {
      found.push({
        what: `「## ${section}」 절이 없다.`,
        next: `양식(${spec.dir}/_template.md)의 절 제목을 그대로 둔다. 적을 것이 없으면 "없음"이라고 쓴다`,
      });
    }
  }
  const closed = spec.closed.includes(status);
  if (closed) {
    for (const section of spec.filled) {
      const content = record.sections[section];
      if (content !== undefined && !hasContent(content)) {
        found.push({
          what: `상태가 「${status}」인데 「## ${section}」 절이 비어 있다.`,
          next: '실제로 한 것을 적는다. 적을 것이 없으면 이유와 함께 "없음"이라고 쓴다',
        });
      }
    }
    if (/《[^》]*》/.test(text.replace(/<!--[\s\S]*?-->/g, ""))) {
      found.push({
        what: `상태가 「${status}」인데 양식의 안내(《…》)가 남아 있다.`,
        next: "남은 《…》 를 내용으로 바꾸거나 지운다",
      });
    }
    if (
      kind === "work" &&
      status === "완료" &&
      !/pnpm (run )?verify/.test(record.sections["검증"] ?? "")
    ) {
      found.push({
        what: "「## 검증」에 pnpm verify 의 결과가 없다.",
        next: "pnpm verify 를 돌리고 실제 출력의 요약(통과·실패, 테스트 수)을 옮긴다. 돌리지 않았으면 그렇게 적고 상태를 「진행 중」으로 둔다",
      });
    }
  } else if (final && status !== "" && spec.statuses.includes(status)) {
    found.push({
      what: `상태가 「${status}」다. 올리기 전에 끝내야 한다.`,
      next: `내용을 채우고 상태를 ${spec.closed.join(" 또는 ")} 으로 바꾼다`,
    });
  }
  return found;
}

const git = (args) =>
  execFileSync("git", ["-C", ROOT, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 64 * 1024 * 1024,
  });

/** git 의 명령 하나를 실행한다. 실패하면 null. */
export function tryGit(args) {
  try {
    return git(args);
  } catch {
    return null;
  }
}

/**
 * 이번 작업에서 바뀐 파일을 돌려준다.
 * - 작업 폴더의 변경(스테이징한 것, 하지 않은 것, 새 파일)
 * - 기본 브랜치가 아니면 기본 브랜치에서 갈라진 뒤의 커밋
 * - base 를 주면 그 지점에서 갈라진 뒤의 커밋(CI)
 * ref 는 비교의 기준이 되는 지점이다(갈라진 지점 또는 HEAD).
 * git 을 쓸 수 없으면 null 을 돌려준다.
 */
export function changedFiles({ base = "", staged = false } = {}) {
  if (tryGit(["rev-parse", "--is-inside-work-tree"]) === null) return null;
  const files = new Map();
  const add = (path, status) => {
    if (path === "") return;
    const previous = files.get(path);
    files.set(path, previous === "A" ? "A" : status);
  };

  if (staged) {
    const entries = (
      tryGit(["diff", "--cached", "--name-status", "-z", "--no-renames"]) ?? ""
    ).split("\0");
    for (let index = 0; index + 1 < entries.length; index += 2)
      add(entries[index + 1], entries[index][0]);
    return { files, ref: "HEAD" };
  }

  const entries = (
    tryGit(["status", "--porcelain=v1", "-z", "--untracked-files=all"]) ?? ""
  ).split("\0");
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.length < 4) continue;
    const code = entry.slice(0, 2);
    add(
      entry.slice(3),
      code.includes("?") || code.includes("A")
        ? "A"
        : code.includes("D")
          ? "D"
          : "M",
    );
    // 이름을 바꾼 항목은 옛 이름이 다음 칸에 온다.
    if (code.includes("R") || code.includes("C")) index += 1;
  }

  const since = base !== "" ? base : defaultBranch();
  let ref = "HEAD";
  if (since !== "") {
    const fork = tryGit(["merge-base", since, "HEAD"])?.trim() ?? "";
    if (fork !== "") {
      ref = fork;
      const committed = (
        tryGit(["diff", "--name-status", "-z", "--no-renames", fork, "HEAD"]) ??
        ""
      ).split("\0");
      for (let index = 0; index + 1 < committed.length; index += 2)
        add(committed[index + 1], committed[index][0]);
    }
  }
  return { files, ref };
}

/** 지금 브랜치가 기본 브랜치가 아니면 기본 브랜치의 이름을 돌려준다. 같거나 알 수 없으면 빈 문자열. */
function defaultBranch() {
  const current = tryGit(["rev-parse", "--abbrev-ref", "HEAD"])?.trim() ?? "";
  const remote =
    tryGit(["symbolic-ref", "--short", "refs/remotes/origin/HEAD"])?.trim() ??
    "";
  const candidates = [remote, "origin/main", "origin/master", "main", "master"];
  for (const name of candidates) {
    if (name === "") continue;
    if (tryGit(["rev-parse", "--verify", "--quiet", name]) === null) continue;
    if (name === current || name === `origin/${current}`) return "";
    return name;
  }
  return "";
}

/** 기준 시점의 파일 내용. 없으면 빈 문자열. */
export function contentAt(ref, path) {
  return tryGit(["show", `${ref}:${path}`]) ?? "";
}

/** 기록 파일을 읽는다. */
export function readRecord(kind, name) {
  return readText(join(ROOT, KINDS[kind].dir, name));
}
