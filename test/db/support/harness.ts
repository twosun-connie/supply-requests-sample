// DB 테스트의 기반. Docker 없이 PGlite(메모리 안의 PostgreSQL) 위에 supabase/migrations 를 순서대로 적용한다.
// 실제 Supabase 가 아니다. 확인하지 못하는 것: 대시보드의 훅 켜기, Data API(PostgREST), 실제 로그인 토큰.
// 배포 전에는 계정별로 브라우저에서 확인한다.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { btree_gin } from "@electric-sql/pglite/contrib/btree_gin";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { moddatetime } from "@electric-sql/pglite/contrib/moddatetime";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const SHIM = fileURLToPath(new URL("./supabase-shim.sql", import.meta.url));
const MIGRATIONS = `${ROOT}supabase/migrations`;

export type TestUser = { id: string; role: string };
export type Rows = Record<string, unknown>[];

export type TestDb = {
  /** 슈퍼유저로 실행한다. RLS 를 우회하므로 테스트 데이터 준비와 카탈로그 조회에만 쓴다. */
  admin(sql: string, params?: unknown[]): Promise<Rows>;
  /** auth.users 에 사용자를 만든다. role 을 주면 user_roles 에도 넣는다. */
  createUser(role?: string): Promise<TestUser>;
  /** 로그인한 사용자로 실행한다. 정책을 어기면 예외가 난다. 권한 없는 행은 예외 없이 빠진다. */
  as(
    user: TestUser,
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: Rows; count: number }>;
  /** 로그인하지 않은 요청으로 실행한다. */
  asAnon(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: Rows; count: number }>;
  /** 테스트 하나를 트랜잭션으로 감싼다. beforeEach 에서 begin, afterEach 에서 rollback 을 부른다. */
  begin(): Promise<void>;
  rollback(): Promise<void>;
  close(): Promise<void>;
};

/** 마이그레이션 파일 이름을 적용 순서대로 돌려준다. */
export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

export async function createTestDb(): Promise<TestDb> {
  // 마이그레이션이 create extension 으로 켤 수 있는 확장이다. 여기에 없는 확장은 이 테스트에서 켤 수 없다.
  const db = new PGlite({
    extensions: {
      btree_gin,
      citext,
      moddatetime,
      pg_trgm,
      pgcrypto,
      unaccent,
      uuid_ossp,
    },
  });
  await db.exec(readFileSync(SHIM, "utf8"));
  for (const name of migrationFiles()) {
    try {
      // 파일 하나를 트랜잭션 하나로 적용한다. 같은 파일에서 enum 값을 더하고 바로 쓰는 실수를 여기서 잡는다.
      await db.exec(
        `begin;\n${readFileSync(`${MIGRATIONS}/${name}`, "utf8")}\n;commit;`,
      );
    } catch (error) {
      await db.exec("rollback").catch(() => undefined);
      throw new Error(
        `마이그레이션 적용 실패: ${name}\n${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  let savepoint = 0;
  async function runAs(
    role: string,
    claims: Record<string, unknown>,
    sql: string,
    params: unknown[],
  ) {
    const name = `as_${(savepoint += 1)}`;
    await db.exec(`savepoint ${name}`);
    try {
      await db.exec(`set local role ${role}`);
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify(claims),
      ]);
      const result = await db.query<Record<string, unknown>>(sql, params);
      return { rows: result.rows, count: result.affectedRows ?? 0 };
    } catch (error) {
      await db.exec(`rollback to savepoint ${name}`);
      throw error;
    } finally {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claims', '', true)");
    }
  }

  return {
    async admin(sql, params = []) {
      return (await db.query<Record<string, unknown>>(sql, params)).rows;
    },
    async createUser(role) {
      const [user] = (
        await db.query<{ id: string }>(
          "insert into auth.users default values returning id",
        )
      ).rows;
      if (role !== undefined) {
        await db.query(
          "insert into public.user_roles (user_id, role) values ($1, $2::public.app_role)",
          [user.id, role],
        );
      }
      return { id: user.id, role: role ?? "member" };
    },
    as(user, sql, params = []) {
      return runAs(
        "authenticated",
        { sub: user.id, role: "authenticated", user_role: user.role },
        sql,
        params,
      );
    },
    asAnon(sql, params = []) {
      return runAs("anon", { role: "anon" }, sql, params);
    },
    async begin() {
      await db.exec("begin");
    },
    async rollback() {
      await db.exec("rollback");
    },
    async close() {
      await db.close();
    },
  };
}
