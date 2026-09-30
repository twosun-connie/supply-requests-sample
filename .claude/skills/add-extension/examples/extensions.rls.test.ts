// 확장 본보기(extensions.sql)를 확인한 DB 테스트다. 자기 테이블의 테스트를 쓸 때 모양을 참고한다.
// import 경로는 test/db/ 에 둘 때를 기준으로 한다.
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
let a: TestUser;
let b: TestUser;
let orgA: string;
let orgB: string;

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.begin();
  a = await db.createUser();
  b = await db.createUser();
  const orgs = await db.admin(
    "insert into public.organizations (name) values ('A'), ('B') returning id",
  );
  orgA = String(orgs[0]?.id);
  orgB = String(orgs[1]?.id);
  await db.admin(
    "insert into public.org_members (org_id, user_id) values ($1, $2), ($3, $4)",
    [orgA, a.id, orgB, b.id],
  );
  await db.admin(
    "insert into public.requests (org_id, requester_id) values ($1, $2), ($3, $4)",
    [orgA, a.id, orgB, b.id],
  );
});
afterEach(async () => db.rollback());

describe("multi-org", () => {
  it("다른 조직의 행은 보이지 않는다", async () => {
    const { rows } = await db.as(a, "select org_id from public.requests");
    expect(rows).toEqual([{ org_id: orgA }]);
  });
  it("행을 다른 조직으로 옮길 수 없다", async () => {
    await expect(
      db.as(a, "update public.requests set org_id = $1", [orgB]),
    ).rejects.toThrow(/row-level security/);
  });
  it("다른 조직에 행을 만들 수 없다", async () => {
    await expect(
      db.as(
        a,
        "insert into public.requests (org_id, requester_id) values ($1, $2)",
        [orgB, a.id],
      ),
    ).rejects.toThrow();
  });
});
describe("db-functions", () => {
  it("허용된 상태 변경은 되고 updated_at 이 바뀐다", async () => {
    await db.admin("update public.requests set updated_at = '2020-01-01'");
    const { rows } = await db.as(
      a,
      "update public.requests set status = 'approved' returning updated_at > '2021-01-01' as touched",
    );
    expect(rows).toEqual([{ touched: true }]);
  });
  it("금지된 상태 변경은 오류가 난다", async () => {
    await db.as(a, "update public.requests set status = 'approved'");
    await expect(
      db.as(a, "update public.requests set status = 'submitted'"),
    ).rejects.toThrow(/바꿀 수 없다/);
  });
});
describe("storage", () => {
  it("자기 폴더에만 올릴 수 있다", async () => {
    const own = await db.as(
      a,
      "insert into storage.objects (bucket_id, name) values ('attachments', $1)",
      [`${a.id}/x.pdf`],
    );
    expect(own.count).toBe(1);
    await expect(
      db.as(
        a,
        "insert into storage.objects (bucket_id, name) values ('attachments', $1)",
        [`${b.id}/x.pdf`],
      ),
    ).rejects.toThrow();
  });
  it("남의 파일은 보이지 않는다", async () => {
    await db.admin(
      "insert into storage.objects (bucket_id, name) values ('attachments', $1)",
      [`${b.id}/secret.pdf`],
    );
    expect((await db.as(a, "select name from storage.objects")).rows).toEqual(
      [],
    );
  });
});
describe("scheduled-jobs, realtime", () => {
  it("예약과 구독 대상이 등록된다", async () => {
    expect(await db.admin("select jobname from cron.job")).toEqual([
      { jobname: "expire-requests" },
    ]);
    expect(
      await db.admin(
        "select tablename from pg_publication_tables where pubname = 'supabase_realtime'",
      ),
    ).toEqual([{ tablename: "requests" }]);
  });
});
