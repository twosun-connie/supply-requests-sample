import "server-only";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const PAGE_SIZE = 20;

type RequestStatus = Database["public"]["Enums"]["request_status"];

export type RequestRow = {
  id: number;
  itemName: string;
  quantity: number;
  status: RequestStatus;
  createdAt: string;
  /** requests.approve 권한이 없으면 본인 목록만 보므로 null. */
  requesterName: string | null;
};

/**
 * 신청 목록을 최신순으로 한 쪽 가져온다.
 * 어느 행이 보이는지는 DB 의 정책이 정한다. canViewAll 이 아니면 조건을 한 번 더 적어
 * 인덱스를 타게 하고 정책이 빠졌을 때의 두 번째 방어선으로 삼는다.
 *
 * @param userId 로그인한 사용자의 id
 * @param canViewAll requests.approve 권한이 있는지(전체 신청과 신청자 이름을 본다)
 * @param page 1 부터 시작하는 쪽 번호
 * @param status 상태 필터. null 이면 전체
 * @returns 행과 전체 건수. 읽지 못하면 예외(error.tsx 가 받는다)
 */
export async function listRequests(
  userId: string,
  canViewAll: boolean,
  page: number,
  status: RequestStatus | null,
): Promise<{ rows: RequestRow[]; total: number }> {
  const supabase = await createClient();
  const from = (Math.max(page, 1) - 1) * PAGE_SIZE;

  let query = supabase
    .from("requests")
    .select("id, item_id, quantity, status, created_at, requester_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (!canViewAll) query = query.eq("requester_id", userId);
  if (status !== null) query = query.eq("status", status);

  const requests = await query;
  if (requests.error !== null)
    throw new Error("신청 목록을 읽지 못했다", { cause: requests.error });

  // 연관 데이터는 한 번에 읽는다. 행마다 따로 조회하지 않는다.
  const uniqueItemIds = [...new Set(requests.data.map((row) => row.item_id))];
  const itemNameById = new Map<number, string>();
  if (uniqueItemIds.length > 0) {
    const items = await supabase
      .from("items")
      .select("id, name")
      .in("id", uniqueItemIds);
    if (items.error !== null)
      throw new Error("품목을 읽지 못했다", { cause: items.error });
    for (const item of items.data) itemNameById.set(item.id, item.name);
  }

  const requesterNameById = new Map<string, string>();
  if (canViewAll) {
    const uniqueRequesterIds = [
      ...new Set(requests.data.map((row) => row.requester_id)),
    ];
    if (uniqueRequesterIds.length > 0) {
      const profiles = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", uniqueRequesterIds);
      if (profiles.error !== null)
        throw new Error("신청자를 읽지 못했다", { cause: profiles.error });
      for (const profile of profiles.data)
        requesterNameById.set(profile.id, profile.full_name);
    }
  }

  return {
    rows: requests.data.map((row) => ({
      id: row.id,
      itemName: itemNameById.get(row.item_id) ?? "",
      quantity: row.quantity,
      status: row.status,
      createdAt: row.created_at,
      requesterName: canViewAll
        ? (requesterNameById.get(row.requester_id) ?? "")
        : null,
    })),
    total: requests.count ?? 0,
  };
}
