// 업무 규칙. 순수 함수만 둔다. DB·요청·쿠키를 받지 않는다. 그래서 단위 테스트가 된다.
// 규칙의 원본은 docs/rules.md 다. 문서와 다르게 고치지 않는다.

import type { Database } from "@/lib/supabase/database.types";

type RequestStatus = Database["public"]["Enums"]["request_status"];

/**
 * 제출 상태가 아니면 승인·반려할 수 없다.
 * 안 되면 사용자에게 보여 줄 이유를 돌려준다.
 */
export function checkCanApprove({
  status,
}: {
  status: RequestStatus;
}): string | null {
  if (status !== "submitted") return "제출 상태가 아니면 승인할 수 없습니다.";
  return null;
}

/**
 * 자기 신청은 승인·반려할 수 없다.
 * 안 되면 사용자에게 보여 줄 이유를 돌려준다.
 */
export function checkNotOwnRequest({
  requesterId,
  actorId,
}: {
  requesterId: string;
  actorId: string;
}): string | null {
  if (requesterId === actorId) return "자기 신청은 승인·반려할 수 없습니다.";
  return null;
}

/**
 * 반려할 때는 사유(1~200자)를 적어야 한다.
 * 안 되면 사용자에게 보여 줄 이유를 돌려준다.
 */
export function checkRejectReasonLength({
  note,
}: {
  note: string | null | undefined;
}): string | null {
  if (!note || note.trim().length === 0) return "반려 사유를 입력해 주세요.";
  if (note.length > 200) return "반려 사유는 200자 이하여야 합니다.";
  return null;
}
