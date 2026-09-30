import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type RequestStatus = Database["public"]["Enums"]["request_status"];

/** 상태별 신청 건수. 키는 request_status 의 값이다. */
export type RequestCounts = Record<RequestStatus, number>;

/**
 * 상태별 신청 건수. 볼 수 있는 범위는 DB 정책이 정한다(자기 신청, 또는 requests.approve 가 있으면 전체).
 * 세 조회는 서로의 결과가 필요 없어 함께 시작한다.
 */
export async function countRequestsByStatus(): Promise<RequestCounts> {
  const supabase = await createClient();
  const count = async (status: RequestStatus) => {
    const result = await supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    if (result.error !== null)
      throw new Error("신청 건수를 읽지 못했다", { cause: result.error });
    return result.count ?? 0;
  };
  const [submitted, approved, rejected] = await Promise.all([
    count("submitted"),
    count("approved"),
    count("rejected"),
  ]);
  return { submitted, approved, rejected };
}
