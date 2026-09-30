// 역할별 테스트의 본보기. 새 테이블을 만들면 같은 모양으로 《테이블》.rls.test.ts 를 쓴다.
// 테이블마다 세 경우를 확인한다: 권한이 있는 사용자, 권한이 없는 사용자, 남의 행.
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { createTestDb, type TestDb, type TestUser } from "./support/harness";

let db: TestDb;
let member: TestUser;
let other: TestUser;
let admin: TestUser;

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => db?.close());

beforeEach(async () => {
  await db.begin();
  member = await db.createUser();
  other = await db.createUser();
  admin = await db.createUser("admin");
  await db.admin(
    "insert into public.profiles (id, full_name) values ($1, '구성원'), ($2, '다른 구성원'), ($3, '관리자') on conflict (id) do update set full_name = excluded.full_name",
    [member.id, other.id, admin.id],
  );
});
afterEach(async () => db.rollback());

describe("authorize()", () => {
  it("admin 은 users.manage 권한이 있다", async () => {
    const { rows } = await db.as(
      admin,
      "select public.authorize('users.manage') as allowed",
    );
    expect(rows[0]?.allowed).toBe(true);
  });
  it("member 는 users.manage 권한이 없다", async () => {
    const { rows } = await db.as(
      member,
      "select public.authorize('users.manage') as allowed",
    );
    expect(rows[0]?.allowed).toBe(false);
  });
  it("토큰의 역할이 알 수 없는 값이면 오류가 난다(권한을 주지 않는다)", async () => {
    await expect(
      db.as(
        { id: member.id, role: "superuser" },
        "select public.authorize('users.manage')",
      ),
    ).rejects.toThrow();
  });
});

describe("user_roles", () => {
  it("admin 은 역할을 줄 수 있다", async () => {
    const { count } = await db.as(
      admin,
      "insert into public.user_roles (user_id, role) values ($1, 'admin')",
      [member.id],
    );
    expect(count).toBe(1);
  });
  it("member 는 자기에게 admin 역할을 줄 수 없다", async () => {
    await expect(
      db.as(
        member,
        "insert into public.user_roles (user_id, role) values ($1, 'admin')",
        [member.id],
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("member 는 남의 역할을 볼 수 없다", async () => {
    const { rows } = await db.as(
      member,
      "select user_id from public.user_roles",
    );
    expect(rows).toEqual([]);
  });
  it("member 가 남의 역할을 지우려 하면 0행이 바뀐다", async () => {
    const { count } = await db.as(
      member,
      "delete from public.user_roles where user_id = $1",
      [admin.id],
    );
    expect(count).toBe(0);
    expect(
      await db.admin("select 1 from public.user_roles where user_id = $1", [
        admin.id,
      ]),
    ).toHaveLength(1);
  });
});

describe("profiles", () => {
  it("member 는 자기 프로필을 고칠 수 있다", async () => {
    const { count } = await db.as(
      member,
      "update public.profiles set full_name = '새 이름' where id = $1",
      [member.id],
    );
    expect(count).toBe(1);
  });
  it("member 가 남의 프로필을 고치려 하면 0행이 바뀐다", async () => {
    const { count } = await db.as(
      member,
      "update public.profiles set full_name = '바꿈' where id = $1",
      [other.id],
    );
    expect(count).toBe(0);
  });
  it("member 는 자기 프로필의 주인을 남으로 바꿀 수 없다", async () => {
    await expect(
      db.as(member, "update public.profiles set id = $2 where id = $1", [
        member.id,
        admin.id,
      ]),
    ).rejects.toThrow();
  });
  it("admin 은 남의 프로필을 고칠 수 있다", async () => {
    const { count } = await db.as(
      admin,
      "update public.profiles set full_name = '고침' where id = $1",
      [member.id],
    );
    expect(count).toBe(1);
  });
});

describe("로그인하지 않은 요청", () => {
  it("어떤 테이블도 읽지 못한다", async () => {
    for (const table of [
      "profiles",
      "user_roles",
      "role_permissions",
      "user_role_events",
    ]) {
      await expect(db.asAnon(`select 1 from public.${table}`)).rejects.toThrow(
        /permission denied/,
      );
    }
  });
  it("authorize() 를 실행하지 못한다", async () => {
    await expect(
      db.asAnon("select public.authorize('users.manage')"),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("user_role_events", () => {
  it("역할을 주고 바꾸고 거두면 이력이 남는다", async () => {
    await db.as(
      admin,
      "insert into public.user_roles (user_id, role) values ($1, 'member')",
      [member.id],
    );
    await db.as(
      admin,
      "update public.user_roles set role = 'admin' where user_id = $1",
      [member.id],
    );
    await db.as(admin, "delete from public.user_roles where user_id = $1", [
      member.id,
    ]);
    const events = await db.admin(
      "select action, old_role::text, new_role::text, actor_id from public.user_role_events where target_user_id = $1 order by id",
      [member.id],
    );
    expect(events).toEqual([
      {
        action: "grant",
        old_role: null,
        new_role: "member",
        actor_id: admin.id,
      },
      {
        action: "change",
        old_role: "member",
        new_role: "admin",
        actor_id: admin.id,
      },
      {
        action: "revoke",
        old_role: "admin",
        new_role: null,
        actor_id: admin.id,
      },
    ]);
  });
  it("member 는 이력을 볼 수 없다", async () => {
    expect(
      (await db.as(member, "select id from public.user_role_events")).rows,
    ).toEqual([]);
  });
  it("admin 은 이력을 본다", async () => {
    expect(
      (await db.as(admin, "select action from public.user_role_events")).rows
        .length,
    ).toBeGreaterThan(0);
  });
  it("admin 도 이력을 직접 쓰거나 고치거나 지우지 못한다", async () => {
    await expect(
      db.as(
        admin,
        "insert into public.user_role_events (target_user_id, action) values ($1, 'grant')",
        [member.id],
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as(admin, "update public.user_role_events set action = 'revoke'"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as(admin, "delete from public.user_role_events"),
    ).rejects.toThrow(/permission denied/);
  });
  it("이력을 남기는 함수를 직접 부를 수 없다", async () => {
    await expect(
      db.as(admin, "select private.log_user_role_change()"),
    ).rejects.toThrow();
  });
});

describe("custom_access_token_hook", () => {
  it("역할이 있는 사용자의 토큰에 그 역할을 넣는다", async () => {
    const [row] = await db.admin(
      "select public.custom_access_token_hook($1::jsonb) -> 'claims' ->> 'user_role' as role",
      [JSON.stringify({ user_id: admin.id, claims: {} })],
    );
    expect(row?.role).toBe("admin");
  });
  it("역할이 없는 사용자는 member 다", async () => {
    const [row] = await db.admin(
      "select public.custom_access_token_hook($1::jsonb) -> 'claims' ->> 'user_role' as role",
      [JSON.stringify({ user_id: member.id, claims: {} })],
    );
    expect(row?.role).toBe("member");
  });
});
