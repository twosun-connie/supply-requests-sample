"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, DENIED, OK, fail } from "@/lib/action";
import { hasPermission, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkRoleChange } from "./rules";
import { changeRoleSchema } from "./schema";

/**
 * 사용자의 역할을 바꾼다.
 * 서버 액션은 누구나 부를 수 있는 공개 주소다. 그래서 화면이 버튼을 숨겼더라도 여기서 다시 확인한다.
 * 순서: 로그인 확인 → 권한 확인 → 입력 검증 → 업무 규칙 → 변경 → 화면 갱신.
 */
export async function changeUserRole(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  if (!(await hasPermission("users.manage"))) return DENIED;

  const input = changeRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!input.success)
    return fail(input.error.issues[0]?.message ?? "입력을 확인해 주세요.");

  const reason = checkRoleChange({
    actorId: actor.id,
    targetId: input.data.userId,
  });
  if (reason !== null) return fail(reason);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_roles")
    .upsert(
      { user_id: input.data.userId, role: input.data.role },
      { onConflict: "user_id" },
    )
    .select("id");
  if (error !== null) {
    console.error("역할 변경 실패", { code: error.code });
    return fail("역할을 바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  // 정책이 막으면 오류 없이 0행이 돌아온다.
  if (data.length === 0) return DENIED;

  revalidatePath("/admin/users");
  return OK;
}
