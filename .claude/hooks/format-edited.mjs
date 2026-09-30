// PostToolUse(Edit|Write): 고친 파일 하나만 포맷하고 린트한다.
// 린트 오류가 남으면 종료 코드 2 로 Claude 에게 알린다.
// 도구는 고친 파일에서 위로 올라가며 찾는다. 워크트리 안의 파일은 그 워크트리의 도구로 검사한다.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { posix } from "node:path";
import { findUp, findWorkTreeRoot, hasSegment, readInput, targetPath } from "./lib.mjs";

const input = await readInput();
if (input === null) process.exit(0);

const file = targetPath(input);
if (file === "" || !/\.(ts|tsx)$/.test(file) || !existsSync(file)) process.exit(0);
if (file.endsWith("/database.types.ts") || hasSegment(file, "/node_modules/") || hasSegment(file, "/.next/")) process.exit(0);

const root = findWorkTreeRoot(posix.dirname(file));
if (root === "") process.exit(0);

const inRoot = (dir) => dir === root || dir.startsWith(`${root}/`);
const binOf = (dir, name) => `${dir}/node_modules/.bin/${name}`;
const locate = (names) => {
  for (const name of names) {
    const dir = findUp(posix.dirname(file), (candidate) => !inRoot(candidate) || existsSync(binOf(candidate, name)));
    if (dir !== "" && inRoot(dir)) return { name, bin: binOf(dir, name), cwd: dir };
  }
  return null;
};
const run = (tool, args) =>
  spawnSync(tool.bin, args, { cwd: tool.cwd, encoding: "utf8", shell: process.platform === "win32" });

const formatter = locate(["prettier"]);
if (formatter !== null) run(formatter, ["--write", "--log-level", "warn", file]);

const linter = locate(["eslint", "oxlint"]);
if (linter === null) {
  console.error(`format-edited: ${file} 을 검사할 eslint·oxlint 를 찾지 못해 린트를 건너뛰었다.`);
  process.exit(0);
}

const lint = run(linter, ["--fix", file]);
if (lint.status === 1) {
  const output = `${lint.stdout ?? ""}${lint.stderr ?? ""}`.trim().slice(0, 4000);
  console.error(`${linter.name}(${file}):\n${output}`);
  process.exit(2);
}
process.exit(0);
