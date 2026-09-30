import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("내부 경로는 그대로 돌려준다", () => {
    expect(safeRedirectPath("/requests")).toBe("/requests");
    expect(safeRedirectPath("/requests?status=submitted#top")).toBe(
      "/requests?status=submitted#top",
    );
  });
  it("다른 사이트로 가는 값은 기본 경로로 바꾼다", () => {
    for (const value of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\\/evil.example",
      "javascript:alert(1)",
      "evil.example",
      "/ok\nSet-Cookie: x=1",
      " /requests",
      "",
    ]) {
      expect(safeRedirectPath(value), value).toBe("/");
    }
  });
  it("문자열이 아닌 값은 기본 경로로 바꾼다", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath(["/a"])).toBe("/");
  });
});
