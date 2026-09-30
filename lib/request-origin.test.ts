import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./request-origin";

const request = (headers: Record<string, string>) =>
  new Request("https://tool.example/api/x", { method: "POST", headers });

describe("isSameOrigin", () => {
  it("같은 출처의 요청은 받는다", () => {
    expect(isSameOrigin(request({ "sec-fetch-site": "same-origin" }))).toBe(
      true,
    );
    expect(
      isSameOrigin(
        request({ origin: "https://tool.example", host: "tool.example" }),
      ),
    ).toBe(true);
  });
  it("다른 사이트의 요청은 받지 않는다", () => {
    expect(isSameOrigin(request({ "sec-fetch-site": "cross-site" }))).toBe(
      false,
    );
    expect(isSameOrigin(request({ "sec-fetch-site": "same-site" }))).toBe(
      false,
    );
    expect(
      isSameOrigin(
        request({ origin: "https://evil.example", host: "tool.example" }),
      ),
    ).toBe(false);
  });
  it("출처를 알 수 없으면 받지 않는다", () => {
    expect(isSameOrigin(request({}))).toBe(false);
    expect(
      isSameOrigin(request({ origin: "null", host: "tool.example" })),
    ).toBe(false);
  });
});
