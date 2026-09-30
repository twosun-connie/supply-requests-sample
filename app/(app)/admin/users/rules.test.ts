import { describe, expect, it } from "vitest";
import { checkRoleChange } from "./rules";

describe("역할 변경", () => {
  it("자기 자신의 역할은 바꿀 수 없다", () => {
    expect(checkRoleChange({ actorId: "user-1", targetId: "user-1" })).toBe(
      "자기 자신의 역할은 바꿀 수 없습니다.",
    );
  });
  it("다른 사용자의 역할은 바꿀 수 있다", () => {
    expect(
      checkRoleChange({ actorId: "user-1", targetId: "user-2" }),
    ).toBeNull();
  });
});
