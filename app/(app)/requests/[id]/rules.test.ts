import { describe, it, expect } from "vitest";
import {
  checkCanApprove,
  checkNotOwnRequest,
  checkRejectReasonLength,
} from "./rules";

describe("제출 상태가 아니면 승인·반려할 수 없다", () => {
  it("제출 상태면 통과한다", () => {
    expect(checkCanApprove({ status: "submitted" })).toBeNull();
  });

  it("승인 상태면 실패한다", () => {
    expect(checkCanApprove({ status: "approved" })).not.toBeNull();
  });

  it("반려 상태면 실패한다", () => {
    expect(checkCanApprove({ status: "rejected" })).not.toBeNull();
  });
});

describe("자기 신청은 승인·반려할 수 없다", () => {
  it("다른 사람의 신청이면 통과한다", () => {
    expect(
      checkNotOwnRequest({
        requesterId: "user-a",
        actorId: "user-b",
      }),
    ).toBeNull();
  });

  it("자기 신청이면 실패한다", () => {
    expect(
      checkNotOwnRequest({
        requesterId: "user-a",
        actorId: "user-a",
      }),
    ).not.toBeNull();
  });
});

describe("반려할 때는 사유(1~200자)를 적어야 한다", () => {
  it("1자 이상 200자 이하면 통과한다", () => {
    expect(checkRejectReasonLength({ note: "a" })).toBeNull();
    expect(checkRejectReasonLength({ note: "x".repeat(200) })).toBeNull();
  });

  it("비어 있거나 공백만 있으면 실패한다", () => {
    expect(checkRejectReasonLength({ note: "" })).not.toBeNull();
    expect(checkRejectReasonLength({ note: "   " })).not.toBeNull();
    expect(checkRejectReasonLength({ note: null })).not.toBeNull();
    expect(checkRejectReasonLength({ note: undefined })).not.toBeNull();
  });

  it("200자를 초과하면 실패한다", () => {
    expect(checkRejectReasonLength({ note: "x".repeat(201) })).not.toBeNull();
  });
});
