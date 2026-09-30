import "server-only";
import type { Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** 한 쪽에 보이는 행 수. 화면의 쪽 계산과 조회가 같이 쓴다. */
export const PAGE_SIZE = 20;

/** 사용자 목록의 한 행. DB 의 이름(full_name)을 화면의 이름(fullName)으로 바꾼 것이다. */
export type UserRow = {
  id: string;
  fullName: string;
  role: Role;
  createdAt: string;
};

/**
 * 사용자 목록을 최신순으로 한 쪽 가져온다.
 * 어느 행이 보이는지는 DB 의 정책이 정한다. 여기서는 화면에 필요한 열만 고른다.
 *
 * @param page 1 부터 시작하는 쪽 번호
 * @returns 행과 전체 건수. 읽지 못하면 예외(error.tsx 가 받는다)
 */
export async function listUsers(
  page: number,
): Promise<{ rows: UserRow[]; total: number }> {
  const supabase = await createClient();
  const from = (Math.max(page, 1) - 1) * PAGE_SIZE;

  const profiles = await supabase
    .from("profiles")
    .select("id, full_name, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (profiles.error !== null)
    throw new Error("사용자 목록을 읽지 못했다", { cause: profiles.error });

  // 역할은 한 번에 읽는다. 행마다 따로 읽지 않는다.
  const roles = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in(
      "user_id",
      profiles.data.map((profile) => profile.id),
    );
  if (roles.error !== null)
    throw new Error("역할을 읽지 못했다", { cause: roles.error });

  const roleByUserId = new Map(
    roles.data.map((row) => [row.user_id, row.role]),
  );
  return {
    rows: profiles.data.map((profile) => ({
      id: profile.id,
      fullName: profile.full_name,
      role: roleByUserId.get(profile.id) ?? "member",
      createdAt: profile.created_at,
    })),
    total: profiles.count ?? 0,
  };
}
