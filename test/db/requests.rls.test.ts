import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb, type TestUser } from "./support/harness";

let db: TestDb;
let member: TestUser;
let other: TestUser;
let approver: TestUser;
let itemId: number;
let ownId: number;
let otherId: number;

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.begin();
  member = await db.createUser();
  other = await db.createUser();
  approver = await db.createUser("approver");
  await db.admin("insert into public.profiles (id, full_name) values ($1, '신청자'), ($2, '다른 신청자'), ($3, '담당자')", [
    member.id,
    other.id,
    approver.id,
  ]);
  itemId = Number((await db.admin("insert into public.items (name) values ('볼펜') returning id"))[0]?.id);
  const insert = "insert into public.requests (requester_id, item_id, quantity, reason) values ($1, $2, 1, '필요') returning id";
  ownId = Number((await db.admin(insert, [member.id, itemId]))[0]?.id);
  otherId = Number((await db.admin(insert, [other.id, itemId]))[0]?.id);
});
afterEach(async () => db.rollback());

describe("requests", () => {
  it("신청자는 자기 신청만 본다", async () => {
    expect((await db.as(member, "select id from public.requests")).rows).toEqual([{ id: ownId }]);
  });
  it("requests.approve 권한이 있으면 전체를 본다", async () => {
    expect((await db.as(approver, "select id from public.requests")).rows).toHaveLength(2);
  });
  it("신청자는 자기 신청을 스스로 승인할 수 없다", async () => {
    await expect(db.as(member, "update public.requests set status = 'approved' where id = $1", [ownId])).rejects.toThrow(
      /row-level security/,
    );
  });
  it("신청자가 남의 신청을 고치려 하면 0행이 바뀐다", async () => {
    expect((await db.as(member, "update public.requests set quantity = 9 where id = $1", [otherId])).count).toBe(0);
  });
  it("로그인하지 않으면 읽지 못한다", async () => {
    await expect(db.asAnon("select 1 from public.requests")).rejects.toThrow(/permission denied/);
  });
});
