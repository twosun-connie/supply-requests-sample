import { describe, expect, it } from "vitest";
import { toContainsPattern } from "./search";

describe("toContainsPattern", () => {
  it("검색어 앞뒤에 % 를 붙인다", () => {
    expect(toContainsPattern("볼펜")).toBe("%볼펜%");
  });
  it("와일드카드 글자는 글자 그대로 찾게 한다", () => {
    expect(toContainsPattern("100%")).toBe("%100\\%%");
    expect(toContainsPattern("a_b")).toBe("%a\\_b%");
    expect(toContainsPattern("a*b")).toBe("%a\\*b%");
    expect(toContainsPattern("a\\b")).toBe("%a\\\\b%");
  });
  it("빈 검색어는 빈 문자열을 돌려준다", () => {
    expect(toContainsPattern("   ")).toBe("");
  });
  it("검색어는 100자까지만 쓴다", () => {
    expect(toContainsPattern("가".repeat(300))).toHaveLength(102);
  });
});
