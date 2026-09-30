// 구조 검사. 마이그레이션을 모두 적용한 뒤 DB 의 카탈로그를 읽어 안전 조건을 확인한다.
// SQL 글자를 읽지 않고 적용한 결과를 본다. 그래서 여러 파일에 걸친 grant·revoke 도 맞게 판정한다.
// 이 파일은 보호 대상이다. 실패하면 이 파일이 아니라 마이그레이션을 고친다.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./harness";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const CLIENT_ROLES = ["anon", "authenticated"];
const COMMANDS = ["SELECT", "INSERT", "UPDATE", "DELETE"];

type Policy = {
  schema: string;
  table: string;
  name: string;
  command: string;
  roles: string[];
  using: string | null;
  check: string | null;
};
type Grant = { table: string; role: string; command: string };

const config = readJson(`${ROOT}project.config.json`) as {
  db?: { anonReadableTables?: string[] };
} | null;
const anonReadable = new Set(config?.db?.anonReadableTables ?? []);

let db: TestDb;
let tables: string[] = [];
/** public 과 storage 의 정책. 정책 검사는 둘 다 본다. */
let policies: Policy[] = [];
/** public 의 정책. 테이블 검사(권한과 정책의 짝)는 이것만 본다. */
let tablePolicies: Policy[] = [];
let grants: Grant[] = [];

beforeAll(async () => {
  db = await createTestDb();
  tables = (
    await db.admin(
      `select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind in ('r', 'p') order by 1`,
    )
  ).map((row) => String(row.name));
  policies = (
    await db.admin(
      `select schemaname, tablename, policyname, cmd, roles::text[] as roles, qual, with_check
       from pg_policies where schemaname in ('public', 'storage') order by 1, 2, 3`,
    )
  ).map((row) => ({
    schema: String(row.schemaname),
    table: String(row.tablename),
    name: String(row.policyname),
    command: String(row.cmd),
    roles: row.roles as string[],
    using: row.qual as string | null,
    check: row.with_check as string | null,
  }));
  tablePolicies = policies.filter((policy) => policy.schema === "public");
  grants = (
    await db.admin(
      `select table_name, grantee, privilege_type from information_schema.role_table_grants
       where table_schema = 'public' and grantee = any($1) and privilege_type = any($2)`,
      [[...CLIENT_ROLES, "PUBLIC"], COMMANDS],
    )
  ).map((row) => ({
    table: String(row.table_name),
    role: String(row.grantee),
    command: String(row.privilege_type),
  }));
});
afterAll(async () => db?.close());

describe("테이블", () => {
  it("public 의 모든 테이블에 RLS 가 켜져 있다", async () => {
    const off = await db.admin(
      `select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity order by 1`,
    );
    expect(
      off.map((row) => row.name),
      "alter table public.《테이블》 enable row level security; 를 더한다",
    ).toEqual([]);
  });

  it("권한(grant)을 준 작업마다 정책이 있다", () => {
    const missing = grants
      .filter((grant) => !tablePolicies.some((policy) => covers(policy, grant)))
      .map(
        (grant) =>
          `${grant.table}: ${grant.role} 에 ${grant.command} 권한을 줬지만 그 작업의 정책이 없다`,
      );
    expect(
      missing,
      "정책을 더하거나, 쓰지 않는 작업이면 grant 를 뺀다",
    ).toEqual([]);
  });

  it("정책이 있는 작업마다 권한(grant)이 있다", () => {
    const missing = tablePolicies
      .filter((policy) =>
        policy.roles.some((role) => CLIENT_ROLES.includes(role)),
      )
      .flatMap((policy) =>
        policy.roles
          .filter((role) => CLIENT_ROLES.includes(role))
          .filter(
            (role) =>
              !grants.some(
                (grant) =>
                  grant.table === policy.table &&
                  grant.role === role &&
                  grant.command === policy.command,
              ),
          )
          .map(
            (role) =>
              `${policy.table}: 정책 "${policy.name}" 은 ${role} 의 ${policy.command} 를 다루지만 grant 가 없다`,
          ),
      );
    expect(
      missing,
      "grant 《작업》 on table public.《테이블》 to authenticated; 를 더한다",
    ).toEqual([]);
  });

  it("테이블마다 정책이 하나 이상 있다", () => {
    const none = tables.filter(
      (table) => !tablePolicies.some((policy) => policy.table === table),
    );
    expect(
      none,
      "정책이 없으면 아무도 읽지 못한다. 작업별 정책을 더한다",
    ).toEqual([]);
  });
});

describe("정책", () => {
  it("작업별로 나눠 쓴다(for all 없음)", () => {
    const all = policies
      .filter((policy) => policy.command === "ALL")
      .map(label);
    expect(all, "for select / insert / update / delete 로 나눈다").toEqual([]);
  });

  it("대상 역할을 적는다(to 생략 없음)", () => {
    const open = policies
      .filter((policy) => policy.roles.includes("public"))
      .map(label);
    expect(open, "to authenticated 를 적는다").toEqual([]);
  });

  it("로그인하지 않은 요청(anon)에 열린 테이블은 project.config.json 에 적은 것뿐이다", () => {
    const exposed = policies
      .filter((policy) => policy.roles.includes("anon"))
      .filter(
        (policy) =>
          policy.command !== "SELECT" ||
          policy.schema !== "public" ||
          !anonReadable.has(policy.table),
      )
      .map(label);
    expect(
      exposed,
      "로그인 없이 읽혀야 하면 project.config.json 의 db.anonReadableTables 에 테이블을 적는다. 쓰기는 열지 않는다",
    ).toEqual([]);
  });

  it("바꾸는 작업의 조건이 true 가 아니다(using 과 with check 모두)", () => {
    const open = policies
      .filter((policy) => policy.command !== "SELECT")
      .filter((policy) =>
        policy.roles.some((role) => [...CLIENT_ROLES, "public"].includes(role)),
      )
      .filter((policy) => isTrue(policy.check) || isTrue(policy.using))
      .map(label);
    expect(
      open,
      "누가 어느 행을 바꿀 수 있는지 조건을 적는다. update 는 using(바꾸기 전)과 with check(바꾼 뒤)에 같은 조건을 쓴다",
    ).toEqual([]);
  });

  it("auth.uid()·auth.jwt()·authorize() 를 (select …) 로 감싼다", () => {
    const bare = policies
      .filter(
        (policy) => hasBareCall(policy.using) || hasBareCall(policy.check),
      )
      .map(label);
    expect(
      bare,
      "(select auth.uid()) 처럼 감싼다. 감싸지 않으면 행마다 다시 계산한다",
    ).toEqual([]);
  });

  it("user_metadata 로 권한을 판단하지 않는다", () => {
    const unsafe = policies
      .filter((policy) =>
        /user_metadata/.test(`${policy.using} ${policy.check}`),
      )
      .map(label);
    expect(
      unsafe,
      "user_metadata 는 사용자가 직접 바꿀 수 있다. user_roles 와 authorize() 를 쓴다",
    ).toEqual([]);
  });
});

describe("함수", () => {
  it("public 스키마에 security definer 함수가 없다", async () => {
    const exposed = await db.admin(
      `select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.prosecdef order by 1`,
    );
    expect(
      exposed.map((row) => row.name),
      "public 의 함수는 Data API 로 누구나 부를 수 있다. security definer 가 꼭 필요하면 private 스키마에 만든다",
    ).toEqual([]);
  });

  it("security definer 함수는 search_path 를 비운다", async () => {
    const unsafe = await db.admin(
      `select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname not in ('pg_catalog', 'information_schema', 'auth') and p.prosecdef
         and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c in ('search_path=', 'search_path=""'))
       order by 1`,
    );
    expect(
      unsafe.map((row) => row.name),
      "set search_path = '' 를 더하고 본문의 이름에 스키마를 붙인다",
    ).toEqual([]);
  });

  it("로그인하지 않은 요청(anon)이 실행할 수 있는 함수가 없다", async () => {
    const open = await db.admin(
      `select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1`,
    );
    expect(
      open.map((row) => row.name),
      "revoke execute on function public.《함수》 from anon, public; 를 더한다",
    ).toEqual([]);
  });

  it("사용자가 생기면 프로필을 만드는 트리거가 auth.users 에 있다", async () => {
    const triggers = await db.admin(
      `select t.tgname as name from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal and t.tgtype & 4 = 4 order by 1`,
    );
    expect(
      triggers.length,
      "auth.users 의 insert 트리거가 없다. 초대한 사용자가 사용자 관리 화면에 나타나지 않는다. 시작 마이그레이션의 create_profile_for_new_user 를 본다",
    ).toBeGreaterThan(0);
  });

  it("함수 본문이 user_metadata 로 권한을 판단하지 않는다", async () => {
    const unsafe = await db.admin(
      `select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.prosrc ~ 'user_metadata' order by 1`,
    );
    expect(unsafe.map((row) => row.name)).toEqual([]);
  });
});

describe("역할×권한 표", () => {
  const path = `${ROOT}docs/permissions.md`;

  it.skipIf(!existsSync(path))(
    "docs/permissions.md 와 role_permissions 가 같다",
    async () => {
      const documented = parsePermissionTable(readFileSync(path, "utf8"));
      const stored = (
        await db.admin(
          "select role::text as role, permission::text as permission from public.role_permissions",
        )
      )
        .map((row) => `${row.role} → ${row.permission}`)
        .sort();
      expect(
        stored,
        "문서가 원본이다. 문서를 먼저 고치고 마이그레이션으로 role_permissions 를 맞춘다",
      ).toEqual(documented);
    },
  );
});

function covers(policy: Policy, grant: Grant): boolean {
  if (policy.table !== grant.table) return false;
  if (policy.command !== grant.command && policy.command !== "ALL")
    return false;
  const role = grant.role === "PUBLIC" ? "public" : grant.role;
  return policy.roles.includes(role) || policy.roles.includes("public");
}

function label(policy: Policy): string {
  const table =
    policy.schema === "public"
      ? policy.table
      : `${policy.schema}.${policy.table}`;
  return `${table}: "${policy.name}" (${policy.command})`;
}

function isTrue(expression: string | null): boolean {
  return expression !== null && /^\(*\s*true\s*\)*$/i.test(expression.trim());
}

/**
 * 감싸지 않은 호출이 있는지 본다.
 * "감쌌다"는 것은 호출이 FROM 없는 (select …) 안에 있다는 뜻이다. 예: (select auth.uid()), (select auth.uid()::text).
 * 그런 묶음을 안쪽부터 지운 뒤에도 호출이 남아 있으면 감싸지 않은 것이다.
 * exists (select 1 from …) 처럼 FROM 이 있는 묶음은 지우지 않는다. 그 안의 호출도 감싸야 한다.
 */
function hasBareCall(expression: string | null): boolean {
  if (expression === null) return false;
  let rest = expression;
  for (let guard = 0; guard < 100; guard += 1) {
    const next = removeInnermostWrappedSelect(rest);
    if (next === rest) break;
    rest = next;
  }
  return /\b(?:auth\.uid|auth\.jwt|authorize)\(/i.test(rest);
}

/** FROM 이 없고 안에 다른 (select …) 가 없는 (select …) 묶음 하나를 지운다. 없으면 그대로 돌려준다. */
function removeInnermostWrappedSelect(expression: string): string {
  const opener = /\(\s*SELECT\b/gi;
  for (const match of expression.matchAll(opener)) {
    const start = match.index;
    let depth = 0;
    let end = -1;
    for (let index = start; index < expression.length; index += 1) {
      const char = expression[index];
      if (char === "(") depth += 1;
      if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          end = index;
          break;
        }
      }
    }
    if (end === -1) continue;
    const inner = expression.slice(start + 1, end);
    const nested = /\(\s*SELECT\b/i.test(inner.slice(1));
    if (!nested && !/\bFROM\b/i.test(inner)) {
      return `${expression.slice(0, start)}(wrapped)${expression.slice(end + 1)}`;
    }
  }
  return expression;
}

/** "## 역할별 권한" 절의 표를 읽어 "역할 → 권한" 목록을 만든다. 칸이 O 이면 권한이 있다. */
function parsePermissionTable(markdown: string): string[] {
  const section = markdown
    .split(/^## /m)
    .find((part) => part.startsWith("역할별 권한"));
  if (section === undefined)
    throw new Error('docs/permissions.md 에 "## 역할별 권한" 절이 없다');
  const rows = section
    .split("\n")
    .filter((line) => line.trim().startsWith("|"))
    .map((line) =>
      line
        .trim()
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim()),
    );
  const [header, , ...body] = rows;
  if (header === undefined) throw new Error("역할별 권한 표가 비어 있다");
  const roles = header.slice(2).map((cell) => cell.replaceAll("`", ""));
  return body
    .flatMap((cells) => {
      const permission = (cells[0] ?? "").replaceAll("`", "");
      return roles
        .filter((_, index) => /^[oO○]$/.test(cells[index + 2] ?? ""))
        .map((role) => `${role} → ${permission}`);
    })
    .sort();
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}
