import "server-only";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type RequestStatus = Database["public"]["Enums"]["request_status"];

/** 신청 상세 화면에 보이는 값. ID 와 이름을 따로 둔다(자기 신청인지는 requesterId 로 가린다). */
export type RequestDetail = {
  id: number;
  itemName: string;
  quantity: number;
  reason: string;
  neededBy: string | null;
  status: RequestStatus;
  requesterId: string;
  requesterName: string;
  approverId: string | null;
  approverName: string | null;
  approverNote: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 상태 변경 이력의 한 줄(승인 또는 반려). 반려면 note 에 사유가 있다. */
export type RequestEvent = {
  id: number;
  actorName: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  note: string | null;
  createdAt: string;
};

/**
 * 신청 상세 정보와 이력을 가져온다.
 * 어느 행이 보이는지는 DB의 정책이 정한다. canViewAll 이 아니면 조건을 한 번 더 적어
 * 정책이 빠졌을 때의 두 번째 방어선으로 삼는다.
 *
 * @param userId 로그인한 사용자의 id
 * @param requestId 신청 ID
 * @param canViewAll requests.approve 권한이 있는지(전체 신청을 본다)
 * @returns 신청 상세와 이력. 없거나 볼 수 없는 신청이면 null(page.tsx 가 notFound() 를 부른다). 읽지 못하면 예외(error.tsx 가 받는다)
 */
export async function getRequestDetail(
  userId: string,
  requestId: number,
  canViewAll: boolean,
): Promise<{ request: RequestDetail; events: RequestEvent[] } | null> {
  const supabase = await createClient();

  // 신청 조회
  let query = supabase
    .from("requests")
    .select(
      "id, item_id, quantity, reason, needed_by, status, requester_id, approver_id, approver_note, created_at, updated_at",
    )
    .eq("id", requestId);

  if (!canViewAll) {
    query = query.eq("requester_id", userId);
  }

  const requestResult = await query.maybeSingle();

  if (requestResult.error !== null)
    throw new Error("신청을 읽지 못했다", { cause: requestResult.error });

  if (requestResult.data === null) return null;

  // 품목 이름, 신청자 이름 등을 함께 읽는다
  const itemPromise = supabase
    .from("items")
    .select("id, name")
    .eq("id", requestResult.data.item_id)
    .maybeSingle();

  const requesterPromise = supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", requestResult.data.requester_id)
    .maybeSingle();

  const approverPromise =
    requestResult.data.approver_id === null
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", requestResult.data.approver_id)
          .maybeSingle();

  const [itemResult, requesterResult, approverResult] = await Promise.all([
    itemPromise,
    requesterPromise,
    approverPromise,
  ]);

  if (itemResult.error !== null)
    throw new Error("품목을 읽지 못했다", { cause: itemResult.error });
  if (requesterResult.error !== null)
    throw new Error("신청자를 읽지 못했다", { cause: requesterResult.error });
  if (approverResult.error !== null)
    throw new Error("승인자를 읽지 못했다", { cause: approverResult.error });

  const request: RequestDetail = {
    id: requestResult.data.id,
    itemName: itemResult.data?.name ?? "",
    quantity: requestResult.data.quantity,
    reason: requestResult.data.reason,
    neededBy: requestResult.data.needed_by,
    status: requestResult.data.status,
    requesterId: requestResult.data.requester_id,
    requesterName: requesterResult.data?.full_name ?? "",
    approverId: requestResult.data.approver_id,
    approverName: approverResult.data?.full_name ?? null,
    approverNote: requestResult.data.approver_note,
    createdAt: requestResult.data.created_at,
    updatedAt: requestResult.data.updated_at,
  };

  // 이력 조회
  const eventsResult = await supabase
    .from("request_events")
    .select("id, actor_id, from_status, to_status, note, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });

  if (eventsResult.error !== null)
    throw new Error("이력을 읽지 못했다", { cause: eventsResult.error });

  // 이력의 행위자 이름을 한 번에 읽는다
  const actorIds = [...new Set(eventsResult.data.map((e) => e.actor_id))];
  const actorNameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const actorsResult = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    if (actorsResult.error !== null)
      throw new Error("행위자를 읽지 못했다", { cause: actorsResult.error });
    for (const actor of actorsResult.data)
      actorNameById.set(actor.id, actor.full_name);
  }

  const events: RequestEvent[] = eventsResult.data.map((event) => ({
    id: event.id,
    actorName: actorNameById.get(event.actor_id) ?? "",
    fromStatus: event.from_status,
    toStatus: event.to_status,
    note: event.note,
    createdAt: event.created_at,
  }));

  return { request, events };
}
