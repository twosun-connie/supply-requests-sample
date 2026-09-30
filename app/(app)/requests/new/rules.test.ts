import { describe, expect, it } from "vitest";
import { checkItemSelectable } from "./rules";

describe("신청할 품목 고르기", () => {
  it("쓰지 않는 품목은 새 신청에서 고를 수 없다", () => {
    expect(checkItemSelectable({ isActive: false })).toBe(
      "쓰지 않는 품목은 새 신청에서 고를 수 없습니다.",
    );
  });
  it("쓰는 품목은 새 신청에서 고를 수 있다", () => {
    expect(checkItemSelectable({ isActive: true })).toBeNull();
  });
  it("없는 품목은 고를 수 없다", () => {
    expect(checkItemSelectable(null)).toBe("품목을 찾을 수 없습니다.");
  });
});
